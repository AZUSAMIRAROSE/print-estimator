// ============================================================================
// PRINTING KINEMATICS & INK CHEMISTRY ENGINE (GOD-LEVEL)
// ============================================================================
// Model: Directed Acyclic Graph Node
// 
// This module computes the thermodynamic, chemical, and logistical costs of:
// - Machine Kinematics (Speed degradation curves based on stock/colors)
// - Makeready Decomposition (Micro-level time tracking per operation)
// - Ink Chemistry & Consumption (Coverage %, Specific Gravity, Transfer Eq)
// - Energy Consumption (kWh based on drive motors + curing units)
// - Machine Depreciation & Direct Overhead Allocation
// ============================================================================

import { useMachineStore } from "@/stores/machineStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { ENGINE_CONSTANTS } from "./constants";
import type { ImpositionResult } from "./paper";
import type { CompoundSpoilageResult } from "./paper";
import type { SubstratePhysicalModel } from "./paper";

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────

export interface PrintingCostInput {
  sectionName: string;
  sectionType: string;
  machineId: string;
  colorsFront: number;
  colorsBack: number;
  quantity: number; // Finished required quantity
  imposition: ImpositionResult; // From paper module
  wastageResult: CompoundSpoilageResult; // From paper module
  substrate: SubstratePhysicalModel; // From paper module
  printingMethod: 'SHEETWISE' | 'WORK_AND_TURN' | 'WORK_AND_TUMBLE' | 'PERFECTING';
  inkCoverageFront_percent?: number[]; // [C, M, Y, K, Spot1...]
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
  chemistry: InkChemistryResult;
  facility: EnergyAndDepreciationResult;

  // Cost breakdown
  timeRunningCost: number;
  timeMakereadyCost: number;
  platesCost: number;
  inkCost: number;
  solventCost: number;
  energyCost: number;
  depreciationCost: number;

  totalCost: number;
  effectiveRatePer1000: number; // Synthetic metric for comparison
}

// ─── 1. MACHINE KINEMATICS ENGINE ────────────────────────────────────────────
function calculateKinematics(
  machine: any,
  substrate: SubstratePhysicalModel,
  activeUnits: number,
  imposition: ImpositionResult,
  totalGrossSheets: number,
  method: 'SHEETWISE' | 'WORK_AND_TURN' | 'WORK_AND_TUMBLE' | 'PERFECTING'
): MachineKinematicsResult {

  const baseSpeed = machine.speed_max_sph || machine.effectiveSpeed || 15000;

  // 1a. Substrate Penalties
  let subPenalty = 0;
  if (substrate.grammage_gsm > (machine.maxSubstrateWeight_gsm || 350) * 0.8) {
    // Heavy stock slows down feeder
    subPenalty = machine.speedReductionThickStock_percent || 15;
  } else if (substrate.grammage_gsm < (machine.minSubstrateWeight_gsm || 60) * 1.5) {
    // Light stock causes air table floating issues
    subPenalty = machine.speedReductionThinStock_percent || 20;
  } else if (substrate.surfaceFinish === 'UNCOATED') {
    subPenalty = 5; // Uncoated dust reduction
  }

  // 1b. Color Sync Drag (Multi-unit register maintenance)
  const syncPenalty = activeUnits > 2 ? (activeUnits - 2) * (machine.speedReduction_perAdditionalColor_percent || 2) : 0;

  // 1c. Perfecting Penalty
  const perfectingPenalty = method === 'PERFECTING' ? (100 - (machine.duplexSpeedFactor || 0.6) * 100) : 0;

  // Compounded Effective Speed
  const penaltyMult = (1 - (subPenalty / 100)) * (1 - (syncPenalty / 100)) * (1 - (perfectingPenalty / 100));
  const effectiveSpeed = Math.floor(baseSpeed * penaltyMult);

  // Total Impressions required (gross)
  let impressions = totalGrossSheets;
  if (method === 'SHEETWISE') {
    // Sheetwise processes back side as a separate pass (impression count is same, but goes through machine twice? No, sheets are passed twice)
    impressions = totalGrossSheets * 2;
    // Wait, if it's 4c/4c sheetwise, that's two separate runs of the sheet.
    // If we count impressions as machine passes:
  }
  // For standard mathematical simplicity, we calculate total machine passes required.
  // Actually, grossSheets from wastage engine already models total sheets required at the feeder for the ENTIRE job.
  // We need to know how many passes.
  const forms = imposition.numberOfForms;
  let passesPerSheet = 1;
  if (method === 'SHEETWISE') passesPerSheet = 2; // Front, then back

  const totalImpressions = totalGrossSheets * passesPerSheet;

  const rawRunningTime = totalImpressions / effectiveSpeed;

  // Ramp up loss (Physics of accelerating mass)
  const rampMins = machine.speedCurve_startupDuration_mins || 5; // e.g., 5 mins to hit top speed
  const rampLoss = (rampMins / 60) * 0.5 * forms * passesPerSheet; // Loses half efficiency during ramp

  return {
    baseSpeed_sph: baseSpeed,
    substrateSpeedPenalty_percent: subPenalty,
    colorSyncPenalty_percent: syncPenalty,
    perfectingPenalty_percent: perfectingPenalty,
    effectiveSpeed_sph: effectiveSpeed,
    rampUpLoss_hours: rampLoss,
    runningTime_hours: rawRunningTime + rampLoss
  };
}

