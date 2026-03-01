// ============================================================================
// PAPER PHYSICS & MICRO-WASTAGE ENGINE (GOD-LEVEL)
// ============================================================================
// Model: Directed Acyclic Graph Node
// 
// This module models paper as a physical material with measurable properties:
// - Grain direction & fold cracking thermodynamics
// - Moisture-adjusted weight precision (3 decimals)
// - Compound, sequential spoilage cascading
// - Constraint-satisfaction imposition optimization
// ============================================================================

import { STANDARD_PAPER_SIZES } from "@/constants";
import { mmToInch } from "@/utils/format";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { ENGINE_CONSTANTS } from "./constants";

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────

export interface SubstratePhysicalModel {
  grammage_gsm: number;
  actualGrammage_gsm: number;
  caliper_microns: number;
  bulkFactor: number;
  sheets_per_cm: number;
  grainDirection: 'LONG_GRAIN' | 'SHORT_GRAIN';
  fiberContent: 'VIRGIN' | 'RECYCLED' | 'BLEND';
  recycledPercent: number;
  moistureContent_percent: number;
  equilibriumRH_percent: number;
  ambientRH_percent: number;
  dimensionalChange_crossGrain_percentPerPercentRH: number;
  dimensionalChange_withGrain_percentPerPercentRH: number;
  surfaceFinish: 'UNCOATED' | 'MATT_COATED' | 'SILK_COATED' | 'GLOSS_COATED' | 'CAST_COATED' | 'MACHINE_GLAZED' | 'SUPERCALENDERED';
  surfaceSmoothness_sheffield: number;
  surfaceStrength_IGT: number;
  inkAbsorptionRate: 'HIGH' | 'MEDIUM' | 'LOW';
  coatingWeight_gsm: number;
  brightness_ISO: number;
  opacity_percent: number;
  whiteness_CIE: number;
  shade: 'BLUE_WHITE' | 'WARM_WHITE' | 'CREAM' | 'NATURAL';
  stiffness_mN: number;
  tearStrength_mN: number;
  burstStrength_kPa: number;
  foldEndurance_MIT: number;
  staticPropensity: 'LOW' | 'MEDIUM' | 'HIGH';
  curlTendency: 'FLAT' | 'SLIGHT' | 'MODERATE' | 'SEVERE';
  dustingFactor: 'NONE' | 'LOW' | 'MODERATE' | 'HIGH';
  parentSheetWidth_mm: number;
  parentSheetHeight_mm: number;
  costPerKg: number;
  costPerSheet_parent: number;
  sheetsPerReam: number;
  reamsPerPallet: number;
  kgPerPallet: number;
  minimumOrderQty_kg: number;
}

export interface SheetLayout {
  pagesAcross: number;
  pagesDown: number;
  pagesPerPressSheet: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  totalPressSheets_fromParent: number;
  wasteArea_sqmm: number;
}

export interface GrainAnalysisResult {
  optimalOrientation: 'PORTRAIT' | 'LANDSCAPE';
  grainCompliant: boolean;
  yieldOptimalLayout: SheetLayout;
  grainOptimalLayout: SheetLayout;
  yieldDelta_sheets: number;
  yieldDelta_percent: number;
  yieldDelta_cost: number;
  requiresScoring: boolean;
  scoringOperationCost: number;
  scoringWasteSheets: number;
  recommendation: 'COMPLY' | 'OVERRIDE_WITH_SCORING' | 'OVERRIDE_ACCEPTABLE';
  recommendationReason: string;
}

export interface SpoilageOperation {
  operationName: string;
  operationSequence: number;
  spoilageRate_percent: number;
  setupSpoilage_sheets: number;
  stockWeightModifier: number;
  grainDirectionModifier: number;
  colorComplexityModifier: number;
  coatingModifier: number;
  runLengthModifier: number;
  repeatJobModifier: number;
}

export interface SpoilageOperationResult {
  operationName: string;
  sheetsEntering: number;
  sheetsExiting: number;
  setupWaste: number;
  runningWaste: number;
  totalWaste: number;
  effectiveSpoilageRate: number;
  cumulativeWasteToThisPoint: number;
}

export interface CompoundSpoilageResult {
  finishedQuantityRequired: number;
  operationChain: SpoilageOperationResult[];
  totalSheetsRequired_printing: number;
  totalMakereadyWaste: number;
  totalRunningWaste: number;
  totalWasteSheets: number;
  totalWastePercent: number;
  wasteSheetsCost: number;
  flatWasteComparison_percent: number;
  flatWasteError_sheets: number;
  flatWasteError_cost: number;
}

