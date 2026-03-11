/**
 * Physical constants and standard data for the estimation system
 * Includes press specifications, standard sheet sizes, signature formats,
 * scoring weights, and other reference data.
 */

import type {
  SheetSpecification,
  MachineSpecification,
  Dimensions,
} from "./types";

// ============================================================================
// PHYSICAL CONSTANTS
// ============================================================================

/** Bleed allowance in millimeters (added to trim size) */
export const BLEED_ALLOWANCE_MM = 3;

/** Trim mark size in millimeters on each corner */
export const TRIM_MARK_SIZE_MM = 5;

/** Color bar width in millimeters (includes space on each side) */
export const COLOR_BAR_WIDTH_MM = 10;

/** Gutter between pages on the sheet (butt-cut = 0) */
export const GUTTER_MM = 0;

/** Default gripper edge (non-printable zone at leading edge) */
export const DEFAULT_GRIPPER_EDGE_MM = 10;

/** Default tail edge (non-printable zone at trailing edge) */
export const DEFAULT_TAIL_EDGE_MM = 5;

/** Side margin on both left and right */
export const SIDE_MARGIN_MM = 5;

// ============================================================================
// STANDARD SIGNATURE SIZES
// ============================================================================

/** Standard signature page counts in binding order */
export const STANDARD_SIGNATURE_SIZES = [4, 8, 12, 16, 24, 32] as const;

/**
 * Calculate pages per side given total signature pages
 */
export function getPagesPerSide(signaturePages: number): number {
  return signaturePages / 2;
}

/**
 * Get all factor pairs of a number (for finding layout options)
 * e.g., 16 → [[1,16], [2,8], [4,4], [8,2], [16,1]]
 */
export function getFactorPairs(n: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 1; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      pairs.push([i, n / i]);
      if (i !== n / i) {
        pairs.push([n / i, i]);
      }
    }
  }
  return pairs.sort((a, b) => a[0] - b[0]);
}

// ============================================================================
// STANDARD SHEET SIZES
// ============================================================================

/** Standard sheet sizes commonly available in print shops */
export const STANDARD_SHEETS: SheetSpecification[] = [
  // SRA3 (ISO RA3)
  {
    id: "sra3-lg",
    label: "SRA3 Long Grain",
    width: 320,
    height: 450,
    grain: "long",
  },
  {
    id: "sra3-sg",
    label: "SRA3 Short Grain",
    width: 450,
    height: 320,
    grain: "short",
  },

  // Small format (Indian market standard)
  {
    id: "small-lg",
    label: "20×30 Long Grain",
    width: 508, // 20"
    height: 762, // 30"
    grain: "long",
  },
  {
    id: "small-sg",
    label: "20×30 Short Grain",
    width: 762,
    height: 508,
    grain: "short",
  },

  // Medium format
  {
    id: "medium-lg",
    label: "23×36 Long Grain",
    width: 584, // 23"
    height: 914, // 36"
    grain: "long",
  },
  {
    id: "medium-sg",
    label: "23×36 Short Grain",
    width: 914,
    height: 584,
    grain: "short",
  },

  // Medium format variant
  {
    id: "medium2-lg",
    label: "25×36 Long Grain",
    width: 635, // 25"
    height: 914, // 36"
    grain: "long",
  },
  {
    id: "medium2-sg",
    label: "25×36 Short Grain",
    width: 914,
    height: 635,
    grain: "short",
  },

  // Large format
  {
    id: "large-lg",
    label: "28×40 Long Grain",
    width: 711, // 28"
    height: 1016, // 40"
    grain: "long",
  },
  {
    id: "large-sg",
    label: "28×40 Short Grain",
    width: 1016,
    height: 711,
    grain: "short",
  },
];

/**
 * Find sheet by ID
 */
export function getSheetById(id: string): SheetSpecification | undefined {
  return STANDARD_SHEETS.find((s) => s.id === id);
}

// ============================================================================
// STANDARD TRIM SIZES
// ============================================================================

export const STANDARD_TRIM_SIZES: Dimensions[] = [
  // A-series (ISO)
  { width: 148, height: 210 }, // A5
  { width: 210, height: 297 }, // A4
  { width: 297, height: 420 }, // A3

  // Crown and other standards
  { width: 153, height: 234 }, // Crown (common in Indian market)
  { width: 152, height: 228 }, // Royal
  { width: 178, height: 254 }, // Demy
  { width: 203, height: 254 }, // Medium

  // Metric
  { width: 170, height: 240 }, // B5
  { width: 120, height: 180 }, // Small format

  // US Letter/Legal
  { width: 216, height: 279 }, // US Letter (8.5×11")
  { width: 216, height: 356 }, // US Legal
];

/**
 * Find closest standard trim size
 */
export function findClosestTrimSize(target: Dimensions): Dimensions {
  return STANDARD_TRIM_SIZES.reduce((closest, current) => {
    const targetArea = target.width * target.height;
    const currentArea = current.width * current.height;
    const closestArea = closest.width * closest.height;

    const currentDiff = Math.abs(currentArea - targetArea);
    const closestDiff = Math.abs(closestArea - targetArea);

    return currentDiff < closestDiff ? current : closest;
  });
}

