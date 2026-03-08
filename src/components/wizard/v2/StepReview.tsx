// ============================================================================
// STEP 14: REVIEW — Final review and calculate/create quotation
// ============================================================================

import React, { useState, useCallback } from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { CostBreakdownTable } from "./results/CostBreakdownTable";
import { QuotationActions } from "./results/QuotationActions";
import { cn } from "@/utils/cn";
import type { CanonicalEstimationResult } from "@/domain/estimation/types";

export function StepReview() {
  const { estimation, getMetaStats } = useWizardStore();

  const [results, setResults] = useState<CanonicalEstimationResult[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);

  const stats = getMetaStats();
  const activeQuantities = (estimation.book?.quantities ?? []).filter((q: number) => q > 0);

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setCalcError(null);

    try {
      // Simulate calculation - in real implementation, this would call the canonical engine
      await new Promise((r) => setTimeout(r, 500));
      
      // Placeholder results for demo
      const mockResults: CanonicalEstimationResult[] = activeQuantities.map((qty: number, idx: number) => ({
        id: `result_${idx}`,
        estimationId: estimation.id || `est_${Date.now()}`,
        quantity: qty,
        sections: [],
        costs: {
          paper: qty * 45,
          ctp: qty * 2,
          printing: qty * 12,
          binding: qty * 8,
          finishing: qty * 5,
          packing: qty * 3,
          freight: qty * 2,
          prePress: 500,
          additional: 0,
          totalProduction: qty * 77 + 500,
        },
        pricing: {
          costPerCopy: 77 + (500 / qty),
          sellingPricePerCopy: 100 + (500 / qty),
          sellingPricePerCopy_foreign: 100 + (500 / qty),
          totalSellingPrice: qty * (100 + (500 / qty)),
          totalSellingPrice_foreign: qty * (100 + (500 / qty)),
          marginAmount: qty * 23,
          marginPercent: 23,
          pricingMethod: "MARGIN",
        },
        bookWeight_g: 350 + (qty * 0.01),
        spineThickness_mm: 8 + (qty * 0.001),
        machineHours: qty / 1000,
        diagnostics: [],
        timestamp: new Date().toISOString(),
      }));
      
      setResults(mockResults);
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : String(err));
      console.error("Estimation failed:", err);
    } finally {
      setIsCalculating(false);
    }
  }, [activeQuantities, estimation.id]);

  const handleCreateQuotation = useCallback(() => {
    if (!results || results.length === 0) return;
    alert(`Quotation created for ${results.length} quantity tier(s)!`);
  }, [results]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Job summary header */}
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 uppercase">Job</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{estimation.jobTitle || "Untitled Job"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Customer</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{estimation.customerName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Quantities</p>
            <p className="font-mono text-gray-800 dark:text-gray-200">
              {activeQuantities.length > 0 ? activeQuantities.join(", ") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Currency</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {estimation.pricing?.currency || "INR"}
              {estimation.pricing?.currency !== "INR" && (
                <span className="text-xs font-normal text-gray-500 ml-1">
                  (1 = ₹{estimation.pricing?.exchangeRate || 1})
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sections summary */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sections</h3>
        <div className="grid grid-cols-1 gap-2">
          {(estimation.sections ?? []).filter((s: any) => s?.enabled).map((s: any) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {s.type === "TEXT" ? "📄" : s.type === "COVER" ? "📕" : s.type === "JACKET" ? "🧥" : "📑"}
                </span>
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-gray-500">
                  {s.pages}pp · {s.paper?.gsm}gsm · {s.colorsFront}/{s.colorsBack}C
                </span>
              </div>
              <span className="text-xs text-gray-400">{s.paper?.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Binding + Finishing summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-700 text-sm">
          <p className="text-xs text-gray-500 uppercase mb-1">Binding</p>
          <p className="font-medium">{(estimation.binding?.method || "PERFECT").replace("_", " ")}</p>
          {estimation.binding?.method === "CASE" && (
            <p className="text-xs text-gray-500 mt-0.5">
              {estimation.binding.boardThickness_mm ?? 3}mm board · {estimation.binding.coveringMaterial ?? "printed paper"}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-700 text-sm">
          <p className="text-xs text-gray-500 uppercase mb-1">Finishing</p>
          <div className="flex flex-wrap gap-1">
            {estimation.finishing?.lamination && (
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-[10px]">
                {estimation.finishing.lamination.type} lam
              </span>
            )}
            {estimation.finishing?.uvVarnish && (
              <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded text-[10px]">UV</span>
            )}
            {!estimation.finishing?.lamination && !estimation.finishing?.uvVarnish && (
              <span className="text-xs text-gray-400">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Metadata stats */}
      {stats.totalFields > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Auto-planned: {stats.autoPlannedFields}</span>
          <span>·</span>
          <span>User overrides: {stats.userOverrideFields}</span>
          <span>·</span>
          <span>Confidence: {(stats.averageConfidence * 100).toFixed(0)}%</span>
          <button
            type="button"
            onClick={() => setShowAudit(!showAudit)}
            className="text-blue-600 hover:text-blue-800 underline ml-auto"
          >
            {showAudit ? "Hide" : "Show"} audit trail
          </button>
        </div>
      )}

      {showAudit && (
        <pre className="p-3 rounded-lg bg-gray-900 text-green-400 text-[10px] font-mono overflow-x-auto max-h-64 overflow-y-auto">
          {JSON.stringify({ meta: stats, estimation: estimation }, null, 2)}
        </pre>
      )}

      {/* Calculate button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleCalculate}
          disabled={isCalculating || activeQuantities.length === 0}
          className={cn(
            "px-6 py-3 rounded-xl font-semibold text-sm transition-all",
            isCalculating
              ? "bg-gray-300 text-gray-500 cursor-wait"
              : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl",
          )}
        >
          {isCalculating ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Calculating...
            </span>
          ) : results ? (
            "♻️ Recalculate"
          ) : (
            "🧮 Calculate Estimate"
          )}
        </button>

        {calcError && (
          <p className="text-sm text-red-600">{calcError}</p>
        )}
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          <CostBreakdownTable results={results} currency={estimation.pricing?.currency || "INR"} />

          <QuotationActions
            results={results}
            onCreateQuotation={handleCreateQuotation}
          />
        </div>
      )}
    </div>
  );
}
