/**
 * COMPLETE INTEGRATION EXAMPLE
 * Demonstrates how to use the entire estimation system end-to-end
 * Covers: Store adapters → Custom hooks → API calls → Quotations
 */

import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useEstimationStore } from "@/stores/estimationStore";
import { extractPaperSourcesFromStores } from "@/domain/estimation/adapters/storeAdapters";
import { useEstimationWorkflow, useEstimationState } from "@/hooks/useEstimationWorkflow";
import { estimatorApi } from "@/api/estimationApi";
import type { EstimationRequest } from "@/domain/estimation/imposition/types";
import type { QuotationOptions } from "@/domain/estimation/pricing/quotationGenerator";
import { STANDARD_MACHINES } from "@/domain/estimation/imposition/constants";

// ============================================================================
// EXAMPLE 1: BASIC REACT COMPONENT INTEGRATION
// ============================================================================

/**
 * Example React component showing basic workflow
 */
export const EstimationExample = () => {
  // Get store states
  const inventoryState = useInventoryStore.getState();
  const rateCardState = useRateCardStore.getState();

  // Get estimation workflow hook
  const {
    estimateFromRequest,
    generateQuotationForEstimation,
    refreshCurrentQuotation,
  } = useEstimationWorkflow({
    onComplete: () => console.log("Estimation complete!"),
    onError: (error) => console.error("Estimation error:", error),
  });

  // Get current state
  const {
    progress,
    progressMessage,
    error,
    estimation,
    quotation,
    isLoading,
  } = useEstimationState();

  // Extract paper sources from stores
  const { papers, rates } = extractPaperSourcesFromStores(inventoryState, rateCardState);

  // Handler: Run estimation
  const handleEstimate = async () => {
    const request: EstimationRequest = {
      sections: [
        {
          type: "text",
          pages: 256,
          colorsFront: 4,
          colorsBack: 4,
          paperPreference: "cost-optimized",
        },
        {
          type: "cover",
          pages: 4,
          colorsFront: 4,
          colorsBack: 0,
          paperPreference: "quality-optimized",
        },
      ],
      totalPages: 260,
      quantity: 1000,
      paperPreference: "cost-optimized",
      machinePreference: "speed",
    };

    const result = await estimateFromRequest(request, papers, STANDARD_MACHINES);
    console.log("Estimation result:", result);
  };

  // Handler: Generate quotation
  const handleQuote = async () => {
    const options: QuotationOptions = {
      marginPercent: 25,
      gstPercent: 18,
      currency: "INR",
      paymentTerms: "L/C at Sight",
      validityDays: 15,
    };

    const quotation = await generateQuotationForEstimation(options);
    console.log("Quotation:", quotation);
  };

  // Handler: Refresh with new options
  const handleRefresh = async () => {
    const newOptions: QuotationOptions = {
      marginPercent: 30, // Changed from 25 to 30
      gstPercent: 18,
      currency: "GBP",
    };

    const refreshed = await refreshCurrentQuotation(newOptions);
    console.log("Refreshed quotation:", refreshed);
  };

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={handleEstimate}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          {isLoading ? "Estimating..." : "Run Estimation"}
        </button>

        {isLoading && (
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-1">{progressMessage}</p>
          </div>
        )}

        {error && <p className="text-red-600 font-semibold">Error: {error}</p>}
      </div>

      {estimation && (
        <div className="p-4 bg-green-50 rounded">
          <h3 className="font-bold">Estimation Results</h3>
          <p>Imposition: {estimation.selectedImposition.sheetSize}</p>
          <p>Machine: {estimation.selectedMachine.name}</p>
          <p>Estimated Price: ₹{estimation.estimatedPrice}</p>

          <button
            onClick={handleQuote}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
          >
            Generate Quotation
          </button>
        </div>
      )}

      {quotation && (
        <div className="p-4 bg-purple-50 rounded">
          <h3 className="font-bold">Current Quotation</h3>
          <p>Quotation ID: {quotation.id}</p>
          <p>Final Price: {quotation.currency} {quotation.finalPrice}</p>
          <p>Margin: {quotation.marginPercent}%</p>

          <button
            onClick={handleRefresh}
            className="mt-2 px-4 py-2 bg-orange-500 text-white rounded"
          >
            Refresh with New Margin
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: REST API INTEGRATION (NO HOOKS)
// ============================================================================

/**
 * Example: Direct REST API usage without React hooks
 * Useful for: Scripts, CLI tools, server-side rendering
 */
export async function exampleRestApiUsage() {
  // Get store data
  const inventoryState = useInventoryStore.getState();
  const rateCardState = useRateCardStore.getState();
  const { papers, rates } = extractPaperSourcesFromStores(inventoryState, rateCardState);

  // Prepare estimation request
  const request: EstimationRequest = {
    sections: [
      {
        type: "text",
        pages: 192,
        colorsFront: 4,
        colorsBack: 4,
        paperPreference: "cost-optimized",
      },
      {
        type: "cover",
        pages: 4,
        colorsFront: 4,
        colorsBack: 0,
        paperPreference: "quality-optimized",
      },
    ],
    totalPages: 196,
    quantity: 2000,
    paperPreference: "cost-optimized",
    machinePreference: "speed",
  };

  // Call API: /POST /api/estimate
  const estimateResponse = await estimatorApi.estimate(
    request,
    papers,
    STANDARD_MACHINES
  );

  if (!estimateResponse.success) {
    console.error("Estimation failed:", estimateResponse.error);
    return;
  }

  const estimation = estimateResponse.data!;
  console.log("Estimation successful:", estimation);

  // Call API: POST /api/quotation
  const quotationOptions: QuotationOptions = {
    marginPercent: 25,
    gstPercent: 18,
    currency: "INR",
    paymentTerms: "L/C at Sight",
    validityDays: 15,
  };

  const quotationResponse = await estimatorApi.quotation.generate(
    estimation,
    quotationOptions
  );

  if (!quotationResponse.success) {
    console.error("Quotation failed:", quotationResponse.error);
    return;
  }

  const quotation = quotationResponse.data!;
  console.log("Quotation generated:", quotation);

  // Call API: POST /api/quotation/:id/refresh
  const newOptions: QuotationOptions = {
    ...quotationOptions,
    marginPercent: 30,
    currency: "GBP",
  };

  const refreshResponse = await estimatorApi.quotation.refresh(
    quotation,
    newOptions
  );

  if (!refreshResponse.success) {
    console.error("Refresh failed:", refreshResponse.error);
    return;
  }

  const refreshedQuotation = refreshResponse.data!;
  console.log("Quotation refreshed:", refreshedQuotation);
  console.log("Price comparison:", {
    original: quotation.finalPrice,
    refreshed: refreshedQuotation.finalPrice,
    delta: refreshedQuotation.finalPrice - quotation.finalPrice,
  });
}

// ============================================================================
// EXAMPLE 3: BATCH QUOTATION GENERATION
// ============================================================================

/**
 * Example: Generate multiple quotations for different scenarios
 * Useful for: Price scenarios, customer proposals, internal analysis
 */
export async function exampleBatchQuotations() {
  // Setup
  const inventoryState = useInventoryStore.getState();
  const rateCardState = useRateCardStore.getState();
  const { papers, rates } = extractPaperSourcesFromStores(inventoryState, rateCardState);

  // Base request
  const baseRequest: EstimationRequest = {
    sections: [
      {
        type: "text",
        pages: 200,
        colorsFront: 4,
        colorsBack: 4,
        paperPreference: "cost-optimized",
      },
    ],
    totalPages: 200,
    quantity: 1000,
    paperPreference: "cost-optimized",
    machinePreference: "speed",
  };

  // Scenario 1: Different quantities
  const scenarios = [
    { quantity: 500, marginPercent: 40 },
    { quantity: 1000, marginPercent: 30 },
    { quantity: 5000, marginPercent: 20 },
    { quantity: 10000, marginPercent: 15 },
  ];

  const quotations = [];

  for (const scenario of scenarios) {
    const request = { ...baseRequest, quantity: scenario.quantity };

    const estimateResponse = await estimatorApi.estimate(
      request,
      papers,
      STANDARD_MACHINES
    );

    if (!estimateResponse.success) continue;

    const quotationResponse = await estimatorApi.quotation.generate(
      estimateResponse.data!,
      { marginPercent: scenario.marginPercent, gstPercent: 18, currency: "INR" }
    );

    if (quotationResponse.success) {
      quotations.push({
        quantity: scenario.quantity,
        margin: scenario.marginPercent,
        quotation: quotationResponse.data,
      });
    }
  }

  // Display comparison
  console.table(
    quotations.map((q) => ({
      Quantity: q.quantity,
      Margin: `${q.margin}%`,
      "Price Per Copy": (q.quotation!.finalPrice / q.quantity).toFixed(2),
      "Total Price": q.quotation!.finalPrice.toFixed(2),
    }))
  );

  return quotations;
}

// ============================================================================
// EXAMPLE 4: ZUSTAND STORE INTEGRATION
// ============================================================================

/**
 * Example: Managing estimation state with Zustand store
 * Useful for: Multi-step forms, persistent state, undo/redo
 */
export function exampleZustandIntegration() {
  // Get all store methods
  const {
    setDomainRequest,
    setDomainEstimation,
    setQuotation,
    addToQuotationHistory,
    quotationHistory,
    domainEstimation,
  } = useEstimationStore();

  // Function: Save a completed estimation to store
  const saveEstimation = (
    request: EstimationRequest,
    estimation: Awaited<ReturnType<typeof estimatorApi.estimate>>["data"]
  ) => {
    setDomainRequest(request);
    if (estimation) {
      setDomainEstimation(estimation);
    }
  };

  // Function: Save a quotation version history
  const saveQuotationVersion = (
    quotation: Awaited<ReturnType<typeof estimatorApi.quotation.generate>>["data"]
  ) => {
    if (quotation) {
      setQuotation(quotation);
      addToQuotationHistory(quotation);
    }
  };

  // Example usage
  console.log("Current estimation:", domainEstimation);
  console.log("Quotation history (all versions):", quotationHistory);

  return {
    saveEstimation,
    saveQuotationVersion,
    quotationHistory,
  };
}
