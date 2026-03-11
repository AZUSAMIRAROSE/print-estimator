/**
 * STORE ADAPTERS - Convert existing Zustand stores to domain types
 * Bridges between existing (InventoryItem, RateCard) and new (PaperSpecification) types
 */

import type { InventoryItem } from "@/types";
import type { PaperRateEntry } from "@/stores/rateCardStore";
import type {
  InventoryPaperItem,
  RateCardPaper,
} from "@/domain/estimation/resolver/paperResolver";

// ============================================================================
// INVENTORY ITEM ADAPTER
// ============================================================================

/**
 * Convert InventoryItem (from store) → InventoryPaperItem (domain type)
 * Only includes papers (filters by category)
 */
export function inventoryItemToPaperItem(
  item: InventoryItem
): InventoryPaperItem | null {
  if (item.category !== "paper") return null;

  return {
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: "paper",
    subcategory: item.subcategory,
    stock: item.stock,
    unit: item.unit,
    costPerUnit: item.costPerUnit,
    sellingPrice: item.sellingPrice,
    supplier: item.supplier,
    leadTimeDays: item.leadTimeDays,
    weight: item.weight,
    tags: item.tags,
  };
}

/**
 * Batch convert inventory items
 */
export function convertInventoryItems(
  items: InventoryItem[]
): InventoryPaperItem[] {
  return items
    .map(inventoryItemToPaperItem)
    .filter((item): item is InventoryPaperItem => item !== null);
}

// ============================================================================
// RATE CARD ADAPTER
// ============================================================================

/**
 * Convert PaperRateEntry (from store) → RateCardPaper (domain type)
 */
export function rateCardToPaper(
  entry: PaperRateEntry
): RateCardPaper {
  return {
    id: entry.id,
    paperType: entry.paperType,
    gsm: entry.gsm,
    size: entry.size,
    landedCost: entry.landedCost,
    chargeRate: entry.chargeRate,
    ratePerKg: entry.ratePerKg,
    supplier: entry.supplier,
    moq: entry.moq,
    status: entry.status,
  };
}

/**
 * Batch convert rate card entries
 */
export function convertRateCardEntries(
  entries: PaperRateEntry[]
): RateCardPaper[] {
  return entries.filter((e) => e.status === "active").map(rateCardToPaper);
}

// ============================================================================
// STORE EXTRACTION HELPERS
// ============================================================================

/**
 * Get all paper items from inventory store
 * Usage: 
 *   const inventoryStore = useInventoryStore.getState();
 *   const papers = getPapersFromInventory(inventoryStore);
 */
export function getPapersFromInventory(
  inventoryState: { items: InventoryItem[] }
): InventoryPaperItem[] {
  return convertInventoryItems(
    inventoryState.items.filter(item => item.category === "paper" && item.stock > 0)
  );
}

/**
 * Get active rate card entries from rate card store
 * Usage:
 *   const rateCardStore = useRateCardStore.getState();
 *   const rates = getRatesFromRateCard(rateCardStore);
 */
export function getRatesFromRateCard(
  rateCardState: { paperRates: PaperRateEntry[] }
): RateCardPaper[] {
  return convertRateCardEntries(rateCardState.paperRates);
}

/**
 * Convenience hook-style extractor combining both stores
 * Usage:
 *   const { papers, rates } = extractPaperSourcesFromStores(
 *     useInventoryStore.getState(),
 *     useRateCardStore.getState()
 *   );
 */
export function extractPaperSourcesFromStores(
  inventoryState: { items: InventoryItem[] },
  rateCardState: { paperRates: PaperRateEntry[] }
): {
  papers: InventoryPaperItem[];
  rates: RateCardPaper[];
} {
  return {
    papers: getPapersFromInventory(inventoryState),
    rates: getRatesFromRateCard(rateCardState),
  };
}
