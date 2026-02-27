// ============================================================================
// BINDING COST CALCULATION — ALL 15 BINDING TYPES
// ============================================================================

import {
  PERFECT_BINDING_RATES,
  SADDLE_STITCHING_RATES,
  HARDCASE_DEFAULTS,
  DEFAULT_BOARD_TYPES,
  DEFAULT_COVERING_MATERIALS,
  WIRE_O_RATES,
} from "@/constants";
import type { BindingSection, BookSpec } from "@/types";

export interface BindingCostInput {
  binding: BindingSection;
  quantity: number;
  bookSpec: BookSpec;
  spineThickness: number;
  totalForms: number;
  totalSections: number;
  textPages: number;
}

export interface BindingCostResult {
  totalCost: number;
  costPerCopy: number;
  breakdown: Record<string, number>;
}

export function calculateBindingCost(input: BindingCostInput): BindingCostResult {
  const { binding, quantity, bookSpec, spineThickness, totalForms, totalSections, textPages } = input;
  const breakdown: Record<string, number> = {};
  
  switch (binding.primaryBinding) {
    case "perfect_binding":
    case "pur_binding":
      return calculatePerfectBinding(input, breakdown);
    case "section_sewn_perfect":
      return calculateSectionSewnPerfect(input, breakdown);
    case "section_sewn_hardcase":
    case "case_binding":
      return calculateHardcaseBinding(input, breakdown);
    case "saddle_stitching":
      return calculateSaddleStitching(input, breakdown);
    case "wire_o":
      return calculateWireO(input, breakdown);
    case "spiral":
      return calculateSpiral(input, breakdown);
    case "lay_flat":
      return calculateLayFlat(input, breakdown);
    case "singer_sewn":
    case "pamphlet":
    case "coptic":
    case "japanese":
      return calculateSpecialtyBinding(input, breakdown);
    case "tape_binding":
      return calculateTapeBinding(input, breakdown);
    case "thermal_binding":
      return calculateThermalBinding(input, breakdown);
    default:
      return { totalCost: 0, costPerCopy: 0, breakdown: {} };
  }
}

function calculatePerfectBinding(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity, totalSections, textPages, binding } = input;
  
  const rateEntry = PERFECT_BINDING_RATES.find(
    r => quantity >= r.minQty && quantity <= r.maxQty
  ) || PERFECT_BINDING_RATES[PERFECT_BINDING_RATES.length - 1];
  
  const sections16pp = Math.ceil(textPages / 16);
  const bindingCostPerCopy = sections16pp * rateEntry.ratePer16pp;
  const gatheringCostPerCopy = totalSections * rateEntry.gatheringRate;
  const foldingCostPerCopy = totalSections * 0.04;
  
  let totalPerCopy = bindingCostPerCopy + gatheringCostPerCopy + foldingCostPerCopy;
  
  // PUR surcharge: 40% premium over standard EVA
  if (binding.purBinding) {
    totalPerCopy *= 1.40;
  }
  
  breakdown["Binding"] = Math.round(bindingCostPerCopy * quantity * 100) / 100;
  breakdown["Gathering"] = Math.round(gatheringCostPerCopy * quantity * 100) / 100;
  breakdown["Folding"] = Math.round(foldingCostPerCopy * quantity * 100) / 100;
  if (binding.purBinding) {
    breakdown["PUR Surcharge"] = Math.round((totalPerCopy - bindingCostPerCopy - gatheringCostPerCopy - foldingCostPerCopy) * quantity * 100) / 100;
  }
  
  const totalCost = Math.round(totalPerCopy * quantity * 100) / 100;
  return { totalCost, costPerCopy: Math.round(totalPerCopy * 100) / 100, breakdown };
}

