// ============================================================================
// PAPER PHYSICS & AUTO-PLANNING ENGINE — THOMSON PRESS CALIBRATED (REWRITE)
// ============================================================================
// This module:
//   1. Resolves paper substrate (type, GSM, cost, bulk factor)
//   2. AUTO-PLANS: Evaluates ALL standard paper sizes to find optimal fit
//      with correct grain direction and minimal wastage
//   3. Calculates imposition (pages per form, ups, format)
//   4. Computes wastage using Thomson Press EXACT additive wastage method:
//      total_waste = M/R_waste_sheets + running_waste_sheets (ADDITIVE)
//   5. Precision weight & cost calculation
//
// CALIBRATION TARGET:
//   Text 1: 32pp 150GSM Matt at Rs 14.454/copy
//   Endleaves: 140GSM White Uncoated
//   Cover: 150GSM Matt
//   TOTAL PAPER: Rs 21.53/copy (Rs 43,051 for 2000 copies)
//
// CRITICAL WASTAGE RULE:
//   WRONG: qty × (1 + waste1%) × (1 + waste2%) = MULTIPLICATIVE (INFLATED)
//   RIGHT: qty + waste1_sheets + waste2_sheets = ADDITIVE (CORRECT)
// ============================================================================

import { STANDARD_PAPER_SIZES, BULK_FACTORS } from "@/constants";
import { mmToInch } from "@/utils/format";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import type { ProcurementRecommendation } from "@/types";
import { lookupTPWastagePercent, lookupTPMachineReadyWastage, TP_BIBLE_PAPER_SURCHARGES } from "./constants";

// â”€â”€â”€ TYPES & INTERFACES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  sourceSelection?: {
    source: 'rate_card' | 'inventory' | 'fallback';
    reference?: string;
    inStock: boolean;
    confidence: number;
  };
  candidateMatches?: Array<{
    source: 'rate_card' | 'inventory';
    reference: string;
    paperType: string;
    gsm: number;
    size: string;
    costPerKg: number;
    inStock: boolean;
  }>;
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
  operations?: SpoilageOperation[];
  bindingMethod?: string;
  printingMethod?: 'SHEETWISE' | 'WORK_AND_TURN' | 'WORK_AND_TUMBLE' | 'PERFECTING';
  machineCode?: string; // Machine code for M/R wastage lookup
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
  sourceSelection?: {
    source: 'rate_card' | 'inventory' | 'fallback';
    reference?: string;
    confidence: number;
    inStock: boolean;
  };
  procurementRecommendation?: ProcurementRecommendation;
  autoPlanning?: {
    bestPaperSize: string;
    allEvaluated: { paperSize: string; ups: number; wastagePercent: number; grainOk: boolean; totalCost: number; selected: boolean }[];
  };
}

