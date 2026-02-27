import { useMemo } from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { TRIM_SIZE_PRESETS } from "@/constants";
import { formatNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import { Book, Maximize2, Grid } from "lucide-react";

export function StepBookSpec() {
  const { estimation, updateBookSpec, updateQuantity } = useEstimationStore();
  const { bookSpec, quantities } = estimation;

  const presetOptions = [
    { value: "custom", label: "Custom Size" },
    ...TRIM_SIZE_PRESETS.map((p) => ({
      value: p.label,
      label: p.label,
    })),
  ];

  const presetCategories = useMemo(() => {
    const cats: Record<string, typeof TRIM_SIZE_PRESETS[number][]> = {};
    TRIM_SIZE_PRESETS.forEach((p) => {
      if (!cats[p.category]) cats[p.category] = [];
      cats[p.category].push(p);
    });
    return cats;
  }, []);

  function handlePresetChange(value: string) {
    if (value === "custom") {
      updateBookSpec({ customSize: true, trimSizePreset: "custom" });
      return;
    }
    const preset = TRIM_SIZE_PRESETS.find((p) => p.label === value);
    if (preset) {
      updateBookSpec({
        widthMM: preset.width,
        heightMM: preset.height,
        trimSizePreset: value,
        customSize: false,
        orientation: preset.height > preset.width ? "portrait" : preset.height === preset.width ? "square" : "landscape",
      });
    }
  }

  function handleQuantityChange(index: number, value: string) {
    const num = parseInt(value) || 0;
    const newQuantities = [...quantities];
    newQuantities[index] = num;
    updateQuantities(newQuantities);
  }

  // Book preview dimensions (scaled)
  const maxPreviewSize = 200;
  const scale = Math.min(maxPreviewSize / bookSpec.heightMM, maxPreviewSize / bookSpec.widthMM, 1) * 0.8;
  const previewH = bookSpec.heightMM * scale;
  const previewW = bookSpec.widthMM * scale;

  return (
    <div className="space-y-8 animate-in">
      {/* Trim Size */}
      <div>
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
          <Book className="w-4 h-4 text-primary-500" />
          Trim Size
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Select
              label="Preset Sizes"
              value={bookSpec.customSize ? "custom" : bookSpec.trimSizePreset}
              onChange={handlePresetChange}
              options={presetOptions}
              tip="Choose from standard book sizes"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Width (mm)"
                type="number"
                value={bookSpec.widthMM}
                onChange={(e) => updateBookSpec({ widthMM: parseFloat(e.target.value) || 0, customSize: true })}
                suffix="mm"
              />
              <Input
                label="Height (mm)"
                type="number"
                value={bookSpec.heightMM}
                onChange={(e) => updateBookSpec({ heightMM: parseFloat(e.target.value) || 0, customSize: true })}
                suffix="mm"
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              <span>
                {(bookSpec.widthMM / 25.4).toFixed(2)}" × {(bookSpec.heightMM / 25.4).toFixed(2)}"
              </span>
              <span className="capitalize">({bookSpec.orientation})</span>
            </div>

            {/* Quick Preset Chips */}
            <div>
              <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                Quick Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TRIM_SIZE_PRESETS.slice(0, 12).map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handlePresetChange(p.label)}
                    className={cn(
                      "px-2 py-1 text-[11px] rounded-md border transition-colors",
                      bookSpec.trimSizePreset === p.label
                        ? "bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 text-primary-700 dark:text-primary-400"
                        : "border-surface-light-border dark:border-surface-dark-border text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"
                    )}
                  >
                    {p.width}×{p.height}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Book Preview */}
          <div className="flex items-center justify-center">
            <div className="relative flex items-center justify-center p-8">
              <div
                className="bg-white dark:bg-surface-dark-tertiary border-2 border-gray-300 dark:border-gray-600 rounded-sm shadow-lg transition-all duration-300 relative"
                style={{ width: `${previewW}px`, height: `${previewH}px` }}
              >
                {/* Spine indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-400 dark:bg-gray-500 rounded-l" />
                {/* Page lines */}
                <div className="absolute inset-2 flex flex-col justify-center gap-1.5 opacity-30">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-0.5 bg-gray-400 dark:bg-gray-500 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
                  ))}
                </div>
                {/* Dimension labels */}
                <div className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-mono text-text-light-tertiary dark:text-text-dark-tertiary">
                  {bookSpec.widthMM}mm
                </div>
                <div className="absolute -right-8 top-0 bottom-0 flex items-center">
                  <span className="text-[10px] font-mono text-text-light-tertiary dark:text-text-dark-tertiary transform rotate-90 whitespace-nowrap">
                    {bookSpec.heightMM}mm
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quantities */}
      <div>
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4 flex items-center gap-2">
          <Grid className="w-4 h-4 text-primary-500" />
          Print Quantities (up to 5)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {quantities.map((qty, i) => (
            <Input
              key={i}
              label={`Quantity ${i + 1}${i === 0 ? " *" : ""}`}
              type="number"
              min={0}
              step={100}
              value={qty || ""}
              onChange={(e) => handleQuantityChange(i, e.target.value)}
              placeholder={i === 0 ? "Required" : "Optional"}
            />
          ))}
        </div>
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-2">
          Enter at least one quantity. Multiple quantities allow cost comparison.
        </p>
      </div>
    </div>
  );
}