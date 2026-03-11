// ============================================================================
// STEP 6: BINDING — Method selection, case binding options
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import type { BindingConfig } from "@/domain/estimation/types";
import { cn } from "@/utils/cn";

const BINDING_METHODS: { value: BindingConfig["method"]; label: string; icon: string; description: string }[] = [
  { value: "PERFECT", label: "Perfect Binding", icon: "📖", description: "Adhesive spine, paperback style" },
  { value: "CASE", label: "Case Binding", icon: "📚", description: "Hardcover with boards and cloth/paper" },
  { value: "SADDLE", label: "Saddle Stitch", icon: "📋", description: "Stapled spine, for thin books" },
  { value: "SECTION_SEWN", label: "Section Sewn", icon: "🧵", description: "Thread-sewn signatures, premium" },
  { value: "WIRO", label: "Wiro Binding", icon: "🔗", description: "Wire-O spiral, lies flat" },
  { value: "SPIRAL", label: "Spiral Binding", icon: "🌀", description: "Plastic coil, lies flat" },
];

export function StepBinding() {
  const { estimation, setEstimationField } = useWizardStore();
  const binding = estimation.binding;

  const handleMethodChange = (method: BindingConfig["method"]) => {
    setEstimationField("binding.method", method);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Method selection grid */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Binding Method</h3>
        <div className="grid grid-cols-2 gap-3">
          {BINDING_METHODS.map((method) => (
            <button
              key={method.value}
              type="button"
              onClick={() => handleMethodChange(method.value)}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
                binding.method === method.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-200 dark:ring-blue-800"
                  : "border-gray-200 dark:border-gray-700 hover:border-blue-300 bg-white dark:bg-gray-900",
              )}
            >
              <span className="text-2xl mt-0.5">{method.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {method.label}
                </p>
                <p className="text-xs text-gray-500">{method.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Case binding options */}
      {binding.method === "CASE" && (
        <div className="space-y-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Hardcover Specifications
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper sectionId="__binding__" fieldName="boardThickness" label="Board Thickness (mm)">
              <select
                value={binding.boardThickness_mm ?? 3}
                onChange={(e) => setEstimationField("binding.boardThickness_mm", parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                <option value={2}>2.0mm</option>
                <option value={2.5}>2.5mm</option>
                <option value={3}>3.0mm (standard)</option>
                <option value={3.5}>3.5mm</option>
              </select>
            </FieldWrapper>

            <FieldWrapper sectionId="__binding__" fieldName="coveringMaterial" label="Covering Material">
              <select
                value={binding.coveringMaterial ?? "printed_paper"}
                onChange={(e) => setEstimationField("binding.coveringMaterial", e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="printed_paper">Printed Paper</option>
                <option value="cloth">Cloth (Buckram)</option>
                <option value="leather">Leather</option>
                <option value="pu_leather">PU Leather</option>
              </select>
            </FieldWrapper>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={binding.headTailBand ?? false}
                onChange={(e) => setEstimationField("binding.headTailBand", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              Head & Tail Bands
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={binding.ribbonMarker ?? false}
                onChange={(e) => setEstimationField("binding.ribbonMarker", e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600"
              />
              Ribbon Marker
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
