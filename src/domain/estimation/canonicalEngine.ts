// ============================================================================
// CANONICAL ESTIMATION ENGINE
// ============================================================================
//
// This is the NEW top-level estimation function that replaces the direct
// call to calculateFullEstimation() in the existing estimator.ts.
//
// Architecture:
//   1. Accept CanonicalEstimationInput (new types)
//   2. Run autoPlanBook() to get BookPlan (imposition + paper + machine)
//   3. Bridge BookPlan data into existing TP-calibrated calculators (if available)
//   4. Feed all costs into CostAggregatorBuilder
//   5. Return CanonicalEstimationResult (new types)
//
// BACKWARD COMPATIBILITY:
//   - A mapToLegacyResult() function converts the canonical result
//     back to the old EstimationResult type for existing UI components.
//   - A mapFromLegacyInput() function converts old EstimationInput
//     to CanonicalEstimationInput for gradual migration.
// ============================================================================

import type {
  CanonicalEstimationInput,
  CanonicalEstimationResult,
  SectionCostBreakdown,
  CostSummary,
  PricingSummary,
  Diagnostic,
  AnySectionConfig,
  CoverConfig,
  JacketConfig,
  PricingConfig,
  BindingConfig,
  FinishingConfig,
  SectionType,
  ImpositionPlan,
} from "./types";

import type { BookPlan, SectionPlan } from "./autoPlanner";
import { autoPlanBook, autoPlanMultiQuantity, summarizePlan } from "./autoPlanner";
import type { InventoryPaperItem, RateCardPaperEntry } from "./paperResolver";
import type { AggregatedCosts, CostLine } from "./costAggregator";
import { CostAggregatorBuilder, calculateSellingPrice } from "./costAggregator";

import { MACHINE_DATABASE, lookupWastage, calculateSpineThickness, calculateCaliper } from "./constants";

// ─── DATA SOURCES (injected) ────────────────────────────────────────────────

export interface DataSources {
  readonly inventory: readonly InventoryPaperItem[];
  readonly rateCard: readonly RateCardPaperEntry[];
}

// ─── BRIDGE: BookPlan → Existing Calculators ────────────────────────────────

/**
 * Bridge a section's imposition plan into the format expected
 * by calculatePrintingCostGodLevel (or fallback calculations).
 */
function bridgeToPrintingInput(
  sectionPlan: SectionPlan,
  quantity: number,
) {
  const imp = sectionPlan.imposition.selected;
  if (!imp) return null;

  // Build the imposition object the existing printing module expects
  const imposition = {
    ppPerForm: imp.signaturePages,
    numberOfForms: Math.ceil(sectionPlan.pages / imp.signaturePages),
    ups: imp.ups,
    pressSheetWidth_mm: imp.sheet.size_mm.width,
    pressSheetHeight_mm: imp.sheet.size_mm.height,
    pagesPerSide: imp.layout.pagesPerSide,
  };

  // Build wastage result
  const netSheets = sectionPlan.netSheets;
  const wastageData = lookupWastage(quantity, netSheets);
  const wastageResult = {
    netSheets,
    mrWasteSheets: wastageData.mrSheets,
    runningWasteSheets: wastageData.runningSheets,
    totalWasteSheets: wastageData.totalWaste,
    grossSheets: sectionPlan.grossSheets,
    wastagePercent: sectionPlan.grossSheets > 0
      ? (wastageData.totalWaste / sectionPlan.grossSheets) * 100
      : 0,
  };

  // Build substrate info
  const paper = sectionPlan.paper?.paper;
  const substrate = {
    caliper_microns: paper?.caliper_microns ?? 130,
    grammage_gsm: paper?.gsm ?? 130,
    bulkFactor: paper?.bulkFactor ?? 1.0,
  };

  return {
    sectionName: sectionPlan.label,
    sectionType: mapSectionType(sectionPlan.sectionType),
    machineId: sectionPlan.machine?.machine.id ?? "rmgt",
    colorsFront: sectionPlan.colorsFront,
    colorsBack: sectionPlan.colorsBack,
    quantity,
    imposition,
    wastageResult,
    substrate,
    printingMethod: imp.method,
  };
}