// ─── 2. MAKEREADY DECOMPOSITION ──────────────────────────────────────────────
function calculateMakeready(machine: any, forms: number, activeUnits: number, platesPerForm: number): MakereadyDecompositionResult {
  // Base Mechanical Setup (Feeder/Delivery)
  const base = machine.setupTimeBase_mins || 15;

  // Washup & Blanket Cleaning
  const washup = activeUnits * (machine.setupTimePerColor_mins || 3);

  // Plate loading (Semi-auto vs Fully-auto)
  const plateLoad = platesPerForm * (machine.autoPlateLoadingTime_perPlate_mins || 1.5);

  // Register targeting
  const register = (activeUnits > 1 ? activeUnits : 0) * 1.0;

  // CIP3 Ink Key Profiling
  const cip3 = 2.0;

  const totalPerForm = base + washup + plateLoad + register + cip3;

  return {
    baseSetup_mins: base * forms,
    colorUnitWashup_mins: washup * forms,
    plateLoading_mins: plateLoad * forms,
    registerAdjustment_mins: register * forms,
    feederDeliverySetup_mins: 0, // bundled in base
    cip3Transfer_mins: cip3 * forms,
    totalMakereadyTime_mins: totalPerForm * forms,
    totalMakereadyTime_hours: (totalPerForm * forms) / 60
  };
}

// ─── 3. INK CHEMISTRY ────────────────────────────────────────────────────────
function calculateInkChemistry(
  input: PrintingCostInput,
  totalImpressions: number,
  substrate: SubstratePhysicalModel
): InkChemistryResult {

  // Total printable area per impression (sqm)
  const impAreaSqm = (input.imposition.usedArea_sqmm) / 1000000;
  const totalPrintAreaSqm = impAreaSqm * totalImpressions;

  // Mileage baseline (sqm per kg of ink). Typically ~400 sqm/kg for offset.
  let mileage = (ENGINE_CONSTANTS.ink as any).baseMileage_sqmPerKg || 400;

  // Adjust based on substrate absorption
  if (substrate.inkAbsorptionRate === 'HIGH') {
    mileage = mileage * 0.7; // Uncoated absorbs more, meaning less coverage per kg
  } else if (substrate.inkAbsorptionRate === 'LOW') {
    mileage = mileage * 1.15; // Coated holds ink on surface
  }

  // Calculate average coverage
  // If no coverage provided, assume 25% per color active.
  const fCov = input.inkCoverageFront_percent || Array(input.colorsFront).fill(0.25);
  const bCov = input.inkCoverageBack_percent || Array(input.colorsBack).fill(0.25);

  const sumFCov = fCov.reduce((a, b) => a + b, 0);
  const sumBCov = bCov.reduce((a, b) => a + b, 0);
  const avgCovSum = ((sumFCov * input.colorsFront) + (sumBCov * input.colorsBack)) / (input.colorsFront + input.colorsBack || 1);
  // avgCovSum is like 1.0 if 4 colors are at 25% each.

  // Effective mileage based on coverage (mileage is usually quoted at 100% solid)
  // Therefore actual mileage at 25% coverage is 4x.
  const effectiveMileageForJob = mileage / Math.max(0.01, avgCovSum);

  const transferEfficiency = (ENGINE_CONSTANTS.ink as any).transferEfficiency_percent || 85;

  // kg Consumed
  const kgConsumed = (totalPrintAreaSqm / effectiveMileageForJob) / (transferEfficiency / 100);

  // Rates
  const { inkRates = [] } = useRateCardStore.getState() as any;
  const cmykRate = inkRates.find((r: any) => r.type === 'cmyk')?.costPerKg || 500; // INR

  const washupCost = (input.colorsFront + input.colorsBack) * input.imposition.numberOfForms * ((ENGINE_CONSTANTS.ink as any).washupSolventCostPerWash || 150);

  return {
    totalPrintArea_sqm: totalPrintAreaSqm,
    inkMileage_sqmPerKg: mileage,
    transferEfficiency_percent: transferEfficiency,
    totalInkConsumed_kg: kgConsumed,
    inkCost: kgConsumed * cmykRate,
    washupSolventCost: washupCost
  };
}

