import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { DEFAULT_MACHINES, STANDARD_PAPER_SIZES, DEFAULT_PAPER_RATES } from "@/constants";
import { Layers } from "lucide-react";

export function StepJacket() {
  const { estimation, updateJacket } = useEstimationStore();
  const { jacket } = estimation;

  const paperTypes = [...new Set(DEFAULT_PAPER_RATES.map(r => r.paperType))].map(p => ({ value: p, label: p }));
  const machineOptions = DEFAULT_MACHINES.map(m => ({ value: m.id, label: m.name }));
  const sizeOptions = STANDARD_PAPER_SIZES.map(s => ({ value: s.label, label: s.label }));

  return (
    <div className="space-y-6 max-w-3xl animate-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-5 h-5 text-primary-500" />
          <div>
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">Dust Jacket</h3>
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Optional — typically used with hardcase binding</p>
          </div>
        </div>
        <Toggle checked={jacket.enabled} onChange={(v) => updateJacket({ enabled: v })} label="Enable Jacket" />
      </div>

      {jacket.enabled && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Input label="Colors (F)" type="number" min={0} max={6} value={jacket.colorsFront} onChange={(e) => updateJacket({ colorsFront: parseInt(e.target.value) || 0 })} />
              <Input label="Colors (B)" type="number" min={0} max={6} value={jacket.colorsBack} onChange={(e) => updateJacket({ colorsBack: parseInt(e.target.value) || 0 })} />
            </div>
            <Select label="Paper Type" value={jacket.paperTypeName} onChange={(v) => updateJacket({ paperTypeName: v })} options={paperTypes} />
            <Select label="GSM" value={String(jacket.gsm)} onChange={(v) => updateJacket({ gsm: parseInt(v) })} options={[100, 115, 130, 150, 170].map(g => ({ value: String(g), label: `${g} GSM` }))} />
            <Select label="Paper Size" value={jacket.paperSizeLabel} onChange={(v) => updateJacket({ paperSizeLabel: v })} options={sizeOptions} />
            <Select label="Machine" value={jacket.machineId} onChange={(v) => { const m = DEFAULT_MACHINES.find(m => m.id === v); updateJacket({ machineId: v, machineName: m?.name || v }); }} options={machineOptions} />
            <Input label="Flap Width (mm)" type="number" value={jacket.flapWidth} onChange={(e) => updateJacket({ flapWidth: parseInt(e.target.value) || 90 })} suffix="mm" />
            <Input label="Extra Jackets (%)" type="number" value={jacket.extraJacketsPercent} onChange={(e) => updateJacket({ extraJacketsPercent: parseInt(e.target.value) || 0 })} suffix="%" tip="5% is standard for overs" />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Select label="Lamination" value={jacket.laminationType} onChange={(v) => updateJacket({ laminationType: v })} options={[
              { value: "none", label: "None" }, { value: "gloss", label: "Gloss BOPP" },
              { value: "matt", label: "Matt BOPP" }, { value: "velvet", label: "Velvet / Soft Touch" },
            ]} className="w-48" />
            <Toggle checked={jacket.spotUV} onChange={(v) => updateJacket({ spotUV: v })} label="Spot UV" size="sm" />
            <Toggle checked={jacket.goldBlockingFront} onChange={(v) => updateJacket({ goldBlockingFront: v })} label="Gold Blocking (Front)" size="sm" />
            <Toggle checked={jacket.goldBlockingSpine} onChange={(v) => updateJacket({ goldBlockingSpine: v })} label="Gold Blocking (Spine)" size="sm" />
          </div>

          {/* Jacket Preview */}
          <div className="mt-4 p-4 rounded-xl bg-surface-light-secondary dark:bg-surface-dark-tertiary">
            <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-3">Jacket Preview</p>
            <div className="flex items-center justify-center h-24">
              <div className="flex items-stretch h-16 text-[9px] text-center text-text-light-tertiary dark:text-text-dark-tertiary">
                <div className="border border-dashed border-gray-300 dark:border-gray-600 px-3 flex items-center rounded-l bg-gray-50 dark:bg-gray-800">
                  Flap ({jacket.flapWidth}mm)
                </div>
                <div className="border-y border-gray-300 dark:border-gray-600 px-4 flex items-center bg-blue-50 dark:bg-blue-900/20">
                  Back Cover
                </div>
                <div className="border border-gray-400 dark:border-gray-500 px-1 flex items-center bg-gray-100 dark:bg-gray-700 font-bold">
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