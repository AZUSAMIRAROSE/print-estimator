// ============================================================================
// MACHINE SELECTOR — RANK & SELECT OPTIMAL PRESS FOR EACH SECTION
// ============================================================================
//
// Selection criteria (weighted):
//   1. Sheet compatibility (can the machine accept this sheet size?)
//   2. Color capability (enough units for the job's color count?)
//   3. Speed (faster = lower cost per impression)
//   4. Special features (perfector, AQ unit)
//   5. Hourly rate (lower = better for cost)
//   6. User preference (if specified, prioritize)
//
// This module is PURE — no store imports. Machine data is injected.
// ============================================================================

import type {
  MachineSpec,
  SheetSpec,
  PrintingMethod,
  Dimensions_mm,
  Diagnostic,
} from "./types";

import { MACHINE_DATABASE } from "./constants";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface MachineRequirement {
  /** Sheet that was selected by imposition engine */
  readonly sheet: SheetSpec;
  /** Maximum colors needed (front or back) */
  readonly maxColors: number;
  /** Preferred printing method */
  readonly preferredMethod?: PrintingMethod;
  /** Does the job need AQ coating? */
  readonly needsAQ?: boolean;
  /** Does the job benefit from perfecting? */
  readonly prefersPerfecting?: boolean;
  /** User's preferred machine ID (from wizard override) */
  readonly preferredMachineId?: string;
  /** Quantity (affects speed economics) */
  readonly quantity: number;
  /** Number of forms (affects total machine time) */
  readonly forms: number;
}

export interface MachineCandidate {
  readonly machine: MachineSpec;
  /** Can this machine accept the sheet? */
  readonly sheetCompatible: boolean;
  /** Sheet feed orientation: normal or rotated */
  readonly feedOrientation: "NORMAL" | "ROTATED";
  /** Can handle the required colors? */
  readonly colorCapable: boolean;
  /** Has the features needed? */
  readonly featuresMatch: boolean;

  // ── Production estimates ──
  /** Estimated impressions per hour (accounting for makeready) */
  readonly effectiveSPH: number;
  /** Estimated total machine hours */
  readonly estimatedHours: number;
  /** Estimated machine cost (hours × hourly rate) */
  readonly estimatedMachineCost: number;

  // ── Scoring ──
  readonly score: number;
  readonly scoreBreakdown: {
    readonly sheetFit: number;
    readonly colorFit: number;
    readonly speedScore: number;
    readonly featureScore: number;
    readonly costScore: number;
    readonly preferenceBonus: number;
  };
  readonly notes: string[];
}

export interface MachineSelectionResult {
  readonly selected: MachineCandidate | null;
  readonly alternatives: MachineCandidate[];
  readonly diagnostics: Diagnostic[];
}

// ─── SHEET FIT CHECK ────────────────────────────────────────────────────────

interface SheetFitResult {
  readonly fits: boolean;
  readonly orientation: "NORMAL" | "ROTATED";
}

/**
 * Check if a sheet fits in a machine, trying both orientations.
 */
function checkSheetFit(
  sheet: Dimensions_mm,
  machine: MachineSpec,
): SheetFitResult {
  // Normal orientation
  if (
    sheet.width <= machine.maxSheet_mm.width &&
    sheet.height <= machine.maxSheet_mm.height &&
    sheet.width >= machine.minSheet_mm.width &&
    sheet.height >= machine.minSheet_mm.height
  ) {
    return { fits: true, orientation: "NORMAL" };
  }

  // Rotated (swap width/height)
  if (
    sheet.height <= machine.maxSheet_mm.width &&
    sheet.width <= machine.maxSheet_mm.height &&
    sheet.height >= machine.minSheet_mm.width &&
    sheet.width >= machine.minSheet_mm.height
  ) {
    return { fits: true, orientation: "ROTATED" };
  }

  return { fits: false, orientation: "NORMAL" };
}

// ─── PRODUCTION ESTIMATION ──────────────────────────────────────────────────

/** Makeready time per form in hours (industry average) */
const MAKEREADY_HOURS_PER_FORM = 0.25; // 15 minutes

/** Effective speed reduction factor (theoretical vs actual) */
const SPEED_EFFICIENCY_FACTOR = 0.75;

/**
 * Estimate total machine time for a job.
 */
