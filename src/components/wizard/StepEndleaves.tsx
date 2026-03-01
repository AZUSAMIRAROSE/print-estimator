import React from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { cn } from "@/utils/cn";
import {
  Info, BookOpen, ToggleLeft, ToggleRight, Eye, Palette,
  Layers, FileText, Sparkles
} from "lucide-react";
import { DEFAULT_PAPER_RATES, DEFAULT_MACHINES, STANDARD_PAPER_SIZES } from "@/constants";

const ENDLEAF_TYPES = [
  {
    type: "plain" as const,
    label: "Plain (Blank)",
    description: "Unprinted endleaves in a chosen paper stock. Most common for standard books. Clean and professional.",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    type: "printed" as const,
    label: "Printed",
    description: "Custom printed endleaves with maps, illustrations, patterns, or decorative designs. Adds character and value to the book.",
    icon: <Palette className="w-5 h-5" />,
  },
  {
    type: "tipped" as const,
    label: "Tipped-On",
    description: "A separate printed sheet tipped (glued) onto the endleaf. Used when endleaf paper differs from the print sheet. Common in art books.",
    icon: <Layers className="w-5 h-5" />,
  },
  {
    type: "map" as const,
    label: "Map Endleaves",
    description: "Endleaves featuring a printed map. Traditional in travel books, atlases, and historical publications.",
    icon: <Eye className="w-5 h-5" />,
  },
  {
    type: "self" as const,
    label: "Self Endleaves",
    description: "Endleaves are part of the text block (same paper). The first and last pages are pasted down to the board. Most economical option.",
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    type: "special" as const,
    label: "Special / Decorative",
    description: "Premium endleaves using specialty papers — marbled, textured, handmade, or foil-stamped. For luxury and collector editions.",
    icon: <Sparkles className="w-5 h-5" />,
  },
];

const ENDLEAF_PAGES_OPTIONS = [
  { value: 2, label: "2pp (1 leaf)", description: "Single leaf — front only" },
  { value: 4, label: "4pp (2 leaves)", description: "Standard — front & back endleaves" },
  { value: 6, label: "6pp (3 leaves)", description: "Extended — extra fold-out or insert" },
  { value: 8, label: "8pp (4 leaves)", description: "Double — two-sheet endleaves each side" },
];

const ENDLEAF_GSM_PRESETS = [
  { gsm: 100, label: "100 gsm", description: "Lightweight" },
  { gsm: 120, label: "120 gsm", description: "Standard" },
  { gsm: 140, label: "140 gsm", description: "Medium" },
  { gsm: 150, label: "150 gsm", description: "Heavy" },
  { gsm: 170, label: "170 gsm", description: "Extra heavy" },
];

