// ============================================================================
// QUOTATION SNAPSHOT SYSTEM
// ============================================================================
//
// Freezes a complete estimation at a point in time, enabling:
//   1. Exact reproduction of quoted prices (audit trail)
//   2. Detection of rate changes since quotation
//   3. Refresh/reprice with current rates (one-click)
//   4. Version history (quote v1, v2, v3...)
//   5. Comparison between versions
//
// A snapshot captures:
//   - The CanonicalEstimationInput (what was requested)
//   - The CanonicalEstimationResult[] (what was calculated)
//   - The CodeRegistry fingerprint (what rates/inventory existed)
//   - All rate card entries used in the calculation
//   - All inventory items referenced
//   - Timestamps and version metadata
//
// Storage: Serialized to JSON in the quotes table (payload_json column).
// ============================================================================

import type {
  CanonicalEstimationInput,
  CanonicalEstimationResult,
  PricingConfig,
  Diagnostic,
} from "./types";

import type { BookPlan, PlanSummary } from "./autoPlanner";
import type { AggregatedCosts } from "./costAggregator";
import type { RateCardPaperEntry, InventoryPaperItem } from "./paperResolver";
import type { CodeRegistry } from "./registry";

// ─── SNAPSHOT TYPES ─────────────────────────────────────────────────────────

export interface QuotationSnapshot {
  /** Unique snapshot ID */
  readonly id: string;
  /** Version number (1, 2, 3...) */
  readonly version: number;
  /** Parent snapshot ID (null for first version) */
  readonly parentVersion?: string;

  // ── Job data ──
  readonly estimationId: string;
  readonly jobTitle: string;
  readonly customerName: string;

  // ── Input freeze ──
  readonly input: CanonicalEstimationInput;

  // ── Results freeze ──
  readonly results: readonly CanonicalEstimationResult[];

  // ── Plan freeze ──
  readonly plans: readonly {
    readonly quantity: number;
    readonly summary: PlanSummary;
  }[];

  // ── Rate data freeze ──
  readonly frozenRates: FrozenRateData;

  // ── Metadata ──
  readonly registryFingerprint: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly status: SnapshotStatus;
  readonly notes: string;

  // ── Pricing summary (quick access) ──
  readonly pricingSummary: readonly {
    readonly quantity: number;
    readonly costPerCopy: number;
    readonly sellingPricePerCopy: number;
    readonly sellingPricePerCopy_foreign: number;
    readonly totalSellingPrice: number;
    readonly currency: string;
    readonly marginPercent: number;
  }[];
}

export type SnapshotStatus =
  | "DRAFT"
  | "QUOTED"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "REVISED"
  | "SUPERSEDED";

/**
 * Frozen rate data: all rates and inventory that were used
 * at the time of quotation. Enables exact reproduction.
 */
export interface FrozenRateData {
  /** Rate card entries that were active */
  readonly paperRates: readonly RateCardPaperEntry[];
  /** Inventory items that were referenced */
  readonly inventoryItems: readonly InventoryPaperItem[];
  /** Machine hourly rates */
  readonly machineRates: readonly {
    readonly machineId: string;
    readonly hourlyRate: number;
  }[];
  /** Exchange rates at time of quotation */
  readonly exchangeRates: readonly {
    readonly currency: string;
    readonly rateToINR: number;
  }[];
  /** Any other rate card values used */
  readonly otherRates: readonly {
    readonly category: string;
    readonly key: string;
    readonly value: number;
  }[];
}

// ─── CHANGE DETECTION ───────────────────────────────────────────────────────

export interface RateChange {
  readonly category: string;
  readonly key: string;
  readonly oldValue: number;
  readonly newValue: number;
  readonly changePercent: number;
  readonly impact: "INCREASE" | "DECREASE" | "UNCHANGED";
  readonly description: string;
}

