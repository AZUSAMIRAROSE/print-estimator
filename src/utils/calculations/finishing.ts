// ============================================================================
// FINISHING COST CALCULATION
// ============================================================================

import {
  LAMINATION_RATES, SPOT_UV_RATES, UV_VARNISH_RATES,
  AQUEOUS_VARNISH_RATE, GOLD_BLOCKING_RATES, EMBOSSING_RATES,
  DIE_CUTTING_RATES
} from "@/constants";
import type { FinishingSection, BookSpec } from "@/types";

export interface FinishingCostInput {
  finishing: FinishingSection;
  quantity: number;
  bookSpec: BookSpec;
  spineThickness: number;
  coverMachineHasAQ: boolean;
  coverSheetCount?: number;
  jacketSheetCount?: number;
}

export interface FinishingCostResult {
  totalCost: number;
  costPerCopy: number;
  breakdown: Record<string, number>;
}

export function calculateFinishingCost(input: FinishingCostInput): FinishingCostResult {
  const { finishing, quantity, bookSpec, spineThickness, coverMachineHasAQ, coverSheetCount, jacketSheetCount } = input;
  const breakdown: Record<string, number> = {};
  let totalCost = 0;
  
  // Cover area ratio (for area-based rates)
  const a5AreaSqInch = 5.83 * 8.27; // A5 in inches
  const coverWidthInch = (bookSpec.widthMM * 2 + spineThickness) / 25.4;
  const coverHeightInch = bookSpec.heightMM / 25.4;
  const coverAreaSqInch = coverWidthInch * coverHeightInch;
  const areaFactor = Math.max(1, coverAreaSqInch / a5AreaSqInch);
  
  // 1. Cover Lamination
  if (finishing.coverLamination.enabled && finishing.coverLamination.type !== "none") {
    const lamRate = LAMINATION_RATES[finishing.coverLamination.type];
    if (lamRate) {
      const coverSheets = Math.max(0, Math.ceil(coverSheetCount ?? quantity));
      const cost = Math.max(lamRate.ratePerCopy * areaFactor * coverSheets, lamRate.minOrder);
      breakdown["Cover Lamination"] = Math.round(cost * 100) / 100;
      totalCost += cost;
    }
  }
  
  // 2. Jacket Lamination
  if (finishing.jacketLamination.enabled && finishing.jacketLamination.type !== "none") {
    const lamRate = LAMINATION_RATES[finishing.jacketLamination.type];
    if (lamRate) {
      const jacketSheets = Math.max(0, Math.ceil(jacketSheetCount ?? quantity));
      const jacketAreaFactor = areaFactor * 1.3; // Jacket is wider due to flaps
      const cost = Math.max(lamRate.ratePerCopy * jacketAreaFactor * jacketSheets, lamRate.minOrder);
      breakdown["Jacket Lamination"] = Math.round(cost * 100) / 100;
      totalCost += cost;
    }
  }
  
  // 3. Spot UV Cover
  if (finishing.spotUVCover.enabled) {
    const spotEntry = SPOT_UV_RATES.find(r => quantity >= r.minQty && quantity <= r.maxQty) || SPOT_UV_RATES[SPOT_UV_RATES.length - 1];
    const sides = finishing.spotUVCover.type === "front_and_back" ? 2 : 1;
    const cost = spotEntry.ratePerCopy * areaFactor * sides * quantity + spotEntry.blockCost;
    breakdown["Spot UV (Cover)"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  
  // 4. UV Varnish
  if (finishing.uvVarnish.enabled) {
    let uvCost = UV_VARNISH_RATES.machineCharge;
    if (finishing.uvVarnish.sections.includes("cover")) {
      uvCost += UV_VARNISH_RATES.coverOnly * quantity;
    }
    if (finishing.uvVarnish.sections.includes("text")) {
      uvCost += UV_VARNISH_RATES.textBothSides * quantity;
    }
    breakdown["UV Varnish"] = Math.round(uvCost * 100) / 100;
    totalCost += uvCost;
  }
  
  // 5. Aqueous Varnish
  if (finishing.aqueousVarnish.enabled) {
    if (coverMachineHasAQ) {
      breakdown["Aqueous Varnish"] = 0; // Free on Rekord with AQ
    } else {
      const cost = AQUEOUS_VARNISH_RATE * quantity;
      breakdown["Aqueous Varnish"] = Math.round(cost * 100) / 100;
      totalCost += cost;
    }
  }
  
  // 6. Gold/Foil Blocking
  if (finishing.goldBlocking.enabled) {
    let goldCost = 0;
    const locations = finishing.goldBlocking.location;
    if (locations.includes("front")) goldCost += GOLD_BLOCKING_RATES.frontRate * quantity;
    if (locations.includes("spine")) goldCost += GOLD_BLOCKING_RATES.spineRate * quantity;
    if (locations.includes("back")) goldCost += GOLD_BLOCKING_RATES.frontRate * quantity;
    goldCost += GOLD_BLOCKING_RATES.dieCost * locations.length;
    breakdown["Foil Blocking"] = Math.round(goldCost * 100) / 100;
    totalCost += goldCost;
  }
  
  // 7. Embossing
  if (finishing.embossing.enabled) {
    const rate = finishing.embossing.type === "multi_level" ? EMBOSSING_RATES.multiLevel : EMBOSSING_RATES.singleLevel;
    const cost = rate * quantity + EMBOSSING_RATES.dieCost * finishing.embossing.location.length;
    breakdown["Embossing"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  
  // 8. Die Cutting
  if (finishing.dieCutting.enabled) {
    const dcRate = DIE_CUTTING_RATES[finishing.dieCutting.complexity];
    const cost = dcRate.ratePerCopy * quantity + dcRate.dieCost;
    breakdown["Die Cutting"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  
  // 9. Edge Gilding
  if (finishing.edgeGilding.enabled) {
    const cost = 2.50 * finishing.edgeGilding.edges.length * quantity;
    breakdown["Edge Gilding"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  
  // 10. Perforation, Scoring, Numbering
  if (finishing.perforation.enabled) {
    const cost = 0.10 * quantity;
    breakdown["Perforation"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  if (finishing.scoring.enabled) {
    const cost = 0.08 * quantity;
    breakdown["Scoring"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  if (finishing.numbering.enabled) {
    const cost = 0.15 * quantity;
    breakdown["Numbering"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }

  // 11. Collation / Hole Punch / Trimming
  if (finishing.collation.enabled) {
    const modeFactor = finishing.collation.mode === "booklet" ? 1.5 : finishing.collation.mode === "sectional" ? 1.25 : 1;
    const cost = (finishing.collation.ratePerCopy * modeFactor * quantity) + finishing.collation.setupCost;
    breakdown["Collation"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  if (finishing.holePunch.enabled) {
    const holeFactor = finishing.holePunch.holes / 2;
    const cost = (finishing.holePunch.ratePerCopy * holeFactor * quantity) + finishing.holePunch.setupCost;
    breakdown["Hole Punch"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }
  if (finishing.trimming.enabled) {
    const cost = finishing.trimming.ratePerCopy * finishing.trimming.sides * quantity;
    breakdown["Cutting / Trimming"] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }

  // 12. Envelope printing
  if (finishing.envelopePrinting.enabled && finishing.envelopePrinting.quantity > 0) {
    const colorFactor = finishing.envelopePrinting.colors === 4 ? 1.8 : finishing.envelopePrinting.colors === 2 ? 1.3 : 1;
    const sizeFactor = finishing.envelopePrinting.envelopeSize === "c4" ? 1.4 : finishing.envelopePrinting.envelopeSize === "c5" ? 1.2 : 1;
    const envCost = (finishing.envelopePrinting.ratePerEnvelope * colorFactor * sizeFactor * finishing.envelopePrinting.quantity)
      + finishing.envelopePrinting.setupCost;
    breakdown["Envelope Printing"] = Math.round(envCost * 100) / 100;
    totalCost += envCost;
  }

  // 13. Large format / poster printing
  if (finishing.largeFormat.enabled && finishing.largeFormat.quantity > 0) {
    const widthM = finishing.largeFormat.widthMM / 1000;
    const heightM = finishing.largeFormat.heightMM / 1000;
    const areaSqM = Math.max(0.01, widthM * heightM);
    const typeFactor = finishing.largeFormat.productType === "banner" ? 1.2 : finishing.largeFormat.productType === "plotter" ? 1.1 : 1;
    const lfCost = areaSqM * finishing.largeFormat.ratePerSqM * typeFactor * finishing.largeFormat.quantity;
    breakdown["Large Format"] = Math.round(lfCost * 100) / 100;
    totalCost += lfCost;
  }
  
  // 14. Additional finishing items
  for (const item of finishing.additionalFinishing) {
    if (item.costPerCopy > 0 || item.setupCost > 0) {
      const cost = item.costPerCopy * quantity + item.setupCost;
      breakdown[item.type || "Additional"] = Math.round(cost * 100) / 100;
      totalCost += cost;
    }
  }
  
  const costPerCopy = quantity > 0 ? totalCost / quantity : 0;
  
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerCopy: Math.round(costPerCopy * 100) / 100,
    breakdown,
  };
}
