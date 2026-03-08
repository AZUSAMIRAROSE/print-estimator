// ============================================================================
// STEP NAVIGATION — Step dots + prev/next + step name
// ============================================================================

import React from "react";
import { useWizardStore, useStepName, useStepValid } from "@/domain/estimation/wizardStore";
import { cn } from "@/utils/cn";

const TOTAL_STEPS = 15;

const STEP_NAMES = [
  "Basic Info",
  "Book Specification",
  "Text Sections",
  "Cover",
  "Jacket",
  "Endleaves",
  "Binding",
  "Finishing",
  "Packing",
  "Delivery",
  "Pre-Press",
  "Pricing",
  "Additional",
  "Notes",
  "Review & Create",
];

export function StepNavigation() {
  const { currentStep, goToStep } = useWizardStore();
  const stepName = useStepName(currentStep);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Step dots - smaller on mobile */}
      <div className="flex items-center justify-center gap-0.5 sm:gap-1 flex-wrap">
        {STEP_NAMES.map((name, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goToStep(i)}
            className={cn(
              "rounded-full transition-all flex-shrink-0",
              "w-1.5 h-1.5 sm:w-2.5 sm:h-2.5", // Smaller on mobile
              i === currentStep
                ? "bg-blue-600 scale-125 sm:scale-125"
                : i < currentStep
                  ? "bg-blue-400 hover:bg-blue-500"
                  : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400",
            )}
            title={name}
          />
        ))}
      </div>

      {/* Header - responsive text sizes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Step {currentStep + 1} of {TOTAL_STEPS}
          </p>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {stepName}
          </h2>
        </div>
      </div>
    </div>
  );
}

export function StepButtons() {
  const { currentStep, estimation, nextStep, prevStep, isPlanning, runAutoPlanning, inventory, rateCard } = useWizardStore();
  const isValid = useStepValid(currentStep, estimation);
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOTAL_STEPS - 1;

  const handleNext = () => {
    if (currentStep === 1 && !isPlanning) {
      // Auto-plan when leaving book spec step
      runAutoPlanning(inventory as any, rateCard as any);
    }
    nextStep();
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 pt-3 sm:pt-4 md:pt-6 mt-3 sm:mt-4 md:mt-6 border-t dark:border-gray-700">
      <button
        type="button"
        onClick={prevStep}
        disabled={isFirst}
        className={cn(
          "px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors min-h-[44px] sm:min-h-auto flex items-center justify-center",
          isFirst
            ? "text-gray-400 cursor-not-allowed bg-gray-100 dark:bg-gray-800"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
        )}
      >
        ← Previous
      </button>

      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
        {currentStep >= 1 && currentStep <= 2 && (
          <button
            type="button"
            onClick={() => runAutoPlanning(inventory as any, rateCard as any)}
            disabled={isPlanning}
            className="flex-1 sm:flex-none px-3 py-2.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 disabled:opacity-50 transition-colors min-h-[44px] sm:min-h-auto flex items-center justify-center"
          >
            {isPlanning ? "Planning..." : "⚡ Auto-Plan"}
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          disabled={!isValid || isPlanning}
          className={cn(
            "flex-1 sm:flex-none px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors min-h-[44px] sm:min-h-auto flex items-center justify-center",
            isLast
              ? "bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
              : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
            (!isValid || isPlanning) && "opacity-50 cursor-not-allowed",
          )}
        >
          {isLast ? "Create Estimate" : "Next →"}
        </button>
      </div>
    </div>
  );
}