// â”€â”€â”€ 1. SUBSTRATE MODEL RESOLVER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function resolveSubstrate(gsm: number, paperType: string, paperCode: string, sizeLabel: string): SubstratePhysicalModel {
  const { items = [] } = useInventoryStore.getState();
  const { paperRates = [] } = useRateCardStore.getState();

  const isCoated = paperType.toLowerCase().includes('coated') || paperType.toLowerCase().includes('art') || paperType.toLowerCase().includes('gloss') || paperType.toLowerCase().includes('matt');
  const wantsAutoSize = !sizeLabel || sizeLabel === 'auto' || sizeLabel === '';

  // Default costPerKg based on Thomson Press rates
  let costPerKg = 80; // Default: Matt Art Paper
  if (paperType.toLowerCase().includes('uncoated') || paperCode.toLowerCase() === 'map') {
    costPerKg = 82;
  } else if (paperType.toLowerCase().includes('gloss')) {
    costPerKg = 82;
  } else if (paperCode.toLowerCase() === 'cw') {
    costPerKg = 76.5;
  } else if (paperCode.toLowerCase() === 'hb') {
    costPerKg = 73;
  } else if (paperCode.toLowerCase() === 'sp') {
    costPerKg = 91;
  }

  let sheetWidthMM = 585; // 23"
  let sheetHeightMM = 915; // 36"

  const normalizeSizeLabel = (raw: string): string => raw.replace("x", "×");
  const toSize = (label: string) => STANDARD_PAPER_SIZES.find((s) => s.label === label || s.label.replace("×", "x") === label);
  const sizeObj = toSize(sizeLabel);
  if (sizeObj) {
    sheetWidthMM = sizeObj.widthMM;
    sheetHeightMM = sizeObj.heightMM;
  }

  type Candidate = {
    source: 'rate_card' | 'inventory';
    reference: string;
    paperType: string;
    gsm: number;
    sizeLabel: string;
    widthMM: number;
    heightMM: number;
    costPerKg: number;
    inStock: boolean;
  };

  const computeCostPerKg = (reamRate: number, width: number, height: number) => {
    const sizeAreaSqM = (width / 1000) * (height / 1000);
    const reamWeightKg = sizeAreaSqM * gsm / 1000 * (gsm > 200 ? 250 : 500);
    return reamRate > 0 && reamWeightKg > 0 ? reamRate / reamWeightKg : 0;
  };

  const rateCandidates: Candidate[] = paperRates
    .filter((r) => {
      if (r.status !== 'active') return false;
      if (!(r.paperType === paperType || r.code === paperCode)) return false;
      if (r.gsm !== gsm) return false;
      if (wantsAutoSize) return true;
      return normalizeSizeLabel(r.size) === normalizeSizeLabel(sizeLabel);
    })
    .map((r) => {
      const size = toSize(r.size) || sizeObj || STANDARD_PAPER_SIZES[0];
      return {
        source: 'rate_card' as const,
        reference: r.itemCode || r.code || r.id,
        paperType: r.paperType,
        gsm: r.gsm,
        sizeLabel: size.label,
        widthMM: size.widthMM,
        heightMM: size.heightMM,
        costPerKg: computeCostPerKg(r.chargeRate, size.widthMM, size.heightMM),
        inStock: true,
      };
    })
    .filter((candidate) => candidate.costPerKg > 0);

  const inventoryCandidates: Candidate[] = items
    .filter((item) => item.category === 'paper' && item.status === 'active')
    .filter((item) => {
      const lower = item.name.toLowerCase();
      const paperTypeMatch = lower.includes(paperType.toLowerCase()) || item.sku === paperCode || item.itemCode === paperCode;
      const gsmMatch = lower.includes(gsm.toString());
      return paperTypeMatch && gsmMatch;
    })
    .map((item) => {
      const size = sizeObj || STANDARD_PAPER_SIZES[0];
      const usableRate = item.sellingPrice > 0 ? item.sellingPrice : item.costPerUnit;
      return {
        source: 'inventory' as const,
        reference: item.itemCode || item.sku || item.id,
        paperType: item.name || paperType,
        gsm,
        sizeLabel: size.label,
        widthMM: size.widthMM,
        heightMM: size.heightMM,
        costPerKg: computeCostPerKg(usableRate, size.widthMM, size.heightMM),
        inStock: (item.stock || 0) > 0,
      };
    })
    .filter((candidate) => candidate.costPerKg > 0);

  const candidates = [...rateCandidates, ...inventoryCandidates];
  let sourceSelection: SubstratePhysicalModel['sourceSelection'] = {
    source: 'fallback',
    inStock: false,
    confidence: 0.2,
  };

  if (candidates.length > 0) {
    const sortedByCost = [...candidates].sort((a, b) => a.costPerKg - b.costPerKg);
    const cheapest = sortedByCost[0];
    const inventoryPreferred = sortedByCost.find((candidate) =>
      candidate.inStock && candidate.costPerKg <= cheapest.costPerKg * 1.07
    );
    const selected = inventoryPreferred || cheapest;

    costPerKg = selected.costPerKg;
    sheetWidthMM = selected.widthMM;
    sheetHeightMM = selected.heightMM;
    sourceSelection = {
      source: selected.source,
      reference: selected.reference,
      inStock: selected.inStock,
      confidence: selected.source === 'inventory' ? 0.9 : 0.86,
    };
  }

  // Grain direction: Standard convention â€” long dimension is grain direction
  const grainDir = sheetHeightMM > sheetWidthMM ? 'LONG_GRAIN' : 'SHORT_GRAIN';

  // Bulk factor from Thomson Press table
  let bulkFactor = 1.1; // Default
  for (const [key, val] of Object.entries(BULK_FACTORS)) {
    if (paperCode.toLowerCase() === key.toLowerCase() || paperType.toLowerCase() === key.toLowerCase()) {
      bulkFactor = val;
      break;
    }
  }
  // Partial match fallback
  if (bulkFactor === 1.1) {
    for (const [key, val] of Object.entries(BULK_FACTORS)) {
      if (paperCode.toLowerCase().includes(key.toLowerCase()) || paperType.toLowerCase().includes(key.toLowerCase())) {
        bulkFactor = val;
        break;
      }
    }
  }

  // Sheets per ream: 500 standard (250 for heavy stock)
  const sheetsPerReam = gsm > 200 ? 250 : 500;

  return {
    grammage_gsm: gsm,
    actualGrammage_gsm: gsm,
    caliper_microns: gsm * bulkFactor,
    bulkFactor,
    sheets_per_cm: 10000 / (gsm * bulkFactor),
    grainDirection: grainDir,
    fiberContent: 'VIRGIN',
    recycledPercent: 0,
    moistureContent_percent: 5.0,
    equilibriumRH_percent: 50,
    ambientRH_percent: 55,
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
    costPerKg,
    costPerSheet_parent: (sheetWidthMM / 1000) * (sheetHeightMM / 1000) * (gsm / 1000) * costPerKg,
    sheetsPerReam,
    reamsPerPallet: gsm > 200 ? 40 : 20,
    kgPerPallet: 800,
    minimumOrderQty_kg: 500,
    sourceSelection,
    candidateMatches: candidates.slice(0, 5).map((candidate) => ({
      source: candidate.source,
      reference: candidate.reference,
      paperType: candidate.paperType,
      gsm: candidate.gsm,
      size: candidate.sizeLabel,
      costPerKg: candidate.costPerKg,
      inStock: candidate.inStock,
    })),
  };
}
// â”€â”€â”€ 2. GRAIN ANALYSIS ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function analyzeGrainDirection(
  pageWidthMM: number, pageHeightMM: number,
  sheetWidthMM: number, sheetHeightMM: number,
  substrate: SubstratePhysicalModel,
  requiredGrain: 'PARALLEL_TO_SPINE' | 'PARALLEL_TO_HEAD' | 'ANY',
  scoringCostPerSheet: number = 0.5
): GrainAnalysisResult {

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

  let portraitGrainOk = false;
  let landscapeGrainOk = false;

  if (substrate.grainDirection === 'LONG_GRAIN') {
    portraitGrainOk = true;
    landscapeGrainOk = false;
  } else {
    portraitGrainOk = false;
    landscapeGrainOk = true;
  }

  let grainOptimalLayout: SheetLayout = yieldOptimalLayout;
  let grainCompliant = false;

  if (requiredGrain === 'PARALLEL_TO_SPINE') {
    if (yieldOptimalLayout.orientation === 'PORTRAIT' && portraitGrainOk) grainCompliant = true;
    if (yieldOptimalLayout.orientation === 'LANDSCAPE' && landscapeGrainOk) grainCompliant = true;

    if (!grainCompliant) {
      if (portraitGrainOk) {
        grainOptimalLayout = { pagesAcross: pagesAcross_P, pagesDown: pagesDown_P, pagesPerPressSheet: yield_P, orientation: 'PORTRAIT', totalPressSheets_fromParent: 1, wasteArea_sqmm: (sheetWidthMM * sheetHeightMM) - (yield_P * pageWidthMM * pageHeightMM) };
      } else {
        grainOptimalLayout = { pagesAcross: pagesAcross_L, pagesDown: pagesDown_L, pagesPerPressSheet: yield_L, orientation: 'LANDSCAPE', totalPressSheets_fromParent: 1, wasteArea_sqmm: (sheetWidthMM * sheetHeightMM) - (yield_L * pageWidthMM * pageHeightMM) };
      }
    }
  } else {
    grainCompliant = true;
  }

  const requiresScoring = !grainCompliant && substrate.grammage_gsm >= 170;
  const theoreticalQty = 1000;
  const yieldSheets = Math.ceil(theoreticalQty / yieldOptimalLayout.pagesPerPressSheet);
  const grainSheets = Math.ceil(theoreticalQty / (grainOptimalLayout.pagesPerPressSheet || 1));
  const yieldDelta_sheets = grainSheets - yieldSheets;
  const yieldDelta_percent = grainSheets > 0 ? (yieldDelta_sheets / grainSheets) * 100 : 0;
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
        reason = "Grain compliant yield loss is cheaper than scoring. Use compliant layout.";
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

// â”€â”€â”€ 3. THOMSON PRESS FORMAT / IMPOSITION CALCULATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Uses Thomson Press rules:
//   < 8pp â†’ 4pp/form, 8-16pp â†’ 8pp/form, 16-32pp â†’ 16pp/form, â‰¥32pp â†’ 32pp/form

function calculatePPPerForm(totalPages: number, sectionType: string): number {
  if (sectionType === 'cover' || sectionType === 'jacket') return totalPages; // Cover = 1 form always
  if (sectionType === 'endleaves') return Math.min(8, totalPages); // Endleaves = typically 4 or 8
  if (totalPages < 8) return 4;
  if (totalPages <= 16) return 8;
  if (totalPages <= 32) return 8;  // Thomson Press uses 8pp forms for 32pp text
  return 16; // Larger books use 16pp forms
}

function calculateImpositionTP(input: ImpositionInput, substrate: SubstratePhysicalModel): ImpositionResult {
  const bleed = input.bleed_mm ?? 3;
  const gripper = input.gripper_mm ?? 12;
  const tail = input.machineTailMargin_mm ?? 8;
  const side = input.machineSideMargin_mm ?? 5;

  // Trim size with bleed
  const trimW = input.finishedPageWidth_mm + (bleed * 2);
  const trimH = input.finishedPageHeight_mm + (bleed * 2);

  const sheetW = input.parentSheetWidth_mm;
  const sheetH = input.parentSheetHeight_mm;

  // Press sheet = parent sheet (or half if too large for machine)
  let pressSheetW = sheetW;
  let pressSheetH = sheetH;
  const maxW = (input.machineMaxWidth_mm || 9999);
  const maxH = (input.machineMaxHeight_mm || 9999);

  if (pressSheetW > maxW) pressSheetW = Math.floor(pressSheetW / 2);
  if (pressSheetH > maxH) pressSheetH = Math.floor(pressSheetH / 2);

  // Available printable area (after gripper, tail, side margins)
  const printableW = pressSheetW - (side * 2);
  const printableH = pressSheetH - gripper - tail;

  // Calculate ups in both orientations
  const upsAcrossP = Math.floor(printableW / trimW);
  const upsDownP = Math.floor(printableH / trimH);
  const upsPortrait = upsAcrossP * upsDownP;

  const upsAcrossL = Math.floor(printableW / trimH);
  const upsDownL = Math.floor(printableH / trimW);
  const upsLandscape = upsAcrossL * upsDownL;

  const orientation = upsPortrait >= upsLandscape ? 'PORTRAIT' : 'LANDSCAPE';
  const ups = Math.max(upsPortrait, upsLandscape, 1);

  // Determine pp per form using Thomson Press rules
  let ppPerForm = calculatePPPerForm(input.totalPages, '');
  // For sheetwise, pp per form cannot exceed ups * 2 (both sides)
  ppPerForm = Math.min(ppPerForm, ups * 2, input.totalPages);
  if (ppPerForm <= 0) ppPerForm = Math.min(4, input.totalPages);

  const numberOfForms = Math.max(1, Math.ceil(input.totalPages / ppPerForm));
  const leavesPerForm = ppPerForm / 2;
  const sheetsPerCopy = numberOfForms; // Each form needs 1 sheet per copy

  const printableArea = printableW * printableH;
  const usedArea = ups * trimW * trimH;
  const wasteArea = (pressSheetW * pressSheetH) - usedArea;
  const areaUtilization = ((usedArea) / (pressSheetW * pressSheetH)) * 100;

  // Press sheets cut from parent
  const pressFromParent = Math.max(1, Math.floor((sheetW * sheetH) / (pressSheetW * pressSheetH)));

  return {
    pagesPerPressSheet: ups,
    pressSheetWidth_mm: pressSheetW,
    pressSheetHeight_mm: pressSheetH,
    pagesAcross: orientation === 'PORTRAIT' ? upsAcrossP : upsAcrossL,
    pagesDown: orientation === 'PORTRAIT' ? upsDownP : upsDownL,
    orientation,
    printableArea_sqmm: printableArea,
    usedArea_sqmm: usedArea,
    wasteArea_sqmm: wasteArea,
    areaUtilization_percent: areaUtilization,
    pressSheetsCutFromParent: pressFromParent,
    parentSheetWaste_sqmm: 0,
    parentSheetUtilization_percent: areaUtilization,
    totalPressSheets: Math.ceil(input.totalPages / (ups * 2)),
    totalParentSheets: Math.ceil(Math.ceil(input.totalPages / (ups * 2)) / pressFromParent),
    alternativeLayouts: [],
    selectedLayoutReason: 'Auto-planned: best yield with grain compliance',
    grainCompliant: true,
    grainPenalty_sheets: 0,
    grainPenalty_cost: 0,
    ppPerForm,
    numberOfForms,
    ups,
    paperSizeId: "ps_custom",
    paperSizeLabel: `${Math.round(sheetW / 25.4)}×${Math.round(sheetH / 25.4)}`,
    paperWidthInch: mmToInch(sheetW),
    paperHeightInch: mmToInch(sheetH),
    formatWidth: mmToInch(pressSheetW),
    formatHeight: mmToInch(pressSheetH),
    formatLabel: `${mmToInch(pressSheetW).toFixed(1)}×${mmToInch(pressSheetH).toFixed(1)}"`,
    leavesPerForm,
    sheetsPerCopy
  };
}

// â”€â”€â”€ 4. AUTO PAPER PLANNING ENGINE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface PaperPlanOption {
  paperSize: typeof STANDARD_PAPER_SIZES[number];
  ups: number;
  orientation: 'PORTRAIT' | 'LANDSCAPE';
  grainOk: boolean;
  wastagePercent: number;
  totalCost: number;
  costPerCopy: number;
  selected: boolean;
}

