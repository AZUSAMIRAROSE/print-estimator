// ============================================================================
// PRINTING COST CALCULATION — EXACT EXCEL IMPRESSION RATE TABLE
// ============================================================================

import { IMPRESSION_RATES_DATA, MAKE_READY_RATES, BIBLE_PAPER_SURCHARGES, DEFAULT_MACHINES } from "@/constants";
import type { SectionPrintingCost, ImpressionRate } from "@/types";
import type { ImpositionResult } from "./imposition";
import type { WastageResult } from "./wastage";

export interface PrintingCostInput {
  sectionName: string;
  sectionType: string;
  machineId: string;
  machineName: string;
  colorsFront: number;
  colorsBack: number;
  quantity: number;
  imposition: ImpositionResult;
  wastageResult: WastageResult;
  gsm: number;
  printingMethod: "sheetwise" | "work_and_turn" | "work_and_tumble" | "perfector";
}

/**
 * Calculate printing cost for a section
 * Impressions per form = (quantity + wastage_sheets) / ups
 * Rate looked up from table by impression count AND machine
 * Cost per form = (impressions / 1000) × rate_per_1000
 * Add make-ready cost per form
 */
export function calculatePrintingCost(input: PrintingCostInput): SectionPrintingCost {
  const { imposition, wastageResult, quantity } = input;
  
  // Calculate total plates needed
  let platesPerForm: number;
  if (input.printingMethod === "work_and_turn" || input.printingMethod === "work_and_tumble") {
    platesPerForm = Math.max(input.colorsFront, input.colorsBack);
  } else if (input.printingMethod === "perfector") {
    platesPerForm = input.colorsFront + input.colorsBack;
  } else {
    // Sheetwise: both sides printed separately
    platesPerForm = input.colorsFront + input.colorsBack;
  }
  
  const totalPlates = platesPerForm * imposition.numberOfForms;
  
  // Calculate impressions per form
  const grossSheetsPerForm = Math.ceil((quantity + wastageResult.wastagePerForm) / imposition.ups);
  const impressionsPerForm = grossSheetsPerForm;
  const totalImpressions = impressionsPerForm * imposition.numberOfForms;
  
  // For perfector, impressions are halved (prints both sides simultaneously)
  const effectiveImpressions = input.printingMethod === "perfector"
    ? totalImpressions / 2
    : totalImpressions;
  
  // Look up impression rate based on quantity and machine
  const ratePer1000 = getImpressionRate(impressionsPerForm, input.machineId);
  
  // Calculate printing cost
  const printingCost = (effectiveImpressions / 1000) * ratePer1000;
  
  // Make ready cost
  const makeReadyCostPerForm = MAKE_READY_RATES[input.machineId.toUpperCase()] || 
                                MAKE_READY_RATES[input.machineName] || 
                                1500;
  const totalMakeReady = makeReadyCostPerForm * imposition.numberOfForms;
  
  // Bible paper surcharge
  let surchargeMultiplier = 1;
  const surcharge = BIBLE_PAPER_SURCHARGES.find(
    s => input.gsm >= s.minGSM && input.gsm <= s.maxGSM
  );
  if (surcharge) {
    surchargeMultiplier = 1 + surcharge.surchargePercent / 100;
  }
  
  const adjustedPrintingCost = printingCost * surchargeMultiplier;
  const totalCost = adjustedPrintingCost + totalMakeReady;
  
  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    machineName: input.machineName,
    totalPlates,
    impressionsPerForm,
    totalImpressions: Math.round(effectiveImpressions),
    ratePer1000,
    printingCost: Math.round(adjustedPrintingCost * 100) / 100,
    makeReadyCost: totalMakeReady,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

function getImpressionRate(impressions: number, machineId: string): number {
  // Determine machine column
  const machineKey = machineId.toLowerCase();
  
  for (const entry of IMPRESSION_RATES_DATA) {
    if (impressions >= entry.range[0] && impressions <= entry.range[1]) {
      if (machineKey.includes("fav")) return entry.fav;
      if (machineKey.includes("rek") && machineKey.includes("aq")) return entry.rekordAQ;
      if (machineKey.includes("rek")) return entry.rekordNoAQ;
      if (machineKey.includes("perfecto")) return entry.rmgtPerfecto;
      if (machineKey.includes("rmgt")) return entry.rmgt;
      return entry.fav; // Default
    }
  }
  
  // Fallback: use last entry
  const last = IMPRESSION_RATES_DATA[IMPRESSION_RATES_DATA.length - 1];
  return last.fav;
}