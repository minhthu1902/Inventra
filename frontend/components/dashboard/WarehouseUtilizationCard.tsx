import { ChevronRight } from "lucide-react";
import { warehouseUtilization } from "@/utils/dashboardData";

export default function WarehouseUtilizationCard() {
  const { usedPercent, usedArea, availableArea, totalArea } = warehouseUtilization;
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (usedPercent / 100) * circumference;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Warehouse Utilization</h3>
        <button type="button" className="flex items-center text-xs font-medium text-primary-600 hover:underline">
          View details <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#dce6f2" strokeWidth="10" />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#0b63d8"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold text-text-primary">{usedPercent}%</span>
            <span className="text-[10px] text-text-secondary">Used</span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-primary-600" /> Used Space
            </span>
            <span className="font-medium text-text-primary">{usedArea}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className="h-2 w-2 rounded-full bg-border" /> Available Space
            </span>
            <span className="font-medium text-text-primary">{availableArea}</span>
          </div>
          <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
            <span className="text-text-secondary">Total Space</span>
            <span className="font-medium text-text-primary">{totalArea}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
