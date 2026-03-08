// ============================================================================
// PAPER RESOLVER — FIND, MATCH & COST PAPER FROM INVENTORY + RATE CARD
// ============================================================================
//
// Pipeline:
//   1. Receive required paper spec (category, GSM, grain, sheet size)
//   2. Search inventory for exact or compatible matches
//   3. Search rate card for pricing
//   4. Handle custom GSM (user-supplied bulk, grain, size)
//   5. Calculate cost per sheet, cost per kg, total cost
//   6. Generate procurement recommendation if unavailable
//   7. Return ranked candidates with source metadata
//
// Data sources (injected at runtime from stores / API):
//   - Inventory store (real stock levels, SKUs)
//   - Rate card store (pricing by category/GSM)
//   - Constants (fallback defaults)
//
// This module is PURE — no store imports. Callers inject data.
// ============================================================================

import type {
  PaperSpec,
  PaperCategory,
  SheetSpec,
  CustomPaperOverride,
  GrainDirection,
  ProcurementRecommendation,
  FieldSource,
  Dimensions_mm,
} from "./types";

import {
  BULK_FACTORS,
  calculateCaliper,
  STANDARD_SHEETS,
  INCH_TO_MM,
} from "./constants";

// ─── INPUT / OUTPUT TYPES ───────────────────────────────────────────────────

/** What we need to find paper for */
export interface PaperRequirement {
  /** Paper category (MATT_ART, GLOSS_ART, etc.) */
  readonly category: PaperCategory;
  /** Target GSM */
  readonly gsm: number;
  /** Required grain direction for binding compliance */
  readonly requiredGrain: GrainDirection;
  /** Sheet size determined by imposition engine */
  readonly sheetSpec: SheetSpec;
  /** Total gross sheets needed (net + wastage) */
  readonly grossSheets: number;
  /** Quantity being estimated (for wastage lookup) */
  readonly quantity: number;
  /** User-supplied custom paper override (if custom GSM) */
  readonly customOverride?: CustomPaperOverride;
}

/** A single inventory item (injected from inventory store) */
export interface InventoryPaperItem {
  readonly id: string;
  readonly name: string;
  readonly sku: string;
  readonly category: PaperCategory;
  readonly gsm: number;
  readonly grain: GrainDirection;
  /** Sheet size label, e.g. "23×36" */
  readonly sheetLabel: string;
  readonly sheetSize_mm: Dimensions_mm;
  /** Current stock in sheets */
  readonly stockSheets: number;
  /** Cost per kg from last purchase */
  readonly costPerKg: number;
  /** Cost per sheet (derived or direct) */
  readonly costPerSheet: number;
  readonly supplier?: string;
  readonly lastUpdated: string;
}

/** A rate card entry (injected from rate card store) */
export interface RateCardPaperEntry {
  readonly category: PaperCategory;
  readonly gsm: number;
  /** Rate per kg in INR */
  readonly ratePerKg: number;
  /** Rate per ream (500 sheets) if available */
  readonly ratePerReam?: number;
  readonly sheetLabel?: string;
  readonly isActive: boolean;
}

/** A resolved paper candidate with full costing */
export interface PaperCandidate {
  /** Unique ID for this candidate */
  readonly candidateId: string;
  /** The paper specification */
  readonly paper: PaperSpec;
  /** Sheet being used */
  readonly sheet: SheetSpec;
  /** Where this candidate came from */
  readonly source: FieldSource;

  // ── Costing ──
  /** Cost per sheet in INR */
  readonly costPerSheet: number;
  /** Cost per kg in INR */
  readonly costPerKg: number;
  /** Weight per sheet in kg */
  readonly weightPerSheet_kg: number;
  /** Weight per ream (500 sheets) in kg */
  readonly weightPerReam_kg: number;
  /** Total cost for grossSheets */
  readonly totalCost: number;
  /** Total weight in kg */
  readonly totalWeight_kg: number;

  // ── Availability ──
  /** Is this available in inventory? */
  readonly inStock: boolean;
  /** Available sheets in inventory (0 if not in stock) */
  readonly availableSheets: number;
  /** Shortfall: how many sheets need to be procured */
  readonly shortfall: number;

