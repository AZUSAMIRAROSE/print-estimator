// ============================================================================
// PHYSICAL CONSTANTS & STANDARD DATA
// ============================================================================
//
// All values calibrated to Thomson Press (India) production data.
// These are the DEFAULTS — runtime overrides come from the rate card DB.
//
// Sources:
//   - Thomson Press PDF rate manual (2024)
//   - ISO 216 (paper sizes)
//   - Industry standard press specifications
// ============================================================================

import type {
  Dimensions_mm,
  SheetSpec,
  MachineSpec,
  SignaturePages,
  PaperCategory,
} from "./types";

// ─── PRESS PHYSICS ──────────────────────────────────────────────────────────

/** Gripper edge: leading edge where press clamps grab the sheet. No image here. */
export const GRIPPER_EDGE_MM = 12;

/** Tail margin: trailing edge clearance */
export const TAIL_MARGIN_MM = 5;

/** Side margins: left + right clearance for register pins */
export const SIDE_MARGIN_MM = 5;

/**
 * Bleed allowance per edge. Image extends beyond trim line to prevent
 * white edges after cutting. Standard is 3mm per side.
 */
export const BLEED_MM = 3;

/**
 * Gutter between page positions on the sheet.
 * 0 for butt-cut (standard in book work), configurable for special jobs.
 */
export const GUTTER_MM = 0;

/**
 * Color bar / register mark zone. Sits in gripper margin area,
 * does NOT further reduce printable area.
 */
export const COLOR_BAR_MM = 10;

// ─── STANDARD SIGNATURES ────────────────────────────────────────────────────

/**
 * Valid signature sizes for book work.
 * Each signature folds into this many pages.
 * 4pp = single fold, 8pp = 2 folds, 16pp = 3 folds, 32pp = 4 folds
 * 12pp and 24pp use special fold patterns (3-panel or combination)
 */
export const STANDARD_SIGNATURES: readonly SignaturePages[] = [
  4, 8, 12, 16, 24, 32,
];

/**
 * For partial (remainder) forms when total pages don't divide evenly.
 * E.g., 196 pages = 6×32pp + 1×4pp remainder
 */
export const PARTIAL_SIGNATURES: readonly number[] = [4, 8, 12, 16, 24];

// ─── STANDARD SHEET SIZES ───────────────────────────────────────────────────

/** Conversion factor: 1 inch = 25.4mm */
export const INCH_TO_MM = 25.4;

/**
 * Standard sheet sizes available in the Indian market.
 * Listed as Width × Height. Grain typically runs parallel to the
 * SECOND (height/longer) dimension = LONG_GRAIN.
 */
export const STANDARD_SHEETS: readonly SheetSpec[] = [
  {
    label: "20×30",
    size_in: { width: 20, height: 30 },
    size_mm: { width: 508, height: 762 },
    grain: "LONG_GRAIN",
  },
  {
    label: "23×36",
    size_in: { width: 23, height: 36 },
    size_mm: { width: 584, height: 914 },
    grain: "LONG_GRAIN",
  },
  {
    label: "25×36",
    size_in: { width: 25, height: 36 },
    size_mm: { width: 635, height: 914 },
    grain: "LONG_GRAIN",
  },
  {
    label: "28×40",
    size_in: { width: 28, height: 40 },
    size_mm: { width: 711, height: 1016 },
    grain: "LONG_GRAIN",
  },
];

// ─── STANDARD TRIM SIZES ────────────────────────────────────────────────────

export interface TrimSizePreset {
  readonly name: string;
  readonly size_mm: Dimensions_mm;
  /** ISO standard or trade name */
  readonly standard?: string;
}