export interface ChangeDetectionResult {
  /** Have any rates changed since the snapshot? */
  readonly hasChanges: boolean;
  /** Individual rate changes */
  readonly changes: readonly RateChange[];
  /** Estimated price impact */
  readonly estimatedPriceImpact: {
    readonly direction: "UP" | "DOWN" | "MIXED" | "NONE";
    /** Estimated % change in final price */
    readonly estimatedChangePercent: number;
    readonly description: string;
  };
  /** Recommendation */
  readonly recommendation:
    | "NO_ACTION"
    | "REVIEW_RECOMMENDED"
    | "REPRICE_RECOMMENDED"
    | "REPRICE_REQUIRED";
  readonly diagnostics: readonly Diagnostic[];
}

// ─── SNAPSHOT CREATION ──────────────────────────────────────────────────────

/**
 * Create a quotation snapshot from an estimation.
 *
 * Freezes all input, results, and rate data at the current moment.
 */
export function createSnapshot(params: {
  estimationId: string;
  jobTitle: string;
  customerName: string;
  input: CanonicalEstimationInput;
  results: readonly CanonicalEstimationResult[];
  planSummaries: readonly { quantity: number; summary: PlanSummary }[];
  registry: CodeRegistry;
  rateCard: readonly RateCardPaperEntry[];
  inventory: readonly InventoryPaperItem[];
  createdBy: string;
  notes?: string;
  version?: number;
  parentVersion?: string;
}): QuotationSnapshot {
  const {
    estimationId, jobTitle, customerName,
    input, results, planSummaries,
    registry, rateCard, inventory,
    createdBy, notes, version, parentVersion,
  } = params;

  // Freeze rates used in this estimation
  const frozenRates = freezeRates(results, rateCard, inventory, registry);

  // Build pricing summary for quick access
  const pricingSummary = results.map((r) => ({
    quantity: r.quantity,
    costPerCopy: r.pricing.costPerCopy,
    sellingPricePerCopy: r.pricing.sellingPricePerCopy,
    sellingPricePerCopy_foreign: r.pricing.sellingPricePerCopy_foreign,
    totalSellingPrice: r.pricing.totalSellingPrice,
    currency: input.pricing.currency,
    marginPercent: r.pricing.marginPercent,
  }));

  return {
    id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    version: version ?? 1,
    parentVersion,
    estimationId,
    jobTitle,
    customerName,
    input,
    results,
    plans: planSummaries,
    frozenRates,
    registryFingerprint: registry.fingerprint,
    createdAt: new Date().toISOString(),
    createdBy,
    status: "DRAFT",
    notes: notes ?? "",
    pricingSummary,
  };
}

/**
 * Freeze the rate data that was used in the estimation.
 */
function freezeRates(
  results: readonly CanonicalEstimationResult[],
  rateCard: readonly RateCardPaperEntry[],
  inventory: readonly InventoryPaperItem[],
  registry: CodeRegistry,
): FrozenRateData {
  // Collect paper categories/GSMs used
  const usedPapers = new Set<string>();
  for (const result of results) {
    for (const section of result.sections) {
      const imp = section.imposition?.selected;
      if (imp) {
        usedPapers.add(`${section.sectionType}`);
      }
    }
  }

  // Freeze relevant rate card entries
  const frozenPaperRates = rateCard.filter((r) => r.isActive);

  // Freeze referenced inventory items
  const frozenInventory = [...inventory];

  // Freeze machine rates
  const machineRates = registry.getAllMachines().map((m) => ({
    machineId: m.id,
    hourlyRate: m.spec.hourlyRate,
  }));

  // Freeze exchange rates
  const exchangeRates = [
    { currency: "INR", rateToINR: 1 },
    { currency: "GBP", rateToINR: 110 },
    { currency: "USD", rateToINR: 85 },
    { currency: "EUR", rateToINR: 92 },
  ];

  return {
    paperRates: frozenPaperRates,
    inventoryItems: frozenInventory,
    machineRates,
    exchangeRates,
    otherRates: [],
  };
}

// ─── CHANGE DETECTION ───────────────────────────────────────────────────────

/**
 * Detect rate changes between a snapshot and current data.
 *
 * Compares frozen rates against current registry/rate card
 * and reports all differences with estimated price impact.
 */
