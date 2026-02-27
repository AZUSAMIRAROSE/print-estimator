import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber } from "@/utils/format";
import { calculateSpineThickness } from "@/utils/calculations/spine";
import { calculateBookWeight } from "@/utils/calculations/weight";
import { Calculator as CalcIcon, Book, Layers, DollarSign, RefreshCcw, AlertTriangle } from "lucide-react";
import { DEFAULT_PAPER_RATES, TRIM_SIZE_PRESETS } from "@/constants";
import type { PricingMode, QuickCalcForm, Turnaround } from "@/utils/calculations/quickQuote";
import { calculateQuickCosts, validateAndParseQuickCalc } from "@/utils/calculations/quickQuote";

const DEFAULT_FORM: QuickCalcForm = {
  bookHeight: "234",
  bookWidth: "153",
  pages: "256",
  gsm: "130",
  paperType: "Matt Art Paper",
  quantity: "5000",
  colorsFront: "4",
  colorsBack: "4",
  coverGSM: "300",
  coverPaper: "Art Card",
  bindingType: "perfect_binding",
  laminationType: "gloss",
  pricingMode: "margin",
  pricingPercent: "20",
  taxRate: "0",
  turnaround: "standard",
};

export function Calculator() {
  const [form, setForm] = useState<QuickCalcForm>(DEFAULT_FORM);

  const paperTypes = useMemo(() => [...new Set(DEFAULT_PAPER_RATES.map((r) => r.paperType))], []);
  const { parsed, errors } = useMemo(() => validateAndParseQuickCalc(form), [form]);

  const runtimeError = useMemo(() => {
    if (!parsed || errors.length > 0) return "";
    try {
      calculateQuickCosts(parsed);
      return "";
    } catch (err) {
      return (err as Error).message;
    }
  }, [parsed, errors]);

  const spine = useMemo(() => {
    if (!parsed) return 0;
    return calculateSpineThickness({
      textSections: [{ pages: parsed.pages, gsm: parsed.gsm, paperType: parsed.paperType }],
    });
  }, [parsed]);

  const bookWeight = useMemo(() => {
    if (!parsed) return { totalWeight: 0 };
    return calculateBookWeight({
      trimHeightMM: parsed.bookHeight,
      trimWidthMM: parsed.bookWidth,
      textSections: [{ pages: parsed.pages, gsm: parsed.gsm }],
      coverGSM: parsed.coverGSM,
      spineThickness: spine,
      hasEndleaves: false,
      endleavesPages: 0,
      endleavesGSM: 0,
      hasJacket: false,
      jacketGSM: 0,
      boardThicknessMM: 0,
      hasBoard: false,
    });
  }, [parsed, spine]);

  const result = useMemo(() => {
    if (!parsed || errors.length > 0) return null;
    try {
      return calculateQuickCosts(parsed);
    } catch {
      return null;
    }
  }, [parsed, errors]);

  const allErrors = [...errors, ...(runtimeError ? [runtimeError] : [])];
  const liveMessage = result
    ? `Estimate updated. Grand total ${formatCurrency(result.grandTotal)} for ${parsed?.quantity ?? 0} copies.`
    : allErrors.length > 0
      ? `Validation errors: ${allErrors[0]}`
      : "Enter values to calculate.";

  const handleReset = () => setForm(DEFAULT_FORM);

  return (
    <div className="space-y-6 animate-in">
      <div className="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <CalcIcon className="w-6 h-6" /> Quick Calculator
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Fast estimate with validation, realistic pricing, volume discounts, tax, and rush pricing.
          </p>
        </div>
        <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5">
          <RefreshCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {allErrors.length > 0 && (
        <div className="card p-4 border-danger-500/40 bg-danger-50 dark:bg-danger-500/10" role="alert" aria-live="assertive">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-danger-700 dark:text-danger-400">Fix the following before calculation:</p>
              <ul className="mt-1 text-xs text-danger-700 dark:text-danger-400 list-disc pl-4">
                {allErrors.map((err) => <li key={err}>{err}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <Book className="w-4 h-4 text-primary-500" /> Book Specification
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Width (mm)" value={form.bookWidth} onChange={(value) => setForm({ ...form, bookWidth: value })} />
              <Field label="Height (mm)" value={form.bookHeight} onChange={(value) => setForm({ ...form, bookHeight: value })} />
              <Field label="Pages" value={form.pages} onChange={(value) => setForm({ ...form, pages: value })} />
              <Field label="Quantity" value={form.quantity} onChange={(value) => setForm({ ...form, quantity: value })} />
            </div>
            <div>
              <label className="label">Preset Size</label>
              <div className="flex flex-wrap gap-1.5">
                {TRIM_SIZE_PRESETS.slice(0, 10).map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setForm({ ...form, bookWidth: String(p.width), bookHeight: String(p.height) })}
                    className={cn(
                      "px-2.5 py-1 rounded-lg border text-xs transition-all",
                      form.bookWidth === String(p.width) && form.bookHeight === String(p.height)
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400"
                        : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300"
                    )}
                  >
                    {p.label.split("(")[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> Paper, Binding, and Pricing
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SelectField label="Text Paper" value={form.paperType} onChange={(value) => setForm({ ...form, paperType: value })} options={paperTypes} />
              <Field label="Text GSM" value={form.gsm} onChange={(value) => setForm({ ...form, gsm: value })} />
              <Field label="Front Colors" value={form.colorsFront} onChange={(value) => setForm({ ...form, colorsFront: value })} />
              <Field label="Back Colors" value={form.colorsBack} onChange={(value) => setForm({ ...form, colorsBack: value })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SelectField label="Cover Paper" value={form.coverPaper} onChange={(value) => setForm({ ...form, coverPaper: value })} options={paperTypes} />
              <Field label="Cover GSM" value={form.coverGSM} onChange={(value) => setForm({ ...form, coverGSM: value })} />
              <SelectField
                label="Binding"
                value={form.bindingType}
                onChange={(value) => setForm({ ...form, bindingType: value as QuickCalcForm["bindingType"] })}
                options={["perfect_binding", "saddle_stitching", "section_sewn_hardcase"]}
              />
              <SelectField
                label="Lamination"
                value={form.laminationType}
                onChange={(value) => setForm({ ...form, laminationType: value as QuickCalcForm["laminationType"] })}
                options={["gloss", "matt", "velvet", "anti_scratch", "none"]}
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SelectField
                label="Pricing Mode"
                value={form.pricingMode}
                onChange={(value) => setForm({ ...form, pricingMode: value as PricingMode })}
                options={["margin", "markup"]}
              />
              <Field label={form.pricingMode === "margin" ? "Margin (%)" : "Markup (%)"} value={form.pricingPercent} onChange={(value) => setForm({ ...form, pricingPercent: value })} />
              <Field label="Tax (%)" value={form.taxRate} onChange={(value) => setForm({ ...form, taxRate: value })} />
              <SelectField
                label="Turnaround"
                value={form.turnaround}
                onChange={(value) => setForm({ ...form, turnaround: value as Turnaround })}
                options={["standard", "rush", "express"]}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-center">
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <div
                  className="bg-gradient-to-br from-primary-400 to-primary-600 rounded-r-md rounded-l-sm shadow-lg flex items-center justify-center"
                  style={{
                    width: `${Math.min(Math.max((parsed?.bookWidth ?? 0) * 0.5, 40), 100)}px`,
                    height: `${Math.min(Math.max((parsed?.bookHeight ?? 0) * 0.5, 50), 130)}px`,
                  }}
                >
                  <div className="text-white text-center">
                    <p className="text-[9px] font-medium">{parsed?.bookWidth ?? 0}x{parsed?.bookHeight ?? 0}mm</p>
                    <p className="text-[8px] opacity-70">{parsed?.pages ?? 0}pp</p>
                  </div>
                </div>
                {spine > 0 && (
                  <div className="absolute top-0 left-0 bg-primary-800 rounded-l-sm" style={{ width: `${Math.max(spine * 0.7, 2)}px`, height: "100%" }} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-2">
              <Metric label="Spine" value={`${spine.toFixed(2)}mm`} />
              <Metric label="Weight" value={`${bookWeight.totalWeight.toFixed(0)}g`} />
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Estimate
            </h3>

            {result ? (
              <>
                <Rows rows={[
                  { label: "Text Paper", value: result.paperCost },
                  { label: "Cover Paper", value: result.coverCost },
                  { label: "Printing", value: result.printingCost },
                  { label: "CTP", value: result.ctpCost },
                  { label: "Make Ready", value: result.makeReady },
                  { label: "Binding", value: result.bindingCost },
                  { label: "Lamination", value: result.laminationCost },
                  { label: "Rush/Express", value: result.rushSurcharge },
                  { label: `Volume Discount (${result.volumeDiscountPercent}%)`, value: -result.volumeDiscountAmount },
                  { label: "Min Order Adj.", value: result.minimumOrderAdjustment },
                  { label: "Selling (before tax)", value: result.sellingBeforeTax },
                  { label: "Tax", value: result.taxAmount },
                ]} />

                <div className="border-t-2 border-primary-500 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-text-light-primary dark:text-text-dark-primary">Grand Total</span>
                    <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">{formatCurrency(result.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">Sell/Copy</span>
                    <span className="font-semibold">{formatCurrency(result.sellPerCopy)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-light-border dark:border-surface-dark-border text-xs text-center">
                  <Metric label="Reams" value={result.reams.toFixed(1)} />
                  <Metric label="Plates" value={String(result.plates)} />
                  <Metric label="Impressions" value={formatNumber(result.impressions)} />
                </div>
              </>
            ) : (
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Enter valid inputs to view calculated pricing.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="input-field" />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </div>
  );
}

function Rows({ rows }: { rows: Array<{ label: string; value: number }> }) {
  return (
    <div className="space-y-2 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between">
          <span className="text-text-light-secondary dark:text-text-dark-secondary">{row.label}</span>
          <span className="font-medium">{formatCurrency(row.value)}</span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-text-light-tertiary dark:text-text-dark-tertiary">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}
