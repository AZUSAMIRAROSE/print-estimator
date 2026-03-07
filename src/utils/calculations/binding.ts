// ============================================================================
// BINDING COST ENGINE — THOMSON PRESS CALIBRATED
// ============================================================================
// Uses Thomson Press exact binding rates from the 68-page PDF:
//
// HARDCASE BINDING per copy:
//   Labour: Rs 3.75
//   Board: Rs 15.23 (imported 3mm, 5 books/sheet from 31×41" sheet @ Rs 112/sheet)
//   Glue: Rs 2.10
//   Lamination film: Rs 0.55
//   Total H/C: Rs 21.08/copy
//
// Other rates:
//   Sewn blocks: Rs 0.11/copy/section
//   Folding: Rs 0.04/copy
//   Saddle stitching: Rs 0.25/copy
//   Perfect binding: lessThan8pp=15, 8-16pp=10.75, 16-32pp=7.5, >=32pp=5.5
//   Sewn P/B: lessThan8pp=17.25, 8-16pp=13, 16-32pp=8.5, >=32pp=7.5
// ============================================================================

import { ENGINE_CONSTANTS } from "./constants";
import type { SubstratePhysicalModel } from "./paper";

// ─── TYPES & INTERFACES ─────────────────────────────────────────────────────

export interface BindingCostInput {
  jobType: 'BOOK' | 'MAGAZINE' | 'BROCHURE' | 'LEAFLET';
  bindingMethod: 'PERFECT' | 'PUR' | 'CASE' | 'SADDLE' | 'SECTION_SEWN' | 'WIRO' | 'SPIRAL' | 'FOLD_ONLY';
  quantity: number;
  bookWidth_mm: number;
  bookHeight_mm: number;

  textSections: {
    pages: number;
    substrate: SubstratePhysicalModel;
    signatures: number;
  }[];

  coverSubstrate?: SubstratePhysicalModel;
  endpaperSubstrate?: SubstratePhysicalModel;

  hardcoverSpecs?: {
    boardThickness_mm: number;
    clothMaterial: string;
    foilStamping_sqcm?: number;
    headTailBands: boolean;
    ribbonMarker: boolean;
  };
}

export interface SpineGeometryResult {
  baseThickness_mm: number;
  adhesiveSwell_mm: number;
  threadSwell_mm: number;
  boardThickness_mm: number;
  totalSpineThickness_mm: number;
  hingeWidth_mm: number;
}

export interface AdhesiveThreadConsumptionResult {
  spineLength_m: number;
  adhesiveType: 'EVA' | 'PUR' | 'NONE';
  adhesiveFilmThickness_microns: number;
  adhesiveVolume_cm3: number;
  adhesiveWeight_grams: number;
  adhesiveCost: number;

  requiresSewing: boolean;
  threadLength_meters: number;
  threadCost: number;
}

export interface CaseMakingResult {
  isActive: boolean;
  boardW_mm: number;
  boardH_mm: number;
  spineBoardW_mm: number;
  coverMaterialW_mm: number;
  coverMaterialH_mm: number;
  glueWeight_grams: number;

  boardCost: number;
  materialCost: number;
  glueCost: number;
  accessoriesCost: number;
}

export interface BindingKinematicsResult {
  machineId: string;
  setupTime_hours: number;
  runningSpeed_booksPerHour: number;
  runTime_hours: number;
  totalTime_hours: number;
  laborOverheadCost: number;
}

export interface JobBindingCost_GodLevel {
  bindingMethod: string;
  quantity: number;

  geometry: SpineGeometryResult;
  materials: AdhesiveThreadConsumptionResult;
  caseMaking: CaseMakingResult;
  kinematics: BindingKinematicsResult;
  sewingKinematics?: BindingKinematicsResult;

  costBreakdown: {
    adhesiveCost: number;
    threadCost: number;
    hardcoverMaterialsCost: number;
    machineTimeCost: number;
    setupCost: number;
    subcontractorCost: number;
    totalCost: number;
  };

