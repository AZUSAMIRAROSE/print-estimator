import type {
  InventoryItem,
  EstimationInput,
  EstimationResult,
  Quotation,
} from "@/types";
import type { PaperRateEntry } from "@/stores/rateCardStore";
import { createDefaultEstimation } from "@/stores/estimationStore";
import {
  DEFAULT_DESTINATIONS,
  EPSON_PROOF_RATE,
  PACKING_RATES,
  WET_PROOF_RATE,
} from "@/constants";
import type {
  CanonicalEstimationInput,
  CanonicalEstimationResult,
  CoverConfig,
  JacketConfig,
  PaperCategory,
} from "../types";
import type { DataSources } from "../canonicalEngine";
import type { PlanSummary } from "../autoPlanner";
import { autoPlanMultiQuantity, summarizePlan } from "../autoPlanner";
import type { InventoryPaperItem, RateCardPaperEntry } from "../paperResolver";
import { reamWeight_kg, sheetWeight_kg } from "../paperResolver";
import { lookupWastage } from "../constants";
import { createSnapshot, type QuotationSnapshot } from "../snapshot";
import { getRegistry } from "../registry";
import type {
  CanonicalQuotationAttachment,
  DeepMutable,
} from "../quotationTypes";

const STANDARD_SHEET_DIMENSIONS_MM: Record<string, { width: number; height: number }> = {
  "20×30": { width: 508, height: 762 },
  "23×36": { width: 584, height: 914 },
  "25×36": { width: 635, height: 914 },
  "28×40": { width: 711, height: 1016 },
};

const DEFAULT_SHEET_LABEL = "23×36";

export interface CanonicalSnapshotBundle {
  planSummaries: Array<{ quantity: number; summary: PlanSummary }>;
  snapshot: QuotationSnapshot;
}

export interface LegacyQuotationArtifacts {
  legacyEstimation: EstimationInput;
  legacyResults: EstimationResult[];
  quantities: number[];
  totalValue: number;
  quoteSnapshot: NonNullable<Quotation["quoteSnapshot"]>;
  canonicalSnapshot: CanonicalQuotationAttachment;
}

function normalizeSheetLabel(raw?: string): string {
  const value = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!value) return DEFAULT_SHEET_LABEL;

  const canonical = value
    .replace(/[x×*]/g, "×")
    .replace("23by36", "23×36")
    .replace("25by36", "25×36")
    .replace("20by30", "20×30")
    .replace("28by40", "28×40");

  if (canonical.includes("20×30")) return "20×30";
  if (canonical.includes("23×36") || canonical.includes("24×36")) return "23×36";
  if (canonical.includes("25×36")) return "25×36";
  if (canonical.includes("28×40")) return "28×40";

  return DEFAULT_SHEET_LABEL;
}

function toLegacyPaperSizeId(label: string): string {
  return `ps_${normalizeSheetLabel(label).replace("×", "x")}`;
}

function inferPaperCategory(text: string): PaperCategory {
  const value = text.toLowerCase();

  if (value.includes("bulky") || value.includes("holmen") || value.includes("hibulk") || value.includes("ml70")) {
    return "BULKY_WOODFREE";
  }
  if (value.includes("bible")) return "BIBLE";
  if (value.includes("gloss")) return "GLOSS_ART";
  if (value.includes("matt")) return "MATT_ART";
  if (value.includes("art card") || value.includes("c1s") || value.includes("card board")) return "ART_CARD";
  if (value.includes("chromo")) return "CHROMO";
  if (value.includes("kraft")) return "KRAFT";
  if (value.includes("board")) return "BOARD";
  if (value.includes("news")) return "NEWSPRINT";
  if (value.includes("woodfree") || value.includes("offset") || value.includes("cw") || value.includes("map")) {
    return "WOODFREE";
  }

  return "CUSTOM";
}

function extractGsm(text: string, fallback = 0): number {
  const match = text.match(/(\d{2,3})\s*gsm/i);
  return match ? Number(match[1]) : fallback;
}

function getSheetsPerReam(gsm: number): number {
  return gsm >= 200 ? 250 : 500;
}

function getSheetDimensions(label: string): { width: number; height: number } {
  return STANDARD_SHEET_DIMENSIONS_MM[normalizeSheetLabel(label)] ?? STANDARD_SHEET_DIMENSIONS_MM[DEFAULT_SHEET_LABEL];
}

function selectInventorySheetLabel(
  item: InventoryItem,
  category: PaperCategory,
  gsm: number,
  adaptedRateCard: readonly RateCardPaperEntry[],
): string {
  const inlineSource = `${item.name} ${item.description} ${item.notes}`;
  const inlineHasSize = /20|23|25|28/.test(inlineSource);
  if (inlineHasSize) {
    return normalizeSheetLabel(inlineSource);
  }

  const matchingRate = adaptedRateCard.find((entry) => entry.category === category && entry.gsm === gsm);
  if (matchingRate?.sheetLabel) {
    return normalizeSheetLabel(matchingRate.sheetLabel);
  }

  return DEFAULT_SHEET_LABEL;
}

