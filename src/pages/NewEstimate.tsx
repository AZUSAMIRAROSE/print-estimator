import { useState, useCallback, useMemo, useEffect } from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { WIZARD_STEPS } from "@/constants";
import { WizardStepRenderer } from "@/components/wizard/WizardStepRenderer";
import { EstimationResults } from "@/components/results/EstimationResults";
import { calculateFullEstimation } from "@/utils/calculations/estimator";
import { calculateSpineThickness } from "@/utils/calculations/spine";
import { formatNumber } from "@/utils/format";
import { normalizeEstimationForCalculation, validateEstimation } from "@/utils/validation/estimation";
import { useDataStore } from "@/stores/dataStore";
import {
  ChevronLeft, ChevronRight, RotateCcw, Calculator, Save,
  FileText, CheckCircle, AlertCircle, BookOpen, Layers,
  Type, Square, BookMarked, Sparkles, Package, Truck,
  Printer, DollarSign, Plus, MessageSquare, Eye
} from "lucide-react";

const STEP_ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-4 h-4" />,
  Book: <BookOpen className="w-4 h-4" />,
  Type: <Type className="w-4 h-4" />,
  Square: <Square className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  BookMarked: <BookMarked className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Package: <Package className="w-4 h-4" />,
  Truck: <Truck className="w-4 h-4" />,
  Printer: <Printer className="w-4 h-4" />,
  DollarSign: <DollarSign className="w-4 h-4" />,
  Plus: <Plus className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  CheckCircle: <CheckCircle className="w-4 h-4" />,
};