function mapSectionType(type: SectionType): string {
  switch (type) {
    case "TEXT": return "text1";
    case "COVER": return "cover";
    case "JACKET": return "jacket";
    case "ENDLEAVES": return "endleaves";
    default: return "text1";
  }
}

/**
 * Bridge section plans into the binding calculator input.
 */
function bridgeToBindingInput(
  bookPlan: BookPlan,
  binding: BindingConfig,
  quantity: number,
) {
  const textSections = bookPlan.sections.filter(
    (s) => s.sectionType === "TEXT",
  );

  return {
    jobType: "BOOK" as const,
    bindingMethod: binding.method,
    quantity,
    bookWidth_mm: bookPlan.trimSize.width,
    bookHeight_mm: bookPlan.trimSize.height,
    textSections: textSections.map((s) => ({
      pages: s.pages,
      substrate: {
        caliper_microns: s.paper?.paper.caliper_microns ?? 130,
        grammage_gsm: s.paper?.paper.gsm ?? 130,
        bulkFactor: s.paper?.paper.bulkFactor ?? 1.0,
      },
      signatures: s.forms / 2, // forms = front + back, signatures = forms/2 for sheetwise
    })),
    hardcoverSpecs: binding.method === "CASE"
      ? {
          boardThickness_mm: binding.boardThickness_mm ?? 3,
          clothMaterial: binding.coveringMaterial ?? "printed_paper",
          headTailBands: binding.headTailBand ?? false,
          ribbonMarker: binding.ribbonMarker ?? false,
        }
      : undefined,
  };
}

/**
 * Build finishing operations from the canonical finishing config.
 */
function buildFinishingOps(finishing: FinishingConfig): string[] {
  const ops: string[] = [];

  if (finishing.lamination) {
    ops.push("LAMINATION");
  }
  if (finishing.uvVarnish) {
    ops.push("UV_VARNISH");
  }
  if (finishing.spotUV) {
    ops.push("SPOT_UV");
  }
  if (finishing.embossing) {
    ops.push("EMBOSS");
  }
  if (finishing.dieCutting) {
    ops.push("DIE_CUT");
  }
  if (finishing.foilStamping) {
    ops.push("FOIL_STAMP");
  }

  return ops;
}

// ─── FALLBACK CALCULATORS (when TP modules not available) ──────────────────

/** Fallback printing cost calculation when TP module not available */
function calculatePrintingCostFallback(
  sectionPlan: SectionPlan,
  quantity: number,
): { ctpCost: number; printingCost: number; makereadyHours: number; runningHours: number } {
  const imp = sectionPlan.imposition.selected;
  if (!imp) {
    return { ctpCost: 0, printingCost: 0, makereadyHours: 0, runningHours: 0 };
  }

  // Plate cost: Rs 150 per plate (industry average)
  const plateRate = 150;
  const ctpCost = imp.totalPlates * plateRate;

  // Calculate total impressions: forms × colors × quantity
  const maxColors = Math.max(sectionPlan.colorsFront, sectionPlan.colorsBack);
  const totalImpressions = imp.forms * maxColors * quantity;

  // Printing cost: based on impressions × rate per 1000
  const impressionRate = 12; // Rs per 1000 impressions
  const printingCost = (totalImpressions / 1000) * impressionRate;

  // Time estimates
  const makereadyHours = imp.forms * 0.25; // 15 min per form
  const runningHours = totalImpressions / (sectionPlan.machine?.effectiveSPH ?? 6500);

  return { ctpCost, printingCost, makereadyHours, runningHours };
}

