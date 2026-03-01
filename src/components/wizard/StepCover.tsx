import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { DEFAULT_MACHINES, DEFAULT_PAPER_RATES, STANDARD_PAPER_SIZES } from "@/constants";
import { Square } from "lucide-react";

export function StepCover() {
  const { estimation, updateCover } = useEstimationStore();
  const { cover } = estimation;

  const paperTypes = [...new Set(DEFAULT_PAPER_RATES.map(r => r.paperType))].map(p => ({ value: p, label: p }));
  const machineOptions = DEFAULT_MACHINES.map(m => ({ value: m.id, label: m.name }));
  const sizeOptions = STANDARD_PAPER_SIZES.map(s => ({ value: s.label, label: s.label }));
  const gsmOptions = [130, 150, 170, 200, 250, 300, 350, 400].map(g => ({ value: String(g), label: `${g} GSM` }));

  return (
    <div className="space-y-6 max-w-3xl animate-in">
      <div className="flex items-center gap-4 mb-2">
        <Square className="w-5 h-5 text-primary-500" />
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">Cover Configuration</h3>
      </div>

      <div className="flex items-center gap-6">
        <Toggle checked={cover.separateCover} onChange={(v) => updateCover({ separateCover: v, selfCover: !v })} label="Separate Cover" />
        <Toggle checked={cover.selfCover} onChange={(v) => updateCover({ selfCover: v, separateCover: !v })} label="Self Cover" description="Cover on same paper as text" />
      </div>

      {cover.separateCover && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Input label="Cover Pages" type="number" value={cover.pages} onChange={(e) => updateCover({ pages: parseInt(e.target.value) || 4 })} tip="Usually 4 (front, back, 2 inner)" />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Colors (F)" type="number" min={0} max={6} value={cover.colorsFront} onChange={(e) => updateCover({ colorsFront: parseInt(e.target.value) || 0 })} />
            <Input label="Colors (B)" type="number" min={0} max={6} value={cover.colorsBack} onChange={(e) => updateCover({ colorsBack: parseInt(e.target.value) || 0 })} />
          </div>
          <Select label="Paper Type" value={cover.paperTypeName} onChange={(v) => updateCover({ paperTypeName: v })} options={paperTypes} />
          <Select label="GSM" value={String(cover.gsm)} onChange={(v) => updateCover({ gsm: parseInt(v) })} options={gsmOptions} />
          <Select label="Paper Size" value={cover.paperSizeLabel} onChange={(v) => updateCover({ paperSizeLabel: v })} options={sizeOptions} />
          <Select label="Machine" value={cover.machineId} onChange={(v) => { const m = DEFAULT_MACHINES.find(m => m.id === v); updateCover({ machineId: v, machineName: m?.name || v }); }} options={machineOptions} />
          <Select label="Fold Type" value={cover.foldType} onChange={(v) => updateCover({ foldType: v as any })} options={[
            { value: "wrap_around", label: "Wrap Around" },
            { value: "french_fold", label: "French Fold" },
            { value: "gatefold", label: "Gatefold" },
            { value: "none", label: "None (Flat)" },
          ]} />
        </div>
      )}
    </div>
  );
}