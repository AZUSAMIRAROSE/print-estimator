// ============================================================================
// COST BREAKDOWN TABLE — Multi-quantity results display
// ============================================================================

import React from "react";
import type { CanonicalEstimationResult } from "@/domain/estimation/types";
import { cn } from "@/utils/cn";

interface Props {
  results: readonly CanonicalEstimationResult[];
  currency: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹", GBP: "£", USD: "$", EUR: "€", AED: "د.إ", SGD: "S$",
};

export function CostBreakdownTable({ results, currency }: Props) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  const isINR = currency === "INR";

  const fmt = (n: number) => {
    if (n === 0) return "—";
    return n >= 1000 ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
      : n.toFixed(2);
  };

  const fmtCopy = (n: number) => n > 0 ? n.toFixed(2) : "—";

  const rows: { label: string; key: keyof CanonicalEstimationResult["costs"]; icon: string }[] = [
    { label: "Paper", key: "paper", icon: "📄" },
    { label: "CTP (Plates)", key: "ctp", icon: "🔲" },
    { label: "Printing", key: "printing", icon: "🖨️" },
    { label: "Binding", key: "binding", icon: "📚" },
    { label: "Finishing", key: "finishing", icon: "✨" },
    { label: "Packing", key: "packing", icon: "📦" },
    { label: "Freight", key: "freight", icon: "🚛" },
    { label: "Pre-Press", key: "prePress", icon: "🎨" },
    { label: "Additional", key: "additional", icon: "➕" },
  ];

  if (!results || results.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No results to display. Click "Calculate Estimate" to generate.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-48">
                Cost Element
              </th>
              {results.map((r) => (
                <th key={r.id} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  <span className="block">{r.quantity.toLocaleString()} copies</span>
                  <span className="text-[10px] font-normal text-gray-400">Total / Per copy</span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                  <span className="mr-1.5">{row.icon}</span>
                  {row.label}
                </td>
                {results.map((r) => {
                  const total = r.costs[row.key];
                  const perCopy = r.quantity > 0 ? total / r.quantity : 0;
                  return (
                    <td key={r.id} className="px-4 py-2 text-right font-mono">
                      <span className="text-gray-800 dark:text-gray-200">₹{fmt(total)}</span>
                      <span className="block text-[10px] text-gray-400">₹{fmtCopy(perCopy)}/copy</span>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Total production */}
            <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 font-semibold">
              <td className="px-4 py-2 text-gray-800 dark:text-gray-200">Total Production</td>
              {results.map((r) => (
                <td key={r.id} className="px-4 py-2 text-right font-mono text-gray-800 dark:text-gray-200">
                  ₹{fmt(r.costs.totalProduction)}
                  <span className="block text-[10px] font-normal text-gray-500">₹{fmtCopy(r.pricing.costPerCopy)}/copy</span>
                </td>
              ))}
            </tr>

            {/* Selling price */}
            <tr className="border-t dark:border-gray-700 bg-blue-50 dark:bg-blue-950">
              <td className="px-4 py-3 font-semibold text-blue-800 dark:text-blue-200">
                💰 Selling Price
              </td>
              {results.map((r) => (
                <td key={r.id} className="px-4 py-3 text-right font-mono">
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    ₹{fmt(r.pricing.totalSellingPrice)}
                  </span>
                  <span className="block text-xs text-blue-600 dark:text-blue-400">
                    ₹{fmtCopy(r.pricing.sellingPricePerCopy)}/copy
                  </span>
                  {!isINR && (
                    <span className="block text-[10px] text-gray-500 mt-0.5">
                      {sym}{fmtCopy(r.pricing.sellingPricePerCopy_foreign)}/copy
                    </span>
                  )}
                </td>
              ))}
            </tr>

            {/* Margin */}
            <tr className="border-t dark:border-gray-700">
              <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                Margin ({results[0]?.pricing.pricingMethod === "OVERHEAD" ? "overhead" : "margin"} method)
              </td>
              {results.map((r) => (
                <td key={r.id} className="px-4 py-2 text-right font-mono text-sm">
                  <span className={cn(
                    r.pricing.marginPercent >= 20 ? "text-green-600" :
                    r.pricing.marginPercent >= 10 ? "text-amber-600" : "text-red-600",
                  )}>
                    {r.pricing.marginPercent.toFixed(1)}%
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    ₹{fmt(r.pricing.marginAmount)}
                  </span>
                </td>
              ))}
            </tr>

            {/* Physical specs */}
            <tr className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <td className="px-4 py-2 text-xs text-gray-500">Book weight / Spine / Machine hours</td>
              {results.map((r) => (
                <td key={r.id} className="px-4 py-2 text-right text-xs text-gray-500 font-mono">
                  {r.bookWeight_g}g · {r.spineThickness_mm}mm · {r.machineHours.toFixed(1)}h
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
