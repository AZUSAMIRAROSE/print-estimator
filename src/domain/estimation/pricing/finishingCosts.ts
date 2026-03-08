/**
 * Finishing Costs - Lamination, Spot UV, Embossing, Foil Stamping, Die-Cutting
 * Calculates costs for all finishing effects applied to text or covers.
 */

import type { FinishingCostDetail } from "./costCalculator";

// ============================================================================
// FINISHING EFFECT SPECIFICATIONS
// ============================================================================

/**
 * Lamination specification
 */
export interface LaminationSpec {
  type: "gloss" | "matt" | "soft-touch";
  coverage: "full" | "partial";
  areaPerCopy?: number; // cm² for partial (e.g., cover front only)
  pages?: number; // if applied per page
}

/**
 * Spot UV specification
 */
export interface SpotUVSpec {
  coverage: "partial"; // Spot UV is always partial
  areaPerCopy: number; // cm² per copy
  pattern?: string; // e.g., "logo", "borders", "custom"
}

/**
 * Embossing specification
 */
export interface EmbossingSpec {
  coverage: "partial";
  areaPerCopy: number; // cm² per copy
  depth: "shallow" | "medium" | "deep"; // affects cost
}

/**
 * Foil stamping specification
 */
export interface FoilStampSpec {
  coverage: "partial";
  areaPerCopy: number; // cm² per copy
  foilColor: "gold" | "silver" | "custom";
}

/**
 * Die-cutting specification
 */
export interface DieCutSpec {
  coverage: "partial" | "full";
  complexity: "simple" | "moderate" | "complex"; // affects die cost
  setupCost: number; // Die cost, typically high
}

// ============================================================================
// FINISHING COST RATES (from rate card or user input)
// ============================================================================

/**
 * Default finishing rates (would come from rate card in production)
 */
export interface FinishingRates {
  lamination: {
    gloss: number;
    matt: number;
    softTouch: number;
  };
  spotUV: {
    baseRate: number; // per cm²
    setupCost: number;
  };
  embossing: {
    shallow: number;
    medium: number;
    deep: number;
  };
  foilStamp: {
    gold: number;
    silver: number;
    custom: number;
  };
  dieCut: {
    simpleDieSetup: number;
    moderateDieSetup: number;
    complexDieSetup: number;
    perCopyRate: number;
  };
}

/**
 * Standard finishing rates for Indian market
 */
export const DEFAULT_FINISHING_RATES: FinishingRates = {
  lamination: {
    gloss: 3.5, // per copy
    matt: 4.0,
    softTouch: 5.5,
  },
  spotUV: {
    baseRate: 0.15, // per cm²
    setupCost: 5000,
  },
  embossing: {
    shallow: 2.0,
    medium: 3.5,
    deep: 5.0,
  },
  foilStamp: {
    gold: 4.5,
    silver: 4.0,
    custom: 6.0,
  },
  dieCut: {
    simpleDieSetup: 8000,
    moderateDieSetup: 12000,
    complexDieSetup: 18000,
    perCopyRate: 0.8,
  },
};

// ============================================================================
// FINISHING COST CALCULATIONS
// ============================================================================

/**
 * Calculate lamination cost
 */
export function calculateLaminationCost(
  spec: LaminationSpec,
  quantity: number,
  rates: FinishingRates = DEFAULT_FINISHING_RATES
): FinishingCostDetail {
  const typeKey = spec.type === "soft-touch" ? "softTouch" : spec.type;
  const ratePerCopy = rates.lamination[typeKey as keyof typeof rates.lamination];
  const totalCost = ratePerCopy * quantity;

  return {
    type: "lamination",
    coverage: spec.coverage,
    areaPerCopy: spec.pages ? spec.pages * 297 * 210 / 10000 : undefined, // Rough A4 estimate
    ratePerUnit: ratePerCopy,
    setupCost: 0, // No setup for lamination
    quantity,
    totalCost,
  };
}

/**
 * Calculate Spot UV cost
 */
