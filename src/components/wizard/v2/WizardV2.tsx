// ============================================================================
// WIZARD V2 — Main estimation wizard container
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { StepNavigation, StepButtons, PlanPreview } from "./shared";
import { StepBookSpec } from "./steps/StepBookSpec";

// Placeholder components for steps not yet implemented
const PlaceholderStep = ({ stepName }: { stepName: string }) => (
  <div className="p-8 text-center text-gray-500">
    <p className="text-lg font-medium">{stepName}</p>
    <p className="text-sm mt-2">This step is not yet implemented.</p>
  </div>
);

const StepBasicInfo = () => <PlaceholderStep stepName="Basic Info" />;
const StepTextSections = () => <PlaceholderStep stepName="Text Sections" />;
const StepCover = () => <PlaceholderStep stepName="Cover" />;
const StepJacket = () => <PlaceholderStep stepName="Jacket" />;
const StepEndleaves = () => <PlaceholderStep stepName="Endleaves" />;
const StepBinding = () => <PlaceholderStep stepName="Binding" />;
const StepFinishing = () => <PlaceholderStep stepName="Finishing" />;
const StepPacking = () => <PlaceholderStep stepName="Packing" />;
const StepDelivery = () => <PlaceholderStep stepName="Delivery" />;
const StepPrePress = () => <PlaceholderStep stepName="Pre-Press" />;
const StepPricing = () => <PlaceholderStep stepName="Pricing" />;
const StepAdditional = () => <PlaceholderStep stepName="Additional" />;
const StepNotes = () => <PlaceholderStep stepName="Notes" />;
const StepReview = () => <PlaceholderStep stepName="Review & Create" />;

const STEP_COMPONENTS: Record<number, React.FC> = {
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

// Simple metadata panel showing field sources
function MetaPanel() {
  const store = useWizardStore();
  const stats = store.getMetaStats();
  const lowConfidence = store.getLowConfidenceFields();

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="text-lg font-bold text-blue-600">{stats.totalFields}</div>
          <div className="text-gray-500">Fields</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="text-lg font-bold text-amber-600">{stats.userOverrideFields}</div>
          <div className="text-gray-500">Overrides</div>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
          <div className="text-lg font-bold text-green-600">{stats.autoPlannedFields}</div>
          <div className="text-gray-500">Auto</div>
        </div>
      </div>

      {lowConfidence.length > 0 && (
        <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
          <p className="font-medium text-amber-700 dark:text-amber-300 mb-1">
            Low Confidence Fields
          </p>
          <ul className="space-y-0.5 text-amber-600 dark:text-amber-400">
            {lowConfidence.slice(0, 5).map((field: { sectionId: string; fieldName: string; confidence: number }, i: number) => (
              <li key={i}>
                {field.sectionId}.{field.fieldName} ({(field.confidence * 100).toFixed(0)}%)
              </li>
            ))}
            {lowConfidence.length > 5 && (
              <li>+{lowConfidence.length - 5} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function WizardV2() {
  const store = useWizardStore();
  const currentStep = store.currentStep;
  const showLivePreview = store.showLivePreview;
  const showMetaPanel = store.showMetaPanel;
  const toggleMetaPanel = store.toggleMetaPanel;
  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepBookSpec;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                New Estimation
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Auto-planning estimation wizard
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMetaPanel}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {showMetaPanel ? "Hide Meta" : "Show Meta"}
              </button>
            </div>
          </div>
          <div className="mt-4">
            <StepNavigation />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <React.Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              }
            >
              <StepComponent />
            </React.Suspense>
            <div className="mt-8">
              <StepButtons />
            </div>
          </div>

          {showLivePreview && (
            <aside className="w-80 shrink-0">
              <div className="sticky top-36">
                <PlanPreview />
                {showMetaPanel && (
                  <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Field Metadata
                    </h3>
                    <MetaPanel />
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}

export default WizardV2;

