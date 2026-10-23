import mongoose from "mongoose";
import { InventoryItem } from "../models/InventoryItem.js";
import { Transaction } from "../models/Transaction.js";
import { Warehouse } from "../models/Warehouse.js";

function startOfToday() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function makeDays(count) {
  const today = startOfToday();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - count + index + 1);
    return date;
  });
}

export async function getDashboardSummary(request, response) {
  const ownerId = new mongoose.Types.ObjectId(request.auth.userId);
  const today = startOfToday();
  const [
    inventoryTotals,
    stockStatus,
    dailyMovement,
    recentTransactions,
    lowStock,
  ] = await Promise.all([
    InventoryItem.aggregate([
      { $match: { ownerId } },
      {
        $group: {
          _id: null,
          skus: { $addToSet: "$sku" },
          totalUnits: { $sum: "$quantity" },
        },
      },
      { $project: { totalSkus: { $size: "$skus" }, totalUnits: 1 } },
    ]),
    InventoryItem.aggregate([
      { $match: { ownerId } },
      {
        $group: {
          _id: null,
          lowStockItems: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$quantity", 0] },
                    { $lte: ["$quantity", "$reorderPoint"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          outOfStockItems: {
            $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] },
          },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { ownerId, createdAt: { $gte: today } } },
      {
        $group: {
          _id: "$type",
          quantity: { $sum: "$quantity" },
          transactions: { $sum: 1 },
        },
      },
    ]),
    Transaction.find({ ownerId })
      .populate("inventoryItemId", "sku name unit")
      .populate("warehouseId", "name code")
      .populate("locationId", "code")
      .populate("destinationInventoryItemId", "sku name unit")
      .populate("destinationWarehouseId", "name code")
      .populate("destinationLocationId", "code")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    InventoryItem.find({
      ownerId,
      $expr: { $lte: ["$quantity", "$reorderPoint"] },
    })
      .populate("warehouseId", "name")
      .sort({ quantity: 1 })
      .limit(8)
      .lean(),
  ]);

  const movementByType = Object.fromEntries(
    dailyMovement.map((entry) => [entry._id, entry]),
  );
  const totals = inventoryTotals[0] ?? { totalSkus: 0, totalUnits: 0 };
  const status = stockStatus[0] ?? { lowStockItems: 0, outOfStockItems: 0 };

  return response.status(200).json({
    totalSkus: totals.totalSkus,
    totalUnits: totals.totalUnits,
    lowStockItems: status.lowStockItems,
    outOfStockItems: status.outOfStockItems,
    inboundToday: {
      quantity: movementByType.inbound?.quantity ?? 0,
      transactions: movementByType.inbound?.transactions ?? 0,
    },
    outboundToday: {
      quantity: movementByType.outbound?.quantity ?? 0,
      transactions: movementByType.outbound?.transactions ?? 0,
    },
    lowStock: lowStock.map((item) => ({
      id: String(item._id),
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      reorderPoint: item.reorderPoint,
      warehouse: item.warehouseId?.name ?? "Unknown warehouse",
    })),
    recentTransactions: recentTransactions.map((transaction) => ({
      id: String(transaction._id),
      type: transaction.type,
      adjustmentDirection: transaction.adjustmentDirection,
      quantity: transaction.quantity,
      stockAfter: transaction.stockAfter,
      reference: transaction.reference,
      createdAt: transaction.createdAt,
      item: transaction.inventoryItemId,
      warehouse: transaction.warehouseId,
      location: transaction.locationId,
      destinationItem: transaction.destinationInventoryItemId,
      destinationWarehouse: transaction.destinationWarehouseId,
      destinationLocation: transaction.destinationLocationId?.code ?? null,
    })),
  });
}

export async function getInventoryTrend(request, response) {
  const days = Math.min(Math.max(Number(request.query.days) || 7, 7), 90);
  const ownerId = new mongoose.Types.ObjectId(request.auth.userId);
  const dates = makeDays(days);
  const rangeStart = dates[0];

  const [currentStock, movements] = await Promise.all([
    InventoryItem.aggregate([
      { $match: { ownerId } },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          ownerId,
          createdAt: { $gte: rangeStart },
          type: { $in: ["inbound", "outbound", "adjustment"] },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            type: "$type",
            adjustmentDirection: "$adjustmentDirection",
          },
          quantity: { $sum: "$quantity" },
        },
      },
    ]),
  ]);

  const byDay = new Map();
  for (const movement of movements) {
    const day = byDay.get(movement._id.date) ?? {
      inbound: 0,
      outbound: 0,
      adjustment: 0,
    };
    if (movement._id.type === "adjustment") {
      day.adjustment +=
        movement._id.adjustmentDirection === "increase"
          ? movement.quantity
          : -movement.quantity;
    } else {
      day[movement._id.type] = movement.quantity;
    }
    byDay.set(movement._id.date, day);
  }

  const totalNow = currentStock[0]?.total ?? 0;
  const totalsDuringRange = [...byDay.values()].reduce(
    (sum, day) => sum + day.inbound - day.outbound + day.adjustment,
    0,
  );
  let runningStock = totalNow - totalsDuringRange;
  const trend = dates.map((date) => {
    const label = dayKey(date);
    const movement = byDay.get(label) ?? {
      inbound: 0,
      outbound: 0,
      adjustment: 0,
    };
    runningStock += movement.inbound - movement.outbound + movement.adjustment;
    return {
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      stockLevel: runningStock,
      inbound: movement.inbound,
      outbound: movement.outbound,
    };
  });

  return response.status(200).json({ trend });
}

export async function getWarehouseUtilization(request, response) {
  const ownerId = new mongoose.Types.ObjectId(request.auth.userId);
  const [warehouses, quantities] = await Promise.all([
    Warehouse.find({ ownerId }).sort({ name: 1 }).lean(),
    InventoryItem.aggregate([
      { $match: { ownerId } },
      { $group: { _id: "$warehouseId", usedUnits: { $sum: "$quantity" } } },
    ]),
  ]);
  const quantityByWarehouse = new Map(
    quantities.map((entry) => [String(entry._id), entry.usedUnits]),
  );
  const utilization = warehouses.map((warehouse) => {
    const usedUnits = quantityByWarehouse.get(String(warehouse._id)) ?? 0;
    const capacityUnits = warehouse.capacityUnits ?? 0;
    return {
      id: String(warehouse._id),
      name: warehouse.name,
      usedUnits,
      capacityUnits,
      usedPercent:
        capacityUnits > 0
          ? Math.min(100, Math.round((usedUnits / capacityUnits) * 100))
          : 0,
    };
  });
  return response.status(200).json({ utilization });
}
