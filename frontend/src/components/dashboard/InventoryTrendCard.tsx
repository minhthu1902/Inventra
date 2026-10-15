import { BarChart3 } from "lucide-react";
import type { TrendPoint } from "@/utils/InventoryApi";

const ranges = ["7D", "30D", "90D"] as const;

const CHART_WIDTH = 560;
const CHART_HEIGHT = 180;
const PADDING_X = 10;

function buildPoints(values: number[], max: number) {
  const step = (CHART_WIDTH - PADDING_X * 2) / (values.length - 1);
  return values.map((value, index) => {
    const x = PADDING_X + step * index;
    const y = CHART_HEIGHT - (value / max) * CHART_HEIGHT;
    return { x, y };
  });
}

function toPath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
}

type InventoryTrendCardProps = {
  trend: TrendPoint[];
  range: (typeof ranges)[number];
  onRangeChange: (range: (typeof ranges)[number]) => void;
};

export default function InventoryTrendCard({ trend, range, onRangeChange }: InventoryTrendCardProps) {

  const max = Math.max(1, ...trend.map((point) => point.stockLevel)) * 1.15;
  const stockPoints = trend.length > 1 ? buildPoints(trend.map((p) => p.stockLevel), max) : [];
  const inboundPoints = trend.length > 1 ? buildPoints(trend.map((p) => p.inbound), max) : [];
  const outboundPoints = trend.length > 1 ? buildPoints(trend.map((p) => p.outbound), max) : [];
  const trendSummary = {
    totalStock: trend.at(-1)?.stockLevel ?? 0,
    inbound: trend.reduce((total, point) => total + point.inbound, 0),
    outbound: trend.reduce((total, point) => total + point.outbound, 0),
  };

  return (
    <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-text-secondary" />
          <h3 className="text-sm font-semibold text-text-primary">Inventory Trend</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-background p-0.5 text-xs font-medium">
            {ranges.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onRangeChange(item)}
                className={`rounded-md px-3 py-1 transition-colors ${
                  range === item ? "bg-primary-600 text-white hover:bg-primary-700" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-3 text-xs text-text-secondary sm:flex">
            <Legend color="bg-primary-500" label="Stock Level" />
            <Legend color="bg-success" label="Inbound" />
            <Legend color="bg-danger" label="Outbound" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="flex-1 overflow-hidden">
          {trend.length > 0 ? (
            <>
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="h-44 w-full"
                preserveAspectRatio="none"
              >
                <polyline points={stockPoints.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0b63d8" strokeWidth={2} />
                <path d={toPath(inboundPoints)} fill="none" stroke="#10b981" strokeWidth={2} />
                <path d={toPath(outboundPoints)} fill="none" stroke="#ef4444" strokeWidth={2} />
                {stockPoints.map((p, index) => (
                  <circle key={index} cx={p.x} cy={p.y} r={3} fill="#0b63d8" />
                ))}
              </svg>
              <div className="mt-1 flex justify-between text-[11px] text-text-secondary">
                {trend.map((point) => (
                  <span key={point.label}>{point.label}</span>
                ))}
              </div>
            </>
          ) : (
            <p className="flex h-44 items-center justify-center text-sm text-text-secondary">No inventory movement history yet.</p>
          )}
        </div>

        <div className="flex w-full shrink-0 flex-row gap-4 border-t border-border pt-4 text-sm lg:w-40 lg:flex-col lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          <SummaryStat label="Total Stock" value={trendSummary.totalStock} />
          <SummaryStat label="Inbound" value={trendSummary.inbound} />
          <SummaryStat label="Outbound" value={trendSummary.outbound} />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="text-lg font-semibold text-text-primary">{value.toLocaleString()}</p>
    </div>
  );
}
