/**
 * useEstimation Hook - Unified estimation with nuclear-grade engine integration
 * 
 * Provides seamless integration between EstimationStore and the domain estimation system
 * (Imposition Engine + Paper Resolver + Quotation Generator)
 * 
 * Usage:
 *   const { estimate, quotation, loading, error } = useEstimation();
 *   await estimate(estimationInput);
 */

import { useCallback, useState, useRef } from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useMachineStore } from "@/stores/machineStore";
import { autoPlan } from "@/domain/estimation/resolver";
import { generateQuotation } from "@/domain/estimation/pricing";
import {
  estimationInputToRequest,
  estimationResultToUIFormat,
  quotationOptionsFromUI,
  getPrimaryQuantity,
} from "@/domain/estimation/adapters/estimationInputAdapter";
import {
  convertInventoryItems,
  convertRateCardEntries,
} from "@/domain/estimation/adapters/storeAdapters";
import type { InventoryPaperItem, RateCardPaper } from "@/domain/estimation/resolver/paperResolver";
import type { EstimationInput } from "@/types";
import type { EstimationRequest, EstimationResult } from "@/domain/estimation/imposition/types";
import type { CustomerQuotation } from "@/domain/estimation/pricing/quotationGenerator";

// ============================================================================
// USE ESTIMATION HOOK
// ============================================================================

