// ============================================================================
// STEP 12: ADDITIONAL COSTS — Custom line items
// ============================================================================

import React, { useCallback } from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";

interface AdditionalCostItem {
  id: string;
  description: string;
  isPerCopy: boolean;
  costPerCopy: number;
  totalCost: number;
}

export function StepAdditional() {
  const { estimation, setEstimationField } = useWizardStore();

  const items: AdditionalCostItem[] = (estimation as any).additionalCosts ?? [];

  const updateItems = useCallback((newItems: AdditionalCostItem[]) => {
    setEstimationField("additionalCosts", newItems);
  }, [setEstimationField]);

  const addItem = () => {
    updateItems([
      ...items,
      {
        id: `add_${Date.now()}`,
        description: "",
        isPerCopy: false,
        costPerCopy: 0,
        totalCost: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    updateItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: unknown) => {
    updateItems(
      items.map((i) =>
        i.id === id ? { ...i, [field]: value } : i,
      ),
    );
  };

  const totalAdditional = items.reduce((sum, item) => {
    if (item.isPerCopy) {
      const firstQty = estimation.book.quantities.find((q: number) => q > 0) ?? 1000;
      return sum + item.costPerCopy * firstQty;
    }
    return sum + item.totalCost;
  }, 0);

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Add any additional costs not covered by the standard calculation — handling charges, special materials, etc.
      </p>

      {/* Line items */}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
        >
          <span className="text-xs text-gray-400 font-mono pt-2">{idx + 1}.</span>

          <div className="flex-1 grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] text-gray-500 uppercase">Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => updateItem(item.id, "description", e.target.value)}
                placeholder="e.g., Special ink surcharge"
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase">Type</label>
              <select
                value={item.isPerCopy ? "per_copy" : "fixed"}
                onChange={(e) => updateItem(item.id, "isPerCopy", e.target.value === "per_copy")}
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="fixed">Fixed Total</option>
                <option value="per_copy">Per Copy</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase">
                {item.isPerCopy ? "₹/Copy" : "Total ₹"}
              </label>
              <input
                type="number"
                value={item.isPerCopy ? item.costPerCopy : item.totalCost}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  if (item.isPerCopy) updateItem(item.id, "costPerCopy", val);
                  else updateItem(item.id, "totalCost", val);
                }}
                min={0}
                step={0.01}
                className="w-full px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="text-red-400 hover:text-red-600 text-sm pt-5"
          >
            ✕
          </button>
        </div>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={addItem}
        className="w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        + Add Line Item
      </button>

      {/* Total */}
      {totalAdditional > 0 && (
        <div className="text-right text-sm text-gray-700 dark:text-gray-300">
          Additional total: <span className="font-mono font-semibold">₹{totalAdditional.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
