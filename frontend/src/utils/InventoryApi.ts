export type DashboardSummary = {
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
    type: "inbound" | "outbound" | "adjustment";
    adjustmentDirection: "increase" | "decrease" | null;
    quantity: number;
    stockAfter: number;
    reference: string;
    createdAt: string;
    item: { sku: string; name: string; unit: string } | null;
    warehouse: { name: string; code: string } | null;
    location: { code: string } | null;
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
    throw new Error(result.message || `Request failed (${response.status})`);
  }
  return result as T;
}

export function getDashboardSummary() {
  return requestJson<DashboardSummary>("/api/dashboard/summary");
}

export function getInventoryTrend(days: number) {
  return requestJson<{ trend: TrendPoint[] }>(`/api/dashboard/trend?days=${days}`);
}

export function getWarehouseUtilization() {
  return requestJson<{ utilization: WarehouseUtilization[] }>("/api/dashboard/warehouse-utilization");
}

export function getInventory(params: { search?: string; category?: string; stockStatus?: "all" | "low" | "out"; page?: number; limit?: number }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value));
  }
  return requestJson<{ items: InventoryItem[]; pagination: { page: number; limit: number; total: number; pages: number } }>(`/api/inventory?${query}`);
}

export function getWarehouses() {
  return requestJson<{ warehouses: WarehouseRecord[] }>("/api/inventory/warehouses");
}

export function getWarehouseLocations(warehouseId: string) {
  return requestJson<{ locations: LocationRecord[] }>(`/api/inventory/warehouses/${warehouseId}/locations`);
}

export function createWarehouse(data: { name: string; code: string; capacityUnits: number }) {
  return requestJson<{ warehouse: WarehouseRecord }>("/api/inventory/warehouses", "POST", data);
}

export function createLocation(data: { warehouseId: string; code: string; zone: string; capacityUnits: number }) {
  return requestJson<{ location: LocationRecord }>("/api/inventory/locations", "POST", data);
}

export function createInventoryItem(data: {
  warehouseId: string; locationId: string; sku: string; name: string; category: string;
  unit: string; quantity: number; reorderPoint: number; unitCost: number;
  isPerishable: boolean; expiryDate: string | null; batchNumber: string;
}) {
  return requestJson<{ item: InventoryItem }>("/api/inventory", "POST", data);
}

export function updateInventoryItem(itemId: string, data: {
  name?: string; category?: string; unit?: string; reorderPoint?: number; unitCost?: number;
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
}) {
  return requestJson(`/api/inventory/${itemId}/transactions`, "POST", data);
}