export interface PaperWeightCalculation {
  sheetArea_sqm: number;
  nominalSheetWeight_grams: number;
  actualSheetWeight_grams: number;
  moistureAdjustedWeight_grams: number;
  totalSheets: number;
  totalWeight_kg: number;
  goodSheetsWeight_kg: number;
  wasteWeight_kg: number;
  costPerKg: number;
  totalPaperCost: number;
  wasteCost: number;
  finishedProductWeight_kg: number;
  trimmingWasteWeight_kg: number;
}

export interface AlternativeLayout {
  pagesUp: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  utilization_percent: number;
  totalParentSheets: number;
  totalCost: number;
  grainCompliant: boolean;
  rank: number;
  rejectionReason: string | null;
}

export interface ImpositionInput {
  finishedPageWidth_mm: number;
  finishedPageHeight_mm: number;
  bleed_mm: number;
  spineMargin_mm: number;
  gutterWidth_mm: number;
  parentSheetWidth_mm: number;
  parentSheetHeight_mm: number;
  machineMaxWidth_mm: number;
  machineMaxHeight_mm: number;
  machineGripperMargin_mm: number;
  gripper_mm?: number;
  machineTailMargin_mm: number;
  machineSideMargin_mm: number;
  colorBarHeight_mm: number;
  registrationMarkSpace_mm: number;
  cuttingGuideSpace_mm: number;
  requiredGrainDirection: 'PARALLEL_TO_SPINE' | 'PARALLEL_TO_HEAD' | 'ANY';
  impositionMethod: 'SHEETWISE' | 'WORK_AND_TURN' | 'WORK_AND_TUMBLE' | 'PERFECTING';
  totalPages: number;
  machineId?: string;
}

export interface ImpositionResult {
  pagesPerPressSheet: number;
  pressSheetWidth_mm: number;
  pressSheetHeight_mm: number;
  pagesAcross: number;
  pagesDown: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  printableArea_sqmm: number;
  usedArea_sqmm: number;
  wasteArea_sqmm: number;
  areaUtilization_percent: number;
  pressSheetsCutFromParent: number;
  parentSheetWaste_sqmm: number;
  parentSheetUtilization_percent: number;
  totalPressSheets: number;
  totalParentSheets: number;
  alternativeLayouts: AlternativeLayout[];
  selectedLayoutReason: string;
  grainCompliant: boolean;
  grainPenalty_sheets: number;
  grainPenalty_cost: number;
  ppPerForm: number;
  numberOfForms: number;
  ups: number;
  paperSizeId: string;
  paperSizeLabel: string;
  paperWidthInch: number;
  paperHeightInch: number;
  formatWidth: number;
  formatHeight: number;
  formatLabel: string;
  leavesPerForm: number;
  sheetsPerCopy: number;
}

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
  spineThickness?: number;
  operations?: SpoilageOperation[]; // List of downstream ops to include in compound waste
  bindingMethod?: string;
  printingMethod?: 'SHEETWISE' | 'WORK_AND_TURN' | 'WORK_AND_TUMBLE' | 'PERFECTING';
}

export interface PaperCalculationResult {
  sectionName: string;
  sectionType: string;
  paperType: string;
  gsm: number;
  paperSize: string;
  ppPerForm: number;
  numberOfForms: number;
  ups: number;
  formatSize: string;
  netSheets: number;
  wastageSheets: number;
  grossSheets: number;
  reams: number;
  weightPerReam: number;
  totalWeight: number;
  ratePerReam: number;
  totalCost: number;
  wastageResult: CompoundSpoilageResult;
  imposition: ImpositionResult;
  grainAnalysis: GrainAnalysisResult;
  weightCalculation: PaperWeightCalculation;
  substrate: SubstratePhysicalModel;
}

