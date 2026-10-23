import { AlertTriangle, AlertCircle, Info } from "lucide-react";

export type DashboardAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  time: string;
};

const severityConfig = {
  critical: { icon: AlertCircle, dot: "bg-danger", bg: "bg-danger-bg", text: "text-danger" },
  warning: { icon: AlertTriangle, dot: "bg-warning", bg: "bg-warning-bg", text: "text-warning" },
  info: { icon: Info, dot: "bg-info", bg: "bg-info-bg", text: "text-info" },
} as const;

export default function AlertsCard({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <h3 className="text-sm font-semibold text-text-primary">Alerts &amp; Attention</h3>
        </div>
        <span className="text-xs text-text-secondary">{alerts.length} active</span>
      </div>

      <ul className="flex flex-col gap-2">
        {alerts.map((alert) => {
          const config = severityConfig[alert.severity];
          const Icon = config.icon;
          return (
            <li key={alert.id} className={`flex items-start gap-3 rounded-lg ${config.bg} p-3`}>
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.text}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${config.text}`}>{alert.title}</p>
                <p className="truncate text-xs text-text-secondary">{alert.description}</p>
              </div>
              <span className="shrink-0 text-[11px] text-text-secondary">{alert.time}</span>
            </li>
          );
        })}
        {alerts.length === 0 && (
          <li key="empty-low-stock-alerts" className="py-6 text-center text-sm text-text-secondary">No low-stock alerts right now.</li>
        )}
      </ul>
    </div>
  );
}
