/**
 * Core imposition engine for automated layout planning
 * Evaluates all feasible combinations of signature sizes, sheet sizes, and printing
 * methods to find optimal configurations that minimize waste while respecting
 * grain direction constraints and machine capabilities.
 */

import type {
  ImpositionCandidate,
  ImpositionPlan,
  GrainCompliance,
  PageGrid,
  SheetSpecification,
  MachineSpecification,
  PrintingMethod,
  Dimensions,
  TextSection,
  CoverSection,
  JacketSection,
  EndleafSection,
  Section,
} from "./types";
import {
  BLEED_ALLOWANCE_MM,
  STANDARD_SIGNATURE_SIZES,
  STANDARD_SHEETS,
  STANDARD_MACHINES,
  SCORING_WEIGHTS,
  GRAIN_PENALTIES,
  MAX_WASTE_PERCENTAGE,
  getFactorPairs,
  getPagesPerSide,
  sheetFitsInMachine,
} from "./constants";

// ============================================================================
// HELPER TYPES
// ============================================================================

interface GeneratorState {
  quantity: number;
  flatSize: Dimensions;
  machines: MachineSpecification[];
  sheets: SheetSpecification[];
  maxWastePercentage: number;
  preferredMachine?: string;
  preferredSheet?: string;
}

interface LayoutEvaluationContext {
  pagesPerSide: number;
  signaturePages: number;
  numSignatures: number;
  flatSize: Dimensions;
  sheet: SheetSpecification;
  machine: MachineSpecification;
  method: PrintingMethod;
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate a deterministic but unique candidate ID
 */
function generateCandidateId(
  signature: number,
  sheetId: string,
  method: PrintingMethod,
  rotated: boolean
): string {
  const rotation = rotated ? "r" : "n";
  return `cand-${signature}pp-${sheetId}-${method}-${rotation}`;
}

// ============================================================================
// GRAIN DIRECTION ANALYSIS
// ============================================================================

/**
 * Analyze grain direction compliance
 * Pages in books should have grain running parallel to the spine (vertical)
 */
function analyzeGrainCompliance(
  pageHeight: number,
  sheetWidth: number,
  sheetHeight: number,
  sheetGrain: "long" | "short",
  isRotated: boolean
): GrainCompliance {
  // Determine which dimension grain runs along
  let grainDimension: "width" | "height";
  if (sheetGrain === "long") {
    // Long grain runs along the longer dimension
    grainDimension = sheetWidth < sheetHeight ? "height" : "width";
  } else {
    // Short grain runs along the shorter dimension
    grainDimension = sheetWidth < sheetHeight ? "width" : "height";
  }

  const grainIsVertical = grainDimension === "height";
  const pageHeightIsVertical = true; // Pages on sheet with height as Y-axis

  // Check if page height aligns with grain direction
  const isCompliant = grainIsVertical === pageHeightIsVertical;

  return {
    isCompliant,
    grainDirection: grainIsVertical ? "vertical" : "horizontal",
    penaltyScore: isCompliant ? GRAIN_PENALTIES.compliant : GRAIN_PENALTIES.perpendicular,
    reason: isCompliant
      ? "Grain direction compliant with binding"
      : "Grain direction perpendicular to spine (non-compliant)",
  };
}

// ============================================================================
// SHEET AND MARGIN CALCULATIONS
// ============================================================================

/**
 * Calculate the usable image area on a sheet accounting for gripper and margins
 */
function calculateUsableImageArea(
  sheet: Dimensions,
  machine: MachineSpecification
): Dimensions {
  const usableWidth = sheet.width - 2 * 5; // Side margins (5mm each)
  const usableHeight = sheet.height - (machine.gripperEdge + 5); // Gripper + tail

  return {
    width: Math.max(0, usableWidth),
    height: Math.max(0, usableHeight),
  };
}

/**
 * Calculate the untrimmed page dimensions (flat size) given trim size and setup
 */
function calculatePageUntrimmedSize(
  trimSize: Dimensions,
  bleedAllowance: number = BLEED_ALLOWANCE_MM
): Dimensions {
  return {
    width: trimSize.width + 2 * bleedAllowance,
    height: trimSize.height + 2 * bleedAllowance,
  };
}

/**
 * Calculate the flat size for a cover (wraps around book)
 */
function calculateCoverFlatSize(
  bookWidth: number,
  bookHeight: number,
  spineWidth: number,
  bleedAllowance: number
): Dimensions {
  // Cover wraps: front + spine + back + bleed on all sides
  const totalWidth = bookWidth + spineWidth + bookWidth + 2 * bleedAllowance;
  const totalHeight = bookHeight + 2 * bleedAllowance;

  return { width: totalWidth, height: totalHeight };
}

/**
 * Calculate the flat size for a dust jacket
 */
function calculateJacketFlatSize(
  bookWidth: number,
  bookHeight: number,
  spineWidth: number,
  flapWidth: number,
  bleedAllowance: number
): Dimensions {
  // Jacket: front flap + front + spine + back + back flap + bleed
  const totalWidth =
    flapWidth + bookWidth + spineWidth + bookWidth + flapWidth + 2 * bleedAllowance;
  const totalHeight = bookHeight + 2 * bleedAllowance;

  return { width: totalWidth, height: totalHeight };
}

/**
 * Calculate waste percentage given sheet area and content area
 */
function calculateWastePercentage(
  sheetArea: number,
  contentArea: number,
  booksPerSheet: number
): number {
  const actualContentArea = contentArea * booksPerSheet;
  const wasted = Math.max(0, sheetArea - actualContentArea);
  return (wasted / sheetArea) * 100;
}

// ============================================================================
// LAYOUT EVALUATION
// ============================================================================

/**
 * Evaluate if a specific layout (grid) fits on a sheet
 */
function evaluateLayoutFit(
  grid: PageGrid,
  pageSize: Dimensions,
  availableArea: Dimensions
): boolean {
  const requiredWidth = pageSize.width * grid.across;
  const requiredHeight = pageSize.height * grid.down;

  return requiredWidth <= availableArea.width && requiredHeight <= availableArea.height;
}

/**
 * Calculate how many complete books fit on a given sheet
 * For sheetwise: typically 1 copy per sheet
 * For work-and-turn: 2 copies (split down the middle)
 */
function calculateBooksPerSheet(
  grid: PageGrid,
  pagesPerSide: number,
  method: PrintingMethod
): number {
  // Standard case: 1 copy per sheet for sheetwise and perfecting
  let booksPerSheet = 1;

  // Work-and-turn can fit 2 copies since it prints both sides on separate regions
  if (method === "work-and-turn") {
    booksPerSheet = 2;
  }

  return booksPerSheet;
}

/**
 * Calculate total number of plates needed for a configuration
 */
function calculateTotalPlates(
  numSignatures: number,
  method: PrintingMethod,
  colorCount: number
): number {
  let formsPerSignature: number;

  if (method === "perfecting") {
    // Perfecting prints both sides in one pass = 1 form per signature
    formsPerSignature = 1;
  } else {
    // Sheetwise and work-and-turn both need separate forms for front and back
    formsPerSignature = 2;
  }

  const totalForms = numSignatures * formsPerSignature;
  const platesPerForm = colorCount; // Each color gets its own plate

  return totalForms * platesPerForm;
}

/**
 * Calculate total impressions needed
 * Impressions = quantity / booksPerSheet / booksPerForm × numSignatures × 2 (front+back, except perfecting)
 */
function calculateTotalImpressions(
  quantity: number,
  booksPerSheet: number,
  numSignatures: number,
  method: PrintingMethod
): number {
  // Each signature requires impressions for the entire quantity
  const impressionsPerSignature = Math.ceil(quantity / booksPerSheet);

  // How many times each sheet is printed
  const passesPerSheet = method === "perfecting" ? 1 : 2; // Perfecting is 1 pass, others are 2

  return impressionsPerSignature * numSignatures * passesPerSheet;
}

// ============================================================================
// CANDIDATE GENERATION AND EVALUATION
// ============================================================================

/**
 * Generate all feasible imposition candidates for a section
 */
function generateCandidates(
  section: Section,
  quantity: number,
  state: GeneratorState
): ImpositionCandidate[] {
  const candidates: ImpositionCandidate[] = [];

  // Determine page count and flat size based on section type
  let totalPages: number;
  let flatSize: Dimensions;

  if (section.type === "text") {
    totalPages = section.pageCounts.front + section.pageCounts.back;
    flatSize = calculatePageUntrimmedSize(section.trimSize);
  } else if (section.type === "cover") {
    totalPages = 4; // Covers are always 4 pages (front + back printed)
    flatSize = calculateCoverFlatSize(
      section.trimSize.width,
      section.trimSize.height,
      section.spineWidth,
      section.bleedAllowance
    );
  } else if (section.type === "jacket") {
    totalPages = 4; // Jackets are also 4 pages
    flatSize = calculateJacketFlatSize(
      section.trimSize.width,
      section.trimSize.height,
      section.spineWidth,
      section.flapWidth,
      section.bleedAllowance
    );
  } else if (section.type === "endleaf") {
    totalPages = section.totalPages;
    flatSize = calculatePageUntrimmedSize(section.trimSize);
  } else {
    return candidates;
  }

  // Skip if no pages
  if (totalPages === 0) return candidates;

  // Determine which signature sizes are applicable
  const signaturesToTry =
    section.type === "text"
      ? STANDARD_SIGNATURE_SIZES
      : [totalPages]; // Covers, jackets, endleaves use their specific page count

  // Try each signature size
  for (const signaturePages of signaturesToTry) {
    // Skip if this signature is larger than total pages (for text sections)
    if (section.type === "text" && signaturePages > totalPages) continue;

    const pagesPerSide = getPagesPerSide(signaturePages);
    const numSignatures = Math.ceil(totalPages / signaturePages);

    // Skip invalid configurations
    if (pagesPerSide === 0 || numSignatures === 0) continue;

    // Get all layout options for this signature
    const layoutOptions = getFactorPairs(pagesPerSide);

    // Try each sheet and layout combination
    for (const sheet of state.sheets) {
      for (const machine of state.machines) {
        // Check if sheet fits in machine
        if (!sheetFitsInMachine(sheet.width, sheet.height, machine)) continue;

        for (const method of machine.supportedMethods) {
          for (const [across, down] of layoutOptions) {
            const grid: PageGrid = { across, down, total: across * down };

            // Test normal and rotated orientations
            for (const isRotated of [false, true]) {
              const sheetToUse = isRotated
                ? { ...sheet, width: sheet.height, height: sheet.width }
                : sheet;

              const usableArea = calculateUsableImageArea(sheetToUse, machine);

              // Check if layout fits
              if (!evaluateLayoutFit(grid, flatSize, usableArea)) continue;

              // Calculate metrics
              const booksPerSheet = calculateBooksPerSheet(grid, pagesPerSide, method);
              const totalSheetsNeeded = Math.ceil(quantity / booksPerSheet);
              const sheetArea = sheetToUse.width * sheetToUse.height;
              const contentArea = flatSize.width * flatSize.height;
              const wastePercentage = calculateWastePercentage(
                sheetArea,
                contentArea,
                booksPerSheet
              );

              // Skip if waste exceeds threshold
              if (wastePercentage > state.maxWastePercentage) continue;

              // Analyze grain direction
              const grain = analyzeGrainCompliance(
                flatSize.height,
                sheetToUse.width,
                sheetToUse.height,
                sheet.grain,
                isRotated
              );

              // Calculate color count (determine from section colors)
              let colorCount = 4; // Default to 4 color
              if (section.type === "text" && section.colors.frontColor === "black") {
                colorCount = 1;
              }

              const totalPlates = calculateTotalPlates(numSignatures, method, colorCount);
              const totalImpressions = calculateTotalImpressions(
                quantity,
                booksPerSheet,
                numSignatures,
                method
              );

              // Score this candidate
              const efficiencyScore = Math.max(0, 100 - wastePercentage);
              const grainPenalty = grain.penaltyScore;
              const platePenalty = Math.min(50, (totalPlates / 10) * 5); // Max 50 point penalty
              const totalScore = efficiencyScore - grainPenalty - platePenalty;

              const candidate: ImpositionCandidate = {
                id: generateCandidateId(signaturePages, sheet.id, method, isRotated),
                pagesPerSide: grid.total,
                signaturePages,
                totalSignatures: numSignatures,
                sheet: sheetToUse,
                method,
                grid,
                isRotated,
                booksPerSheet,
                totalSheets: totalSheetsNeeded,
                totalPlates,
                totalImpressions,
                grain,
                wastePercentage,
                efficiencyScore,
                grainPenalty,
                plateCostPenalty: platePenalty,
                totalScore,
              };

              candidates.push(candidate);
            }
          }
        }
      }
    }
  }

  return candidates;
}

// ============================================================================
// CANDIDATE SELECTION AND RANKING
// ============================================================================

/**
 * Select the best candidate from a list, applying constraints and preferences
 */
function selectBestCandidate(
  candidates: ImpositionCandidate[],
  state: GeneratorState
): { selected: ImpositionCandidate | null; rejected: string[] } {
  const rejected: string[] = [];

  // Sort by total score (highest first)
  const sorted = [...candidates].sort((a, b) => b.totalScore - a.totalScore);

  // Apply machine preference if specified
  if (state.preferredMachine) {
    const filtered = sorted.filter(
      (c) =>
        state.machines.find((m) => m.id === state.preferredMachine)?.id ===
        state.machines.find((m) => m === c.sheet)?.id
    );
    if (filtered.length > 0) {
      return { selected: filtered[0], rejected };
    }
    rejected.push(`No candidates match preferred machine: ${state.preferredMachine}`);
  }

  // Apply sheet preference if specified
  if (state.preferredSheet) {
    const filtered = sorted.filter((c) => c.sheet.id === state.preferredSheet);
    if (filtered.length > 0) {
      return { selected: filtered[0], rejected };
    }
    rejected.push(`No candidates match preferred sheet: ${state.preferredSheet}`);
  }

  // Return top candidate if any exist
  if (sorted.length > 0) {
    return { selected: sorted[0], rejected };
  }

  rejected.push("No feasible imposition candidates found");
  return { selected: null, rejected };
}

// ============================================================================
// MAIN PUBLIC FUNCTIONS
// ============================================================================

/**
 * Auto-impose a single section with provided constraints
 */
export function autoImpose(
  section: Section,
  quantity: number,
  options?: {
    machines?: MachineSpecification[];
    sheets?: SheetSpecification[];
    maxWastePercentage?: number;
    preferredMachine?: string;
    preferredSheet?: string;
  }
): ImpositionPlan {
  const state: GeneratorState = {
    quantity,
    flatSize: { width: 0, height: 0 }, // Computed per section
    machines: options?.machines || STANDARD_MACHINES,
    sheets: options?.sheets || STANDARD_SHEETS,
    maxWastePercentage: options?.maxWastePercentage || MAX_WASTE_PERCENTAGE,
    preferredMachine: options?.preferredMachine,
    preferredSheet: options?.preferredSheet,
  };

  // Generate all feasible candidates
  const candidates = generateCandidates(section, quantity, state);

  // Group candidates by waste and sort by total score
  const sorted = [...candidates].sort((a, b) => {
    // Primary: compliant grain
    if (a.grain.isCompliant !== b.grain.isCompliant) {
      return a.grain.isCompliant ? -1 : 1;
    }
    // Secondary: total score
    return b.totalScore - a.totalScore;
  });

  // Select best candidate
  const { selected: selectedCandidate, rejected } = selectBestCandidate(candidates, state);

  // Get top 5 alternatives
  const alternatives = sorted.slice(1, 6);

  // Generate diagnostics
  const diagnostics = [];

  if (selectedCandidate) {
    diagnostics.push({
      type: "info" as const,
      message: `Selected ${selectedCandidate.signaturePages}pp signature on ${selectedCandidate.sheet.label} (${selectedCandidate.method})`,
    });

    diagnostics.push({
      type: "info" as const,
      message: `Sheet count: ${selectedCandidate.totalSheets}, Waste: ${selectedCandidate.wastePercentage.toFixed(1)}%`,
    });

    if (!selectedCandidate.grain.isCompliant) {
      diagnostics.push({
        type: "warning" as const,
        message: `Grain direction: ${selectedCandidate.grain.reason}`,
      });
    }
  } else {
    diagnostics.push({
      type: "error" as const,
      message: "No feasible imposition plan found. Check requirements and constraints.",
    });

    for (const reason of rejected) {
      diagnostics.push({
        type: "error" as const,
        message: reason,
      });
    }
  }

  return {
    selectedCandidate: selectedCandidate || ({} as ImpositionCandidate),
    alternatives,
    rejectedOptions: rejected.map((r) => ({ reason: r })),
    diagnostics,
    generatedAt: new Date(),
  };
}

/**
 * Auto-impose multiple sections at once
 */
export function autoImposeMultipleSections(
  sections: Record<string, Section>,
  quantity: number,
  options?: {
    machines?: MachineSpecification[];
    sheets?: SheetSpecification[];
    maxWastePercentage?: number;
  }
): Record<string, ImpositionPlan> {
  const plans: Record<string, ImpositionPlan> = {};

  for (const [sectionKey, section] of Object.entries(sections)) {
    if (!section) continue;
    plans[sectionKey] = autoImpose(section, quantity, options);
  }

  return plans;
}
