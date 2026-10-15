import { ArrowRight, Box, TrendingDown, ArrowDownToLine, ArrowUpFromLine, ArrowUp } from "lucide-react";
import type { StatCard } from "@/utils/dashboardData";

const iconMap = {
  box: Box,
  trendingDown: TrendingDown,
  inbound: ArrowDownToLine,
  outbound: ArrowUpFromLine,
} as const;

const toneMap = {
  blue: "bg-primary-50 text-primary-600",
  green: "bg-success-bg text-success",
  purple: "bg-transfer-bg text-transfer",
  amber: "bg-warning-bg text-warning",
} as const;

export default function StatCardItem({ stat }: { stat: StatCard }) {
  const Icon = iconMap[stat.icon];
  const changeColor =
    stat.changeTone === "positive"
      ? "text-success"
      : stat.changeTone === "negative"
        ? "text-danger"
        : "text-text-secondary";

  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[stat.iconTone]}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="text-sm font-medium text-text-secondary">{stat.label}</span>
        </div>
        <ArrowRight className="h-4 w-4 text-text-secondary" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-text-primary">{stat.value}</p>
        <p className="text-xs text-text-secondary">{stat.unit}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${changeColor}`}>
        <ArrowUp className="h-3 w-3" />
        <span>{stat.change}</span>
        <span className="text-text-secondary">{stat.changeLabel}</span>
      </div>
    </div>
  );
}