  // ── Scoring ──
  /** 0–100 composite score */
  readonly score: number;
  /** Breakdown of score components */
  readonly scoreBreakdown: {
    readonly costScore: number;
    readonly availabilityScore: number;
    readonly grainScore: number;
    readonly gsmMatchScore: number;
  };

  // ── Metadata ──
  readonly inventoryItemId?: string;
  readonly supplier?: string;
  readonly confidence: number;
  readonly notes: string[];
}

/** Complete resolution result */
export interface PaperResolutionResult {
  /** Best candidate (highest score) */
  readonly selected: PaperCandidate | null;
  /** Alternative candidates sorted by score */
  readonly alternatives: PaperCandidate[];
  /** Procurement recommendation if stock is insufficient */
  readonly procurement: ProcurementRecommendation | null;
  /** Diagnostic messages */
  readonly diagnostics: Array<{
    readonly level: "INFO" | "WARN" | "ERROR";
    readonly message: string;
  }>;
}

// ─── PAPER PHYSICS ──────────────────────────────────────────────────────────

/**
 * Calculate weight of one sheet in kg.
 * Formula: (width_m × height_m × gsm) / 1000
 *
 * width_m and height_m are sheet dimensions in meters.
 * GSM = grams per square meter
 * Result is in kg.
 */
export function sheetWeight_kg(
  sheetSize_mm: Dimensions_mm,
  gsm: number,
): number {
  const area_m2 = (sheetSize_mm.width / 1000) * (sheetSize_mm.height / 1000);
  return (area_m2 * gsm) / 1000;
}

/**
 * Calculate weight per ream (500 sheets) in kg.
 */
export function reamWeight_kg(
  sheetSize_mm: Dimensions_mm,
  gsm: number,
): number {
  return sheetWeight_kg(sheetSize_mm, gsm) * 500;
}

/**
 * Calculate cost per sheet from cost per kg.
 */
export function costPerSheetFromKg(
  sheetSize_mm: Dimensions_mm,
  gsm: number,
  costPerKg: number,
): number {
  return sheetWeight_kg(sheetSize_mm, gsm) * costPerKg;
}

/**
 * Calculate cost per sheet from ream rate.
 */
export function costPerSheetFromReam(ratePerReam: number): number {
  return ratePerReam / 500;
}

// ─── PAPER SPEC BUILDER ─────────────────────────────────────────────────────

/**
 * Build a PaperSpec from category + GSM, using defaults or custom override.
 */
export function buildPaperSpec(
  code: string,
  name: string,
  category: PaperCategory,
  gsm: number,
  grain: GrainDirection,
  customOverride?: CustomPaperOverride,
): PaperSpec {
  const bulk = customOverride?.bulkFactor ?? BULK_FACTORS[category];
  const effectiveGrain = customOverride?.grain ?? grain;

  return {
    code,
    name,
    category,
    gsm: customOverride?.gsm ?? gsm,
    bulkFactor: bulk,
    caliper_microns: calculateCaliper(customOverride?.gsm ?? gsm, bulk),
    grain: effectiveGrain,
  };
}

// ─── INVENTORY MATCHING ─────────────────────────────────────────────────────

/**
 * Score how well an inventory item matches a requirement.
 * Returns 0–100 (100 = perfect match).
 */
function matchScore(
  item: InventoryPaperItem,
  req: PaperRequirement,
): number {
  let score = 0;

  // Category match (exact = 30pts)
  if (item.category === req.category) score += 30;

  // GSM match (exact = 25pts, ±10 = 15pts, ±20 = 5pts)
  const gsmDiff = Math.abs(item.gsm - req.gsm);
  if (gsmDiff === 0) score += 25;
  else if (gsmDiff <= 10) score += 15;
  else if (gsmDiff <= 20) score += 5;

  // Sheet size match (exact label = 20pts)
  if (item.sheetLabel === req.sheetSpec.label) score += 20;

  // Grain match (exact = 15pts)
  if (item.grain === req.requiredGrain) score += 15;

  // Stock availability (enough = 10pts, partial = 5pts)
  if (item.stockSheets >= req.grossSheets) score += 10;
  else if (item.stockSheets > 0) score += 5;

  return score;
}

