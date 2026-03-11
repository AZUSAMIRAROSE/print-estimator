// ============================================================================
// COST AGGREGATOR — UNIFIED COST PIPELINE
// ============================================================================
//
// Takes raw cost outputs from the existing calculation modules and the new
// BookPlan, then aggregates them into a single, auditable cost breakdown.
//
// This is the BRIDGE between:
//   - New auto-planning system (BookPlan from autoPlanner.ts)
//   - Existing TP-calibrated calculators (printing.ts, binding.ts, etc.)
//
// Pipeline:
//   1. Paper cost         (from BookPlan.sections[].paperCostTotal)
//   2. CTP cost           (plate count × rate from TP tables)
//   3. Printing cost      (impression rate × impressions from TP tables)
//   4. Binding cost       (from existing binding engine)
//   5. Finishing cost     (from existing finishing engine)
//   6. Packing cost      (from existing packing engine)
//   7. Freight cost       (from existing freight engine)
//   8. Pre-press cost    (proofs, film, design)
//   9. Additional costs  (user line items)
//  10. Machine overhead  (hours × hourly rate)
//  11. PVC aggregation   (sum of 1–10)
//  12. Selling price     (V189 MAX formula)
//  13. Tax + commission
//  14. Currency conversion
//
// CRITICAL: CTP cost is INCLUDED in printing total for TP calibration.
//           The breakdown separates them for display only.
// ============================================================================

import type {
  CostSummary,
  PricingSummary,
  PricingConfig,
  Diagnostic,
} from "./types";

// ─── COST LINE ITEMS ────────────────────────────────────────────────────────

/** Individual cost line from any calculation module */
export interface CostLine {
  readonly category: CostCategory;
  readonly label: string;
  readonly sectionId?: string;
  /** Total cost for this line (all copies) */
  readonly totalCost: number;
  /** Per-copy cost (totalCost / quantity) */
  readonly perCopyCost: number;
  /** Source module that produced this cost */
  readonly source: string;
  /** Detailed sub-breakdown */
  readonly breakdown?: Record<string, number>;
}

export type CostCategory =
  | "PAPER"
  | "CTP"
  | "PRINTING"
  | "BINDING"
  | "FINISHING"
  | "PACKING"
  | "FREIGHT"
  | "PRE_PRESS"
  | "ADDITIONAL"
  | "MACHINE_OVERHEAD";

/** Complete aggregated cost result */
export interface AggregatedCosts {
  /** All individual cost lines */
  readonly lines: readonly CostLine[];
  /** Summary by category */
  readonly summary: CostSummary;
  /** Total PVC (Production Value Cost) */
  readonly totalPVC: number;
  /** PVC per copy */
  readonly pvcPerCopy: number;
  /** Machine hours data */
  readonly machineHours: {
    readonly makeready: number;
    readonly running: number;
    readonly total: number;
    readonly hourlyRate: number;
    readonly overheadCost: number;
  };
  /** Pricing result */
  readonly pricing: PricingSummary;
  /** Tax and commission */
  readonly tax: {
    readonly taxableAmount: number;
    readonly taxRate: number;
    readonly taxAmount: number;
    readonly commission: number;
    readonly grandTotal: number;
  };
  readonly diagnostics: Diagnostic[];
}

// ─── SELLING PRICE: V189 MAX FORMULA ────────────────────────────────────────

/**
 * Thomson Press selling price formula from Excel V189.
 *
 * selling_price = MAX(
 *   ROUNDUP((PVC/copy + machineOverhead/copy) / (1 - margin%), 3),
 *   ROUNDUP(PVC/copy / (1 - discount%) / (1 - margin%), 3)
 * )
 *
 * Option A: Cost + machine overhead, divided by margin complement
 * Option B: Cost with discount and margin stacked
 * Final price = whichever is HIGHER (protects profitability)
 */