function autoPlanPaperSize(
  trimWidthMM: number,
  trimHeightMM: number,
  gsm: number,
  costPerKg: number,
  quantity: number,
  totalPages: number,
  sectionType: string,
  bleedMM: number = 3,
  spineThickness: number = 0,
): { bestSize: typeof STANDARD_PAPER_SIZES[number]; options: PaperPlanOption[] } {

  let effectiveWidth = trimWidthMM;
  if (sectionType === 'cover' && spineThickness > 0) {
    effectiveWidth = trimWidthMM * 2 + spineThickness + 20; // 2 covers + spine + bleed
  }
  if (sectionType === 'jacket' && spineThickness > 0) {
    effectiveWidth = trimWidthMM * 2 + spineThickness + 180; // Flaps
  }

  const trimW = effectiveWidth + (bleedMM * 2);
  const trimH = trimHeightMM + (bleedMM * 2);

  const gripper = 12;
  const tail = 8;
  const side = 5;

  const options: PaperPlanOption[] = [];

  for (const size of STANDARD_PAPER_SIZES) {
    const sheetW = size.widthMM;
    const sheetH = size.heightMM;

    const printableW = sheetW - (side * 2);
    const printableH = sheetH - gripper - tail;

    // Portrait
    const upsP = Math.floor(printableW / trimW) * Math.floor(printableH / trimH);
    // Landscape
    const upsL = Math.floor(printableW / trimH) * Math.floor(printableH / trimW);

    const bestUps = Math.max(upsP, upsL);
    if (bestUps <= 0) continue; // Sheet too small

    const orient = upsP >= upsL ? 'PORTRAIT' : 'LANDSCAPE';

    // Grain check
    const isLongGrain = sheetH > sheetW;
    const grainOk = orient === 'PORTRAIT' ? isLongGrain : !isLongGrain;

    // Calculate cost for this option
    const ppPerForm = calculatePPPerForm(totalPages, sectionType);
    const effectivePPPerForm = Math.min(ppPerForm, bestUps * 2, totalPages);
    const numberOfForms = Math.max(1, Math.ceil(totalPages / effectivePPPerForm));

    // Net sheets needed
    const netSheets = Math.ceil((quantity * numberOfForms) / bestUps);

    // Wastage (using Thomson Press chart â€” running waste only for auto-planning)
    const wastagePercent = lookupTPWastagePercent(netSheets);
    const wastageSheets = Math.ceil(netSheets * wastagePercent / 100);
    const grossSheets = netSheets + wastageSheets;

    // Weight and cost
    const sheetAreaSqM = (sheetW / 1000) * (sheetH / 1000);
    const sheetWeightKg = sheetAreaSqM * gsm / 1000;
    const totalWeightKg = grossSheets * sheetWeightKg;
    const totalCost = totalWeightKg * costPerKg;
    const costPerCopy = quantity > 0 ? totalCost / quantity : 0;

    // Area utilization
    const usedArea = bestUps * trimW * trimH;
    const totalArea = sheetW * sheetH;
    const utilization = (usedArea / totalArea) * 100;

    options.push({
      paperSize: size,
      ups: bestUps,
      orientation: orient,
      grainOk,
      wastagePercent: 100 - utilization,
      totalCost,
      costPerCopy,
      selected: false,
    });
  }

  // Sort: prefer grain-compliant, then lowest cost
  options.sort((a, b) => {
    if (a.grainOk && !b.grainOk) return -1;
    if (!a.grainOk && b.grainOk) return 1;
    return a.totalCost - b.totalCost;
  });

  const best = options.length > 0 ? options[0] : null;
  if (best) best.selected = true;

  return {
    bestSize: best ? best.paperSize : STANDARD_PAPER_SIZES[0],
    options,
  };
}