  unitCost: number;
}

// ─── 1. SPINE GEOMETRY CALCULATOR ────────────────────────────────────────────
function calculateSpineGeometry(input: BindingCostInput): SpineGeometryResult {
  let baseThickness = 0;

  // Thomson Press formula: spine_mm = (total_pages / 2) × (GSM / 1000) × bulk_factor
  for (const group of input.textSections) {
    const leaves = group.pages / 2;
    const bulkFactor = group.substrate.bulkFactor || 1.0;
    baseThickness += leaves * (group.substrate.grammage_gsm / 1000) * bulkFactor;
  }

  // Endpapers (if case bound or section sewn)
  if (input.endpaperSubstrate && (input.bindingMethod === 'CASE' || input.bindingMethod === 'SECTION_SEWN')) {
    const endleafLeaves = 4; // 8 pages = 4 leaves (4 front, 4 back combined)
    const bulkFactor = input.endpaperSubstrate.bulkFactor || 1.3;
    baseThickness += endleafLeaves * (input.endpaperSubstrate.grammage_gsm / 1000) * bulkFactor;
  }

  let adhesiveSwell = 0;
  let threadSwell = 0;
  let boardThickness = 0;
  let hingeWidth = 0;

  switch (input.bindingMethod) {
    case 'PERFECT':
      adhesiveSwell = 0.5;
      hingeWidth = 7;
      break;
    case 'PUR':
      adhesiveSwell = 0.2;
      hingeWidth = 7;
      break;
    case 'SECTION_SEWN':
      threadSwell = input.textSections.reduce((acc, s) => acc + (s.signatures * 0.08), 0);
      adhesiveSwell = 0.3;
      hingeWidth = 8;
      break;
    case 'CASE':
      threadSwell = input.textSections.reduce((acc, s) => acc + (s.signatures * 0.08), 0);
      adhesiveSwell = 0.5;
      boardThickness = input.hardcoverSpecs?.boardThickness_mm || 3;
      hingeWidth = 10;
      break;
  }

  // Spine INCLUDING board = spine_mm + (2 × board_thickness)
  const spineExclBoard = baseThickness + adhesiveSwell + threadSwell;
  const totalSpine = spineExclBoard + (boardThickness * 2);

  return {
    baseThickness_mm: Math.round(baseThickness * 100) / 100,
    adhesiveSwell_mm: adhesiveSwell,
    threadSwell_mm: threadSwell,
    boardThickness_mm: boardThickness,
    totalSpineThickness_mm: Math.round(totalSpine * 100) / 100,
    hingeWidth_mm: hingeWidth
  };
}

// ─── 2. THOMSON PRESS BOARD COST CALCULATOR ──────────────────────────────────
// Board cost = Rs 15.23/copy for imported 3mm board
// Calculation: board sheet 31×41 inches, Rs 112/sheet, 5 books/sheet
function calculateBoardCostTP(
  bookWidth_mm: number,
  bookHeight_mm: number,
  boardThickness_mm: number,
  quantity: number
): { costPerCopy: number; totalCost: number; booksPerSheet: number } {

  const tp = ENGINE_CONSTANTS.thomsonPress.board;

  // Board piece size per book (with 3mm overhang on all sides)
  const boardW_inch = (bookWidth_mm + 6) / 25.4;
  const boardH_inch = (bookHeight_mm + 6) / 25.4;

  // Board sheet dimensions
  const sheetW = tp.imported_sheetWidth_inch; // 31"
  const sheetH = tp.imported_sheetHeight_inch; // 41"

  // How many boards fit per sheet (2 boards per book: front + back)
  const boardsAcross = Math.floor(sheetW / boardW_inch);
  const boardsDown = Math.floor(sheetH / boardH_inch);
  const boardsPerSheet = boardsAcross * boardsDown;

  // Books per sheet = boards per sheet / 2 (front + back)
  const booksPerSheet = Math.max(1, Math.floor(boardsPerSheet / 2));

  // Rate per sheet based on thickness
  let ratePerSheet = tp.imported_3mm_ratePerSheet; // Rs 112 for 3mm
  if (boardThickness_mm <= 2) ratePerSheet = 75;
  else if (boardThickness_mm <= 2.5) ratePerSheet = 93;

  const costPerCopy = ratePerSheet / booksPerSheet;
  const sheetsNeeded = Math.ceil(quantity / booksPerSheet);
  const totalCost = sheetsNeeded * ratePerSheet;

  return { costPerCopy, totalCost, booksPerSheet };
}

