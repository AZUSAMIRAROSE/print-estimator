// ============================================================================
// IMPOSITION ENGINE — AUTO-PLANNING WITH GRAIN DIRECTION
// ============================================================================
//
// Pure, synchronous, side-effect-free imposition calculator.
//
// Pipeline:
//   1. Calculate flat piece size (trim + bleed, or cover wrap, or jacket flat)
//   2. For each (sheet × signature × method × orientation):
//      a. Calculate usable image area on the press sheet
//      b. Evaluate page layout (grid fit)
//      c. Check grain compliance
//      d. Calculate waste, plates, forms, ups
//      e. Score the candidate
//   3. Rank all candidates by composite score
//   4. Apply constraints (preferred machine, preferred sheet)
//   5. Return ImpositionPlan with selected + alternatives + diagnostics
//
// This module is the FOUNDATION for the auto-planner (Part 2).
// ============================================================================

import type {
  Dimensions_mm,
  SheetSpec,
  MachineSpec,
  PrintingMethod,
  SectionType,
  PageLayout,
  FlatPieceSize,
  GrainAnalysis,
  ImpositionCandidate,
  CandidateScores,
  ImpositionPlan,
  Diagnostic,
  CoverConfig,
  JacketConfig,
  AnySectionConfig,
} from "./types";

import {
  BLEED_MM,
  GUTTER_MM,
  GRIPPER_EDGE_MM,
  TAIL_MARGIN_MM,
  SIDE_MARGIN_MM,
  STANDARD_SHEETS,
  STANDARD_SIGNATURES,
  MACHINE_DATABASE,
  SCORING_WEIGHTS,
} from "./constants";

// ─── GEOMETRY HELPERS ───────────────────────────────────────────────────────

/**
 * Calculate the flat (untrimmed) piece size for a single page,
 * including bleed on all sides.
 *
 * For text/endleaves: simple trim + bleed
 * For covers: (2 × trimWidth + spine) + bleed — one flat wrap
 * For jackets: (2 × trimWidth + spine + 2 × flap) + bleed
 */
export function calculateFlatPieceSize(
  section: AnySectionConfig,
  trimSize: Dimensions_mm,
  spineThickness_mm: number,
): FlatPieceSize {
  const bleed2 = BLEED_MM * 2; // bleed on both sides

  switch (section.type) {
    case "COVER": {
      const cover = section as CoverConfig;
      const spine = cover.spineThickness_mm ?? spineThickness_mm;
      // Cover wrap: front + spine + back, all with bleed
      return {
        width_mm: trimSize.width * 2 + spine + bleed2,
        height_mm: trimSize.height + bleed2,
      };
    }

    case "JACKET": {
      const jacket = section as JacketConfig;
      const spine = jacket.spineThickness_mm ?? spineThickness_mm;
      // Jacket: flap + front + spine + back + flap
      return {
        width_mm: jacket.flapWidth_mm * 2 + trimSize.width * 2 + spine + bleed2,
        height_mm: trimSize.height + bleed2,
      };
    }

    case "TEXT":
    case "ENDLEAVES":
    default:
      // Standard page with bleed on all 4 sides
      return {
        width_mm: trimSize.width + bleed2,
        height_mm: trimSize.height + bleed2,
      };
  }
}

/**
 * Calculate the usable image area on a press sheet,
 * after subtracting gripper, tail, and side margins.
 */
export function calculateImageArea(
  sheet: Dimensions_mm,
  gripperEdge: number = GRIPPER_EDGE_MM,
  tailMargin: number = TAIL_MARGIN_MM,
  sideMargin: number = SIDE_MARGIN_MM,
): Dimensions_mm {
  return {
    width: sheet.width - sideMargin * 2,
    height: sheet.height - gripperEdge - tailMargin,
  };
}

/**
 * Find all factor pairs of n.
 * e.g., 8 → [[1,8], [2,4], [4,2], [8,1]]
 */
export function factorPairs(n: number): Array<[number, number]> {
  if (n <= 0) return [];
  const pairs: Array<[number, number]> = [];
  for (let i = 1; i <= Math.sqrt(n); i++) {
    if (n % i === 0) {
      pairs.push([i, n / i]);
      if (i !== n / i) {
        pairs.push([n / i, i]);
      }
    }
  }
  return pairs;
}