/** Fallback binding cost calculation */
function calculateBindingCostFallback(
  bookPlan: BookPlan,
  binding: BindingConfig,
  quantity: number,
): number {
  // Simple fallback: based on page count and binding method
  const baseRate = binding.method === "CASE" ? 25 :
                   binding.method === "PERFECT" ? 8 :
                   binding.method === "SADDLE" ? 5 : 12;

  return quantity * baseRate;
}

/** Fallback finishing cost calculation */
function calculateFinishingCostFallback(
  finishing: FinishingConfig,
  grossSheets: number,
): number {
  let cost = 0;

  if (finishing.lamination) {
    cost += grossSheets * 2.5; // Rs 2.50 per sheet for lamination
  }
  if (finishing.uvVarnish) {
    cost += grossSheets * 1.5;
  }
  if (finishing.spotUV) {
    cost += grossSheets * 5;
  }
  if (finishing.embossing) {
    cost += grossSheets * 8;
  }
  if (finishing.dieCutting) {
    cost += grossSheets * 3;
  }
  if (finishing.foilStamping) {
    cost += grossSheets * 15;
  }

  return cost;
}

/** Fallback packing cost calculation */
function calculatePackingCostFallback(quantity: number): number {
  // Rs 3 per book for standard packing
  return quantity * 3;
}

/** Fallback freight cost calculation */
function calculateFreightCostFallback(quantity: number): number {
  // Base freight: Rs 5 per book
  return quantity * 5;
}

function calculatePrePressCost(
  input: CanonicalEstimationInput,
  totalPlates: number,
): number {
  const prePress = input.prePress;
  if (!prePress) return 0;

  return round2(
    (prePress.epsonProofs * prePress.epsonRatePerPage) +
      (prePress.wetProofs * prePress.wetProofRatePerForm) +
      (prePress.filmOutput ? totalPlates * prePress.filmRatePerPlate : 0) +
      prePress.designCharges,
  );
}

function calculateAdditionalCosts(
  input: CanonicalEstimationInput,
  quantity: number,
): number {
  return round2(
    (input.additionalCosts ?? []).reduce((sum, item) => {
      if (item.isPerCopy) {
        return sum + (item.costPerCopy * quantity);
      }
      return sum + item.totalCost;
    }, 0),
  );
}

function calculatePackingCost(
  input: CanonicalEstimationInput,
  quantity: number,
  bookWeight_g: number,
): number {
  const packing = input.packing;
  if (!packing) {
    return calculatePackingCostFallback(quantity);
  }

  const booksPerCarton = Math.max(1, packing.booksPerCarton || 20);
  const cartons = Math.ceil(quantity / booksPerCarton);
  const cartonRate =
    packing.cartonType === "3PLY" ? 40 :
    packing.cartonType === "SLEEVE" ? 25 :
    65;

  const palletCapacity =
    packing.palletType === "PLASTIC" ? 36 :
    packing.palletType === "WOODEN" ? 40 :
    0;
  const pallets =
    packing.palletize && palletCapacity > 0
      ? Math.ceil(cartons / palletCapacity)
      : 0;
  const palletRate =
    packing.palletType === "PLASTIC" ? 950 :
    packing.palletType === "WOODEN" ? 1250 :
    0;

  const shrinkWrapCost = packing.shrinkWrap ? cartons * 12 : 0;
  const weightFactor =
    bookWeight_g > 750 ? 1.15 :
    bookWeight_g < 150 ? 0.9 :
    1;

  return round2(
    (cartons * cartonRate + pallets * palletRate + shrinkWrapCost) * weightFactor,
  );
}

