// ============================================================================
// GLOBAL CODE REGISTRY
// ============================================================================
//
// Unified lookup namespace that maps:
//   - Inventory SKUs → paper specs, stock levels, costs
//   - Rate card entries → pricing by category/GSM
//   - Machine IDs → machine specs, capabilities
//   - Paper type codes → bulk factors, categories
//   - Sheet size labels → dimensions, grain
//
// Purpose:
//   1. Single source of truth for all reference data
//   2. Live data injection from Zustand stores
//   3. Change detection (for snapshot refresh/reprice)
//   4. Validation of codes (does this SKU exist?)
//   5. Reverse lookup (find all papers matching criteria)
//
// Design:
//   - Immutable snapshots (rebuild on store changes)
//   - No side effects — pure data container
//   - Typed lookup methods with fallback defaults
// ============================================================================

import type {
  PaperSpec,
  PaperCategory,
  SheetSpec,
  MachineSpec,
  GrainDirection,
  Dimensions_mm,
} from "./types";

import type { InventoryPaperItem, RateCardPaperEntry } from "./paperResolver";
import { buildPaperSpec } from "./paperResolver";

import {
  STANDARD_SHEETS,
  MACHINE_DATABASE,
  BULK_FACTORS,
  calculateCaliper,
} from "./constants";

// ─── REGISTRY ENTRY TYPES ──────────────────────────────────────────────────

export interface PaperRegistryEntry {
  readonly code: string;
  readonly spec: PaperSpec;
  readonly source: "INVENTORY" | "RATE_CARD" | "CONSTANT" | "CUSTOM";
  /** Available sheets in inventory (0 if rate-card only) */
  readonly stockSheets: number;
  /** Cost per kg from best available source */
  readonly costPerKg: number;
  /** Cost per sheet (derived or direct) */
  readonly costPerSheet: number;
  /** Sheet sizes available for this paper */
  readonly availableSheets: readonly string[];
  /** Supplier name (if from inventory) */
  readonly supplier?: string;
  /** Last updated timestamp */
  readonly lastUpdated: string;
}

export interface MachineRegistryEntry {
  readonly id: string;
  readonly spec: MachineSpec;
  readonly source: "DATABASE" | "CUSTOM";
  /** Is machine currently operational? */
  readonly operational: boolean;
  /** Current utilization % (from production schedule) */
  readonly utilization?: number;
}

export interface SheetRegistryEntry {
  readonly label: string;
  readonly spec: SheetSpec;
  readonly source: "STANDARD" | "CUSTOM";
  /** Paper codes available in this sheet size */
  readonly availablePapers: readonly string[];
}

export interface RateRegistryEntry {
  readonly category: string;
  readonly itemKey: string;
  readonly value: number;
  readonly unit: string;
  readonly source: "DATABASE" | "DEFAULT";
  readonly lastUpdated: string;
}

// ─── REGISTRY CLASS ─────────────────────────────────────────────────────────

/**
 * Immutable registry snapshot.
 *
 * Create a new instance whenever store data changes.
 * All lookups are O(1) via Maps.
 *
 * @example
 * 
```ts
 * const registry = CodeRegistry.build({
 *   inventory: inventoryStore.getState().items,
 *   rateCard: rateCardStore.getState().paperRates,
 *   machines: machineStore.getState().machines,
 * });
 *
 * const paper = registry.getPaper("matt_130");
 * const machine = registry.getMachine("rmgt");
 * const sheet = registry.getSheet("25×36");
 * 
```
 */
export class CodeRegistry {
  private papers: Map<string, PaperRegistryEntry>;
  private machines: Map<string, MachineRegistryEntry>;
  private sheets: Map<string, SheetRegistryEntry>;
  private rates: Map<string, RateRegistryEntry>;

  /** Fingerprint of the data used to build this registry (for change detection) */
  readonly fingerprint: string;
  readonly builtAt: string;