// ─── GRAIN ANALYSIS ─────────────────────────────────────────────────────────

/**
 * Analyze grain compliance for a given layout on a sheet.
 *
 * Rule: Paper grain must run PARALLEL to the book spine (= page height).
 *
 * On the press sheet:
 *   - The grain runs along one axis (determined by sheet.grain)
 *   - LONG_GRAIN: grain parallel to the LONGER dimension (typically height)
 *   - SHORT_GRAIN: grain parallel to the SHORTER dimension (typically width)
 *
 * For the layout:
 *   - Page height on the sheet depends on rotation and grid arrangement
 *   - If rotated=false: page height runs along sheet height axis
 *   - If rotated=true: page height runs along sheet width axis
 *
 * Compliant when: page height direction === grain direction on sheet
 */
export function analyzeGrain(
  sheet: SheetSpec,
  layout: PageLayout,
): GrainAnalysis {
  // Determine which sheet axis carries the grain
  const sheetLonger = sheet.size_mm.height >= sheet.size_mm.width ? "HEIGHT" : "WIDTH";
  const sheetShorter = sheetLonger === "HEIGHT" ? "WIDTH" : "HEIGHT";

  const grainAxis: "WIDTH" | "HEIGHT" =
    sheet.grain === "LONG_GRAIN" ? sheetLonger : sheetShorter;

  // Determine which page dimension runs along the grain axis.
  // Without rotation: page height aligns with sheet height (rows go down)
  // With rotation: page height aligns with sheet width (rows go across)
  const pageHeightAxis: "WIDTH" | "HEIGHT" = layout.rotated ? "WIDTH" : "HEIGHT";

  const compliant = pageHeightAxis === grainAxis;

  const note = compliant
    ? `Grain compliant: page height aligned with sheet ${grainAxis.toLowerCase()} (${sheet.grain})`
    : `Grain WARNING: page height runs along sheet ${pageHeightAxis.toLowerCase()}, but grain runs along ${grainAxis.toLowerCase()}`;

  return {
    compliant,
    grainAxis,
    pageAlignedDimension: layout.rotated ? "WIDTH" : "HEIGHT",
    note,
  };
}

// ─── LAYOUT EVALUATION ─────────────────────────────────────────────────────

interface LayoutEvaluation {
  readonly fits: boolean;
  readonly layout: PageLayout;
  /** How many complete sets of pagesPerSide fit on the sheet */
  readonly ups: number;
  /** Fraction of image area used (0–1) */
  readonly utilization: number;
  /** Waste area in mm² */
  readonly wasteArea: number;
}

/**
 * Evaluate whether a specific grid layout fits on the available image area.
 *
 * For WORK_AND_TURN: the layout is doubled along the width axis
 * (two mirror-image halves, separated by a center gutter).
 *
 * @param pagesPerSide Number of page positions needed per side of the sheet
 * @param flatPiece    Size of one untrimmed page (including bleed)
 * @param imageArea    Available image area on the press sheet
 * @param method       Printing method (affects layout requirements)
 * @param rotated      Whether pages are rotated 90° on the sheet
 */