export function useEstimation() {
  const estimationStore = useEstimationStore();
  const inventoryStore = useInventoryStore();
  const rateCardStore = useRateCardStore();
  const machineStore = useMachineStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Gather live data from stores ──────────────────────────────────────────
  const getInventoryItems = useCallback((): InventoryPaperItem[] => {
    const inventory = (inventoryStore.items || []).filter((i: any) => i.category === "paper");
    return convertInventoryItems(inventory);
  }, [inventoryStore.items]);

  const getRateCardItems = useCallback((): RateCardPaper[] => {
    const rates = rateCardStore.paperRates?.filter((r) => r.status === "active") || [];
    return convertRateCardEntries(rates);
  }, [rateCardStore.paperRates]);

  // ── Main estimation function ─────────────────────────────────────────────
  const estimate = useCallback(
    async (estimationInput: EstimationInput): Promise<EstimationResult | null> => {
      setLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        // Step 1: Convert UI input to domain request
        const request = estimationInputToRequest(estimationInput);

        // Validate request
        if (!request.jobId || request.quantity < 1) {
          throw new Error("Invalid estimation input: missing job ID or quantity");
        }

        // Step 2: Gather live data
        const inventory = getInventoryItems();
        const rateCard = getRateCardItems();

        if (inventory.length === 0 || rateCard.length === 0) {
          console.warn("Warning: Limited inventory or rate card data available. Using defaults.");
        }

        // Step 3: Run auto-planning
        estimationStore.setEstimationProgress(
          10,
          "Validating job specification..."
        );

        const result = await autoPlan(request, inventory, rateCard, {
          onProgress: (stage, progress) => {
            estimationStore.setEstimationProgress(progress, stage);
          },
        });

        // Step 4: Store domain result
        estimationStore.setDomainEstimation(result);
        estimationStore.setDomainRequest(request);

        // Step 5: Generate quotation
        estimationStore.setEstimationProgress(90, "Generating quotation...");

        const quotationOptions = quotationOptionsFromUI(
          estimationInput,
          estimationInput.customerName || "Customer",
          estimationInput.estimatedBy || "System"
        );

        const quotation = generateQuotation(result, {
          marginPercent: quotationOptions.margin,
          discountPercent: quotationOptions.discount,
          currency: quotationOptions.currency,
          taxRate: quotationOptions.taxRate,
          customerName: quotationOptions.customerName,
          preparedBy: quotationOptions.preparedBy,
        });

        estimationStore.setQuotation(quotation);
        estimationStore.addToQuotationHistory(quotation);

        // Step 6: Complete
        estimationStore.setEstimationProgress(100, "Complete!");

        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Unknown estimation error";
        setError(errorMsg);
        estimationStore.setEstimationError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [estimationStore, getInventoryItems, getRateCardItems]
  );

  // ── Quick estimate (just imposition, no paper/machine resolution) ────────
  const quickEstimate = useCallback(
    async (estimationInput: EstimationInput): Promise<any> => {
      setLoading(true);
      setError(null);

      try {
        const request = estimationInputToRequest(estimationInput);
        const result = await autoPlan(request, [], [], {
          onProgress: (stage, progress) => {
            estimationStore.setEstimationProgress(progress, stage);
          },
        });

        return estimationResultToUIFormat(result);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Quick estimate failed";
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [estimationStore]
  );

  // ── Refresh quotation with new options ───────────────────────────────────
  const refreshQuotation = useCallback(
    (newMargin?: number, newDiscount?: number) => {
      if (!estimationStore.domainEstimation) {
        setError("No estimation available to refresh");
        return;
      }

      try {
        const result = estimationStore.domainEstimation;
        const estimation = estimationStore.estimation;

        const quotationOptions = quotationOptionsFromUI(
          estimation,
          estimation.customerName || "Customer",
          estimation.estimatedBy || "System"
        );

        // Override with new values if provided
        if (newMargin !== undefined) quotationOptions.margin = newMargin;
        if (newDiscount !== undefined) quotationOptions.discount = newDiscount;

        const quotation = generateQuotation(result, quotationOptions);
        estimationStore.setQuotation(quotation);
        estimationStore.addToQuotationHistory(quotation);

        return quotation;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Refresh failed";
        setError(errorMsg);
        throw err;
      }
    },
    [estimationStore]
  );

  // ── Cancel ongoing estimation ────────────────────────────────────────────
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  // ── Reset all ──────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
    estimationStore.clearDomainEstimation();
  }, [estimationStore]);

  // ── Return public API ──────────────────────────────────────────────────
  return {
    // Functions
    estimate,
    quickEstimate,
    refreshQuotation,
    cancel,
    reset,

    // UI state
    loading,
    error,
    progress: estimationStore.estimationProgress,
    progressMessage: estimationStore.estimationProgressMessage,

    // Results
    domainRequest: estimationStore.domainRequest,
    domainEstimation: estimationStore.domainEstimation,
    quotation: estimationStore.quotation,
    quotationHistory: estimationStore.quotationHistory,

    // Raw estimation store for advanced usage
    estimationStore,
  };
}

// ============================================================================
// HELPER HOOK: Estimate with auto-calculation on input change
// ============================================================================

/**
 * Higher-level hook that automatically re-estimates whenever input changes
 * Debounced to avoid excessive calculations
 */
export function useAutoEstimate(debounceMs: number = 500) {
  const estimationStore = useEstimationStore();
  const { estimate, loading, error, quotation } = useEstimation();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const estimateWithDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      estimate(estimationStore.estimation).catch((err) => {
        console.error("Auto-estimation failed:", err);
      });
    }, debounceMs);
  }, [estimate, estimationStore.estimation, debounceMs]);

  return {
    estimateWithDebounce,
    loading,
    error,
    quotation,
  };
}

// ============================================================================
// HELPER HOOK: Estimation with live paper/machine resolution
// ============================================================================

/**
 * Advanced hook that provides access to paper and machine selections during estimation
 */
export function useDetailedEstimation() {
  const hook = useEstimation();
  const [paperSources, setPaperSources] = useState<any[] | null>(null);
  const [machineSelections, setMachineSelections] = useState<any[] | null>(null);

  const estimateWithDetails = useCallback(
    async (estimationInput: EstimationInput) => {
      const result = await hook.estimate(estimationInput);

      if (hook.domainEstimation) {
        setPaperSources(
          Object.entries(hook.domainEstimation.paperSources || {})
        );
        // Extract machine selections from imposition plans
        const machines = Object.entries(hook.domainEstimation.plans || {})
          .map(([section, plan]: any) => ({
            section,
            machine: plan?.selectedCandidate?.machine?.name,
          }))
          .filter((m) => m.machine);
        setMachineSelections(machines);
      }

      return result;
    },
    [hook]
  );

  return {
    ...hook,
    estimateWithDetails,
    paperSources,
    machineSelections,
  };
}
