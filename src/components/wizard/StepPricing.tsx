import { useEstimationStore } from "@/stores/estimationStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { Info, DollarSign, Percent, Receipt, Globe } from "lucide-react";
import { DEFAULT_CURRENCIES, TAX_RATES } from "@/constants";

export function StepPricing() {
  const { estimation, updatePricing } = useEstimationStore();
  const { currencies } = useAppStore();
  const p = estimation.pricing;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Pricing Configuration</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Set your margin percentage, commission, tax, and currency. Selling price = Cost / (1 - margin%).
            All costs are calculated in INR and converted to the customer's currency at the specified exchange rate.
          </p>
        </div>
      </div>

      {/* Margin & Commission */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Margin & Commission
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Margin (%)</label>
            <input
              type="number"
              min={0}
              max={80}
              step={0.5}
              value={p.marginPercent}
              onChange={(e) => updatePricing({ marginPercent: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
              Selling = Cost / (1 - {p.marginPercent}%)
            </p>
          </div>
          <div>
            <label className="label">Commission (%)</label>
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={p.commissionPercent}
              onChange={(e) => updatePricing({ commissionPercent: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Volume Discount (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={p.volumeDiscount}
              onChange={(e) => updatePricing({ volumeDiscount: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Target TPH (₹/hr)</label>
            <input
              type="number"
              value={p.targetTPH}
              onChange={(e) => updatePricing({ targetTPH: parseFloat(e.target.value) || 4000 })}
              className="input-field"
            />
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
              Target throughput per hour
            </p>
          </div>
        </div>
      </div>

      {/* Currency */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Currency
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="label">Quote Currency</label>
            <select
              value={p.currency}
              onChange={(e) => {
                const currency = currencies.find(c => c.code === e.target.value);
                updatePricing({
                  currency: e.target.value as any,
                  exchangeRate: currency?.exchangeRate || 1,
                });
              }}
              className="input-field"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Exchange Rate (1 {p.currency} = ₹)</label>
            <input
              type="number"
              step={0.01}
              value={p.exchangeRate}
              onChange={(e) => updatePricing({ exchangeRate: parseFloat(e.target.value) || 1 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Round To (decimal)</label>
            <select
              value={3}
              className="input-field"
            >
              <option value={0}>Whole number</option>
              <option value={2}>2 decimals</option>
              <option value={3}>3 decimals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tax */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Tax Configuration
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className="label">Tax Type</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { type: "gst_print" as const, label: "GST (Print)", rate: TAX_RATES.gst_print },
                { type: "gst_book" as const, label: "GST (Books)", rate: TAX_RATES.gst_book },
                { type: "none" as const, label: "No Tax", rate: 0 },
                { type: "vat" as const, label: "VAT", rate: 20 },
                { type: "custom" as const, label: "Custom", rate: p.taxRate },
              ]).map(({ type, label, rate }) => (
                <button
                  key={type}
                  onClick={() => updatePricing({ taxType: type, taxRate: rate })}
                  className={cn(
                    "p-2 rounded-lg border-2 text-center transition-all text-sm",
                    p.taxType === type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                  )}
                >
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{rate}%</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Tax Rate (%)</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={p.taxRate}
              onChange={(e) => updatePricing({ taxRate: parseFloat(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Price Includes Tax</label>
            <button
              onClick={() => updatePricing({ includesTax: !p.includesTax })}
              className={cn(
                "w-full p-2 rounded-lg border-2 text-sm transition-all",
                p.includesTax
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700"
                  : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
              )}
            >
              {p.includesTax ? "Yes, Inclusive" : "No, Exclusive"}
            </button>
          </div>
        </div>
      </div>

      {/* Payment & Validity */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Payment & Quotation
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Payment Terms</label>
            <input
              type="text"
              value={p.paymentTerms}
              onChange={(e) => updatePricing({ paymentTerms: e.target.value })}
              placeholder="e.g., L/C at Sight"
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Payment Days</label>
            <input
              type="number"
              min={0}
              value={p.paymentDays}
              onChange={(e) => updatePricing({ paymentDays: parseInt(e.target.value) || 0 })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Quotation Validity (days)</label>
            <input
              type="number"
              min={1}
              value={p.quotationValidity}
              onChange={(e) => updatePricing({ quotationValidity: parseInt(e.target.value) || 15 })}
              className="input-field"
            />
          </div>
        </div>
      </div>
    </div>
  );
}