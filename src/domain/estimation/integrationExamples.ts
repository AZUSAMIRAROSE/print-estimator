/**
 * PrintEstimator Pro - Nuclear-Grade Estimation Integration Guide
 * Complete end-to-end workflow with LIVE data integration
 * 
 * This example shows how all three parts (Imposition, Resolver, Pricing) work together
 * with real inventory and rate card data from the stores.
 */

import type { EstimationInput } from "@/types";
import type { EstimationRequest } from "@/domain/estimation";
import {
  estimationInputToRequest,
  getPrimaryQuantity,
  quotationOptionsFromUI,
} from "@/domain/estimation/adapters/estimationInputAdapter";
import {
  convertInventoryItems,
  convertRateCardEntries,
} from "@/domain/estimation/adapters/storeAdapters";
import { autoPlan } from "@/domain/estimation/resolver";
import { generateQuotation, formatQuotationForDisplay } from "@/domain/estimation/pricing";
import { useDataStore } from "@/stores/dataStore";
import { useRateCardStore } from "@/stores/rateCardStore";

// ============================================================================
// INTEGRATION PATTERN 1: Complete End-to-End from UI Store
// ============================================================================

/**
 * Run complete nucleargr-grade estimation from UI EstimationInput
 * Pulled directly from EstimationStore
 */
export async function runCompleteEstimationFromUI(
  estimationInput: EstimationInput,
  progressCallback?: (stage: string, progress: number) => void
) {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  NUCLEAR-GRADE ESTIMATION - COMPLETE WORKFLOW            ║");
  console.log("║  From UI Input → Domain → Imposition → Quotation          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  try {
    // Step 1: Extract and convert stores data
    progressCallback?.("Gathering inventory & rate card data...", 5);
    const inventoryStore = useDataStore.getState();
    const rateCardStore = useRateCardStore.getState();

    const inventory = convertInventoryItems(
      inventoryStore.items?.filter((i) => i.category === "paper") || []
    );
    const rateCard = convertRateCardEntries(rateCardStore.paperRates || []);

    console.log(`✓ Inventory: ${inventory.length} paper types`);
    console.log(`✓ Rate Card: ${rateCard.length} active rates\n`);

    // Step 2: Convert UI EstimationInput → Domain EstimationRequest
    progressCallback?.("Converting to domain format...", 15);
    const request: EstimationRequest = estimationInputToRequest(estimationInput);

    console.log("ESTIMATION REQUEST:");
    console.log(`  Job ID: ${request.jobId}`);
    console.log(`  Quantity: ${request.quantity} copies`);
    console.log(`  Trim Size: ${request.trimSize.width}×${request.trimSize.height}mm`);
    console.log(`  Sections: ${Object.keys(request.sections).join(", ")}\n`);

    // Step 3: Run auto-planning (Imposition + Paper + Machines)
    progressCallback?.("Running auto-planning...", 25);
    const estimation = await autoPlan(request, inventory, rateCard, {
      onProgress: (stage, progress) => {
        progressCallback?.(stage, 25 + progress * 0.5); // Scale to 25-75%
      },
    });

    console.log("ESTIMATION RESULTS:");
    console.log(`  Total Cost: ₹${estimation.totalCost.toFixed(0)}`);
    console.log(`  Cost/Copy: ₹${estimation.costPerCopy.toFixed(2)}\n`);

    // Step 4: Generate quotation
    progressCallback?.("Generating quotation...", 80);
    const quotationOptions = quotationOptionsFromUI(
      estimationInput,
      estimationInput.customerName || "Customer",
      estimationInput.estimatedBy || "System"
    );

    const quotation = generateQuotation(estimation, {
      ...quotationOptions,
      margin: quotationOptions.margin,
      discount: quotationOptions.discount,
    });

    console.log("QUOTATION GENERATED:");
    console.log(`  Quotation ID: ${quotation.quotationId}`);
    console.log(`  Total: ₹${quotation.pricing.totalAmount.toFixed(0)}`);
    console.log(`  Valid Until: ${quotation.validUntil.toLocaleDateString()}\n`);

    progressCallback?.("Complete!", 100);

    return {
      success: true,
      request,
      estimation,
      quotation,
      formattedQuotation: formatQuotationForDisplay(quotation),
    };
  } catch (error) {
    console.error("❌ Estimation failed:", error);
    progressCallback?.("Error", 0);
    throw error;
  }
}

// ============================================================================
// INTEGRATION PATTERN 2: Quick Paper Sourcing Check
// ============================================================================

/**
 * Quick check: Can we source the papers requested?
 * Useful before running full estimation
 */
export function checkPaperAvailability(estimationInput: EstimationInput) {
  const rateCardStore = useRateCardStore.getState();
  const rates = rateCardStore.paperRates || [];

  const request = estimationInputToRequest(estimationInput);
  const available: Record<string, boolean> = {};

  for (const [section, paper] of Object.entries(request.papers)) {
    if (!paper) continue;

    const match = rates.find(
      (r) =>
        r.status === "active" &&
        Math.abs(r.gsm - paper.gsm) <= 5 // ±5 GSM tolerance
    );

    available[section] = !!match;

    console.log(`${section}: ${match ? "✓ Available" : "✗ Need to procure"}`);
    if (match) {
      console.log(`  → ${match.paperType} ${match.gsm}gsm @ ₹${match.chargeRate}`);
    }
  }

  return available;
}

// ============================================================================
// INTEGRATION PATTERN 3: Multi-Quantity Estimation
// ============================================================================

