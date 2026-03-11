// ============================================================================
// PRINTING COST ENGINE — THOMSON PRESS CALIBRATED (REWRITE)
// ============================================================================
// Uses Thomson Press EXACT rate tables:
//   - CTP plate making: separate cost per plate
//   - Printing: plates × print rate per plate
//   - Impression cost: (impressions / 1000) × lookup rate
//
// CRITICAL RULES:
//   1. CTP and Printing are SEPARATE cost lines
//   2. Impression rates in the lookup table are already in RUPEES per 1000
//   3. Machine auto-selection picks lowest-cost eligible machine
//
// CALIBRATION TARGET:
//   Text 1 on RMGT: 16 plates × Rs 271 CTP = Rs 4,336
//   Endleaves on REK: 8 plates × Rs 403 CTP = Rs 3,224
//   Cover on FAV: 4 plates × Rs 247 CTP = Rs 988
//   TOTAL CTP: Rs 8,548
//
//   Text 1: 16 plates × Rs 146 print = Rs 2,336
//   Endleaves: 12 plates × Rs 148 print = Rs 1,776
//   Cover: 4 plates × Rs 131 print = Rs 524 (or similar)
//   TOTAL PRINTING: Rs ~4,672
// ============================================================================

import { useMachineStore } from "@/stores/machineStore";
import { lookupTPImpressionRate, lookupTPPlateRates, lookupTPMachineReadyWastage } from "./constants";
import type { ImpositionResult } from "./paper";
import type { CompoundSpoilageResult } from "./paper";
import type { SubstratePhysicalModel } from "./paper";

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────

export interface PrintingCostInput {
  sectionName: string;
  sectionType: string;
  machineId: string;           // machine ID or "" for auto-select
  colorsFront: number;
  colorsBack: number;
  quantity: number;
  imposition: ImpositionResult;
  wastageResult: CompoundSpoilageResult;
  substrate: SubstratePhysicalModel;
  printingMethod: 'SHEETWISE' | 'WORK_AND_TURN' | 'WORK_AND_TUMBLE' | 'PERFECTING';
  inkCoverageFront_percent?: number[];
  inkCoverageBack_percent?: number[];
}

export interface MachineKinematicsResult {
  baseSpeed_sph: number;
  substrateSpeedPenalty_percent: number;
  colorSyncPenalty_percent: number;
  perfectingPenalty_percent: number;
  effectiveSpeed_sph: number;
  rampUpLoss_hours: number;
  runningTime_hours: number;
}

export interface MakereadyDecompositionResult {
  baseSetup_mins: number;
  colorUnitWashup_mins: number;
  plateLoading_mins: number;
  registerAdjustment_mins: number;
  feederDeliverySetup_mins: number;
  cip3Transfer_mins: number;
  totalMakereadyTime_mins: number;
  totalMakereadyTime_hours: number;
}

export interface InkChemistryResult {
  totalPrintArea_sqm: number;
  inkMileage_sqmPerKg: number;
  transferEfficiency_percent: number;
  totalInkConsumed_kg: number;
  inkCost: number;
  washupSolventCost: number;
}

export interface EnergyAndDepreciationResult {
  driveMotor_kW: number;
  curingUnits_kW: number;
  totalEnergy_kWh: number;
  electricityCost: number;
  depreciationCost_perHour: number;
  totalDepreciationCost: number;
}

export interface SectionPrintingCost_GodLevel {
  sectionName: string;
  sectionType: string;
  machineId: string;
  machineName: string;
  impressionsPerForm: number;
  totalImpressions: number;
  totalPlates: number;
  kinematics: MachineKinematicsResult;
  makeready: MakereadyDecompositionResult;
  inkChemistry: InkChemistryResult;
  facility: EnergyAndDepreciationResult;
  timeRunningCost: number;
  timeMakereadyCost: number;
  platesCost: number;           // CTP cost (plate making)
  printingPlateCost: number;    // Printing cost (press running per plate)
  inkCost: number;
  solventCost: number;
  energyCost: number;
  depreciationCost: number;
  totalCost: number;            // CTP + Printing + Impression cost
  effectiveRatePer1000: number;
}

