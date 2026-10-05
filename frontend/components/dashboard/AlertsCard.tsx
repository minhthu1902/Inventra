"use client";

import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";
import { alerts } from "@/utils/dashboardData";

const tabs = ["Alerts (4)", "Recent Activity"];

const severityConfig = {
  critical: { icon: AlertCircle, dot: "bg-danger", bg: "bg-danger-bg", text: "text-danger" },
  warning: { icon: AlertTriangle, dot: "bg-warning", bg: "bg-warning-bg", text: "text-warning" },
  info: { icon: Info, dot: "bg-info", bg: "bg-info-bg", text: "text-info" },
} as const;

export default function AlertsCard() {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-danger" />
          <h3 className="text-sm font-semibold text-text-primary">Alerts &amp; Attention</h3>
        </div>
        <button type="button" className="flex items-center text-xs font-medium text-primary-600 hover:underline">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mb-3 flex gap-1 border-b border-border text-sm">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`-mb-px border-b-2 px-2 pb-2 text-sm font-medium transition-colors ${
              activeTab === tab ? "border-danger text-danger" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab}
          </button>
        ))}
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
      </ul>
    </div>
  );
}
