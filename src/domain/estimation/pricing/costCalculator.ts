/**
 * Cost Calculator - Comprehensive cost breakdown for all estimation components
 * Calculates paper, printing, binding, finishing, and packing costs
 * from the auto-planning results.
 */

import type {
  EstimationResult,
  ImpositionCandidate,
} from "@/domain/estimation/imposition";

// ============================================================================
// COST BREAKDOWN INTERFACES
// ============================================================================

/**
 * Paper cost breakdown with quantity and weight calculations
 */
export interface PaperCostDetail {
  sectionType: string;
  paperName: string;
  gsm: number;
  quantity: number;
  unit: "sheets" | "kg" | "reams";
  unitCost: number;
  totalCost: number;
  wastageAllowance: number; // percentage
  costWithWastage: number;
}

/**
 * Printing cost including plates (CTP) and press impressions
 */
export interface PrintingCostDetail {
  sectionType: string;
  totalPlates: number;
  costPerPlate: number; // CTP plate cost
  totalPlateCost: number;
  totalImpressions: number;
  costPerImpression: number;
  totalImpressionCost: number;
  totalPrintingCost: number;
}

/**
 * Binding cost based on method and page count
 */
export interface BindingCostDetail {
  method: "perfect" | "saddle-stitch" | "wire" | "case" | "none";
  totalPages: number;
  quantity: number;
  ratePerUnit: number;
  setupCost: number;
  totalCost: number;
}

/**
 * Finishing effects with their individual costs
 */
export interface FinishingCostDetail {
  type: "lamination" | "spot-uv" | "embossing" | "foil-stamp" | "die-cut";
  coverage: "full" | "partial";
  areaPerCopy?: number; // cm² for partial
  ratePerUnit: number;
  setupCost: number;
  quantity: number;
  totalCost: number;
}

/**
 * Packing and delivery costs
 */
export interface PackingCostDetail {
  method: "carton" | "box" | "pallet" | "ply-carton";
  quantity: number;
  weight: number; // kg
  costPerUnit: number;
  totalCost: number;
}

/**
 * Complete pricing summary with all components
 */
export interface PriceQuotation {
  estimationId: string;
  quantity: number;
  
  // Cost components
  paperCosts: PaperCostDetail[];
  printingCosts: PrintingCostDetail[];
  bindingCost?: BindingCostDetail;
  finishingCosts: FinishingCostDetail[];
  packingCost?: PackingCostDetail;

  // Subtotals
  subtotal: {
    paper: number;
    printing: number;
    binding: number;
    finishing: number;
    packing: number;
    total: number;
  };

  // Commercial terms
  margin?: number; // percentage
  discount?: number; // percentage or rupees
  tax: {
    rate: number; // percentage (18% for GST in India)
    amount: number;
  };

  // Final pricing
  basePrice: number; // Before margin/discount
  finalPrice: number; // After margin/discount/tax
  pricePerCopy: number;

  // Metadata
  currency: string;
  createdAt: Date;
  validUntil?: Date;
}

// ============================================================================
// COST CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate paper costs for a given imposition candidate
 * Accounts for waste allowance and stock availability
 */
export function calculatePaperCost(
  candidate: ImpositionCandidate,
  paperPrice: number,
  quantity: number,
  gsm: number,
  wastePercentage: number = 0
): PaperCostDetail {
  // Calculate sheets needed
  const sheetsNeeded = candidate.totalSheets;
  const sheetsWithWaste = sheetsNeeded * (1 + wastePercentage / 100);

  // Cost calculation
  const unitCost = paperPrice; // assumed per sheet
  const subtotal = sheetsWithWaste * unitCost;

  return {
    sectionType: "text",
    paperName: candidate.sheet.label,
    gsm,
    quantity: Math.ceil(sheetsWithWaste),
    unit: "sheets",
    unitCost,
    totalCost: subtotal,
    wastageAllowance: wastePercentage,
    costWithWastage: subtotal,
  };
}

/**
 * Calculate CTP plate costs based on total plates required
 */
