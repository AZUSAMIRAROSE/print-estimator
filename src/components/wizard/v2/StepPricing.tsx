// ============================================================================
// STEP 11: PRICING — Currency, margin, discount, commission, tax
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { cn } from "@/utils/cn";

const CURRENCIES = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
];

const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  INR: 1,
  GBP: 110,
  USD: 85,
  EUR: 92,
  AED: 23,
  SGD: 63,
};

export function StepPricing() {
  const { estimation, setEstimationField } = useWizardStore();
  const pricing = estimation.pricing;

  const handleCurrencyChange = (currency: string) => {
    setEstimationField("pricing.currency", currency);
    // Auto-set exchange rate
    const rate = DEFAULT_EXCHANGE_RATES[currency] ?? 1;
    setEstimationField("pricing.exchangeRate", rate);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Currency selection */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Currency</h3>
        <div className="flex flex-wrap gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => handleCurrencyChange(c.code)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm transition-all",
                pricing.currency === c.code
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 font-semibold"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-900",
              )}
            >
              <span className="font-mono mr-1">{c.symbol}</span>
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Exchange rate (only if not INR) */}
      {pricing.currency !== "INR" && (
        <FieldWrapper sectionId="__pricing__" fieldName="exchangeRate" label={`Exchange Rate (1 ${pricing.currency} = X INR)`}>
          <input
            type="number"
            value={pricing.exchangeRate}
            onChange={(e) => setEstimationField("pricing.exchangeRate", parseFloat(e.target.value) || 1)}
            min={0.01}
            step={0.01}
            className="w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>
      )}

      {/* Margin and discount */}
      <div className="grid grid-cols-3 gap-4">
        <FieldWrapper
          sectionId="__pricing__"
          fieldName="marginPercent"
          label="Margin %"
          help="Target profit margin on selling price"
        >
          <div className="relative">
            <input
              type="number"
              value={pricing.marginPercent}
              onChange={(e) => setEstimationField("pricing.marginPercent", parseFloat(e.target.value) || 0)}
              min={0}
              max={99}
              step={0.5}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </FieldWrapper>

        <FieldWrapper
          sectionId="__pricing__"
          fieldName="discountPercent"
          label="Discount %"
          help="Volume/client discount"
        >
          <div className="relative">
            <input
              type="number"
              value={pricing.discountPercent}
              onChange={(e) => setEstimationField("pricing.discountPercent", parseFloat(e.target.value) || 0)}
              min={0}
              max={50}
              step={0.5}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </FieldWrapper>

        <FieldWrapper
          sectionId="__pricing__"
          fieldName="commissionPercent"
          label="Commission %"
          help="Agent/rep commission"
        >
          <div className="relative">
            <input
              type="number"
              value={pricing.commissionPercent}
              onChange={(e) => setEstimationField("pricing.commissionPercent", parseFloat(e.target.value) || 0)}
              min={0}
              max={30}
              step={0.5}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </FieldWrapper>
      </div>

      {/* Tax */}
      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper sectionId="__pricing__" fieldName="taxRate" label="Tax Rate %">
          <div className="relative">
            <input
              type="number"
              value={pricing.taxRate}
              onChange={(e) => setEstimationField("pricing.taxRate", parseFloat(e.target.value) || 0)}
              min={0}
              max={50}
              step={0.5}
              className="w-full px-3 py-2 pr-8 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
          </div>
        </FieldWrapper>

        <FieldWrapper sectionId="__pricing__" fieldName="includesTax" label="Tax Included?">
          <div className="flex gap-3 pt-2">
            {[
              { value: false, label: "Tax exclusive" },
              { value: true, label: "Tax inclusive" },
            ].map((opt) => (
              <label key={String(opt.value)} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={pricing.includesTax === opt.value}
                  onChange={() => setEstimationField("pricing.includesTax", opt.value)}
                  className="w-4 h-4 text-blue-600"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </FieldWrapper>
      </div>

      {/* V189 formula explanation */}
      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <p className="font-semibold">📐 Selling Price Formula</p>
        <p>
          Price = MAX(
          <span className="font-mono text-blue-600 dark:text-blue-400"> (cost + overhead) / (1 − {pricing.marginPercent}%)</span>,
          <span className="font-mono text-purple-600 dark:text-purple-400"> cost / (1 − {pricing.discountPercent}%) / (1 − {pricing.marginPercent}%)</span>
          )
        </p>
        <p className="text-gray-400">Whichever method yields the higher price is used to protect margins.</p>
      </div>
    </div>
  );
}
