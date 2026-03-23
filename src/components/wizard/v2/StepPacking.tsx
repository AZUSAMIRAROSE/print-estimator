// ============================================================================
// STEP 8: PACKING — Carton type, books per carton, palletization
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { cn } from "@/utils/cn";

const CARTON_TYPES = [
  { value: "3PLY", label: "3-Ply Corrugated", description: "Standard, lightweight books" },
  { value: "5PLY", label: "5-Ply Corrugated", description: "Heavy books, export-grade" },
  { value: "SLEEVE", label: "Carton Sleeve", description: "Shrink-wrapped bundles" },
];

export function StepPacking() {
  const { estimation, setEstimationField } = useWizardStore();

  const packing = estimation.packing ?? {
    cartonType: "5PLY",
    booksPerCarton: 20,
    palletize: true,
    palletType: "WOODEN",
    shrinkWrap: true,
  };

  const update = (field: string, value: unknown) => {
    setEstimationField(`packing.${field}`, value);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Carton type */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Carton Type</h3>
        <div className="grid grid-cols-3 gap-3">
          {CARTON_TYPES.map((ct) => (
            <button
              key={ct.value}
              type="button"
              onClick={() => update("cartonType", ct.value)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                packing.cartonType === ct.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-200 dark:ring-blue-800"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-900",
              )}
            >
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{ct.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ct.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Books per carton */}
        <FieldWrapper sectionId="__packing__" fieldName="booksPerCarton" label="Books per Carton">
          <input
            type="number"
            value={packing.booksPerCarton}
            onChange={(e) => update("booksPerCarton", parseInt(e.target.value) || 20)}
            min={1}
            max={100}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>

        {/* Pallet type */}
        <FieldWrapper sectionId="__packing__" fieldName="palletType" label="Pallet Type">
          <select
            value={packing.palletType}
            onChange={(e) => update("palletType", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="WOODEN">Wooden Pallet</option>
            <option value="PLASTIC">Plastic Pallet</option>
            <option value="NONE">No Palletization</option>
          </select>
        </FieldWrapper>
      </div>

      {/* Toggles */}
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={packing.palletize ?? true}
            onChange={(e) => update("palletize", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          Palletize
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={packing.shrinkWrap ?? true}
            onChange={(e) => update("shrinkWrap", e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600"
          />
          Shrink Wrap
        </label>
      </div>
    </div>
  );
}
