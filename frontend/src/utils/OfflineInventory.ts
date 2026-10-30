import type { InventoryItem } from "./InventoryApi";

export type MovementPayload = {
  type: "inbound";
  quantity: number;
  reference?: string;
  note?: string;
} | {
  type: "outbound";
  quantity: number;
  reference?: string;
  note?: string;
} | {
  type: "adjustment";
  direction: "increase" | "decrease";
  quantity: number;
  reference?: string;
  note?: string;
} | {
  type: "transfer";
  destinationWarehouseId: string;
  destinationLocationId: string;
  quantity: number;
  reference?: string;
  note?: string;
};

export type QueuedMovement = {
  operationId: string;
  ownerId: string;
  inventoryItemId: string;
  sku: string;
  payload: MovementPayload;
  createdAt: string;
  status: "pending" | "syncing" | "conflict";
  error?: string;
};

type Snapshot<T> = { id: string; ownerId: string; value: T; savedAt: string };
type Setting = { id: string; value: string };
const DB_NAME = "inventra-offline-v1";
const DB_VERSION = 1;
const QUEUE_EVENT = "inventra:offline-queue-change";
const ACTIVE_OWNER_KEY = "active-owner";
const CACHED_USER_KEY = "cached-user";

let databasePromise: Promise<IDBDatabase> | undefined;
const activeSyncs = new Set<string>();

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error("This browser does not support local offline storage."));
  }
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("snapshots")) {
        database.createObjectStore("snapshots", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("operations")) {
        const operations = database.createObjectStore("operations", { keyPath: "operationId" });
        operations.createIndex("ownerId", "ownerId");
      }
      if (!database.objectStoreNames.contains("settings")) {
        database.createObjectStore("settings", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local inventory storage."));
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise!;
}

function storeRequest<T>(storeName: "snapshots" | "operations" | "settings", mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    let result: T | undefined;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error ?? new Error("Local inventory storage request failed."));
    transaction.oncomplete = () => resolve(result as T);
    transaction.onabort = () => reject(transaction.error ?? new Error("Local inventory storage transaction was aborted."));
  }));
}

function notifyQueueChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_EVENT));
}

export async function setActiveOfflineOwner(ownerId: string) {
  await storeRequest("settings", "readwrite", (store) => store.put({ id: ACTIVE_OWNER_KEY, value: ownerId } satisfies Setting));
}

export async function getActiveOfflineOwner() {
  const setting = await storeRequest<Setting | undefined>("settings", "readonly", (store) => store.get(ACTIVE_OWNER_KEY));
  return setting?.value ?? null;
}

export async function cacheOfflineUser(user: { id: string; name: string; email: string }) {
  await storeRequest("settings", "readwrite", (store) => store.put({
    id: CACHED_USER_KEY,
    value: JSON.stringify(user),
  } satisfies Setting));
}

export async function clearCachedOfflineUser() {
  await storeRequest("settings", "readwrite", (store) => store.delete(CACHED_USER_KEY));
}

export async function getCachedOfflineUser() {
  const setting = await storeRequest<Setting | undefined>("settings", "readonly", (store) => store.get(CACHED_USER_KEY));
  if (!setting) return null;
  try {
    const user = JSON.parse(setting.value) as { id?: string; name?: string; email?: string };
    return user.id && user.name && user.email ? { id: user.id, name: user.name, email: user.email } : null;
  } catch {
    return null;
  }
}

