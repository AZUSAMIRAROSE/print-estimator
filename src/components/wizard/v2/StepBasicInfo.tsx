// ============================================================================
// STEP 0: BASIC INFO — Job title, customer, reference
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";

export function StepBasicInfo() {
  const { estimation, setEstimationField } = useWizardStore();

  return (
    <div className="space-y-6 max-w-2xl">
      <FieldWrapper sectionId="__global__" fieldName="jobTitle" label="Job Title" required>
        <input
          type="text"
          value={estimation.jobTitle}
          onChange={(e) => setEstimationField("jobTitle", e.target.value)}
          placeholder="e.g., Oxford English Dictionary 2026 Edition"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </FieldWrapper>

      <FieldWrapper sectionId="__global__" fieldName="customerName" label="Customer" required>
        <input
          type="text"
          value={estimation.customerName}
          onChange={(e) => setEstimationField("customerName", e.target.value)}
          placeholder="e.g., Oxford University Press"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </FieldWrapper>

      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper sectionId="__global__" fieldName="estimatedBy" label="Estimated By">
          <input
            type="text"
            value={(estimation as any).estimatedBy ?? ""}
            onChange={(e) => setEstimationField("estimatedBy", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
        </FieldWrapper>

        <FieldWrapper sectionId="__global__" fieldName="poNumber" label="PO / Reference">
          <input
            type="text"
            value={(estimation as any).poNumber ?? ""}
            onChange={(e) => setEstimationField("poNumber", e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          />
        </FieldWrapper>
      </div>
    </div>
  );
}
