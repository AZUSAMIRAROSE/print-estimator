// ============================================================================
// PAPER COST CALCULATION — EXACT EXCEL LOGIC
// ============================================================================

import { calculateImposition, type ImpositionResult } from "./imposition";
import { calculateWastage, type WastageResult } from "./wastage";
import { STANDARD_PAPER_SIZES } from "@/constants";
import { mmToInch } from "@/utils/format";
import type { SectionPaperCost } from "@/types";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";

export interface PaperCalculationInput {
  sectionName: string;
  sectionType: "text1" | "text2" | "cover" | "jacket" | "endleaves" | "case";
  totalPages: number;
  trimWidthMM: number;
  trimHeightMM: number;
  gsm: number;
  paperType: string;
  paperCode: string;
  paperSizeLabel: string;
  quantity: number;
  colorsFront: number;
  colorsBack: number;
  machineMaxWidth?: number;
  machineMaxHeight?: number;
  gripperMM?: number;
  bleedMM?: number;
  spineThickness?: number; // For cover calculations
}

export interface PaperCalculationResult extends SectionPaperCost {
  wastageResult: WastageResult;
  imposition: ImpositionResult;
}

/**
 * Calculate complete paper requirement and cost for a section
 */
export function calculatePaperRequirement(input: PaperCalculationInput): PaperCalculationResult {
  // For cover, adjust width to include spine
  let effectiveWidth = input.trimWidthMM;
  let effectiveHeight = input.trimHeightMM;

  if (input.sectionType === "cover" && input.spineThickness) {
    effectiveWidth = input.trimWidthMM * 2 + input.spineThickness;
  }
  if (input.sectionType === "jacket" && input.spineThickness) {
    // Jacket includes flaps (typically 90mm each side)
    effectiveWidth = input.trimWidthMM * 2 + input.spineThickness + 180; // 90mm flaps each side
  }

  // Find matching paper size
  const paperSize = STANDARD_PAPER_SIZES.find(ps => ps.label === input.paperSizeLabel);
  const availableSizes = paperSize ? [paperSize] : STANDARD_PAPER_SIZES;

  // Calculate optimal imposition
  const imposition = calculateImposition({
    trimWidthMM: effectiveWidth,
    trimHeightMM: effectiveHeight,
    totalPages: input.totalPages,
    bleedMM: input.bleedMM ?? 3,
    gripperMM: input.gripperMM ?? 12,
    machineMaxWidth: input.machineMaxWidth,
    machineMaxHeight: input.machineMaxHeight,
    availablePaperSizes: availableSizes,
  });

  // Calculate wastage
  const maxColors = Math.max(input.colorsFront, input.colorsBack);
  const wastageResult = calculateWastage({
    quantity: input.quantity,
    maxColors,
    numberOfForms: imposition.numberOfForms,
  });

  // Calculate sheets
  const netSheets = Math.ceil(input.quantity * imposition.numberOfForms / imposition.ups);
  const grossSheets = netSheets + wastageResult.totalWastage;
  const reams = grossSheets / 500;

  // Calculate weight
  const sheetAreaSqM = (imposition.paperWidthInch * 0.0254) * (imposition.paperHeightInch * 0.0254);
  const weightPerSheet = sheetAreaSqM * input.gsm / 1000; // kg
  const weightPerReam = weightPerSheet * 500;
  const totalWeight = reams * weightPerReam;

  // Find paper rate
  const rate = findPaperRate(input.paperType, input.paperCode, input.gsm, imposition.paperSizeLabel);
  const ratePerReam = rate.chargeRate;
  const totalCost = reams * ratePerReam;

  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    paperType: input.paperType,
    gsm: input.gsm,
    paperSize: imposition.paperSizeLabel,
    ppPerForm: imposition.ppPerForm,
    numberOfForms: imposition.numberOfForms,
    ups: imposition.ups,
    formatSize: imposition.formatLabel,
    netSheets,
    wastageSheets: wastageResult.totalWastage,
    grossSheets,
    reams: Math.round(reams * 100) / 100,
    weightPerReam: Math.round(weightPerReam * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
    ratePerReam,
    totalCost: Math.round(totalCost * 100) / 100,
    wastageResult,
    imposition,
  };
}