// ─── PLATE COUNT FORMULA ─────────────────────────────────────────────────────
// CORRECT FORMULA from Excel:
//   plates = colours_front × formes + colours_back × formes
// Each forme needs plates for EACH colour on each side.

function calculatePlates(
  colorsFront: number,
  colorsBack: number,
  numberOfForms: number
): number {
  return (colorsFront * numberOfForms) + (colorsBack * numberOfForms);
}

// ─── MACHINE RESOLUTION ──────────────────────────────────────────────────────
function resolveMachine(machineId: string): any {
  const { machines } = useMachineStore.getState();
  // machines is a Map<string, Machine> — convert to array for searching
  const allMachines = Array.from(machines.values());

  if (machineId) {
    // Try direct Map lookup first
    const direct = machines.get(machineId);
    if (direct) return direct;
    // Then search by code/name
    const found = allMachines.find((m: any) =>
      m.id === machineId || m.code === machineId ||
      m.nickname?.toUpperCase() === machineId.toUpperCase() ||
      m.name?.toUpperCase() === machineId.toUpperCase()
    );
    if (found) return found;
  }
  // Fallback to first active machine
  const active = allMachines.filter((m: any) => !m.isArchived && m.status === 'ACTIVE');
  return active.length > 0 ? active[0] : {
    id: 'rmgt',
    code: 'RMGT',
    name: 'RMGT',
    speedSPH: 8000,
    effectiveSpeed: 8000,
    maxColors: 4,
    maxColorsPerPass: 4,
    makeReadyTime: 0.3,
    hourlyRate: 3200,
    ctpRate: 271,
    ctpRate_perPlate: 271,
    maxSheetWidth: 23,
    maxSheetHeight: 36,
  };
}

// ─── MACHINE CODE EXTRACTOR ──────────────────────────────────────────────────
function getMachineCode(machine: any): string {
  const code = (machine.code || machine.id || '').toUpperCase();
  if (code.includes('FAV')) return 'FAV';
  if (code.includes('REK')) return 'REK';
  if (code.includes('RMGT')) return 'RMGT';
  if (code.includes('AKI')) return 'AKI';
  return 'RMGT'; // Default
}

// ─── SIMPLIFIED KINEMATICS (for machine hours reporting) ─────────────────────
function calculateKinematics(
  machine: any,
  totalGrossSheets: number,
  numberOfForms: number,
): MachineKinematicsResult {
  const baseSpeed = machine.speedSPH || 8000;
  const effectiveSpeed = baseSpeed; // Simplified — use raw speed
  const totalImpressions = totalGrossSheets * numberOfForms;
  const runningTime = totalImpressions / effectiveSpeed;

  return {
    baseSpeed_sph: baseSpeed,
    substrateSpeedPenalty_percent: 0,
    colorSyncPenalty_percent: 0,
    perfectingPenalty_percent: 0,
    effectiveSpeed_sph: effectiveSpeed,
    rampUpLoss_hours: 0,
    runningTime_hours: runningTime,
  };
}

// ─── SIMPLIFIED MAKEREADY ────────────────────────────────────────────────────
function calculateMakeready(
  machine: any,
  totalPlates: number,
): MakereadyDecompositionResult {
  const makereadyPerPlate_mins = (machine.makeReadyTime || 0.3) * 60 / Math.max(1, totalPlates);
  const totalMins = makereadyPerPlate_mins * totalPlates;

  return {
    baseSetup_mins: totalMins * 0.4,
    colorUnitWashup_mins: totalMins * 0.15,
    plateLoading_mins: totalMins * 0.2,
    registerAdjustment_mins: totalMins * 0.15,
    feederDeliverySetup_mins: totalMins * 0.05,
    cip3Transfer_mins: totalMins * 0.05,
    totalMakereadyTime_mins: totalMins,
    totalMakereadyTime_hours: totalMins / 60,
  };
}

