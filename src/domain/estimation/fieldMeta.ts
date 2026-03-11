// ============================================================================
// FIELD METADATA UTILITIES
// ============================================================================
//
// Tracks the provenance and confidence of every field in the estimation.
//
// For each field:
//   - What is its current value?
//   - Where did it come from? (AUTO_PLANNED, USER_OVERRIDE, RATE_CARD, etc.)
//   - How confident are we? (0–1 score)
//   - What was it before override? (audit trail)
//   - Why was it chosen? (human-readable reason)
//
// This enables:
//   1. Audit trail (show user what was auto-chosen vs overridden)
//   2. Confidence visualization (gray out low-confidence fields)
//   3. Change history (what changed and why)
//   4. Undo/redo (revert to previous auto-plan)
//   5. Override detection (which fields did user modify?)
//
// Design:
//   - FieldMeta<T> is a wrapper around any field value
//   - Immutable updates: produce new FieldMeta instances
//   - Chainable builders for convenient construction
// ============================================================================

import type {
  FieldSource,
} from "./types";

// ─── CORE TYPES ─────────────────────────────────────────────────────────────

/**
 * Metadata for a single field.
 *
 * Wraps a value with complete provenance information.
 */
export interface FieldMeta<T = unknown> {
  /** Current value */
  readonly value: T;
  /** Where did this come from? */
  readonly source: FieldSource;
  /** Confidence score 0–1 (1 = 100% confident) */
  readonly confidence: number;
  /** Human-readable reason for this value */
  readonly reason?: string;
  /** Previous value before override (if user changed it) */
  readonly overriddenFrom?: T;
  /** Timestamp of last update */
  readonly timestamp: string;
  /** List of all sources considered (for UI: "tried ABC, chose XYZ") */
  readonly alternativeSources?: FieldSource[];
}

/**
 * Complete metadata for a single section.
 * Maps field name → FieldMeta.
 */
export type SectionMeta = Record<string, FieldMeta>;

/**
 * Complete metadata for the entire estimation.
 * Maps section ID → SectionMeta.
 */
export type EstimationMeta = Record<string, SectionMeta>;

// ─── FACTORY FUNCTIONS ──────────────────────────────────────────────────────

/**
 * Create a FieldMeta from scratch.
 */
