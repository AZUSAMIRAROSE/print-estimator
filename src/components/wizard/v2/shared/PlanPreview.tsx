// ============================================================================
// PLAN PREVIEW — Live auto-planning summary panel
// ============================================================================

import React from "react";
import { useActivePlan, useWizardStore } from "@/domain/estimation/wizardStore";
import { summarizePlan } from "@/domain/estimation/autoPlanner";

export function PlanPreview() {
  const activePlan = useActivePlan();
  const { isPlanning, planError, planningTime_ms, showLivePreview } = useWizardStore();

  if (!showLivePreview) return null;

  if (isPlanning) {
    return (
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-700 dark:text-blue-300">Auto-planning...</span>
        </div>
      </div>
    );
  }

  if (planError) {
    return (
      <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
        <p className="text-sm text-red-700 dark:text-red-300">{planError}</p>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-sm text-gray-500">Enter book specs to see auto-plan</p>
      </div>
    );
  }

  const summary = summarizePlan(activePlan);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          📋 Auto-Plan Preview
        </h3>
        {planningTime_ms !== null && (
          <span className="text-[10px] text-gray-400 tabular-nums">
            {planningTime_ms}ms
          </span>
        )}
      </div>

      {/* Spine */}
      <div className="text-xs text-gray-600 dark:text-gray-400">
        Spine: <span className="font-mono font-medium">{summary.spineThickness_mm.toFixed(1)}mm</span>
      </div>

      {/* Section table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
              <th className="pb-1 pr-2">Section</th>
              <th className="pb-1 pr-2">Sheet</th>
              <th className="pb-1 pr-2">Sig</th>
              <th className="pb-1 pr-2">Method</th>
              <th className="pb-1 pr-2">Ups</th>
              <th className="pb-1 pr-2">Waste</th>
              <th className="pb-1 pr-2">Grain</th>
              <th className="pb-1 pr-2">Machine</th>
              <th className="pb-1 text-right">Paper ₹</th>
            </tr>
          </thead>
          <tbody>
            {summary.sections.map((s, i) => (
              <tr key={i} className="border-b dark:border-gray-800">
                <td className="py-1 pr-2 font-medium">{s.label}</td>
                <td className="py-1 pr-2 font-mono">{s.sheet}</td>
                <td className="py-1 pr-2 font-mono">{s.signature}</td>
                <td className="py-1 pr-2 capitalize">{s.method}</td>
                <td className="py-1 pr-2 font-mono">{s.ups}</td>
                <td className="py-1 pr-2 font-mono">{s.waste}</td>
                <td className="py-1 pr-2">
                  {s.grain.includes("✓") ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="text-amber-500">⚠</span>
                  )}
                </td>
                <td className="py-1 pr-2">{s.machine}</td>
                <td className="py-1 text-right font-mono">
                  {s.paperCost > 0 ? `₹${s.paperCost.toLocaleString()}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t dark:border-gray-700 text-xs">
        <div>
          <span className="text-gray-500">Paper</span>
          <p className="font-mono font-medium">₹{summary.totalPaperCost.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-500">Plates</span>
          <p className="font-mono font-medium">{summary.totalPlates}</p>
        </div>
        <div>
          <span className="text-gray-500">Machine</span>
          <p className="font-mono font-medium">{summary.totalMachineHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Procurement flag */}
      {summary.procurementNeeded && (
        <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded px-2 py-1">
          <span>📦</span>
          <span>Paper procurement required for some sections</span>
        </div>
      )}
    </div>
  );
}