// ============================================================================
// STANDARD MACHINE SPECIFICATIONS
// ============================================================================

export const STANDARD_MACHINES: MachineSpecification[] = [
  {
    id: "heidelberg-24",
    name: "Heidelberg Platen 24×36",
    class: "offset",
    minSheetWidth: 280,
    maxSheetWidth: 600,
    minSheetHeight: 400,
    maxSheetHeight: 920,
    maxSheetsPerHour: 10000,
    maxColorCount: 4,
    hasPerfector: false,
    gripperEdge: 10,
    tailEdge: 5,
    canPrintToEdge: false,
    supportedMethods: ["sheetwise", "work-and-turn"],
  },
  {
    id: "komori-ls",
    name: "Komori Lithrone 28×40",
    class: "offset",
    minSheetWidth: 280,
    maxSheetWidth: 730,
    minSheetHeight: 400,
    maxSheetHeight: 1050,
    maxSheetsPerHour: 12000,
    maxColorCount: 4,
    hasPerfector: true,
    gripperEdge: 10,
    tailEdge: 5,
    canPrintToEdge: false,
    supportedMethods: ["sheetwise", "work-and-turn", "perfecting"],
  },
  {
    id: "manroland-700",
    name: "Man Roland 700 DI",
    class: "offset",
    minSheetWidth: 320,
    maxSheetWidth: 730,
    minSheetHeight: 450,
    maxSheetHeight: 1050,
    maxSheetsPerHour: 14000,
    maxColorCount: 6,
    hasPerfector: false,
    gripperEdge: 10,
    tailEdge: 5,
    canPrintToEdge: false,
    supportedMethods: ["sheetwise", "work-and-turn"],
  },
  {
    id: "heidelberg-prosetter",
    name: "Heidelberg SM 52",
    class: "offset",
    minSheetWidth: 210,
    maxSheetWidth: 520,
    minSheetHeight: 297,
    maxSheetHeight: 800,
    maxSheetsPerHour: 8000,
    maxColorCount: 4,
    hasPerfector: false,
    gripperEdge: 10,
    tailEdge: 5,
    canPrintToEdge: false,
    supportedMethods: ["sheetwise", "work-and-turn"],
  },
];

/**
 * Find machine by ID
 */
export function getMachineById(id: string): MachineSpecification | undefined {
  return STANDARD_MACHINES.find((m) => m.id === id);
}

// ============================================================================
// SCORING WEIGHTS AND THRESHOLDS
// ============================================================================

/**
 * Weights for scoring imposition candidates
 * Sum should be approximately 100 for normalized scores
 */
export const SCORING_WEIGHTS = {
  /** Weight for paper efficiency (waste %) */
  wasteEfficiency: 40,

  /** Weight for grain direction compliance */
  grainCompliance: 35,

  /** Weight for plate cost efficiency */
  plateEfficiency: 15,

  /** Weight for sheet count efficiency */
  sheetEfficiency: 10,
} as const;

/**
 * Grain direction penalties
 */
export const GRAIN_PENALTIES = {
  /** Penalty when grain is perpendicular to spine (severe) */
  perpendicular: 100, // Effectively blocks this option

  /** Penalty when grain is suboptimal (not ideal but acceptable) */
  suboptimal: 20,

  /** No penalty when compliant */
  compliant: 0,
} as const;

/**
 * Minimum efficiency threshold (0-100)
 * Candidates below this are considered low quality
 */
export const MIN_EFFICIENCY_SCORE = 30;

/**
 * Maximum acceptable waste percentage
 * By default allows up to 35%; can be overridden per job
 */
export const MAX_WASTE_PERCENTAGE = 35;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate caliper (thickness) in millimeters from GSM and bulk factor
 * Caliper (mm) = GSM / 1000 × Bulk Factor
 */
export function calculateCaliper(gsm: number, bulkFactor: number): number {
  return (gsm / 1000) * bulkFactor;
}

/**
 * Calculate weight of paper given sheet dimensions and GSM
 * Weight (kg) = (width × height in meters) × GSM / 1000
 */
export function calculatePaperWeight(
  width: number,
  height: number,
  gsm: number
): number {
  const areaM2 = (width / 1000) * (height / 1000);
  return areaM2 * gsm;
}

/**
 * Convert sheet dimensions to get the orientation name
 */
export function getSheetOrientation(width: number, height: number): "portrait" | "landscape" {
  return height > width ? "portrait" : "landscape";
}

/**
 * Check if a sheet size fits within machine constraints
 */
export function sheetFitsInMachine(
  sheetWidth: number,
  sheetHeight: number,
  machine: MachineSpecification
): boolean {
  return (
    sheetWidth >= machine.minSheetWidth &&
    sheetWidth <= machine.maxSheetWidth &&
    sheetHeight >= machine.minSheetHeight &&
    sheetHeight <= machine.maxSheetHeight
  );
}

/**
 * Get the color count in bitmap form (cmyk = 4)
 */
export function getColorBitCount(colorSpec: "black" | "4color"): number {
  return colorSpec === "black" ? 1 : 4;
}