export function evaluateLayout(
  pagesPerSide: number,
  flatPiece: FlatPieceSize,
  imageArea: Dimensions_mm,
  method: PrintingMethod,
  rotated: boolean,
): LayoutEvaluation | null {
  // Get all factor pairs of pagesPerSide
  const pairs = factorPairs(pagesPerSide);
  if (pairs.length === 0) return null;

  let bestFit: LayoutEvaluation | null = null;

  for (const [cols, rows] of pairs) {
    // Piece dimensions, accounting for rotation
    const pieceW = rotated ? flatPiece.height_mm : flatPiece.width_mm;
    const pieceH = rotated ? flatPiece.width_mm : flatPiece.height_mm;

    // Required image dimensions for this grid
    let reqWidth = cols * pieceW + Math.max(0, cols - 1) * GUTTER_MM;
    const reqHeight = rows * pieceH + Math.max(0, rows - 1) * GUTTER_MM;

    // Work-and-turn doubles the width (mirror image for flip printing)
    if (method === "WORK_AND_TURN" || method === "WORK_AND_TUMBLE") {
      reqWidth = reqWidth * 2 + GUTTER_MM; // center gutter between halves
    }

    // Check fit
    if (reqWidth > imageArea.width || reqHeight > imageArea.height) {
      continue; // doesn't fit
    }

    // Calculate how many complete signatures fit (multi-up)
    // For text: we might fit >1 signature group on a large sheet
    const sigGroupWidth = reqWidth;
    const sigGroupHeight = reqHeight;
    const upsAcross = Math.floor(imageArea.width / sigGroupWidth);
    const upsDown = Math.floor(imageArea.height / sigGroupHeight);
    const totalUps = upsAcross * upsDown;

    if (totalUps < 1) continue;

    // For W&T, each sheet already produces 2 copies (halved after printing)
    const effectiveUps = (method === "WORK_AND_TURN" || method === "WORK_AND_TUMBLE")
      ? totalUps * 2
      : totalUps;

    const usedArea = sigGroupWidth * upsAcross * sigGroupHeight * upsDown;
    const totalArea = imageArea.width * imageArea.height;
    const utilization = usedArea / totalArea;
    const wasteArea = totalArea - usedArea;

    const layout: PageLayout = {
      cols: cols * upsAcross * (method === "WORK_AND_TURN" || method === "WORK_AND_TUMBLE" ? 2 : 1),
      rows: rows * upsDown,
      pagesPerSide: pagesPerSide * totalUps,
      rotated,
    };

    const evaluation: LayoutEvaluation = {
      fits: true,
      layout,
      ups: effectiveUps,
      utilization,
      wasteArea,
    };

    // Keep the best (highest utilization)
    if (!bestFit || utilization > bestFit.utilization) {
      bestFit = evaluation;
    }
  }

  return bestFit;
}

// ─── CANDIDATE GENERATOR ───────────────────────────────────────────────────

interface ImpositionInput {
  readonly section: AnySectionConfig;
  readonly trimSize: Dimensions_mm;
  readonly spineThickness_mm: number;
  readonly quantity: number;
  readonly sheets?: readonly SheetSpec[];
  readonly machines?: readonly MachineSpec[];
  readonly constraints?: {
    readonly preferredSheet?: string;
    readonly preferredMachine?: string;
    readonly preferredMethod?: PrintingMethod;
    readonly forceGrainCompliant?: boolean;
  };
}

/**
 * Get the list of printing methods to evaluate.
 * Respects user preference and machine capabilities.
 */
function getMethodsToEvaluate(
  machines: readonly MachineSpec[],
  preferred?: PrintingMethod,
): PrintingMethod[] {
  const methods: PrintingMethod[] = ["SHEETWISE"];

  // Always evaluate W&T as an option
  methods.push("WORK_AND_TURN");

  // Only add perfecting if at least one machine supports it
  if (machines.some((m) => m.hasPerfector)) {
    methods.push("PERFECTING");
  }

  // If user has a preference, put it first (but still evaluate others)
  if (preferred && !methods.includes(preferred)) {
    methods.unshift(preferred);
  } else if (preferred) {
    // Move to front
    const idx = methods.indexOf(preferred);
    if (idx > 0) {
      methods.splice(idx, 1);
      methods.unshift(preferred);
    }
  }

  return methods;
}

/**
 * Determine which machines can accept a given sheet size.
 */
function getCompatibleMachines(
  sheet: SheetSpec,
  machines: readonly MachineSpec[],
): MachineSpec[] {
  return machines.filter((m) => {
    const sw = sheet.size_mm.width;
    const sh = sheet.size_mm.height;
    // Sheet must fit within machine's max AND be >= min
    // Check both orientations (sheet can be fed either way)
    const fitsNormal =
      sw <= m.maxSheet_mm.width &&
      sh <= m.maxSheet_mm.height &&
      sw >= m.minSheet_mm.width &&
      sh >= m.minSheet_mm.height;
    const fitsRotated =
      sh <= m.maxSheet_mm.width &&
      sw <= m.maxSheet_mm.height &&
      sh >= m.minSheet_mm.width &&
      sw >= m.minSheet_mm.height;
    return fitsNormal || fitsRotated;
  });
}

