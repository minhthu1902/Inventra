import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CirclePlus, MapPin } from "lucide-react";
import { Field, inputClass } from "@/components/shared/FormField";
import { createWarehouse, getWarehouseUtilization, getWarehouses, type WarehouseRecord, type WarehouseUtilization } from "@/utils/InventoryApi";
import { hasErrors, validateWarehouse, type FieldErrors } from "@/utils/inventoryValidation";

const emptyWarehouse = { name: "", code: "", address: "", capacityUnits: 1000 };

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [utilization, setUtilization] = useState<WarehouseUtilization[]>([]);
  const [draft, setDraft] = useState(emptyWarehouse);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([getWarehouses(), getWarehouseUtilization()])
      .then(([warehouseResult, utilizationResult]) => {
        if (!active) return;
        setWarehouses(warehouseResult.warehouses);
        setUtilization(utilizationResult.utilization);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load warehouses.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function update<K extends keyof typeof emptyWarehouse>(field: K, value: (typeof emptyWarehouse)[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const nextErrors = validateWarehouse(draft);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setIsSaving(true);
    try {
      const { warehouse } = await createWarehouse({
        name: draft.name.trim(),
        code: draft.code.trim().toUpperCase(),
        address: draft.address.trim(),
        capacityUnits: Number(draft.capacityUnits),
      });
      setDraft(emptyWarehouse);
      setNotice(`${warehouse.name} created. Add storage locations to start putting stock away.`);
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create the warehouse.");
    } finally {
      setIsSaving(false);
    }
  }

  const utilizationById = new Map(utilization.map((entry) => [entry.id, entry]));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <p className="text-xs font-semibold uppercase text-primary-600">Warehouse</p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">Warehouses</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your sites and see how full each one is.</p>
      </header>

      {error && <p className="rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-success/20 bg-success-bg px-4 py-3 text-sm text-success" role="status">{notice}</p>}

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Add warehouse</h2>
        <form noValidate onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Field label="Warehouse name" error={errors.name}><input required maxLength={120} value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="North Distribution Center" className={inputClass} /></Field>
          <Field label="Code" error={errors.code}><input required maxLength={32} value={draft.code} onChange={(event) => update("code", event.target.value)} placeholder="NDC-01" className={`${inputClass} uppercase`} /></Field>
          <Field label="Address (optional)" error={errors.address}><input maxLength={240} value={draft.address} onChange={(event) => update("address", event.target.value)} placeholder="Street, city" className={inputClass} /></Field>
          <Field label="Capacity (units)" error={errors.capacityUnits}><input type="number" min="0" step="1" value={draft.capacityUnits} onChange={(event) => update("capacityUnits", Number(event.target.value))} className={inputClass} /></Field>
          <div className="sm:col-span-2 xl:col-span-4">
            <button type="submit" disabled={isSaving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"><CirclePlus className="h-4 w-4" /> Add warehouse</button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Your warehouses</h2>
        {isLoading ? (
          <p className="py-6 text-center text-sm text-text-secondary" role="status">Loading warehouses…</p>
        ) : warehouses.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">No warehouses yet. Add your first one above.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {warehouses.map((warehouse) => {
              const usage = utilizationById.get(warehouse._id);
              const percent = usage?.usedPercent ?? 0;
              return (
                <li key={warehouse._id} className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium text-text-primary">{warehouse.name}</p>
                      <p className="text-xs text-text-secondary">{warehouse.code}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${percent >= 90 ? "bg-danger-bg text-danger" : percent >= 70 ? "bg-warning-bg text-warning" : "bg-success-bg text-success"}`}>{percent}% full</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-background">
                    <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
                    <span>{(usage?.usedUnits ?? 0).toLocaleString()} / {warehouse.capacityUnits.toLocaleString()} units</span>
                    <Link to={`/locations?warehouseId=${warehouse._id}`} className="inline-flex items-center gap-1 font-medium text-primary-600 hover:text-primary-700"><MapPin className="h-3.5 w-3.5" /> Manage locations</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