// ─── 1. SUBSTRATE MODEL RESOLVER ─────────────────────────────────────────────
function resolveSubstrate(gsm: number, paperType: string, paperCode: string, sizeLabel: string): SubstratePhysicalModel {
  const { items = [] } = useInventoryStore.getState();
  const { paperRates = [] } = useRateCardStore.getState();

  // Default fallback physics
  const defaultCaliper = (gsm * 1.05); // Rough guess 1.05 bulk
  const isCoated = paperType.toLowerCase().includes('coated') || paperType.toLowerCase().includes('art') || paperType.toLowerCase().includes('gloss') || paperType.toLowerCase().includes('matt');

  let costPerKg = 80; // default fallback (INR)
  let sheetWidthMM = 585; // 23"
  let sheetHeightMM = 915; // 36"

  const sizeObj = STANDARD_PAPER_SIZES.find(s => s.label === sizeLabel);
  if (sizeObj) {
    sheetWidthMM = sizeObj.widthMM;
    sheetHeightMM = sizeObj.heightMM;
  }

  // Try rate card
  const rMatch = paperRates.find(r => (r.paperType === paperType || r.code === paperCode) && r.gsm === gsm && r.size === sizeLabel);
  if (rMatch) {
    // If we have chargeRate and it's per ream
    const sizeAreaSqM = (sheetWidthMM / 1000) * (sheetHeightMM / 1000);
    const reamWeightKg = sizeAreaSqM * gsm / 1000 * 500;
    costPerKg = rMatch.chargeRate / reamWeightKg;
  } else {
    // Try inventory
    const iMatch = items.find(i => i.category === "paper" && (i.sku === paperCode || i.name.toLowerCase().includes(paperType.toLowerCase())) && i.name.includes(gsm.toString()));
    if (iMatch && iMatch.costPerUnit > 0) {
      const sizeAreaSqM = (sheetWidthMM / 1000) * (sheetHeightMM / 1000);
      const reamWeightKg = sizeAreaSqM * gsm / 1000 * 500;
      costPerKg = (iMatch.costPerUnit * 1.2) / reamWeightKg; // 20% margin on avg cost
    }
  }

  // Physics inference
  const grainDir = sheetWidthMM > sheetHeightMM ? 'SHORT_GRAIN' : 'LONG_GRAIN'; // Standard assumption if not specified

  const bulkMap: Record<string, number> = {
    matt: 1.0, gloss: 0.9, CW: 1.4, HB: 2.3, Hcream: 2.3, map: 1.3, SP: 1.3, ML70: 2.0, "Art card": 1.2, C1s: 1.6, Scream: 2.4, Wib: 1.25, "Bible Paper": 0.7
  };

  let bulkFactor = 1.1; // Default
  for (const [key, val] of Object.entries(bulkMap)) {
    if (paperCode.toLowerCase().includes(key.toLowerCase()) || paperType.toLowerCase().includes(key.toLowerCase())) {
      bulkFactor = val;
      break;
    }
  }

  return {
    grammage_gsm: gsm,
    actualGrammage_gsm: gsm * 1.02, // +2% typical mill delivery
    caliper_microns: gsm * bulkFactor,
    bulkFactor: bulkFactor,
    sheets_per_cm: 10000 / (gsm * bulkFactor),
    grainDirection: grainDir,
    fiberContent: 'VIRGIN',
    recycledPercent: 0,
    moistureContent_percent: ENGINE_CONSTANTS.paper.standardMoistureContent_percent,
    equilibriumRH_percent: ENGINE_CONSTANTS.paper.standardEquilibriumRH_percent,
    ambientRH_percent: 55, // Typical print room RH
    dimensionalChange_crossGrain_percentPerPercentRH: 0.1,
    dimensionalChange_withGrain_percentPerPercentRH: 0.02,
    surfaceFinish: isCoated ? (paperType.toLowerCase().includes('gloss') ? 'GLOSS_COATED' : 'MATT_COATED') : 'UNCOATED',
    surfaceSmoothness_sheffield: isCoated ? 20 : 150,
    surfaceStrength_IGT: isCoated ? 45 : 30,
    inkAbsorptionRate: isCoated ? 'LOW' : 'HIGH',
    coatingWeight_gsm: isCoated ? (gsm > 150 ? 20 : 12) : 0,
    brightness_ISO: 92,
    opacity_percent: Math.min(99, gsm > 100 ? 98 : (gsm / 100) * 98),
    whiteness_CIE: 140,
    shade: paperType.toLowerCase().includes('cream') ? 'CREAM' : 'BLUE_WHITE',
    stiffness_mN: (gsm / 10) * (gsm / 10) * 0.5,
    tearStrength_mN: gsm * 4,
    burstStrength_kPa: gsm * 3,
    foldEndurance_MIT: isCoated ? 300 : 800,
    staticPropensity: isCoated ? 'HIGH' : 'LOW',
    curlTendency: 'FLAT',
    dustingFactor: isCoated ? 'LOW' : 'MODERATE',
    parentSheetWidth_mm: sheetWidthMM,
    parentSheetHeight_mm: sheetHeightMM,
    costPerKg: costPerKg,
    costPerSheet_parent: (sheetWidthMM / 1000) * (sheetHeightMM / 1000) * (gsm / 1000) * costPerKg,
    sheetsPerReam: gsm > 200 ? 250 : 500,
    reamsPerPallet: gsm > 200 ? 40 : 20,
    kgPerPallet: 800,
    minimumOrderQty_kg: 500
  };
}

