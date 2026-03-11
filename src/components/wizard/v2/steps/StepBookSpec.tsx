// ============================================================================
// STEP 1: BOOK SPECIFICATION — Trim size, page count, quantity
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper, SectionCard } from "../shared";
import { TRIM_SIZE_PRESETS } from "@/domain/estimation/constants";
import { cn } from "@/utils/cn";

export function StepBookSpec() {
  const { estimation, setEstimationField, overrideField } = useWizardStore();
  const { book } = estimation;

  const handleTrimSizeChange = (width: number, height: number) => {
    setEstimationField("book.trimSize", { width, height });
    overrideField("book", "trimSize", { width, height }, "Selected from standard trim presets");
  };

  const handlePagesChange = (totalPages: number) => {
    setEstimationField("book.totalPages", totalPages);
    overrideField("book", "totalPages", totalPages, "User entered page count");
  };

  const handleQuantityChange = (index: number, value: number) => {
    const newQuantities = [...book.quantities];
    newQuantities[index] = value;
    setEstimationField("book.quantities", newQuantities);
  };

  const addQuantity = () => {
    if (book.quantities.length < 5) {
      const newQuantities = [...book.quantities, 1000];
      setEstimationField("book.quantities", newQuantities);
    }
  };

  const removeQuantity = (index: number) => {
    if (book.quantities.length > 1) {
      const newQuantities = book.quantities.filter((_, i) => i !== index);
      setEstimationField("book.quantities", newQuantities);
    }
  };

  return (
    <div className="space-y-6">
      {/* Trim Size Selection */}
      <SectionCard title="Book Size" subtitle="Trim dimensions" icon="📐">
        <div className="grid grid-cols-2 gap-4">
          {/* Width */}
          <FieldWrapper sectionId="book" fieldName="trimSize" label="Width (mm)" required help="Finished page width">
            <input
              type="number"
              value={book.trimSize.width}
              onChange={(e) => handleTrimSizeChange(Number(e.target.value), book.trimSize.height)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              min={100}
              max={500}
            />
          </FieldWrapper>

          {/* Height */}
          <FieldWrapper sectionId="book" fieldName="trimSize" label="Height (mm)" required help="Finished page height">
            <input
              type="number"
              value={book.trimSize.height}
              onChange={(e) => handleTrimSizeChange(book.trimSize.width, Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              min={100}
              max={500}
            />
          </FieldWrapper>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          {TRIM_SIZE_PRESETS.slice(0, 8).map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleTrimSizeChange(preset.size_mm.width, preset.size_mm.height)}
              className={cn(
                "px-2 py-1 text-xs rounded border transition-colors",
                book.trimSize.width === preset.size_mm.width && book.trimSize.height === preset.size_mm.height
                  ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700"
                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
              )}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Page Count */}
      <SectionCard title="Page Count" subtitle="Total pages in the book" icon="📄">
        <FieldWrapper sectionId="book" fieldName="totalPages" label="Total Pages" required help="Total pages including covers, prelims, etc.">
          <input
            type="number"
            value={book.totalPages}
            onChange={(e) => handlePagesChange(Number(e.target.value))}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
            min={1}
            max={2000}
          />
        </FieldWrapper>

        {/* Page breakdown hint */}
        <div className="text-xs text-gray-500 mt-2">
          Tip: Text pages + cover + prelims = total. Covers are typically 4 pages (2 leaves).
        </div>
      </SectionCard>

      {/* Quantities */}
      <SectionCard title="Quantities" subtitle="Print quantities to estimate" icon="📊">
        <div className="space-y-2">
          {book.quantities.map((qty, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-20">Qty {index + 1}:</span>
              <input
                type="number"
                value={qty}
                onChange={(e) => handleQuantityChange(index, Number(e.target.value))}
                className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                min={1}
                max={100000}
              />
              {book.quantities.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuantity(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          {book.quantities.length < 5 && (
            <button
              type="button"
              onClick={addQuantity}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Add quantity
            </button>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