export function calculatePlateCost(
  totalPlates: number,
  costPerPlate: number = 500 // Default CTP plate cost
): { plates: number; cost: number } {
  return {
    plates: totalPlates,
    cost: totalPlates * costPerPlate,
  };
}

/**
 * Calculate printing cost (impressions on press)
 */
export function calculatePrintingCost(
  totalImpressions: number,
  costPerImpression: number = 0.5 // Default rate in currency units
): { impressions: number; cost: number } {
  return {
    impressions: totalImpressions,
    cost: totalImpressions * costPerImpression,
  };
}

/**
 * Calculate total printing cost (plates + impressions)
 */
export function calculateTotalPrintingCost(
  totalPlates: number,
  totalImpressions: number,
  costPerPlate: number = 500,
  costPerImpression: number = 0.5
): PrintingCostDetail {
  const plateCost = totalPlates * costPerPlate;
  const impressionCost = totalImpressions * costPerImpression;

  return {
    sectionType: "text",
    totalPlates,
    costPerPlate,
    totalPlateCost: plateCost,
    totalImpressions,
    costPerImpression,
    totalImpressionCost: impressionCost,
    totalPrintingCost: plateCost + impressionCost,
  };
}

/**
 * Calculate binding cost based on method and specifications
 */
export function calculateBindingCost(
  method: "perfect" | "saddle-stitch" | "wire" | "case" | "none",
  totalPages: number,
  quantity: number,
  ratePerUnit: number = 0,
  setupCost: number = 0
): BindingCostDetail {
  const totalCost = quantity * ratePerUnit + setupCost;

  return {
    method,
    totalPages,
    quantity,
    ratePerUnit,
    setupCost,
    totalCost,
  };
}

/**
 * Format cost for display with currency symbol
 */
export function formatCost(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Calculate GST (Goods and Services Tax) for India
 * Standard rate is 18% for printing services
 */
export function calculateGST(
  baseAmount: number,
  gstRate: number = 18
): { baseAmount: number; gstAmount: number; total: number } {
  const gstAmount = (baseAmount * gstRate) / 100;

  return {
    baseAmount,
    gstAmount,
    total: baseAmount + gstAmount,
  };
}

/**
 * Apply margin to cost (converts cost to selling price)
 */
export function applyMargin(
  cost: number,
  marginPercent: number
): { cost: number; margin: number; price: number } {
  const margin = (cost * marginPercent) / 100;
  const price = cost + margin;

  return { cost, margin, price };
}

/**
 * Apply discount to price
 */
export function applyDiscount(
  price: number,
  discountPercent: number
): { original: number; discount: number; final: number } {
  const discount = (price * discountPercent) / 100;
  const final = price - discount;

  return { original: price, discount, final };
}

/**
 * Convert price between currencies
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;

  // Assume rates are relative to base currency (e.g., INR)
  const baseRate = exchangeRates[fromCurrency] || 1;
  const targetRate = exchangeRates[toCurrency] || 1;

  return (amount * targetRate) / baseRate;
}

// ============================================================================
// AGGREGATION FUNCTIONS
// ============================================================================

/**
 * Aggregate all costs into a single quotation
 */
export function aggregateCosts(
  paperCosts: PaperCostDetail[],
  printingCosts: PrintingCostDetail[],
  bindingCost?: BindingCostDetail,
  finishingCosts: FinishingCostDetail[] = [],
  packingCost?: PackingCostDetail
): {
  paperTotal: number;
  printingTotal: number;
  bindingTotal: number;
  finishingTotal: number;
  packingTotal: number;
  grandTotal: number;
} {
  const paperTotal = paperCosts.reduce((sum, c) => sum + c.costWithWastage, 0);
  const printingTotal = printingCosts.reduce((sum, c) => sum + c.totalPrintingCost, 0);
  const bindingTotal = bindingCost?.totalCost || 0;
  const finishingTotal = finishingCosts.reduce((sum, c) => sum + c.totalCost, 0);
  const packingTotal = packingCost?.totalCost || 0;

  return {
    paperTotal,
    printingTotal,
    bindingTotal,
    finishingTotal,
    packingTotal,
    grandTotal: paperTotal + printingTotal + bindingTotal + finishingTotal + packingTotal,
  };
}