function calculateSectionSewnPerfect(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity, totalSections, textPages } = input;
  
  const rateEntry = PERFECT_BINDING_RATES.find(
    r => quantity >= r.minQty && quantity <= r.maxQty
  ) || PERFECT_BINDING_RATES[PERFECT_BINDING_RATES.length - 1];
  
  const sections16pp = Math.ceil(textPages / 16);
  const sewingPerCopy = totalSections * HARDCASE_DEFAULTS.sewingRatePerSection;
  const bindingPerCopy = sections16pp * rateEntry.ratePer16pp;
  const gatheringPerCopy = totalSections * rateEntry.gatheringRate;
  const foldingPerCopy = totalSections * HARDCASE_DEFAULTS.foldingRatePerForm;
  
  const totalPerCopy = sewingPerCopy + bindingPerCopy + gatheringPerCopy + foldingPerCopy;
  
  breakdown["Sewing"] = Math.round(sewingPerCopy * quantity * 100) / 100;
  breakdown["Binding"] = Math.round(bindingPerCopy * quantity * 100) / 100;
  breakdown["Gathering"] = Math.round(gatheringPerCopy * quantity * 100) / 100;
  breakdown["Folding"] = Math.round(foldingPerCopy * quantity * 100) / 100;
  
  return { totalCost: Math.round(totalPerCopy * quantity * 100) / 100, costPerCopy: Math.round(totalPerCopy * 100) / 100, breakdown };
}