function estimateMachineTime(
  machine: MachineSpec,
  quantity: number,
  forms: number,
  method: PrintingMethod,
): { effectiveSPH: number; totalHours: number } {
  const baseSPH = machine.speedSPH * SPEED_EFFICIENCY_FACTOR;

  // Perfecting prints both sides in one pass → half the passes
  const passesPerForm = method === "PERFECTING" ? 1 : 2;

  // Total impressions (sheets × passes per form × forms)
  // For W&T: same number of passes but sheet count is halved (2-up)
  const sheetsPerForm = method === "WORK_AND_TURN" || method === "WORK_AND_TUMBLE"
    ? Math.ceil(quantity / 2)
    : quantity;

  const totalImpressions = sheetsPerForm * passesPerForm * forms;
  const runningHours = totalImpressions / baseSPH;
  const makereadyHours = forms * MAKEREADY_HOURS_PER_FORM;
  const totalHours = runningHours + makereadyHours;

  return {
    effectiveSPH: baseSPH,
    totalHours,
  };
}

// ─── SCORING ────────────────────────────────────────────────────────────────

const MACHINE_SCORE_WEIGHTS = {
  SHEET_FIT: 0.20,
  COLOR_FIT: 0.15,
  SPEED: 0.25,
  FEATURES: 0.15,
  COST: 0.20,
  PREFERENCE: 0.05,
} as const;

function scoreMachine(
  candidate: {
    sheetCompatible: boolean;
    colorCapable: boolean;
    machine: MachineSpec;
    featuresMatch: boolean;
    estimatedMachineCost: number;
    isPreferred: boolean;
  },
  maxCostInPool: number,
  maxSpeedInPool: number,
): MachineCandidate["scoreBreakdown"] & { total: number } {
  const sheetFit = candidate.sheetCompatible ? 100 : 0;
  const colorFit = candidate.colorCapable ? 100 : 0;

  // Speed: relative to fastest machine in the pool
  const speedScore = maxSpeedInPool > 0
    ? (candidate.machine.speedSPH / maxSpeedInPool) * 100
    : 50;

  // Features: bonus for AQ, perfector, etc.
  const featureScore = candidate.featuresMatch ? 100 : 50;

  // Cost: inverse — lower cost = higher score
  const costScore = maxCostInPool > 0
    ? (1 - candidate.estimatedMachineCost / maxCostInPool) * 100
    : 50;

  const preferenceBonus = candidate.isPreferred ? 100 : 0;

  const total =
    sheetFit * MACHINE_SCORE_WEIGHTS.SHEET_FIT +
    colorFit * MACHINE_SCORE_WEIGHTS.COLOR_FIT +
    speedScore * MACHINE_SCORE_WEIGHTS.SPEED +
    featureScore * MACHINE_SCORE_WEIGHTS.FEATURES +
    costScore * MACHINE_SCORE_WEIGHTS.COST +
    preferenceBonus * MACHINE_SCORE_WEIGHTS.PREFERENCE;

  return {
    sheetFit,
    colorFit,
    speedScore,
    featureScore,
    costScore,
    preferenceBonus,
    total,
  };
}

// ─── MAIN SELECTOR ──────────────────────────────────────────────────────────

/**
 * Select the optimal machine for a section.
 *
 * @param requirement What the job needs
 * @param machines    Available machines (injected — defaults to MACHINE_DATABASE)
 */
