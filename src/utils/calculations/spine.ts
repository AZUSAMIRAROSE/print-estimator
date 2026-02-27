// ============================================================================
// SPINE THICKNESS CALCULATION — EXACT EXCEL FORMULA
// ============================================================================
// Spine = Σ (pages_section / 2) × (GSM / 1000) × bulk_factor
// For each text section: leafs = pages / 2, thickness per leaf = GSM/1000 * bulk
// ============================================================================

import { BULK_FACTORS } from "@/constants";
import type { TextSection, EndleavesSection } from "@/types";

export interface SpineInput {
  textSections: { pages: number; gsm: number; paperType: string }[];
  endleaves?: { pages: number; gsm: number; paperType: string };
}

/**
 * Calculate spine thickness in mm (excluding board)
 * Formula: Σ (pages / 2) × (GSM / 1000) × bulk_factor
 */
export function calculateSpineThickness(input: SpineInput): number {
  let spine = 0;

  for (const section of input.textSections) {
    if (section.pages <= 0 || section.gsm <= 0) continue;
    
    const bulkFactor = getBulkFactor(section.paperType);
    const leaves = section.pages / 2; // Each leaf has 2 pages (front and back)
    const thicknessPerLeaf = (section.gsm / 1000) * bulkFactor; // mm
    spine += leaves * thicknessPerLeaf;
  }

  // Endleaves contribute to spine if present
  if (input.endleaves && input.endleaves.pages > 0) {
    const bulkFactor = getBulkFactor(input.endleaves.paperType);
    const leaves = input.endleaves.pages / 2;
    const thicknessPerLeaf = (input.endleaves.gsm / 1000) * bulkFactor;
    spine += leaves * thicknessPerLeaf;
  }

  return Math.round(spine * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate spine including board (for hardcase)
 * Spine with board = spine_text + (board_thickness_mm × 2)
 */
export function calculateSpineWithBoard(
  spineWithoutBoard: number,
  boardThicknessMM: number,
  bindingType: string
): number {
  if (bindingType === "section_sewn_hardcase" || bindingType === "case_binding") {
    return spineWithoutBoard + (boardThicknessMM * 2);
  }
  if (bindingType === "perfect_binding" || bindingType === "pur_binding") {
    return spineWithoutBoard + 2; // 2mm glue allowance
  }
  if (bindingType === "saddle_stitching") {
    return 0; // No spine for saddle stitched
  }
  return spineWithoutBoard;
}

function getBulkFactor(paperType: string): number {
  // Try exact match first
  if (BULK_FACTORS[paperType]) return BULK_FACTORS[paperType];
  
  // Try case-insensitive search
  const lower = paperType.toLowerCase();
  for (const [key, value] of Object.entries(BULK_FACTORS)) {
    if (key.toLowerCase() === lower) return value;
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return value;
  }
  
  // Default bulk factor
  return 1.0;
}