// ============================================================================
// STEP 2: TEXT SECTIONS — Paper, GSM, colors, sheet/machine selection
// ============================================================================

import React, { useCallback } from "react";
import { useWizardStore, useSectionMeta } from "@/domain/estimation/wizardStore";
import { FieldWrapper } from "./shared/FieldWrapper";
import { SectionCard } from "./shared/SectionCard";
import { BULK_FACTORS, STANDARD_SHEETS, MACHINE_DATABASE } from "@/domain/estimation/constants";
import type { PaperCategory, AnySectionConfig } from "@/domain/estimation/types";

const PAPER_CATEGORIES: { value: PaperCategory; label: string }[] = [
  { value: "MATT_ART", label: "Matt Art Paper" },
  { value: "GLOSS_ART", label: "Gloss Art Paper" },
  { value: "WOODFREE", label: "Woodfree (CW)" },
  { value: "BULKY_WOODFREE", label: "Holmen Bulky (HB)" },
  { value: "BIBLE", label: "Bible Paper" },
  { value: "NEWSPRINT", label: "Newsprint" },
  { value: "CUSTOM", label: "Custom Paper" },
];

const COMMON_GSMS = [60, 70, 80, 90, 100, 115, 120, 128, 130, 150, 170, 200];

export function StepTextSections() {
  const { estimation, updateSection, enableSection, addSection, removeSection } = useWizardStore();
  const textSections = estimation.sections.filter((s) => s.type === "TEXT");

  const handleFieldChange = useCallback(
    (sectionId: string, field: string, value: unknown) => {
      const section = estimation.sections.find((s) => s.id === sectionId);
      if (!section) return;

      if (field === "pages" || field === "colorsFront" || field === "colorsBack") {
        updateSection(sectionId, { [field]: value } as any);
      } else if (field === "paperCategory") {
        const cat = value as PaperCategory;
        const bulk = BULK_FACTORS[cat] ?? 1.0;
        updateSection(sectionId, {
          paper: {
            ...section.paper,
            category: cat,
            name: PAPER_CATEGORIES.find((p) => p.value === cat)?.label ?? cat,
            bulkFactor: bulk,
          },
        } as any);
      } else if (field === "gsm") {
        const gsm = value as number;
        const bulk = section.paper.bulkFactor;
        updateSection(sectionId, {
          paper: {
            ...section.paper,
            gsm,
            caliper_microns: gsm * bulk * 1.05,
          },
        } as any);
      } else if (field === "preferredSheet") {
        updateSection(sectionId, { preferredSheet: value as string } as any);
      } else if (field === "preferredMachine") {
        updateSection(sectionId, { preferredMachine: value as string } as any);
      }
    },
    [estimation.sections, updateSection],
  );

  const handleAddSection = () => {
    const newSection: AnySectionConfig = {
      id: `text${textSections.length + 1}`,
      type: "TEXT",
      label: `Text Section ${textSections.length + 1}`,
      enabled: true,
      pages: 0,
      colorsFront: 4,
      colorsBack: 4,
      paper: {
        code: "matt_130",
        name: "Matt Art Paper",
        category: "MATT_ART",
        gsm: 130,
        bulkFactor: 1.0,
        caliper_microns: 136.5,
        grain: "LONG_GRAIN",
      },
    };
    addSection(newSection);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {textSections.map((section) => (
        <TextSectionForm
          key={section.id}
          section={section}
          onFieldChange={handleFieldChange}
          onToggle={(enabled) => enableSection(section.id, enabled)}
          onRemove={() => removeSection(section.id)}
        />
      ))}

      {textSections.length < 3 && (
        <button
          type="button"
          onClick={handleAddSection}
          className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Add Text Section
        </button>
      )}
    </div>
  );
}