/**
 * Score an imposition candidate.
 */
function scoreCandidate(
  utilization: number,
  grainCompliant: boolean,
  totalPlates: number,
  forms: number,
  isPreferredMethod: boolean,
): CandidateScores & { total: number } {
  // Efficiency: 0–100 based on utilization
  const efficiency = utilization * 100;

  // Grain penalty: subtract if non-compliant
  const grainPenalty = grainCompliant ? 0 : -SCORING_WEIGHTS.GRAIN_PENALTY;

  // Plate bonus: fewer plates is better (max 20 points)
  // Normalize: 4 plates = 20pts, 48 plates = ~2pts
  const plateBonus = Math.max(0, 20 - (totalPlates - 4) * 0.5);

  // Simplicity: fewer forms = simpler (max 10 points)
  const simplicityBonus = Math.max(0, 10 - (forms - 1) * 0.5);

  const total =
    efficiency * SCORING_WEIGHTS.EFFICIENCY +
    plateBonus * SCORING_WEIGHTS.PLATE_BONUS +
    simplicityBonus * SCORING_WEIGHTS.SIMPLICITY +
    (isPreferredMethod ? 5 : 0) * SCORING_WEIGHTS.MACHINE_MATCH +
    grainPenalty;

  return {
    efficiency,
    grainPenalty,
    plateBonus,
    simplicityBonus,
    total,
  };
}

/**
 * Generate and evaluate ALL imposition candidates for a section.
 *
 * This is the core algorithm. It exhaustively tests every combination of:
 *   sheet × signature × method × orientation
 * and returns them scored and sorted.
 */
