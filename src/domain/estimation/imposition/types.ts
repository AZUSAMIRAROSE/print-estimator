/**
 * Core domain types for the nuclear-grade estimation system
 * Defines all interfaces used across imposition planning, paper resolution,
 * machine selection, and the canonical estimation engine.
 */

// ============================================================================
// BASIC MEASUREMENTS
// ============================================================================

/**
 * 2D dimensions in millimeters
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Generic measurements container for tracking area, waste, and efficiency metrics
 */
export interface Measurements {
  area: number; // mm²
  perimeter: number; // mm
  waste: number; // mm² or percentage
  efficiency: number; // 0-1
}

// ============================================================================
// PAPER SPECIFICATIONS
// ============================================================================

/** Paper size designation format */
export type PaperSizeFormat = "SRA3" | "A4" | "A3" | "SMALL" | "MEDIUM" | "LARGE" | "CUSTOM";

/** Grain direction indicating which dimension grain runs parallel to */
export type GrainDirection = "long" | "short";

/** Paper availability status */
export type PaperAvailability = "in_stock" | "backorder" | "unavailable" | "custom";

/**
 * Base paper specification with physical properties
 */
export interface PaperSpecification {
  /** Unique identifier */
  id: string;
  
  /** Paper name/description */
  name: string;
  
  /** GSM (grams per square meter) */
  gsm: number;
  
  /** Bulk factor (volume per weight, affecting thickness) */
  bulkFactor: number;
  
  /** Grain direction relative to sheet dimensions */
  grain: GrainDirection;
  
  /** Available sheet sizes for this paper */
  availableSheets: SheetSpecification[];
  
  /** Reel width if available for reel-fed printing */
  reelWidth?: number;
  
  /** Cost per sheet or per kg */
  basePrice: number;
  
  /** Availability status */
  availability: PaperAvailability;
  
  /** Stock quantity (sheets or kg) */
  quantityInStock?: number;
  
  /** Lead time in days */
  leadTimeDays?: number;
}

/**
 * Custom paper specification provided by user at estimation time
 */
export interface CustomPaperInput {
  gsm: number;
  bulkFactor: number;
  grain: GrainDirection;
  sheetSize: Dimensions;
  reelWidth?: number;
}

/**
 * Resolved paper with either catalog data or custom specifications
 */
export type ResolvedPaper = PaperSpecification | CustomPaperInput;

// ============================================================================
// SHEET SPECIFICATIONS
// ============================================================================

/**
 * Standard press sheet with dimensions and grain
 */
export interface SheetSpecification {
  /** Unique identifier */
  id: string;
  
  /** Display label (e.g., "20×30 long grain") */
  label: string;
  
  /** Width in millimeters */
  width: number;
  
  /** Height in millimeters */
  height: number;
  
  /** Which dimension the grain runs parallel to */
  grain: GrainDirection;
  
  /** Cost per sheet (may vary by paper type) */
  costPerSheet?: number;
}

// ============================================================================
// MACHINE SPECIFICATIONS
// ============================================================================

/** Printing method determining how sheets are printed */
export type PrintingMethod = "sheetwise" | "work-and-turn" | "perfecting" | "hybrid";

/** Machine classification by output capability */
export type MachineClass = "offset" | "digital" | "hybrid";

/**
 * Printing press specification with constraints and capabilities
 */
export interface MachineSpecification {
  /** Unique identifier */
  id: string;
  
  /** Machine name/model */
  name: string;
  
  /** Printing technology */
  class: MachineClass;
  
  /** Minimum sheet width in mm */
  minSheetWidth: number;
  
  /** Maximum sheet width in mm */
  maxSheetWidth: number;
  
  /** Minimum sheet height in mm */
  minSheetHeight: number;
  
  /** Maximum sheet height in mm */
  maxSheetHeight: number;
  
  /** Maximum sheets per hour (impressions) */
  maxSheetsPerHour: number;
  
  /** Maximum color count (sides processed) */
  maxColorCount: number;
  
  /** Whether machine has perfecting capability */
  hasPerfector: boolean;
  
  /** Gripper edge size in millimeters (non-printable zone) */
  gripperEdge: number;
  
  /** Minimum grip point (tail) in millimeters */
  tailEdge: number;
  