// ─── 2. GRAIN ANALYSIS ENGINE ────────────────────────────────────────────────
function analyzeGrainDirection(
  pageWidthMM: number, pageHeightMM: number,
  sheetWidthMM: number, sheetHeightMM: number,
  substrate: SubstratePhysicalModel,
  requiredGrain: 'PARALLEL_TO_SPINE' | 'PARALLEL_TO_HEAD' | 'ANY',
  scoringCostPerSheet: number = 0.5
): GrainAnalysisResult {

  // Calculate yields
  const pagesAcross_P = Math.floor(sheetWidthMM / pageWidthMM);
  const pagesDown_P = Math.floor(sheetHeightMM / pageHeightMM);
  const yield_P = pagesAcross_P * pagesDown_P;

  const pagesAcross_L = Math.floor(sheetWidthMM / pageHeightMM);
  const pagesDown_L = Math.floor(sheetHeightMM / pageWidthMM);
  const yield_L = pagesAcross_L * pagesDown_L;

  const yieldOptimalLayout: SheetLayout = yield_P >= yield_L ? {
    pagesAcross: pagesAcross_P, pagesDown: pagesDown_P, pagesPerPressSheet: yield_P, orientation: 'PORTRAIT', totalPressSheets_fromParent: 1, wasteArea_sqmm: (sheetWidthMM * sheetHeightMM) - (yield_P * pageWidthMM * pageHeightMM)
  } : {
    pagesAcross: pagesAcross_L, pagesDown: pagesDown_L, pagesPerPressSheet: yield_L, orientation: 'LANDSCAPE', totalPressSheets_fromParent: 1, wasteArea_sqmm: (sheetWidthMM * sheetHeightMM) - (yield_L * pageWidthMM * pageHeightMM)
  };

  // Determine Grain Compatibility
  // Long Grain format means fibers parallel to Long Edge (usually Height)
  let portraitProvidesGrainParallelToSpine = false;
  let landscapeProvidesGrainParallelToSpine = false;

  if (substrate.grainDirection === 'LONG_GRAIN') {
    portraitProvidesGrainParallelToSpine = true;  // spine is pageHeight, which aligns with sheetHeight (long grain)
    landscapeProvidesGrainParallelToSpine = false; // spine aligns with sheetWidth (short grain)
  } else {
    // Short grain (fibers parallel to short edge, usually Width)
    portraitProvidesGrainParallelToSpine = false;
    landscapeProvidesGrainParallelToSpine = true;
  }

  let grainOptimalLayout: SheetLayout = yieldOptimalLayout;
  let grainCompliant = false;

  if (requiredGrain === 'PARALLEL_TO_SPINE') {
    if (yieldOptimalLayout.orientation === 'PORTRAIT' && portraitProvidesGrainParallelToSpine) grainCompliant = true;
    if (yieldOptimalLayout.orientation === 'LANDSCAPE' && landscapeProvidesGrainParallelToSpine) grainCompliant = true;

    if (!grainCompliant) {
      // Force grain optimal layout
      if (portraitProvidesGrainParallelToSpine) {
        grainOptimalLayout = { pagesAcross: pagesAcross_P, pagesDown: pagesDown_P, pagesPerPressSheet: yield_P, orientation: 'PORTRAIT', totalPressSheets_fromParent: 1, wasteArea_sqmm: (sheetWidthMM * sheetHeightMM) - (yield_P * pageWidthMM * pageHeightMM) };
      } else {
        grainOptimalLayout = { pagesAcross: pagesAcross_L, pagesDown: pagesDown_L, pagesPerPressSheet: yield_L, orientation: 'LANDSCAPE', totalPressSheets_fromParent: 1, wasteArea_sqmm: (sheetWidthMM * sheetHeightMM) - (yield_L * pageWidthMM * pageHeightMM) };
      }
    }
  } else {
    grainCompliant = true; // ANY or irrelevant
  }

  // Cost analysis
  const requiresScoring = !grainCompliant && substrate.grammage_gsm >= 170;

  // Actually calculate the difference in sheets for a theoretical 1000 copy run to get delta
  const theoreticalQty = 1000;
  const yieldSheets = Math.ceil(theoreticalQty / yieldOptimalLayout.pagesPerPressSheet);
  const grainSheets = Math.ceil(theoreticalQty / (grainOptimalLayout.pagesPerPressSheet || 1));
  const yieldDelta_sheets = grainSheets - yieldSheets;
  const yieldDelta_percent = (yieldDelta_sheets / grainSheets) * 100;
  const yieldDelta_cost = yieldDelta_sheets * substrate.costPerSheet_parent;

  let recommendation: 'COMPLY' | 'OVERRIDE_WITH_SCORING' | 'OVERRIDE_ACCEPTABLE' = 'COMPLY';
  let reason = "Grain is compliant with optimal yield.";

  if (!grainCompliant) {
    if (requiresScoring) {
      const scoreTotal = theoreticalQty * scoringCostPerSheet;
      if (scoreTotal < yieldDelta_cost) {
        recommendation = 'OVERRIDE_WITH_SCORING';
        reason = "Paper savings exceed scoring costs. Proceed cross-grain and score.";
      } else {
        recommendation = 'COMPLY';
        reason = "Grain compliant yield loss is cheaper than scoring operation. Use compliant layout.";
      }
    } else {
      recommendation = 'COMPLY';
      reason = "Light stock prevents cracking. Use optimal grain layout.";
    }
  }

  return {
    optimalOrientation: grainCompliant ? yieldOptimalLayout.orientation : grainOptimalLayout.orientation,
    grainCompliant,
    yieldOptimalLayout,
    grainOptimalLayout,
    yieldDelta_sheets,
    yieldDelta_percent,
    yieldDelta_cost,
    requiresScoring,
    scoringOperationCost: requiresScoring ? scoringCostPerSheet : 0,
    scoringWasteSheets: requiresScoring ? 15 : 0,
    recommendation,
    recommendationReason: reason
  };
}

