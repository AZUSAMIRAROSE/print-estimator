/**
 * EstimationInput Adapter - Converts UI EstimationInput to domain EstimationRequest
 * Enable seamless integration between the existing UI stores and the nuclear-grade estimation engine
 * 
 * Usage:
 *   const request = estimationInputToRequest(estimationInput);
 *   const result = await autoPlan(request, inventory, rateCard);
 */

import type {
  EstimationInput,
  TextSection as UITextSection,
  CoverSection as UICoverSection,
  JacketSection as UIJacketSection,
  EndleavesSection as UIEndleavesSection,
  FinishingSection,
  BindingSection,
} from "@/types";
import type {
  EstimationRequest,
  TextSection as DomainTextSection,
  CoverSection as DomainCoverSection,
  JacketSection as DomainJacketSection,
  EndleafSection as DomainEndleafSection,
  PaperSpecification,
} from "@/domain/estimation/imposition/types";

// ============================================================================
// MAIN ADAPTER FUNCTION
// ============================================================================

/**
 * Convert EstimationInput (UI layer) to EstimationRequest (domain layer)
 * Handles all transformations including section structure, paper specs, and preferences
 */
export function estimationInputToRequest(
  estimation: EstimationInput
): EstimationRequest {
  const trimSize = {
    width: estimation.bookSpec.widthMM,
    height: estimation.bookSpec.heightMM,
  };

  // ── Extract enabled text sections ─────────────────────────────────────────
  const textSections = estimation.textSections
    .filter((s) => s.enabled)
    .map((section, index): [string, DomainTextSection] => [
      `text-${index}`,
      {
        type: "text",
        pageCounts: {
          front: section.pages,
          back: section.gsm > 0 ? section.pages : 0,
        },
        colors: {
          frontColor: section.colors?.length ? (section.colors.includes("4color") ? "4color" : "black") : "black",
          backColor: section.colors?.length > 1 ? (section.colors[1].includes("4color") ? "4color" : "black") : "black",
        },
        trimSize,
      },
    ]);

  // ── Extract cover if present ──────────────────────────────────────────────
  const coverSection: Array<[string, DomainCoverSection]> = estimation.cover.enabled
    ? [
        [
          "cover",
          {
            type: "cover",
            trimSize,
            spineWidth: estimation.bookSpec.spineThickness,
            bleedAllowance: 3,
            colors: {
              frontColor: estimation.cover.colors?.length ? (estimation.cover.colors[0].includes("4color") ? "4color" : "black") : "black",
              backColor: estimation.cover.colors?.length > 1 ? (estimation.cover.colors[1].includes("4color") ? "4color" : "black") : "black",
            },
          },
        ],
      ]
    : [];

  // ── Extract jacket if present ─────────────────────────────────────────────
  const jacketSection: Array<[string, DomainJacketSection]> = estimation.jacket?.enabled
    ? [
        [
          "jacket",
          {
            type: "jacket",
            bookTrimSize: trimSize,
            spineWidth: estimation.bookSpec.spineThickness,
            flapWidth: 40, // Standard flap width
            bleedAllowance: 3,
            colors: {
              frontColor: estimation.jacket.colors?.length ? (estimation.jacket.colors[0].includes("4color") ? "4color" : "black") : "black",
              backColor: estimation.jacket.colors?.length > 1 ? (estimation.jacket.colors[1].includes("4color") ? "4color" : "black") : "black",
            },
          },
        ],
      ]
    : [];

  // ── Extract endleaves if present ──────────────────────────────────────────
  const endleafSection: Array<[string, DomainEndleafSection]> = estimation.endleaves.enabled
    ? [
        [
          "endleaf",
          {
            type: "endleaf",
            pageCounts: { front: estimation.endleaves.pages, back: estimation.endleaves.pages },
            colors: { frontColor: "black", backColor: "black" },
            trimSize,
          },
        ],
      ]
    : [];

  // ── Combine all sections ──────────────────────────────────────────────────
  const sections = Object.fromEntries([
    ...textSections,
    ...coverSection,
    ...jacketSection,
    ...endleafSection,
  ]) as any;

  // ── Extract paper specifications ──────────────────────────────────────────
  const papers = buildPaperSpecifications(estimation, trimSize);

  // ── Build estimation request ──────────────────────────────────────────────
  const request: EstimationRequest = {
    jobId: estimation.id || `EST-${Date.now()}`,
    quantity: estimation.quantities[0] || 1000,
    trimSize,
    sections,
    papers,

    preferences: {
      maxWastePercentage: 35, // Default; can be customized per job
      allowNonCompliantGrain: false,
    },

    // NOTE: machines and preferredSheets will be set from store if available
    machines: undefined,
    preferredSheets: undefined,
  };

  return request;
}