  /** Whether machine can print to edge (bleeds) */
  canPrintToEdge: boolean;
  
  /** Supported printing methods */
  supportedMethods: PrintingMethod[];
  
  /** Cost per impression (includes setup) */
  costPerImpression?: number;
  
  /** Setup time in minutes */
  setupTimeMinutes?: number;
}

// ============================================================================
// IMPOSITION LAYOUT RESULTS
// ============================================================================

/**
 * Single layout configuration (e.g., 4 across × 2 down)
 */
export interface PageGrid {
  /** Number of page positions across sheet width */
  across: number;
  
  /** Number of page positions down sheet height */
  down: number;
  
  /** Total positions per side */
  total: number;
}

/**
 * Grain direction analysis result
 */
export interface GrainCompliance {
  /** Whether grain direction meets binding requirements */
  isCompliant: boolean;
  
  /** Which direction grain actually runs */
  grainDirection: "vertical" | "horizontal" | "unknown";
  
  /** Penalty score if non-compliant (0 = compliant) */
  penaltyScore: number;
  
  /** Description of the grain situation */
  reason: string;
}

/**
 * Evaluated imposition candidate with rankings
 */
export interface ImpositionCandidate {
  /** Unique identifier for this candidate */
  id: string;
  
  /** How many pages per side in the signature */
  pagesPerSide: number;
  
  /** Total pages per signature */
  signaturePages: number;
  
  /** Number of signatures needed for full job */
  totalSignatures: number;
  
  /** Sheet to use for this configuration */
  sheet: SheetSpecification;
  
  /** Printing method for this configuration */
  method: PrintingMethod;
  
  /** Page grid dimensions */
  grid: PageGrid;
  
  /** Whether sheet is rotated 90° */
  isRotated: boolean;
  
  /** How many complete books fit per sheet */
  booksPerSheet: number;
  
  /** How many sheets needed for full quantity */
  totalSheets: number;
  
  /** Number of printing plates needed (4c cmyk = 4 per signature, 2 sides if sheetwise) */
  totalPlates: number;
  
  /** Total impressions required */
  totalImpressions: number;
  
  /** Grain direction analysis */
  grain: GrainCompliance;
  
  /** Paper wasted in this configuration */
  wastePercentage: number;
  
  /** Efficiency score before penalties (0-100) */
  efficiencyScore: number;
  
  /** Grain compliance penalty (0-100) */
  grainPenalty: number;
  
  /** Plate cost penalty (0-50) */
  plateCostPenalty: number;
  
  /** Final composite score (higher is better) */
  totalScore: number;
}

/**
 * Imposition plan with selected configuration and alternatives
 */
export interface ImpositionPlan {
  /** The selected best option */
  selectedCandidate: ImpositionCandidate;
  
  /** Alternative good options (top 5) */
  alternatives: ImpositionCandidate[];
  
  /** Candidates rejected with reasons */
  rejectedOptions: Array<{
    reason: string;
    candidate?: Partial<ImpositionCandidate>;
  }>;
  
  /** Diagnostic messages and warnings */
  diagnostics: Array<{
    type: "info" | "warning" | "error";
    message: string;
  }>;
  
  /** When this plan was generated */
  generatedAt: Date;
}

// ============================================================================
// SECTION SPECIFICATIONS
// ============================================================================

/** Type of material being printed */
export type SectionType = "text" | "cover" | "jacket" | "endleaf";

/**
 * Text section (body pages)
 */
export interface TextSection {
  type: "text";
  
  /** Total pages in this section */
  pageCounts: {
    front: number;  // Before covers
    back: number;   // After covers
  };
  
  /** Color specification */
  colors: {
    frontColor: "black" | "4color";
    backColor: "black" | "4color";
  };
  
  /** Trim size of pages */
  trimSize: Dimensions;
}

/**
 * Cover section (outside wrap)
 */
export interface CoverSection {
  type: "cover";
  
  /** Bleed allowance around cover edges */
  bleedAllowance: number;
  
  /** Color specification */
  colors: {
    frontColor: "black" | "4color";
    backColor: "black" | "4color";
  };
  
  /** Outside dimension of book (front + back) */
  trimSize: Dimensions;
  
  /** Spine width */
  spineWidth: number;
}

/**
 * Dust jacket section
 */
