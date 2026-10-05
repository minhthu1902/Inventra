import { FileText, ClipboardCheck, MapPinned, ShoppingCart, PackageCheck, ArrowRight } from "lucide-react";
import type { WorkflowStep } from "@/utils/dashboardData";
import { workflowSteps } from "@/utils/dashboardData";

const iconMap = {
  purchaseOrder: FileText,
  receiving: ClipboardCheck,
  putAway: MapPinned,
  salesOrder: ShoppingCart,
  shipping: PackageCheck,
} as const;

const toneMap = {
  blue: "bg-primary-50 text-primary-600",
  green: "bg-success-bg text-success",
  purple: "bg-transfer-bg text-transfer",
  indigo: "bg-info-bg text-info",
  teal: "bg-danger-bg text-danger",
} as const;

export default function WorkflowCard() {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">Warehouse Operations Workflow</h3>
      <div className="flex flex-wrap items-center gap-2">
        {workflowSteps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <WorkflowStepItem step={step} />
            {index < workflowSteps.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-text-secondary" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowStepItem({ step }: { step: WorkflowStep }) {
  const Icon = iconMap[step.icon];
  return (
    <div className="flex min-w-[160px] flex-1 items-center gap-3 rounded-lg border border-border p-3">
      <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneMap[step.tone]}`}>
        <Icon className="h-4 w-4" />
        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-900 text-[9px] font-semibold text-white">
          {step.count}
        </span>
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-text-primary">{step.label}</p>
        <p className="truncate text-[11px] text-text-secondary">{step.description}</p>
      </div>
    </div>
  );
}
