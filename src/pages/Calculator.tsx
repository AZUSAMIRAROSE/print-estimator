import React, { useMemo, useState, useCallback } from "react";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber } from "@/utils/format";
import { calculateSpineThickness } from "@/utils/calculations/spine";
import { calculateBookWeight } from "@/utils/calculations/weight";
import { useDataStore } from "@/stores/dataStore";
import {
  Calculator as CalcIcon, Book, DollarSign, RefreshCcw, AlertTriangle,
  Printer, Settings2, Sparkles, BarChart3,
  Copy, Weight, Ruler,
  Palette, Grid3X3, FileText, Eye, EyeOff, ArrowRight, CheckCircle2,
  Maximize2, Minimize2
} from "lucide-react";
import { DEFAULT_PAPER_RATES, TRIM_SIZE_PRESETS, DEFAULT_MACHINES, STANDARD_PAPER_SIZES, DEFAULT_DESTINATIONS, LAMINATION_RATES } from "@/constants";
import type { PricingMode, Turnaround } from "@/utils/calculations/quickQuote";
import type { BindingType } from "@/types";
import type { QuickCalcForm, AdvancedCostResult } from "@/utils/calculations/quickQuote";
import { ADVANCED_DEFAULT_FORM, validateAndParseQuickCalc, calculateAdvancedCosts, calculateMultiQuantity } from "@/utils/calculations/quickQuote";

// ── Binding type labels ──────────────────────────────────────────────────────
const BINDING_LABELS: Record<string, string> = {
  perfect_binding: "Perfect Binding",
  pur_binding: "PUR Binding",
  section_sewn_perfect: "Section Sewn + Perfect",
  section_sewn_hardcase: "Section Sewn Hardcase",
  saddle_stitching: "Saddle Stitching",
  wire_o: "Wire-O",
  spiral: "Spiral",
  case_binding: "Case Binding",
  lay_flat: "Lay Flat",
  coptic: "Coptic",
  japanese: "Japanese",
  singer_sewn: "Singer Sewn",
  pamphlet: "Pamphlet",
  tape_binding: "Tape Binding",
  thermal_binding: "Thermal Binding",
};

const BINDING_TYPES = Object.keys(BINDING_LABELS) as BindingType[];

// ── Component ────────────────────────────────────────────────────────────────