export function generateCandidates(input: ImpositionInput): ImpositionCandidate[] {
  const {
    section,
    trimSize,
    spineThickness_mm,
    quantity,
    constraints,
  } = input;

  const sheets = input.sheets ?? STANDARD_SHEETS;
  const machines = input.machines ?? MACHINE_DATABASE;
  const preferredMethod = constraints?.preferredMethod ?? section.preferredMethod;

  const flatPiece = calculateFlatPieceSize(section, trimSize, spineThickness_mm);
  const maxColors = Math.max(section.colorsFront, section.colorsBack);

  // Determine which signatures to evaluate
  const isSpecialSection = section.type === "COVER" || section.type === "JACKET";
  const signaturesToTest: number[] = isSpecialSection
    ? [section.pages] // Covers/jackets are always treated as a single flat piece
    : STANDARD_SIGNATURES.filter((s) => s <= section.pages);

  // Add partial signature if pages don't divide evenly by any standard
  if (
    !isSpecialSection &&
    !signaturesToTest.some((s) => section.pages % s === 0) &&
    section.pages > 0
  ) {
    signaturesToTest.push(section.pages);
  }

  const methods = getMethodsToEvaluate(machines, preferredMethod);
  const candidates: ImpositionCandidate[] = [];

  for (const sheet of sheets) {
    const compatMachines = getCompatibleMachines(sheet, machines);
    if (compatMachines.length === 0) continue;

    // Filter machines by color capability
    const colorCapable = compatMachines.filter((m) => m.maxColors >= maxColors);
    if (colorCapable.length === 0) continue;

    // Get the tightest gripper edge from compatible machines
    const gripperEdge = Math.max(...colorCapable.map((m) => m.gripperEdge_mm));
    const tailMargin = Math.max(...colorCapable.map((m) => m.tailMargin_mm));
    const sideMargin = Math.max(...colorCapable.map((m) => m.sideMargin_mm));

    const imageArea = calculateImageArea(
      sheet.size_mm,
      gripperEdge,
      tailMargin,
      sideMargin,
    );

    for (const sigPages of signaturesToTest) {
      if (sigPages <= 0) continue;

      // Pages per side of the press sheet
      const pagesPerSide = isSpecialSection ? 1 : sigPages / 2;
      if (pagesPerSide < 1 || (!isSpecialSection && sigPages % 2 !== 0)) continue;

      // Number of forms (signature groups) needed
      const numSignatures = isSpecialSection ? 1 : Math.ceil(section.pages / sigPages);

      for (const method of methods) {
        // Perfecting requires a perfector-capable machine
        if (method === "PERFECTING" && !colorCapable.some((m) => m.hasPerfector)) {
          continue;
        }

        for (const rotated of [false, true]) {
          // Evaluate layout
          const evaluation = evaluateLayout(
            pagesPerSide,
            flatPiece,
            imageArea,
            method,
            rotated,
          );

          if (!evaluation || !evaluation.fits) continue;

          // Grain analysis
          const grain = analyzeGrain(sheet, evaluation.layout);

          // Skip if forceGrainCompliant and not compliant
          if (constraints?.forceGrainCompliant && !grain.compliant) continue;

          // Calculate production metrics
          const ups = evaluation.ups;

          // Forms per signature depend on method
          const formsPerSig = method === "WORK_AND_TURN" || method === "WORK_AND_TUMBLE"
            ? 1  // W&T uses 1 plate set, printed twice
            : 2; // Sheetwise & perfecting use 2 plate sets (front + back)

          const totalForms = numSignatures * formsPerSig;

          // Plates = forms × colors per side
          // For sheetwise: front plates + back plates
          // For W&T: single plate set × colors
          const platesPerSig = method === "WORK_AND_TURN" || method === "WORK_AND_TUMBLE"
            ? maxColors  // 1 plate set
            : section.colorsFront + section.colorsBack; // 2 plate sets
          const totalPlates = numSignatures * platesPerSig;

          // Net sheets per form = ceil(quantity / ups)
          const netSheetsPerForm = Math.ceil(quantity / ups);
          const totalNetSheets = netSheetsPerForm * numSignatures;

          // Waste
          const wastePercent = (1 - evaluation.utilization) * 100;
          const sheetArea = sheet.size_mm.width * sheet.size_mm.height;
          const wasteArea = sheetArea * (1 - evaluation.utilization);

          // Compatible machines for this specific method
          const methodMachines = method === "PERFECTING"
            ? colorCapable.filter((m) => m.hasPerfector)
            : colorCapable;

          const isPreferred = method === preferredMethod;
          const scores = scoreCandidate(
            evaluation.utilization,
            grain.compliant,
            totalPlates,
            totalForms,
            isPreferred,
          );

          const candidateId =
            `${sheet.label}_${sigPages}pp_${method}_${rotated ? "R" : "N"}`;

          candidates.push({
            candidateId,
            signaturePages: sigPages,
            sheet,
            layout: evaluation.layout,
            method,
            ups,
            grain,
            forms: totalForms,
            totalPlates,
            netSheetsPerForm,
            totalNetSheets,
            sheetUtilization: evaluation.utilization,
            wastePercent,
            wasteArea_mm2: wasteArea,
            scores: {
              efficiency: scores.efficiency,
              grainPenalty: scores.grainPenalty,
              plateBonus: scores.plateBonus,
              simplicityBonus: scores.simplicityBonus,
            },
            totalScore: scores.total,
            compatibleMachines: methodMachines.map((m) => m.id),
          });
        }
      }
    }
  }

  // Sort by total score descending (best first)
  candidates.sort((a, b) => b.totalScore - a.totalScore);

  return candidates;
}

// ─── PLAN SELECTION ─────────────────────────────────────────────────────────

/**
 * Select the best imposition plan from generated candidates,
 * applying user constraints (preferred machine, preferred sheet).
 *
 * Returns a complete ImpositionPlan with:
 *   - selected: the winning candidate
 *   - alternatives: next best options
 *   - rejected: candidates that were filtered out and why
 *   - diagnostics: info/warning messages for the UI
 */
