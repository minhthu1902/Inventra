import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CirclePlus } from "lucide-react";
import { Field, inputClass } from "@/components/shared/FormField";
import { createLocation, getWarehouseLocations, getWarehouses, type LocationRecord, type WarehouseRecord } from "@/utils/InventoryApi";
import { hasErrors, validateLocation, type FieldErrors } from "@/utils/inventoryValidation";

const emptyLocation = { code: "", zone: "", capacityUnits: 100 };

export default function LocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [draft, setDraft] = useState(emptyLocation);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const requestedWarehouseId = searchParams.get("warehouseId") ?? "";
  const warehouseId = warehouses.some((warehouse) => warehouse._id === requestedWarehouseId)
    ? requestedWarehouseId
    : warehouses[0]?._id ?? "";
  const selectedWarehouse = warehouses.find((warehouse) => warehouse._id === warehouseId);

  useEffect(() => {
    getWarehouses()
      .then((result) => setWarehouses(result.warehouses))
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : "Unable to load warehouses."))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!warehouseId) {
      setLocations([]);
      return;
    }
    let active = true;
    getWarehouseLocations(warehouseId)
      .then((result) => {
        if (active) setLocations(result.locations);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load locations.");
      });
    return () => {
      active = false;
    };
  }, [warehouseId, reloadKey]);

  function update<K extends keyof typeof emptyLocation>(field: K, value: (typeof emptyLocation)[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const location = { warehouseId, code: draft.code, zone: draft.zone, capacityUnits: Number(draft.capacityUnits) };
    const nextErrors = validateLocation(location);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setIsSaving(true);
    try {
      const result = await createLocation({ ...location, code: location.code.trim().toUpperCase(), zone: location.zone.trim() });
      setDraft(emptyLocation);
      setNotice(`Location ${result.location.code} added to ${selectedWarehouse?.name ?? "the warehouse"}.`);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create the location.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase text-primary-600">Warehouse</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">Storage locations</h1>
        <p className="mt-1 text-sm text-text-secondary">Bins, shelves and zones where stock is put away.</p>
      </header>

      {error && <p className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-success/20 bg-success-bg px-4 py-3 text-sm text-success" role="status">{notice}</p>}

      {isLoading ? (
        <p className="py-6 text-center text-sm text-text-secondary" role="status">Loading warehouses…</p>
      ) : warehouses.length === 0 ? (
        <section className="rounded-xl border border-border bg-surface p-5 text-sm text-text-secondary">
          Locations belong to a warehouse. <Link to="/warehouses" className="font-semibold text-primary-600 hover:text-primary-700">Create a warehouse first</Link>.
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <div className="mb-4 max-w-sm">
              <Field label="Warehouse">
                <select value={warehouseId} onChange={(event) => setSearchParams({ warehouseId: event.target.value }, { replace: true })} className={inputClass}>
                  {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} ({warehouse.code})</option>)}
                </select>
              </Field>
            </div>
            <h2 className="mb-3 text-sm font-semibold text-text-primary">Add location</h2>
            <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Location code" error={errors.code}><input required maxLength={40} value={draft.code} onChange={(event) => update("code", event.target.value)} placeholder="A1-01" className={`${inputClass} uppercase`} /></Field>
              <Field label="Zone (optional)" error={errors.zone}><input maxLength={80} value={draft.zone} onChange={(event) => update("zone", event.target.value)} placeholder="Cold storage" className={inputClass} /></Field>
              <Field label="Capacity (units)" error={errors.capacityUnits}><input type="number" min="0" step="1" value={draft.capacityUnits} onChange={(event) => update("capacityUnits", Number(event.target.value))} className={inputClass} /></Field>
              <div className="sm:col-span-3">
                <button type="submit" disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><CirclePlus className="h-4 w-4" /> Add location</button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-semibold text-text-primary">{selectedWarehouse?.name} · {locations.length} location{locations.length === 1 ? "" : "s"}</h2>
            {locations.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-secondary">No locations in this warehouse yet.</p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {locations.map((location) => (
                  <li key={location._id} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-text-primary">{location.code}</span>
                      <span className="block truncate text-xs text-text-secondary">{location.zone || "No zone"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
