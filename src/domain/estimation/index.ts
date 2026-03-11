/**
 * Estimation Module - Nuclear-grade estimation system for Print Estimator Pro
 * 
 * Complete pipeline from job specification through quotation generation:
 * 
 * PART 1: Imposition Engine
 *   - Auto layout planning with grain direction checking
 *   - Exhaustive evaluation of signature, sheet, machine, and method combinations
 *   - Waste calculation and optimization
 * 
 * PART 2: Resolver (Paper & Machine Selection)
 *   - Live paper sourcing from inventory and rate card
 *   - Machine ranking and selection based on imposition requirements
 *   - Auto-planner orchestration
 * 
 * PART 3: Pricing & Quotation
 *   - Cost calculation for paper, printing, binding, finishing
 *   - Customer quotation generation with versioning
 *   - Margin, discount, and tax calculations
 * 
 * Usage:
 *   import { autoPlan } from '@/domain/estimation/resolver';
 *   import { generateQuotation } from '@/domain/estimation/pricing';
 *   
 *   const estimation = await autoPlan(request, inventory, rateCard);
 *   const quotation = generateQuotation(estimation, options);
 */

// ============================================================================
// PART 1: IMPOSITION ENGINE (NEW CANONICAL TYPES)
// ============================================================================

// New canonical types (Part 1) - export with alias to avoid conflicts
export {
  // Types
  type Dimensions_mm,
  type Dimensions_in,
  type GrainDirection,
  type GrainAnalysis,
  type PaperCategory,
  type PaperSpec,
  type CustomPaperOverride,
  type SheetSpec,
  type MachineSpec,
  type PrintingMethod,
  type SectionType,
  type SectionConfig,
  type CoverConfig,
  type JacketConfig,
  type EndleavesConfig,
  type AnySectionConfig,
  type SignaturePages,
  type PageLayout,
  type FlatPieceSize,
  type ImpositionCandidate,
  type CandidateScores,
  type ImpositionPlan,
  type Diagnostic,
  type BookSpec,
  type BindingConfig,
  type FinishingConfig,
  type PricingConfig,
  type CanonicalEstimationInput,
  type SectionCostBreakdown,
  type CostSummary,
  type PricingSummary,
  type CanonicalEstimationResult,
  type FieldSource,
  type ProcurementRecommendation,
} from "./types";

export {
  // Constants
  GRIPPER_EDGE_MM,
  TAIL_MARGIN_MM,
  SIDE_MARGIN_MM,
  BLEED_MM,
  GUTTER_MM,
  COLOR_BAR_MM,
  STANDARD_SIGNATURES,
  PARTIAL_SIGNATURES,
  STANDARD_SHEETS,
  TRIM_SIZE_PRESETS,
  BULK_FACTORS,
  calculateCaliper,
  calculateSpineThickness,
  MACHINE_DATABASE,
  STANDARD_MACHINES,
  SCORING_WEIGHTS,
  WASTAGE_CHART,
  lookupWastage,
} from "./constants";

export {
  // Imposition functions
  calculateFlatPieceSize,
  calculateImageArea,
  factorPairs,
  analyzeGrain,
  evaluateLayout,
  generateCandidates,
  selectPlan,
  autoImposeSection,
  autoImposeBook,
  reImposeSection,
  canImpose,
  getImpositionSummary,
} from "./imposition";

// ============================================================================
// PART 2: PAPER & MACHINE RESOLUTION
// ============================================================================
export * from "./paperResolver";
export * from "./machineSelector";
export * from "./autoPlanner";

// ============================================================================
// PART 3: PRICING & QUOTATIONS
// ============================================================================
export * from "./pricing";

// ============================================================================
// ADAPTERS & INTEGRATION
// ============================================================================
export * from "./adapters/storeAdapters";
export * from "./adapters/estimationInputAdapter";

// ============================================================================
// EXAMPLES & WORKFLOWS
// ============================================================================
export * from "./examples";

// ============================================================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================================================

// Legacy types from imposition subdirectory
export type {
  EstimationRequest,
  EstimationResult,
  ImpositionPlan as LegacyImpositionPlan,
  ImpositionCandidate as LegacyImpositionCandidate,
  PaperSpecification,
  MachineSpecification,
  Section,
  TextSection,
  CoverSection,
  JacketSection,
  EndleafSection,
  Dimensions,
  GrainCompliance,
  PageGrid,
} from "./imposition/types";

export {
  STANDARD_SIGNATURE_SIZES,
} from "./imposition/constants";

export { autoImpose, autoImposeMultipleSections } from "./imposition/imposition";

export type { CustomerQuotation, QuotationOptions } from "./pricing/quotationGenerator";

export { generateQuotation, formatQuotationForDisplay } from "./pricing/quotationGenerator";

export { autoPlan, validateEstimationRequest } from "./resolver/autoPlan";

// ============================================================================
// PART 4: REGISTRY, PROCUREMENT & SNAPSHOTS
// ============================================================================

// Registry exports
export type {
  PaperRegistryEntry,
  MachineRegistryEntry,
  SheetRegistryEntry,
  RateRegistryEntry,
} from "./registry";
export {
  CodeRegistry,
  getRegistry,
  invalidateRegistry,
} from "./registry";

// Procurement exports
export type {
  ConsolidatedNeed,
  PurchaseOrderLine,
  PurchaseOrder,
  PurchaseOrderStatus,
  FulfillmentUpdate,
} from "./procurement";
export {
  consolidateNeeds,
  generatePurchaseOrder,
  applyFulfillment,
  isFullyProcured,
  remainingProcurementCost,
} from "./procurement";

// Snapshot exports
export type {
  QuotationSnapshot,
  SnapshotStatus,
  FrozenRateData,
  RateChange,
  ChangeDetectionResult,
  VersionComparison,
} from "./snapshot";
export {
  createSnapshot,
  detectChanges,
  refreshSnapshot,
  compareVersions,
  serializeSnapshot,
  deserializeSnapshot,
  extractQuotationSummary,
} from "./snapshot";

// ============================================================================
// PART 5: FIELD METADATA & WIZARD STORE
// ============================================================================

// Field Metadata exports
export type {
  FieldMeta,
  SectionMeta,
  EstimationMeta,
} from "./fieldMeta";
export {
  createFieldMeta,
  overrideFieldMeta,
  revertFieldMeta,
  flagForReview,
  getOverriddenFields,
  getLowConfidenceFields,
  getMetaStats,
  compareMetadata,
  serializeMeta,
  deserializeMeta,
  generateAuditTrail,
  scoreConfidencePaper,
  scoreConfidenceImposition,
  scoreConfidenceMachine,
} from "./fieldMeta";

// Wizard Store exports
export type { WizardState } from "./wizardStore";
export {
  useWizardStore,
  useStepName,
  useStepValid,
  useActivePlan,
  useSectionMeta,
  useFieldOverridden,
  useFieldConfidence,
} from "./wizardStore";