function buildSectionPlanningMap(summary?: PlanSummary): Map<string, PlanSummary["sections"][number]> {
  return new Map((summary?.sections ?? []).map((section) => [section.label, section]));
}

function mapLegacyBindingMethod(method: CanonicalEstimationInput["binding"]["method"]): EstimationInput["binding"]["primaryBinding"] {
  switch (method) {
    case "CASE":
      return "case_binding";
    case "SADDLE":
      return "saddle_stitching";
    case "SECTION_SEWN":
      return "section_sewn_perfect";
    case "WIRO":
      return "wire_o";
    case "SPIRAL":
      return "spiral";
    default:
      return "perfect_binding";
  }
}

function mapLegacyPrintingMethod(method?: string): "sheetwise" | "work_and_turn" | "work_and_tumble" | "perfector" {
  switch ((method ?? "").toUpperCase()) {
    case "WORK_AND_TURN":
      return "work_and_turn";
    case "WORK_AND_TUMBLE":
      return "work_and_tumble";
    case "PERFECTING":
      return "perfector";
    default:
      return "sheetwise";
  }
}

function mapLegacyFoldType(section: CoverConfig): EstimationInput["cover"]["foldType"] {
  switch (section.foldType) {
    case "FRENCH_FOLD":
      return "french_fold";
    case "GATEFOLD":
      return "gatefold";
    default:
      return "wrap_around";
  }
}

function findDestination(input: CanonicalEstimationInput) {
  const country = input.delivery?.destinationCountry?.toLowerCase() ?? "";
  const city = input.delivery?.destinationCity?.toLowerCase() ?? "";

  return (
    DEFAULT_DESTINATIONS.find((destination) => destination.country.toLowerCase() === country) ??
    DEFAULT_DESTINATIONS.find((destination) => destination.name.toLowerCase().includes(city)) ??
    DEFAULT_DESTINATIONS[0]
  );
}

function calculateQuotationFinancials(
  input: CanonicalEstimationInput,
  result: CanonicalEstimationResult,
) {
  const commission = result.pricing.totalSellingPrice * ((input.pricing.commissionPercent ?? 0) / 100);
  const taxAmount = input.pricing.includesTax
    ? result.pricing.totalSellingPrice - result.pricing.totalSellingPrice / (1 + (input.pricing.taxRate || 0) / 100)
    : result.pricing.totalSellingPrice * ((input.pricing.taxRate || 0) / 100);
  const grandTotal = input.pricing.includesTax
    ? result.pricing.totalSellingPrice
    : result.pricing.totalSellingPrice + taxAmount;

  return {
    commission,
    taxAmount,
    grandTotal,
  };
}

function buildLegacyPlanningSummary(
  summary: PlanSummary | undefined,
  issues: NonNullable<Quotation["quoteSnapshot"]>["planning"]["issues"],
  blocked: boolean,
): NonNullable<Quotation["quoteSnapshot"]>["planning"] {
  return {
    sections: (summary?.sections ?? []).map((section) => ({
      section: section.label,
      paperSize: section.sheet,
      imposition: `${section.signature} ${section.method}`,
      signature: Number.parseInt(section.signature.replace("pp", ""), 10) || 0,
      ups: section.ups,
      grainCompliant: !section.grain.toLowerCase().includes("warn"),
      machineId: "",
      machineName: section.machine,
      source: "auto",
      warnings: section.grain.toLowerCase().includes("warn") ? [section.grain] : [],
    })),
    blocked,
    issues,
  };
}

export function adaptRateCardEntries(entries: readonly PaperRateEntry[]): RateCardPaperEntry[] {
  return entries
    .filter((entry) => entry.status === "active" && entry.gsm > 0)
    .map((entry) => ({
      category: inferPaperCategory(`${entry.paperType} ${entry.code}`),
      gsm: entry.gsm,
      ratePerKg: entry.ratePerKg > 0 ? entry.ratePerKg : entry.effectiveRate,
      ratePerReam: entry.chargeRate > 0 ? entry.chargeRate : undefined,
      sheetLabel: normalizeSheetLabel(entry.size),
      isActive: entry.status === "active",
    }));
}

