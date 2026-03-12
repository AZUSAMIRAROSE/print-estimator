// ============================================================================
// DOMAIN TYPES — CANONICAL TYPE SYSTEM FOR AUTO-PLANNING ESTIMATION ENGINE
// ============================================================================
//
// These types are the SINGLE SOURCE OF TRUTH for the new estimation pipeline.
// They supersede ad-hoc types scattered across the codebase.
//
// Design principles:
//   1. Every measurement is explicit (mm, gsm, kg, etc.) via naming convention
//   2. Discriminated unions for section types (text | cover | jacket | endleaves)
//   3. All optional fields use `undefined`, never `null`
//   4. Pure data — no methods, no side effects
//   5. Forward-compatible with Parts 2–8
// ============================================================================

// ─── PHYSICAL MEASUREMENTS ──────────────────────────────────────────────────

/** Width × Height in millimeters */
export interface Dimensions_mm {
  readonly width: number;
  readonly height: number;
}

/** Width × Height in inches (for sheet specs from suppliers) */
export interface Dimensions_in {
  readonly width: number;
  readonly height: number;
}

// ─── GRAIN DIRECTION ────────────────────────────────────────────────────────

/**
 * Paper grain direction relative to sheet dimensions.
 *
 * LONG_GRAIN:  grain runs parallel to the LONGER dimension
 * SHORT_GRAIN: grain runs parallel to the SHORTER dimension
 *
 * In book printing, grain must run parallel to the spine (book height)
 * for optimal binding, page turning, and dimensional stability.
 */
export type GrainDirection = "LONG_GRAIN" | "SHORT_GRAIN";

export interface GrainAnalysis {
  /** Does the page height align with the sheet's grain direction? */
  readonly compliant: boolean;
  /** Which sheet axis carries the grain */
  readonly grainAxis: "WIDTH" | "HEIGHT";
  /** Which page dimension aligns with grain */
  readonly pageAlignedDimension: "WIDTH" | "HEIGHT";
  /** Human-readable explanation */
  readonly note: string;
}

// ─── PAPER SPECIFICATION ────────────────────────────────────────────────────

export type PaperCategory =
  | "MATT_ART"
  | "GLOSS_ART"
  | "WOODFREE"
  | "BULKY_WOODFREE"
  | "BIBLE"
  | "ART_CARD"
  | "CHROMO"
  | "BOARD"
  | "KRAFT"
  | "NEWSPRINT"
  | "CUSTOM";

export interface PaperSpec {
  /** Internal code from rate card / inventory */
  readonly code: string;
  /** Human-readable name, e.g. "Matt Art Paper" */
  readonly name: string;
  readonly category: PaperCategory;
  readonly gsm: number;
  /**
   * Bulk factor (PPI multiplier).
   *   Matt Art = 1.0, Gloss Art = 0.9, HB (Holmen Bulky) = 2.3,
   *   Bible = 0.7, Woodfree = 1.4, Art Card = 1.2
   */
  readonly bulkFactor: number;
  /** Caliper (thickness) per sheet in microns. Derived: gsm × bulkFactor × 1.05 */
  readonly caliper_microns: number;
  /** Grain direction as supplied by manufacturer */
  readonly grain: GrainDirection;
}

/**
 * When the user picks a custom GSM not in the rate card,
 * we need these additional fields to plan properly.
 */
export interface CustomPaperOverride {
  readonly gsm: number;
  readonly bulkFactor: number;
  readonly grain: GrainDirection;
  /** Sheet dimensions if custom stock */
  readonly sheetSize?: Dimensions_mm;
  /** Reel width if web-fed */
  readonly reelWidth_mm?: number;
}

// ─── SHEET SPECIFICATION ────────────────────────────────────────────────────

export interface SheetSpec {
  /** Label like "23×36" or "25×36" */
  readonly label: string;
  /** Actual dimensions in mm */
  readonly size_mm: Dimensions_mm;
  /** Actual dimensions in inches (for display) */
  readonly size_in: Dimensions_in;
  /** Grain direction of this stock */
  readonly grain: GrainDirection;
  /** Available in inventory? (resolved at runtime by Part 2) */
  readonly inStock?: boolean;
  /** Cost per sheet from rate card (resolved at runtime) */
  readonly costPerSheet?: number;
  /** Cost per kg from rate card */
  readonly costPerKg?: number;
}