export function NewEstimate() {
  const {
    estimation, currentStep, results, isCalculating, showResults,
    setCurrentStep, nextStep, prevStep, resetEstimation,
    setResults, setIsCalculating, setShowResults, loadEstimation
  } = useEstimationStore();
  const { addNotification, addActivityLog } = useAppStore();
  const { saveDraft, draftEstimation } = useDataStore();

  const [savingDraft, setSavingDraft] = useState(false);
  const [calculationMessage, setCalculationMessage] = useState("");

  // Live spine calculation
  const spineThickness = calculateSpineThickness({
    textSections: estimation.textSections
      .filter(s => s.enabled)
      .map(s => ({ pages: s.pages, gsm: s.gsm, paperType: s.paperTypeName })),
    endleaves: estimation.endleaves.enabled
      ? { pages: estimation.endleaves.pages, gsm: estimation.endleaves.gsm, paperType: estimation.endleaves.paperTypeName }
      : undefined,
  });

  const totalPages = estimation.textSections.reduce((sum, s) => s.enabled ? sum + s.pages : sum, 0);
  const activeQuantities = estimation.quantities.filter(q => q > 0);
  const validationErrors = useMemo(() => validateEstimation(estimation), [estimation]);
  const canCalculate = validationErrors.length === 0 && !isCalculating;

  const handleCalculate = useCallback(() => {
    if (results.length > 0 && !window.confirm("Recalculate and overwrite existing results?")) {
      return;
    }

    if (validationErrors.length > 0) {
      const message = validationErrors[0];
      setCalculationMessage(message);
      addNotification({
        type: "error",
        title: "Validation Error",
        message,
        category: "estimate",
      });
      return;
    }

    setCalculationMessage("Calculation in progress...");
    setIsCalculating(true);

    // Run calculation in a setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const normalizedEstimation = normalizeEstimationForCalculation(estimation);
        const calcResults = calculateFullEstimation(normalizedEstimation);
        if (calcResults.length === 0) {
          throw new Error("No valid quantity found for calculation.");
        }

        setResults(calcResults);
        setShowResults(true);
        setIsCalculating(false);
        setCalculationMessage(`Calculation complete for ${calcResults.length} quantity variant${calcResults.length > 1 ? "s" : ""}.`);

        addNotification({
          type: "success",
          title: "Estimation Complete",
          message: `Calculated ${calcResults.length} quantity variant${calcResults.length > 1 ? "s" : ""} for "${estimation.jobTitle || "Untitled"}"`,
          category: "estimate",
        });

        addActivityLog({
          action: "ESTIMATE_CALCULATED",
          category: "estimation",
          description: `Estimation calculated for "${estimation.jobTitle}" — ${activeQuantities.join(", ")} copies`,
          user: "Current User",
          entityType: "estimation",
          entityId: estimation.id,
          level: "info",
        });
      } catch (error) {
        setIsCalculating(false);
        setCalculationMessage("Calculation failed. Please check inputs and try again.");
        addNotification({
          type: "error",
          title: "Calculation Error",
          message: `Failed to calculate estimation: ${(error as Error).message}`,
          category: "system",
        });

        addActivityLog({
          action: "ESTIMATE_ERROR",
          category: "estimation",
          description: `Calculation error: ${(error as Error).message}`,
          user: "Current User",
          entityType: "estimation",
          entityId: estimation.id,
          level: "error",
        });
      }
    }, 100);
  }, [estimation, setResults, setShowResults, setIsCalculating, addNotification, addActivityLog, activeQuantities, validationErrors]);

  const handleSaveDraft = useCallback(() => {
    setSavingDraft(true);
    setTimeout(() => {
      saveDraft(estimation);
      setSavingDraft(false);
      addNotification({
        type: "success",
        title: "Draft Saved",
        message: `"${estimation.jobTitle || "Untitled"}" has been saved as a draft.`,
        category: "job",
      });
      addActivityLog({
        action: "DRAFT_SAVED",
        category: "job",
        description: `Draft saved: "${estimation.jobTitle}"`,
        user: "Current User",
        entityType: "job",
        entityId: estimation.id,
        level: "info",
      });
    }, 500);
  }, [estimation, addNotification, addActivityLog, saveDraft]);

  useEffect(() => {
    if (draftEstimation && !estimation.jobTitle && !showResults && results.length === 0) {
      loadEstimation(draftEstimation);
      addNotification({
        type: "info",
        title: "Draft Restored",
        message: "Unsaved draft restored from local storage.",
        category: "estimate",
      });
    }
  }, [draftEstimation, estimation.jobTitle, showResults, results.length, addNotification, loadEstimation]);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset this estimation? All data will be lost.")) {
      resetEstimation();
      addActivityLog({
        action: "ESTIMATE_RESET",
        category: "estimation",
        description: "Estimation wizard reset",
        user: "Current User",
        entityType: "estimation",
        entityId: "",
        level: "info",
      });
    }
  };

  // Show results page
  if (showResults && results.length > 0) {
    return (
      <EstimationResults
        estimation={estimation}
        results={results}
        spineThickness={spineThickness}
        onBackToWizard={() => setShowResults(false)}
      />
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-112px)] animate-in">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {calculationMessage}
      </div>
      {/* Left: Step Navigation */}
      <div className="w-56 shrink-0 overflow-y-auto pr-1">
        <div className="space-y-1">
          {WIZARD_STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isPast = currentStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm group",
                  isActive
                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold shadow-sm border border-primary-200 dark:border-primary-500/30"
                    : isPast
                      ? "text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"
                      : "text-text-light-tertiary dark:text-text-dark-tertiary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors",
                  isActive
                    ? "bg-primary-600 text-white"
                    : isPast
                      ? "bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400"
                      : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-tertiary dark:text-text-dark-tertiary"
                )}>
                  {isPast ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate leading-tight">{step.title}</p>
                  {isActive && (
                    <p className="text-[10px] text-primary-500 dark:text-primary-400 truncate mt-0.5">
                      {step.subtitle}
                    </p>
                  )}
                </div>
                {step.isOptional && (
                  <span className="text-[9px] font-medium text-text-light-tertiary dark:text-text-dark-tertiary bg-surface-light-tertiary dark:bg-surface-dark-tertiary px-1.5 py-0.5 rounded-full shrink-0">
                    OPT
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-4 px-3">
          <div className="flex items-center justify-between text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-1.5">
            <span>Progress</span>
            <span>{Math.round((currentStep / 15) * 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-full">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / 15) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Center: Step Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Step Header */}
        <div className="flex items-center justify-between mb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-500/10">
              {STEP_ICON_MAP[WIZARD_STEPS[currentStep - 1]?.icon] || <FileText className="w-4 h-4 text-primary-600" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">
                Step {currentStep}: {WIZARD_STEPS[currentStep - 1]?.title}
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {WIZARD_STEPS[currentStep - 1]?.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto pb-4 pr-1">
          <WizardStepRenderer step={currentStep} />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-light-border dark:border-surface-dark-border shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep <= 1}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button onClick={handleReset} className="btn-ghost text-sm flex items-center gap-1.5" title="Reset">
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {savingDraft ? "Saving..." : "Save Draft"}
            </button>

            {currentStep === 15 ? (
              <button
                onClick={handleCalculate}
                disabled={!canCalculate}
                className="btn-primary flex items-center gap-2 px-6"
              >
                <Calculator className="w-4 h-4" />
                {isCalculating ? "Calculating..." : "Create Estimate"}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={currentStep >= 15}
                className="btn-primary flex items-center gap-1.5"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Live Preview Panel */}
      <div className="w-64 shrink-0 space-y-4 overflow-y-auto pl-1">
        {validationErrors.length > 0 && (
          <div className="card p-3 border-danger-500/30 bg-danger-50 dark:bg-danger-500/10" role="alert" aria-live="assertive">
            <p className="text-xs font-semibold text-danger-700 dark:text-danger-400">Validation</p>
            <p className="text-xs text-danger-700 dark:text-danger-400 mt-1">{validationErrors[0]}</p>
          </div>
        )}
        {/* Live Spec Preview */}
        <div className="card p-4 space-y-3">
          <h4 className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">
            Live Preview
          </h4>

          {/* Book Visual */}
          <div className="flex items-center justify-center py-3">
            <div className="relative" title={`${estimation.bookSpec.widthMM} × ${estimation.bookSpec.heightMM} mm`}>
              <div
                className="bg-gradient-to-br from-primary-400 to-primary-600 rounded-r-md rounded-l-sm shadow-lg flex items-center justify-center"
                style={{
                  width: `${Math.min(Math.max(estimation.bookSpec.widthMM * 0.55, 50), 120)}px`,
                  height: `${Math.min(Math.max(estimation.bookSpec.heightMM * 0.55, 60), 150)}px`,
                }}
              >
                <div className="text-white text-center px-2">
                  <p className="text-[9px] font-medium opacity-80">{estimation.bookSpec.widthMM}×{estimation.bookSpec.heightMM}</p>
                  <p className="text-[8px] opacity-60">mm</p>
                </div>
              </div>
              {/* Spine */}
              {spineThickness > 0 && (
                <div
                  className="absolute top-0 left-0 bg-primary-700 rounded-l-sm"
                  style={{
                    width: `${Math.max(spineThickness * 0.8, 3)}px`,
                    height: "100%",
                  }}
                  title={`Spine: ${spineThickness.toFixed(2)}mm`}
                />
              )}
            </div>
          </div>

          {/* Spec Details */}
          <div className="space-y-2 text-xs">
            <SpecRow label="Title" value={estimation.jobTitle || "—"} />
            <SpecRow label="Size" value={`${estimation.bookSpec.widthMM}×${estimation.bookSpec.heightMM}mm`} />
            <SpecRow label="Pages" value={`${totalPages}pp`} />
            <SpecRow label="Spine" value={`${spineThickness.toFixed(2)}mm`} highlight />
            <SpecRow label="Quantities" value={activeQuantities.length > 0 ? activeQuantities.map(q => formatNumber(q)).join(", ") : "—"} />
            <SpecRow label="Binding" value={estimation.binding.primaryBinding.replace(/_/g, " ")} />
            <SpecRow label="Currency" value={estimation.pricing.currency} />
            <SpecRow label="Margin" value={`${estimation.pricing.marginPercent}%`} />
          </div>
        </div>

        {/* Live Cost Preview (if we have enough data) */}
        {totalPages > 0 && activeQuantities.length > 0 && (
          <div className="card p-4 space-y-2">
            <h4 className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider">
              Quick Cost Preview
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Text Paper</span>
                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {estimation.textSections[0]?.gsm || "—"}gsm {estimation.textSections[0]?.paperTypeName?.split(" ")[0] || ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Cover</span>
                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {estimation.cover.gsm}gsm {estimation.cover.paperTypeName?.split(" ")[0] || ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Machine</span>
                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {estimation.textSections[0]?.machineName || "—"}
                </span>
              </div>
              {estimation.finishing.coverLamination.enabled && (
                <div className="flex justify-between">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">Lamination</span>
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary capitalize">
                    {estimation.finishing.coverLamination.type}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">Destination</span>
                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {estimation.delivery.destinationName || "—"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sections Summary */}
        <div className="card p-4">
          <h4 className="text-xs font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-2">
            Sections Included
          </h4>
          <div className="space-y-1.5">
            {[
              { label: "Text 1", active: estimation.textSections[0]?.enabled, detail: `${estimation.textSections[0]?.pages}pp` },
              { label: "Text 2", active: estimation.textSections[1]?.enabled, detail: estimation.textSections[1]?.enabled ? `${estimation.textSections[1]?.pages}pp` : "" },
              { label: "Cover", active: estimation.cover.enabled, detail: `${estimation.cover.gsm}gsm` },
              { label: "Jacket", active: estimation.jacket.enabled, detail: estimation.jacket.enabled ? `${estimation.jacket.gsm}gsm` : "" },
              { label: "Endleaves", active: estimation.endleaves.enabled, detail: estimation.endleaves.enabled ? estimation.endleaves.type : "" },
            ].map((sec) => (
              <div key={sec.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    sec.active ? "bg-success-500" : "bg-gray-300 dark:bg-gray-600"
                  )} />
                  <span className={cn(
                    sec.active
                      ? "text-text-light-primary dark:text-text-dark-primary"
                      : "text-text-light-tertiary dark:text-text-dark-tertiary line-through"
                  )}>
                    {sec.label}
                  </span>
                </div>
                {sec.active && sec.detail && (
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{sec.detail}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{label}</span>
      <span className={cn(
        "font-medium capitalize truncate max-w-[120px] text-right",
        highlight
          ? "text-primary-600 dark:text-primary-400"
          : "text-text-light-primary dark:text-text-dark-primary"
      )}>
        {value}
      </span>
    </div>
  );
}
