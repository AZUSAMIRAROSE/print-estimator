import { useEstimationStore } from "@/stores/estimationStore";
import { cn } from "@/utils/cn";
import {
  Info, Sparkles, ToggleLeft, ToggleRight, Layers, Droplets,
  Stamp, Scissors, CircleDot, Star, Palette
} from "lucide-react";
import { LAMINATION_RATES } from "@/constants";

export function StepFinishing() {
  const { estimation, updateFinishing } = useEstimationStore();
  const f = estimation.finishing;

  const Toggle = ({ checked, onChange, label, sublabel }: {
    checked: boolean;
    onChange: (val: boolean) => void;
    label: string;
    sublabel?: string;
  }) => (
    <div
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
        checked
          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
          : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
      )}
    >
      <div>
        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</p>
        {sublabel && <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">{sublabel}</p>}
      </div>
      {checked ? (
        <ToggleRight className="w-8 h-8 text-primary-600 shrink-0" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-gray-400 shrink-0" />
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Finishing Options</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Add finishing to enhance your print job. Lamination protects covers, Spot UV creates glossy highlights,
            and foil blocking adds metallic elements. Each option shows its per-copy rate.
          </p>
        </div>
      </div>

      {/* Cover Lamination */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Cover Lamination
          </h3>
        </div>

        <Toggle
          checked={f.coverLamination.enabled}
          onChange={(val) => updateFinishing({
            coverLamination: { ...f.coverLamination, enabled: val }
          })}
          label="Apply lamination to cover"
          sublabel="Protects cover and enhances appearance"
        />

        {f.coverLamination.enabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in">
            {(["gloss", "matt", "velvet", "anti_scratch"] as const).map((type) => {
              const rate = LAMINATION_RATES[type];
              return (
                <button
                  key={type}
                  onClick={() => updateFinishing({
                    coverLamination: { ...f.coverLamination, type }
                  })}
                  className={cn(
                    "p-3 rounded-lg border-2 text-center transition-all",
                    f.coverLamination.type === type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
                  )}
                >
                  <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary capitalize">
                    {type.replace("_", " ")}
                  </p>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
                    ₹{rate.ratePerCopy}/copy
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Jacket Lamination */}
      {estimation.jacket.enabled && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              Jacket Lamination
            </h3>
          </div>

          <Toggle
            checked={f.jacketLamination.enabled}
            onChange={(val) => updateFinishing({
              jacketLamination: { ...f.jacketLamination, enabled: val }
            })}
            label="Apply lamination to dust jacket"
            sublabel="Usually gloss or matt BOPP"
          />

          {f.jacketLamination.enabled && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in">
              {(["gloss", "matt", "velvet", "anti_scratch"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => updateFinishing({
                    jacketLamination: { ...f.jacketLamination, type }
                  })}
                  className={cn(
                    "p-3 rounded-lg border-2 text-center transition-all capitalize text-sm",
                    f.jacketLamination.type === type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
                  )}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spot UV */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Spot UV
          </h3>
        </div>

        <Toggle
          checked={f.spotUVCover.enabled}
          onChange={(val) => updateFinishing({
            spotUVCover: { ...f.spotUVCover, enabled: val }
          })}
          label="Spot UV on cover"
          sublabel="Glossy raised UV on selected areas. Block cost: ₹2,500"
        />

        {f.spotUVCover.enabled && (
          <div className="flex gap-3 animate-in">
            {(["front", "front_and_back"] as const).map((type) => (
              <button
                key={type}
                onClick={() => updateFinishing({
                  spotUVCover: { ...f.spotUVCover, type }
                })}
                className={cn(
                  "flex-1 p-3 rounded-lg border-2 text-center transition-all text-sm capitalize",
                  f.spotUVCover.type === type
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                    : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                )}
              >
                {type.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* UV Varnish */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Varnishing
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle
            checked={f.uvVarnish.enabled}
            onChange={(val) => updateFinishing({
              uvVarnish: { ...f.uvVarnish, enabled: val }
            })}
            label="UV Varnish (Full Flood)"
            sublabel="₹0.65/copy cover • ₹0.45/copy text"
          />
          <Toggle
            checked={f.aqueousVarnish.enabled}
            onChange={(val) => updateFinishing({
              aqueousVarnish: { ...f.aqueousVarnish, enabled: val }
            })}
            label="Aqueous Varnish"
            sublabel="Free on Rekord with AQ unit, ₹0.35/copy otherwise"
          />
        </div>
      </div>

      {/* Foil & Embossing */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Stamp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Foil Blocking & Embossing
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle
            checked={f.goldBlocking.enabled}
            onChange={(val) => updateFinishing({
              goldBlocking: { ...f.goldBlocking, enabled: val }
            })}
            label="Foil Blocking"
            sublabel="Die cost: ₹3,500 • ₹0.30/copy front"
          />
          <Toggle
            checked={f.embossing.enabled}
            onChange={(val) => updateFinishing({
              embossing: { ...f.embossing, enabled: val }
            })}
            label="Embossing"
            sublabel="Die cost: ₹2,500 • ₹0.45/copy"
          />
        </div>

        {f.goldBlocking.enabled && (
          <div className="space-y-3 animate-in">
            <label className="label">Foil Type</label>
            <div className="flex gap-2">
              {(["gold", "silver", "copper", "holographic"] as const).map((foil) => (
                <button
                  key={foil}
                  onClick={() => updateFinishing({
                    goldBlocking: { ...f.goldBlocking, foilType: foil }
                  })}
                  className={cn(
                    "px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all",
                    f.goldBlocking.foilType === foil
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                  )}
                >
                  {foil}
                </button>
              ))}
            </div>

            <label className="label">Location</label>
            <div className="flex gap-2">
              {(["front", "spine", "back"] as const).map((loc) => {
                const isActive = f.goldBlocking.location.includes(loc);
                return (
                  <button
                    key={loc}
                    onClick={() => {
                      const newLoc = isActive
                        ? f.goldBlocking.location.filter(l => l !== loc)
                        : [...f.goldBlocking.location, loc];
                      updateFinishing({
                        goldBlocking: { ...f.goldBlocking, location: newLoc }
                      });
                    }}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all",
                      isActive
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                        : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                    )}
                  >
                    {loc.replace("_", " ")}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {f.embossing.enabled && (
          <div className="space-y-3 animate-in">
            <label className="label">Embossing Type</label>
            <div className="flex gap-2">
              {(["single", "multi_level"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => updateFinishing({
                    embossing: { ...f.embossing, type }
                  })}
                  className={cn(
                    "px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all",
                    f.embossing.type === type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                  )}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Die Cutting */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Die Cutting & Special Finishing
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <Toggle
            checked={f.dieCutting.enabled}
            onChange={(val) => updateFinishing({
              dieCutting: { ...f.dieCutting, enabled: val }
            })}
            label="Die Cutting"
            sublabel="Custom shapes. Die: ₹4K-15K"
          />
          <Toggle
            checked={f.edgeGilding.enabled}
            onChange={(val) => updateFinishing({
              edgeGilding: { ...f.edgeGilding, enabled: val }
            })}
            label="Edge Gilding"
            sublabel="₹2.50/copy per edge"
          />
          <Toggle
            checked={f.perforation.enabled}
            onChange={(val) => updateFinishing({
              perforation: { ...f.perforation, enabled: val }
            })}
            label="Perforation"
            sublabel="Tear-off sections"
          />
          <Toggle
            checked={f.scoring.enabled}
            onChange={(val) => updateFinishing({
              scoring: { ...f.scoring, enabled: val }
            })}
            label="Scoring"
            sublabel="Fold lines"
          />
          <Toggle
            checked={f.numbering.enabled}
            onChange={(val) => updateFinishing({
              numbering: { ...f.numbering, enabled: val }
            })}
            label="Numbering"
            sublabel="Sequential numbering"
          />
        </div>

        {f.dieCutting.enabled && (
          <div className="animate-in">
            <label className="label">Complexity Level</label>
            <div className="flex gap-2">
              {(["simple", "medium", "complex"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => updateFinishing({
                    dieCutting: { ...f.dieCutting, complexity: c }
                  })}
                  className={cn(
                    "px-4 py-2 rounded-lg border-2 text-sm capitalize transition-all",
                    f.dieCutting.complexity === c
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Finishing */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              Additional Finishing
            </h3>
          </div>
          <button
            onClick={() => updateFinishing({
              additionalFinishing: [
                ...f.additionalFinishing,
                { type: "", description: "", costPerCopy: 0, setupCost: 0 },
              ],
            })}
            className="btn-secondary text-xs"
          >
            + Add Item
          </button>
        </div>

        {f.additionalFinishing.length > 0 && (
          <div className="space-y-3">
            {f.additionalFinishing.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-3 items-end">
                <div>
                  <label className="label">Type</label>
                  <input
                    type="text"
                    value={item.type}
                    onChange={(e) => {
                      const updated = [...f.additionalFinishing];
                      updated[index] = { ...updated[index], type: e.target.value };
                      updateFinishing({ additionalFinishing: updated });
                    }}
                    placeholder="e.g., Thermography"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...f.additionalFinishing];
                      updated[index] = { ...updated[index], description: e.target.value };
                      updateFinishing({ additionalFinishing: updated });
                    }}
                    placeholder="Details..."
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Cost/Copy (₹)</label>
                  <input
                    type="number"
                    value={item.costPerCopy}
                    onChange={(e) => {
                      const updated = [...f.additionalFinishing];
                      updated[index] = { ...updated[index], costPerCopy: parseFloat(e.target.value) || 0 };
                      updateFinishing({ additionalFinishing: updated });
                    }}
                    className="input-field"
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label">Setup (₹)</label>
                    <input
                      type="number"
                      value={item.setupCost}
                      onChange={(e) => {
                        const updated = [...f.additionalFinishing];
                        updated[index] = { ...updated[index], setupCost: parseFloat(e.target.value) || 0 };
                        updateFinishing({ additionalFinishing: updated });
                      }}
                      className="input-field"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const updated = f.additionalFinishing.filter((_, i) => i !== index);
                      updateFinishing({ additionalFinishing: updated });
                    }}
                    className="p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded-lg transition-colors mb-0.5"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}