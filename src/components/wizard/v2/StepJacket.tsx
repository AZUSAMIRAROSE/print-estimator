// ============================================================================
// STEP 4: JACKET — Dust jacket with flaps, colors, paper
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { SectionCard } from "./shared/SectionCard";
import type { JacketConfig } from "@/domain/estimation/types";

export function StepJacket() {
  const { estimation, updateSection, enableSection, addSection } = useWizardStore();
  const jacket = estimation.sections.find((s) => s.type === "JACKET") as JacketConfig | undefined;

  const handleEnable = (enabled: boolean) => {
    if (enabled && !jacket) {
      addSection({
        id: "jacket",
        type: "JACKET",
        label: "Dust Jacket",
        enabled: true,
        pages: 2,
        colorsFront: 4,
        colorsBack: 0,
        flapWidth_mm: 80,
        paper: {
          code: "gloss_130",
          name: "Gloss Art Paper",
          category: "GLOSS_ART",
          gsm: 130,
          bulkFactor: 0.9,
          caliper_microns: 123,
          grain: "LONG_GRAIN",
        },
      } as JacketConfig);
    } else if (!enabled && jacket) {
      enableSection(jacket.id, false);
    } else if (enabled && jacket) {
      enableSection(jacket.id, true);
    }
  };

  return (
    <div className="max-w-3xl">
      <SectionCard
        title="Dust Jacket"
        subtitle={jacket?.enabled ? `${jacket.paper.gsm}gsm, ${jacket.flapWidth_mm}mm flaps` : "Not included"}
        icon="🧥"
        enabled={jacket?.enabled ?? false}
        onToggle={handleEnable}
      >
        {jacket && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <FieldWrapper sectionId="jacket" fieldName="colorsFront" label="Colors Front">
                <select
                  value={jacket.colorsFront}
                  onChange={(e) => updateSection("jacket", { colorsFront: parseInt(e.target.value) } as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value={4}>4 (CMYK)</option>
                  <option value={1}>1 (B&W)</option>
                </select>
              </FieldWrapper>

              <FieldWrapper sectionId="jacket" fieldName="colorsBack" label="Colors Back">
                <select
                  value={jacket.colorsBack}
                  onChange={(e) => updateSection("jacket", { colorsBack: parseInt(e.target.value) } as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value={0}>0 (Blank)</option>
                  <option value={1}>1</option>
                  <option value={4}>4 (CMYK)</option>
                </select>
              </FieldWrapper>

              <FieldWrapper sectionId="jacket" fieldName="flapWidth" label="Flap Width (mm)">
                <input
                  type="number"
                  value={jacket.flapWidth_mm}
                  onChange={(e) => updateSection("jacket", { flapWidth_mm: parseInt(e.target.value) || 80 } as any)}
                  min={50}
                  max={200}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
                />
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldWrapper sectionId="jacket" fieldName="gsm" label="GSM">
                <select
                  value={jacket.paper.gsm}
                  onChange={(e) => updateSection("jacket", {
                    paper: { ...jacket.paper, gsm: parseInt(e.target.value) },
                  } as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  {[100, 115, 128, 130, 150, 170].map((g) => (
                    <option key={g} value={g}>{g}gsm</option>
                  ))}
                </select>
              </FieldWrapper>

              <FieldWrapper sectionId="jacket" fieldName="paperType" label="Paper Type">
                <select
                  value={jacket.paper.category}
                  onChange={(e) => updateSection("jacket", {
                    paper: { ...jacket.paper, category: e.target.value },
                  } as any)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="GLOSS_ART">Gloss Art</option>
                  <option value="MATT_ART">Matt Art</option>
                </select>
              </FieldWrapper>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
