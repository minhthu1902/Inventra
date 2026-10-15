import { ChevronRight } from "lucide-react";
import type { WarehouseUtilization } from "@/utils/InventoryApi";

export default function WarehouseUtilizationCard({ warehouses }: { warehouses: WarehouseUtilization[] }) {

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Warehouse Utilization</h3>
        <button type="button" className="flex items-center text-xs font-medium text-primary-600 hover:underline">
          View details <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {warehouses.map((warehouse) => (
          <div key={warehouse.id} className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-text-primary">{warehouse.name}</span>
              <span className="shrink-0 text-text-secondary">{warehouse.usedPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background">
              <div className="h-full rounded-full bg-primary-600" style={{ width: `${warehouse.usedPercent}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">
              {warehouse.usedUnits.toLocaleString()} / {warehouse.capacityUnits.toLocaleString()} units
            </p>
          </div>
        ))}
        {warehouses.length === 0 && (
          <p className="py-6 text-center text-sm text-text-secondary">No warehouses configured yet.</p>
        )}
      </div>
    </div>
  );
}
