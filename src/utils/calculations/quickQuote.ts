// ============================================================================
// ADVANCED QUICK QUOTE ENGINE — FULL-PRECISION PRINT ESTIMATION
// ============================================================================
// Uses LIVE data from Rate Card, Machine, and Inventory stores.
// Falls back to hardcoded constants only when stores are empty.
// ============================================================================

import { DEFAULT_PAPER_RATES, LAMINATION_RATES, DEFAULT_MACHINES } from "../../constants/index.ts";
import { calculatePaperRequirement } from "./paper.ts";
import { calculatePrintingCostGodLevel } from "./printing.ts";
import { calculateCTPCost } from "./ctp.ts";
import { calculateBindingCostGodLevel } from "./binding.ts";
import { calculateSpineThickness, calculateSpineWithBoard } from "./spine.ts";
import { calculateBookWeight, type BookWeightResult } from "./weight.ts";
import type { BindingType, SectionPaperCost, SectionPrintingCost, SectionCTPCost } from "@/types";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useMachineStore } from "@/stores/machineStore";

// ── Live Store Accessors (with fallback) ─────────────────────────────────────
function getLivePaperRates() {
  const storeRates = useRateCardStore.getState().paperRates.filter(r => r.status === 'active');
  return storeRates.length > 0 ? storeRates : DEFAULT_PAPER_RATES.map(r => ({ ...r, status: 'active' as const }));
}

function getLiveMachines() {
  const { machines } = useMachineStore.getState();
  const active = Array.from(machines.values()).filter((m: any) => m.status !== 'decommissioned');
  if (active.length > 0) {
    return active.map((m: any) => ({
      id: m.id,
      code: m.code || m.id.toUpperCase(),
      name: m.name || m.nickname || m.id,
      type: 'offset' as const,
      maxSheetWidth: m.maxSheetWidth_inches || m.maxSheetWidth || 23,
      maxSheetHeight: m.maxSheetHeight_inches || m.maxSheetHeight || 36,
      minSheetWidth: m.minSheetWidth_inches || m.minSheetWidth || 12,
      minSheetHeight: m.minSheetHeight_inches || m.minSheetHeight || 18,
      maxColors: m.maxColors || 4,
      hasAQUnit: m.hasCoatingUnit || false,
      hasPerfector: m.canPerfect || false,
      speedSPH: m.effectiveSpeed || m.ratedSpeed || 8000,
      makeReadyCost: m.makeReadyCost_per || 1200,
      makeReadyTime: m.makeReadyTime_hours || 0.3,
      washingCost: m.washingCost_per || 200,
      plateSize: `${m.maxSheetWidth_inches || m.maxSheetWidth || 23}x${m.maxSheetHeight_inches || m.maxSheetHeight || 36}`,
      gripperMargin: m.gripperMargin_mm || 12,
      tailMargin: m.tailMargin_mm || 8,
      sideMargin: m.sideMargin_mm || 5,
      ctpRate: m.plateCost_each || 271,
      hourlyRate: m.totalHourlyCost || 3200,
      isActive: true,
    }));
  }
  return DEFAULT_MACHINES;
}

function getLiveLaminationRates(): Record<string, { ratePerCopy: number; minOrder: number }> {
  const storeRates = useRateCardStore.getState().lamination.filter(r => r.status === 'active');
  if (storeRates.length > 0) {
    const map: Record<string, { ratePerCopy: number; minOrder: number }> = {};
    storeRates.forEach(r => { map[r.type] = { ratePerCopy: r.ratePerCopy, minOrder: r.minOrder }; });
    return map;
  }
  return LAMINATION_RATES;
}

function getLiveSpotUVRate(qty: number): { ratePerCopy: number; blockCost: number } {
  const storeRates = useRateCardStore.getState().spotUV.filter(r => r.status === 'active');
  if (storeRates.length > 0) {
    const match = storeRates.find(r => qty >= r.minQty && qty <= r.maxQty);
    if (match) return { ratePerCopy: match.ratePerCopy, blockCost: match.blockCost };
    // Use last entry as fallback
    const last = storeRates[storeRates.length - 1];
    return { ratePerCopy: last.ratePerCopy, blockCost: last.blockCost };
  }
  // Hardcoded fallback
  const rate = qty >= 10000 ? 0.80 : qty >= 5000 ? 1.00 : qty >= 2000 ? 1.28 : 1.50;
  return { ratePerCopy: rate, blockCost: 2500 };
}