export function detectChanges(
  snapshot: QuotationSnapshot,
  currentRateCard: readonly RateCardPaperEntry[],
  currentInventory: readonly InventoryPaperItem[],
  currentRegistry: CodeRegistry,
): ChangeDetectionResult {
  const changes: RateChange[] = [];
  const diagnostics: Diagnostic[] = [];

  // ── Compare paper rates ──
  for (const frozenRate of snapshot.frozenRates.paperRates) {
    const currentRate = currentRateCard.find(
      (r) => r.category === frozenRate.category && r.gsm === frozenRate.gsm,
    );

    if (!currentRate) {
      changes.push({
        category: "paper",
        key: `${frozenRate.category}_${frozenRate.gsm}`,
        oldValue: frozenRate.ratePerKg,
        newValue: 0,
        changePercent: -100,
        impact: "DECREASE",
        description: `Paper rate removed: ${frozenRate.category} ${frozenRate.gsm}gsm`,
      });
      continue;
    }

    if (currentRate.ratePerKg !== frozenRate.ratePerKg) {
      const changePct = frozenRate.ratePerKg > 0
        ? ((currentRate.ratePerKg - frozenRate.ratePerKg) / frozenRate.ratePerKg) * 100
        : 100;

      changes.push({
        category: "paper",
        key: `${frozenRate.category}_${frozenRate.gsm}`,
        oldValue: frozenRate.ratePerKg,
        newValue: currentRate.ratePerKg,
        changePercent: round2(changePct),
        impact: changePct > 0.5 ? "INCREASE" : changePct < -0.5 ? "DECREASE" : "UNCHANGED",
        description: `Paper rate changed: ${frozenRate.category} ${frozenRate.gsm}gsm — Rs ${frozenRate.ratePerKg}/kg → Rs ${currentRate.ratePerKg}/kg (${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%)`,
      });
    }
  }

  // ── Compare machine rates ──
  for (const frozenMachine of snapshot.frozenRates.machineRates) {
    const currentMachine = currentRegistry.getMachine(frozenMachine.machineId);
    if (!currentMachine) continue;

    if (currentMachine.spec.hourlyRate !== frozenMachine.hourlyRate) {
      const changePct = frozenMachine.hourlyRate > 0
        ? ((currentMachine.spec.hourlyRate - frozenMachine.hourlyRate) / frozenMachine.hourlyRate) * 100
        : 100;

      changes.push({
        category: "machine",
        key: frozenMachine.machineId,
        oldValue: frozenMachine.hourlyRate,
        newValue: currentMachine.spec.hourlyRate,
        changePercent: round2(changePct),
        impact: changePct > 0.5 ? "INCREASE" : changePct < -0.5 ? "DECREASE" : "UNCHANGED",
        description: `Machine rate changed: ${currentMachine.spec.name} — Rs ${frozenMachine.hourlyRate}/hr → Rs ${currentMachine.spec.hourlyRate}/hr`,
      });
    }
  }

  // ── Compare inventory availability ──
  for (const frozenItem of snapshot.frozenRates.inventoryItems) {
    const currentItem = currentInventory.find((i) => i.id === frozenItem.id);
    if (!currentItem) {
      diagnostics.push({
        level: "WARN",
        code: "INVENTORY_REMOVED",
        message: `Inventory item no longer exists: ${frozenItem.name} (${frozenItem.sku})`,
      });
      continue;
    }

    if (currentItem.stockSheets < frozenItem.stockSheets * 0.5) {
      diagnostics.push({
        level: "WARN",
        code: "STOCK_LOW",
        message: `Stock significantly lower: ${currentItem.name} — was ${frozenItem.stockSheets}, now ${currentItem.stockSheets} sheets`,
      });
    }
  }

  // ── Compare exchange rates ──
  // (Would need current FX data injection — simplified here)

  // ── Calculate overall impact ──
  const significantChanges = changes.filter(
    (c) => Math.abs(c.changePercent) > 1,
  );

  const avgChangePct = significantChanges.length > 0
    ? significantChanges.reduce((sum, c) => sum + c.changePercent, 0) / significantChanges.length
    : 0;

  let direction: ChangeDetectionResult["estimatedPriceImpact"]["direction"];
  if (significantChanges.length === 0) direction = "NONE";
  else if (significantChanges.every((c) => c.impact === "INCREASE")) direction = "UP";
  else if (significantChanges.every((c) => c.impact === "DECREASE")) direction = "DOWN";
  else direction = "MIXED";

  let recommendation: ChangeDetectionResult["recommendation"];
  if (significantChanges.length === 0) {
    recommendation = "NO_ACTION";
  } else if (Math.abs(avgChangePct) > 10) {
    recommendation = "REPRICE_REQUIRED";
  } else if (Math.abs(avgChangePct) > 3) {
    recommendation = "REPRICE_RECOMMENDED";
  } else {
    recommendation = "REVIEW_RECOMMENDED";
  }

  if (significantChanges.length > 0) {
    diagnostics.push({
      level: recommendation === "REPRICE_REQUIRED" ? "ERROR" : "WARN",
      code: "RATES_CHANGED",
      message: `${significantChanges.length} rate(s) changed since quotation. Average change: ${avgChangePct > 0 ? "+" : ""}${avgChangePct.toFixed(1)}%. Recommendation: ${recommendation.replace(/_/g, " ").toLowerCase()}.`,
    });
  }

  return {
    hasChanges: changes.length > 0,
    changes,
    estimatedPriceImpact: {
      direction,
      estimatedChangePercent: round2(avgChangePct),
      description: direction === "NONE"
        ? "No significant rate changes detected"
        : `Estimated ${Math.abs(avgChangePct).toFixed(1)}% ${direction.toLowerCase()} in final price`,
    },
    recommendation,
    diagnostics,
  };
}

