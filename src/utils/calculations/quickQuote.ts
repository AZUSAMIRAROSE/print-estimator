import { DEFAULT_PAPER_RATES, LAMINATION_RATES, PERFECT_BINDING_RATES } from "../../constants/index.ts";

export type Turnaround = "standard" | "rush" | "express";
export type PricingMode = "margin" | "markup";

export interface QuickCalcForm {
  bookHeight: string;
  bookWidth: string;
  pages: string;
  gsm: string;
  paperType: string;
  quantity: string;
  colorsFront: string;
  colorsBack: string;
  coverGSM: string;
  coverPaper: string;
  bindingType: "perfect_binding" | "saddle_stitching" | "section_sewn_hardcase";
  laminationType: "gloss" | "matt" | "velvet" | "anti_scratch" | "none";
  pricingMode: PricingMode;
  pricingPercent: string;
  taxRate: string;
  turnaround: Turnaround;
}

export interface ParsedQuickCalcInput {
  bookHeight: number;
  bookWidth: number;
  pages: number;
  gsm: number;
  paperType: string;
  quantity: number;
  colorsFront: number;
  colorsBack: number;
  coverGSM: number;
  coverPaper: string;
  bindingType: QuickCalcForm["bindingType"];
  laminationType: QuickCalcForm["laminationType"];
  pricingMode: PricingMode;
  pricingPercent: number;
  taxRate: number;
  turnaround: Turnaround;
}

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
    const pricingPercent = parseFinite("Pricing percent", form.pricingPercent);
    const taxRate = parseFinite("Tax rate", form.taxRate);

    if (bookHeight <= 0 || bookWidth <= 0) errors.push("Book width and height must be greater than 0.");
    if (pages <= 0) errors.push("Pages must be greater than 0.");
    if (gsm <= 0 || coverGSM <= 0) errors.push("GSM values must be greater than 0.");
    if (quantity <= 0) errors.push("Quantity must be greater than 0.");
    if (!Number.isInteger(quantity)) errors.push("Quantity must be a whole number (no decimals).");
    if (!Number.isInteger(pages) || pages % 4 !== 0) errors.push("Pages must be a whole number and divisible by 4.");
    if (!Number.isInteger(colorsFront) || !Number.isInteger(colorsBack) || colorsFront < 0 || colorsBack < 0) {
      errors.push("Colors must be whole numbers between 0 and 4.");
    }
    if (colorsFront > 4 || colorsBack > 4) errors.push("Colors cannot exceed 4.");

    if (bookHeight > 1000 || bookWidth > 1000) errors.push("Book dimensions exceed max limit (1000mm).");
    if (pages > 5000) errors.push("Pages exceed max limit (5000).");
    if (quantity > 1000000) errors.push("Quantity exceeds max limit (1,000,000).");
    if (gsm > 600 || coverGSM > 800) errors.push("GSM exceeds supported range.");
    if (taxRate < 0 || taxRate > 100) errors.push("Tax rate must be between 0 and 100.");
    if (pricingPercent < 0 || pricingPercent >= 100) {
      errors.push(form.pricingMode === "margin" ? "Margin must be between 0 and 99.99." : "Markup must be between 0 and 99.99.");
    }

    parsed = {
      bookHeight,
      bookWidth,
      pages,
      gsm,
      paperType: form.paperType,
      quantity,
      colorsFront,
      colorsBack,
      coverGSM,
      coverPaper: form.coverPaper,
      bindingType: form.bindingType,
      laminationType: form.laminationType,
      pricingMode: form.pricingMode,
      pricingPercent,
      taxRate,
      turnaround: form.turnaround,
    };
  } catch (err) {
    errors.push((err as Error).message);
  }

  return { parsed, errors };
}

export function calcVolumeDiscountPercent(quantity: number): number {
  if (quantity >= 50000) return 7;
  if (quantity >= 20000) return 5;
  if (quantity >= 10000) return 3;
  if (quantity >= 5000) return 1.5;
  return 0;
}

