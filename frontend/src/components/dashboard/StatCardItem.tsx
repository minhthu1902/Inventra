import { Link } from "react-router-dom";
import { Box, TrendingDown, ArrowDownToLine, ArrowUpFromLine, ChevronRight } from "lucide-react";
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

  const content = (
    <>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneMap[stat.iconTone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium text-text-secondary">{stat.label}</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-text-primary">{stat.value}</p>
        <p className="text-xs text-text-secondary">{stat.unit}</p>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs font-medium">
        <span className={changeColor}>
          {stat.change} <span className="text-text-secondary">{stat.changeLabel}</span>
        </span>
        {stat.href && (
          <span className="flex items-center gap-0.5 text-primary-600">
            View <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
    </>
  );

  const className = "flex flex-1 flex-col gap-3 rounded-xl border border-border bg-surface p-4";
  return stat.href ? (
    <Link to={stat.href} className={`${className} hover:border-primary-400 hover:shadow-sm`}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