// â”€â”€â”€ 5. THOMSON PRESS WASTAGE (ADDITIVE â€” CORRECT) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CRITICAL: Wastage is ADDITIVE, not multiplicative
//   total_waste_sheets = make_ready_waste_sheets + running_waste_sheets
//   make_ready_waste = M/R_per_colour Ã— number_of_colours (from TP table)
//   running_waste = net_sheets Ã— running_waste_% / 100 (from TP impression chart)
//
// WRONG: qty Ã— (1 + waste1) Ã— (1 + waste2)
// RIGHT: qty + waste1_sheets + waste2_sheets

function calculateTPWastage(
  netSheets: number,
  maxColors: number,
  substrate: SubstratePhysicalModel,
  machineCode: string = 'RMGT',
): CompoundSpoilageResult {
  // 1. Make-Ready Wastage (sheets per colour per M/R)
  // From TP table: FAV(4col)=12.5, REK(4col)=9, RMGT(4col)=10 sheets per colour
  const mrPerColour = lookupTPMachineReadyWastage(machineCode, maxColors);
  const makeReadyWaste = Math.ceil(mrPerColour * maxColors);

  // 2. Running Wastage (percentage of net sheets from TP chart)
  const runningWastePct = lookupTPWastagePercent(netSheets);
  const runningWaste = Math.ceil(netSheets * runningWastePct / 100);

  // 3. Bible/thin paper extra wastage
  let thinPaperWaste = 0;
  const gsm = substrate.grammage_gsm;
  for (const surcharge of TP_BIBLE_PAPER_SURCHARGES) {
    if (gsm >= surcharge.minGSM && gsm <= surcharge.maxGSM) {
      thinPaperWaste = Math.ceil(netSheets * surcharge.extraWastagePercent / 100);
      break;
    }
  }

  // 4. TOTAL wastage is ADDITIVE
  const totalWaste = makeReadyWaste + runningWaste + thinPaperWaste;
  const grossSheets = netSheets + totalWaste;
  const totalWastePercent = netSheets > 0 ? (totalWaste / netSheets) * 100 : 0;

  return {
    finishedQuantityRequired: netSheets,
    operationChain: [{
      operationName: 'Printing + Finishing',
      sheetsEntering: grossSheets,
      sheetsExiting: netSheets,
      setupWaste: makeReadyWaste,
      runningWaste: runningWaste + thinPaperWaste,
      totalWaste: totalWaste,
      effectiveSpoilageRate: totalWastePercent,
      cumulativeWasteToThisPoint: totalWaste,
    }],
    totalSheetsRequired_printing: grossSheets,
    totalMakereadyWaste: makeReadyWaste,
    totalRunningWaste: runningWaste + thinPaperWaste,
    totalWasteSheets: totalWaste,
    totalWastePercent,
    wasteSheetsCost: totalWaste * substrate.costPerSheet_parent,
    flatWasteComparison_percent: 5.0,
    flatWasteError_sheets: totalWaste - Math.ceil(netSheets * 0.05),
    flatWasteError_cost: (totalWaste - Math.ceil(netSheets * 0.05)) * substrate.costPerSheet_parent,
  };
}

