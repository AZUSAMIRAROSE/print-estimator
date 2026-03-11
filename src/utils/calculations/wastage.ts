// ============================================================================
// WASTAGE CALCULATION — EXACT EXCEL WASTAGE CHART
// ============================================================================
// Wastage is PER FORM, not total!
// Total wastage = wastage_per_form × number_of_forms
// ============================================================================

import { WASTAGE_CHART } from "@/constants";

export interface WastageInput {
  quantity: number;
  maxColors: number; // max of front/back colors
  numberOfForms: number;
}

export interface WastageResult {
  wastagePerForm: number;
  totalWastage: number;
  isPercentage: boolean;
}

/**
 * Calculate wastage sheets based on the wastage chart
 * @param quantity - Print quantity
 * @param maxColors - Maximum colors (determines 4-col, 2-col, or 1-col wastage)
 * @param numberOfForms - Number of printing forms
 * @returns Wastage result with per-form and total wastage
 */
export function calculateWastage(input: WastageInput): WastageResult {
  const { quantity, maxColors, numberOfForms } = input;
  
  // Find the matching wastage entry
  const entry = WASTAGE_CHART.find(
    w => quantity >= w.minQuantity && quantity <= w.maxQuantity
  );
  
  if (!entry) {
    // Fallback for very large quantities
    const lastEntry = WASTAGE_CHART[WASTAGE_CHART.length - 1];
    const rate = maxColors >= 4 ? lastEntry.fourColorWaste
      : maxColors >= 2 ? lastEntry.twoColorWaste
      : lastEntry.oneColorWaste;
    
    return {
      wastagePerForm: Math.ceil(quantity * rate / 100),
      totalWastage: Math.ceil(quantity * rate / 100) * numberOfForms,
      isPercentage: true,
    };
  }
  
  let wastagePerForm: number;
  
  if (maxColors >= 4) {
    wastagePerForm = entry.fourColorWaste;
  } else if (maxColors >= 2) {
    wastagePerForm = entry.twoColorWaste;
  } else {
    wastagePerForm = entry.oneColorWaste;
  }
  
  if (entry.isPercentage) {
    // For quantities > 50000, wastage is a percentage
    wastagePerForm = Math.ceil(quantity * wastagePerForm / 100);
  }
  
  return {
    wastagePerForm,
    totalWastage: wastagePerForm * numberOfForms,
    isPercentage: entry.isPercentage,
  };
}