export function adaptInventoryItems(
  items: readonly InventoryItem[],
  adaptedRateCard: readonly RateCardPaperEntry[],
): InventoryPaperItem[] {
  return items
    .filter((item) => item.category === "paper" && item.status === "active")
    .map((item) => {
      const category = inferPaperCategory(`${item.name} ${item.subcategory}`);
      const gsm = extractGsm(`${item.name} ${item.description} ${item.notes}`);
      const sheetLabel = selectInventorySheetLabel(item, category, gsm, adaptedRateCard);
      const sheetSize_mm = getSheetDimensions(sheetLabel);
      const sheetsPerUnit = item.unit.toLowerCase().includes("ream") ? getSheetsPerReam(gsm) : 1;
      const stockSheets = Math.max(0, item.stock) * sheetsPerUnit;
      const unitCost = item.costPerUnit || item.avgCost || item.lastPurchasePrice || 0;
      const costPerSheet = sheetsPerUnit > 1 ? unitCost / sheetsPerUnit : unitCost;
      const weightPerReamKg = reamWeight_kg(sheetSize_mm, gsm || 1);
      const costPerKg = item.weight > 0
        ? unitCost / item.weight
        : weightPerReamKg > 0
          ? unitCost / weightPerReamKg
          : 0;

      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        category,
        gsm,
        grain: "LONG_GRAIN" as const,
        sheetLabel,
        sheetSize_mm,
        stockSheets,
        costPerKg,
        costPerSheet,
        supplier: item.supplier,
        lastUpdated: item.lastUpdated,
      };
    })
    .filter((item) => item.gsm > 0);
}

export function buildCanonicalDataSources(
  inventoryItems: readonly InventoryItem[],
  paperRates: readonly PaperRateEntry[],
): DataSources {
  const rateCard = adaptRateCardEntries(paperRates);

  return {
    inventory: adaptInventoryItems(inventoryItems, rateCard),
    rateCard,
  };
}

export function buildCanonicalSnapshotBundle(
  input: CanonicalEstimationInput,
  results: readonly CanonicalEstimationResult[],
  dataSources: DataSources,
  createdBy: string,
): CanonicalSnapshotBundle {
  const activeQuantities = input.book.quantities.filter((quantity) => quantity > 0);
  const plans = autoPlanMultiQuantity(
    {
      trimSize: input.book.trimSize,
      sections: input.sections,
      binding: input.binding,
      inventory: dataSources.inventory,
      rateCard: dataSources.rateCard,
    },
    activeQuantities,
  );

  const planSummaries = activeQuantities
    .map((quantity) => {
      const plan = plans.get(quantity);
      return plan ? { quantity, summary: summarizePlan(plan) } : null;
    })
    .filter((value): value is { quantity: number; summary: PlanSummary } => value !== null);

  const registry = getRegistry({
    inventory: dataSources.inventory,
    rateCard: dataSources.rateCard,
  });

  return {
    planSummaries,
    snapshot: createSnapshot({
      estimationId: input.id,
      jobTitle: input.jobTitle,
      customerName: input.customerName,
      input,
      results,
      planSummaries,
      registry,
      rateCard: dataSources.rateCard,
      inventory: dataSources.inventory,
      createdBy,
      notes: input.notes ?? "",
    }),
  };
}

export function buildQuotationArtifactsFromCanonical(
  input: CanonicalEstimationInput,
  results: readonly CanonicalEstimationResult[],
  dataSources: DataSources,
  createdBy: string,
  quotationId = "",
  pricingVersion = 1,
): LegacyQuotationArtifacts {
  if (!results.length) {
    throw new Error("At least one canonical result is required to build quotation artifacts.");
  }

  const primaryResult = results[0];
  const snapshotBundle = buildCanonicalSnapshotBundle(input, results, dataSources, createdBy);
  const primaryPlanSummary = snapshotBundle.planSummaries[0]?.summary;
  const legacyEstimation = mapCanonicalToLegacyEstimation(input, primaryResult, primaryPlanSummary);
  const legacyResults = results.map((result, index) => (
    mapCanonicalResultToLegacy(result, input, index)
  ));
  const issues = legacyResults[0]?.planningIssues ?? [];

  return {
    legacyEstimation,
    legacyResults,
    quantities: results.map((result) => result.quantity),
    totalValue: legacyResults[0]?.grandTotal ?? 0,
    quoteSnapshot: {
      id: snapshotBundle.snapshot.id,
      quotationId,
      sourceEstimateId: input.id,
      pricingVersion,
      plannedAt: snapshotBundle.snapshot.createdAt,
      estimationInput: legacyEstimation,
      result: legacyResults[0],
      planning: buildLegacyPlanningSummary(primaryPlanSummary, issues, legacyResults[0]?.grandTotal === 0),
      procurement: legacyResults[0]?.procurementRecommendations ?? [],
      issues,
    },
    canonicalSnapshot: {
      input: structuredClone(input) as DeepMutable<CanonicalEstimationInput>,
      results: structuredClone(results) as DeepMutable<CanonicalEstimationResult>[],
      planSummaries: structuredClone(snapshotBundle.planSummaries) as CanonicalQuotationAttachment["planSummaries"],
      snapshot: structuredClone(snapshotBundle.snapshot) as CanonicalQuotationAttachment["snapshot"],
    },
  };
}