// â”€â”€â”€ 6. PRECISION WEIGHT CALCULATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function calculatePrecisionWeight(
  sheetW_mm: number, sheetH_mm: number,
  totalSheets: number,
  goodSheets: number,
  substrate: SubstratePhysicalModel
): PaperWeightCalculation {
  const areaSqm = (sheetW_mm / 1000) * (sheetH_mm / 1000);
  const nominalGrams = areaSqm * substrate.grammage_gsm;
  const actualGrams = nominalGrams;
  const finalSheetWeight_g = actualGrams;

  const totalWeight_kg = (finalSheetWeight_g * totalSheets) / 1000;
  const goodWeight_kg = (finalSheetWeight_g * goodSheets) / 1000;
  const wasteWeight_kg = totalWeight_kg - goodWeight_kg;

  const totalCost = totalWeight_kg * substrate.costPerKg;

  return {
    sheetArea_sqm: areaSqm,
    nominalSheetWeight_grams: nominalGrams,
    actualSheetWeight_grams: actualGrams,
    moistureAdjustedWeight_grams: finalSheetWeight_g,
    totalSheets,
    totalWeight_kg: Math.round(totalWeight_kg * 1000) / 1000,
    goodSheetsWeight_kg: Math.round(goodWeight_kg * 1000) / 1000,
    wasteWeight_kg: Math.round(wasteWeight_kg * 1000) / 1000,
    costPerKg: substrate.costPerKg,
    totalPaperCost: totalCost,
    wasteCost: wasteWeight_kg * substrate.costPerKg,
    finishedProductWeight_kg: goodWeight_kg * 0.95,
    trimmingWasteWeight_kg: goodWeight_kg * 0.05
  };
}

