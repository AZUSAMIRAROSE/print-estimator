/**
 * Quotation Generator - Creates customer quotations with versioning and refresh capability
 * Handles margin/discount application, tax calculation, currency conversion, and quotation snapshots.
 */

import type {
  EstimationResult,
  EstimationRequest,
} from "@/domain/estimation/imposition/types";
import type { PriceQuotation } from "./costCalculator";
import {
  aggregateCosts,
  calculateGST,
  applyMargin,
  applyDiscount,
  convertCurrency,
  formatCost,
} from "./costCalculator";

// ============================================================================
// QUOTATION INTERFACES
// ============================================================================

/**
 * Customer quotation snapshot with versioning
 */
export interface CustomerQuotation {
  quotationId: string;
  estimationId: string;
  version: number;
  
  // Parties
  customerName: string;
  customerEmail: string;
  preparedBy: string;

  // Subject line
  subject: string;
  description: string;

  // Specification summary
  jobSpec: {
    quantity: number;
    trimSize: string;
    paperDetails: string[];
    bindingMethod: string;
    finishingDetails: string[];
  };

  // Pricing details
  pricing: {
    subtotal: number;
    margin: number;
    discount: number;
    taxableAmount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  };

  // Commercial terms
  currency: string;
  paymentTerms: string; // e.g., "50% advance, balance on delivery"
  deliveryTime: string; // e.g., "10-15 working days"
  validity: string; // e.g., "Valid until 30 days"
  validUntil: Date;

  // Notes
  notes?: string;
  termsAndConditions?: string;

  // Metadata
  createdAt: Date;
  createdBy: string;
  lastModified: Date;
}

/**
 * Quotation customization options before final generation
 */
export interface QuotationOptions {
  customerName: string;
  customerEmail?: string;
  preparedBy: string;
  
  // Pricing customization
  marginPercent?: number; // Override default
  discountPercent?: number; // Percentage discount
  discountAmount?: number; // Fixed amount discount
  
  // Terms
  paymentTerms?: string;
  deliveryDays?: number;
  validityDays?: number;
  
  // Localization
  currency?: string;
  taxRate?: number; // Override default (18% for GST in India)
  
  // Additional
  notes?: string;
  subject?: string;
}

/**
 * Quotation refresh request (for re-pricing)
 */
export interface QuotationRefreshRequest {
  quotationId: string;
  estimationId: string;
  options?: Partial<QuotationOptions>;
}

/**
 * Quotation comparison result
 */
export interface QuotationComparison {
  currentVersion: CustomerQuotation;
  refreshedVersion: CustomerQuotation;
  changes: {
    priceChanged: boolean;
    oldPrice: number;
    newPrice: number;
    priceDifference: number;
    percentageChange: number;
  };
}

// ============================================================================
// QUOTATION GENERATION
// ============================================================================

/**
 * Generate a customer quotation from estimation result
 */