export function createFieldMeta<T>(
  value: T,
  source: FieldSource,
  confidence: number = 0.8,
  reason?: string,
): FieldMeta<T> {
  return {
    value,
    source,
    confidence: Math.min(1, Math.max(0, confidence)),
    reason,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Update a FieldMeta with a new value (user override).
 *
 * Preserves old value in overriddenFrom.
 */
export function overrideFieldMeta<T>(
  existing: FieldMeta<T>,
  newValue: T,
  reason?: string,
): FieldMeta<T> {
  return {
    value: newValue,
    source: "USER_OVERRIDE",
    confidence: 1.0,
    reason: reason ?? `User override: ${existing.source} → ${newValue}`,
    overriddenFrom: existing.value,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Revert a FieldMeta to its pre-override value.
 */
export function revertFieldMeta<T>(meta: FieldMeta<T>): FieldMeta<T> | null {
  if (!meta.overriddenFrom) return null;

  return {
    value: meta.overriddenFrom,
    source: meta.source, // Back to original source
    confidence: meta.confidence,
    reason: `Reverted from override`,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Mark a field as requiring user confirmation.
 *
 * Used when auto-plan suggests something suspicious
 * (very high waste, non-compliant grain, etc.).
 */
export function flagForReview<T>(
  meta: FieldMeta<T>,
  reason: string,
): FieldMeta<T> {
  return {
    ...meta,
    confidence: Math.max(0.3, meta.confidence - 0.3),
    reason: `⚠️ REVIEW NEEDED: ${reason}. Original reason: ${meta.reason}`,
  };
}

// ─── BULK OPERATIONS ────────────────────────────────────────────────────────

/**
 * Extract all fields that were overridden by the user.
 */
export function getOverriddenFields(meta: EstimationMeta): Array<{
  sectionId: string;
  fieldName: string;
  from: unknown;
  to: unknown;
  reason?: string;
}> {
  const overridden = [];

  for (const [sectionId, sectionMeta] of Object.entries(meta)) {
    for (const [fieldName, fieldMeta] of Object.entries(sectionMeta)) {
      if (fieldMeta.source === "USER_OVERRIDE" && fieldMeta.overriddenFrom !== undefined) {
        overridden.push({
          sectionId,
          fieldName,
          from: fieldMeta.overriddenFrom,
          to: fieldMeta.value,
          reason: fieldMeta.reason,
        });
      }
    }
  }

  return overridden;
}

/**
 * Extract all fields with low confidence (< threshold).
 */
export function getLowConfidenceFields(
  meta: EstimationMeta,
  threshold: number = 0.7,
): Array<{
  sectionId: string;
  fieldName: string;
  confidence: number;
  reason?: string;
  source: FieldSource;
}> {
  const lowConf = [];

  for (const [sectionId, sectionMeta] of Object.entries(meta)) {
    for (const [fieldName, fieldMeta] of Object.entries(sectionMeta)) {
      if (fieldMeta.confidence < threshold) {
        lowConf.push({
          sectionId,
          fieldName,
          confidence: fieldMeta.confidence,
          reason: fieldMeta.reason,
          source: fieldMeta.source,
        });
      }
    }
  }

  return lowConf.sort((a, b) => a.confidence - b.confidence);
}

/**
 * Get summary statistics about the metadata.
 */
export function getMetaStats(meta: EstimationMeta) {
  let totalFields = 0;
  let autoPlannedFields = 0;
  let userOverrideFields = 0;
  let lowConfidenceFields = 0;
  let avgConfidence = 0;

  for (const sectionMeta of Object.values(meta)) {
    for (const fieldMeta of Object.values(sectionMeta)) {
      totalFields++;
      if (fieldMeta.source === "AUTO_PLANNED") autoPlannedFields++;
      if (fieldMeta.source === "USER_OVERRIDE") userOverrideFields++;
      if (fieldMeta.confidence < 0.7) lowConfidenceFields++;
      avgConfidence += fieldMeta.confidence;
    }
  }

  return {
    totalFields,
    autoPlannedFields,
    userOverrideFields,
    lowConfidenceFields,
    averageConfidence: totalFields > 0 ? avgConfidence / totalFields : 0,
    autoPlannedPercent: totalFields > 0 ? (autoPlannedFields / totalFields) * 100 : 0,
  };
}

/**
 * Compare metadata before and after.
 * Returns what changed and why.
 */
export function compareMetadata(
  before: EstimationMeta,
  after: EstimationMeta,
) {
  const changes: Array<{
    sectionId: string;
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
    oldSource: FieldSource;
    newSource: FieldSource;
    oldConfidence: number;
    newConfidence: number;
  }> = [];

  for (const [sectionId, afterMeta] of Object.entries(after)) {
    const beforeMeta = before[sectionId] || {};

    for (const [fieldName, afterField] of Object.entries(afterMeta)) {
      const beforeField = beforeMeta[fieldName];

      if (!beforeField || beforeField.value !== afterField.value) {
        changes.push({
          sectionId,
          fieldName,
          oldValue: beforeField?.value,
          newValue: afterField.value,
          oldSource: beforeField?.source ?? "DEFAULT",
          newSource: afterField.source,
          oldConfidence: beforeField?.confidence ?? 0,
          newConfidence: afterField.confidence,
        });
      }
    }
  }

  return changes;
}

// ─── SERIALIZATION ──────────────────────────────────────────────────────────

/**
 * Serialize metadata to JSON for storage.
 */
export function serializeMeta(meta: EstimationMeta): string {
  return JSON.stringify(meta);
}

/**
 * Deserialize metadata from JSON.
 */
export function deserializeMeta(json: string): EstimationMeta {
  return JSON.parse(json) as EstimationMeta;
}

/**
 * Extract a human-readable audit trail from metadata.
 * Useful for showing change history to the user.
 */
export function generateAuditTrail(meta: EstimationMeta): string {
  const lines: string[] = [
    `=== ESTIMATION AUDIT TRAIL ===`,
    `Generated: ${new Date().toISOString()}`,
    ``,
  ];

  const stats = getMetaStats(meta);
  lines.push(`SUMMARY:`);
  lines.push(`  Total fields: ${stats.totalFields}`);
  lines.push(`  Auto-planned: ${stats.autoPlannedFields} (${stats.autoPlannedPercent.toFixed(0)}%)`);
  lines.push(`  User overrides: ${stats.userOverrideFields}`);
  lines.push(`  Low confidence: ${stats.lowConfidenceFields}`);
  lines.push(`  Average confidence: ${(stats.averageConfidence * 100).toFixed(0)}%`);
  lines.push(``);

  const overrides = getOverriddenFields(meta);
  if (overrides.length > 0) {
    lines.push(`USER OVERRIDES:`);
    for (const override of overrides) {
      lines.push(
        `  [${override.sectionId}] ${override.fieldName}: ` +
        `${override.from} → ${override.to}`,
      );
      if (override.reason) lines.push(`    Reason: ${override.reason}`);
    }
    lines.push(``);
  }

  const lowConf = getLowConfidenceFields(meta);
  if (lowConf.length > 0) {
    lines.push(`LOW CONFIDENCE FIELDS:`);
    for (const field of lowConf) {
      lines.push(
        `  [${field.sectionId}] ${field.fieldName}: ` +
        `${(field.confidence * 100).toFixed(0)}% (${field.source})`,
      );
      if (field.reason) lines.push(`    ${field.reason}`);
    }
  }

  return lines.join("\n");
}

// ─── CONFIDENCE SCORING ─────────────────────────────────────────────────────

/**
 * Calculate confidence for a paper selection.
 * Based on: exact GSM match, grain compliance, availability.
 */
export function scoreConfidencePaper(params: {
  exactGsmMatch: boolean;
  gsmDiff: number;
  grainCompliant: boolean;
  inStock: boolean;
  stockCoveragePct: number;
}): number {
  let score = 0.5; // Base

  if (params.exactGsmMatch) score += 0.3;
  else if (params.gsmDiff <= 10) score += 0.15;
  else if (params.gsmDiff <= 20) score += 0.05;

  if (params.grainCompliant) score += 0.15;
  else score -= 0.2; // Significant penalty

  if (params.inStock) {
    if (params.stockCoveragePct >= 1.0) score += 0.1;
    else if (params.stockCoveragePct >= 0.8) score += 0.05;
  } else {
    score -= 0.05; // Slight penalty for procurement
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Calculate confidence for imposition selection.
 * Based on: waste %, grain compliance, plate count.
 */
export function scoreConfidenceImposition(params: {
  wastePercent: number;
  grainCompliant: boolean;
  plateCount: number;
  machineAvailable: boolean;
}): number {
  let score = 0.7; // Base

  // Waste penalty
  if (params.wastePercent <= 5) score += 0.2;
  else if (params.wastePercent <= 10) score += 0.1;
  else if (params.wastePercent <= 20) score -= 0.1;
  else score -= 0.3; // High waste

  if (params.grainCompliant) score += 0.15;
  else score -= 0.15;

  // Plate count (fewer is better, but don't penalize normal)
  if (params.plateCount <= 8) score += 0.05;
  else if (params.plateCount > 32) score -= 0.05;

  if (!params.machineAvailable) score -= 0.2;

  return Math.min(1, Math.max(0, score));
}

/**
 * Calculate confidence for machine selection.
 * Based on: sheet fit, color capability, speed, cost.
 */
export function scoreConfidenceMachine(params: {
  sheetFits: boolean;
  colorCapable: boolean;
  speedRank: number; // 0–1, where 1 = fastest available
  costRank: number;  // 0–1, where 1 = cheapest available
  userPreferred: boolean;
}): number {
  let score = 0.6; // Base

  if (params.sheetFits) score += 0.2;
  else return 0; // Disqualified

  if (params.colorCapable) score += 0.15;
  else return 0; // Disqualified

  score += params.speedRank * 0.1;
  score += params.costRank * 0.1;

  if (params.userPreferred) score += 0.05;

  return Math.min(1, Math.max(0, score));
}

