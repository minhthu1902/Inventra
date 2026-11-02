import {
  enqueueStockMovement,
  getActiveOfflineOwner,
  listQueuedMovements,
  readOfflineSnapshot,
  saveOfflineSnapshot,
  syncQueuedMovements,
  withPendingStock,
  type MovementPayload,
} from "./OfflineInventory";

export type DashboardSummary = {
  offline?: boolean;
  totalSkus: number;
  totalUnits: number;
  lowStockItems: number;
  outOfStockItems: number;
  inboundToday: { quantity: number; transactions: number };
  outboundToday: { quantity: number; transactions: number };
  lowStock: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    unit: string;
    reorderPoint: number;
    warehouse: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: "inbound" | "outbound" | "adjustment" | "transfer";
    adjustmentDirection: "increase" | "decrease" | null;
    quantity: number;
    stockAfter: number;
    reference: string;
    createdAt: string;
    item: { sku: string; name: string; unit: string } | null;
    warehouse: { name: string; code: string } | null;
    location: { code: string } | null;
    destinationItem?: { sku: string; name: string; unit: string } | null;
    destinationWarehouse?: { name: string; code: string } | null;
    destinationLocation?: string | null;
  }>;
};

export type TrendPoint = {
  label: string;
  stockLevel: number;
  inbound: number;
  outbound: number;
};

export type WarehouseUtilization = {
  id: string;
  name: string;
  usedUnits: number;
  capacityUnits: number;
  usedPercent: number;
};

export type InventoryItem = {
  _id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderPoint: number;
  unitCost: number;
  isPerishable: boolean;
  expiryDate: string | null;
  batchNumber: string;
  warehouseId: { _id: string; name: string; code: string };
  locationId: { _id: string; code: string; zone: string };
};

export type WarehouseRecord = {
  _id: string;
  name: string;
  code: string;
  capacityUnits: number;
};

export type LocationRecord = {
  _id: string;
  warehouseId: string;
  code: string;
  zone: string;
};

async function requestJson<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "include",
      ...(body === undefined ? {} : {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    });
  } catch {
    throw new Error("Cannot reach the Inventra API. Check that the backend is running.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldErrors = Array.isArray(result.errors)
      ? (result.errors as Array<{ path?: string; message?: string }>).map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message)).join("; ")
      : "";
    throw new Error(fieldErrors || result.message || `Request failed (${response.status})`);
  }
  return result as T;
}

export function getDashboardSummary() {
  return dashboardRequest<DashboardSummary>("/api/dashboard/summary", "dashboard:summary").then(async (summary) => {
    if (!summary.offline) return summary;
    const ownerId = await getActiveOfflineOwner().catch(() => null);
    if (!ownerId) return summary;
    const operations = await listQueuedMovements(ownerId).catch(() => []);
    const pendingDelta = operations.reduce((total, operation) => {
      if (operation.payload.type === "transfer") return total;
      const increases = operation.payload.type === "inbound" || (operation.payload.type === "adjustment" && operation.payload.direction === "increase");
      return total + (increases ? operation.payload.quantity : -operation.payload.quantity);
    }, 0);
    return { ...summary, totalUnits: Math.max(0, summary.totalUnits + pendingDelta) };
  });
}

export function getInventoryTrend(days: number) {
  return dashboardRequest<{ trend: TrendPoint[] }>(`/api/dashboard/trend?days=${days}`, `dashboard:trend:${days}`);
}

export function getWarehouseUtilization() {
  return dashboardRequest<{ utilization: WarehouseUtilization[] }>("/api/dashboard/warehouse-utilization", "dashboard:warehouse-utilization");
}

async function dashboardRequest<T extends Record<string, unknown>>(path: string, cacheKey: string): Promise<T & { offline?: boolean }> {
  const ownerId = await getActiveOfflineOwner().catch(() => null);
  try {
    const result = await requestJson<T>(path);
    if (ownerId) await saveOfflineSnapshot(ownerId, cacheKey, result).catch(() => undefined);
    return { ...result, offline: false };
  } catch (error) {
    if (!ownerId) throw error;
    const cached = await readOfflineSnapshot<T>(ownerId, cacheKey);
    if (!cached) throw error;
    return { ...cached, offline: true };
  }
}