export function mapCanonicalToLegacyEstimation(
  input: CanonicalEstimationInput,
  primaryResult?: CanonicalEstimationResult,
  primaryPlanSummary?: PlanSummary,
): EstimationInput {
  const estimation = createDefaultEstimation();
  const planSections = buildSectionPlanningMap(primaryPlanSummary);
  const now = new Date().toISOString();
  const destination = findDestination(input);
  const packing = input.packing;
  const delivery = input.delivery;
  const prePress = input.prePress;

  estimation.id = input.id;
  estimation.jobTitle = input.jobTitle;
  estimation.customerName = input.customerName;
  estimation.referenceNumber = input.poNumber ?? "";
  estimation.estimatedBy = input.estimatedBy ?? "";
  estimation.estimationDate = now.split("T")[0];
  estimation.poNumber = input.poNumber ?? "";
  estimation.quantities = [...input.book.quantities];
  estimation.bookSpec = {
    heightMM: input.book.trimSize.height,
    widthMM: input.book.trimSize.width,
    orientation: input.book.trimSize.width === input.book.trimSize.height ? "square" : "portrait",
    trimSizePreset: `${input.book.trimSize.width} × ${input.book.trimSize.height} mm`,
    customSize: true,
    spineThickness: primaryResult?.spineThickness_mm ?? 0,
    spineWithBoard: input.binding.method === "CASE"
      ? (primaryResult?.spineThickness_mm ?? 0) + ((input.binding.boardThickness_mm ?? 0) * 2)
      : primaryResult?.spineThickness_mm ?? 0,
    totalPages: input.book.totalPages,
  };

  estimation.textSections = input.sections
    .filter((section) => section.type === "TEXT")
    .map((section) => {
      const plan = planSections.get(section.label);
      const sheetLabel = normalizeSheetLabel(plan?.sheet ?? section.preferredSheet);

      return {
        id: section.id,
        enabled: section.enabled,
        label: section.label,
        pages: section.pages,
        colorsFront: section.colorsFront,
        colorsBack: section.colorsBack,
        paperTypeId: section.paper.code,
        paperTypeName: section.paper.name,
        gsm: section.customPaper?.gsm ?? section.paper.gsm,
        paperSizeId: toLegacyPaperSizeId(sheetLabel),
        paperSizeLabel: sheetLabel,
        isCustomPaper: Boolean(section.customPaper),
        customPaperWidth: section.customPaper?.sheetSize?.width,
        customPaperHeight: section.customPaper?.sheetSize?.height,
        customPaperGrain: section.customPaper?.grain,
        customPaperBulk: section.customPaper?.bulkFactor,
        machineId: section.preferredMachine ?? "rmgt",
        machineName: plan?.machine ?? "RMGT 920",
        plateChanges: 0,
        printingMethod: mapLegacyPrintingMethod(plan?.method ?? section.preferredMethod),
        planningMode: section.preferredSheet || section.preferredMachine || section.preferredMethod ? "manual_override" : "auto",
        recommendedPaperSizeLabel: plan?.sheet,
        recommendedMachineId: section.preferredMachine,
        recommendedMachineName: plan?.machine,
        recommendedSignature: Number.parseInt(plan?.signature.replace("pp", "") ?? "", 10) || undefined,
        recommendedUps: plan?.ups,
        planningWarnings: plan?.grain.includes("warn") ? [plan.grain] : [],
      };
    });

  const coverSection = input.sections.find((section): section is CoverConfig => section.type === "COVER");
  if (coverSection) {
    const plan = planSections.get(coverSection.label);
    const sheetLabel = normalizeSheetLabel(plan?.sheet ?? coverSection.preferredSheet);

    estimation.cover = {
      enabled: coverSection.enabled,
      pages: coverSection.pages,
      colorsFront: coverSection.colorsFront,
      colorsBack: coverSection.colorsBack,
      paperTypeId: coverSection.paper.code,
      paperTypeName: coverSection.paper.name,
      gsm: coverSection.customPaper?.gsm ?? coverSection.paper.gsm,
      paperSizeId: toLegacyPaperSizeId(sheetLabel),
      paperSizeLabel: sheetLabel,
      isCustomPaper: Boolean(coverSection.customPaper),
      customPaperWidth: coverSection.customPaper?.sheetSize?.width,
      customPaperHeight: coverSection.customPaper?.sheetSize?.height,
      customPaperGrain: coverSection.customPaper?.grain,
      customPaperBulk: coverSection.customPaper?.bulkFactor,
      machineId: coverSection.preferredMachine ?? "rmgt",
      machineName: plan?.machine ?? "RMGT 920",
      selfCover: coverSection.selfCover,
      separateCover: !coverSection.selfCover,
      foldType: mapLegacyFoldType(coverSection),
      planningMode: coverSection.preferredSheet || coverSection.preferredMachine ? "manual_override" : "auto",
      recommendedPaperSizeLabel: plan?.sheet,
      recommendedMachineId: coverSection.preferredMachine,
      recommendedMachineName: plan?.machine,
      planningWarnings: plan?.grain.includes("warn") ? [plan.grain] : [],
    };
  } else {
    estimation.cover.enabled = false;
    estimation.cover.separateCover = false;
  }

  const jacketSection = input.sections.find((section): section is JacketConfig => section.type === "JACKET");
  if (jacketSection) {
    const plan = planSections.get(jacketSection.label);
    const sheetLabel = normalizeSheetLabel(plan?.sheet ?? jacketSection.preferredSheet);

    estimation.jacket = {
      enabled: jacketSection.enabled,
      colorsFront: jacketSection.colorsFront,
      colorsBack: jacketSection.colorsBack,
      paperTypeId: jacketSection.paper.code,
      paperTypeName: jacketSection.paper.name,
      gsm: jacketSection.customPaper?.gsm ?? jacketSection.paper.gsm,
      paperSizeId: toLegacyPaperSizeId(sheetLabel),
      paperSizeLabel: sheetLabel,
      isCustomPaper: Boolean(jacketSection.customPaper),
      customPaperWidth: jacketSection.customPaper?.sheetSize?.width,
      customPaperHeight: jacketSection.customPaper?.sheetSize?.height,
      customPaperGrain: jacketSection.customPaper?.grain,
      customPaperBulk: jacketSection.customPaper?.bulkFactor,
      machineId: jacketSection.preferredMachine ?? "fav",
      machineName: plan?.machine ?? "Favourit (FAV)",
      laminationType: input.finishing.lamination?.type?.toLowerCase() ?? "gloss",
      extraJacketsPercent: 5,
      goldBlockingFront: false,
      goldBlockingSpine: false,
      spotUV: Boolean(input.finishing.spotUV),
      flapWidth: jacketSection.flapWidth_mm,
      planningMode: jacketSection.preferredSheet || jacketSection.preferredMachine ? "manual_override" : "auto",
      recommendedPaperSizeLabel: plan?.sheet,
      recommendedMachineId: jacketSection.preferredMachine,
      recommendedMachineName: plan?.machine,
      planningWarnings: plan?.grain.includes("warn") ? [plan.grain] : [],
    };
  } else {
    estimation.jacket.enabled = false;
  }

  const endleafSection = input.sections.find((section) => section.type === "ENDLEAVES");
  if (endleafSection) {
    const plan = planSections.get(endleafSection.label);
    const sheetLabel = normalizeSheetLabel(plan?.sheet ?? endleafSection.preferredSheet);

    estimation.endleaves = {
      enabled: endleafSection.enabled,
      pages: endleafSection.pages,
      colorsFront: endleafSection.colorsFront,
      colorsBack: endleafSection.colorsBack,
      paperTypeId: endleafSection.paper.code,
      paperTypeName: endleafSection.paper.name,
      gsm: endleafSection.customPaper?.gsm ?? endleafSection.paper.gsm,
      paperSizeId: toLegacyPaperSizeId(sheetLabel),
      paperSizeLabel: sheetLabel,
      isCustomPaper: Boolean(endleafSection.customPaper),
      customPaperWidth: endleafSection.customPaper?.sheetSize?.width,
      customPaperHeight: endleafSection.customPaper?.sheetSize?.height,
      customPaperGrain: endleafSection.customPaper?.grain,
      customPaperBulk: endleafSection.customPaper?.bulkFactor,
      machineId: endleafSection.preferredMachine ?? "rmgt",
      machineName: plan?.machine ?? "RMGT 920",
      type: "printed",
      selfEndleaves: false,
      planningMode: endleafSection.preferredSheet || endleafSection.preferredMachine ? "manual_override" : "auto",
      recommendedPaperSizeLabel: plan?.sheet,
      recommendedMachineId: endleafSection.preferredMachine,
      recommendedMachineName: plan?.machine,
      planningWarnings: plan?.grain.includes("warn") ? [plan.grain] : [],
    };
  } else {
    estimation.endleaves.enabled = false;
  }

  estimation.binding = {
    ...estimation.binding,
    primaryBinding: mapLegacyBindingMethod(input.binding.method),
    boardThickness: input.binding.boardThickness_mm ?? estimation.binding.boardThickness,
    coveringMaterialName: input.binding.coveringMaterial ?? estimation.binding.coveringMaterialName,
    caseMaterial: input.binding.method === "CASE" ? "cloth" : "printed_paper",
    ribbonMarker: input.binding.ribbonMarker ? 1 : 0,
    headTailBand: input.binding.headTailBand ?? false,
  };

  estimation.finishing = {
    ...estimation.finishing,
    coverLamination: {
      enabled: Boolean(input.finishing.lamination),
      type: (input.finishing.lamination?.type?.toLowerCase() as EstimationInput["finishing"]["coverLamination"]["type"]) ?? "none",
      machineId: "",
    },
    jacketLamination: {
      enabled: Boolean(jacketSection && input.finishing.lamination),
      type: (input.finishing.lamination?.type?.toLowerCase() as EstimationInput["finishing"]["jacketLamination"]["type"]) ?? "gloss",
    },
    spotUVCover: {
      enabled: Boolean(input.finishing.spotUV),
      type: "front",
    },
    uvVarnish: {
      enabled: Boolean(input.finishing.uvVarnish),
      sections: input.finishing.uvVarnish ? ["cover"] : [],
    },
    embossing: {
      enabled: Boolean(input.finishing.embossing),
      type: input.finishing.embossing?.type === "MULTI_LEVEL" ? "multi_level" : "single",
      location: ["front"],
    },
    dieCutting: {
      enabled: Boolean(input.finishing.dieCutting),
      complexity: input.finishing.dieCutting?.complexity === "COMPLEX" ? "complex" : "simple",
    },
    foilStamping: {
      enabled: Boolean(input.finishing.foilStamping),
      foilType: "gold",
      location: ["front"],
    },
  };

  estimation.packing = {
    ...estimation.packing,
    useCartons: true,
    usePallets: packing?.palletize ?? true,
    cartonType: packing?.cartonType === "3PLY" ? "3_ply" : packing?.cartonType === "5PLY" ? "5_ply" : "custom",
    cartonRate: packing?.cartonType === "3PLY" ? PACKING_RATES.carton3Ply : packing?.cartonType === "5PLY" ? PACKING_RATES.carton5Ply : PACKING_RATES.carton5Ply,
    customBooksPerCarton: packing?.booksPerCarton ?? 20,
    palletType: packing?.palletType === "WOODEN" ? "heat_treated" : "custom",
    palletRate: packing?.palletType === "WOODEN" ? PACKING_RATES.palletHeatTreated : PACKING_RATES.palletStandard,
    stretchWrap: packing?.palletize ?? true,
    stretchWrapRate: PACKING_RATES.stretchWrap,
    shrinkWrap: packing?.shrinkWrap ?? false,
    shrinkWrapRate: 350,
    strapping: packing?.palletize ?? true,
    strappingRate: PACKING_RATES.strapping,
    cornerProtectors: packing?.palletize ?? true,
    cornerProtectorRate: PACKING_RATES.cornerProtectors,
    maxCartonWeight: PACKING_RATES.maxCartonWeight,
    maxPalletHeight: PACKING_RATES.maxPalletHeight,
    maxPalletWeight: PACKING_RATES.maxPalletWeight,
  };

  estimation.delivery = {
    ...estimation.delivery,
    destinationId: destination.id,
    destinationName: delivery?.destinationCity || delivery?.destinationCountry || destination.name,
    deliveryType: delivery?.deliveryType === "ex_works" ? "ex_works" : delivery?.deliveryType ?? "fob",
    freightMode: delivery?.freightMode ?? "sea",
    portOfLoading: "JNPT Mumbai",
    numberOfDespatches: 1,
    localDespatches: destination.country === "India" ? 1 : 0,
    overseasDespatches: destination.country === "India" ? 0 : 1,
    advanceCopies: 0,
    advanceCopiesAirFreight: delivery?.freightMode === "air",
    advanceCopiesRate: 0,
    customsClearance: destination.clearanceCharges ?? 0,
    insurance: delivery?.deliveryType === "cif" || delivery?.deliveryType === "ddp",
    insuranceRate: destination.insurancePercent ?? 0,
  };

  estimation.prePress = {
    epsonProofs: prePress?.epsonProofs ?? 0,
    epsonRatePerPage: prePress?.epsonRatePerPage ?? EPSON_PROOF_RATE,
    wetProofs: prePress?.wetProofs ?? 0,
    wetProofRatePerForm: prePress?.wetProofRatePerForm ?? WET_PROOF_RATE,
    filmOutput: prePress?.filmOutput ?? false,
    filmRatePerPlate: prePress?.filmRatePerPlate ?? 180,
    designCharges: prePress?.designCharges ?? 0,
    originationType: "from_pdf",
  };

  estimation.pricing = {
    ...estimation.pricing,
    marginPercent: input.pricing.marginPercent,
    commissionPercent: input.pricing.commissionPercent,
    currency: (input.pricing.currency as EstimationInput["pricing"]["currency"]) ?? "INR",
    exchangeRate: input.pricing.exchangeRate,
    volumeDiscount: input.pricing.discountPercent,
    paymentTerms: input.pricing.currency === "INR" ? "100% Advance" : "L/C at Sight",
    paymentDays: 30,
    quotationValidity: 15,
    taxType: input.pricing.taxRate > 0 ? "custom" : "none",
    taxRate: input.pricing.taxRate,
    includesTax: input.pricing.includesTax,
  };

  estimation.additionalCosts = (input.additionalCosts ?? []).map((item) => ({
    id: item.id,
    description: item.description,
    costPerCopy: item.costPerCopy,
    totalCost: item.totalCost,
    isPerCopy: item.isPerCopy,
    category: "custom",
  }));
  estimation.notes = input.notes ?? "";
  estimation.internalNotes = "";
  estimation.status = "draft";
  estimation.createdAt = now;
  estimation.updatedAt = now;

  return estimation;
}

