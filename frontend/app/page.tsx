import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCardItem from "@/components/dashboard/StatCardItem";
import InventoryTrendCard from "@/components/dashboard/InventoryTrendCard";
import AlertsCard from "@/components/dashboard/AlertsCard";
import RecentTransactionsCard from "@/components/dashboard/RecentTransactionsCard";
import AIInsightCard from "@/components/dashboard/AIInsightCard";
import QuickActionsCard from "@/components/dashboard/QuickActionsCard";
import WarehouseUtilizationCard from "@/components/dashboard/WarehouseUtilizationCard";
import WorkflowCard from "@/components/dashboard/WorkflowCard";
import { statCards } from "@/utils/dashboardData";

export default function Home() {
  return (
    <div className="flex flex-col gap-5">
      <DashboardHeader />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCardItem key={stat.id} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="flex flex-col gap-5 xl:col-span-2">
          <InventoryTrendCard />
          <RecentTransactionsCard />
        </div>
        <div className="flex flex-col gap-5">
          <AIInsightCard />
          <AlertsCard />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <QuickActionsCard />
        </div>
        <WarehouseUtilizationCard />
      </div>

      <WorkflowCard />
    </div>
  );
}

