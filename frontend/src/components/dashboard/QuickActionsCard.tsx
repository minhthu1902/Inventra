import { PackagePlus, Truck, Repeat, PlusCircle } from "lucide-react";
import type { QuickAction } from "@/utils/dashboardData";
import { quickActions } from "@/utils/dashboardData";

const iconMap = {
  receive: PackagePlus,
  shipment: Truck,
  transfer: Repeat,
  addItem: PlusCircle,
} as const;

const toneMap = {
  green: "bg-success-bg text-success",
  blue: "bg-primary-50 text-primary-600",
  purple: "bg-transfer-bg text-transfer",
  amber: "bg-warning-bg text-warning",
} as const;

export default function QuickActionsCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <QuickActionButton key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

function QuickActionButton({ action }: { action: QuickAction }) {
  const Icon = iconMap[action.icon];
  return (
    <button
      type="button"
      className="flex flex-col items-start gap-2 rounded-lg border border-border p-3 text-left hover:border-primary-400 hover:bg-primary-50/40"
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[action.tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-xs font-semibold text-text-primary">{action.label}</span>
        <span className="block text-[11px] text-text-secondary">{action.description}</span>
      </span>
    </button>
  );
}
