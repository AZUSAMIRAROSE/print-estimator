import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  History,
  Keyboard,
  Layers,
  Package,
  RefreshCcw,
  Ruler,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  Zap,
} from "lucide-react";
import { WizardShell } from "@/components/wizard/v2";
import { buildCanonicalDataSources } from "@/domain/estimation/adapters/v2Workflow";
import { useWizardStore, useStepName } from "@/domain/estimation/wizardStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { cn } from "@/utils/cn";

const STEP_NAMES = [
  "Basic Info", "Book Spec", "Text", "Cover", "Jacket",
  "Endleaves", "Binding", "Finishing", "Packing", "Delivery",
  "Pre-Press", "Pricing", "Additional", "Notes", "Review",
];

function NewEstimateV2() {
  const navigate = useNavigate();
  const {
    estimation,
    currentStep,
    resetToDefault,
    setDataSources,
    showLivePreview,
    toggleLivePreview,
    isPlanning,
    planError,
    planningTime_ms,
    runAutoPlanning,
    getMetaStats,
    getLowConfidenceFields,
    plans,
    activePlanQuantity,
    goToStep,
  } = useWizardStore();
  const { addNotification } = useAppStore();
  const { saveDraft } = useDataStore();
  const inventory = useInventoryStore((state) => state.items || []);
  const rateCard = useRateCardStore((state) => state.paperRates || []);

  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const wizardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dataSources = useMemo(
    () => buildCanonicalDataSources(inventory, rateCard),
    [inventory, rateCard],
  );

  const activeQuantities = estimation.book.quantities.filter((quantity) => quantity > 0);
  const enabledSections = estimation.sections.filter((section) => section.enabled);
  const stepName = useStepName(currentStep);
  const metaStats = getMetaStats();
  const hasPlan = activePlanQuantity !== null && plans.size > 0;

  // ── Comprehensive completion scoring across all 15 wizard areas ──
  const completionPercent = useMemo(() => {
    let score = 0;
    const weights = {
      jobTitle: 8, customerName: 7, quantities: 12, sections: 10,
      trimSize: 8, binding: 8, pricing: 8, delivery: 6,
      finishing: 5, packing: 5, prePress: 4, notes: 3,
      plan: 8, cover: 4, additional: 4,
    };
    if (estimation.jobTitle && estimation.jobTitle !== "Untitled Job") score += weights.jobTitle;
    if (estimation.customerName && estimation.customerName !== "—") score += weights.customerName;
    if (activeQuantities.length > 0) score += weights.quantities;
    if (enabledSections.length > 0) score += weights.sections;
    if (estimation.book.trimSize.width > 0 && estimation.book.trimSize.height > 0) score += weights.trimSize;
    if (estimation.binding?.method) score += weights.binding;
    if (estimation.pricing?.marginPercent > 0) score += weights.pricing;
    if (estimation.delivery?.destinationCountry) score += weights.delivery;
    if (Object.keys(estimation.finishing || {}).length > 0) score += weights.finishing;
    if (estimation.packing?.cartonType) score += weights.packing;
    if ((estimation.prePress?.epsonProofs ?? 0) > 0 || (estimation.prePress?.designCharges ?? 0) > 0) score += weights.prePress;
    if (estimation.notes && estimation.notes.trim().length > 0) score += weights.notes;
    if (hasPlan) score += weights.plan;
    const coverSection = estimation.sections.find(s => s.type === "COVER" && s.enabled);
    if (coverSection) score += weights.cover;
    if ((estimation.additionalCosts?.length ?? 0) > 0) score += weights.additional;
    return Math.min(100, score);
  }, [estimation, activeQuantities.length, enabledSections.length, hasPlan]);

  // Scroll wizard into view on step change
  useEffect(() => {
    wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

  useEffect(() => {
    setDataSources(dataSources.inventory, dataSources.rateCard);
  }, [dataSources.inventory, dataSources.rateCard, setDataSources]);

  const handleAutoPlanning = useCallback(async () => {
    if (activeQuantities.length === 0) {
      addNotification({
        type: "warning",
        title: "No Active Quantities",
        message: "Add at least one non-zero quantity in Book Specification before auto-planning.",
        category: "estimate",
      });
      return;
    }
    await runAutoPlanning(dataSources.inventory, dataSources.rateCard);
    addNotification({
      type: "success",
      title: "Auto-Planning Complete",
      message: "Paper, imposition, and machine selections have been optimized.",
      category: "estimate",
    });
  }, [activeQuantities.length, addNotification, dataSources, runAutoPlanning]);

  const handleReset = useCallback(() => {
    resetToDefault();
    setShowConfirmReset(false);
    addNotification({
      type: "info",
      title: "Estimation Reset",
      message: "All fields have been cleared to defaults. Ready for a new estimate.",
      category: "estimate",
    });
  }, [addNotification, resetToDefault]);

  const handleSaveDraft = useCallback(() => {
    saveDraft(estimation as any);
    addNotification({
      type: "success",
      title: "Draft Saved",
      message: "Current estimation state saved as draft. You can resume later.",
      category: "estimate",
    });
  }, [addNotification, estimation, saveDraft]);

  const handleExportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(estimation, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${estimation.jobTitle || "estimation"}_v2.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification({
      type: "success",
      title: "Exported",
      message: "Estimation data exported as JSON file.",
      category: "estimate",
    });
  }, [addNotification, estimation]);

  const handleImportJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data && typeof data === "object" && data.book) {
          const store = useWizardStore.getState();
          store.setEstimationField("jobTitle", data.jobTitle || "Imported Job");
          store.setEstimationField("customerName", data.customerName || "—");
          if (data.book) {
            store.setEstimationField("book", data.book);
          }
          if (data.sections) {
            store.setEstimationField("sections", data.sections);
          }
          if (data.binding) store.setEstimationField("binding", data.binding);
          if (data.pricing) store.setEstimationField("pricing", data.pricing);
          if (data.finishing) store.setEstimationField("finishing", data.finishing);
          if (data.packing) store.setEstimationField("packing", data.packing);
          if (data.delivery) store.setEstimationField("delivery", data.delivery);
          if (data.prePress) store.setEstimationField("prePress", data.prePress);
          if (data.notes) store.setEstimationField("notes", data.notes);
          addNotification({
            type: "success",
            title: "Import Successful",
            message: `Loaded estimation for "${data.jobTitle || 'Imported Job'}" from JSON.`,
            category: "estimate",
          });
        } else {
          throw new Error("Invalid estimation JSON structure");
        }
      } catch (err) {
        addNotification({
          type: "error",
          title: "Import Failed",
          message: err instanceof Error ? err.message : "Invalid JSON file.",
          category: "estimate",
        });
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be re-imported
    e.target.value = "";
  }, [addNotification]);

  const handleCopyEstimationId = useCallback(() => {
    navigator.clipboard?.writeText(estimation.id).then(() => {
      addNotification({
        type: "info",
        title: "ID Copied",
        message: `Estimation ID ${estimation.id} copied to clipboard.`,
        category: "system",
      });
    });
  }, [addNotification, estimation.id]);

  const totalPages = useMemo(() => {
    return estimation.sections
      .filter((s) => s.enabled)
      .reduce((sum, s) => sum + (s.pages || 0), 0);
  }, [estimation.sections]);

  return (
    <div className="min-h-[calc(100vh-8rem)] -m-3 sm:-m-4 md:-m-6 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_45%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]">
      {/* Hidden file input for JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImportJSON}
        className="hidden"
        aria-hidden="true"
      />

      <div className="mx-auto flex min-h-full max-w-[1800px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── HERO HEADER ── */}
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="space-y-5">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <ShieldCheck className="h-3 w-3" />
                  V2 Engine
                </div>
                {hasPlan && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:border-blue-900/80 dark:bg-blue-950/60 dark:text-blue-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Plan Active
                  </div>
                )}
                {isPlanning && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700 animate-pulse dark:border-amber-900/80 dark:bg-amber-950/60 dark:text-amber-300">
                    <Activity className="h-3 w-3 animate-spin" />
                    Planning...
                  </div>
                )}
                {planningTime_ms !== null && (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <Clock className="h-3 w-3" />
                    {planningTime_ms}ms
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleCopyEstimationId}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[9px] font-mono text-slate-400 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500 dark:hover:bg-slate-800"
                  title="Copy estimation ID"
                >
                  <Copy className="h-2.5 w-2.5" />
                  {estimation.id.slice(0, 12)}…
                </button>
              </div>

              {/* Title block */}
              <div className="space-y-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
                  {estimation.jobTitle && estimation.jobTitle !== "Untitled Job"
                    ? estimation.jobTitle
                    : "Precision Estimation Control Room"}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  {estimation.customerName && estimation.customerName !== "—"
                    ? `Estimating for ${estimation.customerName} — `
                    : ""}
                  Typed planning data, live inventory feeds, and canonical calculation engine.
                  Step <span className="font-bold text-slate-900 dark:text-white">{currentStep + 1}/15</span>
                  {" · "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stepName}</span>
                </p>
              </div>

              {/* ── Step Indicator Timeline ── */}
              <div className="flex items-center gap-0.5 overflow-x-auto pb-1">
                {STEP_NAMES.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goToStep(i)}
                    title={`${i + 1}. ${name}`}
                    className={cn(
                      "group relative flex-shrink-0 rounded-lg px-1.5 py-1 text-[9px] font-semibold transition-all",
                      i === currentStep
                        ? "bg-emerald-600 text-white shadow-sm scale-105"
                        : i < currentStep
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/80"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-slate-700",
                    )}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">
                    Estimation Completeness
                  </span>
                  <span className={cn(
                    "font-black tabular-nums",
                    completionPercent >= 80 ? "text-emerald-600 dark:text-emerald-400"
                      : completionPercent >= 50 ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-500 dark:text-slate-400"
                  )}>
                    {completionPercent}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      completionPercent >= 80 ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400"
                        : completionPercent >= 50 ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400"
                        : "bg-gradient-to-r from-slate-400 to-slate-300"
                    )}
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
              </div>

              {/* Live metrics strip */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="Quantity Tiers"
                  value={activeQuantities.length.toString()}
                  detail={activeQuantities.length > 0 ? activeQuantities.map(q => q.toLocaleString()).join(", ") : "No active tiers"}
                  icon={<Package className="h-4 w-4" />}
                />
                <MetricCard
                  label="Sections"
                  value={enabledSections.length.toString()}
                  detail={enabledSections.map((s) => s.label).join(", ") || "None enabled"}
                  icon={<Layers className="h-4 w-4" />}
                />
                <MetricCard
                  label="Total Pages"
                  value={totalPages.toString()}
                  detail={`${estimation.book.trimSize.width}×${estimation.book.trimSize.height}mm trim`}
                  icon={<BookOpen className="h-4 w-4" />}
                />
                <MetricCard
                  label="Paper Pool"
                  value={dataSources.inventory.length.toString()}
                  detail={`${dataSources.rateCard.length} rate-card entries`}
                  icon={<Ruler className="h-4 w-4" />}
                />
                <MetricCard
                  label="Confidence"
                  value={metaStats.totalFields > 0 ? `${(metaStats.averageConfidence * 100).toFixed(0)}%` : "—"}
                  detail={metaStats.totalFields > 0
                    ? `${metaStats.autoPlannedFields} auto · ${metaStats.userOverrideFields} manual`
                    : "Run auto-plan to generate"}
                  icon={<Target className="h-4 w-4" />}
                  accent={metaStats.lowConfidenceFields > 0 ? "warning" : undefined}
                />
              </div>
            </div>

            {/* Action buttons stack */}
            <div className="flex flex-row flex-wrap items-center gap-2.5 lg:flex-col lg:items-stretch lg:gap-2.5">
              <button
                type="button"
                onClick={handleAutoPlanning}
                disabled={isPlanning || activeQuantities.length === 0}
                className={cn(
                  "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-all",
                  isPlanning
                    ? "cursor-wait bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] dark:from-emerald-500 dark:to-teal-500"
                )}
              >
                <Brain className={cn("h-4 w-4", isPlanning && "animate-spin")} />
                {isPlanning ? "Planning..." : "Auto-Plan"}
              </button>

              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center gap-2 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-950/60"
              >
                <Save className="h-4 w-4" />
                Save Draft
              </button>

              <button
                type="button"
                onClick={toggleLivePreview}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                {showLivePreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showLivePreview ? "Hide Preview" : "Show Preview"}
              </button>

              <button
                type="button"
                onClick={handleExportJSON}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" />
                Import JSON
              </button>

              <button
                type="button"
                onClick={() => navigate("/quotations")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Quotations
              </button>

              <button
                type="button"
                onClick={() => goToStep(14)}
                className="inline-flex items-center gap-2 rounded-2xl border border-purple-300 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-950/60"
              >
                <Zap className="h-4 w-4" />
                Jump to Review
              </button>

              {showConfirmReset ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-500"
                  >
                    Confirm Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Error banner */}
          {planError && (
            <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <span className="font-bold">Planning Error:</span> {planError}
            </div>
          )}

          {/* Low confidence warning */}
          {metaStats.lowConfidenceFields > 0 && (
            <div className="border-t border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              <Sparkles className="mr-1.5 inline h-4 w-4" />
              <span className="font-bold">{metaStats.lowConfidenceFields}</span> field(s) have low confidence scores.
              Consider reviewing or overriding them in the wizard.
            </div>
          )}
        </section>

        {/* ── WIZARD SHELL ── */}
        <section
          ref={wizardRef}
          className="min-h-[900px] rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_35px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80"
        >
          <div className="h-full p-2 sm:p-3 md:p-4">
            <WizardShell />
          </div>
        </section>

        {/* ── Keyboard shortcut hint ── */}
        <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-slate-400 dark:text-slate-600">
          <Keyboard className="h-3 w-3" />
          <span>Ctrl+S Save · Ctrl+N New Estimate · Ctrl+K Search</span>
        </div>
      </div>
    </div>
  );
}

// ── Metric Card sub-component ──
function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  accent?: "warning";
}) {
  return (
    <div className={cn(
      "group rounded-2xl border p-4 transition-all duration-200 hover:shadow-md",
      accent === "warning"
        ? "border-amber-200 bg-amber-50/80 hover:border-amber-300 dark:border-amber-900/60 dark:bg-amber-950/30 dark:hover:border-amber-800"
        : "border-slate-200 bg-slate-50/90 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <div className={cn(
          "text-slate-400 transition-transform group-hover:scale-110 dark:text-slate-500",
          accent === "warning" && "text-amber-500 dark:text-amber-400"
        )}>
          {icon}
        </div>
      </div>
      <p className={cn(
        "mt-2 text-2xl font-black tabular-nums",
        accent === "warning"
          ? "text-amber-700 dark:text-amber-300"
          : "text-slate-900 dark:text-white"
      )}>
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400 line-clamp-2">
        {detail}
      </p>
    </div>
  );
}

export default NewEstimateV2;
