// ============================================================================
// PROCUREMENT MANAGER
// ============================================================================
//
// Aggregates paper procurement needs across all sections and quantities,
// generates purchase orders, and tracks fulfillment.
//
// Pipeline:
//   1. Collect ProcurementRecommendation from each BookPlan section
//   2. Consolidate by paper spec + sheet size (merge identical needs)
//   3. Apply minimum order quantities (MOQ)
//   4. Generate PurchaseOrder with line items
//   5. Track fulfillment status
//   6. Recalculate availability after fulfillment
//
// This module works with BookPlan output from autoPlanner.ts
// and PaperResolutionResult from paperResolver.ts.
// ============================================================================

import type {
  PaperSpec,
  SheetSpec,
  ProcurementRecommendation,
  Diagnostic,
} from "./types";

import type { BookPlan } from "./autoPlanner";

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface ConsolidatedNeed {
  /** Unique key: "{category}_{gsm}_{sheetLabel}" */
  readonly key: string;
  readonly paper: PaperSpec;
  readonly sheet: SheetSpec;
  /** Total sheets needed across all sections and quantities */
  readonly totalSheetsNeeded: number;
  /** Total weight needed in kg */
  readonly totalWeightKg: number;
  /** Available in inventory */
  readonly availableSheets: number;
  /** Net shortfall after inventory */
  readonly shortfall: number;
  /** Which sections need this paper */
  readonly usedBy: readonly {
    readonly sectionId: string;
    readonly sectionLabel: string;
    readonly quantity: number;
    readonly sheetsNeeded: number;
  }[];
  /** Estimated cost to procure shortfall */
  readonly estimatedCost: number;
  /** Estimated lead time */
  readonly leadTimeDays: number;
  /** Confidence in the estimate */
  readonly confidence: number;
}

export interface PurchaseOrderLine {
  readonly lineNumber: number;
  readonly paperCode: string;
  readonly paperName: string;
  readonly gsm: number;
  readonly sheetSize: string;
  readonly quantitySheets: number;
  readonly quantityKg: number;
  readonly quantityReams: number;
  readonly unitCostPerKg: number;
  readonly lineTotal: number;
  readonly supplier?: string;
  readonly notes: string;
}

export interface PurchaseOrder {
  readonly id: string;
  readonly orderNumber: string;
  readonly estimationId: string;
  readonly jobTitle: string;
  readonly lines: readonly PurchaseOrderLine[];
  readonly totalCost: number;
  readonly totalWeightKg: number;
  readonly status: PurchaseOrderStatus;
  readonly createdAt: string;
  readonly requiredBy?: string;
  readonly notes: string;
}

export type PurchaseOrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CONFIRMED"
  | "PARTIAL_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface FulfillmentUpdate {
  readonly lineNumber: number;
  readonly receivedSheets: number;
  readonly receivedKg: number;
  readonly receivedAt: string;
  readonly batchNumber?: string;
  readonly qualityOk: boolean;
  readonly notes?: string;
}

// ─── CONSOLIDATION ──────────────────────────────────────────────────────────

/**
 * Consolidate procurement needs from multiple BookPlans.
 *
 * Merges identical paper + sheet combinations across sections
 * and quantities into single consolidated needs.
 */
