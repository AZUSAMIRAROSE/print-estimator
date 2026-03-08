// ============================================================================
// FIELD WRAPPER — Confidence indicator + override badge
// ============================================================================
// Wraps any form field to show:
//   - Source badge (AUTO, USER, RATE_CARD, etc.)
//   - Confidence bar (color-coded)
//   - Override revert button
//   - Tooltip with reason
// ============================================================================

import React from "react";
import { useFieldConfidence, useFieldOverridden, useWizardStore } from "@/domain/estimation/wizardStore";
import type { FieldSource } from "@/domain/estimation/types";
import { cn } from "@/utils/cn";

interface FieldWrapperProps {
  sectionId: string;
  fieldName: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
  help?: string;
  className?: string;
}

const SOURCE_LABELS: Record<FieldSource, { label: string; color: string }> = {
  AUTO_PLANNED: { label: "AUTO", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  USER_OVERRIDE: { label: "USER", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  RATE_CARD: { label: "RATE", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  INVENTORY: { label: "INV", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  DEFAULT: { label: "DEF", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  IMPORTED: { label: "IMP", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.85) return "bg-green-500";
  if (confidence >= 0.65) return "bg-yellow-500";
  if (confidence >= 0.4) return "bg-orange-500";
  return "bg-red-500";
}

export function FieldWrapper({
  sectionId,
  fieldName,
  label,
  children,
  required = false,
  help,
  className,
}: FieldWrapperProps) {
  const confidence = useFieldConfidence(sectionId, fieldName);
  const isOverridden = useFieldOverridden(sectionId, fieldName);
  const { revertFieldOverride, meta } = useWizardStore();

  const fieldMeta = meta[sectionId]?.[fieldName];
  const source = fieldMeta?.source ?? "DEFAULT";
  const sourceInfo = SOURCE_LABELS[source] ?? SOURCE_LABELS.DEFAULT;

  return (
    <div className={cn("space-y-1", className)}>
      {/* Label row with badges */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>

        {/* Source badge */}
        {fieldMeta && (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide",
              sourceInfo.color,
            )}
            title={fieldMeta.reason ?? `Source: ${source}`}
          >
            {sourceInfo.label}
          </span>
        )}

        {/* Override revert button */}
        {isOverridden && (
          <button
            type="button"
            onClick={() => revertFieldOverride(sectionId, fieldName)}
            className="text-[10px] text-amber-600 hover:text-amber-800 underline"
            title={`Revert to auto-planned value: ${fieldMeta?.overriddenFrom}`}
          >
            ↩ revert
          </button>
        )}
      </div>

      {/* Field content */}
      {children}

      {/* Confidence bar */}
      {fieldMeta && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", getConfidenceColor(confidence))}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 tabular-nums">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Help text */}
      {help && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{help}</p>
      )}
    </div>
  );
}

