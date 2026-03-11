/**
 * Binding Costs - Perfect Binding, Saddle Stitching, Wire Binding, Case Binding
 * Calculates costs for different binding methods based on page count and quantity.
 */

import type { BindingCostDetail } from "./costCalculator";

// ============================================================================
// BINDING SPECIFICATIONS
// ============================================================================

/**
 * Perfect binding (glued spine, for paperback books)
 */
export interface PerfectBindingSpec {
  type: "perfect";
  totalPages: number;
  binding16pp?: number; // Rate per 16-page signature
  gatheringRate?: number; // Gathering cost per copy
  setupCost?: number; // Spine preparation cost
}

/**
 * Saddle stitching (stapled through the fold for booklets)
 */
export interface SaddleStitchingSpec {
  type: "saddle-stitch";
  totalPages: number;
  ratePerCopy?: number;
  setupCost?: number;
}

/**
 * Wire-O binding (spiral binding)
 */
export interface WireBindingSpec {
  type: "wire";
  wireDiameter: "6mm" | "8mm" | "10mm" | "12mm";
  totalPages: number;
  wireQuantity: number;
  costPerWire?: number;
  setupCost?: number;
}

/**
 * Case binding (hardcover binding)
 */
export interface CaseBindingSpec {
  type: "case";
  totalPages: number;
  boardType: "binders-board" | "grey-board" | "chipboard";
  caseQuantity: number;
  costPerCase?: number;
  cassingInRate?: number; // Inserting book into case
  setupCost?: number;
}

/**
 * No binding (loose sheets)
 */
export interface NoBindingSpec {
  type: "none";
}

// ============================================================================
// BINDING RATE SPECIFICATIONS
// ============================================================================

/**
 * Binding rates from rate card
 */
export interface BindingRates {
  perfectBinding: {
    ratePerCopy: number; // Binding cost per copy
    gathering16pp: number; // Cost per 16-page signature for gathering
    setupCost: number; // One-time spine prep
  };
  saddleStitching: {
    ratePerCopy: number;
    setupCost: number;
  };
  wireBinding: {
    costPer100: number; // Cost per 100 spiral binds
    setupCost: number;
  };
  caseBinding: {
    cassingInRate: number; // Inserting book into case
    casePrep: number; // Case manufacturing cost per case
    setupCost: number;
  };
}

/**
 * Default binding rates for Indian market
 */
export const DEFAULT_BINDING_RATES: BindingRates = {
  perfectBinding: {
    ratePerCopy: 4.5,
    gathering16pp: 0.25,
    setupCost: 3000,
  },
  saddleStitching: {
    ratePerCopy: 1.5,
    setupCost: 1500,
  },
  wireBinding: {
    costPer100: 850,
    setupCost: 2000,
  },
  caseBinding: {
    cassingInRate: 8.0,
    casePrep: 35.0, // Per case
    setupCost: 5000,
  },
};

// ============================================================================
// BINDING COST CALCULATIONS
// ============================================================================

/**
 * Calculate perfect binding cost
 * Cost includes gathering, binding, and spine handling
 */
export function calculatePerfectBindingCost(
  spec: PerfectBindingSpec,
  quantity: number,
  rates: BindingRates = DEFAULT_BINDING_RATES
): BindingCostDetail {
  const bindingRate = spec.binding16pp || rates.perfectBinding.ratePerCopy;
  const gatheringRate = spec.gatheringRate || rates.perfectBinding.gathering16pp;

  // Estimate gathering signatures (assume 16pp per signature)
  const numSignatures = Math.ceil(spec.totalPages / 16);

  // Cost per copy = binding + (gathering cost per signature × number of signatures)
  const costPerCopy = bindingRate + gatheringRate * numSignatures;
  const setupCost = spec.setupCost ?? rates.perfectBinding.setupCost;

  const totalCost = costPerCopy * quantity + setupCost;

  return {
    method: "perfect",
    totalPages: spec.totalPages,
    quantity,
    ratePerUnit: costPerCopy,
    setupCost,
    totalCost,
  };
}

/**
 * Calculate saddle stitching cost
 * Typically for small booklets (up to 64 pages)
 */
