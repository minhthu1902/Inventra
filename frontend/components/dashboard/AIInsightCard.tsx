"use client";

import { Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { aiInsights } from "@/utils/dashboardData";

export default function AIInsightCard() {
  const insight = aiInsights[0];

  return (
    <div className="ai-panel-gradient relative overflow-hidden rounded-xl p-5 text-white shadow-lg">
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-100" />
            <h3 className="text-sm font-semibold text-white">AI Inventory Investigator</h3>
          </div>
          <span className="rounded-full bg-gradient-to-r from-primary-400/30 to-primary-600/30 px-2 py-0.5 text-[10px] font-semibold text-primary-100">
            Beta
          </span>
        </div>

        <p className="text-xs text-white/72">Turn your data into actionable insights.</p>

        <div className="relative">
          <input
            type="text"
            placeholder="Why is SKU-1042 stock decreasing?"
            className="w-full rounded-lg border border-white/10 bg-white/10 py-2.5 pl-3 pr-10 text-xs text-white outline-none backdrop-blur-sm placeholder:text-white/55 focus:border-primary-400"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-gradient-to-br from-primary-400 to-primary-700 hover:from-primary-400/80 hover:to-primary-600"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-white/90">Latest Insights</p>
            <button type="button" className="flex items-center text-[11px] font-medium text-primary-100 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-start justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-danger">
                <AlertCircle className="h-3.5 w-3.5" />
                {insight.title}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-white/55" />
            </div>
            <p className="mb-2 text-[11px] text-white/72">{insight.subtitle}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-white/55">Current stock</p>
                <p className="text-xs font-semibold text-white">{insight.currentStock}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/55">Avg daily usage</p>
                <p className="text-xs font-semibold text-white">{insight.avgUsage}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/55">Est. stockout</p>
                <p className="text-xs font-semibold text-white">{insight.estimate}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-md bg-white/10 px-2.5 py-2">
              <p className="text-[11px] text-white/90">{insight.suggestion}</p>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/55" />
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
            <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
