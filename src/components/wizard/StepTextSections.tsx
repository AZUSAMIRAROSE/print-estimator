import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useMachineStore } from "@/stores/machineStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { DEFAULT_MACHINES, STANDARD_PAPER_SIZES } from "@/constants";
import { cn } from "@/utils/cn";
import { Type, Info } from "lucide-react";

export function StepTextSections() {
  const { estimation, updateTextSection } = useEstimationStore();
  const { paperRates } = useRateCardStore();
  const { getActiveMachines } = useMachineStore();

  // Build paper type options from live rate card store data
  const activePaperRates = paperRates.filter(r => r.status === "active");
  const paperTypes = [...new Set(activePaperRates.map(r => r.paperType))].map(p => ({
    value: p, label: p,
  }));

  // Build GSM options dynamically from rate card for the selected paper type
  const getGsmOptionsForPaper = (paperTypeName: string) => {
    const gsmsForType = [...new Set(
      activePaperRates
        .filter(r => r.paperType === paperTypeName)
        .map(r => r.gsm)
    )].sort((a, b) => a - b);

    if (gsmsForType.length > 0) {
      return gsmsForType.map(g => ({ value: String(g), label: `${g} GSM` }));
    }
    // Fallback to standard GSMs
    return [60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 170, 200, 250, 300].map(g => ({
      value: String(g), label: `${g} GSM`,
    }));
  };

  // Build paper size options from rate card — show sizes that have rates defined
  const getSizeOptionsForPaper = (paperTypeName: string, gsm: number) => {
    const sizesForPaper = [...new Set(
      activePaperRates
        .filter(r => r.paperType === paperTypeName && r.gsm === gsm)
        .map(r => r.size)
    )];

    if (sizesForPaper.length > 0) {
      // Map to standard paper sizes format
      const mapped = sizesForPaper.map(s => {
        const std = STANDARD_PAPER_SIZES.find(ps => ps.label === s || ps.label.replace("×", "x") === s);
        return { value: std?.label || s, label: std?.label || s };
      });
      // Also include standard sizes not in rates as fallback
      const stdOptions = STANDARD_PAPER_SIZES
        .filter(s => !mapped.some(m => m.value === s.label))
        .map(s => ({ value: s.label, label: `${s.label} (no rate)` }));
      return [...mapped, ...stdOptions];
    }
    return STANDARD_PAPER_SIZES.map(s => ({ value: s.label, label: s.label }));
  };

  // Machine options: prefer live machine store, fallback to DEFAULT_MACHINES
  const activeMachines = getActiveMachines();
  const machineOptions = activeMachines.length > 0
    ? activeMachines.map(m => ({ value: m.id, label: m.nickname || m.name }))
    : DEFAULT_MACHINES.map(m => ({ value: m.id, label: m.name }));

  // Find the rate for a given paper+gsm+size combo
  const getRateInfo = (paperTypeName: string, gsm: number, sizeLabel: string) => {
    const rate = activePaperRates.find(
      r => r.paperType === paperTypeName && r.gsm === gsm &&
        (r.size === sizeLabel || r.size === sizeLabel.replace("×", "x"))
    );
    return rate;
  };

  return (
    <div className="space-y-8 animate-in">
      {/* Rate Card Connection Info */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Connected to Rate Card</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            Paper types, GSM options, and rates are pulled live from your Rate Card ({activePaperRates.length} active rates).
            Changes in Rate Card are immediately reflected here.
          </p>
        </div>
      </div>

      {estimation.textSections.map((section, index) => {
        const rateInfo = getRateInfo(section.paperTypeName, section.gsm, section.paperSizeLabel);

        return (
          <div key={section.id} className={cn(
            "p-5 rounded-xl border transition-all",
            section.enabled
              ? "border-primary-200 dark:border-primary-500/20 bg-primary-50/30 dark:bg-primary-500/5"
              : "border-surface-light-border dark:border-surface-dark-border opacity-60"
          )}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Type className="w-5 h-5 text-primary-500" />
                <h4 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {section.label}
                </h4>
              </div>
              {index > 0 && (
                <Toggle
                  checked={section.enabled}
                  onChange={(enabled) => updateTextSection(index, { enabled })}
                  label="Enable"
                  size="sm"
                />
              )}
            </div>

            {section.enabled && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    label="Pages"
                    type="number"
                    min={4}
                    step={4}
                    value={section.pages}
                    onChange={(e) => updateTextSection(index, { pages: parseInt(e.target.value) || 0 })}
                    tip="Must be divisible by 4"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      label="Colors (F)"
                      type="number"
                      min={0}
                      max={6}
                      value={section.colorsFront}
                      onChange={(e) => updateTextSection(index, { colorsFront: parseInt(e.target.value) || 0 })}
                    />
                    <Input
                      label="Colors (B)"
                      type="number"
                      min={0}
                      max={6}
                      value={section.colorsBack}
                      onChange={(e) => updateTextSection(index, { colorsBack: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <Select
                    label="Paper Type"
                    value={section.paperTypeName}
                    onChange={(v) => {
                      // When paper type changes, update the code too and reset GSM to first available
                      const matchingRate = activePaperRates.find(r => r.paperType === v);
                      updateTextSection(index, {
                        paperTypeName: v,
                        paperTypeId: matchingRate?.code || v,
                      });
                    }}
                    options={paperTypes}
                  />
                  <Select
                    label="GSM"
                    value={String(section.gsm)}
                    onChange={(v) => updateTextSection(index, { gsm: parseInt(v) })}
                    options={getGsmOptionsForPaper(section.paperTypeName)}
                  />
                  <Select
                    label="Paper Size"
                    value={section.paperSizeLabel}
                    onChange={(v) => updateTextSection(index, { paperSizeLabel: v })}
                    options={getSizeOptionsForPaper(section.paperTypeName, section.gsm)}
                  />
                  <Select
                    label="Machine"
                    value={section.machineId}
                    onChange={(v) => {
                      const machine = activeMachines.find(m => m.id === v) ||
                        DEFAULT_MACHINES.find(m => m.id === v);
                      updateTextSection(index, {
                        machineId: v,
                        machineName: machine ? ('nickname' in machine ? (machine as any).nickname || machine.name : machine.name) : v
                      });
                    }}
                    options={machineOptions}
                    tip="Printing press for this section"
                  />
                  <Select
                    label="Print Method"
                    value={section.printingMethod}
                    onChange={(v) => updateTextSection(index, { printingMethod: v as any })}
                    options={[
                      { value: "sheetwise", label: "Sheetwise" },
                      { value: "work_and_turn", label: "Work & Turn" },
                      { value: "work_and_tumble", label: "Work & Tumble" },
                      { value: "perfector", label: "Perfector" },
                    ]}
                  />
                </div>

                {/* Live Rate Card Preview */}
                {rateInfo && (
                  <div className="mt-3 p-3 rounded-lg bg-white dark:bg-surface-dark-secondary border border-surface-light-border dark:border-surface-dark-border">
                    <p className="text-[10px] font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-1.5">
                      Rate Card Data (Live)
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Landed Cost: </span>
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">₹{rateInfo.landedCost.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Charge Rate: </span>
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">₹{rateInfo.chargeRate.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Rate/Kg: </span>
                        <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">₹{rateInfo.ratePerKg}</span>
                      </div>
                      <div>
                        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Margin: </span>
                        <span className={cn("font-semibold", rateInfo.marginPercent > 0 ? "text-green-600 dark:text-green-400" : "text-text-light-primary dark:text-text-dark-primary")}>
                          {rateInfo.marginPercent}%
                        </span>
                      </div>
                      {rateInfo.supplier && (
                        <div>
                          <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Supplier: </span>
                          <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">{rateInfo.supplier || "—"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!rateInfo && section.paperTypeName && section.gsm > 0 && (
                  <div className="mt-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      ⚠ No rate found in Rate Card for {section.paperTypeName} {section.gsm}gsm {section.paperSizeLabel}.
                      The calculator will use default rates. Add this combination to your Rate Card for precise pricing.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}