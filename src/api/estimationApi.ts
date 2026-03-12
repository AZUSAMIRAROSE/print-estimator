/**
 * Type-safe API client for the estimation system
 * Bridges frontend React components with backend REST endpoints
 */

import type { EstimationRequest, EstimationResult as DomainEstimationResult } from "@/domain/estimation/imposition/types";
import type { QuotationOptions, CustomerQuotation } from "@/domain/estimation/pricing/quotationGenerator";

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * API client for estimation operations
 */
export const estimationApi = {
  /**
   * Full auto-planning estimation
   * Request: EstimationRequest + available papers + machines
   * Response: EstimationResult with all recommendations
   */
  async estimate(
    request: EstimationRequest,
    paperInventory: unknown[],
    availableMachines: unknown[]
  ): Promise<ApiResponse<DomainEstimationResult>> {
    try {
      const response = await fetch(`${API_BASE}/estimate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...request,
          paperInventory,
          availableMachines,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        data: result.estimation,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Quick re-planning (imposition only, no paper/machine resolution)
   * Useful for rapid "what-if" scenarios
   */
  async quickReplan(request: EstimationRequest): Promise<ApiResponse<DomainEstimationResult>> {
    try {
      const response = await fetch(`${API_BASE}/estimate/quick-replan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        data: result.result,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

/**
 * API client for quotation operations
 */
export const quotationApi = {
  /**
   * Generate a new customer quotation from an estimation result
   */
  async generate(
    estimationResult: DomainEstimationResult,
    options: QuotationOptions
  ): Promise<ApiResponse<CustomerQuotation>> {
    try {
      const response = await fetch(`${API_BASE}/quotation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estimationResult,
          options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        data: result.quotation,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Refresh an existing quotation with new options
   * Returns a new quotation with delta comparison to original
   */
  async refresh(quotation: CustomerQuotation, newOptions: QuotationOptions): Promise<ApiResponse<CustomerQuotation>> {
    try {
      const response = await fetch(`${API_BASE}/quotation/${quotation.quotationId}/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quotation,
          newOptions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        data: result.refreshedQuotation,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Retrieve a previously generated quotation by ID
   * Requires quotation storage in database
   */
  async getById(quotationId: string): Promise<ApiResponse<CustomerQuotation>> {
    try {
      const response = await fetch(`${API_BASE}/quotation/${quotationId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          data: null,
          error: errorData.error || `HTTP ${response.status}`,
        };
      }

      const result = await response.json();
      return {
        success: result.success,
        data: result.quotation,
        error: result.error,
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

/**
 * Combined API client with both estimation and quotation operations
 */
export const estimatorApi = {
  estimate: estimationApi.estimate,
  quickReplan: estimationApi.quickReplan,
  quotation: {
    generate: quotationApi.generate,
    refresh: quotationApi.refresh,
    getById: quotationApi.getById,
  },
};