// ─── MACHINE SPECIFICATION ─────────────────────────────────────────────────

export interface MachineSpec {
  readonly id: string;
  /** Human name, e.g. "Favourit (FAV)" */
  readonly name: string;
  /** Max sheet the machine can accept */
  readonly maxSheet_mm: Dimensions_mm;
  /** Min sheet (some machines can't run very small stock) */
  readonly minSheet_mm: Dimensions_mm;
  /** Gripper edge in mm (leading edge, no image) */
  readonly gripperEdge_mm: number;
  /** Tail margin in mm */
  readonly tailMargin_mm: number;
  /** Side margins in mm (each side) */
  readonly sideMargin_mm: number;
  /** Maximum number of printing units (colors per pass) */
  readonly maxColors: number;
  /** Has inline aqueous coating unit */
  readonly hasAQUnit: boolean;
  /** Has perfecting (simultaneous both-side printing) */
  readonly hasPerfector: boolean;
  /** Rated speed in sheets per hour */
  readonly speedSPH: number;
  /** Machine hourly rate for overhead calculation */
  readonly hourlyRate: number;
}

// ─── PRINTING METHOD ────────────────────────────────────────────────────────

/**
 * SHEETWISE:       2 plates per signature, 2 passes, 1 sig/sheet
 * WORK_AND_TURN:   1 plate, 2 passes (flip at gripper), cut → 2 sigs/sheet
 * WORK_AND_TUMBLE: 1 plate, 2 passes (flip at tail), cut → 2 sigs/sheet
 * PERFECTING:      2 plates, 1 pass (built-in turnbar), 1 sig/sheet
 */
export type PrintingMethod =
  | "SHEETWISE"
  | "WORK_AND_TURN"
  | "WORK_AND_TUMBLE"
  | "PERFECTING";

// ─── SECTION TYPES ──────────────────────────────────────────────────────────

export type SectionType = "TEXT" | "COVER" | "JACKET" | "ENDLEAVES";

/**
 * A "section" is any distinct printed component of the book.
 * Each section goes through its own imposition → paper → printing pipeline.
 */
export interface SectionConfig {
  readonly id: string;
  readonly type: SectionType;
  readonly label: string;
  readonly enabled: boolean;
  readonly pages: number;
  readonly colorsFront: number;
  readonly colorsBack: number;
  readonly paper: PaperSpec;
  readonly customPaper?: CustomPaperOverride;
  /** If user has a preferred sheet size, specify here */
  readonly preferredSheet?: string;
  /** If user has a preferred machine, specify here */
  readonly preferredMachine?: string;
  /** If user has a preferred printing method */
  readonly preferredMethod?: PrintingMethod;
}

/** Cover-specific extensions */
export interface CoverConfig extends SectionConfig {
  readonly type: "COVER";
  readonly foldType: "WRAP_AROUND" | "GATEFOLD" | "FRENCH_FOLD";
  readonly selfCover: boolean;
  /** Spine thickness in mm (injected after binding geometry calc) */
  readonly spineThickness_mm?: number;
}

/** Jacket-specific extensions */
export interface JacketConfig extends SectionConfig {
  readonly type: "JACKET";
  /** Flap width on each side in mm */
  readonly flapWidth_mm: number;
  readonly spineThickness_mm?: number;
}

/** Endleaves-specific extensions */
export interface EndleavesConfig extends SectionConfig {
  readonly type: "ENDLEAVES";
  /** Typically 4pp front + 4pp back = 8pp total */
}

export type AnySectionConfig =
  | SectionConfig
  | CoverConfig
  | JacketConfig
  | EndleavesConfig;

// ─── IMPOSITION TYPES ───────────────────────────────────────────────────────

/** Standard signature sizes in pages */
export type SignaturePages = 4 | 8 | 12 | 16 | 24 | 32;

/** A grid layout of page positions on one side of the sheet */
export interface PageLayout {
  /** Columns of page positions across the sheet */
  readonly cols: number;
  /** Rows of page positions down the sheet */
  readonly rows: number;
  /** Total page positions per side = cols × rows */
  readonly pagesPerSide: number;
  /** Whether the page is rotated 90° on the sheet */
  readonly rotated: boolean;
}

/** The flat (untrimmed) piece size including bleed */
export interface FlatPieceSize {
  readonly width_mm: number;
  readonly height_mm: number;
}

/**
 * One evaluated imposition candidate.
 * The engine generates many of these and scores them to find the best.
 */
