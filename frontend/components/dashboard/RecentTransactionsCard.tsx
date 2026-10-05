"use client";

import { useState } from "react";
import { FileClock, Search, MoreHorizontal, ArrowDownToLine, ArrowUpFromLine, Repeat, SlidersHorizontal } from "lucide-react";
import { recentTransactions, transactionTabs } from "@/utils/dashboardData";

const typeConfig = {
  Inbound: { icon: ArrowDownToLine, color: "text-success" },
  Outbound: { icon: ArrowUpFromLine, color: "text-danger" },
  Transfer: { icon: Repeat, color: "text-transfer" },
  Adjustment: { icon: SlidersHorizontal, color: "text-warning" },
} as const;

const statusConfig = {
  Received: "bg-success-bg text-success",
  Shipped: "bg-info-bg text-info",
  Transferred: "bg-transfer-bg text-transfer",
  Adjusted: "bg-warning-bg text-warning",
} as const;

export default function RecentTransactionsCard() {
  const [activeTab, setActiveTab] = useState(transactionTabs[0].id);

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileClock className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Transactions</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-background p-0.5 text-xs font-medium">
            {transactionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  activeTab === tab.id ? "bg-primary-600 text-white hover:bg-primary-700" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
          <select className="rounded-lg border border-border px-2 py-1.5 text-xs text-text-secondary">
            <option>Today</option>
            <option>This week</option>
          </select>
          <select className="hidden rounded-lg border border-border px-2 py-1.5 text-xs text-text-secondary sm:block">
            <option>All Warehouses</option>
          </select>
        </div>
      </div>

      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search transaction..."
          className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-text-primary outline-none placeholder:text-text-secondary"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs font-medium text-text-secondary">
              <th className="pb-2 pr-4 font-medium">Date / Time</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Reference No.</th>
              <th className="pb-2 pr-4 font-medium">Item</th>
              <th className="pb-2 pr-4 font-medium">Quantity</th>
              <th className="pb-2 pr-4 font-medium">Location</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.map((tx) => {
              const type = typeConfig[tx.type];
              const TypeIcon = type.icon;
              return (
                <tr key={tx.id} className="border-t border-border text-text-secondary">
                  <td className="py-2.5 pr-4 whitespace-nowrap text-xs text-text-secondary">{tx.date}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${type.color}`}>
                      <TypeIcon className="h-3.5 w-3.5" />
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-xs font-medium text-text-primary">{tx.reference}</td>
                  <td className="py-2.5 pr-4 text-xs">{tx.item}</td>
                  <td className="py-2.5 pr-4 text-xs">{tx.quantity}</td>
                  <td className="py-2.5 pr-4 text-xs">{tx.location}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig[tx.status]}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <button type="button" className="text-text-secondary hover:text-text-primary">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