function TextSectionForm({
  section,
  onFieldChange,
  onToggle,
  onRemove,
}: {
  section: AnySectionConfig;
  onFieldChange: (id: string, field: string, value: unknown) => void;
  onToggle: (enabled: boolean) => void;
  onRemove?: () => void;
}) {
  const sectionMeta = useSectionMeta(section.id);

  return (
    <SectionCard
      title={section.label}
      subtitle={section.pages > 0 ? `${section.pages} pages · ${section.paper.gsm}gsm ${section.paper.name}` : undefined}
      icon="📄"
      enabled={section.enabled}
      onToggle={onToggle}
      actions={
        onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        )
      }
    >
      <div className="grid grid-cols-3 gap-4">
        {/* Pages */}
        <FieldWrapper sectionId={section.id} fieldName="pages" label="Pages" required>
          <input
            type="number"
            value={section.pages || ""}
            onChange={(e) => onFieldChange(section.id, "pages", parseInt(e.target.value) || 0)}
            min={4}
            step={4}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
          />
        </FieldWrapper>

        {/* Colors Front */}
        <FieldWrapper sectionId={section.id} fieldName="colorsFront" label="Colors Front">
          <select
            value={section.colorsFront}
            onChange={(e) => onFieldChange(section.id, "colorsFront", parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value={1}>1 (B&W)</option>
            <option value={2}>2 (Duotone)</option>
            <option value={4}>4 (CMYK)</option>
          </select>
        </FieldWrapper>

        {/* Colors Back */}
        <FieldWrapper sectionId={section.id} fieldName="colorsBack" label="Colors Back">
          <select
            value={section.colorsBack}
            onChange={(e) => onFieldChange(section.id, "colorsBack", parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value={0}>0 (Blank)</option>
            <option value={1}>1 (B&W)</option>
            <option value={2}>2 (Duotone)</option>
            <option value={4}>4 (CMYK)</option>
          </select>
        </FieldWrapper>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Paper Type */}
        <FieldWrapper sectionId={section.id} fieldName="paperCategory" label="Paper Type">
          <select
            value={section.paper.category}
            onChange={(e) => onFieldChange(section.id, "paperCategory", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            {PAPER_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </FieldWrapper>

        {/* GSM */}
        <FieldWrapper
          sectionId={section.id}
          fieldName="gsm"
          label="GSM"
          help={`Bulk: ${section.paper.bulkFactor}× | Caliper: ${section.paper.caliper_microns.toFixed(0)}μm`}
        >
          <div className="flex gap-2">
            <select
              value={COMMON_GSMS.includes(section.paper.gsm) ? section.paper.gsm : "custom"}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "custom") {
                  onFieldChange(section.id, "gsm", parseInt(val));
                }
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              {COMMON_GSMS.map((g) => (
                <option key={g} value={g}>{g}gsm</option>
              ))}
              <option value="custom">Custom...</option>
            </select>

            {!COMMON_GSMS.includes(section.paper.gsm) && (
              <input
                type="number"
                value={section.paper.gsm}
                onChange={(e) => onFieldChange(section.id, "gsm", parseInt(e.target.value) || 80)}
                min={20}
                max={600}
                className="w-20 px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-mono"
              />
            )}
          </div>
        </FieldWrapper>
      </div>

      {/* Auto-planned fields (sheet + machine) — read-only when auto-planned */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
        <FieldWrapper
          sectionId={section.id}
          fieldName="preferredSheet"
          label="Sheet Size"
          help="Leave blank for auto-selection"
        >
          <select
            value={section.preferredSheet ?? ""}
            onChange={(e) => onFieldChange(section.id, "preferredSheet", e.target.value || undefined)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">🤖 Auto-select</option>
            {STANDARD_SHEETS.map((s) => (
              <option key={s.label} value={s.label}>
                {s.label} ({s.size_mm.width}×{s.size_mm.height}mm)
              </option>
            ))}
          </select>
        </FieldWrapper>

        <FieldWrapper
          sectionId={section.id}
          fieldName="preferredMachine"
          label="Press"
          help="Leave blank for auto-selection"
        >
          <select
            value={section.preferredMachine ?? ""}
            onChange={(e) => onFieldChange(section.id, "preferredMachine", e.target.value || undefined)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
          >
            <option value="">🤖 Auto-select</option>
            {MACHINE_DATABASE.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.maxColors}C, {m.speedSPH} SPH)
              </option>
            ))}
          </select>
        </FieldWrapper>
      </div>

      {/* Auto-plan result indicator */}
      {sectionMeta?.imposition && (
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 font-mono">
          ⚡ {(sectionMeta.imposition.value as any)?.sheet ?? "—"} |{" "}
          {(sectionMeta.imposition.value as any)?.signature ?? "—"} |{" "}
          {(sectionMeta.imposition.value as any)?.method ?? "—"} |{" "}
          Waste: {(sectionMeta.imposition.value as any)?.waste ?? "—"} |{" "}
          Grain: {(sectionMeta.imposition.value as any)?.grain ?? "—"}
        </div>
      )}
    </SectionCard>
  );
}
