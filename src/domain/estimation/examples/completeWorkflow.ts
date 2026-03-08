/**
 * Complete End-to-End Estimation Example
 * Shows the full workflow from request through final quotation generation
 * using all three Parts: Imposition, Resolver, and Pricing
 */

import type { EstimationRequest, TextSection, CoverSection, Dimensions } from "@/domain/estimation/imposition";
import { autoPlan } from "@/domain/estimation/resolver";
import { generateQuotation, formatQuotationForDisplay, generateQuotationSummary } from "@/domain/estimation/pricing";
import type { QuotationOptions } from "@/domain/estimation/pricing";

// ============================================================================
// EXAMPLE: Complete Job from Quote to PDF
// ============================================================================

/**
 * Simulate the complete user workflow
 */
export async function completeEstimationWorkflow() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║  PRINT ESTIMATOR PRO - COMPLETE WORKFLOW EXAMPLE          ║");
  console.log("║  From Job Specification → Auto-Plan → Quotation           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // ════════════════════════════════════════════════════════════════════════
  // STAGE 1: Create Estimation Request
  // ════════════════════════════════════════════════════════════════════════

  console.log("STAGE 1: Job Specification");
  console.log("─".repeat(60));

  const trimSize: Dimensions = { width: 153, height: 234 }; // Crown size

  const request: EstimationRequest = {
    jobId: "EST-2026-VL-001",
    quantity: 1500,
    trimSize,

    sections: {
      text: {
        type: "text",
        pageCounts: { front: 280, back: 0 },
        colors: { frontColor: "4color", backColor: "black" },
        trimSize,
      } as TextSection,
      cover: {
        type: "cover",
        trimSize,
        spineWidth: 18,
        bleedAllowance: 3,
        colors: { frontColor: "4color", backColor: "4color" },
      } as CoverSection,
      jacket: undefined,
      endleaf: undefined,
    },

    papers: {
      text: {
        id: "paper-1",
        name: "Matt Art Paper",
        gsm: 100,
        bulkFactor: 1.4,
        grain: "long",
        availableSheets: [],
        basePrice: 3200,
        availability: "in_stock",
      },
      cover: {
        id: "paper-2",
        name: "Art Card",
        gsm: 350,
        bulkFactor: 0.6,
        grain: "long",
        availableSheets: [],
        basePrice: 10500,
        availability: "in_stock",
      },
      jacket: undefined,
      endleaf: undefined,
    },

    preferences: {
      maxWastePercentage: 25,
      allowNonCompliantGrain: false,
    },
  };

  console.log(`Job ID: ${request.jobId}`);
  console.log(`Quantity: ${request.quantity} copies`);
  console.log(`Trim Size: ${trimSize.width}×${trimSize.height}mm (Crown size)`);
  console.log(`Text: 280pp, 4-color front`);
  console.log(`Cover: Full color`);
  console.log("");

  // ════════════════════════════════════════════════════════════════════════
  // STAGE 2: Run Auto-Planning
  // ════════════════════════════════════════════════════════════════════════

  console.log("STAGE 2: Running Auto-Planning");
  console.log("─".repeat(60));

  const inventoryItems = [
    {
      id: "inv-1",
      name: "Matt Art Paper 100gsm",
      sku: "PAP-MA-100",
      category: "paper" as const,
      subcategory: "Art Paper",
      stock: 500,
      unit: "Reams",
      costPerUnit: 3200,
      sellingPrice: 3600,
      supplier: "JK Paper",
      leadTimeDays: 5,
      weight: 31,
      tags: ["long-grain"],
    },
    {
      id: "inv-2",
      name: "Art Card 350gsm",
      sku: "PAP-AC-350",
      category: "paper" as const,
      subcategory: "Card Board",
      stock: 120,
      unit: "Reams",
      costPerUnit: 10500,
      sellingPrice: 11500,
      supplier: "ITC",
      leadTimeDays: 10,
      weight: 88,
      tags: ["long-grain"],
    },
  ];

  const rateCardEntries = [
    {
      id: "rate-1",
      paperType: "Matt Art Paper",
      gsm: 100,
      size: "25x36",
      landedCost: 3200,
      chargeRate: 3600,
      ratePerKg: 102400,
      supplier: "JK Paper",
      moq: 500,
      status: "active" as const,
    },
    {
      id: "rate-2",
      paperType: "Art Card",
      gsm: 350,
      size: "25x36",
      landedCost: 10500,
      chargeRate: 11500,
      ratePerKg: 119318,
      supplier: "ITC",
      moq: 100,
      status: "active" as const,
    },
  ];

  const estimation = await autoPlan(request, inventoryItems, rateCardEntries, {
    onProgress: (stage, progress) => {
      console.log(`  [${progress}%] ${stage}`);
    },
  });

  console.log("\nAuto-Planning Results:");
  console.log(`  Total Cost: ₹${estimation.totalCost.toFixed(2)}`);
  console.log(`  Cost per copy: ₹${estimation.costPerCopy.toFixed(2)}`);
  console.log("");

  // ════════════════════════════════════════════════════════════════════════
  // STAGE 3: Generate Customer Quotation
  // ════════════════════════════════════════════════════════════════════════

  console.log("STAGE 3: Generating Quotation");
  console.log("─".repeat(60));

  const quotationOptions: QuotationOptions = {
    customerName: "Vindhya Lime - Publishing Pvt Ltd",
    customerEmail: "print@vindhyalime.com",
    preparedBy: "Sales Team - Print Estimator Pro",
    marginPercent: 35, // 35% margin
    discountPercent: 5, // 5% discount for bulk
    paymentTerms: "50% advance, 50% on delivery",
    deliveryDays: 14,
    validityDays: 60,
    currency: "INR",
    taxRate: 18, // GST
    subject: "Quotation for 280pp Book Printing - 1500 copies",
    notes: "Prices valid for delivery in Delhi NCR region. Shipping charges extra for other locations.",
  };

  const quotation = generateQuotation(estimation, quotationOptions, 35, 18);

  console.log(`Quotation ID: ${quotation.quotationId}`);
  console.log(`Version: ${quotation.version}`);
  console.log(`Valid Until: ${quotation.validUntil.toLocaleDateString("en-IN")}`);
  console.log("");

  // ════════════════════════════════════════════════════════════════════════
  // STAGE 4: Display Quotation
  // ════════════════════════════════════════════════════════════════════════

  console.log("QUOTATION SUMMARY:");
  console.log(generateQuotationSummary(quotation, request));
  console.log("");

  // ════════════════════════════════════════════════════════════════════════
  // STAGE 5: Detailed Quotation
  // ════════════════════════════════════════════════════════════════════════

  console.log("\nDETAILED QUOTATION:");
  console.log("─".repeat(60));
  console.log(formatQuotationForDisplay(quotation));

  return {
    request,
    estimation,
    quotation,
  };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example 1: Quick API endpoint response
 */
export async function apiQuoteEndpoint(jobData: any) {
  try {
    const inventoryData = []; // Fetch from store
    const rateCardData = []; // Fetch from store

    const estimation = await autoPlan(jobData.request, inventoryData, rateCardData);

    const quotation = generateQuotation(estimation, {
      customerName: jobData.customerName,
      customerEmail: jobData.customerEmail,
      preparedBy: "API Service",
      marginPercent: jobData.margin || 30,
    });

    return {
      success: true,
      quotation,
      summary: generateQuotationSummary(quotation, jobData.request),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Example 2: Batch quotations for multiple jobs
 */
export async function batchQuotations(jobs: any[]) {
  const results = [];

  for (const job of jobs) {
    try {
      const estimation = await autoPlan(job.request, [], []);
      const quotation = generateQuotation(estimation, {
        customerName: job.customerName,
        preparedBy: "Batch Processing",
      });

      results.push({
        jobId: job.request.jobId,
        quotationId: quotation.quotationId,
        totalPrice: quotation.pricing.totalAmount,
        status: "success",
      });
    } catch (error) {
      results.push({
        jobId: job.request.jobId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

/**
 * Example 3: Quotation refresh (for price changes)
 */
export async function refreshQuotationExample() {
  // Assume we have existing quotation and new estimation
  // const currentQuotation = ...;
  // const newEstimation = await autoPlan(...);
  // const refreshed = refreshQuotation(currentQuotation, newEstimation);
  console.log("Quotation refresh example - see quotationGenerator.ts");
}

// ============================================================================
// INTEGRATION PATTERNS
// ============================================================================

/**
 * Pattern 1: React Hook for estimation
 */
export function useEstimation() {
  // const [estimation, setEstimation] = useState(null);
  // const [quotation, setQuotation] = useState(null);
  // const [loading, setLoading] = useState(false);

  // const estimate = async (request: EstimationRequest) => {
  //   setLoading(true);
  //   try {
  //     const est = await autoPlan(request, inventoryData, rateCardData);
  //     const quot = generateQuotation(est, quotationOptions);
  //     setEstimation(est);
  //     setQuotation(quot);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // return { estimate, estimation, quotation, loading };

  return {
    example: "See implementation pattern above",
  };
}

/**
 * Pattern 2: Zustand store for estimation state
 */
export function createEstimationStore() {
  // const useEstimationStore = create((set) => ({
  //   request: null,
  //   estimation: null,
  //   quotation: null,
  //   loading: false,
  //
  //   setRequest: (request) => set({ request }),
  //   setEstimation: (estimation) => set({ estimation }),
  //   setQuotation: (quotation) => set({ quotation }),
  //   setLoading: (loading) => set({ loading }),
  //
  //   autoEstimate: async (request) => {
  //     set({ loading: true });
  //     // ... call autoPlan, generateQuotation
  //     set({ loading: false });
  //   },
  // }));

  return {
    example: "See store pattern above",
  };
}
