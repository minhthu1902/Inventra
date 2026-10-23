import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownToLine, CirclePlus, Pencil, Search, X } from "lucide-react";
import {
  createInventoryItem,
  createLocation,
  recordStockMovement,
  createWarehouse,
  getInventory,
  getWarehouses,
  getWarehouseLocations,
  updateInventoryItem,
  type InventoryItem,
  type LocationRecord,
  type WarehouseRecord,
} from "@/utils/InventoryApi";
import {
  discardQueuedMovement,
  getActiveOfflineOwner,
  getQueueSummary,
  retryQueuedMovement,
  subscribeOfflineQueue,
  syncQueuedMovements,
  type QueuedMovement,
} from "@/utils/OfflineInventory";

const emptyDraft = {
  sku: "",
  barcode: "",
  name: "",
  category: "Produce",
  unit: "each",
  quantity: 0,
  reorderPoint: 0,
  unitCost: 0,
  isPerishable: false,
  expiryDate: "",
  batchNumber: "",
  warehouseId: "",
  locationId: "",
};

type ItemDraft = typeof emptyDraft;
type DialogState = { type: "edit" | "movement"; item: InventoryItem } | null;
type MovementType = "inbound" | "outbound" | "adjustment" | "transfer";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [transferLocations, setTransferLocations] = useState<LocationRecord[]>([]);
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [movementType, setMovementType] = useState<MovementType>("inbound");
  const [adjustmentDirection, setAdjustmentDirection] = useState<"increase" | "decrease">("increase");
  const [movementQuantity, setMovementQuantity] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<"all" | "low" | "out">("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [queue, setQueue] = useState<{ pending: number; conflicts: number; items: QueuedMovement[] }>({ pending: 0, conflicts: 0, items: [] });

  useEffect(() => {
    let active = true;
    const refreshQueue = async () => {
      const ownerId = await getActiveOfflineOwner().catch(() => null);
      const nextQueue = await getQueueSummary(ownerId).catch(() => ({ pending: 0, conflicts: 0, items: [] }));
      if (active) setQueue(nextQueue);
    };
    const handleChange = () => {
      setIsOffline(!navigator.onLine);
      void refreshQueue();
      setReloadKey((key) => key + 1);
    };
    void refreshQueue();
    const unsubscribe = subscribeOfflineQueue(handleChange);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    Promise.all([
      getInventory({ search, stockStatus, page, limit: 100 }),
      getWarehouses(),
    ])
      .then(([inventory, warehouseResult]) => {
        if (!active) return;
        setItems(inventory.items);
        setIsOffline(inventory.offline || !navigator.onLine);
        setPages(inventory.pagination.pages);
        setTotal(inventory.pagination.total);
        setWarehouses(warehouseResult.warehouses);
        void Promise.all(warehouseResult.warehouses.map((warehouse) => getWarehouseLocations(warehouse._id).catch(() => null)));
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load inventory.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reloadKey, search, stockStatus]);

  useEffect(() => {
    if (!draft.warehouseId) {
      setLocations([]);
      return;
    }
    let active = true;
    getWarehouseLocations(draft.warehouseId)
      .then(({ locations: warehouseLocations }) => {
        if (active) setLocations(warehouseLocations);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load locations.");
      });
    return () => {
      active = false;
    };
  }, [draft.warehouseId]);

  useEffect(() => {
    if (warehouses.length && !draft.warehouseId) {
      setDraft((current) => ({ ...current, warehouseId: warehouses[0]._id }));
    }
  }, [draft.warehouseId, warehouses]);

  useEffect(() => {
    if (locations.length && !draft.locationId) {
      setDraft((current) => ({ ...current, locationId: locations[0]._id }));
    }
  }, [draft.locationId, locations]);

  useEffect(() => {
    if (!dialog || dialog.type !== "movement" || movementType !== "transfer" || !destinationWarehouseId) {
      setTransferLocations([]);
      setDestinationLocationId("");
      return;
    }
    let active = true;
    getWarehouseLocations(destinationWarehouseId)
      .then(({ locations: nextLocations }) => {
        if (!active) return;
        setTransferLocations(nextLocations);
        const destinationItem = items.find((item) => item.sku === dialog.item.sku && item.warehouseId?._id === destinationWarehouseId);
        const destinationLocation = destinationItem?.locationId?._id;
        setDestinationLocationId((current) =>
          destinationLocation ?? (nextLocations.some((location) => location._id === current) ? current : nextLocations[0]?._id ?? ""),
        );
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load destination locations.");
      });
    return () => { active = false; };
  }, [destinationWarehouseId, dialog, items, movementType]);

  function updateDraft<K extends keyof ItemDraft>(field: K, value: ItemDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateWarehouse() {
    setIsSaving(true);
    setError("");
    try {
      const { warehouse } = await createWarehouse({
        name: "Main Warehouse",
        code: `WH-${Date.now().toString(36).toUpperCase()}`,
        capacityUnits: 1000,
      });
      const { location } = await createLocation({
        warehouseId: warehouse._id,
        code: "A1-01",
        zone: "General",
        capacityUnits: 1000,
      });
      setWarehouses((current) => [...current, warehouse]);
      setDraft((current) => ({ ...current, warehouseId: warehouse._id, locationId: location._id }));
      setLocations([location]);
      setNotice("Warehouse and first location created.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create a warehouse.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      await createInventoryItem({
        warehouseId: draft.warehouseId,
        locationId: draft.locationId,
        sku: draft.sku,
        barcode: draft.barcode,
        name: draft.name,
        category: draft.category,
        unit: draft.unit,
        quantity: Number(draft.quantity),
        reorderPoint: Number(draft.reorderPoint),
        unitCost: Number(draft.unitCost),
        isPerishable: draft.isPerishable,
        expiryDate: draft.expiryDate ? new Date(draft.expiryDate).toISOString() : null,
        batchNumber: draft.batchNumber,
      });
      setDraft({ ...emptyDraft, warehouseId: warehouses[0]?._id ?? "", locationId: locations[0]?._id ?? "" });
      setNotice("Inventory item created.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create inventory item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || dialog.type !== "edit") return;
    const formData = new FormData(event.currentTarget);
    setIsSaving(true);
    setError("");
    try {
      await updateInventoryItem(dialog.item._id, {
        name: String(formData.get("name")),
        barcode: String(formData.get("barcode")),
        category: String(formData.get("category")),
        unit: String(formData.get("unit")),
        reorderPoint: Number(formData.get("reorderPoint")),
        unitCost: Number(formData.get("unitCost")),
        isPerishable: formData.get("isPerishable") === "on",
        batchNumber: String(formData.get("batchNumber")),
        expiryDate: formData.get("expiryDate") ? new Date(String(formData.get("expiryDate"))).toISOString() : null,
      });
      setDialog(null);
      setNotice("Inventory item updated.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update inventory item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || dialog.type !== "movement") return;
    setIsSaving(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      const type = String(formData.get("type")) as MovementType;
      const common = {
        quantity: Number(formData.get("quantity")),
        reference: String(formData.get("reference")),
        note: String(formData.get("note")),
      };
      if (type === "transfer") {
        const destinationItem = items.find((item) => item.sku === dialog.item.sku && item.warehouseId?._id === destinationWarehouseId);
        await recordStockMovement(dialog.item, {
          type,
          destinationWarehouseId,
          destinationLocationId: destinationItem?.locationId?._id ?? destinationLocationId,
          ...common,
        });
      } else if (type === "adjustment") {
        await recordStockMovement(dialog.item, {
          type: "adjustment",
          direction: String(formData.get("direction")) as "increase" | "decrease",
          ...common,
        });
      } else {
        await recordStockMovement(dialog.item, { type, ...common });
      }
      setDialog(null);
      setNotice(navigator.onLine ? "Saved on this device. Syncing with the server…" : "Saved locally — pending sync.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to record stock movement.");
    } finally {
      setIsSaving(false);
    }
  }

  function openMovement(item: InventoryItem) {
    setMovementType("inbound");
    setMovementQuantity(1);
    setDestinationWarehouseId(warehouses.find((warehouse) => warehouse._id !== item.warehouseId?._id)?._id ?? "");
    setDialog({ type: "movement", item });
  }

  const pendingItemIds = useMemo(
    () => {
      const ids = new Set<string>();
      for (const operation of queue.items) {
        if (operation.status === "conflict") continue;
        ids.add(operation.inventoryItemId);
        if (operation.payload.type === "transfer") {
          const payload = operation.payload;
          const destinationItem = items.find((item) => item.sku === operation.sku && item.warehouseId?._id === payload.destinationWarehouseId);
          if (destinationItem) ids.add(destinationItem._id);
        }
      }
      return ids;
    },
    [items, queue.items],
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = scanCode.trim().toLocaleLowerCase();
    const item = items.find((candidate) => candidate.sku.toLocaleLowerCase() === code || candidate.barcode?.toLocaleLowerCase() === code);
    if (!item) {
      setError("No item with that barcode or SKU is available on this device. Sync the inventory while online first.");
      return;
    }
    setError("");
    setMovementType("inbound");
    setMovementQuantity(1);
    setDialog({ type: "movement", item });
    setScanCode("");
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-600">Inventory</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">Items and stock</h1>
          <p className="mt-1 text-sm text-text-secondary">Search products and record stock changes.</p>
        </div>
        <p className="text-sm text-text-secondary">{total.toLocaleString()} items</p>
      </header>

      {error && <p className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-success/20 bg-success-bg px-4 py-3 text-sm text-success" role="status">{notice}</p>}

      {(isOffline || queue.pending > 0 || queue.conflicts > 0) && (
        <aside className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${queue.conflicts ? "border-warning/30 bg-warning-bg" : "border-info/20 bg-info-bg"}`} role="status">
          <div>
            <p className="text-sm font-semibold text-text-primary">{isOffline ? "Offline inventory" : "Inventory sync"}</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {isOffline ? "Movements are saved on this device and will sync when the connection returns." : `${queue.pending} movement${queue.pending === 1 ? "" : "s"} waiting to sync.`}
              {queue.conflicts > 0 ? ` ${queue.conflicts} need review because the server rejected them.` : ""}
            </p>
          </div>
          <button type="button" onClick={async () => { const ownerId = await getActiveOfflineOwner(); if (ownerId) await syncQueuedMovements(ownerId); }} disabled={isOffline || queue.pending === 0} className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary disabled:opacity-50">
            Sync now
          </button>
          {queue.items.filter((operation) => operation.status === "conflict").map((operation) => (
            <div key={operation.operationId} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-warning/20 bg-surface/70 p-2 text-xs">
              <span className="text-text-secondary">{operation.sku}: {operation.error ?? "Needs review"}</span>
              <span className="flex gap-2">
                <button type="button" onClick={() => void retryQueuedMovement(operation.operationId)} className="rounded border border-border px-2 py-1 font-semibold text-text-primary">Retry</button>
                <button type="button" onClick={() => { if (window.confirm("Remove this rejected movement from this device?")) void discardQueuedMovement(operation.operationId); }} className="rounded border border-border px-2 py-1 text-text-secondary">Remove</button>
              </span>
            </div>
          ))}
        </aside>
      )}

      {warehouses.length === 0 && !isLoading && (
        <section className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-5">
          <div>
            <h2 className="font-semibold text-text-primary">Set up your first warehouse</h2>
            <p className="mt-1 text-sm text-text-secondary">Inventory items need a warehouse and a storage location.</p>
          </div>
          <button type="button" onClick={handleCreateWarehouse} disabled={isSaving} className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
            <CirclePlus className="h-4 w-4" /> Create warehouse
          </button>
        </section>
      )}

      {warehouses.length > 0 && (
        <section className="border-y border-border py-5">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">Add inventory item</h2>
          <form onSubmit={handleCreateItem} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="SKU"><input required maxLength={64} value={draft.sku} onChange={(event) => updateDraft("sku", event.target.value)} placeholder="HEB-PRD-001" className={inputClass} /></Field>
            <Field label="Barcode (optional)"><input maxLength={80} value={draft.barcode} onChange={(event) => updateDraft("barcode", event.target.value)} placeholder="Scan barcode or enter it" className={inputClass} /></Field>
            <Field label="Product name"><input required maxLength={160} value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} placeholder="Product name" className={inputClass} /></Field>
            <Field label="Category"><input value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} placeholder="Produce" className={inputClass} /></Field>
            <Field label="Unit"><input value={draft.unit} onChange={(event) => updateDraft("unit", event.target.value)} placeholder="each, case, lb" className={inputClass} /></Field>
            <Field label="Opening quantity"><input required type="number" min="0" step="any" value={draft.quantity} onChange={(event) => updateDraft("quantity", Number(event.target.value))} className={inputClass} /></Field>
            <Field label="Reorder point"><input required type="number" min="0" step="any" value={draft.reorderPoint} onChange={(event) => updateDraft("reorderPoint", Number(event.target.value))} className={inputClass} /></Field>
            <Field label="Unit cost (USD)"><input required type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => updateDraft("unitCost", Number(event.target.value))} className={inputClass} /></Field>
            <Field label="Warehouse"><select required value={draft.warehouseId} onChange={(event) => { updateDraft("warehouseId", event.target.value); updateDraft("locationId", ""); }} className={inputClass}>{warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} ({warehouse.code})</option>)}</select></Field>
            <Field label="Location"><select required value={draft.locationId} onChange={(event) => updateDraft("locationId", event.target.value)} className={inputClass}>{locations.map((location) => <option key={location._id} value={location._id}>{location.code} {location.zone}</option>)}</select></Field>
            <Field label="Batch number"><input value={draft.batchNumber} onChange={(event) => updateDraft("batchNumber", event.target.value)} placeholder="Optional" className={inputClass} /></Field>
            <Field label="Expiry date"><input type="date" value={draft.expiryDate} onChange={(event) => updateDraft("expiryDate", event.target.value)} className={inputClass} /></Field>
            <div className="flex items-end gap-3">
              <label className="flex h-10 items-center gap-2 text-sm text-text-secondary"><input type="checkbox" checked={draft.isPerishable} onChange={(event) => updateDraft("isPerishable", event.target.checked)} /> Perishable</label>
              <button type="submit" disabled={isSaving || !draft.locationId} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><CirclePlus className="h-4 w-4" /> Add item</button>
            </div>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <form onSubmit={handleScan} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4">
          <Field label="Scan barcode or enter SKU"><input autoComplete="off" autoFocus value={scanCode} onChange={(event) => setScanCode(event.target.value)} placeholder="Scan with a USB / Bluetooth scanner" className={`${inputClass} min-w-64`} /></Field>
          <button type="submit" disabled={!scanCode.trim()} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white disabled:opacity-50">Find item</button>
          <p className="w-full text-xs text-text-secondary">Keyboard-wedge barcode scanners work offline after this inventory has been cached on the device.</p>
        </form>
        <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-3">
          <Field label="Search SKU or product"><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search inventory..." className={`${inputClass} min-w-56`} /></Field>
          <Field label="Stock status"><select value={stockStatus} onChange={(event) => { setStockStatus(event.target.value as "all" | "low" | "out"); setPage(1); }} className={inputClass}><option value="all">All stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select></Field>
          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-text-primary hover:bg-background"><Search className="h-4 w-4" /> Search</button>
        </form>

        {isLoading ? <p className="py-8 text-center text-sm text-text-secondary" role="status">Loading inventory…</p> : items.length === 0 ? <p className="border-y border-border py-10 text-center text-sm text-text-secondary">No inventory items match this view.</p> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead><tr className="border-b border-border text-xs text-text-secondary"><th className="py-3 pr-4 font-medium">SKU / Item</th><th className="py-3 pr-4 font-medium">Category</th><th className="py-3 pr-4 font-medium">Location</th><th className="py-3 pr-4 font-medium">On hand</th><th className="py-3 pr-4 font-medium">Reorder at</th><th className="py-3 pr-4 font-medium">Unit cost</th><th className="py-3 font-medium">Actions</th></tr></thead>
                <tbody>{items.map((item) => <InventoryTableRow key={item._id} item={item} isPending={pendingItemIds.has(item._id)} onEdit={() => setDialog({ type: "edit", item })} onMovement={() => openMovement(item)} />)}</tbody>
              </table>
            </div>
            <ul className="divide-y divide-border md:hidden">{items.map((item) => <InventoryMobileRow key={item._id} item={item} isPending={pendingItemIds.has(item._id)} onEdit={() => setDialog({ type: "edit", item })} onMovement={() => openMovement(item)} />)}</ul>
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm text-text-secondary">
              <span>Page {page} of {Math.max(pages, 1)}</span>
              <div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Previous</button><button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Next</button></div>
            </div>
          </>
        )}
      </section>

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary-900/50 p-4 pt-12" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
          <section className="w-full max-w-lg rounded-lg border border-border bg-surface p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><h2 id="inventory-dialog-title" className="font-semibold text-text-primary">{dialog.type === "edit" ? "Edit inventory item" : "Record stock movement"}</h2><p className="mt-1 text-sm text-text-secondary">{dialog.item.sku} · {dialog.item.name}</p></div>
              <button type="button" onClick={() => setDialog(null)} aria-label="Close dialog" className="flex h-8 w-8 items-center justify-center rounded-md text-text-secondary hover:bg-background"><X className="h-4 w-4" /></button>
            </div>
            {dialog.type === "edit" ? (
              <form onSubmit={handleUpdateItem} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Product name"><input name="name" required defaultValue={dialog.item.name} className={inputClass} /></Field>
                <Field label="Barcode"><input name="barcode" defaultValue={dialog.item.barcode ?? ""} className={inputClass} /></Field>
                <Field label="Category"><input name="category" defaultValue={dialog.item.category} className={inputClass} /></Field>
                <Field label="Unit"><input name="unit" defaultValue={dialog.item.unit} className={inputClass} /></Field>
                <Field label="Reorder point"><input name="reorderPoint" type="number" min="0" step="any" defaultValue={dialog.item.reorderPoint} className={inputClass} /></Field>
                <Field label="Unit cost"><input name="unitCost" type="number" min="0" step="0.01" defaultValue={dialog.item.unitCost} className={inputClass} /></Field>
                <Field label="Expiry date"><input name="expiryDate" type="date" defaultValue={dialog.item.expiryDate?.slice(0, 10) ?? ""} className={inputClass} /></Field>
                <Field label="Batch number"><input name="batchNumber" defaultValue={dialog.item.batchNumber} className={inputClass} /></Field>
                <label className="flex items-center gap-2 text-sm text-text-secondary"><input name="isPerishable" type="checkbox" defaultChecked={dialog.item.isPerishable} /> Perishable</label>
                <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setDialog(null)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button disabled={isSaving} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Save</button></div>
              </form>
            ) : (
              <form onSubmit={handleMovement} className="grid grid-cols-1 gap-3">
                <Field label="Movement type"><select name="type" value={movementType} onChange={(event) => setMovementType(event.target.value as MovementType)} className={inputClass}><option value="inbound">Receive inventory</option><option value="outbound">Issue inventory</option><option value="transfer">Transfer inventory</option><option value="adjustment">Adjust count</option></select></Field>
                {movementType === "adjustment" && <Field label="Adjustment direction"><select name="direction" value={adjustmentDirection} onChange={(event) => setAdjustmentDirection(event.target.value as typeof adjustmentDirection)} className={inputClass}><option value="increase">Increase</option><option value="decrease">Decrease</option></select></Field>}
                {movementType === "transfer" && <>
                  <Field label="Destination warehouse"><select required value={destinationWarehouseId} onChange={(event) => setDestinationWarehouseId(event.target.value)} className={inputClass}><option value="">Choose warehouse</option>{warehouses.filter((warehouse) => warehouse._id !== dialog.item.warehouseId?._id).map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} ({warehouse.code})</option>)}</select></Field>
                  <Field label="Destination location"><select required value={destinationLocationId} onChange={(event) => setDestinationLocationId(event.target.value)} className={inputClass}><option value="">Choose location</option>{transferLocations.map((location) => <option key={location._id} value={location._id}>{location.code} {location.zone}</option>)}</select></Field>
                  <p className="text-xs text-text-secondary sm:col-span-2">Inventra will create the SKU at the destination warehouse if it does not exist there yet.</p>
                </>}
                <Field label="Quantity"><input name="quantity" type="number" min="0.01" step="any" required value={movementQuantity} onChange={(event) => setMovementQuantity(Number(event.target.value))} className={inputClass} /></Field>
                <Field label="Reference"><input name="reference" placeholder="Optional PO / shipment reference" className={inputClass} /></Field>
                <Field label="Note"><input name="note" placeholder="Optional note" className={inputClass} /></Field>
                <p className="text-xs text-text-secondary">Current stock: {dialog.item.quantity} {dialog.item.unit}</p>
                <div className="flex justify-end gap-2"><button type="button" onClick={() => setDialog(null)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button disabled={isSaving} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Record movement</button></div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

const inputClass = "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-text-secondary">{label}{children}</label>;
}

function InventoryTableRow({ item, isPending, onEdit, onMovement }: { item: InventoryItem; isPending: boolean; onEdit: () => void; onMovement: () => void }) {
  const isLow = item.quantity <= item.reorderPoint;
  return (
    <tr className="border-b border-border text-text-secondary">
      <td className="py-3 pr-4"><p className="font-medium text-text-primary">{item.name}</p><p className="text-xs">{item.sku}</p></td>
      <td className="py-3 pr-4">{item.category}</td><td className="py-3 pr-4">{item.locationId?.code ?? "—"}</td>
      <td className={`py-3 pr-4 font-semibold ${isLow ? "text-danger" : "text-text-primary"}`}>{item.quantity} {item.unit}{isPending && <span className="mt-1 block text-[10px] font-medium text-warning">Pending sync</span>}</td>
      <td className="py-3 pr-4">{item.reorderPoint}</td><td className="py-3 pr-4">${item.unitCost.toFixed(2)}</td>
      <td className="py-3"><div className="flex gap-2"><button type="button" onClick={onMovement} title="Record stock movement" aria-label={`Record movement for ${item.sku}`} className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-background"><ArrowDownToLine className="h-4 w-4" /></button><button type="button" onClick={onEdit} title="Edit item" aria-label={`Edit ${item.sku}`} className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-background"><Pencil className="h-4 w-4" /></button></div></td>
    </tr>
  );
}

function InventoryMobileRow({ item, isPending, onEdit, onMovement }: { item: InventoryItem; isPending: boolean; onEdit: () => void; onMovement: () => void }) {
  const isLow = item.quantity <= item.reorderPoint;
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-medium text-text-primary">{item.name}</p><p className="text-xs text-text-secondary">{item.sku} · {item.category}</p></div><span className={`shrink-0 text-sm font-semibold ${isLow ? "text-danger" : "text-text-primary"}`}>{item.quantity} {item.unit}</span></div>
      <p className="text-xs text-text-secondary">{item.locationId?.code ?? "—"} · Reorder at {item.reorderPoint} · ${item.unitCost.toFixed(2)} / unit{isPending ? " · Pending sync" : ""}</p>
      <div className="flex gap-2"><button type="button" onClick={onMovement} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium"><ArrowDownToLine className="h-3.5 w-3.5" /> Stock movement</button><button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium"><Pencil className="h-3.5 w-3.5" /> Edit</button></div>
    </li>
  );
}