export function calculateSaddleStitchingCost(
  spec: SaddleStitchingSpec,
  quantity: number,
  rates: BindingRates = DEFAULT_BINDING_RATES
): BindingCostDetail {
  if (spec.totalPages > 100) {
    console.warn(
      "Saddle stitching recommended only for booklets up to 64-100 pages"
    );
  }

  const ratePerCopy = spec.ratePerCopy ?? rates.saddleStitching.ratePerCopy;
  const setupCost = spec.setupCost ?? rates.saddleStitching.setupCost;

  const totalCost = ratePerCopy * quantity + setupCost;

  return {
    method: "saddle-stitch",
    totalPages: spec.totalPages,
    quantity,
    ratePerUnit: ratePerCopy,
    setupCost,
    totalCost,
  };
}

/**
 * Calculate wire binding cost
 * Also called spiral binding or spiral binding
 */
export function calculateWireBindingCost(
  spec: WireBindingSpec,
  quantity: number,
  rates: BindingRates = DEFAULT_BINDING_RATES
): BindingCostDetail {
  const costPer100 = rates.wireBinding.costPer100;
  const costPerWire = (costPer100 / 100) * (spec.costPerWire ? 1 : 1);

  // Wire cost is per wire used, quantity is wires for this job
  const wireTotal = costPerWire * spec.wireQuantity;
  const setupCost = spec.setupCost ?? rates.wireBinding.setupCost;

  const totalCost = wireTotal + setupCost;

  return {
    method: "wire",
    totalPages: spec.totalPages,
    quantity,
    ratePerUnit: costPerWire,
    setupCost,
    totalCost,
  };
}

/**
 * Calculate case binding cost (hardcover)
 * Includes case manufacturing and cashing-in (inserting book into case)
 */
export function calculateCaseBindingCost(
  spec: CaseBindingSpec,
  quantity: number,
  rates: BindingRates = DEFAULT_BINDING_RATES
): BindingCostDetail {
  const cassingInRate = spec.cassingInRate ?? rates.caseBinding.cassingInRate;
  const casePrice = spec.costPerCase ?? rates.caseBinding.casePrep;

  // Total cost = (case price + cashing in) × quantity + setup
  const costPerCopy = casePrice + cassingInRate;
  const setupCost = spec.setupCost ?? rates.caseBinding.setupCost;

  const totalCost = costPerCopy * quantity + setupCost;

  return {
    method: "case",
    totalPages: spec.totalPages,
    quantity,
    ratePerUnit: costPerCopy,
    setupCost,
    totalCost,
  };
}

/**
 * Get binding cost for any binding type
 */
export function calculateBindingCostByType(
  spec:
    | PerfectBindingSpec
    | SaddleStitchingSpec
    | WireBindingSpec
    | CaseBindingSpec
    | NoBindingSpec,
  quantity: number,
  rates?: BindingRates
): BindingCostDetail | null {
  const ratesUsed = rates || DEFAULT_BINDING_RATES;

  if ("type" in spec) {
    switch (spec.type) {
      case "perfect":
        return calculatePerfectBindingCost(spec, quantity, ratesUsed);
      case "saddle-stitch":
        return calculateSaddleStitchingCost(spec, quantity, ratesUsed);
      case "wire":
        return calculateWireBindingCost(spec, quantity, ratesUsed);
      case "case":
        return calculateCaseBindingCost(spec, quantity, ratesUsed);
      case "none":
        return null;
    }
  }

  return null;
}

/**
 * Get binding method recommendation based on page count and quantity
 */
export function recommendBindingMethod(
  totalPages: number,
  quantity: number
): string {
  if (totalPages <= 64) {
    return quantity < 5000
      ? "saddle-stitch (most economical)"
      : "perfect-bind (if staking needed)";
  }

  if (totalPages <= 200) {
    return "perfect-bind (standard for trade paperbacks)";
  }

  if (totalPages <= 400) {
    return "case-bind (hardcover, premium)";
  }

  return "case-bind (required for very thick books)";
}

/**
 * Get binding cost range for planning
 */
export function getBindingCostRange(
  totalPages: number,
  quantity: number
): { method: string; minCost: number; maxCost: number } {
  const rates = DEFAULT_BINDING_RATES;

  let method = "";
  let costPerCopy = 0;

  if (totalPages <= 64) {
    method = "Saddle Stitching";
    costPerCopy = rates.saddleStitching.ratePerCopy;
  } else if (totalPages <= 200) {
    method = "Perfect Binding";
    costPerCopy = rates.perfectBinding.ratePerCopy;
  } else {
    method = "Case Binding";
    costPerCopy = rates.caseBinding.cassingInRate + rates.caseBinding.casePrep;
  }

  const minCost = costPerCopy * quantity + 1000; // Approximate minimum setup
  const maxCost = costPerCopy * quantity + 5000; // Approximate maximum setup

  return { method, minCost, maxCost };
}