export const TRIM_SIZE_PRESETS: readonly TrimSizePreset[] = [
  { name: "A4", size_mm: { width: 210, height: 297 }, standard: "ISO 216" },
  { name: "A5", size_mm: { width: 148, height: 210 }, standard: "ISO 216" },
  { name: "B5 (ISO)", size_mm: { width: 176, height: 250 }, standard: "ISO 216" },
  { name: "Royal Octavo", size_mm: { width: 153, height: 234 }, standard: "British" },
  { name: "Crown Quarto", size_mm: { width: 189, height: 246 }, standard: "British" },
  { name: "Demy Octavo", size_mm: { width: 138, height: 216 }, standard: "British" },
  { name: "Large Crown Octavo", size_mm: { width: 135, height: 203 }, standard: "British" },
  { name: "US Letter", size_mm: { width: 216, height: 279 }, standard: "ANSI" },
  { name: "US Trade (6×9)", size_mm: { width: 152, height: 229 }, standard: "US" },
  { name: "Pocket (4.25×6.87)", size_mm: { width: 108, height: 175 }, standard: "US" },
];

// ─── PAPER BULK FACTORS ─────────────────────────────────────────────────────

/**
 * Maps paper category → bulk factor.
 * Bulk factor determines spine thickness: caliper = gsm × bulk × 1.05 microns
 *
 * These are INDUSTRY AVERAGES. Actual values vary by manufacturer/grade.
 * For custom papers, the user supplies their own bulk factor.
 */
export const BULK_FACTORS: Readonly<Record<PaperCategory, number>> = {
  MATT_ART: 1.0,
  GLOSS_ART: 0.9,
  WOODFREE: 1.4,
  BULKY_WOODFREE: 2.3,
  BIBLE: 0.7,
  ART_CARD: 1.2,
  CHROMO: 1.1,
  BOARD: 1.3,
  KRAFT: 1.5,
  NEWSPRINT: 1.6,
  CUSTOM: 1.0,
};

/**
 * Calculate caliper (thickness) of one sheet in microns.
 * Industry formula: caliper = GSM × bulkFactor × empirical constant
 * The 1.05 factor accounts for surface coating & calendering effects.
 */
export function calculateCaliper(gsm: number, bulkFactor: number): number {
  return gsm * bulkFactor * 1.05;
}

/**
 * Calculate spine thickness in mm.
 * spine_mm = (totalPages / 2) × caliper_microns / 1000
 * (divide pages by 2 because each leaf has 2 pages)
 */
export function calculateSpineThickness(
  totalPages: number,
  gsm: number,
  bulkFactor: number,
): number {
  const caliper = calculateCaliper(gsm, bulkFactor);
  const leaves = totalPages / 2;
  return (leaves * caliper) / 1000;
}

// ─── MACHINE DATABASE ───────────────────────────────────────────────────────

/**
 * Thomson Press machine fleet.
 * These are the DEFAULT machines. The rate card DB may override specs/rates.
 */
export const MACHINE_DATABASE: readonly MachineSpec[] = [
  {
    id: "fav",
    name: "Favourit (FAV)",
    maxSheet_mm: { width: 720, height: 1020 },
    minSheet_mm: { width: 340, height: 480 },
    gripperEdge_mm: 12,
    tailMargin_mm: 5,
    sideMargin_mm: 5,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: false,
    speedSPH: 8000,
    hourlyRate: 6500,
  },
  {
    id: "rekord_aq",
    name: "Rekord (With AQ)",
    maxSheet_mm: { width: 720, height: 1020 },
    minSheet_mm: { width: 340, height: 480 },
    gripperEdge_mm: 12,
    tailMargin_mm: 5,
    sideMargin_mm: 5,
    maxColors: 4,
    hasAQUnit: true,
    hasPerfector: false,
    speedSPH: 5500,
    hourlyRate: 7000,
  },
  {
    id: "rekord_no_aq",
    name: "Rekord (Without AQ)",
    maxSheet_mm: { width: 720, height: 1020 },
    minSheet_mm: { width: 340, height: 480 },
    gripperEdge_mm: 12,
    tailMargin_mm: 5,
    sideMargin_mm: 5,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: false,
    speedSPH: 6000,
    hourlyRate: 6500,
  },
  {
    id: "rmgt",
    name: "RMGT 920",
    maxSheet_mm: { width: 640, height: 920 },
    minSheet_mm: { width: 297, height: 420 },
    gripperEdge_mm: 10,
    tailMargin_mm: 5,
    sideMargin_mm: 5,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: false,
    speedSPH: 6500,
    hourlyRate: 6000,
  },
  {
    id: "rmgt_perfecto",
    name: "RMGT 920 Perfecto",
    maxSheet_mm: { width: 640, height: 920 },
    minSheet_mm: { width: 297, height: 420 },
    gripperEdge_mm: 10,
    tailMargin_mm: 5,
    sideMargin_mm: 5,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: true,
    speedSPH: 5000,
    hourlyRate: 7500,
  },
];

