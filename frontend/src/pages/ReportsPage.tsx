import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { getInventory, getInventoryReport, type InventoryItem, type InventoryReport } from "@/utils/InventoryApi";

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
const movementLabels = { inbound: "Received", outbound: "Shipped", transfer: "Transferred", adjustment: "Adjusted" } as const;

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function fetchAllItems() {
  const items: InventoryItem[] = [];
  for (let page = 1; ; page += 1) {
    const result = await getInventory({ page, limit: 100 });
    items.push(...result.items);
    if (page >= result.pagination.pages) return items;
  }
}

export default function ReportsPage() {
  const [report, setReport] = useState<InventoryReport | null>(null);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError("");
    getInventoryReport()
      .then((result) => {
        if (active) setReport(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Unable to load the report.");
      });
    return () => {
      active = false;
    };
  }, [retryKey]);

  async function exportCsv() {
    setIsExporting(true);
    setError("");
    try {
      const items = await fetchAllItems();
      const header = ["SKU", "Name", "Category", "Warehouse", "Location", "Quantity", "Unit", "Reorder point", "Unit cost (USD)", "Stock value (USD)", "Status"];
      const rows = items.map((item) => [
        item.sku, item.name, item.category, item.warehouseId?.code ?? "", item.locationId?.code ?? "",
        item.quantity, item.unit, item.reorderPoint, item.unitCost.toFixed(2), (item.quantity * item.unitCost).toFixed(2),
        item.quantity === 0 ? "Out of stock" : item.quantity <= item.reorderPoint ? "Low stock" : "In stock",
      ]);
      const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventra-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to export inventory.");
    } finally {
      setIsExporting(false);
    }
  }

  const stats = report
    ? [
        { label: "Inventory value", value: currency.format(report.totals.value) },
        { label: "Items", value: report.totals.items.toLocaleString() },
        { label: "Units on hand", value: report.totals.units.toLocaleString() },
        { label: "Low / out of stock", value: `${report.totals.lowStock} / ${report.totals.outOfStock}` },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary-600">Analytics</p>
          <h1 className="mt-1 text-2xl font-semibold text-text-primary">Inventory report</h1>
          <p className="mt-1 text-sm text-text-secondary">Stock value by warehouse and category, plus the last 30 days of movement.</p>
        </div>
        <button type="button" onClick={() => void exportCsv()} disabled={isExporting || !report || report.totals.items === 0} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">
          {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV
        </button>
      </header>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/20 bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)} className="rounded-md border border-danger/30 px-3 py-1.5 font-semibold hover:bg-white/60">Try again</button>
        </div>
      )}

      {!report && !error && <p className="py-6 text-center text-sm text-text-secondary" role="status">Building report…</p>}

      {report && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-surface p-4">
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="mt-1 break-words text-2xl font-semibold text-text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <ReportTable
              title="By warehouse"
              columns={["Warehouse", "Items", "Units", "Value"]}
              rows={report.warehouses.map((warehouse) => [`${warehouse.name} (${warehouse.code})`, warehouse.items.toLocaleString(), warehouse.units.toLocaleString(), currency.format(warehouse.value)])}
              empty="No warehouses yet."
            />
            <ReportTable
              title="By category"
              columns={["Category", "Items", "Units", "Value"]}
              rows={report.categories.map((category) => [category.category, category.items.toLocaleString(), category.units.toLocaleString(), currency.format(category.value)])}
              empty="No inventory items yet."
            />
          </div>

          <ReportTable
            title="Movements in the last 30 days"
            columns={["Movement", "Transactions", "Units"]}
            rows={report.movementsLast30Days.map((movement) => [movementLabels[movement.type], movement.transactions.toLocaleString(), movement.quantity.toLocaleString()])}
            empty="No movements yet."
          />
          <p className="text-xs text-text-secondary">Generated {new Date(report.generatedAt).toLocaleString()}. Value = quantity × unit cost.</p>
        </>
      )}
    </div>
  );
}

function ReportTable({ title, columns, rows, empty }: { title: string; columns: string[]; rows: string[][]; empty: string }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-text-primary">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-secondary">
                {columns.map((column, index) => <th key={column} className={`py-2 font-medium ${index ? "pl-3 text-right" : ""}`}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row[0]} className="border-b border-border last:border-0">
                  {row.map((cell, index) => <td key={index} className={`py-2 ${index ? "pl-3 text-right text-text-secondary" : "break-words font-medium text-text-primary"}`}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
