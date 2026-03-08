// ============================================================================
// STEP 3: COVER — Self-cover toggle, fold type, paper, GSM
// ============================================================================

import React from "react";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { SectionCard } from "./shared/SectionCard";
import type { CoverConfig, PaperCategory } from "@/domain/estimation/types";
import { BULK_FACTORS } from "@/domain/estimation/constants";

const COVER_GSMS = [210, 250, 300, 350, 400];
const COVER_PAPERS: { value: PaperCategory; label: string }[] = [
  { value: "ART_CARD", label: "Art Card" },
  { value: "CHROMO", label: "Chromo Art" },
  { value: "BOARD", label: "Board" },
  { value: "MATT_ART", label: "Matt Art" },
  { value: "GLOSS_ART", label: "Gloss Art" },
];

export function StepCover() {
  const { estimation, updateSection, enableSection } = useWizardStore();
  const cover = estimation.sections.find((s) => s.type === "COVER") as CoverConfig | undefined;

  if (!cover) {
    return (
      <div className="text-sm text-gray-500 p-4">
        No cover section configured. Add one from the sections step.
      </div>
    );
  }

  const handleUpdate = (field: string, value: unknown) => {
    if (field === "paperCategory") {
      const cat = value as PaperCategory;
      updateSection(cover.id, {
        paper: {
          ...cover.paper,
          category: cat,
          name: COVER_PAPERS.find((p) => p.value === cat)?.label ?? cat,
          bulkFactor: BULK_FACTORS[cat] ?? 1.2,
        },
      } as any);
    } else if (field === "gsm") {
      updateSection(cover.id, {
        paper: { ...cover.paper, gsm: value as number },
      } as any);
    } else if (field === "foldType") {
      updateSection(cover.id, { foldType: value } as any);
    } else if (field === "selfCover") {
      updateSection(cover.id, { selfCover: value } as any);
    } else if (field.startsWith("colors")) {
      updateSection(cover.id, { [field]: value } as any);
    }
  };

  return (
    <div className="max-w-3xl">
      <SectionCard
        title="Cover"
        subtitle={cover.selfCover ? "Self cover (same stock as text)" : `${cover.paper.gsm}gsm ${cover.paper.name}`}
        icon="📕"
        enabled={cover.enabled}
        onToggle={(enabled) => enableSection(cover.id, enabled)}
      >
        {/* Self cover toggle */}
        <div className="flex items-center gap-3 pb-3 border-b dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cover.selfCover}
              onChange={(e) => handleUpdate("selfCover", e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Self Cover (same paper as text, no separate printing)
            </span>
          </label>
        </div>

        {!cover.selfCover && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <FieldWrapper sectionId={cover.id} fieldName="colorsFront" label="Colors Front">
                <select
                  value={cover.colorsFront}
                  onChange={(e) => handleUpdate("colorsFront", parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value={1}>1 (B&W)</option>
                  <option value={4}>4 (CMYK)</option>
                </select>
              </FieldWrapper>

              <FieldWrapper sectionId={cover.id} fieldName="colorsBack" label="Colors Back">
                <select
                  value={cover.colorsBack}
                  onChange={(e) => handleUpdate("colorsBack", parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value={0}>0 (Blank)</option>
                  <option value={1}>1 (B&W)</option>
                  <option value={4}>4 (CMYK)</option>
                </select>
              </FieldWrapper>

              <FieldWrapper sectionId={cover.id} fieldName="foldType" label="Fold Type">
                <select
                  value={cover.foldType}
                  onChange={(e) => handleUpdate("foldType", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="WRAP_AROUND">Wrap Around</option>
                  <option value="GATEFOLD">Gatefold</option>
                  <option value="FRENCH_FOLD">French Fold</option>
                </select>
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldWrapper sectionId={cover.id} fieldName="paperCategory" label="Paper Type">
                <select
                  value={cover.paper.category}
                  onChange={(e) => handleUpdate("paperCategory", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  {COVER_PAPERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </FieldWrapper>

              <FieldWrapper sectionId={cover.id} fieldName="gsm" label="GSM">
                <select
                  value={cover.paper.gsm}
                  onChange={(e) => handleUpdate("gsm", parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  {COVER_GSMS.map((g) => (
                    <option key={g} value={g}>{g}gsm</option>
                  ))}
                </select>
              </FieldWrapper>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}