function buildProcurementRecommendation(
  input: PaperCalculationInput,
  substrate: SubstratePhysicalModel,
  preferredSize: string,
  grossSheets: number,
): ProcurementRecommendation | undefined {
  const matches = substrate.candidateMatches || [];
  const hasInStockMatch = matches.some((candidate) => candidate.inStock);
  if (hasInStockMatch || substrate.sourceSelection?.source !== 'fallback') {
    return undefined;
  }

  const nearestMatches = matches.slice(0, 3).map((candidate) => ({
    source: candidate.source,
    reference: candidate.reference,
    paperType: candidate.paperType,
    gsm: candidate.gsm,
    size: candidate.size,
    deltaCostPerCopy: 0,
    stockStatus: candidate.inStock ? 'available' as const : 'not_available' as const,
  }));

  const sizeObj = STANDARD_PAPER_SIZES.find((size) => size.label === preferredSize || size.label.replace('×', 'x') === preferredSize);
  const areaSqM = ((sizeObj?.widthMM || substrate.parentSheetWidth_mm) / 1000) * ((sizeObj?.heightMM || substrate.parentSheetHeight_mm) / 1000);
  const reamWeightKg = areaSqM * input.gsm / 1000 * (input.gsm > 200 ? 250 : 500);
  const estimatedRatePerReam = Math.round(substrate.costPerKg * reamWeightKg * 100) / 100;

  const supplierId = nearestMatches.length > 0 ? nearestMatches[0].reference : undefined;
  const supplierName = nearestMatches.length > 0 && nearestMatches[0].source === 'rate_card'
    ? "Preferred Vendor (Global Rate Card)"
    : "Standard Paper Merchant";

  return {
    section: input.sectionName,
    requiredSpec: {
      paperType: input.paperType,
      gsm: input.gsm,
      preferredSize,
      quantitySheets: grossSheets,
      grain: substrate.grainDirection || 'UNKNOWN',
    },
    nearestMatches,
    recommendedBuy: {
      paperType: input.paperType,
      gsm: input.gsm,
      size: preferredSize,
      estimatedRatePerReam,
      suggestedOrderQtySheets: Math.max(grossSheets, 5000),
      supplierId,
      supplierName,
    },
    impactIfNotAvailable: 'Estimate computed with provisional paper assumptions. Final costing and schedule may vary after procurement.',
    confidence: 0.74,
  };
}

