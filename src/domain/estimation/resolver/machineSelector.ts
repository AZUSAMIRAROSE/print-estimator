/**
 * Machine Selector - Evaluates and ranks printing machines for a given job
 * Ranks machines based on sheet size capability, color capacity, printing methods,
 * and efficiency for the specific imposition requirements.
 */

import type { MachineSpecification, ImpositionCandidate } from "@/domain/estimation/imposition/types";
import { STANDARD_MACHINES, sheetFitsInMachine } from "@/domain/estimation/imposition/constants";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Machine ranking with scores for different quality metrics
 */
export interface MachineRanking {
  /** The machine being ranked */
  machine: MachineSpecification;

  /** Whether machine can physically handle the sheets */
  canHandleSheets: boolean;

  /** Whether machine has sufficient color capacity */
  hasColorCapacity: boolean;

  /** Whether machine supports required printing methods */
  supportsMethod: boolean;

  /** Fit score (0-100) for sheet dimensions */
  sheetFitScore: number;

  /** Efficiency score (0-100) based on speed and plate requirements */
  efficiencyScore: number;

  /** Cost optimization score (0-100) */
  costScore: number;

  /** Total weighted score (0-100) */
  totalScore: number;

  /** Why this machine might not work */
  constraints?: string[];

  /** Notes on why this ranking */
  recommendation?: string;
}

/**
 * Machine selection result with rankings and preferred choice
 */
export interface MachineSelectionResult {
  /** The recommended best-fit machine */
  recommended: MachineRanking;

  /** All other machines ranked by score */
  alternatives: MachineRanking[];

  /** Machines that can't handle this job */
  incompatible: Array<{
    machine: MachineSpecification;
    reasons: string[];
  }>;