export interface ImpositionCandidate {
  /** Deterministic ID: "{sheet}_{sig}pp_{method}_{rot}" */
  readonly candidateId: string;
  /** Signature size in pages */
  readonly signaturePages: number;
  /** The sheet being evaluated */
  readonly sheet: SheetSpec;
  /** How pages are laid out on the sheet */
  readonly layout: PageLayout;
  /** Printing method for this candidate */
  readonly method: PrintingMethod;
  /** Number of complete book copies produced per sheet */
  readonly ups: number;
  /** Grain analysis for this layout */
  readonly grain: GrainAnalysis;

  // ── Production metrics ──
  /** Number of forms (plate sets) for this section */
  readonly forms: number;
  /** Total plates = forms × max(colorsFront, colorsBack) × sides */
  readonly totalPlates: number;
  /** Net sheets = ceil(quantity / ups) per form */
  readonly netSheetsPerForm: number;
  /** Total net sheets across all forms */
  readonly totalNetSheets: number;

  // ── Waste metrics ──
  /** Image area as fraction of sheet area (0–1) */
  readonly sheetUtilization: number;
  /** Paper waste percentage (unused sheet area) */
  readonly wastePercent: number;
  /** Absolute waste area per sheet in mm² */
  readonly wasteArea_mm2: number;

  // ── Scoring ──
  readonly scores: CandidateScores;
  /** Composite score (higher = better). Used for ranking. */
  readonly totalScore: number;

  // ── Machine compatibility ──
  readonly compatibleMachines: string[];
}

export interface CandidateScores {
  /** 0–100: based on sheet utilization (100 = no waste) */
  readonly efficiency: number;
  /** 0 or penalty: grain non-compliance gets negative score */
  readonly grainPenalty: number;
  /** 0–20: fewer plates = better */
  readonly plateBonus: number;
  /** 0–10: fewer forms = simpler setup */
  readonly simplicityBonus: number;
}

// ─── IMPOSITION PLAN (output of the engine) ─────────────────────────────────

export interface ImpositionPlan {
  readonly sectionId: string;
  readonly sectionType: SectionType;
  /** The winning candidate */
  readonly selected: ImpositionCandidate;
  /** Top alternatives (for user review / override) */
  readonly alternatives: ImpositionCandidate[];
  /** Candidates that were evaluated but rejected */
  readonly rejected: Array<{
    readonly candidateId: string;
    readonly reason: string;
  }>;
  /** Diagnostic messages for debugging / display */
  readonly diagnostics: Diagnostic[];
  readonly timestamp: string;
}

export interface Diagnostic {
  readonly level: "INFO" | "WARN" | "ERROR";
  readonly code: string;
  readonly message: string;
}

// ─── ESTIMATION INPUT (canonical) ───────────────────────────────────────────

export interface BookSpec {
  readonly trimSize: Dimensions_mm;
  /** Total pages across all text sections (derived) */
  readonly totalPages: number;
  /** Quantities to estimate (up to 5) */
  readonly quantities: readonly number[];
}

export interface BindingConfig {
  readonly method: "PERFECT" | "CASE" | "SADDLE" | "SECTION_SEWN" | "WIRO" | "SPIRAL";
  readonly boardThickness_mm?: number;
  readonly coveringMaterial?: string;
  readonly headTailBand?: boolean;
  readonly ribbonMarker?: boolean;
}

export interface FinishingConfig {
  readonly lamination?: { type: "GLOSS" | "MATT" | "SOFT_TOUCH"; sides: number };
  readonly uvVarnish?: boolean;
  readonly spotUV?: { coveragePercent: number };
  readonly embossing?: { type: "SINGLE_LEVEL" | "MULTI_LEVEL" };
  readonly foilStamping?: { area_cm2: number; foilType: string };
  readonly dieCutting?: { complexity: "SIMPLE" | "COMPLEX" };
}

export interface PricingConfig {
  readonly currency: string;
  readonly exchangeRate: number;
  readonly marginPercent: number;
  readonly discountPercent: number;
  readonly commissionPercent: number;
  readonly taxRate: number;
  readonly includesTax: boolean;
}

export interface CanonicalEstimationInput {
  readonly id: string;
  readonly jobTitle: string;
  readonly customerName: string;
  readonly book: BookSpec;
  readonly sections: readonly AnySectionConfig[];
  readonly binding: BindingConfig;
  readonly finishing: FinishingConfig;
  readonly pricing: PricingConfig;
  readonly notes?: string;
}