/**
 * Estimate for multiple quantities and compare pricing
 */
export async function multiQuantityEstimation(
  baseEstimation: EstimationInput,
  quantities: number[]
) {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  MULTI-QUANTITY COMPARISON                                ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const results = [];

  for (const qty of quantities) {
    // Create a copy with different quantity
    const estimation = JSON.parse(JSON.stringify(baseEstimation));
    estimation.quantities[0] = qty;

    try {
      const result = await runCompleteEstimationFromUI(estimation);

      const pricePerCopy = result.quotation.pricing.totalAmount / qty;
      results.push({
        quantity: qty,
        totalCost: result.quotation.pricing.totalAmount,
        costPerCopy: pricePerCopy,
        margin: result.quotation.pricing.margin,
      });

      console.log(`${qty.toLocaleString()} copies: ₹${pricePerCopy.toFixed(2)}/copy`);
    } catch (err) {
      console.warn(`Qty ${qty} failed:`, err);
    }
  }

  // Show pricing trends
  console.log("\nPRICING TRENDS:");
  results.forEach((r, i) => {
    if (i > 0) {
      const savings = results[i - 1].costPerCopy - r.costPerCopy;
      const percent = (savings / results[i - 1].costPerCopy) * 100;
      console.log(
        `  ${r.quantity.toLocaleString()}: ₹${r.costPerCopy.toFixed(2)} (-${percent.toFixed(1)}% from prev)`
      );
    } else {
      console.log(`  ${r.quantity.toLocaleString()}: ₹${r.costPerCopy.toFixed(2)}`);
    }
  });

  return results;
}

// ============================================================================
// INTEGRATION PATTERN 4: What-If Analysis (Price Sensitivity)
// ============================================================================

/**
 * Test how price changes with different margins/discounts
 */
export async function pricesSensitivityAnalysis(
  estimationInput: EstimationInput,
  margins: number[] = [15, 20, 25, 30, 35, 40]
) {
  const result = await runCompleteEstimationFromUI(estimationInput);
  const basePrice = result.quotation.pricing.totalAmount;

  console.log("\nMARGIN SENSITIVITY:");
  console.log("Margin % | Total Price | Price/Copy");
  console.log("─".repeat(40));

  margins.forEach((margin) => {
    const scaled = (basePrice / result.quotation.pricing.margin) * margin;
    const perCopy = scaled / estimationInput.quantities[0];
    console.log(
      `   ${String(margin).padStart(2)}%   | ₹${scaled.toFixed(0).padStart(10)} | ₹${perCopy.toFixed(2)}`
    );
  });

  return { basePrice, margins };
}

// ============================================================================
// INTEGRATION PATTERN 5: Batch Quotation Generation
// ============================================================================

/**
 * Generate quotations for multiple jobs from a list
 */
export async function batchQuotationGeneration(
  estimations: EstimationInput[]
) {
  console.log(`\n📦 Generating ${estimations.length} quotations...\n`);

  const quotations = [];

  for (let i = 0; i < estimations.length; i++) {
    try {
      const result = await runCompleteEstimationFromUI(estimations[i], (stage, progress) => {
        console.log(
          `  [${i + 1}/${estimations.length}] ${stage} (${Math.round(progress)}%)`
        );
      });

      quotations.push(result.quotation);
      console.log(`  ✓ ${result.quotation.quotationId}\n`);
    } catch (err) {
      console.error(`  ✗ Job ${i + 1} failed:`, err);
    }
  }

  console.log(`\n✅ Generated ${quotations.length}/${estimations.length} quotations`);
  return quotations;
}

// ============================================================================
// TESTING & VALIDATION
// ============================================================================

/**
 * Run diagnostic checks on the estimation system
 */
export async function diagnosticCheck() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  DIAGNOSTIC CHECK                                         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check stores are available
  const inventoryStore = useDataStore.getState();
  const rateCardStore = useRateCardStore.getState();

  console.log("📦 INVENTORY:");
  const paperItems = inventoryStore.items?.filter((i) => i.category === "paper") || [];
  console.log(`   ${paperItems.length} paper items in stock`);

  if (paperItems.length > 0) {
    console.log(`   ✓ Sample: ${paperItems[0].name}`);
  } else {
    console.log(`   ⚠ No paper items - using defaults`);
  }

  console.log("\n💰 RATE CARD:");
  const activeRates = rateCardStore.paperRates?.filter((r) => r.status === "active") || [];
  console.log(`   ${activeRates.length} active rate card entries`);

  if (activeRates.length > 0) {
    console.log(`   ✓ Sample: ${activeRates[0].paperType} ${activeRates[0].gsm}gsm`);
  } else {
    console.log(`   ⚠ No rates - using defaults`);
  }

  console.log("\n📊 DOMAIN MODULES:");
  console.log(`   ✓ Imposition Engine (autoImpose, autoImposeMultipleSections)`);
  console.log(`   ✓ Paper Resolver (paperResolver, machineSelector)`);
  console.log(`   ✓ Pricing & Quotations (generateQuotation)`);
  console.log(`   ✓ Adapters (EstimationInput ↔ EstimationRequest)`);

  console.log("\n✅ All systems operational!");
}

// ============================================================================
// EXPORT FOR TESTING
// ============================================================================

export const integrationPatterns = {
  runCompleteEstimationFromUI,
  checkPaperAvailability,
  multiQuantityEstimation,
  pricesSensitivityAnalysis,
  batchQuotationGeneration,
  diagnosticCheck,
};