function calculateFreightCost(
  input: CanonicalEstimationInput,
  quantity: number,
  bookWeight_g: number,
): number {
  const delivery = input.delivery;
  if (!delivery || delivery.deliveryType === "ex_works") {
    return 0;
  }

  const totalWeight_kg = (quantity * Math.max(0.1, bookWeight_g)) / 1000;
  const modeRatePerKg =
    delivery.freightMode === "air" ? 24 :
    delivery.freightMode === "courier" ? 38 :
    delivery.freightMode === "road" ? 4.5 :
    2.2;

  const minimumCharge =
    delivery.freightMode === "air" ? 3500 :
    delivery.freightMode === "courier" ? 2200 :
    750;

  const handlingCost =
    delivery.deliveryType === "ddp" ? 4500 :
    delivery.deliveryType === "cif" ? 2500 :
    delivery.deliveryType === "fob" ? 1200 :
    0;

  const internationalFactor =
    delivery.destinationCountry &&
    delivery.destinationCountry.trim().toLowerCase() !== "india"
      ? 1.2
      : 1;

  return round2(
    Math.max(minimumCharge, totalWeight_kg * modeRatePerKg) * internationalFactor +
      handlingCost,
  );
}

// ─── SINGLE-QUANTITY ESTIMATION ─────────────────────────────────────────────

/**
 * Run the complete estimation for a single quantity,
 * using a pre-computed BookPlan.
 */
function estimateForQuantity(
  input: CanonicalEstimationInput,
  bookPlan: BookPlan,
  _dataSources: DataSources,
): CanonicalEstimationResult {
  const quantity = bookPlan.quantity;
  const aggregator = new CostAggregatorBuilder(quantity, input.pricing);
  const sectionBreakdowns: SectionCostBreakdown[] = [];
  const allDiagnostics: Diagnostic[] = [...bookPlan.diagnostics];

  let totalMakereadyHours = 0;
  let totalRunningHours = 0;
  let totalBookWeightG = 0;
  let totalPlates = 0;

  // ── Process each section ──
  for (const sectionPlan of bookPlan.sections) {
    // ── Paper cost (from BookPlan) ──
    aggregator.addLine(
      "PAPER",
      `Paper — ${sectionPlan.label}`,
      sectionPlan.paperCostTotal,
      "autoPlanner",
      sectionPlan.sectionId,
      {
        grossSheets: sectionPlan.grossSheets,
        netSheets: sectionPlan.netSheets,
        wastageSheets: sectionPlan.wastageSheets,
        costPerSheet: sectionPlan.paper?.costPerSheet ?? 0,
        totalWeight_kg: sectionPlan.totalWeight_kg,
      },
    );

    // ── CTP + Printing cost (fallback calculations) ──
    const printResult = calculatePrintingCostFallback(sectionPlan, quantity);
    const { ctpCost, printingCost, makereadyHours, runningHours } = printResult;

    // Calculate total impressions for this section
    const maxColors = Math.max(sectionPlan.colorsFront, sectionPlan.colorsBack);
    const sectionImpressions = sectionPlan.imposition.selected
      ? sectionPlan.imposition.selected.forms * maxColors * quantity
      : 0;

    aggregator.addLine(
      "CTP",
      `CTP — ${sectionPlan.label}`,
      ctpCost,
      "fallback",
      sectionPlan.sectionId,
      {
        totalPlates: sectionPlan.totalPlates,
        ratePerPlate: ctpCost / Math.max(1, sectionPlan.totalPlates),
      },
    );

    aggregator.addLine(
      "PRINTING",
      `Printing — ${sectionPlan.label}`,
      printingCost,
      "fallback",
      sectionPlan.sectionId,
      {
        totalImpressions: sectionImpressions,
        ratePer1000: 12,
      },
    );

    totalMakereadyHours += makereadyHours;
    totalRunningHours += runningHours;
    totalPlates += sectionPlan.totalPlates;

    // Track weight for binding/packing
    totalBookWeightG += (sectionPlan.totalWeight_kg * 1000) / Math.max(1, quantity);

    // ── Section breakdown ──
    sectionBreakdowns.push({
      sectionId: sectionPlan.sectionId,
      sectionType: sectionPlan.sectionType,
      imposition: sectionPlan.imposition,
      paperCost: sectionPlan.paperCostTotal,
      ctpCost,
      printingCost,
      totalSectionCost: sectionPlan.paperCostTotal + ctpCost + printingCost,
    });
  }

  // ── Binding cost ──
  const bindingCost = calculateBindingCostFallback(bookPlan, input.binding, quantity);
  aggregator.addLine(
    "BINDING",
    "Binding",
    bindingCost,
    "fallback",
    undefined,
  );

  // ── Finishing cost ──
  const totalSheets = bookPlan.sections.reduce((sum, s) => sum + s.grossSheets, 0);
  const finishingCost = calculateFinishingCostFallback(input.finishing, totalSheets);
  aggregator.addLine(
    "FINISHING",
    "Finishing",
    finishingCost,
    "fallback",
    undefined,
  );

  // ── Packing cost ──
  const packingCost = calculatePackingCost(input, quantity, totalBookWeightG);
  aggregator.addLine(
    "PACKING",
    "Packing",
    packingCost,
    "fallback",
    undefined,
  );

  // ── Freight cost ──
  const freightCost = calculateFreightCost(input, quantity, totalBookWeightG);
  aggregator.addLine(
    "FREIGHT",
    "Freight",
    freightCost,
    "fallback",
    undefined,
  );

  const prePressCost = calculatePrePressCost(input, totalPlates);
  if (prePressCost > 0) {
    aggregator.addLine(
      "PRE_PRESS",
      "Pre-Press",
      prePressCost,
      "wizard",
      undefined,
      {
        epsonProofs: input.prePress?.epsonProofs ?? 0,
        wetProofs: input.prePress?.wetProofs ?? 0,
        totalPlates,
      },
    );
  }

  const additionalCost = calculateAdditionalCosts(input, quantity);
  if (additionalCost > 0) {
    aggregator.addLine(
      "ADDITIONAL",
      "Additional",
      additionalCost,
      "wizard",
      undefined,
      {
        lineItems: input.additionalCosts?.length ?? 0,
      },
    );
  }

  // ── Machine hours ──
  const avgHourlyRate = bookPlan.sections.reduce(
    (sum, s) => sum + (s.machine?.machine.hourlyRate ?? 6500),
    0,
  ) / Math.max(1, bookPlan.sections.length);

  aggregator.setMachineHours(
    totalMakereadyHours,
    totalRunningHours,
    avgHourlyRate,
  );

  // ── Build aggregated costs ──
  const aggregated = aggregator.build();

  // ── Compose final result ──
  return {
    id: generateId(),
    estimationId: input.id,
    quantity,
    sections: sectionBreakdowns,
    costs: aggregated.summary,
    pricing: aggregated.pricing,
    machineHours: aggregated.machineHours.total,
    bookWeight_g: Math.round(totalBookWeightG),
    spineThickness_mm: round2(bookPlan.spineThickness_mm),
    diagnostics: allDiagnostics,
    timestamp: new Date().toISOString(),
  };
}

