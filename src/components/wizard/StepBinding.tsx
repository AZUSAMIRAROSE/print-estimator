import { useState } from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { cn } from "@/utils/cn";
import {
  BookMarked, Info, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Layers, Scissors, Link2, BookOpen, Grip, Ribbon, CircleDot,
  Square, Circle, Shield, Wrench, Star
} from "lucide-react";
import { DEFAULT_BOARD_TYPES, DEFAULT_COVERING_MATERIALS, HARDCASE_DEFAULTS } from "@/constants";

const BINDING_OPTIONS: {
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: "common" | "premium" | "specialty";
  supportsBoard: boolean;
}[] = [
  {
    type: "perfect_binding",
    label: "Perfect Binding",
    description: "Pages glued to a wrap-around cover. Most common for paperbacks, magazines, and catalogs. Cost-effective for runs over 500 copies.",
    icon: <BookMarked className="w-5 h-5" />,
    category: "common",
    supportsBoard: false,
  },
  {
    type: "pur_binding",
    label: "PUR Binding",
    description: "Polyurethane reactive adhesive binding. Superior strength and flexibility vs standard perfect binding. Pages lay flatter. Ideal for heavy coated stocks.",
    icon: <BookMarked className="w-5 h-5" />,
    category: "common",
    supportsBoard: false,
  },
  {
    type: "section_sewn_perfect",
    label: "Section Sewn + Perfect Bound",
    description: "Signatures sewn together then perfect bound with cover. Extremely durable. Pages lay flat. Premium quality for paperbacks and reference books.",
    icon: <Layers className="w-5 h-5" />,
    category: "premium",
    supportsBoard: false,
  },
  {
    type: "section_sewn_hardcase",
    label: "Section Sewn + Hardcase",
    description: "Signatures sewn, cased into rigid boards with covering material. The gold standard for books. Maximum durability and premium appearance.",
    icon: <Shield className="w-5 h-5" />,
    category: "premium",
    supportsBoard: true,
  },
  {
    type: "saddle_stitching",
    label: "Saddle Stitching",
    description: "Wire staples through the spine fold. Ideal for booklets, brochures, and thin publications up to ~64 pages. Most economical binding.",
    icon: <Grip className="w-5 h-5" />,
    category: "common",
    supportsBoard: false,
  },
  {
    type: "wire_o",
    label: "Wire-O Binding",
    description: "Double-loop wire through punched holes. Pages turn 360°. Great for manuals, calendars, cookbooks. Available in various colors and diameters.",
    icon: <Circle className="w-5 h-5" />,
    category: "common",
    supportsBoard: false,
  },
  {
    type: "spiral",
    label: "Spiral / Coil Binding",
    description: "Plastic or metal coil threaded through punched holes. Full 360° page turn. Durable and flexible. Common for notebooks and training materials.",
    icon: <CircleDot className="w-5 h-5" />,
    category: "common",
    supportsBoard: false,
  },
  {
    type: "case_binding",
    label: "Case Binding (Unsewn)",
    description: "Pages glued and cased into rigid boards without sewing. Lower cost alternative to sewn hardcase. Suitable for shorter books.",
    icon: <Square className="w-5 h-5" />,
    category: "premium",
    supportsBoard: true,
  },
  {
    type: "lay_flat",
    label: "Lay-Flat Binding",
    description: "Specialized binding that allows pages to lay completely flat when opened. Perfect for photo books, music books, and workbooks. Uses flexible spine adhesive.",
    icon: <BookOpen className="w-5 h-5" />,
    category: "premium",
    supportsBoard: false,
  },
  {
    type: "coptic",
    label: "Coptic Binding",
    description: "Exposed spine sewing with decorative chain stitch pattern. No cover spine needed. Artisanal and decorative. Pages lay completely flat.",
    icon: <Link2 className="w-5 h-5" />,
    category: "specialty",
    supportsBoard: false,
  },
  {
    type: "japanese",
    label: "Japanese Stab Binding",
    description: "Thread sewn through holes along the spine edge. Decorative exposed binding. Single-sided pages only. Traditional Asian bookbinding technique.",
    icon: <Scissors className="w-5 h-5" />,
    category: "specialty",
    supportsBoard: false,
  },
  {
    type: "singer_sewn",
    label: "Singer Sewn",
    description: "Machine-sewn through the spine like a sewing machine stitch. Visible thread on spine. Artisanal look for thin booklets and brochures.",
    icon: <Ribbon className="w-5 h-5" />,
    category: "specialty",
    supportsBoard: false,
  },
  {
    type: "pamphlet",
    label: "Pamphlet Stitch",
    description: "Hand or machine sewn through the spine fold with thread. For single-signature booklets. Clean, elegant look without visible wire.",
    icon: <BookMarked className="w-5 h-5" />,
    category: "specialty",
    supportsBoard: false,
  },
  {
    type: "tape_binding",
    label: "Tape Binding",
    description: "Cloth or paper tape applied to the spine edge. Quick and economical. Used for reports, manuscripts, and short-run documents.",
    icon: <Wrench className="w-5 h-5" />,
    category: "common",
    supportsBoard: false,
  },
  {
    type: "thermal_binding",
    label: "Thermal Binding",
    description: "Pre-glued cover activated by heat. Clean professional finish. Ideal for presentations, proposals, and small print runs.",
    icon: <Star className="w-5 h-5" />,
    category: "common",
    supportsBoard: false,
  },
];

