/**
 * Paper Resolver - Searches inventory and rate card for paper candidates
 * Converts existing InventoryItem and RateCard entries into domain PaperSpecification
 * and evaluates paper sourcing options based on GSM, grain, and availability.
 */

import type {
  PaperSpecification,
  PaperSourceMatch,
  PaperResolution,
  ResolvedPaper,
  SheetSpecification,
} from "@/domain/estimation/imposition/types";
import { STANDARD_SHEETS } from "@/domain/estimation/imposition/constants";

// ============================================================================
// INTERFACES FOR WORKING WITH LIVE DATA
// ============================================================================

/**
 * Minimal inventory item interface (from existing store)
 */
export interface InventoryPaperItem {
  id: string;
  name: string;
  sku: string;
  category: "paper";
  subcategory: string; // e.g., "Art Paper", "Woodfree", "Card Board"
  stock: number;
  unit: string; // "Reams", "Kg", "Sheets"
  costPerUnit: number;
  sellingPrice: number;
  supplier: string;
  leadTimeDays: number;
  weight: number; // weight per unit
  tags: string[]; // Could include grain direction like "long-grain"
}

/**
 * Paper rate card entry (from existing rate card store)
 */
export interface RateCardPaper {
  id: string;
  paperType: string; // e.g., "Matt Art Paper"
  gsm: number;
  size: string; // e.g., "25x36"
  landedCost: number;
  chargeRate: number;
  ratePerKg: number;
  supplier: string;
  moq: number; // minimum order quantity
  status: "active" | "draft" | "inactive";
}

/**
 * Inventory search criteria for finding candidate papers
 */
export interface PaperSearchCriteria {
  gsm?: number;
  gsm_tolerance?: number; // allow ±X GSM when exact not available
  grainDirection?: "long" | "short";
  paperType?: string; // e.g., "Art Paper"
  supplier?: string;
  minStock?: number;
  maxLeadTime?: number;
}

// ============================================================================
// ADAPTER: InventoryItem → PaperSpecification
// ============================================================================

/**
 * Parse grain direction from tags or naming
 * Looks for "long-grain", "short-grain", "lg", "sg" in tags/name
 */
function extractGrainDirection(tags: string[], name: string): "long" | "short" {
  const combined = [...tags, name].join(" ").toLowerCase();

  if (combined.includes("short-grain") || combined.includes("short grain") || combined.includes("-sg")) {
    return "short";
  }

  // Default to long grain (most common for bound books)
  return "long";
}

/**
 * Convert inventory item to PaperSpecification
 * Note: GSM and sheet sizes need to come from rate card or user input
 */
export function inventoryToPaperSpec(
  item: InventoryPaperItem,
  gsm: number,
  sheets: SheetSpecification[] = STANDARD_SHEETS
): PaperSpecification {
  const grainDirection = extractGrainDirection(item.tags, item.name);

  // Filter sheets by grain direction for availability
  const matchingSheets = sheets.filter((s) => s.grain === grainDirection);

  return {
    id: `paper-${item.sku}`,
    name: item.name,
    gsm,
    bulkFactor: calculateBulkFactor(item.weight, gsm, item.unit),
    grain: grainDirection,
    availableSheets: matchingSheets.length > 0 ? matchingSheets : sheets.slice(0, 3),
    basePrice: item.costPerUnit,
    availability: item.stock > 0 ? "in_stock" : "backorder",
    quantityInStock: item.stock,
    leadTimeDays: item.leadTimeDays,
  };
}

/**
 * Calculate bulk factor from weight and GSM
 * Bulk Factor = (Weight per unit in kg / GSM / sheet area in m²) × 1000
 * Simplified: for reams, bulk = (weight_g) / (GSM × sheets_per_ream)
 */
function calculateBulkFactor(weight: number, gsm: number, unit: string): number {
  // Typical ream = 500 sheets
  // Bulk = (weight in kg × 1000) / (GSM × 500) / (base area 0.0625 m² for A4 equivalent)
  // Simplified assumption: standard ream weight to GSM ratio
  if (unit === "Reams") {
    // Weight in kg, GSM typically 70-300
    // 80gsm ream ~ 2.5kg → bulk ~0.31
    // 130gsm ream ~ 4.1kg → bulk ~0.31
    return (weight / (gsm / 80)) * 0.31;
  }

  // Default to 0.7 for unknown units (should be from data)
  return 0.7;
}

// ============================================================================
// PAPER RESOLVER
// ============================================================================