export interface JacketSection {
  type: "jacket";
  
  /** Bleed allowance around jacket edges */
  bleedAllowance: number;
  
  /** Flap width on front and back */
  flapWidth: number;
  
  /** Color specification */
  colors: {
    frontColor: "black" | "4color";
    backColor: "black" | "4color";
  };
  
  /** Outside dimension of book */
  trimSize: Dimensions;
  
  /** Spine width */
  spineWidth: number;
}

/**
 * Endleaf/endpaper section (front and back matter)
 */
export interface EndleafSection {
  type: "endleaf";
  
  /** Total endleaf pages (typically 4-8 per side) */
  totalPages: number;
  
  /** Color specification */
  colors: {
    frontColor: "black" | "4color";
    backColor: "black" | "4color";
  };
  
  /** Trim size of pages */
  trimSize: Dimensions;
}

/** Any section type */
export type Section = TextSection | CoverSection | JacketSection | EndleafSection;

// ============================================================================
// PAPER RESOLUTION & SOURCING
// ============================================================================

/**
 * Recommendation for where to source paper
 */
export interface PaperSourceMatch {
  /** Source identifier */
  id: string;
  
  /** Type of source (inventory vs rate card) */
  sourceType: "inventory" | "ratecard" | "vendor";
  
  /** Paper specification */
  paper: PaperSpecification;
  
  /** Available quantity in stock */
  quantityAvailable: number;
  
  /** Cost per sheet or per unit */
  unitCost: number;
  
  /** Total cost for required quantity */
  totalCost: number;
  
  /** Lead time in days */
  leadTimeDays: number;
  
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Paper resolution result with recommendations
 */
export interface PaperResolution {
  /** Requested paper specs */
  required: ResolvedPaper;
  
  /** Matches found in inventory/rate card */
  matches: PaperSourceMatch[];
  
  /** Recommended source */
  recommended?: PaperSourceMatch;
  
  /** Whether exact match was found */
  isExactMatch: boolean;
  
  /** Fallback note if no exact match */
  note?: string;
}

// ============================================================================
// ESTIMATION INPUTS
// ============================================================================

/**
 * Complete estimation request with all specifications
 */
export interface EstimationRequest {
  /** Job identifier */
  jobId: string;
  
  /** Quantity of books to estimate */
  quantity: number;
  
  /** Trim size of book pages */
  trimSize: Dimensions;
  
  /** All sections to be printed */
  sections: {
    text?: TextSection;
    cover?: CoverSection;
    jacket?: JacketSection;
    endleaf?: EndleafSection;
  };
  
  /** Paper specifications (can mix catalog and custom) */
  papers: Record<SectionType, ResolvedPaper>;
  
  /** Machine constraints */
  machines?: MachineSpecification[];
  
  /** Sheet constraints */
  preferredSheets?: SheetSpecification[];
  
  /** Preferences for planning algorithm */
  preferences?: {
    preferredMachine?: string;
    preferredSheet?: string;
    allowNonCompliantGrain?: boolean;
    maxWastePercentage?: number;
  };
}

// ============================================================================
// ESTIMATION RESULTS
// ============================================================================

/**
 * Cost breakdown for a section
 */
export interface SectionCostBreakdown {
  sectionType: SectionType;
  
  /** Paper cost */
  paperCost: number;
  
  /** Printing cost (plates + impressions) */
  printingCost: number;
  
  /** Finishing cost (binding, etc) */
  finishingCost: number;
  
  /** Total for this section */
  total: number;
}

/**
 * Complete estimation result
 */
export interface EstimationResult {
  /** Original request */
  request: EstimationRequest;
  
  /** Imposition plans for each section */
  plans: Record<SectionType, ImpositionPlan | null>;
  
  /** Paper sourcing recommendations */
  paperSources: Record<SectionType, PaperResolution>;
  
  /** Cost breakdown by section */
  costs: SectionCostBreakdown[];
  
  /** Total cost */
  totalCost: number;
  
  /** Cost per copy */
  costPerCopy: number;
  
  /** Diagnostics and warnings */
  diagnostics: Array<{
    type: "info" | "warning" | "error";
    section?: SectionType;
    message: string;
  }>;
  
  /** When this estimation was generated */
  generatedAt: Date;
}