// â”€â”€â”€ MAIN ORCHESTRATION FUNCTION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function calculatePaperRequirement(input: PaperCalculationInput): PaperCalculationResult {
  // 1. Resolve Substrate Physics
  const substrate = resolveSubstrate(input.gsm, input.paperType, input.paperCode, input.paperSizeLabel);

  // 2. Adjust dimensions for cover/jacket
  let effectiveWidth = input.trimWidthMM;
  let effectiveHeight = input.trimHeightMM;
  if (input.sectionType === "cover" && input.spineThickness) {
    effectiveWidth = input.trimWidthMM * 2 + input.spineThickness + 20;
  }
  if (input.sectionType === "jacket" && input.spineThickness) {
    effectiveWidth = input.trimWidthMM * 2 + input.spineThickness + 180;
  }

  // 3. AUTO-PLAN paper size if "auto" or unspecified
  let autoPlanning;
  if (!input.paperSizeLabel || input.paperSizeLabel === 'auto' || input.paperSizeLabel === '') {
    const plan = autoPlanPaperSize(
      input.trimWidthMM, input.trimHeightMM,
      input.gsm, substrate.costPerKg,
      input.quantity, input.totalPages,
      input.sectionType, input.bleedMM ?? 3,
      input.spineThickness ?? 0
    );
    // Update substrate with best paper size
    substrate.parentSheetWidth_mm = plan.bestSize.widthMM;
    substrate.parentSheetHeight_mm = plan.bestSize.heightMM;
    substrate.costPerSheet_parent = (plan.bestSize.widthMM / 1000) * (plan.bestSize.heightMM / 1000) * (input.gsm / 1000) * substrate.costPerKg;

    autoPlanning = {
      bestPaperSize: plan.bestSize.label,
      allEvaluated: plan.options.map(o => ({
        paperSize: o.paperSize.label,
        ups: o.ups,
        wastagePercent: Math.round(o.wastagePercent * 100) / 100,
        grainOk: o.grainOk,
        totalCost: Math.round(o.totalCost * 100) / 100,
        selected: o.selected,
      })),
    };
  }

  // 4. Imposition
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
  const imposition = calculateImpositionTP(impoInput, substrate);

  // 5. Grain Analysis
  const grainAnalysis = analyzeGrainDirection(
    effectiveWidth, effectiveHeight,
    imposition.pressSheetWidth_mm, imposition.pressSheetHeight_mm,
    substrate, 'PARALLEL_TO_SPINE'
  );

  // 6. Calculate net sheets
  const maxColors = Math.max(input.colorsFront, input.colorsBack);
  const netSheets = Math.ceil((input.quantity * imposition.numberOfForms) / imposition.ups);

  // 7. Wastage using Thomson Press ADDITIVE method
  const machineCode = input.machineCode || 'RMGT';
  const wastage = calculateTPWastage(netSheets, maxColors, substrate, machineCode);
  const grossSheets = wastage.totalSheetsRequired_printing;

  // 8. Weight & Cost Calculation
  const weight = calculatePrecisionWeight(
    imposition.pressSheetWidth_mm, imposition.pressSheetHeight_mm,
    grossSheets, netSheets, substrate
  );

  // Final outputs
  const reams = grossSheets / substrate.sheetsPerReam;
  const totalCost = weight.totalPaperCost;
  const weightPerReam = reams > 0 ? (weight.totalWeight_kg / reams) : 0;
  const preferredSize = autoPlanning?.bestPaperSize || input.paperSizeLabel || imposition.paperSizeLabel;
  const procurementRecommendation = buildProcurementRecommendation(
    input,
    substrate,
    preferredSize,
    grossSheets,
  );

  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    paperType: input.paperType || substrate.surfaceFinish,
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
    imposition,
    grainAnalysis,
    weightCalculation: weight,
    substrate,
    sourceSelection: substrate.sourceSelection ? {
      source: substrate.sourceSelection.source,
      reference: substrate.sourceSelection.reference,
      confidence: substrate.sourceSelection.confidence,
      inStock: substrate.sourceSelection.inStock,
    } : undefined,
    procurementRecommendation,
    autoPlanning,
  };
}