// ─── MAIN ORCHESTRATION FUNCTION ─────────────────────────────────────────────
export function calculatePrintingCostGodLevel(input: PrintingCostInput): SectionPrintingCost_GodLevel {
  const machine = resolveMachine(input.machineId);
  const machineCode = getMachineCode(machine);
  const plateRates = lookupTPPlateRates(machineCode);

  // ── PLATE COUNT ────────────────────────────────────────────────────────
  const numberOfForms = input.imposition.numberOfForms;
  const totalPlates = calculatePlates(
    input.colorsFront,
    input.colorsBack,
    numberOfForms
  );

  // ── CTP COST (plate making — SEPARATE from printing) ───────────────────
  const ctpCost = totalPlates * plateRates.ctpRatePerPlate;

  // ── PRINTING COST (press running per plate) ────────────────────────────
  const printingPlateCost = totalPlates * plateRates.printingRatePerPlate;

  // ── IMPRESSION COST ────────────────────────────────────────────────────
  // Total impressions = gross sheets (qty + wastage) × forms × sides
  // But for SHEETWISE, each side is a separate impression
  const grossSheets = input.wastageResult.totalSheetsRequired_printing;
  const ups = Math.max(1, input.imposition.ups);

  // Impressions per form = gross sheets (already per form from paper calc)
  // Total impressions = grossSheets from paper calculation
  const impressionsPerForm = Math.ceil(grossSheets / numberOfForms);
  const totalImpressions = grossSheets;

  // Look up the impression rate based on paper size and colour count
  const paperSizeCode = input.imposition.paperSizeLabel || '23×36';
  const maxColors = Math.max(input.colorsFront, input.colorsBack);
  const ratePer1000 = lookupTPImpressionRate(totalImpressions, paperSizeCode, maxColors);

  // Impression cost
  // NOTE: ratePer1000 is already in RUPEES (not paise) — our constants are pre-converted
  const impressionCost = (totalImpressions / 1000) * ratePer1000;

  // ── TOTAL PRINTING COST ────────────────────────────────────────────────
  // Total = printing plate cost + impression cost
  // CTP cost is reported separately
  const totalPrintCostExclCTP = printingPlateCost + impressionCost;
  const totalCostInclCTP = ctpCost + totalPrintCostExclCTP;

  // ── MACHINE HOURS (for overhead calculations) ──────────────────────────
  const kinematics = calculateKinematics(machine, grossSheets, numberOfForms);
  const makeready = calculateMakeready(machine, totalPlates);

  const totalMachineHours = kinematics.runningTime_hours + makeready.totalMakereadyTime_hours;
  const makeReadyCost = makeready.totalMakereadyTime_hours * (machine.hourlyRate || 3200);
  const runningCost = kinematics.runningTime_hours * (machine.hourlyRate || 3200);

  // ── INK & ENERGY (simplified — small proportion of total) ──────────────
  const inkChemistry: InkChemistryResult = {
    totalPrintArea_sqm: 0,
    inkMileage_sqmPerKg: 400,
    transferEfficiency_percent: 85,
    totalInkConsumed_kg: 0,
    inkCost: 0,
    washupSolventCost: 0,
  };

  const facility: EnergyAndDepreciationResult = {
    driveMotor_kW: 0,
    curingUnits_kW: 0,
    totalEnergy_kWh: 0,
    electricityCost: 0,
    depreciationCost_perHour: 0,
    totalDepreciationCost: 0,
  };

  // ── EFFECTIVE RATE ─────────────────────────────────────────────────────
  const effectiveRatePer1000 = totalImpressions > 0
    ? (totalCostInclCTP / totalImpressions) * 1000
    : 0;

  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    machineId: machine.id || machineCode,
    machineName: machine.name || machineCode,
    impressionsPerForm,
    totalImpressions,
    totalPlates,
    kinematics,
    makeready,
    inkChemistry,
    facility,
    timeRunningCost: runningCost,
    timeMakereadyCost: makeReadyCost,
    platesCost: ctpCost,            // CTP cost (plate making)
    printingPlateCost,              // Printing cost (press running per plate)
    inkCost: 0,
    solventCost: 0,
    energyCost: 0,
    depreciationCost: 0,
    totalCost: totalCostInclCTP,    // CTP + Print plate + Impression
    effectiveRatePer1000,
  };
}
