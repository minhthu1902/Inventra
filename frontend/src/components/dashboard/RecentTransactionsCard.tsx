import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileClock, Search, ArrowDownToLine, ArrowUpFromLine, Repeat, SlidersHorizontal, ChevronRight } from "lucide-react";

export type RecentTransaction = {
  id: string;
  date: string;
  type: "Inbound" | "Outbound" | "Transfer" | "Adjustment";
  reference: string;
  item: string;
  quantity: string;
  location: string;
  status: "Received" | "Shipped" | "Transferred" | "Adjusted";
};

type RecentTransactionsCardProps = {
  transactions: RecentTransaction[];
};

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

export default function RecentTransactionsCard({ transactions }: RecentTransactionsCardProps) {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const transactionTabs = [
    { id: "all", label: "All" },
    { id: "inbound", label: "Inbound" },
    { id: "outbound", label: "Outbound" },
    { id: "transfer", label: "Transfer" },
    { id: "adjustment", label: "Adjustment" },
  ];
  const visibleTransactions = useMemo(() => transactions.filter((transaction) => {
    const matchesTab = activeTab === "all" || transaction.type.toLowerCase() === activeTab;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [transaction.item, transaction.reference, transaction.location]
      .some((value) => value.toLowerCase().includes(query));
    return matchesTab && matchesSearch;
  }), [activeTab, search, transactions]);

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileClock className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Recent Transactions</h3>
          <Link to="/transactions" className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 hover:text-primary-700">
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex flex-wrap rounded-lg bg-background p-0.5 text-xs font-medium">
            {transactionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  activeTab === tab.id ? "bg-primary-600 text-white hover:bg-primary-700" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label} ({tab.id === "all" ? transactions.length : transactions.filter((transaction) => transaction.type.toLowerCase() === tab.id).length})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mb-3 max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          placeholder="Search transaction..."
          aria-label="Search transactions"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-text-primary outline-none placeholder:text-text-secondary focus:border-primary-400"
        />
      </div>

      <ul className="flex flex-col divide-y divide-border md:hidden">
        {visibleTransactions.map((tx) => {
          const type = typeConfig[tx.type];
          const TypeIcon = type.icon;
          return (
            <li key={tx.id} className="flex flex-col gap-1 py-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 font-medium ${type.color}`}>
                  <TypeIcon className="h-3.5 w-3.5" />
                  {tx.type}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig[tx.status]}`}>
                  {tx.status}
                </span>
              </div>
              <p className="font-medium text-text-primary">
                {tx.item} · {tx.quantity}
              </p>
              <p className="text-text-secondary">
                {tx.reference} · {tx.location}
              </p>
              <p className="text-text-secondary">{tx.date}</p>
            </li>
          );
        })}
        {visibleTransactions.length === 0 && (
          <li key="empty-transactions" className="py-6 text-center text-sm text-text-secondary">No transactions match this filter.</li>
        )}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs font-medium text-text-secondary">
              <th className="pb-2 pr-4 font-medium">Date / Time</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 font-medium">Reference No.</th>
              <th className="pb-2 pr-4 font-medium">Item</th>
              <th className="pb-2 pr-4 font-medium">Quantity</th>
              <th className="pb-2 pr-4 font-medium">Location</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((tx) => {
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
                  <td className="py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusConfig[tx.status]}`}>
                      {tx.status}
                    </span>
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