// ─── ESTIMATION RESULT (canonical) ──────────────────────────────────────────

export interface SectionCostBreakdown {
  readonly sectionId: string;
  readonly sectionType: SectionType;
  readonly imposition: ImpositionPlan;
  readonly paperCost: number;
  readonly ctpCost: number;
  readonly printingCost: number;
  readonly totalSectionCost: number;
}

export interface CostSummary {
  readonly paper: number;
  readonly ctp: number;
  readonly printing: number;
  readonly binding: number;
  readonly finishing: number;
  readonly packing: number;
  readonly freight: number;
  readonly prePress: number;
  readonly additional: number;
  readonly totalProduction: number;
}

export interface PricingSummary {
  readonly costPerCopy: number;
  readonly sellingPricePerCopy: number;
  readonly sellingPricePerCopy_foreign: number;
  readonly totalSellingPrice: number;
  readonly totalSellingPrice_foreign: number;
  readonly marginAmount: number;
  readonly marginPercent: number;
  readonly pricingMethod: "OVERHEAD" | "MARGIN";
}

export interface CanonicalEstimationResult {
  readonly id: string;
  readonly estimationId: string;
  readonly quantity: number;
  readonly sections: readonly SectionCostBreakdown[];
  readonly costs: CostSummary;
  readonly pricing: PricingSummary;
  readonly machineHours: number;
  readonly bookWeight_g: number;
  readonly spineThickness_mm: number;
  readonly diagnostics: readonly Diagnostic[];
  readonly timestamp: string;
}

// ─── FIELD METADATA (for auto-fill tracking) ────────────────────────────────

export type FieldSource =
  | "AUTO_PLANNED"
  | "USER_OVERRIDE"
  | "RATE_CARD"
  | "INVENTORY"
  | "DEFAULT"
  | "IMPORTED";

export interface FieldMeta<T = unknown> {
  readonly value: T;
  readonly source: FieldSource;
  readonly confidence: number; // 0–1
  readonly reason?: string;
  readonly overriddenFrom?: T;
  readonly timestamp: string;
}

// ─── PROCUREMENT ────────────────────────────────────────────────────────────

export interface ProcurementRecommendation {
  readonly paperSpec: PaperSpec;
  readonly sheetSpec: SheetSpec;
  readonly quantitySheets: number;
  readonly quantityKg: number;
  readonly inventoryMatch?: {
    readonly itemId: string;
    readonly availableSheets: number;
    readonly shortfall: number;
  };
  readonly estimatedCost: number;
  readonly leadTime_days?: number;
  readonly confidence: number;
}

// ─── ENGINE RESULT TYPES ────────────────────────────────────────────────────
// These types are used by engine.ts to wrap the calculation output from
// the legacy estimator into a structured domain envelope.

/** Cost breakdown by category for the estimation result */
export interface CostBreakdown {
  readonly paper: number;
  readonly printing: number;
  readonly ctp: number;
  readonly binding: number;
  readonly finishing: number;
  readonly packing: number;
  readonly freight: number;
  readonly prePress: number;
  readonly additional: number;
  readonly totalProduction: number;
}

/** Validation issue reported during estimation */
export interface ValidationIssue {
  readonly code: string;
  readonly severity: "error" | "warning" | "info";
  readonly message: string;
  readonly section?: string;
  readonly impact?: string;
}

/** Per-section planning output with imposition and machine selection */
export interface PlannedSection {
  readonly section: string;
  readonly paperSize: string;
  readonly imposition: string;
  readonly signature: number;
  readonly ups: number;
  readonly grainCompliant: boolean;
  readonly machineId?: string;
  readonly machineName?: string;
  readonly source: string;
  readonly warnings: string[];
}

/** Aggregate planning result for all sections */
export interface PlanningOutput {
  sections: PlannedSection[];
  blocked: boolean;
  issues: ValidationIssue[];
}

/** Full estimation result envelope wrapping input, results, and planning */
export interface EstimationResultEnvelope {
  readonly input: any; // EstimationInput from @/types
  readonly results: any[]; // ReturnType<typeof calculateFullEstimation>
  readonly planning: PlanningOutput;
  readonly procurement: ProcurementRecommendation[];
  readonly issues: ValidationIssue[];
}

