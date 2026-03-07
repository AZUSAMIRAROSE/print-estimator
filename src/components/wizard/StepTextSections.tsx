import React, { useMemo } from "react";
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

  // Paper types from rate card
  const activePaperRates = paperRates.filter(r => r.status === "active");
  const paperTypes = [...new Set(activePaperRates.map(r => r.paperType))].map(p => ({
    value: p, label: p,
  }));

  // GSM options for selected paper type
  const getGsmOptions = (paperTypeName: string) => {
    const gsms = [...new Set(
      activePaperRates
        .filter(r => r.paperType === paperTypeName)
        .map(r => r.gsm)
    )].sort((a, b) => a - b);
    if (gsms.length > 0) return gsms.map(g => ({ value: String(g), label: `${g} GSM` }));
    return [60, 70, 80, 90, 100, 120, 130, 150, 170, 200, 250, 300].map(g => ({ value: String(g), label: `${g} GSM` }));
  };

  // Paper size options
  const getSizeOptions = (paperTypeName: string, gsm: number) => {
    const sizes = [...new Set(
      activePaperRates
        .filter(r => r.paperType === paperTypeName && r.gsm === gsm)
        .map(r => r.size)
    )];
    if (sizes.length > 0) {
      return sizes.map(s => ({ value: s, label: s }));
    }
    return STANDARD_PAPER_SIZES.map(s => ({ value: s.label, label: s.label }));
  };

  // Machine options
  const activeMachines = getActiveMachines();
  const machineOptions = activeMachines.length > 0
    ? activeMachines.map(m => ({ value: m.id, label: m.nickname || m.name }))
    : DEFAULT_MACHINES.map(m => ({ value: m.id, label: m.name }));

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Rate Card Connected</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            {activePaperRates.length} paper rates available. Select paper type and GSM.
          </p>
        </div>
      </div>

      {estimation.textSections.map((section, index) => (
        <div key={section.id} className={cn(
          "p-5 rounded-xl border",
          section.enabled
            ? "border-primary-200 dark:border-primary-500/20 bg-primary-50/30 dark:bg-primary-500/5"
            : "border-surface-light-border dark:border-surface-dark-border opacity-60"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Type className="w-5 h-5 text-primary-500" />
              <h4 className="font-semibold">{section.label}</h4>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Pages"
                type="number"
                min={4}
                step={4}
                value={section.pages}
                onChange={(e) => updateTextSection(index, { pages: parseInt(e.target.value) || 0 })}
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
                onChange={(v) => updateTextSection(index, { paperTypeName: v })}
                options={paperTypes}
              />
              <Select
                label="GSM"
                value={String(section.gsm)}
                onChange={(v) => updateTextSection(index, { gsm: parseInt(v) })}
                options={getGsmOptions(section.paperTypeName)}
              />
              <Select
                label="Paper Size"
                value={section.paperSizeLabel}
                onChange={(v) => updateTextSection(index, { paperSizeLabel: v })}
                options={getSizeOptions(section.paperTypeName, section.gsm)}
              />
              <Select
                label="Machine"
                value={section.machineId}
                onChange={(v) => {
                  const machine = activeMachines.find(m => m.id === v) || DEFAULT_MACHINES.find(m => m.id === v);
                  updateTextSection(index, { machineId: v, machineName: machine?.name || v });
                }}
                options={machineOptions}
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
          )}
        </div>
      ))}
    </div>
  );
}

