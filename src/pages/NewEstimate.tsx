import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useAppStore } from "@/stores/appStore";
import { useDataStore } from "@/stores/dataStore";
import { cn } from "@/utils/cn";
import { WIZARD_STEPS } from "@/constants";
import { WizardStepRenderer } from "@/components/wizard/WizardStepRenderer";
import { EstimationResults } from "@/components/results/EstimationResults";
import { calculateFullEstimation } from "@/utils/calculations/estimator";
import { calculateSpineThickness } from "@/utils/calculations/spine";
import { formatNumber } from "@/utils/format";
import { normalizeEstimationForCalculation, validateEstimation } from "@/utils/validation/estimation";
import {
  ChevronLeft, ChevronRight, RotateCcw, Calculator, Save,
  FileText, BookOpen, Layers, Type, Square, BookMarked,
  Sparkles, Package, Truck, Printer, DollarSign, Plus, MessageSquare
} from "lucide-react";

// Step icons mapping
const STEP_ICONS: Record<string, React.ReactNode> = {
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
};

export function NewEstimate() {
  // Store hooks
  const {
    estimation, currentStep, results, isCalculating, showResults,
    setCurrentStep, nextStep, prevStep, resetEstimation,
    setResults, setIsCalculating, setShowResults, loadEstimation,
    updateEstimationField
  } = useEstimationStore();

  const { addNotification, addActivityLog } = useAppStore();
  const { saveDraft, draftEstimation, addJob, jobs } = useDataStore();

  // Local state
  const [savingDraft, setSavingDraft] = useState(false);
  const [message, setMessage] = useState("");
  const lastCalculationRef = useRef<string>("");

  // Live calculations
  const spineThickness = useMemo(() => {
    return calculateSpineThickness({
      textSections: estimation.textSections
        .filter(s => s.enabled)
        .map(s => ({ pages: s.pages, gsm: s.gsm, paperType: s.paperTypeName })),
      endleaves: estimation.endleaves.enabled
        ? { pages: estimation.endleaves.pages, gsm: estimation.endleaves.gsm, paperType: estimation.endleaves.paperTypeName }
        : undefined,
    });
  }, [estimation.textSections, estimation.endleaves]);

  const totalPages = estimation.textSections.reduce((sum, s) => s.enabled ? sum + s.pages : sum, 0);
  const activeQuantities = estimation.quantities.filter(q => q > 0);
  const validationErrors = useMemo(() => validateEstimation(estimation), [estimation]);
  const canCalculate = validationErrors.length === 0 && !isCalculating && activeQuantities.length > 0;

  // Calculate handler
  const handleCalculate = useCallback(() => {
    const calcKey = JSON.stringify({ estimation, activeQuantities });
    if (lastCalculationRef.current === calcKey && results.length > 0) {
      setShowResults(true);
      return;
    }
    lastCalculationRef.current = calcKey;

    if (validationErrors.length > 0) {
      setMessage(validationErrors[0]);
      return;
    }

    setMessage("Calculating...");
    setIsCalculating(true);

    setTimeout(() => {
      try {
        const normalized = normalizeEstimationForCalculation(estimation);
        const calcResults = calculateFullEstimation(normalized);
        
        if (calcResults.length === 0) {
          throw new Error("No valid quantity found");
        }

        setResults(calcResults);
        setShowResults(true);
        setIsCalculating(false);
        setMessage(`Done - ${calcResults.length} quantity variant${calcResults.length > 1 ? "s" : ""}`);

        addNotification({
          type: "success",
          title: "Estimation Complete",
          message: `${calcResults.length} variant${calcResults.length > 1 ? "s" : ""} calculated`,
          category: "estimate",
        });
      } catch (error) {
        setIsCalculating(false);
        setMessage("Calculation failed");
        addNotification({
          type: "error",
          title: "Error",
          message: (error as Error).message,
          category: "system",
        });
      }
    }, 100);
  }, [estimation, activeQuantities, validationErrors, results.length, setResults, setShowResults, setIsCalculating, addNotification]);

  // Save draft handler
  const handleSaveDraft = useCallback(() => {
    setSavingDraft(true);
    setTimeout(() => {
      saveDraft(estimation);

      const existingDraft = jobs.find((j: any) => j.estimationId === estimation.id && j.status === "draft");
      if (!existingDraft) {
        addJob({
          title: estimation.jobTitle || "Untitled Draft",
          customerId: estimation.customerId || "",
          customerName: estimation.customerName || "Unknown",
          estimationId: estimation.id,
          status: "draft",
          quantities: activeQuantities,
          results: [],
          bookSpec: estimation.bookSpec,
          totalValue: 0,
          currency: estimation.pricing.currency,
          assignedTo: estimation.estimatedBy || "User",
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          notes: estimation.notes || "Draft",
          tags: ["draft"],
        });
        
        // Log the draft creation activity
        addActivityLog({
          action: "created_draft",
          category: "estimation",
          description: `Created draft for "${estimation.jobTitle || 'Untitled'}"`,
          user: estimation.estimatedBy || "User",
          entityType: "estimation",
          entityId: estimation.id,
          level: "info",
        });
      } else {
        // Log the draft update activity
        addActivityLog({
          action: "updated_draft",
          category: "estimation",
          description: `Updated draft for "${estimation.jobTitle || 'Untitled'}"`,
          user: estimation.estimatedBy || "User",
          entityType: "estimation",
          entityId: estimation.id,
          level: "info",
        });
      }

      setSavingDraft(false);
      setMessage("Draft saved");
      addNotification({
        type: "success",
        title: "Saved",
        message: "Draft saved successfully",
        category: "job",
      });
    }, 300);
  }, [estimation, activeQuantities, saveDraft, addJob, addNotification, jobs, addActivityLog]);

  // Reset handler
  const handleReset = useCallback(() => {
    if (window.confirm("Reset all data?")) {
      resetEstimation();
      lastCalculationRef.current = "";
      setMessage("");
    }
  }, [resetEstimation]);

  // Load draft on mount
  useEffect(() => {
    if (draftEstimation && !estimation.jobTitle && !showResults && results.length === 0) {
      loadEstimation(draftEstimation);
    }
  }, [draftEstimation, estimation.jobTitle, showResults, results.length, loadEstimation]);

  // Track step changes with updateEstimationField for audit trail
  const previousStepRef = useRef(currentStep);
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      // Log step navigation using updateEstimationField
      const stepKey = `step_${currentStep}_visited_at`;
      updateEstimationField(stepKey, new Date().toISOString());
      previousStepRef.current = currentStep;
    }
  }, [currentStep, updateEstimationField]);

  // Show results
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

  const currentStepData = WIZARD_STEPS[currentStep - 1];
  const progressPercent = Math.round((currentStep / 15) * 100);

  return (
    <div className="flex h-[calc(100vh-112px)]">
      {/* Left Sidebar - Steps */}
      <div className="w-56 shrink-0 overflow-y-auto pr-2 border-r border-surface-light-border dark:border-surface-dark-border">
        <div className="space-y-1">
          {WIZARD_STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isPast = currentStep > step.id;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all",
                  isActive && "bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 font-semibold",
                  !isActive && isPast && "text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary",
                  !isActive && !isPast && "text-text-light-tertiary dark:text-text-dark-tertiary"
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded flex items-center justify-center text-xs font-bold",
                  isActive && "bg-primary-600 text-white",
                  isPast && "bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400",
                  !isActive && !isPast && "bg-surface-light-tertiary dark:bg-surface-dark-tertiary"
                )}>
                  {isPast ? "✓" : step.id}
                </span>
                <span className="truncate">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4 px-2">
          <div className="flex justify-between text-xs text-text-light-tertiary mb-1">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-1.5 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-full">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Center - Content */}
      <div className="flex-1 flex flex-col min-w-0 px-6">
        {/* Header */}
        <div className="py-4 border-b border-surface-light-border dark:border-surface-dark-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-500/20">
              {STEP_ICONS[currentStepData?.icon] || <FileText className="w-5 h-5 text-primary-600" />}
            </div>
            <div>
              <h2 className="text-xl font-bold">Step {currentStep}: {currentStepData?.title}</h2>
              <p className="text-sm text-text-light-secondary">{currentStepData?.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto py-4">
          <WizardStepRenderer step={currentStep} />
        </div>

        {/* Footer Actions */}
        <div className="py-4 border-t border-surface-light-border dark:border-surface-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm rounded-lg border border-surface-light-border dark:border-surface-dark-border hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            {message && (
              <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary ml-2">
                {message}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevStep}
              disabled={currentStep <= 1}
              className="px-4 py-2 text-sm rounded-lg border border-surface-light-border dark:border-surface-dark-border hover:bg-surface-light-tertiary disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="px-4 py-2 text-sm rounded-lg border border-surface-light-border dark:border-surface-dark-border hover:bg-surface-light-tertiary disabled:opacity-40 flex items-center gap-1"
            >
              <Save className="w-4 h-4" />
              {savingDraft ? "Saving..." : "Save"}
            </button>

            {currentStep === 15 ? (
              <button
                onClick={handleCalculate}
                disabled={!canCalculate}
                className="px-6 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex items-center gap-2 font-medium"
              >
                <Calculator className="w-4 h-4" />
                {isCalculating ? "Calculating..." : "Create Estimate"}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={currentStep >= 15}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar - Preview */}
      <div className="w-64 shrink-0 overflow-y-auto pl-4">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-xs font-semibold text-red-700 dark:text-red-400">Issues Found</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">{validationErrors[0]}</p>
          </div>
        )}

        {/* Book Preview */}
        <div className="card p-4 mb-4">
          <h4 className="text-xs font-semibold text-text-light-tertiary uppercase mb-3">Book Preview</h4>
          
          <div className="flex justify-center py-4">
            <div className="relative">
              <div
                className="bg-gradient-to-br from-primary-400 to-primary-600 rounded-r-md rounded-l-sm"
                style={{
                  width: `${Math.min(Math.max(estimation.bookSpec.widthMM * 0.5, 40), 100)}px`,
                  height: `${Math.min(Math.max(estimation.bookSpec.heightMM * 0.5, 50), 130)}px`,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white text-center">
                  <div>
                    <div className="text-[8px] opacity-80">{estimation.bookSpec.widthMM}×{estimation.bookSpec.heightMM}</div>
                    <div className="text-[7px] opacity-60">mm</div>
                  </div>
                </div>
              </div>
              {spineThickness > 0 && (
                <div
                  className="absolute top-0 left-0 bg-primary-800 rounded-l-sm"
                  style={{ width: `${Math.max(spineThickness * 0.6, 2)}px`, height: "100%" }}
                />
              )}
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-text-light-tertiary">Title</span>
              <span className="font-medium truncate max-w-[100px]">{estimation.jobTitle || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-tertiary">Size</span>
              <span className="font-medium">{estimation.bookSpec.widthMM}×{estimation.bookSpec.heightMM}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-tertiary">Pages</span>
              <span className="font-medium">{totalPages}pp</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-tertiary">Spine</span>
              <span className="font-medium text-primary-600">{spineThickness.toFixed(2)}mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-tertiary">Qty</span>
              <span className="font-medium">{activeQuantities.length > 0 ? activeQuantities.map(q => formatNumber(q)).join(", ") : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-tertiary">Binding</span>
              <span className="font-medium capitalize">{estimation.binding.primaryBinding.replace(/_/g, " ")}</span>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="card p-4">
          <h4 className="text-xs font-semibold text-text-light-tertiary uppercase mb-3">Sections</h4>
          <div className="space-y-2">
            {[
              { name: "Text 1", pages: estimation.textSections[0]?.pages || 0, enabled: estimation.textSections[0]?.enabled },
              { name: "Text 2", pages: estimation.textSections[1]?.pages || 0, enabled: estimation.textSections[1]?.enabled },
              { name: "Cover", pages: estimation.cover.enabled ? estimation.cover.pages : 0, enabled: estimation.cover.enabled },
              { name: "Jacket", pages: estimation.jacket.enabled ? 2 : 0, enabled: estimation.jacket.enabled },
              { name: "Endleaves", pages: estimation.endleaves.enabled ? estimation.endleaves.pages : 0, enabled: estimation.endleaves.enabled },
            ].map((sec) => (
              <div key={sec.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", sec.enabled ? "bg-green-500" : "bg-gray-300")} />
                  <span className={sec.enabled ? "" : "line-through text-text-light-tertiary"}>{sec.name}</span>
                </div>
                <span className="text-text-light-tertiary">{sec.enabled ? `${sec.pages}pp` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