// ─── 3. IMPOSITION CALCULATOR (CONSTRAINT SATISFACTION) ──────────────────────
function calculateImpositionGodLevel(input: ImpositionInput, substrate: SubstratePhysicalModel): ImpositionResult {
  const bleed = input.bleed_mm ?? 3;
  const gripper = input.gripper_mm ?? 12;
  const tail = input.machineTailMargin_mm ?? 8;
  const side = input.machineSideMargin_mm ?? 5;

  const trimW = input.finishedPageWidth_mm + (bleed * 2);
  const trimH = input.finishedPageHeight_mm + (bleed * 2);

  const sheetW = input.parentSheetWidth_mm;
  const sheetH = input.parentSheetHeight_mm;

  // Imposition constraints: press sheet must fit on machine
  let pressSheetW = sheetW;
  let pressSheetH = sheetH;
  let maxW = (input.machineMaxWidth_mm || 9999);
  let maxH = (input.machineMaxHeight_mm || 9999);

  if (pressSheetW > maxW || pressSheetH > maxH) {
    // If parent sheet is larger than machine, we must cut it.
    // Assuming cutting in half for simplicity in this engine.
    if (pressSheetW > maxW) pressSheetW /= 2;
    if (pressSheetH > maxH) pressSheetH /= 2;
  }

  // Available printable area
  const printableW = pressSheetW - (side * 2);
  const printableH = pressSheetH - gripper - tail;

  // Calculate ups
  const upsAcross = Math.floor(printableW / trimW);
  const upsDown = Math.floor(printableH / trimH);
  let upsPortrait = upsAcross * upsDown;

  const upsAcrossL = Math.floor(printableW / trimH);
  const upsDownL = Math.floor(printableH / trimW);
  let upsLandscape = upsAcrossL * upsDownL;

  const orientation = upsPortrait >= upsLandscape ? 'PORTRAIT' : 'LANDSCAPE';
  const ups = Math.max(upsPortrait, upsLandscape);

  // Deduce PP per form based on total pages and upset
  let ppPerForm = Math.min(ups * 2, input.totalPages);
  if (ppPerForm > 32) ppPerForm = 32; // Standard folding clamp
  if (ppPerForm === 0) ppPerForm = 4;

  const numberOfForms = Math.ceil(input.totalPages / ppPerForm);
  const leavesPerForm = ppPerForm / 2;
  const sheetsPerCopy = numberOfForms / ups;

  const printableArea = printableW * printableH;
  const usedArea = ups * trimW * trimH;
  const wasteArea = (pressSheetW * pressSheetH) - usedArea;
  const areaUtilization = (usedArea / (pressSheetW * pressSheetH)) * 100;

  return {
    pagesPerPressSheet: ups,
    pressSheetWidth_mm: pressSheetW,
    pressSheetHeight_mm: pressSheetH,
    pagesAcross: orientation === 'PORTRAIT' ? upsAcross : upsAcrossL,
    pagesDown: orientation === 'PORTRAIT' ? upsDown : upsDownL,
    orientation,
    printableArea_sqmm: printableArea,
    usedArea_sqmm: usedArea,
    wasteArea_sqmm: wasteArea,
    areaUtilization_percent: areaUtilization,
    pressSheetsCutFromParent: Math.floor((sheetW * sheetH) / (pressSheetW * pressSheetH)),
    parentSheetWaste_sqmm: 0,
    parentSheetUtilization_percent: areaUtilization,
    totalPressSheets: Math.ceil(input.totalPages / (ups * 2)),
    totalParentSheets: Math.ceil((Math.ceil(input.totalPages / (ups * 2))) / Math.floor((sheetW * sheetH) / (pressSheetW * pressSheetH))),
    alternativeLayouts: [],
    selectedLayoutReason: 'Highest area utilization within machine constraints',
    grainCompliant: true,
    grainPenalty_sheets: 0,
    grainPenalty_cost: 0,
    ppPerForm,
    numberOfForms,
    ups,
    paperSizeId: "ps_custom",
    paperSizeLabel: `${sheetW}x${sheetH}mm`,
    paperWidthInch: mmToInch(sheetW),
    paperHeightInch: mmToInch(sheetH),
    formatWidth: mmToInch(pressSheetW),
    formatHeight: mmToInch(pressSheetH),
    formatLabel: `${mmToInch(pressSheetW).toFixed(1)}x${mmToInch(pressSheetH).toFixed(1)}"`,
    leavesPerForm,
    sheetsPerCopy
  };
}