export function calculateQuickCosts(input: ParsedQuickCalcInput): CostResult {
  const textRate = DEFAULT_PAPER_RATES.find((r) => r.paperType === input.paperType && r.gsm === input.gsm);
  const coverRate = DEFAULT_PAPER_RATES.find((r) => r.paperType === input.coverPaper && r.gsm === input.coverGSM);

  const formsNeeded = Math.ceil(input.pages / 16);
  const sheetsPerReam = 500;
  const netSheets = Math.ceil(input.quantity * formsNeeded / 2);
  const wastageSheets = Math.ceil(netSheets * 0.05);
  const grossSheets = netSheets + wastageSheets;
  const reams = grossSheets / sheetsPerReam;

  const paperCost = reams * (textRate?.chargeRate ?? 4000);
  const coverSheets = Math.ceil(input.quantity / 2);
  const coverCost = (coverSheets / sheetsPerReam) * (coverRate?.chargeRate ?? 9600);

  const impressions = grossSheets;
  const effectiveColors = Math.max(input.colorsFront, input.colorsBack);
  const printingRatePer1000 = effectiveColors >= 4 ? 199 : effectiveColors >= 2 ? 129 : 79;
  const printingCost = (impressions / 1000) * printingRatePer1000;
  const plates = formsNeeded * effectiveColors;
  const ctpCost = plates * 271;
  const makeReady = formsNeeded * 1200;

  const sections16pp = Math.ceil(input.pages / 16);
  const bindingTier = PERFECT_BINDING_RATES.find((r) => input.quantity >= r.minQty && input.quantity <= r.maxQty) || PERFECT_BINDING_RATES[PERFECT_BINDING_RATES.length - 1];
  const bindingPerCopy = input.bindingType === "perfect_binding"
    ? (sections16pp * bindingTier.ratePer16pp) + (sections16pp * bindingTier.gatheringRate)
    : input.bindingType === "saddle_stitching"
      ? 0.30
      : (sections16pp * 0.38) + 3.75;
  const bindingCost = bindingPerCopy * input.quantity;

  let laminationCost = 0;
  if (input.laminationType !== "none") {
    const lam = LAMINATION_RATES[input.laminationType];
    const coverAreaSqInch = ((input.bookWidth * 2) / 25.4) * (input.bookHeight / 25.4);
    const a5AreaSqInch = 5.83 * 8.27;
    const areaFactor = Math.max(0.8, coverAreaSqInch / a5AreaSqInch);
    laminationCost = Math.max(lam.ratePerCopy * areaFactor * coverSheets, lam.minOrder);
  }

  const subtotal = paperCost + coverCost + printingCost + ctpCost + makeReady + bindingCost + laminationCost;
  if (!Number.isFinite(subtotal)) throw new Error("Calculation produced invalid subtotal.");

  const rushMultiplier = input.turnaround === "standard" ? 1 : input.turnaround === "rush" ? 1.15 : 1.30;
  const rushedSubtotal = subtotal * rushMultiplier;
  const rushSurcharge = rushedSubtotal - subtotal;

  const volumeDiscountPercent = calcVolumeDiscountPercent(input.quantity);
  const volumeDiscountAmount = rushedSubtotal * (volumeDiscountPercent / 100);
  const discountedSubtotal = rushedSubtotal - volumeDiscountAmount;

  const minimumOrderValue = 25000;
  const minimumOrderAdjustment = Math.max(0, minimumOrderValue - discountedSubtotal);
  const productionFloorSubtotal = discountedSubtotal + minimumOrderAdjustment;

  const sellingBeforeTax = input.pricingMode === "margin"
    ? productionFloorSubtotal / (1 - input.pricingPercent / 100)
    : productionFloorSubtotal * (1 + input.pricingPercent / 100);

  const taxAmount = sellingBeforeTax * (input.taxRate / 100);
  const grandTotal = sellingBeforeTax + taxAmount;
  const costPerCopy = input.quantity > 0 ? productionFloorSubtotal / input.quantity : 0;
  const sellPerCopy = input.quantity > 0 ? grandTotal / input.quantity : 0;

  const output: CostResult = {
    paperCost,
    coverCost,
    printingCost,
    ctpCost,
    makeReady,
    bindingCost,
    laminationCost,
    subtotal,
    rushSurcharge,
    discountedSubtotal,
    volumeDiscountAmount,
    minimumOrderAdjustment,
    sellingBeforeTax,
    taxAmount,
    grandTotal,
    costPerCopy,
    sellPerCopy,
    reams,
    plates,
    impressions,
    volumeDiscountPercent,
  };

  for (const [k, v] of Object.entries(output)) {
    if (!Number.isFinite(v)) {
      throw new Error(`Invalid numeric result produced (${k}).`);
    }
  }

  return output;
}