export function consolidateNeeds(
  plans: readonly BookPlan[],
): ConsolidatedNeed[] {
  const needsMap = new Map<string, {
    paper: PaperSpec;
    sheet: SheetSpec;
    totalSheets: number;
    totalWeightKg: number;
    availableSheets: number;
    usedBy: ConsolidatedNeed["usedBy"][number][];
    costPerKg: number;
    confidence: number;
  }>();

  for (const plan of plans) {
    for (const section of plan.sections) {
      if (!section.paper || section.grossSheets <= 0) continue;

      const paper = section.paper.paper;
      const sheet = section.paper.sheet;
      const key = `${paper.category}_${paper.gsm}_${sheet.label}`.toLowerCase();

      const existing = needsMap.get(key);
      if (existing) {
        existing.totalSheets += section.grossSheets;
        existing.totalWeightKg += section.totalWeight_kg;
        existing.availableSheets = Math.max(
          existing.availableSheets,
          section.paper.availableSheets,
        );
        existing.usedBy.push({
          sectionId: section.sectionId,
          sectionLabel: section.label,
          quantity: plan.quantity,
          sheetsNeeded: section.grossSheets,
        });
      } else {
        needsMap.set(key, {
          paper,
          sheet,
          totalSheets: section.grossSheets,
          totalWeightKg: section.totalWeight_kg,
          availableSheets: section.paper.availableSheets,
          usedBy: [{
            sectionId: section.sectionId,
            sectionLabel: section.label,
            quantity: plan.quantity,
            sheetsNeeded: section.grossSheets,
          }],
          costPerKg: section.paper.costPerKg,
          confidence: section.paper.confidence,
        });
      }
    }
  }

  // Convert to ConsolidatedNeed
  return Array.from(needsMap.entries()).map(([key, data]) => {
    const shortfall = Math.max(0, data.totalSheets - data.availableSheets);
    const shortfallKg = data.totalWeightKg * (shortfall / Math.max(1, data.totalSheets));
    const estimatedCost = shortfallKg * data.costPerKg;

    return {
      key,
      paper: data.paper,
      sheet: data.sheet,
      totalSheetsNeeded: data.totalSheets,
      totalWeightKg: data.totalWeightKg,
      availableSheets: data.availableSheets,
      shortfall,
      usedBy: data.usedBy,
      estimatedCost,
      leadTimeDays: estimateLeadTime(shortfall, data.paper.category),
      confidence: data.confidence,
    };
  }).sort((a, b) => b.shortfall - a.shortfall);
}

/**
 * Estimate lead time based on shortfall volume and paper type.
 */
function estimateLeadTime(shortfallSheets: number, category: string): number {
  if (shortfallSheets <= 0) return 0;

  // Base lead time by category (common Indian market times)
  const baseDays: Record<string, number> = {
    MATT_ART: 7,
    GLOSS_ART: 7,
    WOODFREE: 10,
    BULKY_WOODFREE: 14,
    BIBLE: 21,
    ART_CARD: 5,
    CHROMO: 7,
    BOARD: 5,
    KRAFT: 3,
    NEWSPRINT: 3,
  };

  const base = baseDays[category] ?? 10;

  // Add time for large orders
  if (shortfallSheets > 10000) return base + 7;
  if (shortfallSheets > 5000) return base + 3;
  return base;
}

// ─── PURCHASE ORDER GENERATION ──────────────────────────────────────────────

/** Minimum order quantity in kg (most Indian paper suppliers) */
const DEFAULT_MOQ_KG = 100;

/** Buffer percentage to add to procurement quantity */
const PROCUREMENT_BUFFER_PCT = 5;

/**
 * Generate a purchase order from consolidated needs.
 *
 * Only includes items with a shortfall > 0.
 * Applies MOQ and buffer automatically.
 */