// ─── 3. ADHESIVE & THREAD ───────────────────────────────────────────────────
function calculateAdhesiveAndThread(
  input: BindingCostInput,
  geometry: SpineGeometryResult
): AdhesiveThreadConsumptionResult {

  const spineLengthM = input.bookHeight_mm / 1000;
  const spineWidthM = geometry.baseThickness_mm / 1000;

  let adhesiveType: 'EVA' | 'PUR' | 'NONE' = 'NONE';
  let filmThicknessMicrons = 0;
  let SG = 1.0;

  if (input.bindingMethod === 'PERFECT' || input.bindingMethod === 'SECTION_SEWN' || input.bindingMethod === 'CASE') {
    adhesiveType = 'EVA';
    filmThicknessMicrons = 500;
    SG = ENGINE_CONSTANTS.adhesives.EVA_density_gPerCm3;
  } else if (input.bindingMethod === 'PUR') {
    adhesiveType = 'PUR';
    filmThicknessMicrons = 200;
    SG = ENGINE_CONSTANTS.adhesives.PUR_density_gPerCm3;
  }

  const volumeM3 = spineLengthM * spineWidthM * (filmThicknessMicrons / 1000000);
  const volumeCm3 = volumeM3 * 1000000;
  const weightGramsPerBook = volumeCm3 * SG;
  const totalWeightGrams = weightGramsPerBook * input.quantity;

  let costPerKg = 0;
  if (adhesiveType === 'EVA') costPerKg = ENGINE_CONSTANTS.adhesives.EVA_costPerKg;
  else if (adhesiveType === 'PUR') costPerKg = ENGINE_CONSTANTS.adhesives.PUR_costPerKg;

  const adhesiveCost = (totalWeightGrams / 1000) * costPerKg;

  // Thread
  const requiresSewing = input.bindingMethod === 'SECTION_SEWN' || input.bindingMethod === 'CASE';
  let threadMeters = 0;
  let threadCost = 0;

  if (requiresSewing) {
    const sigTotal = input.textSections.reduce((acc, val) => acc + val.signatures, 0);
    const threadPerBook = sigTotal * spineLengthM * 1.5;
    threadMeters = threadPerBook * input.quantity;
    threadCost = threadMeters * ENGINE_CONSTANTS.thread.costPerMeter;
  }

  return {
    spineLength_m: spineLengthM,
    adhesiveType,
    adhesiveFilmThickness_microns: filmThicknessMicrons,
    adhesiveVolume_cm3: volumeCm3 * input.quantity,
    adhesiveWeight_grams: totalWeightGrams,
    adhesiveCost,
    requiresSewing,
    threadLength_meters: threadMeters,
    threadCost
  };
}

