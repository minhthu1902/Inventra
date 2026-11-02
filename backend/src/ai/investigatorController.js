import mongoose from "mongoose";
import { z } from "zod";
import { aiConfig } from "./aiConfig.js";
import { InventoryItem } from "../models/InventoryItem.js";
import { Transaction } from "../models/Transaction.js";

const requestSchema = z.object({
  question: z.string().trim().max(500).optional().default(""),
});

const DAY_MS = 24 * 60 * 60 * 1000;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function analyzeMovements(items, transactions) {
  const itemById = new Map(items.map((item) => [String(item._id), item]));
  const outboundByItem = new Map();
  const findings = [];
  const dayAgo = Date.now() - DAY_MS;

  for (const transaction of transactions) {
    if (transaction.type !== "outbound") continue;
    const itemId = String(transaction.inventoryItemId?._id ?? transaction.inventoryItemId);
    const item = itemById.get(itemId);
    if (!item) continue;
    const records = outboundByItem.get(itemId) ?? [];
    records.push(transaction);
    outboundByItem.set(itemId, records);

    if (
      transaction.quantity >= 5 &&
      transaction.stockBefore > 0 &&
      transaction.quantity / transaction.stockBefore >= 0.5
    ) {
      findings.push({
        id: `large-${transaction._id}`,
        kind: "large-movement",
        severity: transaction.stockAfter <= item.reorderPoint ? "high" : "medium",
        sku: item.sku,
        itemName: item.name,
        title: "Large stock reduction",
        evidence: `${transaction.quantity} ${item.unit} shipped from ${transaction.stockBefore}; ${transaction.stockAfter} remain.`,
        recommendation:
          transaction.stockAfter <= item.reorderPoint
            ? "Review the shipment and prepare a replenishment order."
            : "Confirm this shipment against its reference and watch the next stock count.",
        occurredAt: transaction.createdAt,
      });
    }

    if (new Date(transaction.createdAt).getTime() >= dayAgo && transaction.stockAfter <= item.reorderPoint) {
      findings.push({
        id: `reorder-${transaction._id}`,
        kind: "reorder-risk",
        severity: transaction.stockAfter === 0 ? "high" : "medium",
        sku: item.sku,
        itemName: item.name,
        title: transaction.stockAfter === 0 ? "Item reached zero stock" : "Stock fell to reorder level",
        evidence: `After a ${transaction.quantity} ${item.unit} shipment, ${transaction.stockAfter} remain; reorder point is ${item.reorderPoint}.`,
        recommendation: "Check open purchase orders and replenish this item if no inbound delivery is scheduled.",
        occurredAt: transaction.createdAt,
      });
    }
  }

  for (const [itemId, movements] of outboundByItem) {
    const item = itemById.get(itemId);
    const lastDay = movements.filter(
      (transaction) => new Date(transaction.createdAt).getTime() >= dayAgo,
    );
    if (lastDay.length >= 3) {
      const total = lastDay.reduce((sum, transaction) => sum + transaction.quantity, 0);
      findings.push({
        id: `repeated-${itemId}`,
        kind: "repeated-movement",
        severity: total >= item.quantity ? "high" : "medium",
        sku: item.sku,
        itemName: item.name,
        title: "Repeated outbound activity in 24 hours",
        evidence: `${lastDay.length} shipments moved ${total} ${item.unit} in the last 24 hours.`,
        recommendation: "Check that the shipments belong to separate orders and compare them with the picking log.",
        occurredAt: lastDay[0].createdAt,
      });
    }

    const typicalQuantity = median(movements.slice(1).map((transaction) => transaction.quantity));
    const latest = movements[0];
    if (
      movements.length >= 3 &&
      typicalQuantity > 0 &&
      latest.quantity >= typicalQuantity * 3 &&
      latest.quantity >= 5
    ) {
      findings.push({
        id: `spike-${latest._id}`,
        kind: "outbound-spike",
        severity: "medium",
        sku: item.sku,
        itemName: item.name,
        title: "Outbound quantity is above its recent pattern",
        evidence: `The latest shipment was ${latest.quantity} ${item.unit}; the median of earlier recorded shipments is ${typicalQuantity} ${item.unit}.`,
        recommendation: "Verify the order quantity and confirm the stock movement was assigned to the correct SKU.",
        occurredAt: latest.createdAt,
      });
    }
  }

  const existingLowStock = new Set(
    findings.filter((finding) => finding.kind === "reorder-risk").map((finding) => finding.sku),
  );
  for (const item of items) {
    if (item.quantity <= item.reorderPoint && !existingLowStock.has(item.sku)) {
      findings.push({
        id: `low-${item._id}`,
        kind: "low-stock",
        severity: item.quantity === 0 ? "high" : "medium",
        sku: item.sku,
        itemName: item.name,
        title: item.quantity === 0 ? "Out of stock" : "Below reorder point",
        evidence: `${item.quantity} ${item.unit} on hand; reorder point is ${item.reorderPoint}.`,
        recommendation: "Review expected demand and open purchase orders, then replenish if needed.",
        occurredAt: item.updatedAt,
      });
    }
  }

  const severityRank = { high: 0, medium: 1, low: 2 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return findings.slice(0, 12);
}

function makeLocalAnswer(question, findings, transactionCount) {
  const focus = question.match(/\b[A-Z0-9]+(?:-[A-Z0-9]+)+\b/i)?.[0]?.toUpperCase();
  const relevant = focus
    ? findings.filter((finding) => finding.sku.toUpperCase().includes(focus))
    : findings;
  if (focus && relevant.length === 0) {
    return `I found no flagged pattern for ${focus} in the latest 30 days. I reviewed ${transactionCount} recorded transactions; that does not rule out issues outside the available history.`;
  }
  if (!relevant.length) {
    return `I reviewed ${transactionCount} transactions from the last 30 days and found no movement that crossed the current anomaly rules. Check back as more history accumulates; small samples can hide emerging patterns.`;
  }

  const bullets = relevant.slice(0, 3).map((finding) =>
    `${finding.sku}: ${finding.title.toLowerCase()} — ${finding.evidence} Recommended next step: ${finding.recommendation}`,
  );
  return `I reviewed ${transactionCount} transactions from the last 30 days. Here are the strongest signals:\n\n${bullets.join("\n\n")}\n\nThese are inventory signals for review, not proof of an error.`;
}

async function askModel(question, items, transactions, findings) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(aiConfig.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiConfig.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are Inventra's inventory investigator. Explain unusual patterns using only the supplied account-scoped inventory facts. Distinguish observed facts from hypotheses, mention when the sample is small, and give practical next steps. Never invent causes, SKUs, dates, or counts. Keep the answer concise and readable.",
          },
          {
            role: "user",
            content: JSON.stringify({
              question: question || "Analyze recent movements and recommend next actions.",
              currentItems: items.map((item) => ({
                sku: item.sku,
                name: item.name,
                quantity: item.quantity,
                reorderPoint: item.reorderPoint,
                unit: item.unit,
              })),
              recentTransactions: transactions.slice(0, 100).map((transaction) => ({
                sku: transaction.inventoryItemId?.sku,
                name: transaction.inventoryItemId?.name,
                type: transaction.type,
                quantity: transaction.quantity,
                stockBefore: transaction.stockBefore,
                stockAfter: transaction.stockAfter,
                occurredAt: transaction.createdAt,
              })),
              ruleBasedFindings: findings,
            }),
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`${aiConfig.label} returned ${response.status}`);
    const result = await response.json();
    const content = result?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content.trim() : "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function askInventoryInvestigator(request, response) {
  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ message: "Question must be 500 characters or fewer." });
  }

  if (!mongoose.isValidObjectId(request.auth?.userId)) {
    return response.status(401).json({ message: "Authentication required" });
  }

  const ownerId = new mongoose.Types.ObjectId(request.auth.userId);
  const since = new Date(Date.now() - 30 * DAY_MS);
  let items;
  let transactions;
  let findings;
  try {
    [items, transactions] = await Promise.all([
      InventoryItem.find({ ownerId }).lean(),
      Transaction.find({ ownerId, createdAt: { $gte: since } })
        .populate("inventoryItemId", "sku name unit")
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
    ]);
    findings = analyzeMovements(items, transactions);
  } catch (error) {
    console.error("AI Investigator analysis failed:", error);
    return response.status(503).json({
      message: "The Inventory Investigator could not analyze your data right now. Please try again in a moment.",
    });
  }

  let answer = makeLocalAnswer(parsed.data.question, findings, transactions.length);
  let generatedBy = "Local analysis";

  if (aiConfig.apiKey) {
    try {
      const modelAnswer = await askModel(parsed.data.question, items, transactions, findings);
      if (modelAnswer) {
        answer = modelAnswer;
        generatedBy = aiConfig.label;
      }
    } catch (error) {
      console.warn(`${aiConfig.label} request failed; using local analysis:`, error.message);
      generatedBy = "Local analysis (AI service unavailable)";
    }
  }

  return response.status(200).json({
    answer,
    findings,
    generatedBy,
    analyzedItems: items.length,
    analyzedTransactions: transactions.length,
    periodDays: 30,
    generatedAt: new Date().toISOString(),
  });
}