export async function getInventory(params: { search?: string; category?: string; warehouseId?: string; stockStatus?: "all" | "low" | "out"; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  const cacheKey = `inventory:${query.toString()}`;
  const ownerId = await getActiveOfflineOwner().catch(() => null);
  try {
    const result = await requestJson<{ items: InventoryItem[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/inventory?${query}`);
    if (ownerId) await saveOfflineSnapshot(ownerId, cacheKey, result).catch(() => undefined);
    const operations = ownerId ? await listQueuedMovements(ownerId).catch(() => []) : [];
    return { ...result, items: withPendingStock(result.items, operations), offline: false };
  } catch (error) {
    if (!ownerId) throw error;
    const cached = await readOfflineSnapshot<{ items: InventoryItem[]; pagination: { page: number; limit: number; total: number; pages: number } }>(ownerId, cacheKey);
    if (!cached) throw error;
    const operations = await listQueuedMovements(ownerId);
    return { ...cached, items: withPendingStock(cached.items, operations), offline: true };
  }
}

export async function getWarehouses() {
  const ownerId = await getActiveOfflineOwner().catch(() => null);
  try {
    const result = await requestJson<{ warehouses: WarehouseRecord[] }>("/api/inventory/warehouses");
    if (ownerId) await saveOfflineSnapshot(ownerId, "warehouses", result).catch(() => undefined);
    return result;
  } catch (error) {
    if (!ownerId) throw error;
    const cached = await readOfflineSnapshot<{ warehouses: WarehouseRecord[] }>(ownerId, "warehouses");
    if (!cached) throw error;
    return cached;
  }
}

export async function getWarehouseLocations(warehouseId: string) {
  const ownerId = await getActiveOfflineOwner().catch(() => null);
  try {
    const result = await requestJson<{ locations: LocationRecord[] }>(`/api/inventory/warehouses/${warehouseId}/locations`);
    if (ownerId) await saveOfflineSnapshot(ownerId, `locations:${warehouseId}`, result).catch(() => undefined);
    return result;
  } catch (error) {
    if (!ownerId) throw error;
    const cached = await readOfflineSnapshot<{ locations: LocationRecord[] }>(ownerId, `locations:${warehouseId}`);
    if (!cached) throw error;
    return cached;
  }
}

export function createWarehouse(data: { name: string; code: string; address?: string; capacityUnits: number }) {
  return requestJson<{ warehouse: WarehouseRecord }>("/api/inventory/warehouses", "POST", data);
}

export function createLocation(data: { warehouseId: string; code: string; zone: string; capacityUnits: number }) {
  return requestJson<{ location: LocationRecord }>("/api/inventory/locations", "POST", data);
}

export function createInventoryItem(data: {
  warehouseId: string; locationId: string; sku: string; barcode: string; name: string; category: string;
  unit: string; quantity: number; reorderPoint: number; unitCost: number;
  isPerishable: boolean; expiryDate: string | null; batchNumber: string;
}) {
  return requestJson<{ item: InventoryItem }>("/api/inventory", "POST", data);
}

export function updateInventoryItem(itemId: string, data: {
  name?: string; barcode?: string; category?: string; unit?: string; reorderPoint?: number; unitCost?: number;
  isPerishable?: boolean; expiryDate?: string | null; batchNumber?: string;
}) {
  return requestJson<{ item: InventoryItem }>(`/api/inventory/${itemId}`, "PATCH", data);
}

export function createStockMovement(itemId: string, data: {
  type: "inbound" | "outbound" | "adjustment";
  direction?: "increase" | "decrease";
  quantity: number;
  reference?: string;
  note?: string;
  clientOperationId?: string;
}) {
  return requestJson(`/api/inventory/${itemId}/transactions`, "POST", data);
}

export async function recordStockMovement(item: InventoryItem, data: MovementPayload) {
  const ownerId = await getActiveOfflineOwner();
  if (!ownerId) throw new Error("Your offline inventory profile is not ready. Reconnect and sign in before recording movements.");
  const operation = await enqueueStockMovement(ownerId, item, data);
  if (navigator.onLine) void syncQueuedMovements(ownerId);
  return operation;
}

export function deleteInventoryItem(itemId: string) {
  return requestJson<{ deletedItemId: string; removedQuantity: number }>(`/api/inventory/${itemId}`, "DELETE");
}

export type TransactionType = "inbound" | "outbound" | "adjustment" | "transfer";

export type TransactionRecord = {
  _id: string;
  type: TransactionType;
  adjustmentDirection: "increase" | "decrease" | null;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reference: string;
  note: string;
  createdAt: string;
  inventoryItemId: { _id: string; sku: string; name: string; unit: string } | null;
  warehouseId: { _id: string; name: string; code: string } | null;
  locationId: { _id: string; code: string } | null;
  destinationInventoryItemId: { _id: string; sku: string; name: string; unit: string } | null;
  destinationWarehouseId: { _id: string; name: string; code: string } | null;
  destinationLocationId: { _id: string; code: string } | null;
};

export function getTransactions(params: { type?: TransactionType; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  return requestJson<{ transactions: TransactionRecord[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/inventory/transactions?${query}`);
}

export type InventoryReport = {
  generatedAt: string;
  totals: { items: number; units: number; value: number; lowStock: number; outOfStock: number };
  warehouses: Array<{ id: string; name: string; code: string; items: number; units: number; value: number }>;
  categories: Array<{ category: string; items: number; units: number; value: number }>;
  movementsLast30Days: Array<{ type: TransactionType; quantity: number; transactions: number }>;
};

export function getInventoryReport() {
  return requestJson<InventoryReport>("/api/dashboard/report");
}