// ─── 4. CASE MAKING (SIMPLIFIED — USES TP DIRECT RATES) ────────────────────
function calculateCaseMaking(input: BindingCostInput, geometry: SpineGeometryResult): CaseMakingResult {
  const isActive = input.bindingMethod === 'CASE';
  if (!isActive || !input.hardcoverSpecs) {
    return { isActive: false, boardW_mm: 0, boardH_mm: 0, spineBoardW_mm: 0, coverMaterialW_mm: 0, coverMaterialH_mm: 0, glueWeight_grams: 0, boardCost: 0, materialCost: 0, glueCost: 0, accessoriesCost: 0 };
  }

  const overhang = 3;
  const boardW = input.bookWidth_mm - 2;
  const boardH = input.bookHeight_mm + (overhang * 2);
  const spineBoardW = geometry.baseThickness_mm + 2;
  const turnIn = 15;
  const hingeGap = geometry.hingeWidth_mm;
  const coverMaterialW = (boardW * 2) + spineBoardW + (hingeGap * 2) + (turnIn * 2);
  const coverMaterialH = boardH + (turnIn * 2);

  // Calculate board cost using Thomson Press method
  const boardResult = calculateBoardCostTP(
    input.bookWidth_mm,
    input.bookHeight_mm,
    input.hardcoverSpecs.boardThickness_mm || 3,
    input.quantity
  );

  // Glue cost = Rs 2.10/copy (Thomson Press rate)
  const glueCost = input.quantity * ENGINE_CONSTANTS.thomsonPress.hardcaseBinding.gluePerCopy;

  // Covering material cost = Rs 0.55/copy lamination film (for PLC - Printed Laminated Case)
  const materialCost = input.quantity * ENGINE_CONSTANTS.thomsonPress.hardcaseBinding.caseLaminationFilmPerCopy;

  let accessoriesCost = 0;
  if (input.hardcoverSpecs.headTailBands) {
    accessoriesCost += input.quantity * ENGINE_CONSTANTS.thomsonPress.hardcaseBinding.htBandPerCopy;
  }
  if (input.hardcoverSpecs.ribbonMarker) {
    accessoriesCost += input.quantity * ENGINE_CONSTANTS.thomsonPress.hardcaseBinding.ribbonPerCopy;
  }

  return {
    isActive,
    boardW_mm: boardW,
    boardH_mm: boardH,
    spineBoardW_mm: spineBoardW,
    coverMaterialW_mm: coverMaterialW,
    coverMaterialH_mm: coverMaterialH,
    glueWeight_grams: 0,
    boardCost: boardResult.totalCost,
    materialCost,
    glueCost,
    accessoriesCost
  };
}

// ─── 5. BINDING KINEMATICS ──────────────────────────────────────────────────
function calculateBindingKinematics(method: string, quantity: number, _signatures: number): BindingKinematicsResult {
  let speed = 1000;
  let setupMins = 30;

  if (method === 'PERFECT' || method === 'PUR') {
    speed = 1000;
    setupMins = 30;
  } else if (method === 'SADDLE') {
    speed = 3000;
    setupMins = 20;
  } else if (method === 'CASE' || method === 'SECTION_SEWN') {
    speed = 800;
    setupMins = 45;
  }

  const runTimeHours = quantity / speed;
  const setupHours = setupMins / 60;
  const totalTime = runTimeHours + setupHours;

  // Thomson Press uses direct per-copy rates, not hourly rates
  // So machine time cost will be calculated differently
  return {
    machineId: 'synthetic_binder',
    setupTime_hours: setupHours,
    runningSpeed_booksPerHour: speed,
    runTime_hours: runTimeHours,
    totalTime_hours: totalTime,
    laborOverheadCost: 0 // Will be handled by per-copy rates
  };
}