// ============================================================================
// PAPER SPECIFICATION BUILDER
// ============================================================================

/**
 * Build paper specifications from EstimationInput sections
 */
function buildPaperSpecifications(
  estimation: EstimationInput,
  trimSize: { width: number; height: number }
): Record<string, PaperSpecification | undefined> {
  const papers: Record<string, PaperSpecification | undefined> = {};

  // Text sections
  estimation.textSections
    .filter((s) => s.enabled)
    .forEach((section, index) => {
      papers[`text-${index}`] = {
        id: `text-${index}`,
        name: section.paperTypeName || `${section.gsm}gsm Text`,
        gsm: section.gsm,
        bulkFactor: 1.5, // Default bulk factor
        grain: "long",
        availableSheets: [],
        basePrice: 0, // Will be looked up from rate card
        availability: "in_stock",
      };
    });

  // Cover
  if (estimation.cover.enabled) {
    papers["cover"] = {
      id: "cover",
      name: estimation.cover.paperTypeName || `${estimation.cover.gsm}gsm Cover`,
      gsm: estimation.cover.gsm,
      bulkFactor: 0.8, // Cover board has lower bulk factor
      grain: "long",
      availableSheets: [],
      basePrice: 0,
      availability: "in_stock",
    };
  }

  // Jacket
  if (estimation.jacket?.enabled) {
    papers["jacket"] = {
      id: "jacket",
      name: estimation.jacket.paperTypeName || `${estimation.jacket.gsm}gsm Jacket`,
      gsm: estimation.jacket.gsm,
      bulkFactor: 1.4,
      grain: "long",
      availableSheets: [],
      basePrice: 0,
      availability: "in_stock",
    };
  }

  // Endleaves
  if (estimation.endleaves.enabled) {
    papers["endleaf"] = {
      id: "endleaf",
      name: estimation.endleaves.paperTypeName || `${estimation.endleaves.gsm}gsm Endleaf`,
      gsm: estimation.endleaves.gsm,
      bulkFactor: 1.5,
      grain: "long",
      availableSheets: [],
      basePrice: 0,
      availability: "in_stock",
    };
  }

  return papers;
}

// ============================================================================
// REVERSE ADAPTER: EstimationResult → UI Results
// ============================================================================

/**
 * Convert domain EstimationResult back to UI-compatible format
 * Useful for displaying detailed results in the UI
 */
export function estimationResultToUIFormat(
  result: any // EstimationResult type
): {
  costPerCopy: number;
  totalCost: number;
  paperBreakdown: any[];
  impositionSummary: any[];
  diagnostics: any[];
} {
  return {
    costPerCopy: result.costPerCopy || 0,
    totalCost: result.totalCost || 0,
    paperBreakdown: result.costs || [],
    impositionSummary: Object.entries(result.plans || {}).map(([section, plan]: [string, any]) => ({
      section,
      signature: plan?.selectedCandidate?.signaturePages,
      sheet: plan?.selectedCandidate?.sheet?.label,
      waste: plan?.selectedCandidate?.wastePercentage,
      plates: plan?.selectedCandidate?.totalPlates,
    })),
    diagnostics: result.diagnostics || [],
  };
}

// ============================================================================
// QUOTATION OPTIONS FROM UI PRICING
// ============================================================================

/**
 * Extract quotation options from EstimationInput pricing section
 */
export function quotationOptionsFromUI(
  estimation: EstimationInput,
  customerName: string,
  preparedBy: string
): {
  margin: number;
  discount: number;
  currency: string;
  taxRate: number;
  customerName: string;
  preparedBy: string;
} {
  const pricing = estimation.pricing || {
    margin: 0,
    discount: 0,
    currency: "INR",
    taxRate: 18,
  };

  return {
    margin: pricing.margin || 25, // Default 25% margin
    discount: pricing.discount || 0,
    currency: pricing.currency || "INR",
    taxRate: pricing.taxRate || 18,
    customerName,
    preparedBy,
  };
}

// ============================================================================
// HELPER: Extract first active quantity
// ============================================================================

/**
 * Get the primary quantity for estimation from EstimationInput
 * Returns the first non-zero quantity in the array
 */
export function getPrimaryQuantity(estimation: EstimationInput): number {
  return estimation.quantities.find((q) => q > 0) || 1000;
}

/**
 * Get all active quantities for multi-quantity estimation
 */
export function getActiveQuantities(estimation: EstimationInput): number[] {
  return estimation.quantities.filter((q) => q > 0);
}
