import { useEstimationStore } from "@/stores/estimationStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { DEFAULT_MACHINES, DEFAULT_PAPER_RATES, STANDARD_PAPER_SIZES } from "@/constants";
import { cn } from "@/utils/cn";
import { Type, Plus } from "lucide-react";

export function StepTextSections() {
  const { estimation, updateTextSection } = useEstimationStore();

  const paperTypes = [...new Set(DEFAULT_PAPER_RATES.map(r => r.paperType))].map(p => ({
    value: p, label: p,
  }));

  const machineOptions = DEFAULT_MACHINES.map(m => ({ value: m.id, label: m.name }));
  const sizeOptions = STANDARD_PAPER_SIZES.map(s => ({ value: s.label, label: s.label }));
  const gsmOptions = [60,70,80,90,100,110,120,130,140,150,170,200,250,300].map(g => ({ value: String(g), label: `${g} GSM` }));

  return (
    <div className="space-y-8 animate-in">
      {estimation.textSections.map((section, index) => (
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
                onChange={(v) => updateTextSection(index, { paperTypeName: v })}
                options={paperTypes}
              />
              <Select
                label="GSM"
                value={String(section.gsm)}
                onChange={(v) => updateTextSection(index, { gsm: parseInt(v) })}
                options={gsmOptions}
              />
              <Select
                label="Paper Size"
                value={section.paperSizeLabel}
                onChange={(v) => updateTextSection(index, { paperSizeLabel: v })}
                options={sizeOptions}
              />
              <Select
                label="Machine"
                value={section.machineId}
                onChange={(v) => {
                  const machine = DEFAULT_MACHINES.find(m => m.id === v);
                  updateTextSection(index, { machineId: v, machineName: machine?.name || v });
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
          )}
        </div>
      ))}
    </div>
  );
}