export function generatePurchaseOrder(
  needs: readonly ConsolidatedNeed[],
  estimationId: string,
  jobTitle: string,
  moqKg: number = DEFAULT_MOQ_KG,
): PurchaseOrder {
  const lines: PurchaseOrderLine[] = [];
  let totalCost = 0;
  let totalWeightKg = 0;

  const needsWithShortfall = needs.filter((n) => n.shortfall > 0);

  for (let i = 0; i < needsWithShortfall.length; i++) {
    const need = needsWithShortfall[i];

    // Calculate procurement quantity with buffer
    const bufferSheets = Math.ceil(need.shortfall * (1 + PROCUREMENT_BUFFER_PCT / 100));

    // Calculate weight
    const sheetArea_m2 =
      (need.sheet.size_mm.width / 1000) * (need.sheet.size_mm.height / 1000);
    const weightPerSheet = (sheetArea_m2 * need.paper.gsm) / 1000;
    let procureWeightKg = weightPerSheet * bufferSheets;

    // Apply MOQ
    if (procureWeightKg < moqKg && moqKg > 0) {
      procureWeightKg = moqKg;
    }

    const procureSheets = Math.ceil(procureWeightKg / weightPerSheet);
    const procureReams = procureSheets / 500;

    // Cost estimation
    const costPerKg = need.estimatedCost / Math.max(1, need.shortfall * weightPerSheet);
    const lineCost = procureWeightKg * (costPerKg > 0 ? costPerKg : 80);

    const notes: string[] = [];
    if (procureWeightKg >= moqKg && need.shortfall * weightPerSheet < moqKg) {
      notes.push(`Rounded up to MOQ: ${moqKg}kg`);
    }
    notes.push(
      `Used by: ${need.usedBy.map((u) => `${u.sectionLabel} (${u.quantity} copies)`).join(", ")}`,
    );

    lines.push({
      lineNumber: i + 1,
      paperCode: need.paper.code,
      paperName: need.paper.name,
      gsm: need.paper.gsm,
      sheetSize: need.sheet.label,
      quantitySheets: procureSheets,
      quantityKg: round2(procureWeightKg),
      quantityReams: round2(procureReams),
      unitCostPerKg: round2(costPerKg > 0 ? costPerKg : 80),
      lineTotal: round2(lineCost),
      notes: notes.join("; "),
    });

    totalCost += lineCost;
    totalWeightKg += procureWeightKg;
  }

  return {
    id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    orderNumber: generatePONumber(),
    estimationId,
    jobTitle,
    lines,
    totalCost: round2(totalCost),
    totalWeightKg: round2(totalWeightKg),
    status: "DRAFT",
    createdAt: new Date().toISOString(),
    notes: `Auto-generated for estimation ${estimationId}. ${lines.length} line items.`,
  };
}

// ─── FULFILLMENT TRACKING ───────────────────────────────────────────────────

/**
 * Apply a fulfillment update to a purchase order.
 * Returns a new PO with updated status.
 */
export function applyFulfillment(
  po: PurchaseOrder,
  updates: readonly FulfillmentUpdate[],
): PurchaseOrder {
  // Track received quantities per line
  const receivedByLine = new Map<number, number>();
  for (const update of updates) {
    const current = receivedByLine.get(update.lineNumber) ?? 0;
    receivedByLine.set(update.lineNumber, current + update.receivedSheets);
  }

  // Determine overall status
  let allReceived = true;
  let anyReceived = false;

  for (const line of po.lines) {
    const received = receivedByLine.get(line.lineNumber) ?? 0;
    if (received >= line.quantitySheets) {
      anyReceived = true;
    } else if (received > 0) {
      anyReceived = true;
      allReceived = false;
    } else {
      allReceived = false;
    }
  }

  let status: PurchaseOrderStatus;
  if (allReceived) status = "RECEIVED";
  else if (anyReceived) status = "PARTIAL_RECEIVED";
  else status = po.status;

  return { ...po, status };
}

/**
 * Check if all procurement needs are fulfilled for a job.
 */
export function isFullyProcured(
  needs: readonly ConsolidatedNeed[],
): boolean {
  return needs.every((n) => n.shortfall <= 0);
}

/**
 * Calculate remaining procurement cost.
 */
export function remainingProcurementCost(
  needs: readonly ConsolidatedNeed[],
): number {
  return needs
    .filter((n) => n.shortfall > 0)
    .reduce((sum, n) => sum + n.estimatedCost, 0);
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

let _poCounter = 0;

function generatePONumber(): string {
  _poCounter++;
  const date = new Date();
  const yy = date.getFullYear().toString().slice(2);
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  return `PO-${yy}${mm}-${_poCounter.toString().padStart(4, "0")}`;
}

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}
