// ============================================================================
// STEP 13: NOTES — Free-form notes and special instructions
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";

export function StepNotes() {
  const { estimation, setEstimationField } = useWizardStore();

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Add any notes, special instructions, or conditions for this estimation.
      </p>

      <textarea
        value={estimation.notes ?? ""}
        onChange={(e) => setEstimationField("notes", e.target.value)}
        rows={10}
        placeholder="Special instructions, conditions, delivery notes, quality requirements..."
        className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm resize-y focus:ring-2 focus:ring-blue-500"
      />

      <p className="text-xs text-gray-400 text-right">
        {(estimation.notes ?? "").length} characters
      </p>
    </div>
  );
}