function getLiveDestinations() {
  const storeDest = useRateCardStore.getState().freightDestinations.filter(r => r.isActive);
  return storeDest.length > 0 ? storeDest : [];
}

// ── Types ────────────────────────────────────────────────────────────────────

export type Turnaround = "standard" | "rush" | "express";
export type PricingMode = "margin" | "markup";

export interface QuickCalcForm {
  bookHeight: string;
  bookWidth: string;
  pages: string;
  gsm: string;
  paperType: string;
  paperSize: string;
  quantity: string;
  quantities: string[];          // Multi-quantity support (up to 5)
  colorsFront: string;
  colorsBack: string;
  coverGSM: string;
  coverPaper: string;
  coverColorsFront: string;
  coverColorsBack: string;
  machineId: string;
  coverMachineId: string;
  printingMethod: "sheetwise" | "work_and_turn" | "work_and_tumble" | "perfector";
  bindingType: BindingType;
  boardThickness: string;
  boardOrigin: "imported" | "indian";
  laminationType: "gloss" | "matt" | "velvet" | "anti_scratch" | "none";
  spotUV: boolean;
  embossing: boolean;
  foilBlocking: boolean;
  dieCutting: boolean;
  pricingMode: PricingMode;
  pricingPercent: string;
  taxRate: string;
  turnaround: Turnaround;
  destinationId: string;
  freightMode: "sea" | "air" | "road" | "courier" | "none";
  // Toggle sections
  includeFinishing: boolean;
  includePacking: boolean;
  includeFreight: boolean;
  customerId: string;
  customerDiscount: string;
}

export interface ParsedQuickCalcInput {
  bookHeight: number;
  bookWidth: number;
  pages: number;
  gsm: number;
  paperType: string;
  paperSize: string;
  quantity: number;
  quantities: number[];
  colorsFront: number;
  colorsBack: number;
  coverGSM: number;
  coverPaper: string;
  coverColorsFront: number;
  coverColorsBack: number;
  machineId: string;
  coverMachineId: string;
  printingMethod: "sheetwise" | "work_and_turn" | "work_and_tumble" | "perfector";
  bindingType: BindingType;
  boardThickness: number;
  boardOrigin: "imported" | "indian";
  laminationType: QuickCalcForm["laminationType"];
  spotUV: boolean;
  embossing: boolean;
  foilBlocking: boolean;
  dieCutting: boolean;
  pricingMode: PricingMode;
  pricingPercent: number;
  taxRate: number;
  turnaround: Turnaround;
  destinationId: string;
  freightMode: "sea" | "air" | "road" | "courier" | "none";
  includeFinishing: boolean;
  includePacking: boolean;
  includeFreight: boolean;
  customerId: string;
  customerDiscount: number;
}

/** Full-detail result for a single quantity variant */
export interface AdvancedCostResult {
  quantity: number;

  // Paper
  textPaper: SectionPaperCost;
  coverPaper: SectionPaperCost;
  totalPaperCost: number;

  // Printing
  textPrinting: SectionPrintingCost;
  coverPrinting: SectionPrintingCost;
  totalPrintingCost: number;

  // CTP
  textCTP: SectionCTPCost;
  coverCTP: SectionCTPCost;
  totalCTPCost: number;

  // Binding
  bindingCost: number;
  bindingCostPerCopy: number;
  bindingBreakdown: Record<string, number>;

  // Finishing
  laminationCost: number;
  spotUVCost: number;
  embossingCost: number;
  foilBlockingCost: number;
  dieCuttingCost: number;
  totalFinishingCost: number;

  // Subtotals
  productionCost: number;
  rushSurcharge: number;
  volumeDiscountPercent: number;
  volumeDiscountAmount: number;
  customerDiscountPercent: number;
  customerDiscountAmount: number;
  minimumOrderAdjustment: number;

