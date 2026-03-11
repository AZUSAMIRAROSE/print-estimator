// ============================================================================
// QUOTATION ACTIONS — Export, snapshot, print actions
// ============================================================================

import React from "react";
import type { CanonicalEstimationResult } from "@/domain/estimation/types";

interface Props {
  results: readonly CanonicalEstimationResult[];
  onCreateQuotation: () => void;
}

export function QuotationActions({ results, onCreateQuotation }: Props) {
  const handleExportCSV = () => {
    const headers = ["Quantity", "Paper", "CTP", "Printing", "Binding", "Finishing", "Packing", "Freight", "Total Production", "Selling Price/Copy", "Total Selling Price", "Margin %"];
    const rows = results.map((r) => [
      r.quantity,
      r.costs.paper,
      r.costs.ctp,
      r.costs.printing,
      r.costs.binding,
      r.costs.finishing,
      r.costs.packing,
      r.costs.freight,
      r.costs.totalProduction,
      r.pricing.sellingPricePerCopy,
      r.pricing.totalSellingPrice,
      r.pricing.marginPercent.toFixed(1),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintSummary = () => {
    window.print();
  };

  // Diagnostics summary
  const allDiagnostics = results.flatMap((r) => r.diagnostics);
  const errors = allDiagnostics.filter((d) => d.level === "ERROR");
  const warnings = allDiagnostics.filter((d) => d.level === "WARN");

  return (
    <div className="space-y-4">
      {/* Diagnostics */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2">
          {errors.map((d, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              <span>❌</span>
              <span>{d.message}</span>
            </div>
          ))}
          {warnings.map((d, i) => (
            <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
              <span>⚠️</span>
              <span>{d.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onCreateQuotation}
          className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 shadow-lg transition-all"
        >
          ✅ Create Quotation
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          📊 Export CSV
        </button>

        <button
          type="button"
          onClick={handlePrintSummary}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          🖨️ Print
        </button>

        <button
          type="button"
          onClick={() => {
            const json = JSON.stringify(results, null, 2);
            navigator.clipboard.writeText(json);
            alert("Results copied to clipboard");
          }}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          📋 Copy JSON
        </button>
      </div>
    </div>
  );
}
