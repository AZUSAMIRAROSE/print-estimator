// ============================================================================
// STEP 5: ENDLEAVES — Endpapers with pages, GSM, color
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { SectionCard } from "./shared/SectionCard";


export function StepEndleaves() {
  const { estimation, updateSection, enableSection, addSection } = useWizardStore();
  const endleaves = estimation.sections.find((s) => s.type === "ENDLEAVES");

  const handleEnable = (enabled: boolean) => {
    if (enabled && !endleaves) {
      addSection({
        id: "endleaves",
        type: "ENDLEAVES",
        label: "Endleaves",
        enabled: true,
        pages: 8,
        colorsFront: 0,
        colorsBack: 0,
        paper: {
          code: "woodfree_120",
          name: "Woodfree",
          category: "WOODFREE",
          gsm: 120,
          bulkFactor: 1.4,
          caliper_microns: 176.4,
          grain: "LONG_GRAIN",
        },
      });
    } else if (endleaves) {
      enableSection(endleaves.id, enabled);
    }
  };

  return (
    <div className="max-w-3xl">
      <SectionCard
        title="Endleaves (Endpapers)"
        subtitle={endleaves?.enabled ? `${endleaves.pages}pp · ${endleaves.paper.gsm}gsm` : "Not included"}
        icon="📑"
        enabled={endleaves?.enabled ?? false}
        onToggle={handleEnable}
      >
        {endleaves && (
          <div className="grid grid-cols-3 gap-4">
            <FieldWrapper sectionId="endleaves" fieldName="pages" label="Pages">
              <select
                value={endleaves.pages}
                onChange={(e) => updateSection("endleaves", { pages: parseInt(e.target.value) } as any)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                <option value={4}>4pp (front only)</option>
                <option value={8}>8pp (front + back)</option>
              </select>
            </FieldWrapper>

            <FieldWrapper sectionId="endleaves" fieldName="gsm" label="GSM">
              <select
                value={endleaves.paper.gsm}
                onChange={(e) => updateSection("endleaves", {
                  paper: { ...endleaves.paper, gsm: parseInt(e.target.value) },
                } as any)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                {[80, 100, 120, 140, 150].map((g) => (
                  <option key={g} value={g}>{g}gsm</option>
                ))}
              </select>
            </FieldWrapper>

            <FieldWrapper sectionId="endleaves" fieldName="color" label="Color">
              <select
                value={endleaves.colorsFront}
                onChange={(e) => {
                  const c = parseInt(e.target.value);
                  updateSection("endleaves", { colorsFront: c, colorsBack: c } as any);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              >
                <option value={0}>Plain (unprinted)</option>
                <option value={1}>1 color</option>
                <option value={4}>4 color (CMYK)</option>
              </select>
            </FieldWrapper>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
