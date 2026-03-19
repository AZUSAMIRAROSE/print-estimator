// ============================================================================
// STEP 10: PRE-PRESS — Proofs, film output, design charges
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";

export function StepPrePress() {
  const { estimation, setEstimationField } = useWizardStore();

  const prePress = estimation.prePress ?? {
    epsonProofs: 0,
    epsonRatePerPage: 25,
    wetProofs: 0,
    wetProofRatePerForm: 500,
    filmOutput: false,
    filmRatePerPlate: 200,
    designCharges: 0,
  };

  const update = (field: string, value: unknown) => {
    setEstimationField(`prePress.${field}`, value);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Pre-press costs for proofing, film output, and design work.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper sectionId="__prepress__" fieldName="epsonProofs" label="Epson Proofs (pages)">
          <input
            type="number"
            value={prePress.epsonProofs}
            onChange={(e) => update("epsonProofs", parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>

        <FieldWrapper sectionId="__prepress__" fieldName="epsonRate" label="Rate per Page (₹)">
          <input
            type="number"
            value={prePress.epsonRatePerPage}
            onChange={(e) => update("epsonRatePerPage", parseInt(e.target.value) || 25)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper sectionId="__prepress__" fieldName="wetProofs" label="Wet Proofs (sets)">
          <input
            type="number"
            value={prePress.wetProofs}
            onChange={(e) => update("wetProofs", parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>

        <FieldWrapper sectionId="__prepress__" fieldName="wetProofRate" label="Rate per Form (₹)">
          <input
            type="number"
            value={prePress.wetProofRatePerForm}
            onChange={(e) => update("wetProofRatePerForm", parseInt(e.target.value) || 500)}
            min={0}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={prePress.filmOutput}
            onChange={(e) => update("filmOutput", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          Film Output Required
        </label>

        {prePress.filmOutput && (
          <FieldWrapper sectionId="__prepress__" fieldName="filmRate" label="Rate per Plate (₹)" className="flex-1">
            <input
              type="number"
              value={prePress.filmRatePerPlate}
              onChange={(e) => update("filmRatePerPlate", parseInt(e.target.value) || 200)}
              min={0}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
            />
          </FieldWrapper>
        )}
      </div>

      <FieldWrapper sectionId="__prepress__" fieldName="designCharges" label="Design Charges (₹)">
        <input
          type="number"
          value={prePress.designCharges}
          onChange={(e) => update("designCharges", parseInt(e.target.value) || 0)}
          min={0}
          placeholder="0"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
        />
      </FieldWrapper>

      {/* Cost preview */}
      {(prePress.epsonProofs > 0 || prePress.wetProofs > 0 || prePress.designCharges > 0) && (
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-xs space-y-1">
          <p className="font-semibold text-gray-700 dark:text-gray-300">Pre-Press Cost Preview</p>
          {prePress.epsonProofs > 0 && (
            <p>Epson: {prePress.epsonProofs} pages × ₹{prePress.epsonRatePerPage} = <span className="font-mono">₹{(prePress.epsonProofs * prePress.epsonRatePerPage).toLocaleString()}</span></p>
          )}
          {prePress.wetProofs > 0 && (
            <p>Wet proofs: {prePress.wetProofs} sets × ₹{prePress.wetProofRatePerForm}/form</p>
          )}
          {prePress.designCharges > 0 && (
            <p>Design: <span className="font-mono">₹{prePress.designCharges.toLocaleString()}</span></p>
          )}
        </div>
      )}
    </div>
  );
}
