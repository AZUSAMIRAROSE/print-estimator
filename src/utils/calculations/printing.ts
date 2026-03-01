import { IMPRESSION_RATES_DATA, DEFAULT_MACHINES } from "@/constants";
import type { SectionPrintingCost } from "@/types";
import type { ImpositionResult } from "./imposition";
import type { WastageResult } from "./wastage";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";

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

  // ── Find Machine from Stores ──
  const { machines: invMachines } = useInventoryStore.getState();
  const { machines: rcMachines } = useRateCardStore.getState();

  let machine = invMachines.find(m => m.id === input.machineId || m.name === input.machineName);
  if (!machine) {
    machine = rcMachines.find(m => m.id === input.machineId || m.name === input.machineName);
  }

  let printingCost = 0;
  let totalMakeReady = 0;
  let ratePer1000 = 0;

  // ── Super Ultimate Precise Estimate Calculation ──
  if (machine && machine.speedSPH > 0 && machine.hourlyRate >= 0) {
    // 1. Calculate running time in hours
    const runningHours = effectiveImpressions / machine.speedSPH;

    // 2. Calculate hourly total operational cost
    const powerCostPerHour = machine.powerConsumptionKW * machine.electricityCostPerUnit;
    const totalHourlyCost = machine.hourlyRate + machine.inkCostPerHour + powerCostPerHour;

    // 3. Printing Cost
    printingCost = runningHours * totalHourlyCost;

    // Calculate synthetic ratePer1000 for display/legacy compat
    ratePer1000 = effectiveImpressions > 0 ? (printingCost / effectiveImpressions) * 1000 : 0;

    // 4. Make Ready Cost (Fixed + Time-based)
    const makeReadyTimeCost = (machine.makeReadyTime || 0) * totalHourlyCost;
    const flatMakeReady = machine.makeReadyCost || 0;

    const combinedMakeReadyPerForm = flatMakeReady + makeReadyTimeCost;
    totalMakeReady = combinedMakeReadyPerForm * imposition.numberOfForms;
  } else {
    // ── Fallback to legacy Excel table rates ──
    ratePer1000 = getImpressionRate(impressionsPerForm, input.machineId);
    printingCost = (effectiveImpressions / 1000) * ratePer1000;

    const defaultMR = 1500;
    totalMakeReady = defaultMR * imposition.numberOfForms;
  }

  const totalCost = printingCost + totalMakeReady;

  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    machineName: input.machineName,
    totalPlates,
    impressionsPerForm,
    totalImpressions: Math.round(effectiveImpressions),
    ratePer1000: Math.round(ratePer1000 * 100) / 100,
    printingCost: Math.round(printingCost * 100) / 100,
    makeReadyCost: Math.round(totalMakeReady * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

function getImpressionRate(impressions: number, machineId: string): number {
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

  const last = IMPRESSION_RATES_DATA[IMPRESSION_RATES_DATA.length - 1];
  return last.fav;
}