  /** Diagnostic info */
  diagnostics: string[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate how well a sheet fits in the machine's capability range
 * Penalizes if it's far from the machine's typical range
 */
function calculateSheetFitScore(
  sheetWidth: number,
  sheetHeight: number,
  machine: MachineSpecification
): number {
  if (!sheetFitsInMachine(sheetWidth, sheetHeight, machine)) {
    return 0; // Doesn't fit at all
  }

  // Calculate how centered the sheet is in the machine's range
  const widthCenter =
    (machine.minSheetWidth + machine.maxSheetWidth) / 2;
  const heightCenter =
    (machine.minSheetHeight + machine.maxSheetHeight) / 2;

  const widthRange = machine.maxSheetWidth - machine.minSheetWidth;
  const heightRange = machine.maxSheetHeight - machine.minSheetHeight;

  // Deviation from center (-1 to 1, where 0 is perfect center)
  const widthDeviation = Math.abs(sheetWidth - widthCenter) / (widthRange / 2);
  const heightDeviation = Math.abs(sheetHeight - heightCenter) / (heightRange / 2);

  // Average deviation, converted to 0-100 score (higher is better)
  const avgDeviation = (widthDeviation + heightDeviation) / 2;
  return Math.max(0, 100 - avgDeviation * 50);
}

/**
 * Calculate efficiency score based on speed and plate count
 * Faster machines with better method support score higher
 */
function calculateEfficiencyScore(
  machine: MachineSpecification,
  impressionsNeeded: number,
  supportsOptimalMethod: boolean
): number {
  // Base score from speed (faster is better)
  const speedScore = Math.min(100, (machine.maxSheetsPerHour / 15000) * 100);

  // Method support bonus
  const methodBonus = supportsOptimalMethod ? 15 : 0;

  // Perfecting bonus (reduces passes needed)
  const perfectingBonus = machine.hasPerfector ? 10 : 0;

  return Math.min(100, speedScore + methodBonus + perfectingBonus);
}

/**
 * Calculate cost efficiency based on impression requirements
 * Machines better suited to the print run volume score higher
 */
function calculateCostScore(
  machine: MachineSpecification,
  impressionsNeeded: number,
  estimatedCostPerImpression: number
): number {
  // For small runs, higher-speed machines are less efficient (overkill)
  // For large runs, higher-speed machines are more efficient

  const impressionThreshold = 50000; // Break-even point

  if (impressionsNeeded < impressionThreshold) {
    // Small runs prefer smaller, simpler machines
    return Math.max(20, 100 - (machine.maxSheetsPerHour / 30000) * 50);
  } else {
    // Large runs prefer faster machines
    return Math.min(100, (machine.maxSheetsPerHour / 15000) * 100);
  }
}

// ============================================================================
// MACHINE SELECTOR
// ============================================================================

/**
 * Rank machines for a given imposition candidate and job parameters
 */
export function rankMachines(
  candidate: ImpositionCandidate,
  impressionsNeeded: number,
  colorCount: number,
  machines: MachineSpecification[] = STANDARD_MACHINES,
  weights?: {
    sheetFit?: number;
    efficiency?: number;
    cost?: number;
  }
): MachineSelectionResult {
  // Default weights
  const w = {
    sheetFit: weights?.sheetFit || 40,
    efficiency: weights?.efficiency || 35,
    cost: weights?.cost || 25,
  };

  const compatible: MachineRanking[] = [];
  const incompatible: Array<{ machine: MachineSpecification; reasons: string[] }> = [];

  for (const machine of machines) {
    const constraints: string[] = [];

    // Check 1: Sheet size compatibility
    const sheetFits = sheetFitsInMachine(
      candidate.sheet.width,
      candidate.sheet.height,
      machine
    );

    if (!sheetFits) {
      constraints.push(
        `Sheet (${candidate.sheet.width}×${candidate.sheet.height}mm) exceeds machine limits`
      );
    }

    // Check 2: Color capacity
    const canHandleColors = colorCount <= machine.maxColorCount;
    if (!canHandleColors) {
      constraints.push(`Machine supports max ${machine.maxColorCount} colors, need ${colorCount}`);
    }

    // Check 3: Printing method support
    const supportsMethod = machine.supportedMethods.includes(candidate.method);
    if (!supportsMethod) {
      constraints.push(`Machine doesn't support ${candidate.method} printing`);
    }

    // If major constraints, mark as incompatible
    if (constraints.length > 0) {
      incompatible.push({ machine, reasons: constraints });
      continue;
    }

    // Calculate scores for compatible machines
    const sheetFitScore = calculateSheetFitScore(
      candidate.sheet.width,
      candidate.sheet.height,
      machine
    );

    const efficiencyScore = calculateEfficiencyScore(
      machine,
      impressionsNeeded,
      supportsMethod
    );

    const costScore = calculateCostScore(
      machine,
      impressionsNeeded,
      machine.costPerImpression || 0.5
    );

    const totalScore =
      (sheetFitScore * w.sheetFit +
        efficiencyScore * w.efficiency +
        costScore * w.cost) /
      (w.sheetFit + w.efficiency + w.cost);

    const recommendation =
      totalScore > 75
        ? "Excellent choice for this job"
        : totalScore > 50
          ? "Suitable for this job"
          : "Less optimal but can handle";

    compatible.push({
      machine,
      canHandleSheets: sheetFits,
      hasColorCapacity: canHandleColors,
      supportsMethod,
      sheetFitScore: Math.round(sheetFitScore),
      efficiencyScore: Math.round(efficiencyScore),
      costScore: Math.round(costScore),
      totalScore: Math.round(totalScore),
      recommendation,
    });
  }

  // Sort by total score
  compatible.sort((a, b) => b.totalScore - a.totalScore);

  if (compatible.length === 0) {
    throw new Error(
      `No machines can handle this configuration: ${incompatible
        .flatMap((m) => m.reasons)
        .join("; ")}`
    );
  }

  const diagnostics: string[] = [];
  diagnostics.push(
    `Selected ${compatible[0].machine.name} (score: ${compatible[0].totalScore}/100)`
  );

  if (compatible[0].sheetFitScore < 50) {
    diagnostics.push(
      `Warning: Sheet fit score is low; consider alternative sheet sizes`
    );
  }

  return {
    recommended: compatible[0],
    alternatives: compatible.slice(1),
    incompatible,
    diagnostics,
  };
}

/**
 * Find the best machine for a set of imposition candidates
 * Tries each candidate and returns the best machine + candidate combination
 */
export function findOptimalMachine(
  candidates: ImpositionCandidate[],
  impressionsNeeded: number,
  colorCount: number,
  machines?: MachineSpecification[]
): {
  candidate: ImpositionCandidate;
  machineRanking: MachineRanking;
} {
  let bestCombination: {
    candidate: ImpositionCandidate;
    machineRanking: MachineRanking;
    combinedScore: number;
  } | null = null;

  for (const candidate of candidates) {
    try {
      const result = rankMachines(candidate, impressionsNeeded, colorCount, machines);

      const combinedScore =
        (candidate.totalScore + result.recommended.totalScore) / 2;

      if (!bestCombination || combinedScore > bestCombination.combinedScore) {
        bestCombination = {
          candidate,
          machineRanking: result.recommended,
          combinedScore,
        };
      }
    } catch {
      // Candidate not compatible with any machine, skip
      continue;
    }
  }

  if (!bestCombination) {
    throw new Error(
      "Unable to find compatible machine for any imposition candidate"
    );
  }

  return {
    candidate: bestCombination.candidate,
    machineRanking: bestCombination.machineRanking,
  };
}