/**
 * Search inventory for paper matching the requirement.
 * Returns candidates sorted by match score.
 */
export function searchInventory(
  requirement: PaperRequirement,
  inventory: readonly InventoryPaperItem[],
): PaperCandidate[] {
  const candidates: PaperCandidate[] = [];

  // Filter to same category and compatible GSM range (±20)
  const compatible = inventory.filter((item) => {
    if (item.category !== requirement.category) return false;
    if (Math.abs(item.gsm - requirement.gsm) > 20) return false;
    // Sheet size must match (imposition was planned for this size)
    if (item.sheetLabel !== requirement.sheetSpec.label) return false;
    return true;
  });

  for (const item of compatible) {
    const weight = sheetWeight_kg(item.sheetSize_mm, item.gsm);
    const costSheet = item.costPerSheet > 0
      ? item.costPerSheet
      : costPerSheetFromKg(item.sheetSize_mm, item.gsm, item.costPerKg);

    const totalCost = costSheet * requirement.grossSheets;
    const totalWeightKg = weight * requirement.grossSheets;
    const shortfall = Math.max(0, requirement.grossSheets - item.stockSheets);

    const mScore = matchScore(item, requirement);
    const costScore = Math.max(0, 25 - (costSheet * 10)); // Lower cost = higher score
    const availScore = shortfall === 0 ? 25 : (item.stockSheets / requirement.grossSheets) * 25;
    const grainScore = item.grain === requirement.requiredGrain ? 25 : 0;
    const gsmScore = item.gsm === requirement.gsm ? 25 : Math.max(0, 25 - Math.abs(item.gsm - requirement.gsm));

    const compositeScore = (costScore + availScore + grainScore + gsmScore) / 4 * (mScore / 100);

    const notes: string[] = [];
    if (item.gsm !== requirement.gsm) {
      notes.push(`GSM differs: have ${item.gsm}, need ${requirement.gsm}`);
    }
    if (shortfall > 0) {
      notes.push(`Shortfall: ${shortfall} sheets need procurement`);
    }
    if (item.grain !== requirement.requiredGrain) {
      notes.push(`Grain mismatch: have ${item.grain}, need ${requirement.requiredGrain}`);
    }

    const paper = buildPaperSpec(
      item.sku || item.id,
      item.name,
      item.category,
      item.gsm,
      item.grain,
    );

    candidates.push({
      candidateId: `inv_${item.id}`,
      paper,
      sheet: {
        ...requirement.sheetSpec,
        inStock: item.stockSheets > 0,
        costPerSheet: costSheet,
        costPerKg: item.costPerKg,
      },
      source: "INVENTORY",
      costPerSheet: costSheet,
      costPerKg: item.costPerKg,
      weightPerSheet_kg: weight,
      weightPerReam_kg: weight * 500,
      totalCost,
      totalWeight_kg: totalWeightKg,
      inStock: item.stockSheets > 0,
      availableSheets: item.stockSheets,
      shortfall,
      score: compositeScore,
      scoreBreakdown: {
        costScore,
        availabilityScore: availScore,
        grainScore,
        gsmMatchScore: gsmScore,
      },
      inventoryItemId: item.id,
      supplier: item.supplier,
      confidence: shortfall === 0 ? 0.95 : 0.6,
      notes,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// ─── RATE CARD MATCHING ─────────────────────────────────────────────────────

/**
 * Search rate card for paper pricing.
 * Used when inventory doesn't have stock or as price reference.
 */
export function searchRateCard(
  requirement: PaperRequirement,
  rateCard: readonly RateCardPaperEntry[],
): PaperCandidate[] {
  const candidates: PaperCandidate[] = [];

  // Find matching rate card entries
  const matching = rateCard.filter((entry) => {
    if (!entry.isActive) return false;
    if (entry.category !== requirement.category) return false;
    if (Math.abs(entry.gsm - requirement.gsm) > 20) return false;
    return true;
  });

  for (const entry of matching) {
    const sheetSize = requirement.sheetSpec.size_mm;
    const weight = sheetWeight_kg(sheetSize, entry.gsm);

    // Prefer ream rate if available, else derive from kg rate
    const costSheet = entry.ratePerReam
      ? costPerSheetFromReam(entry.ratePerReam)
      : costPerSheetFromKg(sheetSize, entry.gsm, entry.ratePerKg);

    const totalCost = costSheet * requirement.grossSheets;
    const totalWeightKg = weight * requirement.grossSheets;

    const gsmScore = entry.gsm === requirement.gsm ? 25 : Math.max(0, 25 - Math.abs(entry.gsm - requirement.gsm));
    const costScore = Math.max(0, 25 - (costSheet * 5));

    const paper = buildPaperSpec(
      `rc_${entry.category}_${entry.gsm}`,
      `${entry.category.replace(/_/g, " ")} ${entry.gsm}gsm`,
      entry.category,
      entry.gsm,
      requirement.requiredGrain,
    );

    candidates.push({
      candidateId: `rc_${entry.category}_${entry.gsm}`,
      paper,
      sheet: {
        ...requirement.sheetSpec,
        costPerSheet: costSheet,
        costPerKg: entry.ratePerKg,
      },
      source: "RATE_CARD",
      costPerSheet: costSheet,
      costPerKg: entry.ratePerKg,
      weightPerSheet_kg: weight,
      weightPerReam_kg: weight * 500,
      totalCost,
      totalWeight_kg: totalWeightKg,
      inStock: false,
      availableSheets: 0,
      shortfall: requirement.grossSheets,
      score: (costScore + gsmScore) / 2,
      scoreBreakdown: {
        costScore,
        availabilityScore: 0,
        grainScore: 25, // Rate card grain is assumed matching
        gsmMatchScore: gsmScore,
      },
      confidence: 0.7,
      notes: ["Price from rate card — procurement required"],
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// ─── CUSTOM PAPER HANDLING ──────────────────────────────────────────────────

/**
 * Build a candidate from a user-supplied custom paper spec.
 * Used when the GSM or paper type isn't in the system.
 */
export function buildCustomCandidate(
  requirement: PaperRequirement,
  customOverride: CustomPaperOverride,
  userCostPerKg: number,
): PaperCandidate {
  const effectiveGsm = customOverride.gsm || requirement.gsm;
  const sheetSize = customOverride.sheetSize ?? requirement.sheetSpec.size_mm;

  const paper = buildPaperSpec(
    `custom_${effectiveGsm}`,
    `Custom ${effectiveGsm}gsm`,
    requirement.category,
    effectiveGsm,
    customOverride.grain,
    customOverride,
  );

  const weight = sheetWeight_kg(sheetSize, effectiveGsm);
  const costSheet = costPerSheetFromKg(sheetSize, effectiveGsm, userCostPerKg);
  const totalCost = costSheet * requirement.grossSheets;

  return {
    candidateId: `custom_${effectiveGsm}_${customOverride.grain}`,
    paper,
    sheet: {
      ...requirement.sheetSpec,
      size_mm: sheetSize,
      costPerSheet: costSheet,
      costPerKg: userCostPerKg,
    },
    source: "USER_OVERRIDE",
    costPerSheet: costSheet,
    costPerKg: userCostPerKg,
    weightPerSheet_kg: weight,
    weightPerReam_kg: weight * 500,
    totalCost,
    totalWeight_kg: weight * requirement.grossSheets,
    inStock: false,
    availableSheets: 0,
    shortfall: requirement.grossSheets,
    score: 50, // Neutral score — user choice
    scoreBreakdown: {
      costScore: 12.5,
      availabilityScore: 0,
      grainScore: 25,
      gsmMatchScore: 12.5,
    },
    confidence: 0.5,
    notes: ["Custom paper specification — user-provided values"],
  };
}

// ─── PROCUREMENT RECOMMENDATION ─────────────────────────────────────────────

/**
 * Generate a procurement recommendation for paper that needs ordering.
 */
export function buildProcurement(
  requirement: PaperRequirement,
  bestCandidate: PaperCandidate,
): ProcurementRecommendation {
  const shortfall = bestCandidate.shortfall;

  // Add 5% buffer to procurement quantity
  const procureSheets = Math.ceil(shortfall * 1.05);
  const procureWeight = bestCandidate.weightPerSheet_kg * procureSheets;

  return {
    paperSpec: bestCandidate.paper,
    sheetSpec: bestCandidate.sheet,
    quantitySheets: procureSheets,
    quantityKg: procureWeight,
    inventoryMatch: bestCandidate.inStock
      ? {
          itemId: bestCandidate.inventoryItemId!,
          availableSheets: bestCandidate.availableSheets,
          shortfall,
        }
      : undefined,
    estimatedCost: bestCandidate.costPerKg * procureWeight,
    leadTime_days: shortfall > 5000 ? 14 : 7,
    confidence: bestCandidate.confidence * 0.8,
  };
}

// ─── MAIN RESOLVER ──────────────────────────────────────────────────────────

/**
 * Resolve paper for a section.
 *
 * Search order:
 *   1. Custom override (if user supplied custom GSM)
 *   2. Inventory (exact match preferred)
 *   3. Rate card (for pricing reference)
 *   4. Generate procurement recommendation
 *
 * Returns the best candidate + alternatives + procurement if needed.
 */
export function resolvePaper(
  requirement: PaperRequirement,
  inventory: readonly InventoryPaperItem[],
  rateCard: readonly RateCardPaperEntry[],
  customCostPerKg?: number,
): PaperResolutionResult {
  const diagnostics: PaperResolutionResult["diagnostics"] = [];
  const allCandidates: PaperCandidate[] = [];

  // ── 1. Custom override ──
  if (requirement.customOverride) {
    const costPerKg = customCostPerKg ?? 80; // Default fallback
    const custom = buildCustomCandidate(requirement, requirement.customOverride, costPerKg);
    allCandidates.push(custom);
    diagnostics.push({
      level: "INFO",
      message: `Custom paper spec: ${custom.paper.gsm}gsm, bulk ${custom.paper.bulkFactor}, grain ${custom.paper.grain}`,
    });
  }

  // ── 2. Inventory search ──
  const invCandidates = searchInventory(requirement, inventory);
  allCandidates.push(...invCandidates);

  if (invCandidates.length === 0) {
    diagnostics.push({
      level: "INFO",
      message: `No inventory match for ${requirement.category} ${requirement.gsm}gsm on ${requirement.sheetSpec.label}`,
    });
  } else {
    const exactMatch = invCandidates.find(
      (c) => c.paper.gsm === requirement.gsm && c.shortfall === 0,
    );
    if (exactMatch) {
      diagnostics.push({
        level: "INFO",
        message: `Exact inventory match: ${exactMatch.paper.name} (${exactMatch.availableSheets} sheets available)`,
      });
    }
  }

  // ── 3. Rate card search ──
  const rcCandidates = searchRateCard(requirement, rateCard);
  allCandidates.push(...rcCandidates);

  if (rcCandidates.length > 0 && invCandidates.length === 0) {
    diagnostics.push({
      level: "INFO",
      message: `Rate card pricing available: Rs ${rcCandidates[0].costPerKg}/kg`,
    });
  }

  // ── Sort all candidates by score ──
  allCandidates.sort((a, b) => b.score - a.score);

  const selected = allCandidates.length > 0 ? allCandidates[0] : null;
  const alternatives = allCandidates.slice(1, 6);

  // ── 4. Procurement recommendation ──
  let procurement: ProcurementRecommendation | null = null;
  if (selected && selected.shortfall > 0) {
    procurement = buildProcurement(requirement, selected);
    diagnostics.push({
      level: "WARN",
      message: `Procurement needed: ${procurement.quantitySheets} sheets (${procurement.quantityKg.toFixed(1)} kg), est. cost Rs ${procurement.estimatedCost.toFixed(0)}`,
    });
  }

  if (!selected) {
    diagnostics.push({
      level: "ERROR",
      message: `No paper candidates found for ${requirement.category} ${requirement.gsm}gsm. Add to rate card or specify custom paper.`,
    });
  }

  return {
    selected,
    alternatives,
    procurement,
    diagnostics,
  };
}