function calculateHardcaseBinding(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { binding, quantity, bookSpec, spineThickness, totalSections } = input;
  const hd = HARDCASE_DEFAULTS;
  
  // Sewing
  const sewingCost = totalSections * hd.sewingRatePerSection;
  breakdown["Sewing"] = Math.round(sewingCost * quantity * 100) / 100;
  
  // Tipping endleaves
  const tippingCost = hd.tippingEndleaves;
  breakdown["Tipping"] = Math.round(tippingCost * quantity * 100) / 100;
  
  // Folding
  const foldingCost = totalSections * hd.foldingRatePerForm;
  breakdown["Folding"] = Math.round(foldingCost * quantity * 100) / 100;
  
  // Back lining
  const backLining = hd.backLining;
  breakdown["Back Lining"] = Math.round(backLining * quantity * 100) / 100;
  
  // Board cost
  const boardType = DEFAULT_BOARD_TYPES.find(b => b.id === binding.boardType);
  let boardCostPerCopy = 0;
  if (boardType) {
    const boardHInch = (bookSpec.heightMM + 6) / 25.4;
    const boardWInch = (bookSpec.widthMM + 3) / 25.4;
    const boardsPerSheet = Math.floor(boardType.sheetWidth / boardWInch) * Math.floor(boardType.sheetHeight / boardHInch);
    const sheetsPerBook = 2 / Math.max(boardsPerSheet, 1);
    boardCostPerCopy = sheetsPerBook * boardType.ratePerSheet;
  }
  breakdown["Board"] = Math.round(boardCostPerCopy * quantity * 100) / 100;
  
  // Covering material cost
  const coverMat = DEFAULT_COVERING_MATERIALS.find(c => c.id === binding.coveringMaterialId);
  let coveringCostPerCopy = 0;
  if (coverMat && coverMat.ratePerSqMeter > 0) {
    const caseH = (bookSpec.heightMM + 6 * 2 + 30 * 2) / 1000; // meters
    const caseW = ((bookSpec.widthMM + 3) * 2 + spineThickness + 12 * 2 + binding.boardThickness * 2 + 30 * 2) / 1000;
    const areaSqm = caseH * caseW;
    coveringCostPerCopy = areaSqm * coverMat.ratePerSqMeter;
  }
  breakdown["Covering Material"] = Math.round(coveringCostPerCopy * quantity * 100) / 100;
  
  // Casing-in, pressing, glue
  const casingIn = hd.casingIn;
  const pressing = hd.pressing;
  const glue = hd.glueCost;
  breakdown["Casing-in"] = Math.round(casingIn * quantity * 100) / 100;
  breakdown["Pressing"] = Math.round(pressing * quantity * 100) / 100;
  breakdown["Glue"] = Math.round(glue * quantity * 100) / 100;
  
  // H/T Band
  let htBandCost = 0;
  if (binding.headTailBand) {
    htBandCost = hd.htBandRate;
    breakdown["H/T Band"] = Math.round(htBandCost * quantity * 100) / 100;
  }
  
  // Ribbon
  let ribbonCost = 0;
  if (binding.ribbonMarker > 0) {
    ribbonCost = binding.ribbonMarker * hd.ribbonRate;
    breakdown["Ribbon"] = Math.round(ribbonCost * quantity * 100) / 100;
  }
  
  // Gold blocking
  let goldCost = 0;
  if (binding.goldBlockingFront) {
    goldCost += hd.goldBlockingFront;
    breakdown["Gold Blocking (Front)"] = Math.round(hd.goldBlockingFront * quantity + hd.goldBlockingDie);
  }
  if (binding.goldBlockingSpine) {
    goldCost += hd.goldBlockingSpine;
    breakdown["Gold Blocking (Spine)"] = Math.round(hd.goldBlockingSpine * quantity + hd.goldBlockingDie);
  }
  
  // Embossing
  let embossCost = 0;
  if (binding.embossingFront) {
    embossCost = hd.embossingFront;
    breakdown["Embossing"] = Math.round(embossCost * quantity + hd.embossingDie);
  }
  
  // Optional extras
  let extrasCost = 0;
  if (binding.giltEdging) { extrasCost += hd.giltEdging; breakdown["Gilt Edging"] = Math.round(hd.giltEdging * quantity); }
  if (binding.foamPadding) { extrasCost += hd.foamPadding; breakdown["Foam Padding"] = Math.round(hd.foamPadding * quantity); }
  if (binding.roundCornering) { extrasCost += hd.roundCornering; breakdown["Round Cornering"] = Math.round(hd.roundCornering * quantity); }
  if (binding.roundingBacking) { extrasCost += hd.roundingBacking; breakdown["Rounding & Backing"] = Math.round(hd.roundingBacking * quantity); }
  
  // Trimming and inspection
  const trimming = hd.headTailTrimming;
  const inspection = hd.qualityInspection;
  breakdown["Trimming"] = Math.round(trimming * quantity * 100) / 100;
  breakdown["Inspection"] = Math.round(inspection * quantity * 100) / 100;
  
  // Case lamination
  const caseLam = hd.caseLamination;
  breakdown["Case Lamination"] = Math.round(caseLam * quantity * 100) / 100;
  
  const totalPerCopy = sewingCost + tippingCost + foldingCost + backLining + boardCostPerCopy +
    coveringCostPerCopy + casingIn + pressing + glue + htBandCost + ribbonCost +
    goldCost + embossCost + extrasCost + trimming + inspection + caseLam;
  
  // Add setup costs (dies)
  let setupCosts = 0;
  if (binding.goldBlockingFront) setupCosts += hd.goldBlockingDie;
  if (binding.goldBlockingSpine) setupCosts += hd.goldBlockingDie;
  if (binding.embossingFront) setupCosts += hd.embossingDie;
  
  const totalCost = totalPerCopy * quantity + setupCosts;
  
  breakdown["Setup Costs (Dies)"] = setupCosts;
  
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerCopy: Math.round(totalPerCopy * 100) / 100,
    breakdown,
  };
}

function calculateSaddleStitching(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity } = input;
  
  const rateEntry = SADDLE_STITCHING_RATES.find(
    r => quantity >= r.minQty && quantity <= r.maxQty
  ) || SADDLE_STITCHING_RATES[SADDLE_STITCHING_RATES.length - 1];
  
  const stitchingCost = rateEntry.ratePerCopy;
  const wireCost = 0.02;
  const totalPerCopy = stitchingCost + wireCost;
  
  breakdown["Stitching"] = Math.round(stitchingCost * quantity * 100) / 100;
  breakdown["Wire"] = Math.round(wireCost * quantity * 100) / 100;
  
  return { totalCost: Math.round(totalPerCopy * quantity * 100) / 100, costPerCopy: Math.round(totalPerCopy * 100) / 100, breakdown };
}