export function generateQuotation(
  estimation: EstimationResult,
  options: QuotationOptions,
  defaultMargin: number = 30, // 30% default margin
  defaultTaxRate: number = 18 // 18% GST for India
): CustomerQuotation {
  const marginPercent = options.marginPercent ?? defaultMargin;
  const discountPercent = options.discountPercent ?? 0;
  const discountAmount = options.discountAmount ?? 0;
  const taxRate = options.taxRate ?? defaultTaxRate;
  const currency = options.currency ?? "INR";

  // Build specification summary
  const paperDetails = (Object.entries(estimation.paperSources) as [string, any][])
    .filter(([_, source]) => source?.recommended)
    .map(
      ([sectionType, source]) =>
        `${sectionType}: ${source.recommended?.paper.name} ${source.recommended?.paper.gsm}gsm`
    );

  const finishingDetails: string[] = [];
  // Could include lamination, spot UV, embossing details if in estimates

  // Calculate pricing
  const baseSubtotal = estimation.totalCost;
  const withMargin = applyMargin(baseSubtotal, marginPercent);

  let finalPrice = withMargin.price;
  let appliedDiscount = 0;

  if (discountPercent > 0) {
    const discountCalc = applyDiscount(withMargin.price, discountPercent);
    finalPrice = discountCalc.final;
    appliedDiscount = discountCalc.discount;
  } else if (discountAmount > 0) {
    finalPrice = Math.max(0, finalPrice - discountAmount);
    appliedDiscount = discountAmount;
  }

  // Calculate tax
  const taxableAmount = finalPrice;
  const taxCalc = calculateGST(taxableAmount, taxRate);
  const taxAmount = taxCalc.gstAmount;
  const totalAmount = taxCalc.total;

  // Validity
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (options.validityDays ?? 30));

  const quotation: CustomerQuotation = {
    quotationId: `QT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    estimationId: estimation.request.jobId,
    version: 1,

    customerName: options.customerName,
    customerEmail: options.customerEmail || "",
    preparedBy: options.preparedBy,

    subject:
      options.subject ||
      `Quotation for ${estimation.request.quantity} copies - ${estimation.request.trimSize.width}×${estimation.request.trimSize.height}mm`,
    description: `Print estimate for job #${estimation.request.jobId}`,

    jobSpec: {
      quantity: estimation.request.quantity,
      trimSize: `${estimation.request.trimSize.width}×${estimation.request.trimSize.height}mm`,
      paperDetails,
      bindingMethod: "To be confirmed",
      finishingDetails,
    },

    pricing: {
      subtotal: baseSubtotal,
      margin: withMargin.margin,
      discount: appliedDiscount,
      taxableAmount,
      taxRate,
      taxAmount,
      totalAmount,
    },

    currency,
    paymentTerms: options.paymentTerms || "50% advance, balance on delivery",
    deliveryTime: `${options.deliveryDays ?? 10}-${(options.deliveryDays ?? 10) + 5} working days`,
    validity: `Valid until ${validUntil.toLocaleDateString()}`,
    validUntil,

    notes: options.notes,
    termsAndConditions: getStandardTermsAndConditions(),

    createdAt: new Date(),
    createdBy: options.preparedBy,
    lastModified: new Date(),
  };

  return quotation;
}

/**
 * Refresh a quotation with potential price changes
 * Useful for re-costing due to paper price changes, qty adjustments, etc.
 */
export function refreshQuotation(
  currentQuotation: CustomerQuotation,
  newEstimation: EstimationResult,
  options?: Partial<QuotationOptions>
): QuotationComparison {
  const mergedOptions: QuotationOptions = {
    customerName: currentQuotation.customerName,
    customerEmail: currentQuotation.customerEmail,
    preparedBy: options?.preparedBy ?? currentQuotation.preparedBy,
    marginPercent: options?.marginPercent ?? (currentQuotation.pricing.margin / currentQuotation.pricing.subtotal) * 100,
    discountPercent: options?.discountPercent,
    paymentTerms: options?.paymentTerms ?? currentQuotation.paymentTerms,
    currency: options?.currency ?? currentQuotation.currency,
    taxRate: options?.taxRate ?? currentQuotation.pricing.taxRate,
    subject: options?.subject ?? currentQuotation.subject,
  };

  const refreshedQuotation = generateQuotation(newEstimation, mergedOptions);
  refreshedQuotation.version = currentQuotation.version + 1;

  const oldPrice = currentQuotation.pricing.totalAmount;
  const newPrice = refreshedQuotation.pricing.totalAmount;

  return {
    currentVersion: currentQuotation,
    refreshedVersion: refreshedQuotation,
    changes: {
      priceChanged: oldPrice !== newPrice,
      oldPrice,
      newPrice,
      priceDifference: newPrice - oldPrice,
      percentageChange: ((newPrice - oldPrice) / oldPrice) * 100,
    },
  };
}

