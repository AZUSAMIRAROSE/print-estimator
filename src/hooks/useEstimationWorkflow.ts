import { useCallback, useRef } from "react";
import { useEstimationStore } from "@/stores/estimationStore";
import { autoPlan } from "@/domain/estimation/resolver/autoPlan";
import { generateQuotation, refreshQuotation } from "@/domain/estimation/pricing/quotationGenerator";
import type { EstimationRequest } from "@/domain/estimation/imposition/types";
import type { QuotationOptions } from "@/domain/estimation/pricing/quotationGenerator";
import type { InventoryPaperItem } from "@/domain/estimation/resolver/paperResolver";
import type { MachineSpecification } from "@/domain/estimation/imposition/types";

interface UseEstimationWorkflowOptions {
  onComplete?: () => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing the complete estimation workflow
 * Orchestrates: Request → AutoPlan → Quotation
 */
export const useEstimationWorkflow = (options?: UseEstimationWorkflowOptions) => {
  const {
    setDomainRequest,
    setDomainEstimation,
    setQuotation,
    addToQuotationHistory,
    setEstimationProgress,
    setEstimationError,
    clearDomainEstimation,
  } = useEstimationStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Start the complete estimation workflow
   */
  const estimateFromRequest = useCallback(
    async (request: EstimationRequest, inventoryItems: InventoryPaperItem[], _availableMachines?: MachineSpecification[]) => {
      try {
        // Cancel any previous estimation
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setDomainRequest(request);
        setEstimationError(null);

        // Stage 1: Auto-plan (imposition + paper + machine + cost)
        setEstimationProgress(10, "Validating request...");

        const result = await autoPlan(request, inventoryItems, [], {
          onProgress: (stage: string, progress: number) => {
            // Map stages to progress 10-90%
            const stageProgress = {
              paper: 20,
              imposition: 40,
              machine: 70,
              cost: 85,
            } as const;

            const stageName = stage as keyof typeof stageProgress;
            const baseProgress = stageProgress[stageName] ?? 50;
            const progressValue = baseProgress + (progress / 100) * (baseProgress < 90 ? 15 : 10);
            setEstimationProgress(progressValue, stage);
          }
        });

        // Check if aborted
        if (abortControllerRef.current?.signal.aborted) {
          setEstimationError("Estimation cancelled");
          return null;
        }

        setDomainEstimation(result);
        setEstimationProgress(100, "Estimation complete");

        options?.onComplete?.();
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error during estimation";
        setEstimationError(errorMessage);
        options?.onError?.(errorMessage);
        console.error("Estimation error:", error);
        return null;
      }
    },
    [setDomainRequest, setDomainEstimation, setEstimationProgress, setEstimationError, options]
  );

  /**
   * Generate a quotation from the current estimation
   */
  const generateQuotationForEstimation = useCallback(
    async (quotationOptions: QuotationOptions) => {
      const state = useEstimationStore.getState();
      if (!state.domainEstimation) {
        setEstimationError("No estimation available for quotation");
        return null;
      }

      try {
        setEstimationProgress(95, "Generating quotation...");
        const quotation = generateQuotation(state.domainEstimation, quotationOptions);
        setQuotation(quotation);
        addToQuotationHistory(quotation);
        setEstimationProgress(100, "Quotation generated");
        options?.onComplete?.();
        return quotation;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error generating quotation";
        setEstimationError(errorMessage);
        options?.onError?.(errorMessage);
        return null;
      }
    },
    [setQuotation, addToQuotationHistory, setEstimationProgress, setEstimationError, options]
  );

  /**
   * Refresh the current quotation with new options
   */
  const refreshCurrentQuotation = useCallback(
    async (newOptions: QuotationOptions) => {
      const state = useEstimationStore.getState();
      const { quotation, domainEstimation } = state;

      if (!quotation) {
        setEstimationError("No quotation available to refresh");
        return null;
      }

      if (!domainEstimation) {
        setEstimationError("No estimation available to refresh quotation against");
        return null;
      }

      try {
        setEstimationProgress(95, "Refreshing quotation...");
        const comparison = refreshQuotation(quotation, domainEstimation, newOptions);
        const refreshedQuotation = comparison.refreshedVersion;
        setQuotation(refreshedQuotation);
        addToQuotationHistory(refreshedQuotation);
        setEstimationProgress(100, "Quotation refreshed");
        return refreshedQuotation;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error refreshing quotation";
        setEstimationError(errorMessage);
        options?.onError?.(errorMessage);
        return null;
      }
    },
    [setQuotation, addToQuotationHistory, setEstimationProgress, setEstimationError, options]
  );

  /**
   * Cancel the current estimation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setEstimationError("Estimation cancelled");
  }, [setEstimationError]);

  /**
   * Reset the estimation workflow
   */
  const reset = useCallback(() => {
    clearDomainEstimation();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [clearDomainEstimation]);

  return {
    estimateFromRequest,
    generateQuotationForEstimation,
    refreshCurrentQuotation,
    cancel,
    reset,
  };
};

/**
 * Hook for reading current estimation state
 */
export const useEstimationState = () => {
  const {
    domainRequest,
    domainEstimation,
    quotation,
    quotationHistory,
    estimationProgress,
    estimationProgressMessage,
    estimationError,
  } = useEstimationStore();

  return {
    request: domainRequest,
    estimation: domainEstimation,
    quotation,
    quotationHistory,
    progress: estimationProgress,
    progressMessage: estimationProgressMessage,
    error: estimationError,
    isLoading: estimationProgress > 0 && estimationProgress < 100,
    isComplete: estimationProgress === 100,
  };
};

/**
 * Hook for quick re-planning with autoImpositionOnly
 */
export const useQuickReplan = () => {
  const { setEstimationProgress, setEstimationError } = useEstimationStore();

  const quickReplan = useCallback(
    async (request: EstimationRequest) => {
      try {
        setEstimationProgress(50, "Quick re-planning imposition...");
        // Import and call autoImpositionOnly from resolver
        const { autoImpositionOnly } = await import("@/domain/estimation/resolver/autoPlan");
        const result = await autoImpositionOnly(request);
        setEstimationProgress(100, "Re-plan complete");
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Quick replan failed";
        setEstimationError(errorMessage);
        return null;
      }
    },
    [setEstimationProgress, setEstimationError]
  );

  return { quickReplan };
};