  private constructor(
    papers: Map<string, PaperRegistryEntry>,
    machines: Map<string, MachineRegistryEntry>,
    sheets: Map<string, SheetRegistryEntry>,
    rates: Map<string, RateRegistryEntry>,
    fingerprint: string,
  ) {
    this.papers = papers;
    this.machines = machines;
    this.sheets = sheets;
    this.rates = rates;
    this.fingerprint = fingerprint;
    this.builtAt = new Date().toISOString();
  }

  // ── BUILDER ──

  static build(data: {
    inventory?: readonly InventoryPaperItem[];
    rateCard?: readonly RateCardPaperEntry[];
    machines?: readonly MachineSpec[];
    customSheets?: readonly SheetSpec[];
    customRates?: readonly { category: string; itemKey: string; value: number; unit: string }[];
  }): CodeRegistry {
    const papers = new Map<string, PaperRegistryEntry>();
    const machines = new Map<string, MachineRegistryEntry>();
    const sheets = new Map<string, SheetRegistryEntry>();
    const rates = new Map<string, RateRegistryEntry>();

    // ── Index inventory papers ──
    const inventory = data.inventory ?? [];
    for (const item of inventory) {
      const key = `${item.category}_${item.gsm}`.toLowerCase();
      const spec = buildPaperSpec(
        item.sku || item.id,
        item.name,
        item.category,
        item.gsm,
        item.grain,
      );

      const existing = papers.get(key);
      papers.set(key, {
        code: key,
        spec,
        source: "INVENTORY",
        stockSheets: (existing?.stockSheets ?? 0) + item.stockSheets,
        costPerKg: item.costPerKg,
        costPerSheet: item.costPerSheet,
        availableSheets: uniqueArray([
          ...(existing?.availableSheets ?? []),
          item.sheetLabel,
        ]),
        supplier: item.supplier,
        lastUpdated: item.lastUpdated,
      });

      // Also index by SKU for direct lookup
      if (item.sku) {
        papers.set(item.sku.toLowerCase(), papers.get(key)!);
      }
    }

    // ── Index rate card papers (fill gaps) ──
    const rateCard = data.rateCard ?? [];
    for (const entry of rateCard) {
      if (!entry.isActive) continue;
      const key = `${entry.category}_${entry.gsm}`.toLowerCase();

      if (!papers.has(key)) {
        const bulk = BULK_FACTORS[entry.category] ?? 1.0;
        papers.set(key, {
          code: key,
          spec: {
            code: key,
            name: `${entry.category.replace(/_/g, " ")} ${entry.gsm}gsm`,
            category: entry.category,
            gsm: entry.gsm,
            bulkFactor: bulk,
            caliper_microns: calculateCaliper(entry.gsm, bulk),
            grain: "LONG_GRAIN",
          },
          source: "RATE_CARD",
          stockSheets: 0,
          costPerKg: entry.ratePerKg,
          costPerSheet: 0,
          availableSheets: entry.sheetLabel ? [entry.sheetLabel] : [],
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    // ── Index bulk factor constants as fallback ──
    for (const [category, bulk] of Object.entries(BULK_FACTORS)) {
      const commonGSMs = getCommonGSMs(category as PaperCategory);
      for (const gsm of commonGSMs) {
        const key = `${category}_${gsm}`.toLowerCase();
        if (!papers.has(key)) {
          papers.set(key, {
            code: key,
            spec: {
              code: key,
              name: `${category.replace(/_/g, " ")} ${gsm}gsm`,
              category: category as PaperCategory,
              gsm,
              bulkFactor: bulk,
              caliper_microns: calculateCaliper(gsm, bulk),
              grain: "LONG_GRAIN",
            },
            source: "CONSTANT",
            stockSheets: 0,
            costPerKg: 0,
            costPerSheet: 0,
            availableSheets: [],
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    }

    // ── Index machines ──
    const machineList = data.machines ?? MACHINE_DATABASE;
    for (const m of machineList) {
      machines.set(m.id, {
        id: m.id,
        spec: m,
        source: "DATABASE",
        operational: true,
      });
    }

    // ── Index sheets ──
    const allSheets = [...STANDARD_SHEETS, ...(data.customSheets ?? [])];
    for (const s of allSheets) {
      const papersOnSheet = Array.from(papers.values())
        .filter((p) => p.availableSheets.includes(s.label))
        .map((p) => p.code);

      sheets.set(s.label, {
        label: s.label,
        spec: s,
        source: STANDARD_SHEETS.includes(s) ? "STANDARD" : "CUSTOM",
        availablePapers: papersOnSheet,
      });
    }

    // ── Index custom rates ──
    for (const r of data.customRates ?? []) {
      const key = `${r.category}:${r.itemKey}`;
      rates.set(key, {
        category: r.category,
        itemKey: r.itemKey,
        value: r.value,
        unit: r.unit,
        source: "DATABASE",
        lastUpdated: new Date().toISOString(),
      });
    }

    // ── Fingerprint ──
    const fingerprint = computeFingerprint(inventory, rateCard, machineList);

    return new CodeRegistry(papers, machines, sheets, rates, fingerprint);
  }

  // ── PAPER LOOKUPS ──

  getPaper(code: string): PaperRegistryEntry | undefined {
    return this.papers.get(code.toLowerCase());
  }

  /**
   * Find papers matching criteria.
   * All filters are optional — omit to match all.
   */
  findPapers(filters?: {
    category?: PaperCategory;
    gsm?: number;
    gsmRange?: [number, number];
    inStock?: boolean;
    sheetLabel?: string;
  }): PaperRegistryEntry[] {
    let results = Array.from(this.papers.values());

    // Deduplicate by code (some entries indexed by SKU too)
    const seen = new Set<string>();
    results = results.filter((p) => {
      if (seen.has(p.code)) return false;
      seen.add(p.code);
      return true;
    });

    if (filters?.category) {
      results = results.filter((p) => p.spec.category === filters.category);
    }
    if (filters?.gsm !== undefined) {
      results = results.filter((p) => p.spec.gsm === filters.gsm);
    }
    if (filters?.gsmRange) {
      const [min, max] = filters.gsmRange;
      results = results.filter((p) => p.spec.gsm >= min && p.spec.gsm <= max);
    }
    if (filters?.inStock) {
      results = results.filter((p) => p.stockSheets > 0);
    }
    if (filters?.sheetLabel) {
      results = results.filter((p) =>
        p.availableSheets.includes(filters.sheetLabel!),
      );
    }

    return results;
  }

  /** Get all unique paper categories in the registry */
  getCategories(): PaperCategory[] {
    const cats = new Set<PaperCategory>();
    this.papers.forEach((p) => cats.add(p.spec.category));
    return Array.from(cats);
  }

  /** Get all unique GSMs available for a category */
  getGSMsForCategory(category: PaperCategory): number[] {
    return this.findPapers({ category })
      .map((p) => p.spec.gsm)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => a - b);
  }

  // ── MACHINE LOOKUPS ──

  getMachine(id: string): MachineRegistryEntry | undefined {
    return this.machines.get(id);
  }

  getAllMachines(): MachineRegistryEntry[] {
    return Array.from(this.machines.values());
  }

  getOperationalMachines(): MachineRegistryEntry[] {
    return this.getAllMachines().filter((m) => m.operational);
  }

  getMachineSpecs(): MachineSpec[] {
    return this.getOperationalMachines().map((m) => m.spec);
  }

  // ── SHEET LOOKUPS ──

  getSheet(label: string): SheetRegistryEntry | undefined {
    return this.sheets.get(label);
  }

  getAllSheets(): SheetRegistryEntry[] {
    return Array.from(this.sheets.values());
  }

  getSheetSpecs(): SheetSpec[] {
    return this.getAllSheets().map((s) => s.spec);
  }

  // ── RATE LOOKUPS ──

  getRate(category: string, itemKey: string): number | undefined {
    return this.rates.get(`${category}:${itemKey}`)?.value;
  }

  getRatesForCategory(category: string): RateRegistryEntry[] {
    return Array.from(this.rates.values()).filter(
      (r) => r.category === category,
    );
  }

  // ── CHANGE DETECTION ──

  /**
   * Check if this registry is stale compared to new data.
   * Returns true if the fingerprint has changed.
   */
  isStale(newData: {
    inventory?: readonly InventoryPaperItem[];
    rateCard?: readonly RateCardPaperEntry[];
    machines?: readonly MachineSpec[];
  }): boolean {
    const newFingerprint = computeFingerprint(
      newData.inventory ?? [],
      newData.rateCard ?? [],
      newData.machines ?? MACHINE_DATABASE,
    );
    return newFingerprint !== this.fingerprint;
  }

  // ── STATS ──

  get stats() {
    return {
      papers: this.papers.size,
      machines: this.machines.size,
      sheets: this.sheets.size,
      rates: this.rates.size,
      inStockPapers: Array.from(this.papers.values()).filter(
        (p) => p.stockSheets > 0,
      ).length,
    };
  }

  /** Serialize for debugging */
  toJSON() {
    return {
      fingerprint: this.fingerprint,
      builtAt: this.builtAt,
      stats: this.stats,
      papers: Object.fromEntries(this.papers),
      machines: Object.fromEntries(this.machines),
      sheets: Object.fromEntries(this.sheets),
    };
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function uniqueArray(arr: readonly string[]): string[] {
  return [...new Set(arr)];
}

function getCommonGSMs(category: PaperCategory): number[] {
  switch (category) {
    case "MATT_ART":
    case "GLOSS_ART":
      return [80, 90, 100, 115, 128, 130, 150, 170, 200, 250, 300];
    case "WOODFREE":
      return [70, 80, 90, 100, 120];
    case "BULKY_WOODFREE":
      return [60, 70, 80, 90];
    case "BIBLE":
      return [30, 35, 40, 45, 50];
    case "ART_CARD":
      return [210, 250, 300, 350, 400];
    case "CHROMO":
      return [90, 100, 115, 130];
    case "BOARD":
      return [250, 300, 350, 400, 450];
    case "KRAFT":
      return [80, 100, 120, 150];
    case "NEWSPRINT":
      return [42, 45, 48, 52];
    default:
      return [80, 100, 120, 150, 200];
  }
}

/**
 * Compute a fingerprint for change detection.
 * Fast hash of relevant data shapes.
 */
function computeFingerprint(
  inventory: readonly InventoryPaperItem[],
  rateCard: readonly RateCardPaperEntry[],
  machines: readonly MachineSpec[],
): string {
  // Simple hash: count + first/last item checksums
  const parts = [
    `inv:${inventory.length}`,
    inventory.length > 0
      ? `${inventory[0].id}:${inventory[0].stockSheets}:${inventory[0].costPerKg}`
      : "inv:empty",
    inventory.length > 1
      ? `${inventory[inventory.length - 1].id}:${inventory[inventory.length - 1].stockSheets}`
      : "",
    `rc:${rateCard.length}`,
    rateCard.length > 0
      ? `${rateCard[0].category}:${rateCard[0].gsm}:${rateCard[0].ratePerKg}`
      : "rc:empty",
    `m:${machines.length}`,
    machines.map((m) => m.id).join(","),
  ];
  return parts.join("|");
}

// ─── SINGLETON HOOK PATTERN ─────────────────────────────────────────────────

let _currentRegistry: CodeRegistry | null = null;

/**
 * Get or build the global registry instance.
 *
 * Call this from React components or the wizard store.
 * Rebuilds automatically if data has changed (stale check).
 */
export function getRegistry(data: {
  inventory: readonly InventoryPaperItem[];
  rateCard: readonly RateCardPaperEntry[];
  machines?: readonly MachineSpec[];
}): CodeRegistry {
  if (_currentRegistry && !_currentRegistry.isStale(data)) {
    return _currentRegistry;
  }
  _currentRegistry = CodeRegistry.build(data);
  return _currentRegistry;
}

/**
 * Force rebuild the registry (e.g., after admin edits rates).
 */
export function invalidateRegistry(): void {
  _currentRegistry = null;
}