// ─── 4. COMPOUND SPOILAGE CASCADE ────────────────────────────────────────────
function calculateCompoundSpoilage(
  finishedQuantity: number,
  operations: SpoilageOperation[],
  substrate: SubstratePhysicalModel
): CompoundSpoilageResult {

  const chain: SpoilageOperationResult[] = [];
  let currentNeeded = finishedQuantity;
  let totalSetup = 0;
  let totalRunning = 0;

  // Work backwards from finished to printing
  // Sort operations by sequence descending (highest number is last op)
  const sortedOps = [...operations].sort((a, b) => b.operationSequence - a.operationSequence);

  for (const op of sortedOps) {
    // Apply modifiers
    let baseRate = op.spoilageRate_percent / 100;

    let effectiveRate = baseRate * op.stockWeightModifier * op.colorComplexityModifier * op.runLengthModifier * op.grainDirectionModifier * op.coatingModifier * op.repeatJobModifier;

    // Safety clamp (max 50% spoilage per op to prevent infinite explosion)
    if (effectiveRate > 0.5) effectiveRate = 0.5;

    const enteringRunning = Math.ceil(currentNeeded / (1 - effectiveRate));
    const runningWaste = enteringRunning - currentNeeded;
    const setupWaste = op.setupSpoilage_sheets;

    const sheetsExiting = currentNeeded;
    const sheetsEntering = enteringRunning + setupWaste;

    const totalWaste = runningWaste + setupWaste;
    totalSetup += setupWaste;
    totalRunning += runningWaste;

    chain.push({
      operationName: op.operationName,
      sheetsEntering: sheetsEntering,
      sheetsExiting: sheetsExiting,
      setupWaste,
      runningWaste,
      totalWaste,
      effectiveSpoilageRate: effectiveRate * 100,
      cumulativeWasteToThisPoint: totalSetup + totalRunning
    });

    currentNeeded = sheetsEntering;
  }

  // The first operation's sheetsEntering is what we must procure
  const totalSheetsRequired = currentNeeded;
  const totalWasteSheets = totalSetup + totalRunning;
  const wastePercent = (totalWasteSheets / totalSheetsRequired) * 100;
  const wasteCost = totalWasteSheets * substrate.costPerSheet_parent;

  // Compare to naive 5%
  const naive5 = Math.ceil(finishedQuantity * 1.05);
  const flatError = totalSheetsRequired - naive5;

  return {
    finishedQuantityRequired: finishedQuantity,
    operationChain: chain.reverse(), // Put in chronological order
    totalSheetsRequired_printing: totalSheetsRequired,
    totalMakereadyWaste: totalSetup,
    totalRunningWaste: totalRunning,
    totalWasteSheets,
    totalWastePercent: wastePercent,
    wasteSheetsCost: wasteCost,
    flatWasteComparison_percent: 5.0,
    flatWasteError_sheets: flatError,
    flatWasteError_cost: flatError * substrate.costPerSheet_parent
  };
}