export function Calculator() {
  const { customers } = useDataStore();
  const [form, setForm] = useState<QuickCalcForm>(ADVANCED_DEFAULT_FORM);
  const [activeSection, setActiveSection] = useState(0);
  const [showAudit, setShowAudit] = useState(false);
  const [showMultiQty, setShowMultiQty] = useState(false);
  const [compactResults, setCompactResults] = useState(false);

  const paperTypes = useMemo(() => [...new Set(DEFAULT_PAPER_RATES.map(r => r.paperType))], []);
  const paperSizes = useMemo(() => STANDARD_PAPER_SIZES.map(ps => ps.label), []);
  const { parsed, errors } = useMemo(() => validateAndParseQuickCalc(form), [form]);

  // ── Compute result ─────────────────────────────────────────────────────────
  const runtimeError = useMemo(() => {
    if (!parsed || errors.length > 0) return "";
    try {
      calculateAdvancedCosts(parsed);
      return "";
    } catch (err) {
      return (err as Error).message;
    }
  }, [parsed, errors]);

  const result: AdvancedCostResult | null = useMemo(() => {
    if (!parsed || errors.length > 0) return null;
    try {
      return calculateAdvancedCosts(parsed);
    } catch {
      return null;
    }
  }, [parsed, errors]);

  const multiResults: AdvancedCostResult[] = useMemo(() => {
    if (!parsed || errors.length > 0) return [];
    try {
      return calculateMultiQuantity(parsed);
    } catch {
      return [];
    }
  }, [parsed, errors]);

  // Compute live basic spine thickness if text pages & gsm provided
  const liveSpine = useMemo(() => {
    try {
      if (form.pages && form.gsm && form.paperType) {
        return calculateSpineThickness({
          textSections: [{ pages: Number(form.pages), gsm: Number(form.gsm), paperType: form.paperType }]
        });
      }
    } catch {
      // Error calculating live spine - silent fail
    }
    return 0;
  }, [form.pages, form.gsm, form.paperType]);

  const liveWeight = useMemo(() => {
    try {
      if (form.pages && form.gsm && form.bookWidth && form.bookHeight) {
        return calculateBookWeight({
          trimWidthMM: Number(form.bookWidth),
          trimHeightMM: Number(form.bookHeight),
          textSections: [{ pages: Number(form.pages), gsm: Number(form.gsm) }],
          coverGSM: Number(form.coverGSM || 300),
          spineThickness: liveSpine || 5,
          hasEndleaves: false,
          endleavesGSM: 0,
          endleavesPages: 0,
          hasJacket: false,
          jacketGSM: 0,
          hasBoard: form.bindingType === "case_binding" || form.bindingType === "section_sewn_hardcase",
          boardThicknessMM: Number(form.boardThickness || 0)
        });
      }
    } catch {
      // Error calculating live weight - silent fail
    }
    return null;
  }, [form.pages, form.gsm, form.bookWidth, form.bookHeight, form.coverGSM, liveSpine, form.bindingType, form.boardThickness]);

  const allErrors = [...errors, ...(runtimeError ? [runtimeError] : [])];

  const updateForm = useCallback((updates: Partial<QuickCalcForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const handleReset = () => setForm(ADVANCED_DEFAULT_FORM);

  const setQuantityAt = (index: number, value: string) => {
    const q = [...form.quantities];
    q[index] = value;
    updateForm({ quantities: q, quantity: q[0] || form.quantity });
  };

  // ── Input sections config ──────────────────────────────────────────────────
  const sections = [
    { icon: <Book className="w-4 h-4 text-purple-500" />, label: "Book Spec", key: 0 },
    { icon: <Printer className="w-4 h-4 text-blue-500" />, label: "Paper & Printing", key: 1 },
    { icon: <Settings2 className="w-4 h-4 text-amber-500" />, label: "Finishing", key: 2 },
    { icon: <DollarSign className="w-4 h-4 text-green-500" />, label: "Pricing", key: 3 },
  ];

  return (
    <div className="space-y-4 animate-in">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg relative overflow-hidden group">
              <Sparkles className="w-5 h-5 absolute inset-0 m-auto text-white/20 animate-spin-slow group-hover:scale-150 transition-transform duration-700" />
              <CalcIcon className="w-5 h-5 relative z-10" />
            </div>
            Advanced Print Calculator
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Full-precision estimation engine × Real imposition × Industry wastage charts × Machine-specific rates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMultiQty(!showMultiQty)}
            className={cn("btn-secondary flex items-center gap-1.5 text-xs", showMultiQty && "bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/40")}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Multi-Qty
          </button>
          <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5 text-xs">
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          {activeSection < 3 && (
            <button onClick={() => setActiveSection(s => Math.min(3, s + 1))} className="btn-primary flex items-center gap-1.5 text-xs">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Errors ──────────────────────────────────────────────────────────── */}
      {allErrors.length > 0 && (
        <div className="card p-3 border-danger-500/40 bg-danger-50 dark:bg-danger-500/10" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger-600 dark:text-danger-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-danger-700 dark:text-danger-400">Fix the following:</p>
              <ul className="mt-1 text-xs text-danger-700 dark:text-danger-400 list-disc pl-4 space-y-0.5">
                {allErrors.map(err => <li key={err}>{err}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LEFT: Input Sections (5 cols)                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-5 space-y-3">
          {/* Tab bar */}
          <div className="flex gap-1 bg-surface-light-secondary dark:bg-surface-dark-secondary rounded-xl p-1">
            {sections.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all",
                  activeSection === s.key
                    ? "bg-white dark:bg-surface-dark-primary text-primary-700 dark:text-primary-400 shadow-sm"
                    : "text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
                )}
              >
                {s.icon}
                <span className="hidden lg:inline">{s.label}</span>
              </button>
            ))}
          </div>

          {/* ── Section 0: Book Spec ─────────────────────────────────────────── */}
          {activeSection === 0 && (
            <div className="card p-4 space-y-4">
              <SectionTitle icon={<Book className="w-4 h-4 text-purple-500" />} title="Book Specification" />
              {liveSpine > 0 && (
                <div className="flex items-center gap-2 text-xs bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 p-2 rounded-lg border border-primary-200 dark:border-primary-500/20 shadow-sm animate-in fade-in zoom-in duration-300">
                  <div className="w-4 h-4 flex items-center justify-center rounded-full bg-primary-500 text-white shrink-0">i</div>
                  <span>Estimated Spine: <strong>{liveSpine.toFixed(2)} mm</strong> {liveWeight ? `• Est. Weight: ${(liveWeight.totalWeight / 1000).toFixed(2)} kg` : ''}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Width (mm)" value={form.bookWidth} onChange={v => updateForm({ bookWidth: v })} />
                <Field label="Height (mm)" value={form.bookHeight} onChange={v => updateForm({ bookHeight: v })} />
                <Field label="Pages" value={form.pages} onChange={v => updateForm({ pages: v })} hint="Must be even" />
                <Field label="Quantity" value={form.quantity} onChange={v => updateForm({ quantity: v, quantities: [v, ...form.quantities.slice(1)] })} />
              </div>

              {/* Multi-quantity inputs */}
              {showMultiQty && (
                <div className="border-t border-surface-light-border dark:border-surface-dark-border pt-3 space-y-2">
                  <p className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary flex items-center gap-1.5">
                    <Grid3X3 className="w-3.5 h-3.5" /> Multi-Quantity Comparison
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {form.quantities.map((q, i) => (
                      <div key={i}>
                        <label className="label text-[10px]">Qty {i + 1}</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={q}
                          onChange={e => setQuantityAt(i, e.target.value)}
                          className="input-field text-xs"
                          placeholder="—"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preset sizes */}
              <div>
                <label className="label text-[10px]">Preset Sizes</label>
                <div className="flex flex-wrap gap-1">
                  {TRIM_SIZE_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => updateForm({ bookWidth: String(p.width), bookHeight: String(p.height) })}
                      className={cn(
                        "px-2 py-1 rounded-lg border text-[10px] transition-all",
                        form.bookWidth === String(p.width) && form.bookHeight === String(p.height)
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-medium"
                          : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 text-text-light-secondary dark:text-text-dark-secondary"
                      )}
                    >
                      {p.label.split("(")[0].trim().length > 20 ? p.label.split("(")[0].trim().slice(0, 18) + "…" : p.label.split("(")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Section 1: Paper & Printing ──────────────────────────────────── */}
          {activeSection === 1 && (
            <div className="card p-4 space-y-4">
              <SectionTitle icon={<Printer className="w-4 h-4 text-blue-500" />} title="Paper & Printing" />

              {/* Text section */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">Text Section</p>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Text Paper" value={form.paperType} onChange={v => updateForm({ paperType: v })} options={paperTypes} />
                  <Field label="Text GSM" value={form.gsm} onChange={v => updateForm({ gsm: v })} />
                  <SelectField label="Paper Size" value={form.paperSize} onChange={v => updateForm({ paperSize: v })} options={paperSizes} />
                  <SelectField
                    label="Machine"
                    value={form.machineId}
                    onChange={v => updateForm({ machineId: v })}
                    options={DEFAULT_MACHINES.map(m => m.id)}
                    labels={DEFAULT_MACHINES.map(m => m.name)}
                  />
                  <Field label="Front Colors" value={form.colorsFront} onChange={v => updateForm({ colorsFront: v })} hint={<span className="flex items-center gap-1"><Palette className="w-3 h-3" /> CMYK</span> as any} />
                  <Field label="Back Colors" value={form.colorsBack} onChange={v => updateForm({ colorsBack: v })} />
                </div>
                <SelectField
                  label="Printing Method"
                  value={form.printingMethod}
                  onChange={v => updateForm({ printingMethod: v as QuickCalcForm["printingMethod"] })}
                  options={["sheetwise", "work_and_turn", "work_and_tumble", "perfector"]}
                  labels={["Sheetwise", "Work & Turn", "Work & Tumble", "Perfector"]}
                />
              </div>

              {/* Cover section */}
              <div className="border-t border-surface-light-border dark:border-surface-dark-border pt-3 space-y-3">
                <p className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">Cover</p>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Cover Paper" value={form.coverPaper} onChange={v => updateForm({ coverPaper: v })} options={paperTypes} />
                  <Field label="Cover GSM" value={form.coverGSM} onChange={v => updateForm({ coverGSM: v })} />
                  <Field label="Cover Front Colors" value={form.coverColorsFront} onChange={v => updateForm({ coverColorsFront: v })} />
                  <Field label="Cover Back Colors" value={form.coverColorsBack} onChange={v => updateForm({ coverColorsBack: v })} />
                  <SelectField
                    label="Cover Machine"
                    value={form.coverMachineId}
                    onChange={v => updateForm({ coverMachineId: v })}
                    options={DEFAULT_MACHINES.map(m => m.id)}
                    labels={DEFAULT_MACHINES.map(m => m.name)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Section 2: Binding & Finishing ───────────────────────────────── */}
          {activeSection === 2 && (
            <div className="card p-4 space-y-4">
              <SectionTitle icon={<Settings2 className="w-4 h-4 text-amber-500" />} title="Binding & Finishing" />

              {/* Binding */}
              <div className="space-y-3">
                <SelectField
                  label="Binding Type"
                  value={form.bindingType}
                  onChange={v => updateForm({ bindingType: v as BindingType })}
                  options={BINDING_TYPES}
                  labels={BINDING_TYPES.map(b => BINDING_LABELS[b])}
                />
                {(form.bindingType === "section_sewn_hardcase" || form.bindingType === "case_binding") && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Board Thickness (mm)" value={form.boardThickness} onChange={v => updateForm({ boardThickness: v })} />
                    <SelectField
                      label="Board Origin"
                      value={form.boardOrigin}
                      onChange={v => updateForm({ boardOrigin: v as "imported" | "indian" })}
                      options={["imported", "indian"]}
                      labels={["Imported", "Indian"]}
                    />
                  </div>
                )}
              </div>

              {/* Finishing */}
              <div className="border-t border-surface-light-border dark:border-surface-dark-border pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">Finishing Options</p>
                  <Toggle checked={form.includeFinishing} onChange={v => updateForm({ includeFinishing: v })} label="Enable" />
                </div>

                {form.includeFinishing && (
                  <>
                    <SelectField
                      label="Lamination"
                      value={form.laminationType}
                      onChange={v => updateForm({ laminationType: v as QuickCalcForm["laminationType"] })}
                      options={Object.keys(LAMINATION_RATES).concat("none")}
                      labels={Object.keys(LAMINATION_RATES).map(k => `${k.replace("_", " ")} (₹${(LAMINATION_RATES as any)[k].ratePerCopy}/copy)`).concat("None")}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <ToggleOption label="Spot UV" checked={form.spotUV} onChange={v => updateForm({ spotUV: v })} />
                      <ToggleOption label="Embossing" checked={form.embossing} onChange={v => updateForm({ embossing: v })} />
                      <ToggleOption label="Foil Blocking" checked={form.foilBlocking} onChange={v => updateForm({ foilBlocking: v })} />
                      <ToggleOption label="Die Cutting" checked={form.dieCutting} onChange={v => updateForm({ dieCutting: v })} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Section 3: Pricing ───────────────────────────────────────────── */}
          {activeSection === 3 && (
            <div className="card p-4 space-y-4">
              <SectionTitle icon={<DollarSign className="w-4 h-4 text-green-500" />} title="Pricing & Delivery" />

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 mb-2">
                <label className="label text-[10px] text-blue-800 dark:text-blue-300 mb-1">Link to Customer (Auto-fills defaults)</label>
                <select
                  value={form.customerId}
                  onChange={e => {
                    const cid = e.target.value;
                    const cust = customers.find(c => c.id === cid);
                    if (cust) {
                      updateForm({
                        customerId: cid,
                        customerDiscount: String(cust.defaultDiscount || 0),
                        pricingPercent: String(cust.defaultMargin || form.pricingPercent),
                        taxRate: String(cust.defaultTaxRate || form.taxRate),
                        pricingMode: "margin"
                      });
                    } else {
                      updateForm({ customerId: "none", customerDiscount: "0" });
                    }
                  }}
                  className="input-field text-sm font-medium border-blue-300 focus:ring-blue-500 bg-white dark:bg-surface-dark-primary"
                >
                  <option value="none">-- No Customer Selected --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Pricing Mode"
                  value={form.pricingMode}
                  onChange={v => updateForm({ pricingMode: v as PricingMode })}
                  options={["margin", "markup"]}
                  labels={["Margin", "Markup"]}
                />
                <Field
                  label={form.pricingMode === "margin" ? "Margin (%)" : "Markup (%)"}
                  value={form.pricingPercent}
                  onChange={v => updateForm({ pricingPercent: v })}
                />
                <Field label="Tax (%)" value={form.taxRate} onChange={v => updateForm({ taxRate: v })} />
                <Field label="Customer Discount (%)" value={form.customerDiscount} onChange={v => updateForm({ customerDiscount: v })} />
                <SelectField
                  label="Turnaround"
                  value={form.turnaround}
                  onChange={v => updateForm({ turnaround: v as Turnaround })}
                  options={["standard", "rush", "express"]}
                  labels={["Standard", "Rush (+15%)", "Express (+30%)"]}
                />
                <SelectField
                  label="Destination"
                  value={form.destinationId}
                  onChange={v => updateForm({ destinationId: v })}
                  options={DEFAULT_DESTINATIONS.map(d => d.id)}
                  labels={DEFAULT_DESTINATIONS.map(d => `${d.name} (${d.country})`)}
                />
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RIGHT: Results Dashboard (7 cols)                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="xl:col-span-7 space-y-3">
          {result ? (
            <>
              {/* ── Hero Summary Cards ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <HeroCard
                  label="Grand Total"
                  value={formatCurrency(result.grandTotal)}
                  icon={<DollarSign className="w-4 h-4" />}
                  color="primary"
                  subtitle={`${formatNumber(result.quantity)} copies`}
                />
                <HeroCard
                  label="Per Copy"
                  value={formatCurrency(result.sellPerCopy)}
                  icon={<Copy className="w-4 h-4" />}
                  color="blue"
                  subtitle={`Cost: ${formatCurrency(result.costPerCopy)}`}
                />
                <HeroCard
                  label="Spine"
                  value={`${result.spineThickness.toFixed(2)}mm`}
                  icon={<Ruler className="w-4 h-4" />}
                  color="amber"
                  subtitle={result.spineWithBoard !== result.spineThickness ? `With board: ${result.spineWithBoard.toFixed(2)}mm` : "Text only"}
                />
                <HeroCard
                  label="Book Weight"
                  value={`${result.bookWeight.totalWeight.toFixed(0)}g`}
                  icon={<Weight className="w-4 h-4" />}
                  color="emerald"
                  subtitle={`${result.bookWeight.totalWeightKg.toFixed(2)} kg`}
                />
              </div>

              {/* ── Production Metrics ─────────────────────────────────────── */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">Production Metrics</h3>
                  <button
                    onClick={() => setCompactResults(!compactResults)}
                    className="text-text-light-tertiary dark:text-text-dark-tertiary hover:text-primary-500 transition-colors"
                  >
                    {compactResults ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                  <MetricBadge label="Reams" value={result.totalReams.toFixed(1)} />
                  <MetricBadge label="Plates" value={String(result.totalPlates)} />
                  <MetricBadge label="Impressions" value={formatNumber(result.totalImpressions)} />
                  <MetricBadge label="Forms" value={String(result.totalForms)} />
                  <MetricBadge label="PP/Form" value={String(result.textPPPerForm)} />
                  <MetricBadge label="Ups" value={String(result.ups)} />
                </div>
                {!compactResults && (
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mt-3 pt-3 border-t border-surface-light-border dark:border-surface-dark-border">
                    <MetricBadge label="Format" value={result.formatSize} />
                    <MetricBadge label="Paper Size" value={result.paperSizeUsed} />
                    <MetricBadge label="Machine" value={result.machineUsed.split(" ")[0]} />
                    <MetricBadge label="Wastage Sht" value={formatNumber(result.textWastageSheets)} />
                    <MetricBadge label="Margin" value={formatCurrency(result.marginAmount)} />
                    <MetricBadge label="Total Wt" value={`${((result.bookWeight.totalWeight * result.quantity) / 1000).toFixed(0)} kg`} />
                  </div>
                )}
              </div>

              {/* ── Detailed Cost Breakdown ────────────────────────────────── */}
              <div className="card p-4 space-y-2">
                <h3 className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-2">
                  Cost Breakdown
                </h3>

                <CostRow label="Text Paper" value={result.textPaper.totalCost} detail={`${result.textPaper.reams.toFixed(1)} reams × ₹${result.textPaper.ratePerReam.toLocaleString()}`} />
                <CostRow label="Cover Paper" value={result.coverPaper.totalCost} detail={`${result.coverPaper.reams.toFixed(1)} reams × ₹${result.coverPaper.ratePerReam.toLocaleString()}`} />
                <CostRow label="Text Printing" value={result.textPrinting.totalCost} detail={`${formatNumber(result.textPrinting.totalImpressions)} imp @ ₹${result.textPrinting.ratePer1000}/K + MR ₹${formatNumber(result.textPrinting.makeReadyCost)}`} />
                <CostRow label="Cover Printing" value={result.coverPrinting.totalCost} detail={`${formatNumber(result.coverPrinting.totalImpressions)} imp`} />
                <CostRow label="Text CTP" value={result.textCTP.totalCost} detail={`${result.textCTP.totalPlates} plates × ₹${result.textCTP.ratePerPlate}`} />
                <CostRow label="Cover CTP" value={result.coverCTP.totalCost} detail={`${result.coverCTP.totalPlates} plates × ₹${result.coverCTP.ratePerPlate}`} />
                <CostRow label="Binding" value={result.bindingCost} detail={`₹${result.bindingCostPerCopy.toFixed(2)}/copy × ${formatNumber(result.quantity)}`} accent />
                {result.laminationCost > 0 && <CostRow label="Lamination" value={result.laminationCost} />}
                {result.spotUVCost > 0 && <CostRow label="Spot UV" value={result.spotUVCost} />}
                {result.embossingCost > 0 && <CostRow label="Embossing" value={result.embossingCost} />}
                {result.foilBlockingCost > 0 && <CostRow label="Foil Blocking" value={result.foilBlockingCost} />}
                {result.dieCuttingCost > 0 && <CostRow label="Die Cutting" value={result.dieCuttingCost} />}

                <div className="border-t border-surface-light-border dark:border-surface-dark-border pt-2 mt-1">
                  <CostRow label="Production Cost" value={result.productionCost} bold />
                </div>
                {result.rushSurcharge > 0 && <CostRow label="Rush Surcharge" value={result.rushSurcharge} accent />}
                {result.volumeDiscountAmount > 0 && <CostRow label={`Volume Discount (${result.volumeDiscountPercent}%)`} value={-result.volumeDiscountAmount} dimmed />}
                {result.customerDiscountAmount > 0 && <CostRow label={`Customer Discount (${result.customerDiscountPercent}%)`} value={-result.customerDiscountAmount} dimmed />}
                {result.minimumOrderAdjustment > 0 && <CostRow label="Min Order Adj." value={result.minimumOrderAdjustment} />}
                <CostRow label="Selling (before tax)" value={result.sellingBeforeTax} bold />
                {result.taxAmount > 0 && <CostRow label="Tax" value={result.taxAmount} />}

                <div className="border-t-2 border-primary-500 pt-3 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-base text-text-light-primary dark:text-text-dark-primary">Grand Total</span>
                    <span className="font-bold text-xl text-primary-600 dark:text-primary-400">{formatCurrency(result.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Sell Per Copy</span>
                    <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(result.sellPerCopy)}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">Cost Per Copy</span>
                    <span className="text-sm font-medium text-text-light-tertiary dark:text-text-dark-tertiary">{formatCurrency(result.costPerCopy)}</span>
                  </div>
                </div>
              </div>

              {/* ── Weight Breakdown ────────────────────────────────────────── */}
              <div className="card p-4">
                <h3 className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-3">Weight Breakdown (per book)</h3>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                  <WeightItem label="Text" value={result.bookWeight.textWeight} />
                  <WeightItem label="Cover" value={result.bookWeight.coverWeight} />
                  <WeightItem label="Board" value={result.bookWeight.boardWeight} />
                  <WeightItem label="Endleaves" value={result.bookWeight.endleavesWeight} />
                  <WeightItem label="Misc (10%)" value={result.bookWeight.miscWeight} />
                  <WeightItem label="Total" value={result.bookWeight.totalWeight} highlight />
                </div>
              </div>

              {/* ── Multi-Quantity Comparison ───────────────────────────────── */}
              {showMultiQty && multiResults.length > 1 && (
                <div className="card p-4">
                  <h3 className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" /> Multi-Quantity Comparison
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-surface-light-border dark:border-surface-dark-border">
                          <th className="text-left py-2 pr-3 text-text-light-tertiary dark:text-text-dark-tertiary font-medium">Metric</th>
                          {multiResults.map(r => (
                            <th key={r.quantity} className="text-right py-2 px-2 text-text-light-primary dark:text-text-dark-primary font-semibold">
                              {formatNumber(r.quantity)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-light-border dark:divide-surface-dark-border">
                        <CompRow label="Grand Total" values={multiResults.map(r => formatCurrency(r.grandTotal))} bold />
                        <CompRow label="Per Copy" values={multiResults.map(r => formatCurrency(r.sellPerCopy))} />
                        <CompRow label="Cost/Copy" values={multiResults.map(r => formatCurrency(r.costPerCopy))} />
                        <CompRow label="Paper" values={multiResults.map(r => formatCurrency(r.totalPaperCost))} />
                        <CompRow label="Printing" values={multiResults.map(r => formatCurrency(r.totalPrintingCost))} />
                        <CompRow label="CTP" values={multiResults.map(r => formatCurrency(r.totalCTPCost))} />
                        <CompRow label="Binding" values={multiResults.map(r => formatCurrency(r.bindingCost))} />
                        <CompRow label="Finishing" values={multiResults.map(r => formatCurrency(r.totalFinishingCost))} />
                        <CompRow label="Margin" values={multiResults.map(r => formatCurrency(r.marginAmount))} />
                        <CompRow label="Reams" values={multiResults.map(r => r.totalReams.toFixed(1))} />
                        <CompRow label="Weight (kg)" values={multiResults.map(r => ((r.bookWeight.totalWeight * r.quantity) / 1000).toFixed(0))} />
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Calculation Audit Trail ─────────────────────────────────── */}
              <div className="card overflow-hidden">
                <button
                  onClick={() => setShowAudit(!showAudit)}
                  className="w-full flex items-center justify-between p-4 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-secondary transition-colors"
                >
                  <span className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Calculation Audit Trail
                  </span>
                  {showAudit ? <EyeOff className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" /> : <Eye className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />}
                </button>
                {showAudit && (
                  <div className="px-4 pb-4 space-y-3 text-xs">
                    <AuditGroup title="Imposition">
                      <AuditLine label="Text PP/Form" value={String(result.textPPPerForm)} />
                      <AuditLine label="Text Forms" value={String(result.textPaper.imposition.numberOfForms)} />
                      <AuditLine label="Text Ups" value={String(result.textPaper.imposition.ups)} />
                      <AuditLine label="Text Format" value={result.textPaper.imposition.formatLabel} />
                      <AuditLine label="Paper Size" value={result.textPaper.imposition.paperSizeLabel} />
                      <AuditLine label="Paper Waste %" value={`${result.textPaper.imposition.wastePercent.toFixed(1)}%`} />
                    </AuditGroup>
                    <AuditGroup title="Paper">
                      <AuditLine label="Text Net Sheets" value={formatNumber(result.textPaper.netSheets)} />
                      <AuditLine label="Text Wastage Sheets" value={formatNumber(result.textPaper.wastageSheets)} />
                      <AuditLine label="Text Gross Sheets" value={formatNumber(result.textPaper.grossSheets)} />
                      <AuditLine label="Text Reams" value={result.textPaper.reams.toFixed(2)} />
                      <AuditLine label="Text Rate/Ream" value={`₹${formatNumber(result.textPaper.ratePerReam)}`} />
                      <AuditLine label="Weight/Ream" value={`${result.textPaper.weightPerReam.toFixed(1)} kg`} />
                      <AuditLine label="Cover Gross Sheets" value={formatNumber(result.coverPaper.grossSheets)} />
                      <AuditLine label="Cover Reams" value={result.coverPaper.reams.toFixed(2)} />
                    </AuditGroup>
                    <AuditGroup title="Printing">
                      <AuditLine label="Text Impressions/Form" value={formatNumber(result.textPrinting.impressionsPerForm)} />
                      <AuditLine label="Text Total Impressions" value={formatNumber(result.textPrinting.totalImpressions)} />
                      <AuditLine label="Text Machine Hours" value={`${(result.textPrinting.runningHours + result.textPrinting.makereadyHours).toFixed(2)}h (${result.textPrinting.runningHours.toFixed(2)}r + ${result.textPrinting.makereadyHours.toFixed(2)}m)`} />
                      <AuditLine label="Text Rate/1000" value={`₹${result.textPrinting.ratePer1000}`} />
                      <AuditLine label="Text Make-Ready" value={`₹${formatNumber(result.textPrinting.makeReadyCost)}`} />
                      <AuditLine label="Text Plates" value={String(result.textPrinting.totalPlates)} />
                      <AuditLine label="Cover Plates" value={String(result.coverPrinting.totalPlates)} />
                    </AuditGroup>
                    <AuditGroup title="Binding">
                      {Object.entries(result.bindingBreakdown).map(([k, v]) => (
                        <AuditLine key={k} label={k} value={`₹${formatNumber(v)}`} />
                      ))}
                    </AuditGroup>
                    <AuditGroup title="Spine & Weight">
                      <AuditLine label="Spine (text)" value={`${result.spineThickness.toFixed(3)} mm`} />
                      <AuditLine label="Spine (with board)" value={`${result.spineWithBoard.toFixed(3)} mm`} />
                      <AuditLine label="Text Weight" value={`${result.bookWeight.textWeight.toFixed(1)} g`} />
                      <AuditLine label="Cover Weight" value={`${result.bookWeight.coverWeight.toFixed(1)} g`} />
                      <AuditLine label="Board Weight" value={`${result.bookWeight.boardWeight.toFixed(1)} g`} />
                      <AuditLine label="Total Book Weight" value={`${result.bookWeight.totalWeight.toFixed(1)} g`} />
                    </AuditGroup>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <CalcIcon className="w-12 h-12 mx-auto text-text-light-tertiary dark:text-text-dark-tertiary opacity-30 mb-4" />
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                Enter valid inputs to see detailed estimation results.
              </p>
              {allErrors.length > 0 && (
                <p className="text-xs text-danger-600 dark:text-danger-400 mt-2">{allErrors[0]}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
      {icon} {title}
    </h3>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string | React.ReactNode }) {
  return (
    <div>
      <label className="label text-[10px]">{label}</label>
      <input type="text" inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} className="input-field text-sm" />
      {hint && <div className="text-[9px] text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, labels }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labels?: string[];
}) {
  return (
    <div>
      <label className="label text-[10px]">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="input-field text-sm">
        {options.map((opt, i) => (
          <option key={opt} value={opt}>{labels?.[i] ?? opt.replace(/_/g, " ")}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 text-xs"
    >
      <div className={cn(
        "w-7 h-4 rounded-full transition-colors relative",
        checked ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"
      )}>
        <div className={cn(
          "w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform",
          checked ? "translate-x-3.5" : "translate-x-0.5"
        )} />
      </div>
      <span className="text-text-light-secondary dark:text-text-dark-secondary">{label}</span>
    </button>
  );
}

function ToggleOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all text-left",
        checked
          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400"
          : "border-surface-light-border dark:border-surface-dark-border text-text-light-secondary dark:text-text-dark-secondary hover:border-primary-300"
      )}
    >
      <div className={cn(
        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
        checked ? "border-primary-500 bg-primary-500" : "border-gray-300 dark:border-gray-600"
      )}>
        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      {label}
    </button>
  );
}

function HeroCard({ label, value, icon, color, subtitle }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "primary" | "blue" | "amber" | "emerald";
  subtitle?: string;
}) {
  const colorMap = {
    primary: "from-primary-500/10 to-primary-500/5 border-primary-200 dark:border-primary-500/20",
    blue: "from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-500/20",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-500/20",
  };
  const iconColor = {
    primary: "text-primary-600 dark:text-primary-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className={cn("card p-3 bg-gradient-to-br border shadow-none", colorMap[color])}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={iconColor[color]}>{icon}</span>
        <span className="text-[10px] font-medium text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">{value}</div>
      {subtitle && <div className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">{subtitle}</div>}
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-light-secondary dark:bg-surface-dark-secondary p-2 rounded-lg border border-border-light dark:border-border-dark text-center">
      <div className="text-[9px] font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase mb-0.5">{label}</div>
      <div className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary truncate">{value}</div>
    </div>
  );
}

function CostRow({ label, value, detail, bold, accent, dimmed }: {
  label: string; value: number; detail?: string;
  bold?: boolean; accent?: boolean; dimmed?: boolean;
}) {
  if (value === 0 && !bold) return null;
  return (
    <div className="flex justify-between items-start">
      <div className="min-w-0">
        <div className={cn(
          "text-xs",
          bold ? "font-bold text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary",
          dimmed && "opacity-60"
        )}>
          {label}
        </div>
        {detail && <div className="text-[9px] text-text-light-tertiary dark:text-text-dark-tertiary truncate">{detail}</div>}
      </div>
      <div className={cn(
        "text-xs font-bold ml-2",
        accent ? "text-primary-600 dark:text-primary-400" : "text-text-light-primary dark:text-text-dark-primary",
        dimmed && "text-text-light-tertiary"
      )}>
        {formatCurrency(value)}
      </div>
    </div>
  );
}

function WeightItem({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn(
      "p-1.5 rounded-lg",
      highlight ? "bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20" : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark"
    )}>
      <div className="text-[8px] font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase mb-0.5">{label}</div>
      <div className={cn("text-[10px] font-bold", highlight ? "text-primary-600 dark:text-primary-400" : "text-text-light-primary dark:text-text-dark-primary")}>
        {value.toFixed(1)}g
      </div>
    </div>
  );
}

function CompRow({ label, values, bold }: { label: string; values: string[]; bold?: boolean }) {
  return (
    <tr>
      <td className={cn("py-2 pr-3 text-text-light-secondary dark:text-text-dark-secondary font-medium", bold && "font-bold text-text-light-primary dark:text-text-dark-primary")}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={cn("py-2 px-2 text-right text-text-light-primary dark:text-text-dark-primary", bold && "font-bold color-primary-600")}>{v}</td>
      ))}
    </tr>
  );
}

function AuditGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="font-bold text-primary-600 dark:text-primary-400 text-[10px] uppercase border-b border-primary-500/20 pb-0.5 mb-1">{title}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {children}
      </div>
    </div>
  );
}

function AuditLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
      <span className="text-text-light-tertiary dark:text-text-dark-tertiary font-medium">{label}</span>
      <span className="text-text-light-primary dark:text-text-dark-primary font-bold">{value}</span>
    </div>
  );
}