// ─── MAIN ENTRY POINT ──────────────────────────────────────────────────────

/**
 * Run the canonical estimation for all quantities.
 *
 * This is the NEW replacement for calculateFullEstimation().
 *
 * @param input  Canonical estimation input
 * @param data   Live data sources (inventory + rate card)
 * @returns      Array of results, one per quantity
 */
export function runCanonicalEstimation(
  input: CanonicalEstimationInput,
  data: DataSources,
): CanonicalEstimationResult[] {
  const activeQuantities = input.book.quantities.filter((q) => q > 0);
  if (activeQuantities.length === 0) return [];

  // ── Plan all quantities ──
  const plans = autoPlanMultiQuantity(
    {
      trimSize: input.book.trimSize,
      sections: input.sections,
      binding: input.binding,
      inventory: data.inventory,
      rateCard: data.rateCard,
    },
    activeQuantities,
  );

  // ── Estimate each quantity ──
  const results: CanonicalEstimationResult[] = [];

  for (const qty of activeQuantities) {
    const plan = plans.get(qty);
    if (!plan) continue;

    try {
      const result = estimateForQuantity(input, plan, data);
      results.push(result);
    } catch (err) {
      console.error(`Canonical estimation failed for qty ${qty}:`, err);
      results.push(createErrorResult(input.id, qty, err));
    }
  }

  return results;
}