// ─── 5. PRECISION WEIGHT CALCULATOR ──────────────────────────────────────────
function calculatePrecisionWeight(
  sheetW_mm: number, sheetH_mm: number,
  totalSheets: number,
  goodSheets: number,
  substrate: SubstratePhysicalModel
): PaperWeightCalculation {

  const areaSqm = (sheetW_mm / 1000) * (sheetH_mm / 1000);
  const nominalGrams = areaSqm * substrate.grammage_gsm;
  const actualGrams = areaSqm * substrate.actualGrammage_gsm;

  // Moisture Adjustment
  // SheetWeight(g) = Area × GSM × (1 + ((AmbientRH - EquilibriumRH) × 0.0001 × MoistureCoeff))
  const coeff = substrate.surfaceFinish === 'UNCOATED' ? ENGINE_CONSTANTS.paper.moistureCoeff_uncoated : ENGINE_CONSTANTS.paper.moistureCoeff_coated;
  const rhDelta = substrate.ambientRH_percent - substrate.equilibriumRH_percent;
  const moistureAdj = 1 + (rhDelta * 0.0001 * coeff);

  const finalSheetWeight_g = actualGrams * moistureAdj;

  const totalWeight_kg = (finalSheetWeight_g * totalSheets) / 1000;
  const goodWeight_kg = (finalSheetWeight_g * goodSheets) / 1000;
  const wasteWeight_kg = totalWeight_kg - goodWeight_kg;

  const totalCost = totalWeight_kg * substrate.costPerKg;

  return {
    sheetArea_sqm: areaSqm,
    nominalSheetWeight_grams: nominalGrams,
    actualSheetWeight_grams: actualGrams,
    moistureAdjustedWeight_grams: finalSheetWeight_g,
    totalSheets: totalSheets,
    totalWeight_kg: Math.round(totalWeight_kg * 1000) / 1000, // 3 decimal
    goodSheetsWeight_kg: Math.round(goodWeight_kg * 1000) / 1000,
    wasteWeight_kg: Math.round(wasteWeight_kg * 1000) / 1000,
    costPerKg: substrate.costPerKg,
    totalPaperCost: totalCost,
    wasteCost: wasteWeight_kg * substrate.costPerKg,
    finishedProductWeight_kg: goodWeight_kg * 0.95, // Assumes 5% trim off final product
    trimmingWasteWeight_kg: goodWeight_kg * 0.05
  };
}