  // Selling price
  sellingBeforeTax: number;
  taxAmount: number;
  grandTotal: number;
  costPerCopy: number;
  sellPerCopy: number;
  marginAmount: number;

  // Physical specs
  spineThickness: number;
  spineWithBoard: number;
  bookWeight: BookWeightResult;
  totalReams: number;
  totalPlates: number;
  totalImpressions: number;
  totalForms: number;
  ups: number;
  formatSize: string;
  paperSizeUsed: string;

  // Imposition detail
  textPPPerForm: number;
  textWastageSheets: number;

  // Summary flags
  machineUsed: string;
  coverMachineUsed: string;
}

/** Legacy compatibility result */
export interface CostResult {
  paperCost: number;
  coverCost: number;
  printingCost: number;
  ctpCost: number;
  makeReady: number;
  bindingCost: number;
  laminationCost: number;
  subtotal: number;
  rushSurcharge: number;
  discountedSubtotal: number;
  volumeDiscountAmount: number;
  minimumOrderAdjustment: number;
  customerDiscountAmount: number;
  sellingBeforeTax: number;
  taxAmount: number;
  grandTotal: number;
  costPerCopy: number;
  sellPerCopy: number;
  reams: number;
  plates: number;
  impressions: number;
  volumeDiscountPercent: number;
}

// ── Default Form ─────────────────────────────────────────────────────────────

export const ADVANCED_DEFAULT_FORM: QuickCalcForm = {
  bookHeight: "234",
  bookWidth: "153",
  pages: "256",
  gsm: "130",
  paperType: "Matt Art Paper",
  paperSize: "23x36",
  quantity: "5000",
  quantities: ["5000", "", "", "", ""],
  colorsFront: "4",
  colorsBack: "4",
  coverGSM: "300",
  coverPaper: "Art Card",
  coverColorsFront: "4",
  coverColorsBack: "0",
  machineId: "rmgt",
  coverMachineId: "rmgt",
  printingMethod: "sheetwise",
  bindingType: "perfect_binding",
  boardThickness: "2.5",
  boardOrigin: "imported",
  laminationType: "gloss",
  spotUV: false,
  embossing: false,
  foilBlocking: false,
  dieCutting: false,
  pricingMode: "margin",
  pricingPercent: "20",
  taxRate: "0",
  turnaround: "standard",
  destinationId: "ex",
  freightMode: "none",
  includeFinishing: true,
  includePacking: false,
  includeFreight: false,
  customerId: "none",
  customerDiscount: "0",
};

// ── Validation ───────────────────────────────────────────────────────────────

