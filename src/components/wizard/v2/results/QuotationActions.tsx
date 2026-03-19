import React, { useCallback } from "react";
import { useAppStore } from "@/stores/appStore";
import type { CanonicalEstimationResult } from "@/domain/estimation/types";
import { saveTextFilePortable } from "@/utils/fileSave";

interface Props {
  results: readonly CanonicalEstimationResult[];
  jobTitle: string;
  currency: string;
  canCreateQuotation: boolean;
  isCreatingQuotation: boolean;
  onCreateQuotation: () => void | Promise<void>;
}

export function QuotationActions({
  results,
  jobTitle,
  currency,
  canCreateQuotation,
  isCreatingQuotation,
  onCreateQuotation,
}: Props) {
  const { addActivityLog, addNotification } = useAppStore();

  const handleExportCSV = useCallback(async () => {
    const headers = [
      "Quantity",
      "Paper",
      "CTP",
      "Printing",
      "Binding",
      "Finishing",
      "Packing",
      "Freight",
      "Pre-Press",
      "Additional",
      "Total Production",
      "Selling Price / Copy",
      "Total Selling Price",
      "Margin %",
      "Currency",
    ];

    const rows = results.map((result) => ([
      result.quantity,
      result.costs.paper,
      result.costs.ctp,
      result.costs.printing,
      result.costs.binding,
      result.costs.finishing,
      result.costs.packing,
      result.costs.freight,
      result.costs.prePress,
      result.costs.additional,
      result.costs.totalProduction,
      result.pricing.sellingPricePerCopy,
      result.pricing.totalSellingPrice,
      result.pricing.marginPercent.toFixed(2),
      currency,
    ]));

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    try {
      const filePath = await saveTextFilePortable(
        {
          filters: [{ name: "CSV Document", extensions: ["csv"] }],
          defaultPath: `${(jobTitle || "estimate").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-v2.csv`,
        },
        csv,
      );
      if (!filePath) return;

      addNotification({
        type: "success",
        title: "CSV Exported",
        message: `The V2 estimate table was saved to ${filePath}.`,
        category: "export",
      });
      addActivityLog({
        action: "ESTIMATE_EXPORTED_V2",
        category: "export",
        description: `Exported V2 estimate review for "${jobTitle}" as CSV`,
        user: "Current User",
        entityType: "estimation",
        entityId: results[0]?.estimationId ?? "",
        level: "info",
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Export Failed",
        message: error instanceof Error ? error.message : "Failed to export the V2 estimate CSV.",
        category: "export",
      });
    }
  }, [addActivityLog, addNotification, currency, jobTitle, results]);

  const handlePrintSummary = useCallback(() => {
    window.print();
    addActivityLog({
      action: "ESTIMATE_PRINTED_V2",
      category: "estimate",
      description: `Printed V2 estimate review for "${jobTitle}"`,
      user: "Current User",
      entityType: "estimation",
      entityId: results[0]?.estimationId ?? "",
      level: "info",
    });
  }, [addActivityLog, jobTitle, results]);

  const handleCopyJson = useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard is not available in this environment.");
      }

      await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      addNotification({
        type: "success",
        title: "JSON Copied",
        message: "Structured V2 estimate data was copied to the clipboard.",
        category: "export",
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Copy Failed",
        message: error instanceof Error ? error.message : "Failed to copy the estimate JSON.",
        category: "export",
      });
    }
  }, [addNotification, results]);

  const diagnostics = results.flatMap((result) => result.diagnostics);
  const errors = diagnostics.filter((diagnostic) => diagnostic.level === "ERROR");
  const warnings = diagnostics.filter((diagnostic) => diagnostic.level === "WARN");

  return (
    <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-2">
          {errors.map((diagnostic, index) => (
            <div
              key={`${diagnostic.code}-${index}`}
              className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {diagnostic.message}
            </div>
          ))}
          {warnings.map((diagnostic, index) => (
            <div
              key={`${diagnostic.code}-${index}`}
              className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
            >
              {diagnostic.message}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCreateQuotation}
          disabled={!canCreateQuotation || isCreatingQuotation}
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreatingQuotation ? "Saving Quotation..." : "Create Quotation"}
        </button>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Export CSV
        </button>

        <button
          type="button"
          onClick={handlePrintSummary}
          className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Print Review
        </button>

        <button
          type="button"
          onClick={handleCopyJson}
          className="inline-flex items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Copy JSON
        </button>
      </div>
    </div>
  );
}