export function calculateSellingPrice(
  pvcPerCopy: number,
  machineOverheadPerCopy: number,
  marginPercent: number,
  discountPercent: number,
): { pricePerCopy: number; method: "OVERHEAD" | "MARGIN" } {
  const marginComplement = Math.max(0.01, 1 - marginPercent / 100);
  const discountComplement = Math.max(0.01, 1 - discountPercent / 100);

  // Option A: PVC + machine overhead, then margin
  const priceA = (pvcPerCopy + machineOverheadPerCopy) / marginComplement;
  const priceARounded = Math.ceil(priceA * 1000) / 1000;

  // Option B: PVC with discount and margin stacked
  const priceB = pvcPerCopy / discountComplement / marginComplement;
  const priceBRounded = Math.ceil(priceB * 1000) / 1000;

  if (priceARounded >= priceBRounded) {
    return { pricePerCopy: priceARounded, method: "OVERHEAD" };
  } else {
    return { pricePerCopy: priceBRounded, method: "MARGIN" };
  }
}

// ─── COST BUILDER ───────────────────────────────────────────────────────────

/**
 * Mutable builder for assembling cost lines.
 * Call addLine() for each cost, then build() to get the final result.
 */
export class CostAggregatorBuilder {
  private lines: CostLine[] = [];
  private quantity: number;
  private pricing: PricingConfig;
  private makereadyHours: number = 0;
  private runningHours: number = 0;
  private machineHourlyRate: number = 6500;
  private diagnostics: Diagnostic[] = [];

  constructor(quantity: number, pricing: PricingConfig) {
    this.quantity = Math.max(1, quantity);
    this.pricing = pricing;
  }

  /** Add a cost line item */
  addLine(
    category: CostCategory,
    label: string,
    totalCost: number,
    source: string,
    sectionId?: string,
    breakdown?: Record<string, number>,
  ): this {
    this.lines.push({
      category,
      label,
      sectionId,
      totalCost: round2(totalCost),
      perCopyCost: round3(totalCost / this.quantity),
      source,
      breakdown,
    });
    return this;
  }

  /** Set machine hours (accumulated from all sections) */
  setMachineHours(
    makeready: number,
    running: number,
    hourlyRate: number = 6500,
  ): this {
    this.makereadyHours = makeready;
    this.runningHours = running;
    this.machineHourlyRate = hourlyRate;
    return this;
  }

  /** Add a diagnostic message */
  addDiagnostic(level: Diagnostic["level"], code: string, message: string): this {
    this.diagnostics.push({ level, code, message });
    return this;
  }

