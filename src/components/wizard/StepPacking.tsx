import { useEstimationStore } from "@/stores/estimationStore";
import { cn } from "@/utils/cn";
import {
  Info, Package, Box, Layers, ToggleLeft, ToggleRight,
  Truck, Shield, Grid3x3
} from "lucide-react";
import { PACKING_RATES } from "@/constants";

export function StepPacking() {
  const { estimation, updatePacking } = useEstimationStore();
  const p = estimation.packing;

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
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Packing Configuration</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Configure packing for your shipment. Book weight determines books per carton. Standard export carton: {PACKING_RATES.standardCartonDimensions.length}×{PACKING_RATES.standardCartonDimensions.width}×{PACKING_RATES.standardCartonDimensions.height}mm. Maximum carton weight: {PACKING_RATES.maxCartonWeight}kg.
          </p>
        </div>
      </div>

      {/* Carton Configuration */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Carton Configuration
          </h3>
        </div>

        <Toggle
          checked={p.useCartons}
          onChange={(val) => updatePacking({ useCartons: val })}
          label="Pack in cartons"
          sublabel="Standard corrugated shipping cartons"
        />

        {p.useCartons && (
          <div className="space-y-4 animate-in">
            <div>
              <label className="label">Carton Type</label>
              <div className="grid grid-cols-3 gap-3">
                {(["3_ply", "5_ply", "custom"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updatePacking({ cartonType: type })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition-all",
                      p.cartonType === type
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                        : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                    )}
                  >
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary capitalize">
                      {type.replace("_", "-")} Corrugated
                    </p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
                      ₹{type === "3_ply" ? PACKING_RATES.carton3Ply : type === "5_ply" ? PACKING_RATES.carton5Ply : "Custom"}/carton
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Carton Rate (₹)</label>
                <input
                  type="number"
                  value={p.cartonRate || (p.cartonType === "3_ply" ? PACKING_RATES.carton3Ply : PACKING_RATES.carton5Ply)}
                  onChange={(e) => updatePacking({ cartonRate: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Books/Carton Override</label>
                <input
                  type="number"
                  value={p.customBooksPerCarton || ""}
                  onChange={(e) => updatePacking({ customBooksPerCarton: parseInt(e.target.value) || 0 })}
                  placeholder="Auto-calc"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Max Carton Weight (kg)</label>
                <input
                  type="number"
                  value={p.maxCartonWeight}
                  onChange={(e) => updatePacking({ maxCartonWeight: parseFloat(e.target.value) || 14 })}
                  className="input-field"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Toggle
                  checked={p.customPrinting}
                  onChange={(val) => updatePacking({ customPrinting: val })}
                  label="Custom Print"
                  sublabel={`+₹${PACKING_RATES.customPrintSurcharge}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Toggle
                checked={p.innerPartition}
                onChange={(val) => updatePacking({ innerPartition: val })}
                label="Inner Partition"
                sublabel={`₹${PACKING_RATES.innerPartition}/carton`}
              />
              <Toggle
                checked={p.insertSlipSheet}
                onChange={(val) => updatePacking({ insertSlipSheet: val })}
                label="Insert Slip Sheet"
                sublabel="Paper divider between layers"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pallet Configuration */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Grid3x3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Pallet Configuration
          </h3>
        </div>

        <Toggle
          checked={p.usePallets}
          onChange={(val) => updatePacking({ usePallets: val })}
          label="Palletize shipment"
          sublabel="Standard pallet: 1200×1000mm"
        />

        {p.usePallets && (
          <div className="space-y-4 animate-in">
            <div>
              <label className="label">Pallet Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { type: "standard" as const, label: "Standard Wood", rate: PACKING_RATES.palletStandard },
                  { type: "heat_treated" as const, label: "Heat Treated (ISPM-15)", rate: PACKING_RATES.palletHeatTreated },
                  { type: "euro" as const, label: "Euro Pallet", rate: PACKING_RATES.palletEuro },
                  { type: "custom" as const, label: "Custom", rate: 0 },
                ]).map(({ type, label, rate }) => (
                  <button
                    key={type}
                    onClick={() => updatePacking({ palletType: type })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition-all",
                      p.palletType === type
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                        : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                    )}
                  >
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
                      {rate > 0 ? `₹${rate.toLocaleString()}` : "Custom rate"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Pallet Rate (₹)</label>
                <input
                  type="number"
                  value={p.palletRate || PACKING_RATES.palletStandard}
                  onChange={(e) => updatePacking({ palletRate: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Max Height (mm)</label>
                <input
                  type="number"
                  value={p.maxPalletHeight}
                  onChange={(e) => updatePacking({ maxPalletHeight: parseInt(e.target.value) || 1500 })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Max Weight (kg)</label>
                <input
                  type="number"
                  value={p.maxPalletWeight}
                  onChange={(e) => updatePacking({ maxPalletWeight: parseInt(e.target.value) || 800 })}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wrapping & Protection */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Wrapping & Protection
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Toggle
            checked={p.stretchWrap}
            onChange={(val) => updatePacking({ stretchWrap: val })}
            label="Stretch Wrapping"
            sublabel={`₹${PACKING_RATES.stretchWrap}/pallet`}
          />
          <Toggle
            checked={p.shrinkWrap}
            onChange={(val) => updatePacking({ shrinkWrap: val })}
            label="Shrink Wrapping"
            sublabel="Heat-shrink wrap per pallet"
          />
          <Toggle
            checked={p.strapping}
            onChange={(val) => updatePacking({ strapping: val })}
            label="Strapping"
            sublabel={`₹${PACKING_RATES.strapping}/pallet`}
          />
          <Toggle
            checked={p.cornerProtectors}
            onChange={(val) => updatePacking({ cornerProtectors: val })}
            label="Corner Protectors"
            sublabel={`₹${PACKING_RATES.cornerProtectors}/set`}
          />
          <Toggle
            checked={p.kraftWrapping}
            onChange={(val) => updatePacking({ kraftWrapping: val })}
            label="Kraft Wrapping"
            sublabel={`₹${PACKING_RATES.kraftWrap}/copy`}
          />
          <Toggle
            checked={p.polybagIndividual}
            onChange={(val) => updatePacking({ polybagIndividual: val })}
            label="Individual Polybag"
            sublabel={`₹${PACKING_RATES.polybag}/copy`}
          />
        </div>

        {(p.stretchWrap || p.shrinkWrap || p.polybagIndividual) && (
          <div className="grid grid-cols-3 gap-4 animate-in">
            {p.stretchWrap && (
              <div>
                <label className="label">Stretch Wrap Rate (₹/pallet)</label>
                <input
                  type="number"
                  value={p.stretchWrapRate || PACKING_RATES.stretchWrap}
                  onChange={(e) => updatePacking({ stretchWrapRate: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            )}
            {p.shrinkWrap && (
              <div>
                <label className="label">Shrink Wrap Rate (₹/pallet)</label>
                <input
                  type="number"
                  value={p.shrinkWrapRate || 350}
                  onChange={(e) => updatePacking({ shrinkWrapRate: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                />
              </div>
            )}
            {p.polybagIndividual && (
              <div>
                <label className="label">Polybag Rate (₹/copy)</label>
                <input
                  type="number"
                  value={p.polybagRate || PACKING_RATES.polybag}
                  onChange={(e) => updatePacking({ polybagRate: parseFloat(e.target.value) || 0 })}
                  className="input-field"
                  step="0.1"
                />
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">Banding (copies per pack)</label>
          <input
            type="number"
            value={p.bandingPerPack}
            onChange={(e) => updatePacking({ bandingPerPack: parseInt(e.target.value) || 0 })}
            placeholder="0 = no banding"
            className="input-field w-40"
          />
        </div>
      </div>

      {/* Containerization */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            Containerization
          </h3>
        </div>

        <div>
          <label className="label">Container Loading Method</label>
          <div className="grid grid-cols-3 gap-3">
            {([
              { type: "with_pallets" as const, label: "With Pallets", desc: "Standard palletized loading" },
              { type: "without_pallets" as const, label: "Floor Loaded", desc: "+40% more cartons fit" },
              { type: "none" as const, label: "No Container", desc: "Domestic or ex-works" },
            ]).map(({ type, label, desc }) => (
              <button
                key={type}
                onClick={() => updatePacking({ containerization: type })}
                className={cn(
                  "p-3 rounded-lg border-2 text-left transition-all",
                  p.containerization === type
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                    : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                )}
              >
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</p>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {p.containerization !== "none" && (
          <div className="animate-in">
            <label className="label">Container Type</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: "20ft" as const, label: "20ft FCL", desc: "~10 pallets", pallets: 10 },
                { type: "40ft" as const, label: "40ft FCL", desc: "~20 pallets", pallets: 20 },
                { type: "40ft_hc" as const, label: "40ft HC", desc: "~24 pallets", pallets: 24 },
              ]).map(({ type, label, desc }) => (
                <button
                  key={type}
                  onClick={() => updatePacking({ containerType: type })}
                  className={cn(
                    "p-3 rounded-lg border-2 text-center transition-all",
                    p.containerType === type
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                      : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary"
                  )}
                >
                  <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</p>
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}