import { useEffect, useState } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCardItem from "@/components/dashboard/StatCardItem";
import InventoryTrendCard from "@/components/dashboard/InventoryTrendCard";
import AlertsCard from "@/components/dashboard/AlertsCard";
import RecentTransactionsCard from "@/components/dashboard/RecentTransactionsCard";
import AIInventoryInvestigator from "@/features/ai/AIInventoryInvestigator";
import QuickActionsCard from "@/components/dashboard/QuickActionsCard";
import WarehouseUtilizationCard from "@/components/dashboard/WarehouseUtilizationCard";
import WorkflowCard from "@/components/dashboard/WorkflowCard";
import type { DashboardAlert } from "@/components/dashboard/AlertsCard";
import type { RecentTransaction } from "@/components/dashboard/RecentTransactionsCard";
import { buildWorkflowSteps } from "@/utils/dashboardData";
import {
  getDashboardSummary,
  getInventoryTrend,
  getWarehouseUtilization,
  type DashboardSummary,
  type TrendPoint,
  type WarehouseUtilization,
} from "@/utils/InventoryApi";

const trendDays = { "7D": 7, "30D": 30, "90D": 90 } as const;
type TrendRange = keyof typeof trendDays;

export default function Home() {
  const [range, setRange] = useState<TrendRange>("7D");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseUtilization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    Promise.all([
      getDashboardSummary(),
      getInventoryTrend(trendDays[range]),
      getWarehouseUtilization(),
    ])
      .then(([nextSummary, nextTrend, nextWarehouses]) => {
        if (!active) return;
        setSummary(nextSummary);
        setTrend(nextTrend.trend);
        setWarehouses(nextWarehouses.utilization);
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "Unable to load dashboard data.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [range, retryKey]);

  const statCards = summary
    ? [
        { id: "total-skus", label: "Total SKUs", value: summary.totalSkus.toLocaleString(), unit: "products", change: "Live", changeDirection: "up" as const, changeLabel: "from inventory", changeTone: "neutral" as const, icon: "box" as const, iconTone: "blue" as const, href: "/inventory" },
        { id: "low-stock", label: "Low Stock", value: summary.lowStockItems.toLocaleString(), unit: "items at/below reorder point", change: "Live", changeDirection: "up" as const, changeLabel: "from inventory", changeTone: summary.lowStockItems ? "negative" as const : "positive" as const, icon: "trendingDown" as const, iconTone: "green" as const, href: "/inventory?stockStatus=low" },
        { id: "inbound-today", label: "Inbound Today", value: summary.inboundToday.quantity.toLocaleString(), unit: `items / ${summary.inboundToday.transactions} transactions`, change: "Live", changeDirection: "up" as const, changeLabel: "today", changeTone: "neutral" as const, icon: "inbound" as const, iconTone: "purple" as const, href: "/inbound" },
        { id: "outbound-today", label: "Outbound Today", value: summary.outboundToday.quantity.toLocaleString(), unit: `items / ${summary.outboundToday.transactions} transactions`, change: "Live", changeDirection: "up" as const, changeLabel: "today", changeTone: "neutral" as const, icon: "outbound" as const, iconTone: "amber" as const, href: "/outbound" },
      ]
    : [];

  const alerts: DashboardAlert[] = summary?.lowStock.map((item) => ({
    id: item.id,
    severity: item.quantity === 0 ? "critical" : "warning",
    title: item.quantity === 0 ? "Out of stock" : "Low stock",
    description: `${item.sku} (${item.name}) · ${item.quantity} ${item.unit} remaining · ${item.warehouse}`,
    time: "Current",
    href: `/inventory?search=${encodeURIComponent(item.sku)}`,
  })) ?? [];

  const transactions: RecentTransaction[] = summary?.recentTransactions.map((transaction) => {
    const type = transaction.type === "inbound" ? "Inbound" : transaction.type === "outbound" ? "Outbound" : transaction.type === "transfer" ? "Transfer" : "Adjustment";
    return {
      id: transaction.id,
      date: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(transaction.createdAt)),
      type,
      reference: transaction.reference || "—",
      item: transaction.item?.name ?? "Removed item",
      quantity: `${type === "Outbound" || (type === "Adjustment" && transaction.adjustmentDirection === "decrease") ? "-" : type === "Transfer" ? "↔ " : "+"}${transaction.quantity}`,
      location: type === "Transfer"
        ? `${transaction.warehouse?.code ?? ""} ${transaction.location?.code ?? ""} → ${transaction.destinationWarehouse?.code ?? ""} ${transaction.destinationLocation ?? ""}`.trim()
        : `${transaction.warehouse?.code ?? ""} ${transaction.location?.code ?? ""}`.trim() || "—",
      status: type === "Inbound" ? "Received" : type === "Outbound" ? "Shipped" : type === "Transfer" ? "Transferred" : "Adjusted",
    };
  }) ?? [];

  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader />

      {summary?.offline && (
        <p className="rounded-lg border border-info/20 bg-info-bg px-4 py-3 text-sm text-text-primary" role="status">
          Offline view · showing the last dashboard snapshot. Pending inventory movements are included in the total units.
        </p>
      )}

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-white/60"
          >
            Try again
          </button>
        </div>
      )}

      {isLoading && !summary && (
        <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-secondary" role="status">
          Loading inventory dashboard...
        </p>
      )}

      {summary && summary.totalSkus === 0 && (
        <p className="rounded-lg border border-info/20 bg-info-bg px-4 py-3 text-sm text-text-primary" role="status">
          No inventory items yet. Add items on the Inventory page, or load the synthetic demo data from the AI Inventory Investigator.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCardItem key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
          <InventoryTrendCard trend={trend} range={range} onRangeChange={setRange} />
          <RecentTransactionsCard transactions={transactions} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <AIInventoryInvestigator />
          <AlertsCard alerts={alerts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <QuickActionsCard />
        </div>
        <WarehouseUtilizationCard warehouses={warehouses} />
      </div>

      <WorkflowCard steps={buildWorkflowSteps(summary, warehouses.length)} />
    </div>
  );
}
