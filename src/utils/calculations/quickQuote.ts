// ============================================================================
// ADVANCED QUICK QUOTE ENGINE — FULL-PRECISION PRINT ESTIMATION
// ============================================================================
// Uses the same industry-grade calculation modules as the full estimation
// wizard, but exposed through a streamlined single-page interface.
// ============================================================================

import { DEFAULT_PAPER_RATES, LAMINATION_RATES, PERFECT_BINDING_RATES, DEFAULT_MACHINES, DEFAULT_DESTINATIONS, STANDARD_PAPER_SIZES, TRIM_SIZE_PRESETS } from "../../constants/index.ts";
import { calculatePaperRequirement } from "./paper";
import { calculatePrintingCost } from "./printing";
import { calculateCTPCost } from "./ctp";
import { calculateBindingCost } from "./binding";
import { calculateSpineThickness, calculateSpineWithBoard } from "./spine";
import { calculateBookWeight, type BookWeightResult } from "./weight";
import type { BindingType, SectionPaperCost, SectionPrintingCost, SectionCTPCost } from "@/types";

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
  paperSize: "23×36",
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

export function calculateAdvancedCosts(input: ParsedQuickCalcInput, quantity?: number): AdvancedCostResult {
  const qty = quantity ?? input.quantity;
  const machine = DEFAULT_MACHINES.find(m => m.id === input.machineId) ?? DEFAULT_MACHINES[3]; // RMGT default
  const coverMachine = DEFAULT_MACHINES.find(m => m.id === input.coverMachineId) ?? machine;

  // Find paper size
  const paperSize = STANDARD_PAPER_SIZES.find(ps => ps.label === input.paperSize);
  const availableSizes = paperSize ? [paperSize] : STANDARD_PAPER_SIZES;

  // ── Spine ──────────────────────────────────────────────────────────────────
  const spineThickness = calculateSpineThickness({
    textSections: [{ pages: input.pages, gsm: input.gsm, paperType: input.paperType }],
  });

  const isHardcase = input.bindingType === "section_sewn_hardcase" || input.bindingType === "case_binding";
  const spineWithBoard = calculateSpineWithBoard(
    spineThickness,
    isHardcase ? input.boardThickness : 0,
    input.bindingType,
  );

  // ── Text Paper ─────────────────────────────────────────────────────────────
  const textPaperCode = DEFAULT_PAPER_RATES.find(r => r.paperType === input.paperType)?.code ?? "";
  const textPaper = calculatePaperRequirement({
    sectionName: "Text",
    sectionType: "text1",
    totalPages: input.pages,
    trimWidthMM: input.bookWidth,
    trimHeightMM: input.bookHeight,
    gsm: input.gsm,
    paperType: input.paperType,
    paperCode: textPaperCode,
    paperSizeLabel: input.paperSize,
    quantity: qty,
    colorsFront: input.colorsFront,
    colorsBack: input.colorsBack,
    machineMaxWidth: machine.maxSheetWidth,
    machineMaxHeight: machine.maxSheetHeight,
    gripperMM: machine.gripperMargin,
    bleedMM: 3,
  });

  // ── Cover Paper ────────────────────────────────────────────────────────────
  const coverPaperCode = DEFAULT_PAPER_RATES.find(r => r.paperType === input.coverPaper)?.code ?? "Art card";
  const coverPaper = calculatePaperRequirement({
    sectionName: "Cover",
    sectionType: "cover",
    totalPages: 4,
    trimWidthMM: input.bookWidth,
    trimHeightMM: input.bookHeight,
    gsm: input.coverGSM,
    paperType: input.coverPaper,
    paperCode: coverPaperCode,
    paperSizeLabel: input.paperSize,
    quantity: qty,
    colorsFront: input.coverColorsFront,
    colorsBack: input.coverColorsBack,
    machineMaxWidth: coverMachine.maxSheetWidth,
    machineMaxHeight: coverMachine.maxSheetHeight,
    spineThickness: spineWithBoard,
  });

  // ── Printing ───────────────────────────────────────────────────────────────
  const textPrinting = calculatePrintingCost({
    sectionName: "Text",
    sectionType: "text1",
    machineId: input.machineId,
    machineName: machine.name,
    colorsFront: input.colorsFront,
    colorsBack: input.colorsBack,
    quantity: qty,
    imposition: textPaper.imposition,
    wastageResult: textPaper.wastageResult,
    gsm: input.gsm,
    printingMethod: input.printingMethod,
  });

  const coverPrinting = calculatePrintingCost({
    sectionName: "Cover",
    sectionType: "cover",
    machineId: input.coverMachineId,
    machineName: coverMachine.name,
    colorsFront: input.coverColorsFront,
    colorsBack: input.coverColorsBack,
    quantity: qty,
    imposition: coverPaper.imposition,
    wastageResult: coverPaper.wastageResult,
    gsm: input.coverGSM,
    printingMethod: "sheetwise",
  });

  // ── CTP ────────────────────────────────────────────────────────────────────
  const textCTP = calculateCTPCost({
    sectionName: "Text",
    sectionType: "text1",
    machineId: input.machineId,
    totalPlates: textPrinting.totalPlates,
  });

  const coverCTP = calculateCTPCost({
    sectionName: "Cover",
    sectionType: "cover",
    machineId: input.coverMachineId,
    totalPlates: coverPrinting.totalPlates,
  });

  // ── Binding ────────────────────────────────────────────────────────────────
  const totalForms = textPaper.imposition.numberOfForms;
  const bindingResult = calculateBindingCost({
    binding: {
      primaryBinding: input.bindingType,
      purBinding: false,
      backShape: "square",
      boardType: isHardcase ? (input.boardOrigin === "imported" ? "bd_imp_25" : "bd_ind_25") : "",
      boardThickness: input.boardThickness,
      boardOrigin: input.boardOrigin,
      coveringMaterialId: "",
      coveringMaterialName: "Printed Paper",
      caseMaterial: "printed_paper",
      ribbonMarker: 0,
      headTailBand: isHardcase,
      giltEdging: false,
      foamPadding: false,
      roundCornering: false,
      goldBlockingFront: input.foilBlocking,
      goldBlockingSpine: false,
      embossingFront: input.embossing,
      roundingBacking: false,
    },
    quantity: qty,
    bookSpec: {
      heightMM: input.bookHeight,
      widthMM: input.bookWidth,
      orientation: input.bookHeight > input.bookWidth ? "portrait" : input.bookHeight === input.bookWidth ? "square" : "landscape",
      trimSizePreset: "",
      customSize: true,
      spineThickness,
      spineWithBoard,
      totalPages: input.pages,
    },
    spineThickness,
    totalForms,
    totalSections: 1,
    textPages: input.pages,
  });

  // ── Finishing ──────────────────────────────────────────────────────────────
  let laminationCost = 0;
  if (input.includeFinishing && input.laminationType !== "none") {
    const lam = LAMINATION_RATES[input.laminationType];
    const coverAreaSqInch = ((input.bookWidth * 2 + spineWithBoard) / 25.4) * (input.bookHeight / 25.4);
    const a5AreaSqInch = 5.83 * 8.27;
    const areaFactor = Math.max(0.8, coverAreaSqInch / a5AreaSqInch);
    const coverSheets = coverPaper.grossSheets;
    laminationCost = Math.max(lam.ratePerCopy * areaFactor * coverSheets, lam.minOrder);
  }

  let spotUVCost = 0;
  if (input.includeFinishing && input.spotUV) {
    // Spot UV from constants
    const rate = qty >= 10000 ? 0.80 : qty >= 5000 ? 1.00 : qty >= 2000 ? 1.28 : 1.50;
    spotUVCost = rate * qty + 2500; // block cost
  }

  let embossingCost = 0;
  if (input.includeFinishing && input.embossing) {
    embossingCost = 0.45 * qty + 2500; // die cost
  }

  let foilBlockingCost = 0;
  if (input.includeFinishing && input.foilBlocking) {
    foilBlockingCost = 0.30 * qty + 3500; // die cost
  }

  let dieCuttingCost = 0;
  if (input.includeFinishing && input.dieCutting) {
    dieCuttingCost = 0.20 * qty + 4000; // simple die
  }

  const totalFinishingCost = laminationCost + spotUVCost + embossingCost + foilBlockingCost + dieCuttingCost;

  // ── Book Weight ────────────────────────────────────────────────────────────
  const bookWeight = calculateBookWeight({
    trimHeightMM: input.bookHeight,
    trimWidthMM: input.bookWidth,
    textSections: [{ pages: input.pages, gsm: input.gsm }],
    coverGSM: input.coverGSM,
    spineThickness,
    hasEndleaves: false,
    endleavesPages: 0,
    endleavesGSM: 0,
    hasJacket: false,
    jacketGSM: 0,
    boardThicknessMM: isHardcase ? input.boardThickness : 0,
    hasBoard: isHardcase,
  });

  // ── Totals ─────────────────────────────────────────────────────────────────
  const totalPaperCost = textPaper.totalCost + coverPaper.totalCost;
  const totalPrintingCost = textPrinting.totalCost + coverPrinting.totalCost;
  const totalCTPCost = textCTP.totalCost + coverCTP.totalCost;

  const productionCost = totalPaperCost + totalPrintingCost + totalCTPCost + bindingResult.totalCost + totalFinishingCost;

  if (!Number.isFinite(productionCost)) throw new Error("Calculation produced invalid result.");

  // Rush surcharge
  const rushMultiplier = input.turnaround === "standard" ? 1 : input.turnaround === "rush" ? 1.15 : 1.30;
  const rushedCost = productionCost * rushMultiplier;
  const rushSurcharge = rushedCost - productionCost;

  // Volume discount
  const volumeDiscountPercent = calcVolumeDiscountPercent(qty);
  const volumeDiscountAmount = rushedCost * (volumeDiscountPercent / 100);
  const discountedCost = rushedCost - volumeDiscountAmount;

  // Minimum order
  const minimumOrderValue = 25000;
  const minimumOrderAdjustment = Math.max(0, minimumOrderValue - discountedCost);
  const floorCost = discountedCost + minimumOrderAdjustment;

  // Selling price
  const sellingBeforeTax = input.pricingMode === "margin"
    ? floorCost / (1 - input.pricingPercent / 100)
    : floorCost * (1 + input.pricingPercent / 100);

  const taxAmount = sellingBeforeTax * (input.taxRate / 100);
  const grandTotal = sellingBeforeTax + taxAmount;
  const costPerCopy = qty > 0 ? floorCost / qty : 0;
  const sellPerCopy = qty > 0 ? grandTotal / qty : 0;
  const marginAmount = sellingBeforeTax - floorCost;

  return {
    quantity: qty,
    textPaper,
    coverPaper,
    totalPaperCost: round2(totalPaperCost),
    textPrinting,
    coverPrinting,
    totalPrintingCost: round2(totalPrintingCost),
    textCTP,
    coverCTP,
    totalCTPCost: round2(totalCTPCost),
    bindingCost: round2(bindingResult.totalCost),
    bindingCostPerCopy: round2(bindingResult.costPerCopy),
    bindingBreakdown: bindingResult.breakdown,
    laminationCost: round2(laminationCost),
    spotUVCost: round2(spotUVCost),
    embossingCost: round2(embossingCost),
    foilBlockingCost: round2(foilBlockingCost),
    dieCuttingCost: round2(dieCuttingCost),
    totalFinishingCost: round2(totalFinishingCost),
    productionCost: round2(productionCost),
    rushSurcharge: round2(rushSurcharge),
    volumeDiscountPercent,
    volumeDiscountAmount: round2(volumeDiscountAmount),
    minimumOrderAdjustment: round2(minimumOrderAdjustment),
    sellingBeforeTax: round2(sellingBeforeTax),
    taxAmount: round2(taxAmount),
    grandTotal: round2(grandTotal),
    costPerCopy: round2(costPerCopy),
    sellPerCopy: round2(sellPerCopy),
    marginAmount: round2(marginAmount),
    spineThickness,
    spineWithBoard,
    bookWeight,
    totalReams: round2(textPaper.reams + coverPaper.reams),
    totalPlates: textPrinting.totalPlates + coverPrinting.totalPlates,
    totalImpressions: textPrinting.totalImpressions + coverPrinting.totalImpressions,
    totalForms: textPaper.imposition.numberOfForms + coverPaper.imposition.numberOfForms,
    ups: textPaper.imposition.ups,
    formatSize: textPaper.imposition.formatLabel,
    paperSizeUsed: textPaper.imposition.paperSizeLabel,
    textPPPerForm: textPaper.imposition.ppPerForm,
    textWastageSheets: textPaper.wastageResult.totalWastage,
    machineUsed: machine.name,
    coverMachineUsed: coverMachine.name,
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
    discountedSubtotal: result.productionCost - result.volumeDiscountAmount,
    volumeDiscountAmount: result.volumeDiscountAmount,
    minimumOrderAdjustment: result.minimumOrderAdjustment,
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