// ─── REFRESH / REPRICE ──────────────────────────────────────────────────────

/**
 * Create a new version of a snapshot with current rates.
 *
 * Re-runs the estimation with the SAME input but CURRENT rates,
 * producing a new snapshot with incremented version number.
 *
 * The caller is responsible for running runCanonicalEstimation()
 * with current data and passing the new results here.
 */
export function refreshSnapshot(
  original: QuotationSnapshot,
  newResults: readonly CanonicalEstimationResult[],
  newPlanSummaries: readonly { quantity: number; summary: PlanSummary }[],
  currentRegistry: CodeRegistry,
  currentRateCard: readonly RateCardPaperEntry[],
  currentInventory: readonly InventoryPaperItem[],
  refreshedBy: string,
): QuotationSnapshot {
  return createSnapshot({
    estimationId: original.estimationId,
    jobTitle: original.jobTitle,
    customerName: original.customerName,
    input: original.input,
    results: newResults,
    planSummaries: newPlanSummaries,
    registry: currentRegistry,
    rateCard: currentRateCard,
    inventory: currentInventory,
    createdBy: refreshedBy,
    notes: `Refreshed from v${original.version}. Previous price: Rs ${original.pricingSummary[0]?.sellingPricePerCopy ?? 0}/copy.`,
    version: original.version + 1,
    parentVersion: original.id,
  });
}

// ─── VERSION COMPARISON ─────────────────────────────────────────────────────

export interface VersionComparison {
  readonly v1: { version: number; id: string };
  readonly v2: { version: number; id: string };
  readonly quantityComparisons: readonly {
    readonly quantity: number;
    readonly v1_costPerCopy: number;
    readonly v2_costPerCopy: number;
    readonly v1_sellingPrice: number;
    readonly v2_sellingPrice: number;
    readonly costChange: number;
    readonly costChangePercent: number;
    readonly priceChange: number;
    readonly priceChangePercent: number;
  }[];
  readonly inputChanges: readonly string[];
  readonly rateChanges: readonly RateChange[];
}

/**
 * Compare two snapshot versions side by side.
 */