function parseFinite(name: string, value: string): number {
  if (value.trim() === "") {
    throw new Error(`${name} is required.`);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be numeric.`);
  }
  return parsed;
}

export function validateAndParseQuickCalc(form: QuickCalcForm): { parsed?: ParsedQuickCalcInput; errors: string[] } {
  const errors: string[] = [];
  let parsed: ParsedQuickCalcInput | undefined;

  try {
    const bookHeight = parseFinite("Book height", form.bookHeight);
    const bookWidth = parseFinite("Book width", form.bookWidth);
    const pages = parseFinite("Pages", form.pages);
    const gsm = parseFinite("Text GSM", form.gsm);
    const quantity = parseFinite("Quantity", form.quantity);
    const colorsFront = parseFinite("Front colors", form.colorsFront);
    const colorsBack = parseFinite("Back colors", form.colorsBack);
    const coverGSM = parseFinite("Cover GSM", form.coverGSM);
    const coverColorsFront = parseFinite("Cover front colors", form.coverColorsFront);
    const coverColorsBack = parseFinite("Cover back colors", form.coverColorsBack);
    const pricingPercent = parseFinite("Pricing percent", form.pricingPercent);
    const taxRate = parseFinite("Tax rate", form.taxRate);
    const customerDiscount = parseFinite("Customer discount", form.customerDiscount || "0");
    const boardThickness = parseFinite("Board thickness", form.boardThickness);

    if (bookHeight <= 0 || bookWidth <= 0) errors.push("Book width and height must be greater than 0.");
    if (pages <= 0) errors.push("Pages must be greater than 0.");
    if (gsm <= 0 || coverGSM <= 0) errors.push("GSM values must be greater than 0.");
    if (quantity <= 0) errors.push("Quantity must be greater than 0.");
    if (!Number.isInteger(quantity)) errors.push("Quantity must be a whole number.");
    if (!Number.isInteger(pages) || pages % 2 !== 0) errors.push("Pages must be an even whole number.");
    if (!Number.isInteger(colorsFront) || !Number.isInteger(colorsBack) || colorsFront < 0 || colorsBack < 0) {
      errors.push("Colors must be whole numbers between 0 and 4.");
    }
    if (colorsFront > 4 || colorsBack > 4) errors.push("Colors cannot exceed 4.");
    if (bookHeight > 1000 || bookWidth > 1000) errors.push("Dimensions exceed max 1000mm.");
    if (pages > 5000) errors.push("Pages exceed max 5000.");
    if (quantity > 1000000) errors.push("Quantity exceeds max 1,000,000.");
    if (gsm > 600 || coverGSM > 800) errors.push("GSM exceeds supported range.");
    if (taxRate < 0 || taxRate > 100) errors.push("Tax rate must be 0–100.");
    if (pricingPercent < 0 || pricingPercent >= 100) {
      errors.push(form.pricingMode === "margin" ? "Margin must be 0–99.99." : "Markup must be 0–99.99.");
    }

    // Parse multi-quantities
    const quantities = form.quantities
      .map(q => q.trim())
      .filter(q => q !== "")
      .map(q => Number(q))
      .filter(q => Number.isFinite(q) && q > 0 && Number.isInteger(q));

    // If no multi-quantities, use the primary quantity
    const finalQuantities = quantities.length > 0 ? quantities : [quantity];

    parsed = {
      bookHeight,
      bookWidth,
      pages,
      gsm,
      paperType: form.paperType,
      paperSize: form.paperSize,
      quantity,
      quantities: finalQuantities,
      colorsFront,
      colorsBack,
      coverGSM,
      coverPaper: form.coverPaper,
      coverColorsFront,
      coverColorsBack,
      machineId: form.machineId,
      coverMachineId: form.coverMachineId,
      printingMethod: form.printingMethod,
      bindingType: form.bindingType,
      boardThickness,
      boardOrigin: form.boardOrigin,
      laminationType: form.laminationType,
      spotUV: form.spotUV,
      embossing: form.embossing,
      foilBlocking: form.foilBlocking,
      dieCutting: form.dieCutting,
      pricingMode: form.pricingMode,
      pricingPercent,
      taxRate,
      turnaround: form.turnaround,
      destinationId: form.destinationId,
      freightMode: form.freightMode,
      includeFinishing: form.includeFinishing,
      includePacking: form.includePacking,
      includeFreight: form.includeFreight,
      customerId: form.customerId || "none",
      customerDiscount,
    };
  } catch (err) {
    errors.push((err as Error).message);
  }

  return { parsed, errors };
}

// ── Volume Discount ──────────────────────────────────────────────────────────

export function calcVolumeDiscountPercent(quantity: number): number {
  if (quantity >= 50000) return 7;
  if (quantity >= 20000) return 5;
  if (quantity >= 10000) return 3;
  if (quantity >= 5000) return 1.5;
  return 0;
}

// ── Advanced Full-Precision Calculator ───────────────────────────────────────

import { calculateFullEstimation } from "./estimator";
import { type EstimationInput } from "@/types";

export function calculateAdvancedCosts(input: ParsedQuickCalcInput, quantity?: number): AdvancedCostResult {
  const qty = quantity ?? input.quantity;

  const spec: EstimationInput = {
    id: "quick-calc",
    jobTitle: "Quick Calc",
    customerName: "Quick Calc User",
    referenceNumber: "",
    estimatedBy: "quick-calc",
    estimationDate: new Date().toISOString(),
    poNumber: "",

    bookSpec: {
      widthMM: input.bookWidth,
      heightMM: input.bookHeight,
      orientation: input.bookHeight > input.bookWidth ? "portrait" : input.bookHeight < input.bookWidth ? "landscape" : "square",
      trimSizePreset: "custom",
      customSize: true,
      spineThickness: 0,
      spineWithBoard: 0,
      totalPages: input.pages
    },
    quantities: [qty],
    textSections: [
      {
        id: "tx1",
        enabled: true,
        label: "Text",
        pages: input.pages,
        gsm: input.gsm,
        paperTypeId: input.paperType,
        paperTypeName: input.paperType,
        paperSizeId: input.paperSize,
        paperSizeLabel: input.paperSize,
        colorsFront: input.colorsFront,
        colorsBack: input.colorsBack,
        machineId: input.machineId,
        machineName: input.machineId,
        plateChanges: 0,
        printingMethod: input.printingMethod.toUpperCase().replace("PERFECTOR", "PERFECTING") as any
      }
    ],
    cover: {
      enabled: true,
      pages: 4,
      gsm: input.coverGSM,
      paperTypeName: input.coverPaper,
      paperTypeId: input.coverPaper,
      paperSizeId: input.paperSize,
      paperSizeLabel: input.paperSize,
      colorsFront: input.coverColorsFront,
      colorsBack: input.coverColorsBack,
      machineId: input.coverMachineId,
      machineName: input.coverMachineId,
      selfCover: false,
      separateCover: true,
      foldType: "none",
    },
    jacket: { enabled: false, gsm: 130, paperTypeName: "", paperTypeId: "", paperSizeId: "", paperSizeLabel: "", colorsFront: 0, colorsBack: 0, machineId: "", machineName: "", laminationType: "none", extraJacketsPercent: 0, goldBlockingFront: false, goldBlockingSpine: false, spotUV: false, flapWidth: 0 },
    endleaves: { enabled: false, type: "plain", pages: 0, gsm: 130, paperTypeName: "", paperTypeId: "", paperSizeId: "", paperSizeLabel: "", colorsFront: 0, colorsBack: 0, machineId: "", machineName: "", selfEndleaves: false },
    binding: {
      primaryBinding: input.bindingType,
      purBinding: false,
      backShape: "square",
      boardType: "",
      boardThickness: input.boardThickness,
      boardOrigin: input.boardOrigin,
      coveringMaterialId: "",
      coveringMaterialName: "",
      caseMaterial: "printed_paper",
      ribbonMarker: 0,
      headTailBand: false,
      giltEdging: false,
      foamPadding: false,
      roundCornering: false,
      goldBlockingFront: false,
      goldBlockingSpine: false,
      embossingFront: false,
      roundingBacking: false,
    },
    finishing: {
      coverLamination: { enabled: input.includeFinishing && input.laminationType !== "none", type: input.laminationType as any, machineId: "" },
      jacketLamination: { enabled: false, type: "none" },
      spotUVCover: { enabled: input.includeFinishing && input.spotUV, type: "front" },
      spotUVJacket: { enabled: false },
      uvVarnish: { enabled: false, sections: [] },
      aqueousVarnish: { enabled: false, freeOnRekord: false },
      embossing: { enabled: input.includeFinishing && input.embossing, type: "single", location: ["front"] },
      goldBlocking: { enabled: false, location: [], foilType: "gold" },
      dieCutting: { enabled: input.includeFinishing && input.dieCutting, complexity: "simple" },
      foilStamping: { enabled: input.includeFinishing && input.foilBlocking, foilType: "gold", location: ["front"] },
      edgeGilding: { enabled: false, edges: [] },
      perforation: { enabled: false },
      scoring: { enabled: false },
      numbering: { enabled: false },
      collation: { enabled: false, mode: "standard", ratePerCopy: 0, setupCost: 0 },
      holePunch: { enabled: false, holes: 2, ratePerCopy: 0, setupCost: 0 },
      trimming: { enabled: false, sides: 3, ratePerCopy: 0 },
      envelopePrinting: { enabled: false, envelopeSize: "custom", quantity: 0, colors: 1, ratePerEnvelope: 0, setupCost: 0 },
      largeFormat: { enabled: false, productType: "poster", widthMM: 0, heightMM: 0, quantity: 0, ratePerSqM: 0 },
      additionalFinishing: []
    },
    packing: {
      useCartons: input.includePacking,
      usePallets: false,
      cartonType: "5_ply",
      cartonRate: 0,
      customBooksPerCarton: 0,
      palletType: "standard",
      palletRate: 0,
      stretchWrap: false,
      stretchWrapRate: 0,
      shrinkWrap: false,
      shrinkWrapRate: 0,
      strapping: false,
      strappingRate: 0,
      cornerProtectors: false,
      cornerProtectorRate: 0,
      innerPartition: false,
      customPrinting: false,
      kraftWrapping: false,
      polybagIndividual: false,
      polybagRate: 0,
      bandingPerPack: 0,
      insertSlipSheet: false,
      containerization: "none",
      containerType: "none",
      maxCartonWeight: 15,
      maxPalletHeight: 1200,
      maxPalletWeight: 1000
    },
    delivery: {
      destinationId: input.destinationId || "mumbai",
      destinationName: input.destinationId,
      deliveryType: "domestic",
      freightMode: input.freightMode === "none" ? "road" : input.freightMode,
      portOfLoading: "",
      numberOfDespatches: 1,
      localDespatches: 1,
      overseasDespatches: 0,
      advanceCopies: 0,
      advanceCopiesAirFreight: false,
      advanceCopiesRate: 0,
      customsClearance: 0,
      insurance: false,
      insuranceRate: 0
    },
    prePress: { epsonProofs: 0, epsonRatePerPage: 0, wetProofs: 0, wetProofRatePerForm: 0, filmOutput: false, filmRatePerPlate: 0, designCharges: 0, originationType: "from_pdf" },
    pricing: {
      marginPercent: input.pricingPercent,
      commissionPercent: 0,
      targetTPH: 0,
      exchangeRate: 1,
      volumeDiscount: 0,
      paymentTerms: "",
      paymentDays: 0,
      quotationValidity: 30,
      taxType: "none",
      taxRate: input.taxRate,
      includesTax: false,
      currency: "INR"
    },
    additionalCosts: [],
    notes: "",
    internalNotes: "",
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const estResultList = calculateFullEstimation(spec);
  const out = estResultList[0];

  const textPaper = out.paperCosts.find(p => p.sectionName === "Text");
  const coverPaper = out.paperCosts.find(p => p.sectionName === "Cover");
  const textPrinting = out.printingCosts.find(p => p.sectionName === "Text");
  const coverPrinting = out.printingCosts.find(p => p.sectionName === "Cover");
  const textCTP = out.ctpCosts.find(p => p.sectionName === "Text");
  const coverCTP = out.ctpCosts.find(p => p.sectionName === "Cover");

  const rushMultiplier = input.turnaround === "standard" ? 0 : input.turnaround === "rush" ? 0.15 : 0.30;
  const rushSurcharge = out.totalProductionCost * rushMultiplier;

  const volumeDiscountPercent = calcVolumeDiscountPercent(qty);
  const volumeDiscountAmount = out.totalProductionCost * (volumeDiscountPercent / 100);

  const customerDiscountAmount = out.totalProductionCost * (input.customerDiscount / 100);

  const discountedCost = out.totalProductionCost + rushSurcharge - volumeDiscountAmount - customerDiscountAmount;
  const minimumOrderAdjustment = Math.max(0, 25000 - discountedCost);

  // Return mapped structure format suitable for AdvancedCostResult
  return {
    quantity: qty,
    textPaper: textPaper!,
    coverPaper: (coverPaper || textPaper)!,
    totalPaperCost: out.totalPaperCost,

    textPrinting: textPrinting!,
    coverPrinting: (coverPrinting || textPrinting)!,
    totalPrintingCost: out.totalPrintingCost,

    textCTP: textCTP!,
    coverCTP: (coverCTP || textCTP)!,
    totalCTPCost: out.totalCTPCost,

    bindingCost: out.bindingCost,
    bindingCostPerCopy: out.bindingCostPerCopy,
    bindingBreakdown: out.bindingBreakdown,

    laminationCost: Object.entries(out.finishingBreakdown).filter(([k]) => k.includes("lamination")).reduce((sum, [, v]) => sum + v, 0),
    spotUVCost: Object.entries(out.finishingBreakdown).filter(([k]) => k.includes("spot UV")).reduce((sum, [, v]) => sum + v, 0),
    embossingCost: Object.entries(out.finishingBreakdown).filter(([k]) => k.includes("embossing")).reduce((sum, [, v]) => sum + v, 0),
    foilBlockingCost: Object.entries(out.finishingBreakdown).filter(([k]) => k.includes("stamping")).reduce((sum, [, v]) => sum + v, 0),
    dieCuttingCost: Object.entries(out.finishingBreakdown).filter(([k]) => k.includes("die cutting")).reduce((sum, [, v]) => sum + v, 0),
    totalFinishingCost: out.finishingCost,

    productionCost: out.totalProductionCost,
    rushSurcharge,
    volumeDiscountPercent,
    volumeDiscountAmount,
    customerDiscountPercent: input.customerDiscount,
    customerDiscountAmount,
    minimumOrderAdjustment,

    sellingBeforeTax: out.totalSellingPrice - out.taxAmount,
    taxAmount: out.taxAmount,
    grandTotal: out.totalSellingPrice,
    costPerCopy: out.totalCostPerCopy,
    sellPerCopy: out.sellingPricePerCopy,
    marginAmount: out.marginAmount,

    spineThickness: out.spineThickness,
    spineWithBoard: out.spineWithBoard,
    bookWeight: {
      textWeight: 0,
      coverWeight: 0,
      boardWeight: 0,
      endleavesWeight: 0,
      jacketWeight: 0,
      miscWeight: 0,
      totalWeight: out.totalWeight / Math.max(1, out.quantity) * 1000,
      totalWeightKg: out.totalWeight / Math.max(1, out.quantity),
    },
    totalReams: out.paperCosts.reduce((s, p) => s + p.reams, 0),
    totalPlates: out.printingCosts.reduce((s, p) => s + p.totalPlates, 0),
    totalImpressions: out.printingCosts.reduce((s, p) => s + p.totalImpressions, 0),
    totalForms: textPaper ? textPaper.numberOfForms : 0,
    ups: textPaper ? textPaper.ups : 1,
    formatSize: textPaper ? textPaper.formatSize : "",
    paperSizeUsed: textPaper ? textPaper.paperSize : "",

    textPPPerForm: textPaper ? textPaper.ppPerForm : 16,
    textWastageSheets: textPaper ? textPaper.wastageSheets : 0,

    machineUsed: textPrinting ? textPrinting.machineName : "Unknown",
    coverMachineUsed: coverPrinting ? coverPrinting.machineName : "Unknown",
  };
}

/** Calculate for multiple quantities at once */
export function calculateMultiQuantity(input: ParsedQuickCalcInput): AdvancedCostResult[] {
  return input.quantities.map(qty => calculateAdvancedCosts(input, qty));
}

// ── Legacy compatibility ─────────────────────────────────────────────────────

export function calculateQuickCosts(input: ParsedQuickCalcInput): CostResult {
  const result = calculateAdvancedCosts(input);
  return {
    paperCost: result.textPaper.totalCost,
    coverCost: result.coverPaper.totalCost,
    printingCost: result.totalPrintingCost,
    ctpCost: result.totalCTPCost,
    makeReady: result.textPrinting.makeReadyCost + result.coverPrinting.makeReadyCost,
    bindingCost: result.bindingCost,
    laminationCost: result.laminationCost,
    subtotal: result.productionCost,
    rushSurcharge: result.rushSurcharge,
    discountedSubtotal: result.productionCost - result.volumeDiscountAmount - result.customerDiscountAmount,
    volumeDiscountAmount: result.volumeDiscountAmount,
    minimumOrderAdjustment: result.minimumOrderAdjustment,
    customerDiscountAmount: result.customerDiscountAmount,
    sellingBeforeTax: result.sellingBeforeTax,
    taxAmount: result.taxAmount,
    grandTotal: result.grandTotal,
    costPerCopy: result.costPerCopy,
    sellPerCopy: result.sellPerCopy,
    reams: result.totalReams,
    plates: result.totalPlates,
    impressions: result.totalImpressions,
    volumeDiscountPercent: result.volumeDiscountPercent,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