/**
 * Search inventory and rate card for paper candidates matching criteria
 */
export function resolvePaperCandidates(
  requiredPaper: ResolvedPaper,
  inventoryItems: InventoryPaperItem[],
  rateCardEntries: RateCardPaper[],
  criteria?: PaperSearchCriteria
): PaperSourceMatch[] {
  const matches: PaperSourceMatch[] = [];

  // If it's custom input, just return no matches (can't source custom papers)
  if ("sheetSize" in requiredPaper) {
    return matches;
  }

  // Search inventory for this paper
  const gsmTolerance = criteria?.gsm_tolerance || 5; // Allow ±5 GSM by default

  for (const item of inventoryItems) {
    // Filter by category
    if (item.category !== "paper") continue;

    // Filter by paper type if specified
    if (criteria?.paperType && !item.subcategory.includes(criteria.paperType)) {
      continue;
    }

    // Filter by supplier if specified
    if (criteria?.supplier && item.supplier !== criteria.supplier) {
      continue;
    }

    // Filter by minimum stock
    const minStock = criteria?.minStock || 0;
    if (item.stock < minStock) continue;

    // Filter by lead time
    const maxLead = criteria?.maxLeadTime || 30;
    if (item.leadTimeDays > maxLead) continue;

    // Try to find matching rate card entry for GSM info
    const rateEntry = rateCardEntries.find(
      (r) =>
        r.status === "active" &&
        r.paperType.toLowerCase().includes(item.name.toLowerCase()) &&
        Math.abs(r.gsm - (requiredPaper.gsm || 80)) <= gsmTolerance
    );

    if (!rateEntry && !requiredPaper.gsm) {
      // Can't determine GSM without rate card or input
      continue;
    }

    const gsm = rateEntry?.gsm || requiredPaper.gsm || 80;
    const unitCost = rateEntry?.chargeRate || item.costPerUnit;

    // Estimate required quantity in sheets/kg
    const estimatedQuantityNeeded = 1000; // Placeholder; should come from imposition plan

    const match: PaperSourceMatch = {
      id: `match-${item.sku}-${gsm}`,
      sourceType: "inventory",
      paper: inventoryToPaperSpec(item, gsm),
      quantityAvailable: item.stock,
      unitCost,
      totalCost: unitCost * estimatedQuantityNeeded,
      leadTimeDays: item.leadTimeDays,
      confidence: rateEntry ? 0.95 : 0.7, // Higher confidence if rate card confirms
    };

    matches.push(match);
  }

  // Sort by cost, then by confidence
  matches.sort((a, b) => {
    if (a.totalCost !== b.totalCost) {
      return a.totalCost - b.totalCost;
    }
    return b.confidence - a.confidence;
  });

  return matches;
}

/**
 * Recommend best paper source with fallback strategy
 */
export function recommendPaperSource(
  requiredPaper: ResolvedPaper,
  inventoryItems: InventoryPaperItem[],
  rateCardEntries: RateCardPaper[],
  preferredSuppliers?: string[]
): PaperResolution {
  // If custom paper, can't resolve from inventory
  if ("sheetSize" in requiredPaper) {
    return {
      required: requiredPaper,
      matches: [],
      recommended: undefined,
      isExactMatch: false,
      note: "Custom paper specification - unable to resolve from inventory",
    };
  }

  // Find candidates
  const matches = resolvePaperCandidates(requiredPaper, inventoryItems, rateCardEntries, {
    gsm: requiredPaper.gsm,
    gsm_tolerance: 5,
    grainDirection: requiredPaper.grain,
  });

  if (matches.length === 0) {
    return {
      required: requiredPaper,
      matches: [],
      recommended: undefined,
      isExactMatch: false,
      note: `No inventory matches for ${requiredPaper.gsm}gsm ${requiredPaper.grain}-grain paper`,
    };
  }

  // Apply supplier preference if specified
  let recommended = matches[0];
  if (preferredSuppliers && preferredSuppliers.length > 0) {
    const preferred = matches.find((m) => preferredSuppliers.includes(m.paper.name));
    if (preferred) {
      recommended = preferred;
    }
  }

  return {
    required: requiredPaper,
    matches,
    recommended,
    isExactMatch:
      Math.abs(recommended.paper.gsm - requiredPaper.gsm) < 2 &&
      recommended.paper.grain === requiredPaper.grain,
    note:
      recommended.confidence < 0.8
        ? "Recommended match has lower confidence; verify specifications"
        : undefined,
  };
}