// Backward compatibility alias - same data as MACHINE_DATABASE
// Used by autoPlanner.ts and legacy code
export const STANDARD_MACHINES = MACHINE_DATABASE;

// ─── SCORING WEIGHTS ────────────────────────────────────────────────────────

/**
 * Weights for the imposition candidate scoring function.
 * These control how the engine balances competing priorities.
 *
 * All weights sum to ~1.0 for the positive factors.
 * Grain penalty is SUBTRACTIVE and can dominate if non-compliant.
 */
export const SCORING_WEIGHTS = {
  /** Weight for sheet utilization efficiency (0–100 range) */
  EFFICIENCY: 0.50,
  /** Weight for plate count bonus (fewer plates = better) */
  PLATE_BONUS: 0.25,
  /** Weight for setup simplicity (fewer forms = better) */
  SIMPLICITY: 0.15,
  /** Weight for machine preference match */
  MACHINE_MATCH: 0.10,
  /**
   * Grain non-compliance penalty.
   * Applied as a SUBTRACTION from the total score.
   * Set high enough to make grain-compliant options always preferred,
   * but not so high that it blocks all options when NO grain-compliant
   * candidate exists (user gets a warning instead).
   */
  GRAIN_PENALTY: 40,
} as const;

// ─── WASTAGE CHART (Thomson Press) ──────────────────────────────────────────

export interface WastageEntry {
  readonly minQty: number;
  readonly maxQty: number;
  /** Make-ready sheets (flat count for small runs, % for large runs) */
  readonly mrSheets: number;
  /** Running waste (flat count or %) */
  readonly runningWaste: number;
  /** If true, values are percentages. If false, values are sheet counts. */
  readonly isPercentage: boolean;
}

/**
 * ADDITIVE wastage: total_waste = mr_sheets + running_sheets
 * NOT multiplicative. This is the Thomson Press method.
 */
export const WASTAGE_CHART: readonly WastageEntry[] = [
  { minQty: 0,     maxQty: 1000,  mrSheets: 200, runningWaste: 50,  isPercentage: false },
  { minQty: 1001,  maxQty: 2000,  mrSheets: 200, runningWaste: 75,  isPercentage: false },
  { minQty: 2001,  maxQty: 3000,  mrSheets: 200, runningWaste: 100, isPercentage: false },
  { minQty: 3001,  maxQty: 5000,  mrSheets: 200, runningWaste: 150, isPercentage: false },
  { minQty: 5001,  maxQty: 10000, mrSheets: 250, runningWaste: 2.0, isPercentage: true },
  { minQty: 10001, maxQty: 20000, mrSheets: 250, runningWaste: 2.0, isPercentage: true },
  { minQty: 20001, maxQty: 50000, mrSheets: 300, runningWaste: 2.5, isPercentage: true },
  { minQty: 50001, maxQty: Infinity, mrSheets: 350, runningWaste: 2.5, isPercentage: true },
];

/**
 * Look up wastage for a given quantity.
 * Returns ADDITIVE waste: total sheets = net + mr + running
 */
export function lookupWastage(
  quantity: number,
  netSheets: number,
): { mrSheets: number; runningSheets: number; totalWaste: number } {
  const entry = WASTAGE_CHART.find(
    (e) => quantity >= e.minQty && quantity <= e.maxQty,
  ) ?? WASTAGE_CHART[WASTAGE_CHART.length - 1];

  const mrSheets = entry.mrSheets;
  const runningSheets = entry.isPercentage
    ? Math.ceil(netSheets * (entry.runningWaste / 100))
    : entry.runningWaste;

  return {
    mrSheets,
    runningSheets,
    totalWaste: mrSheets + runningSheets,
  };
}