export function subscribeOfflineQueue(callback: () => void) {
  window.addEventListener(QUEUE_EVENT, callback);
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener(QUEUE_EVENT, callback);
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export async function saveOfflineSnapshot<T>(ownerId: string, key: string, value: T) {
  await storeRequest("snapshots", "readwrite", (store) => store.put({
    id: `${ownerId}:${key}`,
    ownerId,
    value,
    savedAt: new Date().toISOString(),
  } satisfies Snapshot<T>));
}

export async function readOfflineSnapshot<T>(ownerId: string, key: string) {
  const snapshot = await storeRequest<Snapshot<T> | undefined>("snapshots", "readonly", (store) => store.get(`${ownerId}:${key}`));
  return snapshot?.value ?? null;
}

export async function countOfflineSnapshots(ownerId: string) {
  return storeRequest<number>("snapshots", "readonly", (store) => store.count(IDBKeyRange.bound(`${ownerId}:`, `${ownerId}:￿`)));
}

// Removes cached read-only data; queued movements are kept so nothing unsynced is lost
export async function clearOfflineSnapshots(ownerId: string) {
  await storeRequest("snapshots", "readwrite", (store) => store.delete(IDBKeyRange.bound(`${ownerId}:`, `${ownerId}:￿`)));
}

export async function listQueuedMovements(ownerId: string) {
  return storeRequest<QueuedMovement[]>("operations", "readonly", (store) => store.index("ownerId").getAll(ownerId));
}

export async function getQueueSummary(ownerId: string | null) {
  if (!ownerId) return { pending: 0, conflicts: 0, items: [] as QueuedMovement[] };
  const items = await listQueuedMovements(ownerId);
  return {
    pending: items.filter((item) => item.status !== "conflict").length,
    conflicts: items.filter((item) => item.status === "conflict").length,
    items,
  };
}

function movementSign(payload: MovementPayload) {
  return payload.type === "inbound" || (payload.type === "adjustment" && payload.direction === "increase") ? 1 : -1;
}

export function withPendingStock(items: InventoryItem[], operations: QueuedMovement[]) {
  const pendingByItem = new Map<string, number>();
  for (const operation of operations) {
    if (operation.status === "conflict") continue;
    const id = operation.inventoryItemId;
    pendingByItem.set(id, (pendingByItem.get(id) ?? 0) + movementSign(operation.payload) * operation.payload.quantity);
    if (operation.payload.type === "transfer") {
      const payload = operation.payload;
      const destinationItem = items.find((item) => item.sku === operation.sku && item.warehouseId?._id === payload.destinationWarehouseId);
      if (destinationItem) pendingByItem.set(destinationItem._id, (pendingByItem.get(destinationItem._id) ?? 0) + operation.payload.quantity);
    }
  }
  return items.map((item) => ({
    ...item,
    quantity: Math.max(0, item.quantity + (pendingByItem.get(item._id) ?? 0)),
  }));
}

export async function enqueueStockMovement(ownerId: string, item: InventoryItem, payload: MovementPayload) {
  const currentQuantity = item.quantity;
  const sign = movementSign(payload);
  if (sign < 0 && payload.quantity > currentQuantity) {
    throw new Error("This movement is larger than the available stock on this device.");
  }
  const operation: QueuedMovement = {
    operationId: crypto.randomUUID(),
    ownerId,
    inventoryItemId: item._id,
    sku: item.sku,
    payload,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await storeRequest("operations", "readwrite", (store) => store.add(operation));
  notifyQueueChanged();
  return operation;
}

export async function retryQueuedMovement(operationId: string) {
  const operations = await storeRequest<QueuedMovement[]>("operations", "readonly", (store) => store.getAll());
  const operation = operations.find((candidate) => candidate.operationId === operationId);
  if (!operation) return;
  await updateOperation({ ...operation, status: "pending", error: undefined });
  if (navigator.onLine) void syncQueuedMovements(operation.ownerId);
}

export async function discardQueuedMovement(operationId: string) {
  await removeOperation(operationId);
}

async function updateOperation(operation: QueuedMovement) {
  await storeRequest("operations", "readwrite", (store) => store.put(operation));
  notifyQueueChanged();
}

async function removeOperation(operationId: string) {
  await storeRequest("operations", "readwrite", (store) => store.delete(operationId));
  notifyQueueChanged();
}

export async function syncQueuedMovements(ownerId: string) {
  if (!navigator.onLine || activeSyncs.has(ownerId)) return;
  activeSyncs.add(ownerId);
  try {
    const operations = (await listQueuedMovements(ownerId))
      .filter((operation) => operation.status !== "conflict")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const operation of operations) {
      await updateOperation({ ...operation, status: "syncing", error: undefined });
      try {
        const path = operation.payload.type === "transfer"
          ? `/api/inventory/${operation.inventoryItemId}/transfers`
          : `/api/inventory/${operation.inventoryItemId}/transactions`;
        const response = await fetch(path, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...operation.payload, clientOperationId: operation.operationId }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 409 || response.status === 400 || response.status === 404) {
            await updateOperation({
              ...operation,
              status: "conflict",
              error: result.message || "This movement needs review before it can sync.",
            });
            continue;
          }
          await updateOperation({ ...operation, status: "pending", error: result.message || "Waiting to sync." });
          break;
        }
        await removeOperation(operation.operationId);
      } catch {
        await updateOperation({ ...operation, status: "pending", error: "Waiting for a network connection." });
        break;
      }
    }
  } finally {
    activeSyncs.delete(ownerId);
  }
}

export function activateOfflineSync(ownerId: string) {
  let active = true;
  const sync = () => {
    if (active) void syncQueuedMovements(ownerId);
  };
  void (async () => {
    try {
      await setActiveOfflineOwner(ownerId);
      const operations = await listQueuedMovements(ownerId);
      await Promise.all(operations.filter((operation) => operation.status === "syncing").map((operation) => updateOperation({ ...operation, status: "pending" })));
      sync();
    } catch (error) {
      console.error("Unable to initialize offline inventory storage.", error);
    }
  })();
  window.addEventListener("online", sync);
  window.addEventListener("focus", sync);
  document.addEventListener("visibilitychange", sync);
  return () => {
    active = false;
    window.removeEventListener("online", sync);
    window.removeEventListener("focus", sync);
    document.removeEventListener("visibilitychange", sync);
  };
}

export const OFFLINE_QUEUE_EVENT = QUEUE_EVENT;