export function selectPlan(
  sectionId: string,
  sectionType: SectionType,
  candidates: ImpositionCandidate[],
  constraints?: {
    preferredSheet?: string;
    preferredMachine?: string;
  },
): ImpositionPlan {
  const diagnostics: Diagnostic[] = [];
  const rejected: Array<{ candidateId: string; reason: string }> = [];

  if (candidates.length === 0) {
    diagnostics.push({
      level: "ERROR",
      code: "NO_CANDIDATES",
      message: "No feasible imposition candidates found. Check trim size, page count, and available sheets/machines.",
    });
    // Return a minimal error plan
    return {
      sectionId,
      sectionType,
      selected: null as unknown as ImpositionCandidate, // caller must handle
      alternatives: [],
      rejected,
      diagnostics,
      timestamp: new Date().toISOString(),
    };
  }

  let pool = [...candidates];

  // ── Apply preferred machine constraint ──
  if (constraints?.preferredMachine) {
    const machineFiltered = pool.filter((c) =>
      c.compatibleMachines.includes(constraints.preferredMachine!),
    );
    if (machineFiltered.length > 0) {
      // Record rejected
      pool
        .filter((c) => !c.compatibleMachines.includes(constraints.preferredMachine!))
        .forEach((c) => rejected.push({
          candidateId: c.candidateId,
          reason: `Not compatible with preferred machine: ${constraints.preferredMachine}`,
        }));
      pool = machineFiltered;
    } else {
      diagnostics.push({
        level: "WARN",
        code: "MACHINE_CONSTRAINT_IGNORED",
        message: `No candidates compatible with preferred machine '${constraints.preferredMachine}'. Using best available.`,
      });
    }
  }

  // ── Apply preferred sheet constraint ──
  if (constraints?.preferredSheet) {
    const sheetFiltered = pool.filter(
      (c) => c.sheet.label === constraints.preferredSheet,
    );
    if (sheetFiltered.length > 0) {
      pool
        .filter((c) => c.sheet.label !== constraints.preferredSheet)
        .forEach((c) => rejected.push({
          candidateId: c.candidateId,
          reason: `Not on preferred sheet: ${constraints.preferredSheet}`,
        }));
      pool = sheetFiltered;
    } else {
      diagnostics.push({
        level: "WARN",
        code: "SHEET_CONSTRAINT_IGNORED",
        message: `No candidates for preferred sheet '${constraints.preferredSheet}'. Using best available.`,
      });
    }
  }

  // ── Select winner and alternatives ──
  const selected = pool[0];
  const alternatives = pool.slice(1, 6); // Top 5 alternatives

  // ── Generate diagnostics ──
  diagnostics.push({
    level: "INFO",
    code: "PLAN_SELECTED",
    message:
      `Selected: ${selected.signaturePages}pp on ${selected.sheet.label} ` +
      `(${selected.method}, ${selected.ups}-up, ` +
      `waste ${selected.wastePercent.toFixed(1)}%, ` +
      `grain ${selected.grain.compliant ? "OK" : "WARN"})`,
  });

  if (!selected.grain.compliant) {
    diagnostics.push({
      level: "WARN",
      code: "GRAIN_SUBOPTIMAL",
      message: selected.grain.note,
    });
  }

  if (selected.wastePercent > 20) {
    diagnostics.push({
      level: "WARN",
      code: "HIGH_WASTE",
      message: `Sheet waste is ${selected.wastePercent.toFixed(1)}%. Consider alternative sheet size or signature.`,
    });
  }

  return {
    sectionId,
    sectionType,
    selected,
    alternatives,
    rejected,
    diagnostics,
    timestamp: new Date().toISOString(),
  };
}

// ─── PUBLIC API ─────────────────────────────────────────────────────────────

/**
 * Auto-impose a single section.
 *
 * This is the main entry point. It generates all candidates,
 * scores them, applies constraints, and returns the optimal plan.
 */
export function autoImposeSection(input: ImpositionInput): ImpositionPlan {
  const candidates = generateCandidates(input);

  return selectPlan(
    input.section.id,
    input.section.type,
    candidates,
    {
      preferredSheet: input.constraints?.preferredSheet,
      preferredMachine: input.constraints?.preferredMachine,
    },
  );
}

/**
 * Auto-impose ALL sections of a book.
 *
 * Returns a Map of sectionId → ImpositionPlan.
 * Each section is planned independently (they may use different sheets/machines).
 */