function findPaperRate(paperType: string, paperCode: string, gsm: number, size: string): { landedCost: number; chargeRate: number } {
  const { items } = useInventoryStore.getState();
  const { paperRates } = useRateCardStore.getState();

  // 1. Try finding in Inventory Store (highest priority for real costs)
  const invMatch = items.find(i =>
    i.category === "paper" &&
    (i.sku === paperCode || i.name.toLowerCase().includes(paperType.toLowerCase())) &&
    i.name.includes(gsm.toString())
  );

  if (invMatch && invMatch.costPerUnit > 0) {
    // If inventory item is found, we assume costPerUnit is per ream or matching unit.
    // If it's literally tracking sheets or kg, we might need a conversion, 
    // but for now we assume the inventory price reflects the workable unit (Ream).
    // Let's standardise the chargeRate with a 20% margin if using bare avgCost.
    const baseCost = invMatch.avgCost || invMatch.lastPurchasePrice || invMatch.costPerUnit;
    return { landedCost: baseCost, chargeRate: Math.round(baseCost * 1.2) };
  }

  // 2. Try exact match in Rate Card Store
  let match = paperRates.find(
    r => (r.paperType === paperType || r.code === paperCode) && r.gsm === gsm && r.size === size
  );

  if (match) {
    return { landedCost: match.landedCost, chargeRate: match.chargeRate };
  }

  // 3. Try matching paper type and GSM (any size) in Rate Card Store
  match = paperRates.find(
    r => (r.paperType === paperType || r.code === paperCode) && r.gsm === gsm
  );

  if (match) {
    // Adjust rate proportionally based on sheet area
    const matchSize = STANDARD_PAPER_SIZES.find(s => s.label === match!.size);
    const targetSize = STANDARD_PAPER_SIZES.find(s => s.label === size);

    if (matchSize && targetSize) {
      const areaRatio = (targetSize.widthInch * targetSize.heightInch) / (matchSize.widthInch * matchSize.heightInch);
      return {
        landedCost: Math.round(match.landedCost * areaRatio),
        chargeRate: Math.round(match.chargeRate * areaRatio),
      };
    }

    return { landedCost: match.landedCost, chargeRate: match.chargeRate };
  }

  // 4. Try matching paper type, interpolate GSM from Rate Card Store
  const ratesForType = paperRates.filter(
    r => r.paperType === paperType || r.code === paperCode
  );

  if (ratesForType.length > 0) {
    // Sort by GSM
    const sorted = [...ratesForType].sort((a, b) => a.gsm - b.gsm);

    // Find nearest GSM entries for interpolation
    const lower = sorted.filter(r => r.gsm <= gsm).pop();
    const upper = sorted.filter(r => r.gsm >= gsm).shift();

    if (lower && upper && lower.gsm !== upper.gsm) {
      const ratio = (gsm - lower.gsm) / (upper.gsm - lower.gsm);
      return {
        landedCost: Math.round(lower.landedCost + (upper.landedCost - lower.landedCost) * ratio),
        chargeRate: Math.round(lower.chargeRate + (upper.chargeRate - lower.chargeRate) * ratio),
      };
    }

    if (lower) return { landedCost: lower.landedCost, chargeRate: lower.chargeRate };
    if (upper) return { landedCost: upper.landedCost, chargeRate: upper.chargeRate };
  }

  // 5. Ultimate fallback: calculate from rate per kg
  const ratePerKg = 80; // Default fallback kg rate
  const sizeObj = STANDARD_PAPER_SIZES.find(s => s.label === size) || STANDARD_PAPER_SIZES[0];
  const sheetAreaSqM = (sizeObj.widthInch * 0.0254) * (sizeObj.heightInch * 0.0254);
  const weightPerReam = sheetAreaSqM * gsm / 1000 * 500;
  const chargeRate = Math.round(weightPerReam * ratePerKg);

  return { landedCost: Math.round(chargeRate * 0.85), chargeRate };
}