// ─── MAIN ORCHESTRATION FUNCTION ─────────────────────────────────────────────
export function calculateBindingCostGodLevel(input: BindingCostInput): JobBindingCost_GodLevel {

  const signatures = input.textSections.reduce((acc, val) => acc + val.signatures, 0);

  const geometry = calculateSpineGeometry(input);
  const materials = calculateAdhesiveAndThread(input, geometry);
  const caseMaking = calculateCaseMaking(input, geometry);
  const kinematics = calculateBindingKinematics(input.bindingMethod, input.quantity, signatures);

  let sewingKinematics;
  if (materials.requiresSewing) {
    const sewSpeed = 3000;
    const totalSigs = signatures * input.quantity;
    const runTime = totalSigs / sewSpeed;
    const setupTime = 0.5;
    sewingKinematics = {
      machineId: 'synthetic_sewer',
      setupTime_hours: setupTime,
      runningSpeed_booksPerHour: sewSpeed,
      runTime_hours: runTime,
      totalTime_hours: runTime + setupTime,
      laborOverheadCost: 0
    };
  }

  // ── COST BREAKDOWN (Thomson Press per-copy rates) ──
  const tp = ENGINE_CONSTANTS.thomsonPress;

  // Base binding labour cost
  let labourCost = 0;

  if (input.bindingMethod === 'CASE') {
    // Hardcase binding: Rs 3.75/copy labour (casing in)
    labourCost = input.quantity * tp.hardcaseBinding.labourPerCopy;
  } else if (input.bindingMethod === 'PERFECT' || input.bindingMethod === 'PUR') {
    // Perfect binding or PUR
    const totalPages = input.textSections.reduce((sum, s) => sum + s.pages, 0);
    let pbRate = tp.perfectBinding.from32ppPlus;
    if (totalPages < 8) pbRate = tp.perfectBinding.lessThan8pp;
    else if (totalPages < 16) pbRate = tp.perfectBinding.from8to16pp;
    else if (totalPages < 32) pbRate = tp.perfectBinding.from16to32pp;
    labourCost = input.quantity * pbRate;
  } else if (input.bindingMethod === 'SADDLE') {
    labourCost = input.quantity * tp.hardcaseBinding.saddleStitchPerCopy;
  } else if (input.bindingMethod === 'SECTION_SEWN') {
    const totalPages = input.textSections.reduce((sum, s) => sum + s.pages, 0);
    let sewnRate = tp.sewnPB.from32ppPlus;
    if (totalPages < 8) sewnRate = tp.sewnPB.lessThan8pp;
    else if (totalPages < 16) sewnRate = tp.sewnPB.from8to16pp;
    else if (totalPages < 32) sewnRate = tp.sewnPB.from16to32pp;
    labourCost = input.quantity * sewnRate;
  }

  // Sewing cost (per section per copy)
  let sewingCost = 0;
  if (materials.requiresSewing) {
    sewingCost = input.quantity * signatures * tp.hardcaseBinding.sewingRatePerCopyPerSection;
  }

  // Folding cost
  const foldingCost = input.quantity * tp.hardcaseBinding.foldingRatePerCopy;

  // Hardcover materials (board + glue + lamination film)
  let hardcoverCost = 0;
  if (caseMaking.isActive) {
    hardcoverCost = caseMaking.boardCost + caseMaking.glueCost + caseMaking.materialCost + caseMaking.accessoriesCost;
  }

  // Foil stamping
  let foilCost = 0;
  if (input.hardcoverSpecs?.foilStamping_sqcm) {
    foilCost = input.hardcoverSpecs.foilStamping_sqcm * input.quantity * 0.05;
  }

  const machineTimeCost = labourCost + sewingCost + foldingCost;

  const costBreakdown = {
    adhesiveCost: Math.round(materials.adhesiveCost * 100) / 100,
    threadCost: Math.round(materials.threadCost * 100) / 100,
    hardcoverMaterialsCost: Math.round((hardcoverCost + foilCost) * 100) / 100,
    machineTimeCost: Math.round(machineTimeCost * 100) / 100,
    setupCost: 0,
    subcontractorCost: 0,
    totalCost: 0
  };

  costBreakdown.totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);

  return {
    bindingMethod: input.bindingMethod,
    quantity: input.quantity,
    geometry,
    materials,
    caseMaking,
    kinematics,
    sewingKinematics,
    costBreakdown,
    unitCost: costBreakdown.totalCost / Math.max(1, input.quantity)
  };
}