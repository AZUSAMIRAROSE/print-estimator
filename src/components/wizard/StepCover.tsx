import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useMachineStore } from "@/stores/machineStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { STANDARD_PAPER_SIZES } from "@/constants";
import { Square, Info } from "lucide-react";

export function StepCover() {
  const { estimation, updateCover } = useEstimationStore();
  const { cover } = estimation;
  const { paperRates } = useRateCardStore();
  const { getActiveMachines } = useMachineStore();

  // Paper options from rate card
  const activePaperRates = paperRates.filter(r => r.status === "active");
  const paperTypes = [...new Set(activePaperRates.map(r => r.paperType))].map(p => ({ value: p, label: p }));

  // GSM options
  const getGsmOptions = () => {
    const gsms = [...new Set(activePaperRates.map(r => r.gsm))].sort((a, b) => a - b);
    if (gsms.length > 0) return gsms.map(g => ({ value: String(g), label: `${g} GSM` }));
    return [130, 150, 170, 200, 250, 300, 350, 400].map(g => ({ value: String(g), label: `${g} GSM` }));
  };

  // Size options
  const getSizeOptions = () => {
    const sizesForPaper = [...new Set(
      activePaperRates
        .filter(r => r.paperType === cover.paperTypeName && r.gsm === cover.gsm)
        .map(r => r.size)
    )];
    if (sizesForPaper.length > 0) {
      return sizesForPaper.map(s => ({ value: s, label: s }));
    }
    return STANDARD_PAPER_SIZES.map(s => ({ value: s.label, label: s.label }));
  };

  // Machine options
  const activeMachines = getActiveMachines();
  const machineOptions = activeMachines.length > 0
    ? activeMachines.map(m => ({ value: m.id, label: m.nickname || m.name }))
    : [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Info */}
      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Rate Card Connected</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
            Cover options from your Rate Card and Machine Store.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Square className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold">Cover Configuration</h3>
      </div>

      {/* Cover Type */}
      <div className="flex items-center gap-6">
        <Toggle 
          checked={cover.separateCover} 
          onChange={(v) => updateCover({ separateCover: v, selfCover: !v })} 
          label="Separate Cover" 
        />
        <Toggle 
          checked={cover.selfCover} 
          onChange={(v) => updateCover({ selfCover: v, separateCover: !v })} 
          label="Self Cover" 
        />
      </div>

      {cover.separateCover && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Input 
            label="Cover Pages" 
            type="number" 
            value={cover.pages} 
            onChange={(e) => updateCover({ pages: parseInt(e.target.value) || 4 })} 
          />
          <div className="grid grid-cols-2 gap-2">
            <Input 
              label="Colors (F)" 
              type="number" 
              min={0} 
              max={6} 
              value={cover.colorsFront} 
              onChange={(e) => updateCover({ colorsFront: parseInt(e.target.value) || 0 })} 
            />
            <Input 
              label="Colors (B)" 
              type="number" 
              min={0} 
              max={6} 
              value={cover.colorsBack} 
              onChange={(e) => updateCover({ colorsBack: parseInt(e.target.value) || 0 })} 
            />
          </div>
          <Select
            label="Paper Type"
            value={cover.paperTypeName}
            onChange={(v) => updateCover({ paperTypeName: v })}
            options={paperTypes}
          />
          <Select
            label="GSM"
            value={String(cover.gsm)}
            onChange={(v) => updateCover({ gsm: parseInt(v) })}
            options={getGsmOptions()}
          />
          <Select
            label="Paper Size"
            value={cover.paperSizeLabel}
            onChange={(v) => updateCover({ paperSizeLabel: v })}
            options={getSizeOptions()}
          />
          <Select
            label="Machine"
            value={cover.machineId}
            onChange={(v) => {
              const m = activeMachines.find(m => m.id === v);
              updateCover({ machineId: v, machineName: m?.nickname || m?.name || v });
            }}
            options={machineOptions.length > 0 ? machineOptions : [{ value: cover.machineId, label: cover.machineName || cover.machineId }]}
          />
          <Select 
            label="Fold Type" 
            value={cover.foldType} 
            onChange={(v) => updateCover({ foldType: v as any })} 
            options={[
              { value: "wrap_around", label: "Wrap Around" },
              { value: "french_fold", label: "French Fold" },
              { value: "gatefold", label: "Gatefold" },
              { value: "none", label: "None (Flat)" },
            ]} 
          />
        </div>
      )}
    </div>
  );
}

