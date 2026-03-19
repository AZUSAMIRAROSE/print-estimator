import React from "react";
import type { CurrencyCode } from "@/types";
import type { CanonicalEstimationResult } from "@/domain/estimation/types";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";

interface Props {
  results: readonly CanonicalEstimationResult[];
  currency: string;
}

export function CostBreakdownTable({ results, currency }: Props) {
  const safeCurrency = (currency || "INR") as CurrencyCode;
  const isINR = safeCurrency === "INR";

  const fmtTotal = (value: number) => value > 0 ? formatCurrency(value, safeCurrency) : "—";
  const fmtCopy = (value: number) => value > 0 ? `${formatCurrency(value, safeCurrency)}/copy` : "—";

  const rows: Array<{ label: string; key: keyof CanonicalEstimationResult["costs"] }> = [
    { label: "Paper", key: "paper" },
    { label: "CTP", key: "ctp" },
    { label: "Printing", key: "printing" },
    { label: "Binding", key: "binding" },
    { label: "Finishing", key: "finishing" },
    { label: "Packing", key: "packing" },
    { label: "Freight", key: "freight" },
    { label: "Pre-Press", key: "prePress" },
    { label: "Additional", key: "additional" },
  ];

  if (!results.length) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        No calculated results to display yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-gray-50 dark:bg-gray-950">
            <tr>
              <th className="w-52 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Cost Element
              </th>
              {results.map((result) => (
                <th key={result.id} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span className="block">{result.quantity.toLocaleString()} copies</span>
                  <span className="text-[10px] font-normal text-gray-400">Total / per copy</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-950/40">
                <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-200">{row.label}</td>
                {results.map((result) => {
                  const total = result.costs[row.key];
                  const perCopy = result.quantity > 0 ? total / result.quantity : 0;

                  return (
                    <td key={result.id} className="px-4 py-3 text-right font-mono">
                      <span className="text-gray-900 dark:text-gray-100">{fmtTotal(total)}</span>
                      <span className="block text-[10px] text-gray-400">{fmtCopy(perCopy)}</span>
                    </td>
                  );
                })}
              </tr>
            ))}

            <tr className="border-t-2 border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">Total Production</td>
              {results.map((result) => (
                <td key={result.id} className="px-4 py-3 text-right font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(result.costs.totalProduction, safeCurrency)}
                  <span className="block text-[10px] font-normal text-gray-500">{fmtCopy(result.pricing.costPerCopy)}</span>
                </td>
              ))}
            </tr>

            <tr className="border-t border-gray-200 bg-blue-50 dark:border-gray-700 dark:bg-blue-950/35">
              <td className="px-4 py-3 font-semibold text-blue-800 dark:text-blue-200">Selling Price</td>
              {results.map((result) => (
                <td key={result.id} className="px-4 py-3 text-right font-mono">
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {formatCurrency(result.pricing.totalSellingPrice, safeCurrency)}
                  </span>
                  <span className="block text-xs text-blue-600 dark:text-blue-400">
                    {fmtCopy(result.pricing.sellingPricePerCopy)}
                  </span>
                  {!isINR && (
                    <span className="mt-0.5 block text-[10px] text-gray-500">
                      {formatCurrency(result.pricing.sellingPricePerCopy_foreign, safeCurrency)}/copy
                    </span>
                  )}
                </td>
              ))}
            </tr>

            <tr className="border-t border-gray-200 dark:border-gray-700">
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                Margin ({results[0]?.pricing.pricingMethod === "OVERHEAD" ? "overhead" : "margin"} method)
              </td>
              {results.map((result) => (
                <td key={result.id} className="px-4 py-3 text-right font-mono">
                  <span
                    className={cn(
                      result.pricing.marginPercent >= 20 ? "text-green-600" :
                        result.pricing.marginPercent >= 10 ? "text-amber-600" :
                          "text-red-600",
                    )}
                  >
                    {result.pricing.marginPercent.toFixed(1)}%
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {formatCurrency(result.pricing.marginAmount, safeCurrency)}
                  </span>
                </td>
              ))}
            </tr>

            <tr className="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950/40">
              <td className="px-4 py-3 text-xs text-gray-500">Book weight / Spine / Machine hours</td>
              {results.map((result) => (
                <td key={result.id} className="px-4 py-3 text-right text-xs text-gray-500">
                  {result.bookWeight_g}g • {result.spineThickness_mm.toFixed(2)}mm • {result.machineHours.toFixed(1)}h
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
