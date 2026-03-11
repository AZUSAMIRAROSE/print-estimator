// ============================================================================
// WIZARD SHELL — Master layout that renders all steps
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { StepNavigation, StepButtons } from "./shared/StepNavigation";
import { PlanPreview } from "./shared/PlanPreview";
import { StepBasicInfo } from "./StepBasicInfo";
import { StepBookSpec } from "./steps/StepBookSpec";
import { StepTextSections } from "./StepTextSections";
import { StepCover } from "./StepCover";
import { StepJacket } from "./StepJacket";
import { StepEndleaves } from "./StepEndleaves";
import { StepBinding } from "./StepBinding";
import { StepFinishing } from "./StepFinishing";
import { StepPacking } from "./StepPacking";
import { StepDelivery } from "./StepDelivery";
import { StepPrePress } from "./StepPrePress";
import { StepPricing } from "./StepPricing";
import { StepAdditional } from "./StepAdditional";
import { StepNotes } from "./StepNotes";
import { StepReview } from "./StepReview";

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
 0: StepBasicInfo,
 1: StepBookSpec,
 2: StepTextSections,
 3: StepCover,
 4: StepJacket,
 5: StepEndleaves,
 6: StepBinding,
 7: StepFinishing,
 8: StepPacking,
 9: StepDelivery,
 10: StepPrePress,
 11: StepPricing,
 12: StepAdditional,
 13: StepNotes,
 14: StepReview,
};

export function WizardShell() {
  const { currentStep, showLivePreview, toggleLivePreview, getMetaStats } = useWizardStore();
  const StepComponent = STEP_COMPONENTS[currentStep] ?? (() => null);
  const stats = getMetaStats();

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 md:gap-6 h-full">
      {/* Main form area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Step header */}
        <div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-6">
          <StepNavigation />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <StepComponent />
        </div>

        {/* Navigation buttons */}
        <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
          <StepButtons />
        </div>
      </div>

      {/* Right panel: live preview (hidden on mobile, shown on lg) */}
      {showLivePreview && (
        <>
          {/* Mobile preview - below form */}
          <div className="lg:hidden w-full border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-950 overflow-y-auto px-3 sm:px-4 py-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Live Preview
              </h3>
              <button
                type="button"
                onClick={toggleLivePreview}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Hide
              </button>
            </div>

            <PlanPreview />

            {/* Metadata stats */}
            {stats.totalFields > 0 && (
              <div className="text-xs space-y-1 p-3 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-700">
                <p className="font-semibold text-gray-700 dark:text-gray-300">📊 Field Stats</p>
                <p>Auto-planned: <span className="font-mono">{stats.autoPlannedFields}</span></p>
                <p>User overrides: <span className="font-mono">{stats.userOverrideFields}</span></p>
                <p>Low confidence: <span className="font-mono text-amber-600">{stats.lowConfidenceFields}</span></p>
                <p>Avg confidence: <span className="font-mono">{(stats.averageConfidence * 100).toFixed(0)}%</span></p>
              </div>
            )}
          </div>

          {/* Desktop preview - right side */}
          <div className="hidden lg:flex flex-col w-80 shrink-0 border-l dark:border-gray-700 bg-gray-50 dark:bg-gray-950 overflow-y-auto p-4 space-y-4">
            {/* Toggle */}
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Live Preview
              </h3>
              <button
                type="button"
                onClick={toggleLivePreview}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Hide
              </button>
            </div>

            <PlanPreview />

            {/* Metadata stats */}
            {stats.totalFields > 0 && (
              <div className="text-xs space-y-1 p-3 rounded-lg bg-white dark:bg-gray-900 border dark:border-gray-700">
                <p className="font-semibold text-gray-700 dark:text-gray-300">📊 Field Stats</p>
                <p>Auto-planned: <span className="font-mono">{stats.autoPlannedFields}</span></p>
                <p>User overrides: <span className="font-mono">{stats.userOverrideFields}</span></p>
                <p>Low confidence: <span className="font-mono text-amber-600">{stats.lowConfidenceFields}</span></p>
                <p>Avg confidence: <span className="font-mono">{(stats.averageConfidence * 100).toFixed(0)}%</span></p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