export function calculateSpotUVCost(
  spec: SpotUVSpec,
  quantity: number,
  rates: FinishingRates = DEFAULT_FINISHING_RATES
): FinishingCostDetail {
  const areaRate = rates.spotUV.baseRate;
  const costPerCopy = spec.areaPerCopy * areaRate;
  const totalCost = costPerCopy * quantity + rates.spotUV.setupCost;

  return {
    type: "spot-uv",
    coverage: "partial",
    areaPerCopy: spec.areaPerCopy,
    ratePerUnit: costPerCopy,
    setupCost: rates.spotUV.setupCost,
    quantity,
    totalCost,
  };
}

/**
 * Calculate embossing cost
 */
export function calculateEmbossingCost(
  spec: EmbossingSpec,
  quantity: number,
  rates: FinishingRates = DEFAULT_FINISHING_RATES
): FinishingCostDetail {
  const ratePerCopy = rates.embossing[spec.depth];
  const totalCost = ratePerCopy * quantity;

  return {
    type: "embossing",
    coverage: "partial",
    areaPerCopy: spec.areaPerCopy,
    ratePerUnit: ratePerCopy,
    setupCost: 0, // No additional setup beyond die
    quantity,
    totalCost,
  };
}

/**
 * Calculate foil stamping cost
 */
export function calculateFoilStampCost(
  spec: FoilStampSpec,
  quantity: number,
  rates: FinishingRates = DEFAULT_FINISHING_RATES
): FinishingCostDetail {
  const foilKey = spec.foilColor === "custom" ? "custom" : spec.foilColor;
  const ratePerCopy = rates.foilStamp[foilKey as keyof typeof rates.foilStamp];
  const totalCost = ratePerCopy * quantity;

  return {
    type: "foil-stamp",
    coverage: "partial",
    areaPerCopy: spec.areaPerCopy,
    ratePerUnit: ratePerCopy,
    setupCost: 0,
    quantity,
    totalCost,
  };
}

/**
 * Calculate die-cutting cost
 */
export function calculateDieCutCost(
  spec: DieCutSpec,
  quantity: number,
  rates: FinishingRates = DEFAULT_FINISHING_RATES
): FinishingCostDetail {
  let setupCost = spec.setupCost;
  if (!setupCost) {
    if (spec.complexity === "simple") setupCost = rates.dieCut.simpleDieSetup;
    else if (spec.complexity === "moderate") setupCost = rates.dieCut.moderateDieSetup;
    else setupCost = rates.dieCut.complexDieSetup;
  }

  const costPerCopy = rates.dieCut.perCopyRate;
  const totalCost = costPerCopy * quantity + setupCost;

  return {
    type: "die-cut",
    coverage: spec.coverage,
    ratePerUnit: costPerCopy,
    setupCost,
    quantity,
    totalCost,
  };
}

/**
 * Calculate all finishing effects at once
 */
export function calculateAllFinishingCosts(
  specs: {
    lamination?: LaminationSpec;
    spotUV?: SpotUVSpec;
    embossing?: EmbossingSpec;
    foilStamp?: FoilStampSpec;
    dieCut?: DieCutSpec;
  },
  quantity: number,
  rates: FinishingRates = DEFAULT_FINISHING_RATES
): FinishingCostDetail[] {
  const costs: FinishingCostDetail[] = [];

  if (specs.lamination) {
    costs.push(calculateLaminationCost(specs.lamination, quantity, rates));
  }

  if (specs.spotUV) {
    costs.push(calculateSpotUVCost(specs.spotUV, quantity, rates));
  }

  if (specs.embossing) {
    costs.push(calculateEmbossingCost(specs.embossing, quantity, rates));
  }

  if (specs.foilStamp) {
    costs.push(calculateFoilStampCost(specs.foilStamp, quantity, rates));
  }

  if (specs.dieCut) {
    costs.push(calculateDieCutCost(specs.dieCut, quantity, rates));
  }

  return costs;
}

/**
 * Get finishing effect description for quotation
 */
export function getFinishingDescription(cost: FinishingCostDetail): string {
  const descriptions: Record<string, string> = {
    lamination: `Lamination - ${cost.quantity} copies`,
    "spot-uv": `Spot UV (${(cost.areaPerCopy || 0).toFixed(0)}cm² per copy)`,
    embossing: "Embossing",
    "foil-stamp": "Foil Stamping",
    "die-cut": "Die-Cutting",
  };

  return descriptions[cost.type] || cost.type;
}