export function selectMachine(
  requirement: MachineRequirement,
  machines: readonly MachineSpec[] = MACHINE_DATABASE,
): MachineSelectionResult {
  const diagnostics: Diagnostic[] = [];
  const rawCandidates: Array<{
    machine: MachineSpec;
    sheetFit: SheetFitResult;
    colorCapable: boolean;
    featuresMatch: boolean;
    production: ReturnType<typeof estimateMachineTime>;
    isPreferred: boolean;
  }> = [];

  // ── Evaluate each machine ──
  for (const machine of machines) {
    const sheetFit = checkSheetFit(requirement.sheet.size_mm, machine);
    const colorCapable = machine.maxColors >= requirement.maxColors;

    // Feature matching
    const needsAQ = requirement.needsAQ ?? false;
    const prefersPerfecting = requirement.prefersPerfecting ?? false;
    const featuresMatch =
      (!needsAQ || machine.hasAQUnit) &&
      (!prefersPerfecting || machine.hasPerfector);

    // Determine effective method for this machine
    const method: PrintingMethod =
      prefersPerfecting && machine.hasPerfector
        ? "PERFECTING"
        : requirement.preferredMethod ?? "SHEETWISE";

    const production = estimateMachineTime(
      machine,
      requirement.quantity,
      requirement.forms,
      method,
    );

    const isPreferred = machine.id === requirement.preferredMachineId;

    rawCandidates.push({
      machine,
      sheetFit,
      colorCapable,
      featuresMatch,
      production,
      isPreferred,
    });
  }

  // ── Find max values for normalization ──
  const maxCost = Math.max(
    ...rawCandidates.map((c) => c.production.totalHours * c.machine.hourlyRate),
    1,
  );
  const maxSpeed = Math.max(
    ...rawCandidates.map((c) => c.machine.speedSPH),
    1,
  );

  // ── Score and build final candidates ──
  const candidates: MachineCandidate[] = rawCandidates.map((raw) => {
    const estimatedCost = raw.production.totalHours * raw.machine.hourlyRate;
    const scores = scoreMachine(
      {
        sheetCompatible: raw.sheetFit.fits,
        colorCapable: raw.colorCapable,
        machine: raw.machine,
        featuresMatch: raw.featuresMatch,
        estimatedMachineCost: estimatedCost,
        isPreferred: raw.isPreferred,
      },
      maxCost,
      maxSpeed,
    );

    const notes: string[] = [];
    if (!raw.sheetFit.fits) notes.push(`Sheet ${requirement.sheet.label} doesn't fit`);
    if (!raw.colorCapable) notes.push(`Max ${raw.machine.maxColors} colors, need ${requirement.maxColors}`);
    if (requirement.needsAQ && !raw.machine.hasAQUnit) notes.push("No AQ coating unit");
    if (raw.sheetFit.orientation === "ROTATED") notes.push("Sheet fed rotated");

    return {
      machine: raw.machine,
      sheetCompatible: raw.sheetFit.fits,
      feedOrientation: raw.sheetFit.orientation,
      colorCapable: raw.colorCapable,
      featuresMatch: raw.featuresMatch,
      effectiveSPH: raw.production.effectiveSPH,
      estimatedHours: raw.production.totalHours,
      estimatedMachineCost: estimatedCost,
      score: scores.total,
      scoreBreakdown: {
        sheetFit: scores.sheetFit,
        colorFit: scores.colorFit,
        speedScore: scores.speedScore,
        featureScore: scores.featureScore,
        costScore: scores.costScore,
        preferenceBonus: scores.preferenceBonus,
      },
      notes,
    };
  });

  // ── Filter to viable candidates only ──
  const viable = candidates.filter(
    (c) => c.sheetCompatible && c.colorCapable,
  );

  // Sort by score descending
  viable.sort((a, b) => b.score - a.score);

  if (viable.length === 0) {
    diagnostics.push({
      level: "ERROR",
      code: "NO_VIABLE_MACHINE",
      message: `No machine can handle sheet ${requirement.sheet.label} with ${requirement.maxColors} colors. Check equipment list.`,
    });

    // Fall back to all candidates sorted by score for display
    candidates.sort((a, b) => b.score - a.score);
    return {
      selected: null,
      alternatives: candidates.slice(0, 5),
      diagnostics,
    };
  }

  const selected = viable[0];
  const alternatives = viable.slice(1, 5);

  diagnostics.push({
    level: "INFO",
    code: "MACHINE_SELECTED",
    message:
      `Selected: ${selected.machine.name} ` +
      `(${selected.effectiveSPH} eff. SPH, ` +
      `${selected.estimatedHours.toFixed(1)}h, ` +
      `Rs ${selected.estimatedMachineCost.toFixed(0)} est. cost)`,
  });

  if (selected.feedOrientation === "ROTATED") {
    diagnostics.push({
      level: "INFO",
      code: "SHEET_ROTATED",
      message: `Sheet ${requirement.sheet.label} will be fed rotated on ${selected.machine.name}`,
    });
  }

  return { selected, alternatives, diagnostics };
}

/**
 * Quick check: is there at least one machine that can handle this sheet + colors?
 */
export function hasViableMachine(
  sheet: SheetSpec,
  maxColors: number,
  machines: readonly MachineSpec[] = MACHINE_DATABASE,
): boolean {
  return machines.some((m) => {
    const fit = checkSheetFit(sheet.size_mm, m);
    return fit.fits && m.maxColors >= maxColors;
  });
}

