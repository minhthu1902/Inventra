import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, Repeat, SlidersHorizontal } from "lucide-react";
import { getTransactions, type TransactionRecord, type TransactionType } from "@/utils/InventoryApi";

const typeConfig = {
  inbound: { label: "Inbound", icon: ArrowDownToLine, color: "text-success", status: "Received" },
  outbound: { label: "Outbound", icon: ArrowUpFromLine, color: "text-danger", status: "Shipped" },
  transfer: { label: "Transfer", icon: Repeat, color: "text-transfer", status: "Transferred" },
  adjustment: { label: "Adjustment", icon: SlidersHorizontal, color: "text-warning", status: "Adjusted" },
} as const;

const pageCopy: Record<TransactionType | "all", { eyebrow: string; title: string; description: string; action?: { label: string; href: string } }> = {
  all: { eyebrow: "History", title: "All stock movements", description: "Every receipt, shipment, transfer and adjustment, newest first." },
  inbound: { eyebrow: "Inbound", title: "Received stock", description: "Goods received into your warehouses.", action: { label: "Receive stock", href: "/inventory?movement=inbound" } },
  outbound: { eyebrow: "Outbound", title: "Shipped stock", description: "Goods issued or shipped out of your warehouses.", action: { label: "Create shipment", href: "/inventory?movement=outbound" } },
  transfer: { eyebrow: "Transfers", title: "Warehouse transfers", description: "Stock moved between warehouses.", action: { label: "Transfer stock", href: "/inventory?movement=transfer" } },
  adjustment: { eyebrow: "Adjustments", title: "Count adjustments", description: "Corrections from stock counts, write-offs and removed items." },
};

const tabs: Array<{ id: TransactionType | "all"; label: string; href: string }> = [
  { id: "all", label: "All", href: "/transactions" },
  { id: "inbound", label: "Inbound", href: "/inbound" },
  { id: "outbound", label: "Outbound", href: "/outbound" },
  { id: "transfer", label: "Transfers", href: "/transfers" },
  { id: "adjustment", label: "Adjustments", href: "/adjustments" },
];

const PAGE_SIZE = 25;

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function signedQuantity(transaction: TransactionRecord) {
  if (transaction.type === "transfer") return `↔ ${transaction.quantity}`;
  const increases = transaction.type === "inbound" || (transaction.type === "adjustment" && transaction.adjustmentDirection === "increase");
  return `${increases ? "+" : "−"}${transaction.quantity}`;
}

function locationText(transaction: TransactionRecord) {
  const source = [transaction.warehouseId?.code, transaction.locationId?.code].filter(Boolean).join(" ");
  if (transaction.type !== "transfer") return source || "—";
  const destination = [transaction.destinationWarehouseId?.code, transaction.destinationLocationId?.code].filter(Boolean).join(" ");
  return `${source || "—"} → ${destination || "—"}`;
}

export default function TransactionsPage({ type }: { type?: TransactionType }) {
  const copy = pageCopy[type ?? "all"];
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [type]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");
    getTransactions({ type, page, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setTransactions(result.transactions);
        setPages(result.pagination.pages);
        setTotal(result.pagination.total);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load transactions.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [type, page, retryKey]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-600">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">{copy.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{copy.description}</p>
        </div>
        {copy.action && (
          <Link to={copy.action.href} className="inline-flex h-10 items-center rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
            {copy.action.label}
          </Link>
        )}
      </header>

      <nav aria-label="Movement type" className="flex flex-wrap gap-1 rounded-lg bg-surface p-1 text-sm font-medium shadow-[inset_0_0_0_1px_var(--color-border)]">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.href}
            aria-current={(type ?? "all") === tab.id ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 ${(type ?? "all") === tab.id ? "bg-primary-600 text-white" : "text-text-secondary hover:bg-background hover:text-text-primary"}`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-white/60">Try again</button>
        </div>
      )}

      <section className="rounded-xl border border-border bg-surface p-4 sm:p-5">
        <p className="mb-3 text-sm text-text-secondary">{isLoading ? "Loading…" : `${total.toLocaleString()} movement${total === 1 ? "" : "s"}`}</p>

        {!isLoading && transactions.length === 0 && !error && (
          <p className="border-y border-border py-10 text-center text-sm text-text-secondary">No movements recorded yet.</p>
        )}

        <ul className="divide-y divide-border md:hidden">
          {transactions.map((transaction) => {
            const config = typeConfig[transaction.type];
            const Icon = config.icon;
            return (
              <li key={transaction._id} className="flex flex-col gap-1 py-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-1.5 font-medium ${config.color}`}><Icon className="h-3.5 w-3.5" />{config.label}</span>
                  <span className="font-semibold text-text-primary">{signedQuantity(transaction)} {transaction.inventoryItemId?.unit ?? ""}</span>
                </div>
                <p className="break-words font-medium text-text-primary">{transaction.inventoryItemId ? `${transaction.inventoryItemId.sku} · ${transaction.inventoryItemId.name}` : "Removed item"}</p>
                <p className="break-words text-text-secondary">{transaction.reference || "—"} · {locationText(transaction)}</p>
                {transaction.note && <p className="break-words text-text-secondary">{transaction.note}</p>}
                <p className="text-text-secondary">{formatDate(transaction.createdAt)}</p>
              </li>
            );
          })}
        </ul>

        {transactions.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-text-secondary">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Item</th>
                  <th className="py-2 pr-4 font-medium">Quantity</th>
                  <th className="py-2 pr-4 font-medium">Stock after</th>
                  <th className="py-2 pr-4 font-medium">Location</th>
                  <th className="py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const config = typeConfig[transaction.type];
                  const Icon = config.icon;
                  return (
                    <tr key={transaction._id} className="border-b border-border text-text-secondary">
                      <td className="whitespace-nowrap py-2.5 pr-4 text-xs">{formatDate(transaction.createdAt)}</td>
                      <td className="py-2.5 pr-4"><span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}><Icon className="h-3.5 w-3.5" />{config.label}</span></td>
                      <td className="py-2.5 pr-4 text-xs">
                        {transaction.inventoryItemId
                          ? <><span className="font-medium text-text-primary">{transaction.inventoryItemId.sku}</span> · {transaction.inventoryItemId.name}</>
                          : <span className="italic">Removed item</span>}
                        {transaction.note && <span className="block text-[11px]">{transaction.note}</span>}
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-4 text-xs font-semibold text-text-primary">{signedQuantity(transaction)} {transaction.inventoryItemId?.unit ?? ""}</td>
                      <td className="py-2.5 pr-4 text-xs">{transaction.stockAfter}</td>
                      <td className="py-2.5 pr-4 text-xs">{locationText(transaction)}</td>
                      <td className="py-2.5 text-xs">{transaction.reference || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm text-text-secondary">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-border px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