export function compareVersions(
  v1: QuotationSnapshot,
  v2: QuotationSnapshot,
): VersionComparison {
  const quantityComparisons: VersionComparison["quantityComparisons"][number][] = [];

  // Match quantities between versions
  const v1Quantities = new Map(
    v1.pricingSummary.map((p) => [p.quantity, p]),
  );
  const v2Quantities = new Map(
    v2.pricingSummary.map((p) => [p.quantity, p]),
  );

  const allQuantities = new Set([
    ...v1Quantities.keys(),
    ...v2Quantities.keys(),
  ]);

  for (const qty of allQuantities) {
    const p1 = v1Quantities.get(qty);
    const p2 = v2Quantities.get(qty);

    if (p1 && p2) {
      const costChange = p2.costPerCopy - p1.costPerCopy;
      const costChangePct = p1.costPerCopy > 0
        ? (costChange / p1.costPerCopy) * 100
        : 0;
      const priceChange = p2.sellingPricePerCopy - p1.sellingPricePerCopy;
      const priceChangePct = p1.sellingPricePerCopy > 0
        ? (priceChange / p1.sellingPricePerCopy) * 100
        : 0;

      quantityComparisons.push({
        quantity: qty,
        v1_costPerCopy: p1.costPerCopy,
        v2_costPerCopy: p2.costPerCopy,
        v1_sellingPrice: p1.sellingPricePerCopy,
        v2_sellingPrice: p2.sellingPricePerCopy,
        costChange: round2(costChange),
        costChangePercent: round2(costChangePct),
        priceChange: round2(priceChange),
        priceChangePercent: round2(priceChangePct),
      });
    }
  }

  // Detect input changes
  const inputChanges: string[] = [];
  if (v1.input.jobTitle !== v2.input.jobTitle) {
    inputChanges.push(`Job title: "${v1.input.jobTitle}" → "${v2.input.jobTitle}"`);
  }
  if (v1.input.pricing.marginPercent !== v2.input.pricing.marginPercent) {
    inputChanges.push(`Margin: ${v1.input.pricing.marginPercent}% → ${v2.input.pricing.marginPercent}%`);
  }
  if (v1.input.pricing.currency !== v2.input.pricing.currency) {
    inputChanges.push(`Currency: ${v1.input.pricing.currency} → ${v2.input.pricing.currency}`);
  }

  // Detect rate changes between frozen data
  const rateChanges: RateChange[] = [];
  for (const r1 of v1.frozenRates.paperRates) {
    const r2 = v2.frozenRates.paperRates.find(
      (r) => r.category === r1.category && r.gsm === r1.gsm,
    );
    if (r2 && r2.ratePerKg !== r1.ratePerKg) {
      const changePct = r1.ratePerKg > 0
        ? ((r2.ratePerKg - r1.ratePerKg) / r1.ratePerKg) * 100
        : 0;
      rateChanges.push({
        category: "paper",
        key: `${r1.category}_${r1.gsm}`,
        oldValue: r1.ratePerKg,
        newValue: r2.ratePerKg,
        changePercent: round2(changePct),
        impact: changePct > 0.5 ? "INCREASE" : changePct < -0.5 ? "DECREASE" : "UNCHANGED",
        description: `${r1.category} ${r1.gsm}gsm: Rs ${r1.ratePerKg} → Rs ${r2.ratePerKg}/kg`,
      });
    }
  }

  return {
    v1: { version: v1.version, id: v1.id },
    v2: { version: v2.version, id: v2.id },
    quantityComparisons,
    inputChanges,
    rateChanges,
  };
}

// ─── SERIALIZATION ──────────────────────────────────────────────────────────

/**
 * Serialize a snapshot to JSON for database storage.
 * This goes into the quotes.payload_json column.
 */
export function serializeSnapshot(snapshot: QuotationSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Deserialize a snapshot from JSON.
 */
export function deserializeSnapshot(json: string): QuotationSnapshot {
  return JSON.parse(json) as QuotationSnapshot;
}

/**
 * Extract the minimal quotation display data from a snapshot.
 * Used for listing quotations without loading full payload.
 */
export function extractQuotationSummary(snapshot: QuotationSnapshot) {
  return {
    id: snapshot.id,
    version: snapshot.version,
    estimationId: snapshot.estimationId,
    jobTitle: snapshot.jobTitle,
    customerName: snapshot.customerName,
    status: snapshot.status,
    createdAt: snapshot.createdAt,
    createdBy: snapshot.createdBy,
    currency: snapshot.input.pricing.currency,
    quantities: snapshot.pricingSummary.map((p) => ({
      quantity: p.quantity,
      sellingPrice: p.sellingPricePerCopy,
      total: p.totalSellingPrice,
      margin: p.marginPercent,
    })),
    hasRateChanges: false, // Set by caller after detectChanges()
  };
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}
