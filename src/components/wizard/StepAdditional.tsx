import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { Info, Plus, Trash2 } from "lucide-react";
import { generateId } from "@/utils/format";

export function StepAdditional() {
  const { estimation, updateEstimation } = useEstimationStore();
  const costs = estimation.additionalCosts;

  const addCost = () => {
    updateEstimation({
      additionalCosts: [
        ...costs,
        {
          id: generateId(),
          description: "",
          costPerCopy: 0,
          totalCost: 0,
          isPerCopy: true,
          category: "general",
        },
      ],
    });
  };

  const removeCost = (id: string) => {
    updateEstimation({
      additionalCosts: costs.filter(c => c.id !== id),
    });
  };

  const updateCost = (id: string, updates: Record<string, unknown>) => {
    updateEstimation({
      additionalCosts: costs.map(c => c.id === id ? { ...c, ...updates } : c),
    });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Additional Costs</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Add any extra costs not covered by standard sections — design work, special materials,
            manual labor, scanning, photography, indexing, etc. Costs can be per-copy or fixed total.
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Additional Cost Items
          </h3>
          <button onClick={addCost} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Add Cost Item
          </button>
        </div>

        {costs.length === 0 ? (
          <div className="text-center py-8 text-text-light-tertiary dark:text-text-dark-tertiary">
            <p>No additional costs added yet.</p>
            <p className="text-sm mt-1">Click "Add Cost Item" to include extra charges.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary px-1">
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Cost/Copy (₹)</div>
              <div className="col-span-2">Total (₹)</div>
              <div className="col-span-1"></div>
            </div>

            {costs.map((cost) => (
              <div key={cost.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg">
                <div className="col-span-3">
                  <input
                    type="text"
                    value={cost.description}
                    onChange={(e) => updateCost(cost.id, { description: e.target.value })}
                    placeholder="Description..."
                    className="input-field text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <select
                    value={cost.category}
                    onChange={(e) => updateCost(cost.id, { category: e.target.value })}
                    className="input-field text-sm"
                  >
                    <option value="general">General</option>
                    <option value="labour">Labour</option>
                    <option value="material">Material</option>
                    <option value="design">Design</option>
                    <option value="outsource">Outsource</option>
                    <option value="transport">Transport</option>
                    <option value="overhead">Overhead</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <select
                    value={cost.isPerCopy ? "per_copy" : "total"}
                    onChange={(e) => updateCost(cost.id, { isPerCopy: e.target.value === "per_copy" })}
                    className="input-field text-sm"
                  >
                    <option value="per_copy">Per Copy</option>
                    <option value="total">Fixed Total</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={cost.isPerCopy ? cost.costPerCopy : ""}
                    onChange={(e) => updateCost(cost.id, { costPerCopy: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    disabled={!cost.isPerCopy}
                    placeholder={cost.isPerCopy ? "0.00" : "N/A"}
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={!cost.isPerCopy ? cost.totalCost : ""}
                    onChange={(e) => updateCost(cost.id, { totalCost: parseFloat(e.target.value) || 0 })}
                    className="input-field text-sm"
                    disabled={cost.isPerCopy}
                    placeholder={!cost.isPerCopy ? "0.00" : "Auto"}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeCost(cost.id)}
                    className="p-1.5 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Add Presets */}
        <div>
          <p className="text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary mb-2">Quick Add:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { desc: "Design/DTP Charges", cat: "design", perCopy: false, total: 5000 },
              { desc: "Scanning", cat: "outsource", perCopy: true, costPerCopy: 0.50 },
              { desc: "Photography", cat: "outsource", perCopy: false, total: 10000 },
              { desc: "Indexing", cat: "labour", perCopy: true, costPerCopy: 0.75 },
              { desc: "Proof Reading", cat: "labour", perCopy: false, total: 3000 },
              { desc: "Manual Collation", cat: "labour", perCopy: true, costPerCopy: 0.20 },
              { desc: "Special Ink", cat: "material", perCopy: true, costPerCopy: 0.30 },
              { desc: "Insert/Tip-in", cat: "labour", perCopy: true, costPerCopy: 0.15 },
            ].map((preset) => (
              <button
                key={preset.desc}
                onClick={() => {
                  updateEstimation({
                    additionalCosts: [
                      ...costs,
                      {
                        id: generateId(),
                        description: preset.desc,
                        costPerCopy: preset.perCopy ? (preset as any).costPerCopy : 0,
                        totalCost: !preset.perCopy ? (preset as any).total : 0,
                        isPerCopy: preset.perCopy,
                        category: preset.cat,
                      },
                    ],
                  });
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-surface-light-tertiary dark:bg-surface-dark-tertiary hover:bg-primary-50 dark:hover:bg-primary-500/10 text-text-light-secondary dark:text-text-dark-secondary transition-colors"
              >
                + {preset.desc}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}