export function StepBinding() {
  const { estimation, updateBinding } = useEstimationStore();
  const binding = estimation.binding;
  const [expandedSection, setExpandedSection] = useState<string | null>(
    binding.primaryBinding.includes("hardcase") || binding.primaryBinding.includes("case") ? "hardcase" : null
  );
  const [categoryFilter, setCategoryFilter] = useState<"all" | "common" | "premium" | "specialty">("all");

  const filteredBindings = categoryFilter === "all"
    ? BINDING_OPTIONS
    : BINDING_OPTIONS.filter(b => b.category === categoryFilter);

  const selectedBinding = BINDING_OPTIONS.find(b => b.type === binding.primaryBinding);
  const isHardcase = binding.primaryBinding === "section_sewn_hardcase" || binding.primaryBinding === "case_binding";

  return (
    <div className="space-y-6 animate-in">
      {/* Tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-primary-800 dark:text-primary-300">Binding Selection</p>
          <p className="text-sm text-primary-600 dark:text-primary-400 mt-1">
            Choose your binding method. Hardcase binding includes board, covering material, and optional embellishments.
            PUR binding is available as a toggle when Perfect Binding is selected.
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        {(["all", "common", "premium", "specialty"] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-all capitalize",
              categoryFilter === cat
                ? "bg-primary-600 text-white shadow-sm"
                : "btn-secondary"
            )}
          >
            {cat === "all" ? "All Types" : cat}
          </button>
        ))}
      </div>

      {/* Binding Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredBindings.map((option) => {
          const isSelected = binding.primaryBinding === option.type;
          return (
            <button
              key={option.type}
              onClick={() => updateBinding({ primaryBinding: option.type as any })}
              className={cn(
                "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                isSelected
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 shadow-md"
                  : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 dark:hover:border-primary-500/50 bg-white dark:bg-surface-dark-secondary"
              )}
            >
              {/* Category Badge */}
              <div className={cn(
                "absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold uppercase rounded-full",
                option.category === "common" && "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
                option.category === "premium" && "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                option.category === "specialty" && "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
              )}>
                {option.category}
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  isSelected
                    ? "bg-primary-500 text-white"
                    : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary"
                )}>
                  {option.icon}
                </div>
                <h4 className="font-semibold text-sm text-text-light-primary dark:text-text-dark-primary">
                  {option.label}
                </h4>
              </div>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary leading-relaxed">
                {option.description}
              </p>

              {/* PUR Toggle for Perfect Binding */}
              {option.type === "perfect_binding" && isSelected && (
                <div
                  className="mt-3 pt-3 border-t border-surface-light-border dark:border-surface-dark-border flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary">
                    Use PUR Adhesive
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBinding({ purBinding: !binding.purBinding });
                    }}
                    className="shrink-0"
                  >
                    {binding.purBinding ? (
                      <ToggleRight className="w-8 h-8 text-primary-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-gray-400" />
                    )}
                  </button>
                </div>
              )}

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

      {/* Hardcase Options */}
      {isHardcase && (
        <div className="space-y-4 card p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              Hardcase Configuration
            </h3>
            <button
              onClick={() => setExpandedSection(expandedSection === "hardcase" ? null : "hardcase")}
              className="btn-ghost p-2"
            >
              {expandedSection === "hardcase" ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>

          {expandedSection === "hardcase" && (
            <div className="space-y-6 animate-in">
              {/* Board Selection */}
              <div>
                <h4 className="label mb-3">Board Type & Thickness</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {DEFAULT_BOARD_TYPES.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => updateBinding({
                        boardType: board.id,
                        boardThickness: board.thickness,
                        boardOrigin: board.origin,
                      })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all text-sm",
                        binding.boardType === board.id
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                          : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
                      )}
                    >
                      <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{board.name}</p>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                        {board.thickness}mm • {board.origin} • ₹{board.ratePerKg}/kg
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Back Shape */}
              <div>
                <h4 className="label mb-3">Back Shape</h4>
                <div className="flex gap-3">
                  {(["square", "round"] as const).map((shape) => (
                    <button
                      key={shape}
                      onClick={() => updateBinding({ backShape: shape })}
                      className={cn(
                        "flex-1 p-4 rounded-lg border-2 text-center transition-all capitalize",
                        binding.backShape === shape
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                          : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
                      )}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {shape === "square" ? (
                          <div className="w-8 h-12 border-2 border-current rounded-sm" />
                        ) : (
                          <div className="w-8 h-12 border-2 border-current rounded-l-full rounded-r-sm" />
                        )}
                        <span className="text-sm font-medium">{shape} Back</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Covering Material */}
              <div>
                <h4 className="label mb-3">Covering Material</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {DEFAULT_COVERING_MATERIALS.map((material) => (
                    <button
                      key={material.id}
                      onClick={() => updateBinding({
                        coveringMaterialId: material.id,
                        coveringMaterialName: material.name,
                      })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all text-sm",
                        binding.coveringMaterialId === material.id
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                          : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
                      )}
                    >
                      <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{material.name}</p>
                      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                        {material.ratePerSqMeter > 0 ? `₹${material.ratePerSqMeter}/sqm` : "Paper rate applies"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Embellishments */}
              <div>
                <h4 className="label mb-3">Case Embellishments</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: "headTailBand", label: "Head & Tail Band", rate: `₹${HARDCASE_DEFAULTS.htBandRate}/copy` },
                    { key: "ribbonMarker", label: "Ribbon Marker", rate: `₹${HARDCASE_DEFAULTS.ribbonRate}/ribbon` },
                    { key: "goldBlockingFront", label: "Gold Blocking (Front)", rate: `₹${HARDCASE_DEFAULTS.goldBlockingFront}/copy` },
                    { key: "goldBlockingSpine", label: "Gold Blocking (Spine)", rate: `₹${HARDCASE_DEFAULTS.goldBlockingSpine}/copy` },
                    { key: "embossingFront", label: "Embossing (Front)", rate: `₹${HARDCASE_DEFAULTS.embossingFront}/copy` },
                    { key: "giltEdging", label: "Gilt Edging", rate: `₹${HARDCASE_DEFAULTS.giltEdging}/copy` },
                    { key: "foamPadding", label: "Foam Padding", rate: `₹${HARDCASE_DEFAULTS.foamPadding}/copy` },
                    { key: "roundCornering", label: "Round Cornering", rate: `₹${HARDCASE_DEFAULTS.roundCornering}/copy` },
                    { key: "roundingBacking", label: "Rounding & Backing", rate: `₹${HARDCASE_DEFAULTS.roundingBacking}/copy` },
                  ].map(({ key, label, rate }) => {
                    const isChecked = key === "ribbonMarker"
                      ? (binding as any)[key] > 0
                      : (binding as any)[key] === true;

                    return (
                      <label
                        key={key}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                          isChecked
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10"
                            : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300 bg-white dark:bg-surface-dark-secondary"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (key === "ribbonMarker") {
                              updateBinding({ ribbonMarker: e.target.checked ? 1 : 0 });
                            } else {
                              updateBinding({ [key]: e.target.checked } as any);
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{label}</p>
                          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{rate}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Ribbon count */}
                {binding.ribbonMarker > 0 && (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="label mb-0">Number of Ribbons:</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={binding.ribbonMarker}
                      onChange={(e) => updateBinding({ ribbonMarker: parseInt(e.target.value) || 1 })}
                      className="input-field w-20"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Summary */}
      {selectedBinding && (
        <div className="card p-4">
          <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
            Selected: {selectedBinding.label}
            {binding.purBinding && binding.primaryBinding === "perfect_binding" && " (PUR)"}
          </h4>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {selectedBinding.description}
          </p>
          {isHardcase && (
            <div className="mt-3 pt-3 border-t border-surface-light-border dark:border-surface-dark-border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Board:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {DEFAULT_BOARD_TYPES.find(b => b.id === binding.boardType)?.name || "Not selected"}
                  </span>
                </div>
                <div>
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Back:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary capitalize">{binding.backShape}</span>
                </div>
                <div>
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Cover:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{binding.coveringMaterialName || "Not selected"}</span>
                </div>
                <div>
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">Extras:</span>{" "}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {[
                      binding.headTailBand && "H/T Band",
                      binding.ribbonMarker > 0 && `${binding.ribbonMarker} Ribbon`,
                      binding.goldBlockingFront && "Gold Front",
                      binding.goldBlockingSpine && "Gold Spine",
                      binding.embossingFront && "Emboss",
                      binding.giltEdging && "Gilt",
                    ].filter(Boolean).join(", ") || "None"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}