// ─── HELPER FUNCTIONS ──────────────────────────────────────────────────────

function generateId(): string {
  return `est_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function createErrorResult(estimationId: string, quantity: number, err: unknown): CanonicalEstimationResult {
  return {
    id: generateId(),
    estimationId,
    quantity,
    sections: [],
    costs: emptyCostSummary(),
    pricing: emptyPricingSummary(),
    machineHours: 0,
    bookWeight_g: 0,
    spineThickness_mm: 0,
    diagnostics: [{
      level: "ERROR",
      code: "ESTIMATION_FAILED",
      message: `Estimation failed for quantity ${quantity}: ${err instanceof Error ? err.message : String(err)}`,
    }],
    timestamp: new Date().toISOString(),
  };
}

function emptyCostSummary(): CostSummary {
  return {
    paper: 0, ctp: 0, printing: 0, binding: 0, finishing: 0,
    packing: 0, freight: 0, prePress: 0, additional: 0, totalProduction: 0,
  };
}

function emptyPricingSummary(): PricingSummary {
  return {
    costPerCopy: 0, sellingPricePerCopy: 0, sellingPricePerCopy_foreign: 0,
    totalSellingPrice: 0, totalSellingPrice_foreign: 0,
    marginAmount: 0, marginPercent: 0, pricingMethod: "OVERHEAD",
  };
}

// ─── BACKWARD COMPATIBILITY: LEGACY MAPPER ──────────────────────────────────

// These types would normally come from the legacy types file
interface LegacyEstimationInput {
  id: string;
  jobTitle?: string;
  customerName?: string;
  bookSpec: { widthMM: number; heightMM: number };
  quantities: number[];
  textSections: Array<{
    id?: string;
    label?: string;
    enabled: boolean;
    pages: number;
    colorsFront: number;
    colorsBack: number;
    paperTypeId: string;
    paperTypeName?: string;
    gsm: number;
    paperSizeLabel?: string;
    machineId?: string;
    printingMethod?: string;
  }>;
  cover: {
    enabled: boolean;
    pages?: number;
    colorsFront: number;
    colorsBack: number;
    selfCover?: boolean;
    foldType?: string;
    paperTypeId: string;
    paperTypeName?: string;
    gsm: number;
    paperSizeLabel?: string;
    machineId?: string;
  };
  jacket?: {
    enabled: boolean;
    colorsFront?: number;
    colorsBack?: number;
    flapWidth?: number;
    paperTypeId?: string;
    paperTypeName?: string;
    gsm?: number;
  };
  endleaves?: {
    enabled: boolean;
    pages?: number;
    paperTypeName?: string;
    gsm?: number;
  };
  binding: {
    primaryBinding: string;
    boardThickness?: number;
    coveringMaterialName?: string;
    headTailBand?: boolean;
    ribbonMarker?: number;
  };
  finishing: {
    coverLamination?: { enabled: boolean; type?: string };
    uvVarnish?: { enabled: boolean };
    spotUVCover?: { enabled: boolean };
    embossing?: { enabled: boolean; type?: string };
    dieCutting?: { enabled: boolean; complexity?: string };
  };
  pricing: {
    currency?: string;
    exchangeRate?: number;
    marginPercent?: number;
    volumeDiscount?: number;
    commissionPercent?: number;
    taxRate?: number;
    includesTax?: boolean;
  };
  notes?: string;
}

/**
 * Convert old EstimationInput → CanonicalEstimationInput.
 */
export function mapFromLegacyInput(legacy: LegacyEstimationInput): CanonicalEstimationInput {
  const textSections: AnySectionConfig[] = legacy.textSections
    .filter((s) => s.enabled)
    .map((s, idx) => ({
      id: s.id || `text${idx + 1}`,
      type: "TEXT" as const,
      label: s.label || `Text Section ${idx + 1}`,
      enabled: true,
      pages: s.pages,
      colorsFront: s.colorsFront,
      colorsBack: s.colorsBack,
      paper: {
        code: s.paperTypeId,
        name: s.paperTypeName || "Paper",
        category: mapPaperCategory(s.paperTypeId),
        gsm: s.gsm,
        bulkFactor: lookupBulkFactor(s.paperTypeId),
        caliper_microns: calculateCaliper(s.gsm, lookupBulkFactor(s.paperTypeId)),
        grain: "LONG_GRAIN" as const,
      },
      preferredSheet: s.paperSizeLabel,
      preferredMachine: s.machineId,
      preferredMethod: normalizePrintMethod(s.printingMethod),
    }));

  // Cover section
  if (legacy.cover.enabled && !legacy.cover.selfCover) {
    textSections.push({
      id: "cover",
      type: "COVER" as const,
      label: "Cover",
      enabled: true,
      pages: legacy.cover.pages || 4,
      colorsFront: legacy.cover.colorsFront,
      colorsBack: legacy.cover.colorsBack,
      foldType: mapFoldType(legacy.cover.foldType),
      selfCover: false,
      paper: {
        code: legacy.cover.paperTypeId,
        name: legacy.cover.paperTypeName || "Art Card",
        category: mapPaperCategory(legacy.cover.paperTypeId),
        gsm: legacy.cover.gsm,
        bulkFactor: lookupBulkFactor(legacy.cover.paperTypeId),
        caliper_microns: calculateCaliper(legacy.cover.gsm, lookupBulkFactor(legacy.cover.paperTypeId)),
        grain: "LONG_GRAIN",
      },
      preferredSheet: legacy.cover.paperSizeLabel,
      preferredMachine: legacy.cover.machineId,
    } as CoverConfig);
  }

  return {
    id: legacy.id,
    jobTitle: legacy.jobTitle || "",
    customerName: legacy.customerName || "",
    book: {
      trimSize: {
        width: legacy.bookSpec.widthMM,
        height: legacy.bookSpec.heightMM,
      },
      totalPages: legacy.textSections.filter((s) => s.enabled).reduce((sum, s) => sum + s.pages, 0),
      quantities: legacy.quantities,
    },
    sections: textSections,
    binding: {
      method: mapBindingMethod(legacy.binding.primaryBinding),
      boardThickness_mm: legacy.binding.boardThickness,
      coveringMaterial: legacy.binding.coveringMaterialName,
      headTailBand: legacy.binding.headTailBand,
      ribbonMarker: (legacy.binding.ribbonMarker ?? 0) > 0,
    },
    finishing: {
      lamination: legacy.finishing.coverLamination?.enabled
        ? { type: (legacy.finishing.coverLamination.type?.toUpperCase() as "GLOSS" | "MATT" | "SOFT_TOUCH") || "GLOSS", sides: 1 }
        : undefined,
      uvVarnish: legacy.finishing.uvVarnish?.enabled,
      spotUV: legacy.finishing.spotUVCover?.enabled ? { coveragePercent: 15 } : undefined,
      embossing: legacy.finishing.embossing?.enabled
        ? { type: legacy.finishing.embossing.type === "multi_level" ? "MULTI_LEVEL" : "SINGLE_LEVEL" }
        : undefined,
      dieCutting: legacy.finishing.dieCutting?.enabled
        ? { complexity: (legacy.finishing.dieCutting.complexity as "SIMPLE" | "COMPLEX") || "SIMPLE" }
        : undefined,
    },
    pricing: {
      currency: legacy.pricing.currency || "INR",
      exchangeRate: legacy.pricing.exchangeRate || 1,
      marginPercent: legacy.pricing.marginPercent || 25,
      discountPercent: legacy.pricing.volumeDiscount || 0,
      commissionPercent: legacy.pricing.commissionPercent || 0,
      taxRate: legacy.pricing.taxRate || 0,
      includesTax: legacy.pricing.includesTax || false,
    },
    notes: legacy.notes,
  };
}

// ─── MAPPER HELPERS ────────────────────────────────────────────────────────

function normalizePrintMethod(method?: string): "SHEETWISE" | "WORK_AND_TURN" | "WORK_AND_TUMBLE" | "PERFECTING" | undefined {
  const m = (method || "").toLowerCase();
  if (m === "work_and_turn") return "WORK_AND_TURN";
  if (m === "work_and_tumble") return "WORK_AND_TUMBLE";
  if (m === "perfector" || m === "perfecting") return "PERFECTING";
  if (m === "sheetwise") return "SHEETWISE";
  return undefined;
}

function mapPaperCategory(typeId: string): "MATT_ART" | "GLOSS_ART" | "WOODFREE" | "BULKY_WOODFREE" | "BIBLE" | "ART_CARD" | "CHROMO" | "BOARD" | "KRAFT" | "NEWSPRINT" | "CUSTOM" {
  const id = (typeId || "").toLowerCase();
  if (id.includes("matt")) return "MATT_ART";
  if (id.includes("gloss")) return "GLOSS_ART";
  if (id.includes("woodfree") || id.includes("cw")) return "WOODFREE";
  if (id.includes("hb") || id.includes("bulky") || id.includes("holmen")) return "BULKY_WOODFREE";
  if (id.includes("bible")) return "BIBLE";
  if (id.includes("art card") || id.includes("artcard")) return "ART_CARD";
  if (id.includes("chromo")) return "CHROMO";
  if (id.includes("board")) return "BOARD";
  if (id.includes("kraft")) return "KRAFT";
  if (id.includes("newsprint")) return "NEWSPRINT";
  return "CUSTOM";
}

function lookupBulkFactor(typeId: string): number {
  const factors: Record<string, number> = {
    MATT_ART: 1.0, GLOSS_ART: 0.9, WOODFREE: 1.4,
    BULKY_WOODFREE: 2.3, BIBLE: 0.7, ART_CARD: 1.2,
    CHROMO: 1.1, BOARD: 1.3, KRAFT: 1.5, NEWSPRINT: 1.6, CUSTOM: 1.0,
  };
  return factors[mapPaperCategory(typeId)] ?? 1.0;
}

function mapBindingMethod(method: string): BindingConfig["method"] {
  const m = (method || "").toUpperCase();
  if (m.includes("PERFECT")) return "PERFECT";
  if (m.includes("CASE")) return "CASE";
  if (m.includes("SADDLE")) return "SADDLE";
  if (m.includes("SEWN") || m.includes("SECTION")) return "SECTION_SEWN";
  if (m.includes("WIRO")) return "WIRO";
  if (m.includes("SPIRAL")) return "SPIRAL";
  return "PERFECT";
}

function mapFoldType(fold?: string): "WRAP_AROUND" | "GATEFOLD" | "FRENCH_FOLD" {
  const f = (fold || "").toLowerCase();
  if (f.includes("gate")) return "GATEFOLD";
  if (f.includes("french")) return "FRENCH_FOLD";
  return "WRAP_AROUND";
}

// ─── CONVENIENCE: DROP-IN REPLACEMENT ───────────────────────────────────────

/**
 * Drop-in replacement for the existing calculateFullEstimation().
 */
export function calculateFullEstimationV2(
  legacyInput: LegacyEstimationInput,
  dataSources: DataSources,
): unknown[] {
  const canonicalInput = mapFromLegacyInput(legacyInput);
  const canonicalResults = runCanonicalEstimation(canonicalInput, dataSources);
  return canonicalResults;
}