export function StepEndleaves() {
  const { estimation, updateEndleaves } = useEstimationStore();
  const endleaves = estimation.endleaves;

  // Get unique paper types from rates
  const paperTypes = [...new Set(DEFAULT_PAPER_RATES.map(r => r.paperType))];

  // Filter available GSMs for selected paper type
  const availableGSMs = DEFAULT_PAPER_RATES
    .filter(r => r.paperType === endleaves.paperTypeName || r.code === endleaves.paperTypeId)
    .map(r => r.gsm)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b);

  // Determine if endleaves should be mandatory (hardcase binding)
  const isHardcase = estimation.binding.primaryBinding === "section_sewn_hardcase" ||
    estimation.binding.primaryBinding === "case_binding";

  return (
    <div className="space-y-6 animate-in">
      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Endleaves (Endpapers)</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Endleaves connect the book block to the cover boards in hardcase binding. They consist of a paste-down
            (glued to the board) and a free fly leaf. Standard is 4pp (2 leaves) per book — one set front, one set back.
            {isHardcase && (
              <span className="font-semibold block mt-1">
                ⚠️ Endleaves are required for hardcase/case binding.
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div
        onClick={() => {
          if (isHardcase && endleaves.enabled) return; // Can't disable for hardcase
          updateEndleaves({ enabled: !endleaves.enabled });
        }}
        className={cn(
          "flex items-center justify-between p-5 rounded-xl border-2 cursor-pointer transition-all",
          endleaves.enabled
            ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
            : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary",
          isHardcase && endleaves.enabled && "cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3">
          <BookOpen className={cn(
            "w-6 h-6",
            endleaves.enabled ? "text-primary-600 dark:text-primary-400" : "text-text-light-tertiary dark:text-text-dark-tertiary"
          )} />
          <div>
            <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              Include Endleaves
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {endleaves.enabled ? "Endleaves are included in this estimation" : "No endleaves — click to add"}
              {isHardcase && " (Required for hardcase)"}
            </p>
          </div>
        </div>
        {endleaves.enabled ? (
          <ToggleRight className="w-10 h-10 text-primary-600" />
        ) : (
          <ToggleLeft className="w-10 h-10 text-gray-400" />
        )}
      </div>

      {endleaves.enabled && (
        <div className="space-y-6 animate-in">
          {/* Endleaf Type Selection */}
          <div className="card p-5 space-y-4">
            <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              Endleaf Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ENDLEAF_TYPES.map((type) => {
                const isSelected = endleaves.type === type.type;
                return (
                  <button
                    key={type.type}
                    onClick={() => {
                      const updates: Partial<typeof endleaves> = { type: type.type };
                      if (type.type === "self") {
                        updates.selfEndleaves = true;
                        updates.colorsFront = 0;
                        updates.colorsBack = 0;
                      } else {
                        updates.selfEndleaves = false;
                      }
                      if (type.type === "printed" || type.type === "map" || type.type === "tipped") {
                        updates.colorsFront = 4;
                        updates.colorsBack = 0;
                      }
                      if (type.type === "plain") {
                        updates.colorsFront = 0;
                        updates.colorsBack = 0;
                      }
                      updateEndleaves(updates);
                    }}
                    className={cn(
                      "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                      isSelected
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md"
                        : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 dark:hover:border-primary-500/50 bg-white dark:bg-surface-dark-secondary"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn(
                        "p-2 rounded-lg",
                        isSelected
                          ? "bg-primary-500 text-white"
                          : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary"
                      )}>
                        {type.icon}
                      </div>
                      <h4 className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                        {type.label}
                      </h4>
                    </div>
                    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary leading-relaxed">
                      {type.description}
                    </p>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pages / Leaves */}
          {!endleaves.selfEndleaves && (
            <div className="card p-5 space-y-4">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                Number of Pages
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ENDLEAF_PAGES_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateEndleaves({ pages: opt.value })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-center transition-all",
                      endleaves.pages === opt.value
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                        : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary"
                    )}
                  >
                    <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
                      {opt.label}
                    </p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
                      {opt.description}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                This is the total pages for BOTH front and back endleaves combined. Standard is 4pp = 2 leaves at the front + 2 leaves at the back.
              </p>
            </div>
          )}

          {/* Paper & Printing */}
          {!endleaves.selfEndleaves && (
            <div className="card p-5 space-y-4">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                Paper & Printing
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Paper Type */}
                <div>
                  <label className="label">Paper Type</label>
                  <select
                    value={endleaves.paperTypeName}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const matchingRate = DEFAULT_PAPER_RATES.find(r => r.paperType === selected);
                      updateEndleaves({
                        paperTypeName: selected,
                        paperTypeId: matchingRate?.code || "",
                        gsm: matchingRate?.gsm || endleaves.gsm,
                      });
                    }}
                    className="input-field"
                  >
                    {paperTypes.map((pt) => (
                      <option key={pt} value={pt}>{pt}</option>
                    ))}
                  </select>
                </div>

                {/* GSM */}
                <div>
                  <label className="label">GSM (Weight)</label>
                  <div className="flex gap-2">
                    <select
                      value={endleaves.gsm}
                      onChange={(e) => updateEndleaves({ gsm: parseInt(e.target.value) || 120 })}
                      className="input-field flex-1"
                    >
                      {(availableGSMs.length > 0 ? availableGSMs : ENDLEAF_GSM_PRESETS.map(g => g.gsm)).map((gsm) => (
                        <option key={gsm} value={gsm}>{gsm} gsm</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={40}
                      max={400}
                      value={endleaves.gsm}
                      onChange={(e) => updateEndleaves({ gsm: parseInt(e.target.value) || 120 })}
                      className="input-field w-24"
                      title="Custom GSM"
                    />
                  </div>
                </div>

                {/* Paper Size */}
                <div>
                  <label className="label">Paper Size</label>
                  <select
                    value={endleaves.paperSizeLabel}
                    onChange={(e) => {
                      const size = STANDARD_PAPER_SIZES.find(s => s.label === e.target.value);
                      if (size) {
                        updateEndleaves({
                          paperSizeId: size.id,
                          paperSizeLabel: size.label,
                        });
                      }
                    }}
                    className="input-field"
                  >
                    {STANDARD_PAPER_SIZES.map((size) => (
                      <option key={size.id} value={size.label}>{size.label} ({size.widthInch}"×{size.heightInch}")</option>
                    ))}
                  </select>
                </div>

                {/* Colors Front */}
                {(endleaves.type === "printed" || endleaves.type === "map" || endleaves.type === "tipped" || endleaves.type === "special") && (
                  <>
                    <div>
                      <label className="label">Colors (Front)</label>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3, 4].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateEndleaves({ colorsFront: c })}
                            className={cn(
                              "flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-all",
                              endleaves.colorsFront === c
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400"
                                : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary"
                            )}
                          >
                            {c}C
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label">Colors (Back)</label>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3, 4].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => updateEndleaves({ colorsBack: c })}
                            className={cn(
                              "flex-1 py-2 rounded-lg border-2 text-sm font-bold transition-all",
                              endleaves.colorsBack === c
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400"
                                : "border-surface-light-border dark:border-surface-dark-border bg-white dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary"
                            )}
                          >
                            {c}C
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Machine */}
                {endleaves.colorsFront > 0 && (
                  <div>
                    <label className="label">Printing Machine</label>
                    <select
                      value={endleaves.machineId}
                      onChange={(e) => {
                        const machine = DEFAULT_MACHINES.find(m => m.id === e.target.value);
                        if (machine) {
                          updateEndleaves({
                            machineId: machine.id,
                            machineName: machine.name,
                          });
                        }
                      }}
                      className="input-field"
                    >
                      {DEFAULT_MACHINES.filter(m => m.isActive).map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Book Preview — Endleaves Visualization */}
          <div className="card p-5">
            <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              Endleaf Preview
            </h3>
            <div className="flex items-center justify-center py-6">
              <div className="relative flex items-stretch gap-0">
                {/* Left Board */}
                <div className="w-3 bg-amber-700 dark:bg-amber-800 rounded-l-sm" title="Front Board" />

                {/* Front Paste-Down (glued to board) */}
                <div
                  className={cn(
                    "w-20 border-y border-r flex items-center justify-center text-[10px] font-medium",
                    endleaves.type === "printed" || endleaves.type === "map"
                      ? "bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                      : endleaves.type === "special"
                        ? "bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400"
                        : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                  )}
                  style={{ height: "120px" }}
                  title="Paste-down (glued to front board)"
                >
                  <div className="text-center">
                    <p className="font-bold">Paste</p>
                    <p className="font-bold">Down</p>
                    <p className="text-[8px] mt-1 opacity-70">← glued</p>
                  </div>
                </div>

                {/* Front Free Flyleaf */}
                <div
                  className={cn(
                    "w-20 border-y border-r flex items-center justify-center text-[10px] font-medium",
                    endleaves.type === "printed" || endleaves.type === "map"
                      ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                      : endleaves.type === "special"
                        ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400"
                        : "bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                  )}
                  style={{ height: "120px" }}
                  title="Free flyleaf (can be turned)"
                >
                  <div className="text-center">
                    <p className="font-bold">Free</p>
                    <p className="font-bold">Flyleaf</p>
                    {(endleaves.type === "printed" || endleaves.type === "map") && (
                      <p className="text-[8px] mt-1 opacity-70">{endleaves.colorsFront}C print</p>
                    )}
                  </div>
                </div>

                {/* Text Block */}
                <div
                  className="bg-white dark:bg-gray-200 border border-gray-300 dark:border-gray-500 flex items-center justify-center"
                  style={{ width: "80px", height: "120px" }}
                  title="Text block"
                >
                  <div className="text-center text-[10px] text-gray-500">
                    <p className="font-bold text-gray-700 dark:text-gray-800">TEXT</p>
                    <p className="font-bold text-gray-700 dark:text-gray-800">BLOCK</p>
                    <p className="mt-1">{estimation.textSections.reduce((s, t) => t.enabled ? s + t.pages : s, 0)}pp</p>
                  </div>
                </div>

                {/* Back Free Flyleaf */}
                <div
                  className={cn(
                    "w-20 border-y border-l flex items-center justify-center text-[10px] font-medium",
                    endleaves.type === "printed" || endleaves.type === "map"
                      ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                      : endleaves.type === "special"
                        ? "bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-400"
                        : "bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400"
                  )}
                  style={{ height: "120px" }}
                  title="Back free flyleaf"
                >
                  <div className="text-center">
                    <p className="font-bold">Free</p>
                    <p className="font-bold">Flyleaf</p>
                  </div>
                </div>

                {/* Back Paste-Down */}
                <div
                  className={cn(
                    "w-20 border-y border-l flex items-center justify-center text-[10px] font-medium",
                    endleaves.type === "printed" || endleaves.type === "map"
                      ? "bg-gradient-to-l from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                      : endleaves.type === "special"
                        ? "bg-gradient-to-l from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-400"
                        : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                  )}
                  style={{ height: "120px" }}
                  title="Back paste-down (glued to back board)"
                >
                  <div className="text-center">
                    <p className="font-bold">Paste</p>
                    <p className="font-bold">Down</p>
                    <p className="text-[8px] mt-1 opacity-70">glued →</p>
                  </div>
                </div>

                {/* Right Board */}
                <div className="w-3 bg-amber-700 dark:bg-amber-800 rounded-r-sm" title="Back Board" />
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-amber-700 dark:bg-amber-800 rounded-sm" />
                <span>Board</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "w-3 h-3 rounded-sm",
                  endleaves.type === "printed" || endleaves.type === "map"
                    ? "bg-blue-200 dark:bg-blue-700"
                    : endleaves.type === "special"
                      ? "bg-purple-200 dark:bg-purple-700"
                      : "bg-amber-200 dark:bg-amber-700"
                )} />
                <span>Endleaves ({endleaves.type})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-white dark:bg-gray-200 border border-gray-300 rounded-sm" />
                <span>Text Block</span>
              </div>
            </div>

            {/* Spec Summary */}
            <div className="mt-4 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Type:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary capitalize">
                    {endleaves.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Pages:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {endleaves.selfEndleaves ? "Self (from text)" : `${endleaves.pages}pp`}
                  </span>
                </div>
                {!endleaves.selfEndleaves && (
                  <>
                    <div>
                      <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Paper:</span>{" "}
                      <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                        {endleaves.gsm}gsm {endleaves.paperTypeName}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Colors:</span>{" "}
                      <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                        {endleaves.colorsFront > 0
                          ? `${endleaves.colorsFront}+${endleaves.colorsBack}C`
                          : "Unprinted"}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {endleaves.colorsFront > 0 && !endleaves.selfEndleaves && (
                <div className="mt-2 text-sm">
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Machine:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {endleaves.machineName}
                  </span>
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary ml-3">Sheet Size:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {endleaves.paperSizeLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Not included info */}
      {!endleaves.enabled && (
        <div className="card p-8 text-center">
          <BookOpen className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
            No Endleaves
          </h3>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary max-w-md mx-auto">
            Endleaves are not included in this estimation.
            {isHardcase
              ? " Since you've selected hardcase binding, endleaves are strongly recommended. Click the toggle above to enable them."
              : " This is typical for perfect bound, saddle stitched, and wire-o bound books."}
          </p>
          {isHardcase && (
            <button
              onClick={() => updateEndleaves({ enabled: true })}
              className="btn-primary mt-4"
            >
              Enable Endleaves
            </button>
          )}
        </div>
      )}
    </div>
  );
}