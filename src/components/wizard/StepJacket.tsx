import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useMachineStore } from "@/stores/machineStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { STANDARD_PAPER_SIZES } from "@/constants";
import { Layers, Info } from "lucide-react";

export function StepJacket() {
  const { estimation, updateJacket } = useEstimationStore();
  const { paperRates } = useRateCardStore();
  const { getActiveMachines } = useMachineStore();
  const { jacket } = estimation;

  // Paper options from rate card
  const activePaperRates = paperRates.filter(r => r.status === "active");
  const paperTypes = [...new Set(activePaperRates.map(r => r.paperType))].map(p => ({ value: p, label: p }));

  // Size options
  const getSizeOptions = () => {
    const sizesForPaper = [...new Set(
      activePaperRates
        .filter(r => r.paperType === jacket.paperTypeName)
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
            Jacket options from your Rate Card.
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-primary-500" />
          <div>
            <h3 className="font-semibold">Dust Jacket</h3>
            <p className="text-xs text-text-light-tertiary">Optional — typically used with hardcase binding</p>
          </div>
        </div>
        <Toggle checked={jacket.enabled} onChange={(v) => updateJacket({ enabled: v })} label="Enable Jacket" />
      </div>

      {jacket.enabled && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Input 
                label="Colors (F)" 
                type="number" 
                min={0} 
                max={6} 
                value={jacket.colorsFront} 
                onChange={(e) => updateJacket({ colorsFront: parseInt(e.target.value) || 0 })} 
              />
              <Input 
                label="Colors (B)" 
                type="number" 
                min={0} 
                max={6} 
                value={jacket.colorsBack} 
                onChange={(e) => updateJacket({ colorsBack: parseInt(e.target.value) || 0 })} 
              />
            </div>
            <Select 
              label="Paper Type" 
              value={jacket.paperTypeName} 
              onChange={(v) => updateJacket({ paperTypeName: v })} 
              options={paperTypes} 
            />
            <Select 
              label="GSM" 
              value={String(jacket.gsm)} 
              onChange={(v) => updateJacket({ gsm: parseInt(v) })} 
              options={[100, 115, 130, 150, 170].map(g => ({ value: String(g), label: `${g} GSM` }))} 
            />
            <Select 
              label="Paper Size" 
              value={jacket.paperSizeLabel} 
              onChange={(v) => updateJacket({ paperSizeLabel: v })} 
              options={getSizeOptions()} 
            />
            <Select 
              label="Machine" 
              value={jacket.machineId} 
              onChange={(v) => { 
                const m = activeMachines.find(m => m.id === v); 
                updateJacket({ machineId: v, machineName: m?.nickname || m?.name || v }); 
              }} 
              options={machineOptions.length > 0 ? machineOptions : [{ value: jacket.machineId, label: jacket.machineName || jacket.machineId }]} 
            />
            <Input 
              label="Flap Width (mm)" 
              type="number" 
              value={jacket.flapWidth} 
              onChange={(e) => updateJacket({ flapWidth: parseInt(e.target.value) || 90 })} 
            />
            <Input 
              label="Extra Jackets (%)" 
              type="number" 
              value={jacket.extraJacketsPercent} 
              onChange={(e) => updateJacket({ extraJacketsPercent: parseInt(e.target.value) || 0 })} 
            />
          </div>
          
          {/* Finishing Options */}
          <div className="flex flex-wrap items-center gap-6">
            <Select 
              label="Lamination" 
              value={jacket.laminationType} 
              onChange={(v) => updateJacket({ laminationType: v })} 
              options={[
                { value: "none", label: "None" }, 
                { value: "gloss", label: "Gloss BOPP" },
                { value: "matt", label: "Matt BOPP" }, 
                { value: "velvet", label: "Velvet / Soft Touch" },
              ]} 
              className="w-48" 
            />
            <Toggle checked={jacket.spotUV} onChange={(v) => updateJacket({ spotUV: v })} label="Spot UV" size="sm" />
            <Toggle checked={jacket.goldBlockingFront} onChange={(v) => updateJacket({ goldBlockingFront: v })} label="Gold Blocking (Front)" size="sm" />
            <Toggle checked={jacket.goldBlockingSpine} onChange={(v) => updateJacket({ goldBlockingSpine: v })} label="Gold Blocking (Spine)" size="sm" />
          </div>

          {/* Jacket Preview */}
          <div className="mt-4 p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
            <p className="text-xs font-medium mb-3">Jacket Preview</p>
            <div className="flex items-center justify-center h-24">
              <div className="flex items-stretch h-16 text-[9px] text-center">
                <div className="border border-dashed border-gray-300 dark:border-gray-600 px-3 flex items-center rounded-l bg-gray-50 dark:bg-gray-800">
                  Flap ({jacket.flapWidth}mm)
                </div>
                <div className="border-y border-gray-300 dark:border-gray-600 px-4 flex items-center bg-blue-50 dark:bg-blue-900/20">
                  Back Cover
                </div>
                <div className="border-y border-gray-400 dark:border-gray-500 px-1 flex items-center bg-gray-100 dark:bg-gray-700 font-bold">
                  Spine
                </div>
                <div className="border-y border-gray-300 dark:border-gray-600 px-4 flex items-center bg-blue-50 dark:bg-blue-900/20">
                  Front Cover
                </div>
                <div className="border border-dashed border-gray-300 dark:border-gray-600 px-3 flex items-center rounded-r bg-gray-50 dark:bg-gray-800">
                  Flap ({jacket.flapWidth}mm)
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