// ============================================================================
// QUOTATION FORMATTING & EXPORT
// ============================================================================

/**
 * Format quotation for display/email
 */
export function formatQuotationForDisplay(q: CustomerQuotation): string {
  const lines: string[] = [];

  lines.push("═".repeat(60));
  lines.push(`QUOTATION #${q.quotationId.split("-")[0]}`);
  lines.push(`Version: ${q.version}`);
  lines.push("═".repeat(60));
  lines.push("");

  lines.push(`DATE: ${q.createdAt.toLocaleDateString()}`);
  lines.push(`VALID UNTIL: ${q.validUntil.toLocaleDateString()}`);
  lines.push("");

  lines.push("─ CUSTOMER ─");
  lines.push(`Name: ${q.customerName}`);
  if (q.customerEmail) lines.push(`Email: ${q.customerEmail}`);
  lines.push("");

  lines.push("─ JOB SPECIFICATION ─");
  lines.push(`Quantity: ${q.jobSpec.quantity} copies`);
  lines.push(`Trim Size: ${q.jobSpec.trimSize}`);
  lines.push(`Papers:`);
  q.jobSpec.paperDetails.forEach((p) => lines.push(`  • ${p}`));
  lines.push("");

  lines.push("─ PRICING ─");
  lines.push(`Subtotal:        ${formatCost(q.pricing.subtotal, q.currency)}`);
  if (q.pricing.margin > 0) {
    lines.push(`Margin:          ${formatCost(q.pricing.margin, q.currency)}`);
  }
  if (q.pricing.discount > 0) {
    lines.push(`Discount:       -${formatCost(q.pricing.discount, q.currency)}`);
  }
  lines.push(`─`.repeat(30));
  lines.push(`Taxable Amount:  ${formatCost(q.pricing.taxableAmount, q.currency)}`);
  lines.push(`Tax (${q.pricing.taxRate}%):      ${formatCost(q.pricing.taxAmount, q.currency)}`);
  lines.push("═".repeat(30));
  lines.push(`TOTAL:           ${formatCost(q.pricing.totalAmount, q.currency)}`);
  lines.push("");

  lines.push("─ COMMERCIAL TERMS ─");
  lines.push(`Payment Terms:   ${q.paymentTerms}`);
  lines.push(`Delivery Time:   ${q.deliveryTime}`);
  lines.push("");

  if (q.notes) {
    lines.push("─ NOTES ─");
    lines.push(q.notes);
    lines.push("");
  }

  lines.push("═".repeat(60));

  return lines.join("\n");
}

/**
 * Standard terms and conditions
 */
function getStandardTermsAndConditions(): string {
  return `
Standard Terms & Conditions:
1. Payment: 50% advance, balance on delivery
2. Delivery: FOB (Free On Board) - customer responsible for transport after delivery
3. Quality: Subject to industry standards and client approval
4. Validity: 30 days from quotation date
5. Taxes: GST @18% extra as applicable
6. Revision: Quote valid only for specifications mentioned above. Any changes will require fresh quotation.
7. Cancellation: Cancellation after production starts will attract 50% charges minimum.
`.trim();
}

/**
 * Calculate price per copy from quotation
 */
export function getPricePerCopy(
  quotation: CustomerQuotation,
  estimationRequest: EstimationRequest
): number {
  return quotation.pricing.totalAmount / estimationRequest.quantity;
}

/**
 * Generate quotation summary for quick reference
 */
export function generateQuotationSummary(
  quotation: CustomerQuotation,
  estimationRequest: EstimationRequest
): string {
  const pricePerCopy = getPricePerCopy(quotation, estimationRequest);

  return `
Quotation Summary (v${quotation.version})
Qty: ${estimationRequest.quantity} | Total: ${formatCost(quotation.pricing.totalAmount, quotation.currency)} | Per Copy: ${formatCost(pricePerCopy, quotation.currency)}
  `.trim();
}