// ─── 4. ENERGY & DEPRECIATION ────────────────────────────────────────────────
function calculateFacility(
  machine: any,
  totalHours: number,
  activeUnits: number
): EnergyAndDepreciationResult {

  // Energy
  const driveMotorKw = machine.power_driveMotor_kW || (45 + (activeUnits * 5)); // Base + per unit
  const curingKw = machine.power_curing_kW || 0; // IR/UV

  const totalKw = driveMotorKw + curingKw;
  const kWh = totalKw * totalHours;
  // Support both current and legacy constant shapes.
  const electricityRate =
    (ENGINE_CONSTANTS as any)?.energy?.electricityCost_perKWh ??
    (ENGINE_CONSTANTS as any)?.factory?.electricityCost_perKwh ??
    (ENGINE_CONSTANTS as any)?.factory?.electricityCost_perKWh ??
    0.12;
  const energyCost = kWh * electricityRate;

  // Depreciation (Straight Line / Hours per year)
  // Assuming machine cost $X over 10 years, 4000 hours/yr
  const capitalCost = machine.capitalCost || 10000000; // 1 Cr default
  const workingHours_perYear = 4000; // 16 hrs/day * 250 days standard
  const lifeSpanHrs = (machine.lifespan_years || 10) * workingHours_perYear;

  const depPerHour = capitalCost / lifeSpanHrs;
  const totalDep = depPerHour * totalHours;

  return {
    driveMotor_kW: driveMotorKw,
    curingUnits_kW: curingKw,
    totalEnergy_kWh: kWh,
    electricityCost: energyCost,
    depreciationCost_perHour: depPerHour,
    totalDepreciationCost: totalDep
  };
}

// ─── MAIN ORCHESTRATION FUNCTION ─────────────────────────────────────────────
export function calculatePrintingCostGodLevel(input: PrintingCostInput): SectionPrintingCost_GodLevel {
  const { machines } = useMachineStore.getState();

  // Fallbacks if machine not found (Should ideally never happen in God-Level)
  const machine = Array.from(machines.values()).find(m => m.id === input.machineId) || {
    id: 'unknown',
    name: 'Generic Press',
    effectiveSpeed: 12000,
    totalHourlyCost: 2500,
    plateCost_each: 350
  };

  const forms = input.imposition.numberOfForms;
  const activeUnits = input.colorsFront + input.colorsBack;

  // 1. Determine Plates
  let platesPerForm: number;
  if (input.printingMethod === "WORK_AND_TURN" || input.printingMethod === "WORK_AND_TUMBLE") {
    platesPerForm = Math.max(input.colorsFront, input.colorsBack);
  } else if (input.printingMethod === "PERFECTING") {
    platesPerForm = input.colorsFront + input.colorsBack;
  } else {
    // Sheetwise: both sides printed separately
    platesPerForm = input.colorsFront + input.colorsBack;
  }
  const totalPlates = platesPerForm * forms;

  // 2. Makeready Time
  const makeready = calculateMakeready(machine, forms, activeUnits, platesPerForm);

  // 3. Kinematics (Running Time)
  const kinematics = calculateKinematics(
    machine,
    input.substrate,
    activeUnits,
    input.imposition,
    input.wastageResult.totalSheetsRequired_printing,
    input.printingMethod
  );

  const totalMachineHours = kinematics.runningTime_hours + makeready.totalMakereadyTime_hours;

  // 4. Ink Chemistry
  // Passes calculate total sheets through the unit.
  let passes = input.printingMethod === 'SHEETWISE' ? 2 : 1;
  const impForInk = input.wastageResult.totalSheetsRequired_printing * passes;
  const chemistry = calculateInkChemistry(input, impForInk, input.substrate);

  // 5. Facility (Energy & Depreciation)
  const facility = calculateFacility(machine, totalMachineHours, activeUnits);

  // 6. Direct Labor & Overhead (from machine hourly rate)
  // Usually hourly rate includes labor. If machine.totalHourlyCost is comprehensive, we use it.
  // But God-Level splits it. If totalHourlyCost is all-in, we just do:
  const hrRate = machine.totalHourlyCost || 2500;
  const timeRunningCost = kinematics.runningTime_hours * hrRate;
  const timeMakereadyCost = makeready.totalMakereadyTime_hours * hrRate;

  // Plates cost
  const platesCost = totalPlates * (machine.plateCost_each || 350);

  // Assemble Total
  const totalCost = timeRunningCost + timeMakereadyCost + platesCost + chemistry.inkCost + chemistry.washupSolventCost + facility.electricityCost + facility.totalDepreciationCost;

  const totalMachineImpressions = kinematics.runningTime_hours * kinematics.effectiveSpeed_sph;

  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    machineId: input.machineId,
    machineName: machine.name,

    impressionsPerForm: Math.ceil(totalMachineImpressions / forms),
    totalImpressions: Math.round(totalMachineImpressions),
    totalPlates,

    kinematics,
    makeready,
    chemistry,
    facility,

    timeRunningCost,
    timeMakereadyCost,
    platesCost,
    inkCost: chemistry.inkCost,
    solventCost: chemistry.washupSolventCost,
    energyCost: facility.electricityCost,
    depreciationCost: facility.totalDepreciationCost,

    totalCost,
    effectiveRatePer1000: totalMachineImpressions > 0 ? (totalCost / totalMachineImpressions) * 1000 : 0
  };
}