  /** Build the final aggregated result */
  build(): AggregatedCosts {
    // ── Sum by category ──
    const byCategory = new Map<CostCategory, number>();
    for (const line of this.lines) {
      byCategory.set(
        line.category,
        (byCategory.get(line.category) ?? 0) + line.totalCost,
      );
    }

    const get = (cat: CostCategory) => byCategory.get(cat) ?? 0;

    // ── Machine overhead ──
    const totalMachineHours = this.makereadyHours + this.runningHours;
    const machineOverheadTotal = totalMachineHours * this.machineHourlyRate;
    const machineOverheadPerCopy = machineOverheadTotal / this.quantity;

    // ── PVC (Production Value Cost) ──
    // PVC includes ALL production costs except machine overhead
    // Machine overhead is added separately in V189 formula
    const totalPVC =
      get("PAPER") +
      get("CTP") +
      get("PRINTING") +
      get("BINDING") +
      get("FINISHING") +
      get("PACKING") +
      get("FREIGHT") +
      get("PRE_PRESS") +
      get("ADDITIONAL");

    const pvcPerCopy = totalPVC / this.quantity;

    // ── Cost summary ──
    const summary: CostSummary = {
      paper: round2(get("PAPER")),
      ctp: round2(get("CTP")),
      printing: round2(get("PRINTING")),
      binding: round2(get("BINDING")),
      finishing: round2(get("FINISHING")),
      packing: round2(get("PACKING")),
      freight: round2(get("FREIGHT")),
      prePress: round2(get("PRE_PRESS")),
      additional: round2(get("ADDITIONAL")),
      totalProduction: round2(totalPVC + machineOverheadTotal),
    };

    // ── Selling price (V189 MAX) ──
    const spResult = calculateSellingPrice(
      pvcPerCopy,
      machineOverheadPerCopy,
      this.pricing.marginPercent,
      this.pricing.discountPercent,
    );

    const sellingPricePerCopy = spResult.pricePerCopy;
    const totalSellingPrice = sellingPricePerCopy * this.quantity;
    const marginAmount = totalSellingPrice - (totalPVC + machineOverheadTotal);
    const effectiveMargin = totalSellingPrice > 0
      ? (marginAmount / totalSellingPrice) * 100
      : 0;

    // ── Currency conversion ──
    const fx = this.pricing.exchangeRate > 0 ? this.pricing.exchangeRate : 1;
    const isForeign = this.pricing.currency !== "INR" && fx > 1;
    const foreignPerCopy = isForeign ? sellingPricePerCopy / fx : sellingPricePerCopy;
    const foreignTotal = isForeign ? totalSellingPrice / fx : totalSellingPrice;

    const pricing: PricingSummary = {
      costPerCopy: round2(pvcPerCopy + machineOverheadPerCopy),
      sellingPricePerCopy: round2(sellingPricePerCopy),
      sellingPricePerCopy_foreign: round3(foreignPerCopy),
      totalSellingPrice: round2(totalSellingPrice),
      totalSellingPrice_foreign: round2(foreignTotal),
      marginAmount: round2(marginAmount),
      marginPercent: round2(effectiveMargin),
      pricingMethod: spResult.method,
    };

    // ── Tax & commission ──
    const taxRate = this.pricing.taxRate ?? 0;
    const taxAmount = this.pricing.includesTax
      ? totalSellingPrice - totalSellingPrice / (1 + taxRate / 100)
      : totalSellingPrice * (taxRate / 100);
    const commission = totalSellingPrice * ((this.pricing.commissionPercent ?? 0) / 100);
    const grandTotal = this.pricing.includesTax
      ? totalSellingPrice
      : totalSellingPrice + taxAmount;

    // ── Validation diagnostics ──
    if (effectiveMargin < 10) {
      this.addDiagnostic("WARN", "LOW_MARGIN",
        `Effective margin is ${effectiveMargin.toFixed(1)}% — below 10% threshold`);
    }
    if (pvcPerCopy <= 0) {
      this.addDiagnostic("ERROR", "ZERO_PVC", "Production cost is zero — check input data");
    }
    if (spResult.method === "MARGIN") {
      this.addDiagnostic("INFO", "PRICING_METHOD",
        "V189: Discount-margin method yielded higher price than overhead method");
    }

    return {
      lines: this.lines,
      summary,
      totalPVC: round2(totalPVC),
      pvcPerCopy: round3(pvcPerCopy),
      machineHours: {
        makeready: round2(this.makereadyHours),
        running: round2(this.runningHours),
        total: round2(totalMachineHours),
        hourlyRate: this.machineHourlyRate,
        overheadCost: round2(machineOverheadTotal),
      },
      pricing,
      tax: {
        taxableAmount: round2(totalSellingPrice),
        taxRate,
        taxAmount: round2(taxAmount),
        commission: round2(commission),
        grandTotal: round2(grandTotal),
      },
      diagnostics: this.diagnostics,
    };
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function round3(n: number): number {
  return Math.round((n || 0) * 1000) / 1000;
}

/**
 * Quick utility: sum all costs for a specific category from lines.
 */
export function sumCategory(
  lines: readonly CostLine[],
  category: CostCategory,
): number {
  return lines
    .filter((l) => l.category === category)
    .reduce((sum, l) => sum + l.totalCost, 0);
}

/**
 * Quick utility: get per-section cost breakdown.
 */
export function costsBySection(
  lines: readonly CostLine[],
): Map<string, CostLine[]> {
  const map = new Map<string, CostLine[]>();
  for (const line of lines) {
    const key = line.sectionId ?? "__global__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(line);
  }
  return map;
}