export function mapCanonicalResultToLegacy(
  result: CanonicalEstimationResult,
  input: CanonicalEstimationInput,
  quantityIndex = 0,
): EstimationResult {
  const now = new Date().toISOString();
  const { commission, taxAmount, grandTotal } = calculateQuotationFinancials(input, result);
  const booksPerCarton = Math.max(1, input.packing?.booksPerCarton ?? 20);
  const totalCartons = Math.ceil(result.quantity / booksPerCarton);
  const cartonsPerPallet = input.packing?.palletType === "PLASTIC" ? 36 : 40;
  const totalPallets = input.packing?.palletize ? Math.ceil(totalCartons / cartonsPerPallet) : 0;
  const planningIssues = result.diagnostics
    .filter((diagnostic) => diagnostic.level !== "INFO")
    .map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.level === "ERROR" ? "error" as const : "warning" as const,
      message: diagnostic.message,
      section: undefined,
      impact: diagnostic.level === "ERROR" ? "Calculation blocked or degraded" : "Review recommended",
    }));

  const planningSummary = result.sections.map((section) => {
    const selected = section.imposition.selected;

    return {
      section: section.sectionId,
      paperSize: selected.sheet.label,
      imposition: `${selected.signaturePages}pp ${selected.method}`,
      signature: selected.signaturePages,
      ups: selected.ups,
      machineId: "",
      grainCompliant: selected.grain.compliant,
      source: "auto" as const,
      warnings: selected.grain.compliant ? [] : [selected.grain.note],
    };
  });

  return {
    id: `${result.id}_legacy`,
    estimationId: result.estimationId,
    quantity: result.quantity,
    quantityIndex,
    paperCosts: result.sections.map((section) => {
      const selected = section.imposition.selected;
      const sourceSection = input.sections.find((candidate) => candidate.id === section.sectionId);
      const gsm = sourceSection?.customPaper?.gsm ?? sourceSection?.paper.gsm ?? 0;
      const sheetSize = getSheetDimensions(selected.sheet.label);
      const wastage = lookupWastage(result.quantity, selected.totalNetSheets);
      const grossSheets = selected.totalNetSheets + wastage.totalWaste;
      const ratePerSheet = grossSheets > 0 ? section.paperCost / grossSheets : 0;

      return {
        sectionName: sourceSection?.label ?? section.sectionId,
        sectionType: sourceSection?.type === "TEXT"
          ? "text1"
          : sourceSection?.type === "COVER"
            ? "cover"
            : sourceSection?.type === "JACKET"
              ? "jacket"
              : "endleaves",
        paperType: sourceSection?.paper.name ?? "Paper",
        gsm,
        paperSize: selected.sheet.label,
        ppPerForm: selected.signaturePages,
        numberOfForms: selected.forms,
        ups: selected.ups,
        formatSize: `${input.book.trimSize.width} × ${input.book.trimSize.height} mm`,
        netSheets: selected.totalNetSheets,
        wastageSheets: wastage.totalWaste,
        grossSheets,
        reams: grossSheets / 500,
        weightPerReam: reamWeight_kg(sheetSize, gsm),
        totalWeight: sheetWeight_kg(sheetSize, gsm) * grossSheets,
        ratePerReam: ratePerSheet * 500,
        totalCost: section.paperCost,
        imposition: {
          signature: `${selected.signaturePages}pp`,
          method: selected.method,
          sheet: selected.sheet.label,
        },
        grainCompliant: selected.grain.compliant,
        sourceSelection: {
          source: "fallback",
          confidence: 0.7,
          inStock: false,
        },
      };
    }),
    totalPaperCost: result.costs.paper,
    printingCosts: result.sections.map((section) => {
      const selected = section.imposition.selected;
      const sourceSection = input.sections.find((candidate) => candidate.id === section.sectionId);
      const maxColors = Math.max(sourceSection?.colorsFront ?? 0, sourceSection?.colorsBack ?? 0);
      const totalImpressions = selected.forms * Math.max(1, maxColors) * result.quantity;

      return {
        sectionName: sourceSection?.label ?? section.sectionId,
        sectionType: sourceSection?.type.toLowerCase() ?? "text1",
        machineId: sourceSection?.preferredMachine ?? "",
        machineName: sourceSection?.preferredMachine ?? "Auto-selected",
        totalPlates: selected.totalPlates,
        impressionsPerForm: selected.ups,
        totalImpressions,
        ratePer1000: totalImpressions > 0 ? section.printingCost / (totalImpressions / 1000) : 0,
        printingCost: section.printingCost,
        makeReadyCost: 0,
        runningHours: 0,
        makereadyHours: 0,
        totalCost: section.printingCost,
      };
    }),
    totalPrintingCost: result.costs.printing,
    ctpCosts: result.sections.map((section) => {
      const selected = section.imposition.selected;
      const sourceSection = input.sections.find((candidate) => candidate.id === section.sectionId);

      return {
        sectionName: sourceSection?.label ?? section.sectionId,
        sectionType: sourceSection?.type.toLowerCase() ?? "text1",
        totalPlates: selected.totalPlates,
        ratePerPlate: selected.totalPlates > 0 ? section.ctpCost / selected.totalPlates : 0,
        totalCost: section.ctpCost,
      };
    }),
    totalCTPCost: result.costs.ctp,
    bindingCost: result.costs.binding,
    bindingCostPerCopy: result.quantity > 0 ? result.costs.binding / result.quantity : 0,
    bindingBreakdown: {
      method: result.costs.binding,
    },
    finishingCost: result.costs.finishing,
    finishingCostPerCopy: result.quantity > 0 ? result.costs.finishing / result.quantity : 0,
    finishingBreakdown: {
      finishing: result.costs.finishing,
    },
    packingCost: result.costs.packing,
    packingCostPerCopy: result.quantity > 0 ? result.costs.packing / result.quantity : 0,
    packingBreakdown: {
      booksPerCarton,
      totalCartons,
      cartonCost: result.costs.packing,
      totalPallets,
      palletCost: 0,
      stretchWrapCost: 0,
      shrinkWrapCost: input.packing?.shrinkWrap ? result.costs.packing * 0.1 : 0,
      strappingCost: 0,
      cornerProtectorCost: 0,
      otherPackingCost: 0,
      totalPackingCost: result.costs.packing,
      weightPerBook: result.bookWeight_g,
      totalWeight: (result.bookWeight_g * result.quantity) / 1000,
    },
    freightCost: result.costs.freight,
    freightCostPerCopy: result.quantity > 0 ? result.costs.freight / result.quantity : 0,
    freightBreakdown: {
      freight: result.costs.freight,
    },
    prePressCost: result.costs.prePress,
    additionalCost: result.costs.additional,
    totalProductionCost: result.costs.totalProduction,
    totalCostPerCopy: result.pricing.costPerCopy,
    sellingPricePerCopy: result.pricing.sellingPricePerCopy,
    sellingPriceForeignCurrency: result.pricing.sellingPricePerCopy_foreign,
    totalSellingPrice: result.pricing.totalSellingPrice,
    totalSellingPriceForeign: result.pricing.totalSellingPrice_foreign,
    marginAmount: result.pricing.marginAmount,
    commission,
    taxAmount,
    grandTotal,
    tph: result.machineHours > 0 ? grandTotal / result.machineHours : grandTotal,
    totalMachineHours: result.machineHours,
    makeReadyHours: 0,
    runningHours: result.machineHours,
    weightPerBook: result.bookWeight_g,
    totalWeight: (result.bookWeight_g * result.quantity) / 1000,
    spineThickness: result.spineThickness_mm,
    spineWithBoard: input.binding.method === "CASE"
      ? result.spineThickness_mm + ((input.binding.boardThickness_mm ?? 0) * 2)
      : result.spineThickness_mm,
    booksPerCarton,
    totalCartons,
    cartonsPerPallet,
    totalPallets,
    planningIssues,
    procurementRecommendations: [],
    diagnostics: planningSummary.map((summary) => ({
      section: summary.section,
      strategy: "canonical_v2",
      selectedCandidate: `${summary.paperSize} / ${summary.imposition}`,
      rejectedCandidates: [],
    })),
    planningSummary,
    createdAt: now,
  };
}