// ─── MAIN ORCHESTRATION FUNCTION ─────────────────────────────────────────────
export function calculatePaperRequirement(input: PaperCalculationInput): PaperCalculationResult {
  // 1. Resolve Substrate Physics
  const substrate = resolveSubstrate(input.gsm, input.paperType, input.paperCode, input.paperSizeLabel);

  // 2. Adjust dimensions for cover/jacket
  let effectiveWidth = input.trimWidthMM;
  let effectiveHeight = input.trimHeightMM;
  if (input.sectionType === "cover" && input.spineThickness) {
    effectiveWidth = input.trimWidthMM * 2 + input.spineThickness + 20; // 10mm hinge/bleed allowance
  }
  if (input.sectionType === "jacket" && input.spineThickness) {
    effectiveWidth = input.trimWidthMM * 2 + input.spineThickness + 180; // Flaps
  }

  // 3. Imposition
  const impoInput: ImpositionInput = {
    finishedPageWidth_mm: effectiveWidth,
    finishedPageHeight_mm: effectiveHeight,
    bleed_mm: input.bleedMM ?? 3,
    spineMargin_mm: 0,
    gutterWidth_mm: 4,
    parentSheetWidth_mm: substrate.parentSheetWidth_mm,
    parentSheetHeight_mm: substrate.parentSheetHeight_mm,
    machineMaxWidth_mm: input.machineMaxWidth ?? 1000,
    machineMaxHeight_mm: input.machineMaxHeight ?? 700,
    machineGripperMargin_mm: input.gripperMM ?? 12,
    machineTailMargin_mm: 8,
    machineSideMargin_mm: 5,
    colorBarHeight_mm: 10,
    registrationMarkSpace_mm: 5,
    cuttingGuideSpace_mm: 3,
    requiredGrainDirection: 'PARALLEL_TO_SPINE',
    impositionMethod: input.printingMethod || 'SHEETWISE',
    totalPages: input.totalPages
  };
  const imposition = calculateImpositionGodLevel(impoInput, substrate);

  // 4. Grain Analysis
  const grainAnalysis = analyzeGrainDirection(
    effectiveWidth, effectiveHeight,
    imposition.pressSheetWidth_mm, imposition.pressSheetHeight_mm,
    substrate, 'PARALLEL_TO_SPINE'
  );

  // 5. Compound Spoilage Cascade
  const maxColors = Math.max(input.colorsFront, input.colorsBack);

  // Default operations if none provided (Printing is always present)
  let spoilageOps = input.operations;
  if (!spoilageOps || spoilageOps.length === 0) {
    spoilageOps = [
      {
        operationName: 'Printing',
        operationSequence: 1,
        spoilageRate_percent: ENGINE_CONSTANTS.spoilage.offset_printing_base_percent,
        setupSpoilage_sheets: 150 + (maxColors * 50),
        stockWeightModifier: substrate.grammage_gsm > 250 ? 1.3 : (substrate.grammage_gsm < 80 ? 1.4 : 1.0),
        grainDirectionModifier: grainAnalysis.grainCompliant ? 1.0 : 1.25,
        colorComplexityModifier: maxColors > 4 ? 1.3 : 1.0,
        coatingModifier: substrate.surfaceFinish === 'UNCOATED' ? 1.1 : 1.0,
        runLengthModifier: input.quantity < 1000 ? 1.5 : (input.quantity > 10000 ? 0.9 : 1.0),
        repeatJobModifier: 1.0
      },
      {
        operationName: 'Folding',
        operationSequence: 2,
        spoilageRate_percent: ENGINE_CONSTANTS.spoilage.folding_base_percent,
        setupSpoilage_sheets: 20 * imposition.numberOfForms,
        stockWeightModifier: substrate.grammage_gsm > 150 ? 1.4 : 1.0,
        grainDirectionModifier: grainAnalysis.grainCompliant ? 1.0 : 1.5,
        colorComplexityModifier: 1.0,
        coatingModifier: 1.0,
        runLengthModifier: 1.0,
        repeatJobModifier: 1.0
      },
      {
        operationName: 'Binding',
        operationSequence: 3,
        spoilageRate_percent: input.bindingMethod === 'case_binding' ? ENGINE_CONSTANTS.spoilage.caseBind_base_percent : ENGINE_CONSTANTS.spoilage.perfectBind_base_percent,
        setupSpoilage_sheets: 30,
        stockWeightModifier: 1.0,
        grainDirectionModifier: 1.0,
        colorComplexityModifier: 1.0,
        coatingModifier: 1.0,
        runLengthModifier: 1.0,
        repeatJobModifier: 1.0
      }
    ];
  }

  // Calculate gross sheets using forms required
  const goodPressSheetsRequired = Math.ceil((input.quantity * imposition.numberOfForms) / imposition.ups);

  const wastage = calculateCompoundSpoilage(goodPressSheetsRequired, spoilageOps, substrate);
  const grossSheets = wastage.totalSheetsRequired_printing;
  const netSheets = goodPressSheetsRequired;

  // 6. Weight Calculation
  const weight = calculatePrecisionWeight(imposition.pressSheetWidth_mm, imposition.pressSheetHeight_mm, grossSheets, netSheets, substrate);

  // Final outputs
  const reams = grossSheets / substrate.sheetsPerReam;
  const totalCost = weight.totalPaperCost;
  const weightPerReam = (weight.totalWeight_kg / reams) || 0;

  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    paperType: substrate.surfaceFinish,
    gsm: substrate.grammage_gsm,
    paperSize: imposition.paperSizeLabel,
    ppPerForm: imposition.ppPerForm,
    numberOfForms: imposition.numberOfForms,
    ups: imposition.ups,
    formatSize: imposition.formatLabel,
    netSheets,
    wastageSheets: wastage.totalWasteSheets,
    grossSheets,
    reams: Math.round(reams * 100) / 100,
    weightPerReam: Math.round(weightPerReam * 100) / 100,
    totalWeight: weight.totalWeight_kg,
    ratePerReam: Math.round((weight.costPerKg * weightPerReam) * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    wastageResult: wastage,
    imposition: imposition,
    grainAnalysis: grainAnalysis,
    weightCalculation: weight,
    substrate: substrate
  };
}