function calculateWireO(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity, spineThickness } = input;
  
  // Find appropriate wire size
  const wireEntry = WIRE_O_RATES.find(w => spineThickness <= w.maxThickness) || WIRE_O_RATES[WIRE_O_RATES.length - 1];
  
  const wireCostPerCopy = wireEntry.standardPer100 / 100;
  const punchingCost = 0.15;
  const bindingCost = 0.25;
  const totalPerCopy = wireCostPerCopy + punchingCost + bindingCost;
  
  breakdown["Wire"] = Math.round(wireCostPerCopy * quantity * 100) / 100;
  breakdown["Punching"] = Math.round(punchingCost * quantity * 100) / 100;
  breakdown["Binding"] = Math.round(bindingCost * quantity * 100) / 100;
  
  return { totalCost: Math.round(totalPerCopy * quantity * 100) / 100, costPerCopy: Math.round(totalPerCopy * 100) / 100, breakdown };
}

function calculateSpiral(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity } = input;
  const coilCost = 0.35;
  const punchingCost = 0.15;
  const bindingCost = 0.20;
  const totalPerCopy = coilCost + punchingCost + bindingCost;
  
  breakdown["Coil"] = Math.round(coilCost * quantity * 100) / 100;
  breakdown["Punching"] = Math.round(punchingCost * quantity * 100) / 100;
  breakdown["Binding"] = Math.round(bindingCost * quantity * 100) / 100;
  
  return { totalCost: Math.round(totalPerCopy * quantity * 100) / 100, costPerCopy: Math.round(totalPerCopy * 100) / 100, breakdown };
}

function calculateLayFlat(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity, totalSections, textPages } = input;
  const sections16pp = Math.ceil(textPages / 16);
  
  const bindingCost = sections16pp * 0.35;
  const gatheringCost = totalSections * 0.04;
  const specialGlue = 0.50;
  const totalPerCopy = bindingCost + gatheringCost + specialGlue;
  
  breakdown["Lay-Flat Binding"] = Math.round(bindingCost * quantity * 100) / 100;
  breakdown["Gathering"] = Math.round(gatheringCost * quantity * 100) / 100;
  breakdown["Special Glue"] = Math.round(specialGlue * quantity * 100) / 100;
  
  return { totalCost: Math.round(totalPerCopy * quantity * 100) / 100, costPerCopy: Math.round(totalPerCopy * 100) / 100, breakdown };
}

function calculateSpecialtyBinding(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity, binding } = input;
  
  const rates: Record<string, number> = {
    coptic: 3.50,
    japanese: 4.00,
    singer_sewn: 1.50,
    pamphlet: 0.80,
  };
  
  const rate = rates[binding.primaryBinding] || 2.00;
  breakdown[`${binding.primaryBinding} cost`] = Math.round(rate * quantity * 100) / 100;
  
  return { totalCost: Math.round(rate * quantity * 100) / 100, costPerCopy: rate, breakdown };
}

function calculateTapeBinding(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity } = input;
  const tapeCost = 0.25;
  const laborCost = 0.15;
  const totalPerCopy = tapeCost + laborCost;
  
  breakdown["Tape"] = Math.round(tapeCost * quantity * 100) / 100;
  breakdown["Labor"] = Math.round(laborCost * quantity * 100) / 100;
  
  return { totalCost: Math.round(totalPerCopy * quantity * 100) / 100, costPerCopy: totalPerCopy, breakdown };
}

function calculateThermalBinding(input: BindingCostInput, breakdown: Record<string, number>): BindingCostResult {
  const { quantity } = input;
  const coverCost = 2.50;
  const bindingCost = 0.50;
  const totalPerCopy = coverCost + bindingCost;
  
  breakdown["Thermal Cover"] = Math.round(coverCost * quantity * 100) / 100;
  breakdown["Binding"] = Math.round(bindingCost * quantity * 100) / 100;
  
  return { totalCost: Math.round(totalPerCopy * quantity * 100) / 100, costPerCopy: totalPerCopy, breakdown };
}