export function autoImposeBook(
  sections: readonly AnySectionConfig[],
  trimSize: Dimensions_mm,
  spineThickness_mm: number,
  quantity: number,
  sheets?: readonly SheetSpec[],
  machines?: readonly MachineSpec[],
): Map<string, ImpositionPlan> {
  const plans = new Map<string, ImpositionPlan>();

  for (const section of sections) {
    if (!section.enabled || section.pages <= 0) continue;

    const plan = autoImposeSection({
      section,
      trimSize,
      spineThickness_mm,
      quantity,
      sheets,
      machines,
      constraints: {
        preferredSheet: section.preferredSheet,
        preferredMachine: section.preferredMachine,
        preferredMethod: section.preferredMethod,
      },
    });

    plans.set(section.id, plan);
  }

  return plans;
}

/**
 * Re-impose a single section with updated constraints.
 * Used when the user overrides a machine or sheet selection in the wizard.
 */
export function reImposeSection(
  input: ImpositionInput,
  overrides: {
    forceSheet?: string;
    forceMachine?: string;
    forceMethod?: PrintingMethod;
    forceSignature?: number;
  },
): ImpositionPlan {
  // Generate candidates with updated constraints
  const candidates = generateCandidates({
    ...input,
    constraints: {
      ...input.constraints,
      preferredSheet: overrides.forceSheet ?? input.constraints?.preferredSheet,
      preferredMachine: overrides.forceMachine ?? input.constraints?.preferredMachine,
      preferredMethod: overrides.forceMethod ?? input.constraints?.preferredMethod,
    },
  });

  // If forcing a specific signature, filter
  let filtered = candidates;
  if (overrides.forceSignature) {
    const sigFiltered = candidates.filter(
      (c) => c.signaturePages === overrides.forceSignature,
    );
    if (sigFiltered.length > 0) {
      filtered = sigFiltered;
    }
  }

  return selectPlan(
    input.section.id,
    input.section.type,
    filtered,
    {
      preferredSheet: overrides.forceSheet ?? input.constraints?.preferredSheet,
      preferredMachine: overrides.forceMachine ?? input.constraints?.preferredMachine,
    },
  );
}

// ─── UTILITIES FOR EXTERNAL CONSUMERS ───────────────────────────────────────

/**
 * Quick check: can this trim size + page count be imposed at all?
 * Returns true if at least one candidate exists for any sheet/machine combo.
 */
export function canImpose(
  trimSize: Dimensions_mm,
  totalPages: number,
  sectionType: SectionType = "TEXT",
): boolean {
  const dummySection: AnySectionConfig = {
    id: "__check__",
    type: sectionType,
    label: "Check",
    enabled: true,
    pages: totalPages,
    colorsFront: 4,
    colorsBack: 4,
    paper: {
      code: "check",
      name: "Check",
      category: "MATT_ART",
      gsm: 100,
      bulkFactor: 1.0,
      caliper_microns: 105,
      grain: "LONG_GRAIN",
    },
  };

  const candidates = generateCandidates({
    section: dummySection,
    trimSize,
    spineThickness_mm: 10,
    quantity: 1000,
  });

  return candidates.length > 0;
}

/**
 * Get a summary of the best imposition for display purposes.
 * Useful for the wizard's live preview panel.
 */
export function getImpositionSummary(plan: ImpositionPlan): {
  sheet: string;
  signature: string;
  method: string;
  ups: number;
  waste: string;
  grain: string;
  plates: number;
  forms: number;
} {
  const s = plan.selected;
  if (!s) {
    return {
      sheet: "—",
      signature: "—",
      method: "—",
      ups: 0,
      waste: "—",
      grain: "—",
      plates: 0,
      forms: 0,
    };
  }
  return {
    sheet: s.sheet.label,
    signature: `${s.signaturePages}pp`,
    method: s.method.replace(/_/g, " ").toLowerCase(),
    ups: s.ups,
    waste: `${s.wastePercent.toFixed(1)}%`,
    grain: s.grain.compliant ? "✓ Compliant" : "⚠ Suboptimal",
    plates: s.totalPlates,
    forms: s.forms,
  };
}

