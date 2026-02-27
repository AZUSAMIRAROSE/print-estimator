import { useEstimationStore } from "@/stores/estimationStore";
import { cn } from "@/utils/cn";
import {
  CheckCircle, AlertTriangle, Book, Type, Square, Layers,
  BookOpen, BookMarked, Sparkles, Package, Truck, Printer,
  DollarSign, MessageSquare, Edit3
} from "lucide-react";
import { TRIM_SIZE_PRESETS, WIZARD_STEPS } from "@/constants";
import { formatCurrency } from "@/utils/format";
import { calculateSpineThickness } from "@/utils/calculations/spine";

export function StepReview() {
  const { estimation, setCurrentStep } = useEstimationStore();

  const spine = calculateSpineThickness({
    textSections: estimation.textSections
      .filter(s => s.enabled)
      .map(s => ({ pages: s.pages, gsm: s.gsm, paperType: s.paperTypeName })),
    endleaves: estimation.endleaves.enabled
      ? { pages: estimation.endleaves.pages, gsm: estimation.endleaves.gsm, paperType: estimation.endleaves.paperTypeName }
      : undefined,
  });

  const totalPages = estimation.textSections.reduce((sum, s) => s.enabled ? sum + s.pages : sum, 0);

  const sections = [
    {
      icon: <Book className="w-4 h-4" />,
      title: "Basic Info",
      step: 1,
      items: [
        { label: "Customer", value: estimation.customerName || "—" },
        { label: "Title", value: estimation.jobTitle || "—" },
        { label: "Reference", value: estimation.referenceNumber || "—" },
        { label: "Estimated By", value: estimation.estimatedBy || "—" },
      ],
      isValid: !!estimation.jobTitle,
    },
    {
      icon: <Book className="w-4 h-4" />,
      title: "Book Spec",
      step: 2,
      items: [
        { label: "Size", value: `${estimation.bookSpec.widthMM} × ${estimation.bookSpec.heightMM} mm` },
        { label: "Quantities", value: estimation.quantities.filter(q => q > 0).join(" / ") || "—" },
        { label: "Total Pages", value: `${totalPages} pp` },
        { label: "Spine", value: `${spine.toFixed(2)} mm` },
      ],
      isValid: estimation.bookSpec.widthMM > 0 && estimation.quantities[0] > 0,
    },
    {
      icon: <Type className="w-4 h-4" />,
      title: "Text Sections",
      step: 3,
      items: estimation.textSections.filter(s => s.enabled).map(s => ({
        label: s.label,
        value: `${s.pages}pp • ${s.gsm}gsm ${s.paperTypeName} • ${s.colorsFront}+${s.colorsBack}C • ${s.machineName}`,
      })),
      isValid: estimation.textSections.some(s => s.enabled && s.pages > 0),
    },
    {
      icon: <Square className="w-4 h-4" />,
      title: "Cover",
      step: 4,
      items: [
        { label: "Paper", value: `${estimation.cover.gsm}gsm ${estimation.cover.paperTypeName}` },
        { label: "Colors", value: `${estimation.cover.colorsFront}+${estimation.cover.colorsBack}` },
        { label: "Machine", value: estimation.cover.machineName || "—" },
      ],
      isValid: estimation.cover.gsm > 0,
    },
    {
      icon: <Layers className="w-4 h-4" />,
      title: "Jacket",
      step: 5,
      items: estimation.jacket.enabled ? [
        { label: "Paper", value: `${estimation.jacket.gsm}gsm ${estimation.jacket.paperTypeName}` },
        { label: "Colors", value: `${estimation.jacket.colorsFront}+${estimation.jacket.colorsBack}` },
      ] : [{ label: "Status", value: "Not included" }],
      isValid: true,
    },
    {
      icon: <BookOpen className="w-4 h-4" />,
      title: "Endleaves",
      step: 6,
      items: estimation.endleaves.enabled ? [
        { label: "Type", value: estimation.endleaves.type },
        { label: "Paper", value: `${estimation.endleaves.gsm}gsm ${estimation.endleaves.paperTypeName}` },
      ] : [{ label: "Status", value: "Not included" }],
      isValid: true,
    },
    {
      icon: <BookMarked className="w-4 h-4" />,
      title: "Binding",
      step: 7,
      items: [
        { label: "Type", value: estimation.binding.primaryBinding.replace(/_/g, " ") },
        ...(estimation.binding.purBinding ? [{ label: "PUR", value: "Yes" }] : []),
        ...(estimation.binding.primaryBinding.includes("hardcase") ? [
          { label: "Board", value: `${estimation.binding.boardThickness}mm ${estimation.binding.boardOrigin}` },
          { label: "Covering", value: estimation.binding.coveringMaterialName || "—" },
        ] : []),
      ],
      isValid: !!estimation.binding.primaryBinding,
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      title: "Finishing",
      step: 8,
      items: [
        ...(estimation.finishing.coverLamination.enabled ? [{ label: "Lamination", value: estimation.finishing.coverLamination.type }] : []),
        ...(estimation.finishing.spotUVCover.enabled ? [{ label: "Spot UV", value: estimation.finishing.spotUVCover.type }] : []),
        ...(estimation.finishing.goldBlocking.enabled ? [{ label: "Foil", value: estimation.finishing.goldBlocking.foilType }] : []),
        ...(estimation.finishing.embossing.enabled ? [{ label: "Embossing", value: estimation.finishing.embossing.type }] : []),
        ...(!estimation.finishing.coverLamination.enabled && !estimation.finishing.spotUVCover.enabled
          ? [{ label: "Status", value: "None selected" }] : []),
      ],
      isValid: true,
    },
    {
      icon: <Package className="w-4 h-4" />,
      title: "Packing",
      step: 9,
      items: [
        { label: "Cartons", value: estimation.packing.useCartons ? estimation.packing.cartonType.replace("_", "-") : "No" },
        { label: "Pallets", value: estimation.packing.usePallets ? estimation.packing.palletType : "No" },
        { label: "Stretch Wrap", value: estimation.packing.stretchWrap ? "Yes" : "No" },
      ],
      isValid: true,
    },
    {
      icon: <Truck className="w-4 h-4" />,
      title: "Delivery",
      step: 10,
      items: [
        { label: "Destination", value: estimation.delivery.destinationName || "—" },
        { label: "Freight", value: estimation.delivery.freightMode },
        { label: "Delivery", value: estimation.delivery.deliveryType.toUpperCase() },
      ],
      isValid: !!estimation.delivery.destinationId,
    },
    {
      icon: <DollarSign className="w-4 h-4" />,
      title: "Pricing",
      step: 12,
      items: [
        { label: "Margin", value: `${estimation.pricing.marginPercent}%` },
        { label: "Currency", value: estimation.pricing.currency },
        { label: "Tax", value: `${estimation.pricing.taxRate}%` },
      ],
      isValid: true,
    },
  ];

  const allValid = sections.every(s => s.isValid);

  return (
    <div className="space-y-6 animate-in">
      {/* Status Banner */}
      <div className={cn(
        "flex items-center gap-3 p-4 rounded-xl border",
        allValid
          ? "bg-success-50 dark:bg-success-500/10 border-success-500/30 text-success-700 dark:text-success-400"
          : "bg-warning-50 dark:bg-warning-500/10 border-warning-500/30 text-warning-700 dark:text-warning-400"
      )}>
        {allValid ? (
          <CheckCircle className="w-6 h-6 shrink-0" />
        ) : (
          <AlertTriangle className="w-6 h-6 shrink-0" />
        )}
        <div>
          <p className="font-semibold">
            {allValid ? "All sections configured — ready to calculate!" : "Some sections need attention"}
          </p>
          <p className="text-sm mt-0.5 opacity-80">
            {allValid
              ? "Review the summary below, then click 'Create Estimate' to generate your detailed cost analysis."
              : "Please complete all required sections before calculating."}
          </p>
        </div>
      </div>

      {/* Review Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className={cn(
              "card p-4 relative group",
              !section.isValid && "ring-2 ring-warning-500/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  section.isValid
                    ? "bg-success-50 dark:bg-success-500/10 text-success-600 dark:text-success-400"
                    : "bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400"
                )}>
                  {section.icon}
                </div>
                <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {section.title}
                </h4>
              </div>
              <button
                onClick={() => setCurrentStep(section.step)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary transition-all"
                title="Edit this section"
              >
                <Edit3 className="w-3.5 h-3.5 text-text-light-tertiary dark:text-text-dark-tertiary" />
              </button>
            </div>
            <div className="space-y-1.5">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{item.label}</span>
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary text-right max-w-[60%] truncate capitalize">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}