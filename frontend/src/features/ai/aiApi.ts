export type InvestigatorFinding = {
  id: string;
  kind: string;
  severity: "high" | "medium" | "low";
  sku: string;
  itemName: string;
  title: string;
  evidence: string;
  recommendation: string;
  occurredAt?: string;
};

export type InvestigatorResponse = {
  answer: string;
  findings: InvestigatorFinding[];
  generatedBy: string;
  analyzedItems: number;
  analyzedTransactions: number;
  periodDays: number;
  generatedAt: string;
};

export async function askInventoryInvestigator(question = "") {
  let response: Response;
  try {
    response = await fetch("/api/ai/investigator", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch {
    throw new Error("Cannot reach the Inventra AI service. Check your connection and try again.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `AI request failed (${response.status})`);
  }
  return result as InvestigatorResponse;
}

export async function loadInvestigatorDemoData() {
  let response: Response;
  try {
    response = await fetch("/api/ai/demo-data", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    throw new Error("Cannot reach the Inventra API. Check your connection and try again.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || `Demo data request failed (${response.status})`);
  }
  return result as { message: string; itemsCreated: number; transactionsCreated: number };
}
