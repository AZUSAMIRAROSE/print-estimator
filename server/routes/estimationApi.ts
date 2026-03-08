/**
 * API endpoints for estimation workflow
 * These endpoints bridge the React frontend with the domain estimation engine
 */

import type { Request, Response } from "express";
import { autoPlan, autoImpositionOnly } from "../domain/estimation/resolver/autoPlan";
import { generateQuotation, refreshQuotation } from "../domain/estimation/pricing/quotationGenerator";
import type { EstimationRequest } from "../domain/estimation/imposition/types";
import type { QuotationOptions } from "../domain/estimation/pricing/quotationGenerator";

/**
 * POST /api/estimate
 * Accepts an EstimationRequest and returns EstimationResult with auto-planning
 *
 * Request body:
 * {
 *   sections: Section[],
 *   totalPages: number,
 *   quantity: number,
 *   paperPreference: "cost-optimized" | "quality-optimized" | "sustainability",
 *   machinePreference: "speed" | "quality" | "cost"
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   estimation: EstimationResult | null,
 *   error: string | null,
 *   timing: {
 *     totalMs: number,
 *     planningMs: number,
 *     costMs: number
 *   }
 * }
 */
export async function estimateHandler(req: Request, res: Response) {
  const startTime = Date.now();

  try {
    const request: EstimationRequest = req.body;

    // Validate request
    if (!request.sections || !Array.isArray(request.sections)) {
      return res.status(400).json({
        success: false,
        estimation: null,
        error: "Missing or invalid sections array",
      });
    }

    if (request.totalPages <= 0 || request.quantity <= 0) {
      return res.status(400).json({
        success: false,
        estimation: null,
        error: "totalPages and quantity must be positive",
      });
    }

    // Get paper inventory and machines from database/service
    // This would typically fetch from InventoryService and MachineService
    // For now, using an empty array (caller should provide context)
    const paperInventory = req.body.paperInventory || [];
    const availableMachines = req.body.availableMachines || [];

    const planningStart = Date.now();

    // Perform auto-planning
    const estimation = await autoPlan(request, paperInventory, availableMachines, (stage, progress) => {
      // Could emit progress via WebSocket or Server-Sent Events here
      console.log(`[${stage}] ${progress}%`);
    });

    const planningTime = Date.now() - planningStart;

    // Calculate cost breakdown
    const costStart = Date.now();
    const costTime = Date.now() - costStart;

    const totalTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      estimation,
      error: null,
      timing: {
        totalMs: totalTime,
        planningMs: planningTime,
        costMs: costTime,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Estimation error:", error);

    return res.status(500).json({
      success: false,
      estimation: null,
      error: errorMessage,
    });
  }
}

/**
 * POST /api/estimate/quick-replan
 * Quick re-planning without paper/machine resolution
 * Useful for rapid "what-if" scenarios
 */
export async function quickReplanHandler(req: Request, res: Response) {
  try {
    const request: EstimationRequest = req.body;

    if (!request.sections || !Array.isArray(request.sections)) {
      return res.status(400).json({
        success: false,
        result: null,
        error: "Missing or invalid sections array",
      });
    }

    const result = await autoImpositionOnly(request);

    return res.status(200).json({
      success: true,
      result,
      error: null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Quick replan error:", error);

    return res.status(500).json({
      success: false,
      result: null,
      error: errorMessage,
    });
  }
}

/**
 * POST /api/quotation
 * Generate a customer quotation from an EstimationResult
 *
 * Request body:
 * {
 *   estimationResult: EstimationResult,
 *   options: {
 *     marginPercent?: number,
 *     discountPercent?: number,
 *     discountFixed?: number,
 *     gstPercent?: number,
 *     currency?: string,
 *     paymentTerms?: string,
 *     validityDays?: number
 *   }
 * }
 */
export async function generateQuotationHandler(req: Request, res: Response) {
  try {
    const { estimationResult, options } = req.body;

    if (!estimationResult) {
      return res.status(400).json({
        success: false,
        quotation: null,
        error: "Missing estimationResult",
      });
    }

    const quotationOptions: QuotationOptions = options || {};
    const quotation = generateQuotation(estimationResult, quotationOptions);

    return res.status(200).json({
      success: true,
      quotation,
      error: null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Quotation generation error:", error);

    return res.status(500).json({
      success: false,
      quotation: null,
      error: errorMessage,
    });
  }
}

/**
 * POST /api/quotation/:id/refresh
 * Refresh an existing quotation with new options
 *
 * Request body:
 * {
 *   quotation: CustomerQuotation,
 *   newOptions: QuotationOptions
 * }
 */
export async function refreshQuotationHandler(req: Request, res: Response) {
  try {
    const { quotation, newOptions } = req.body;

    if (!quotation) {
      return res.status(400).json({
        success: false,
        refreshedQuotation: null,
        error: "Missing quotation",
      });
    }

    const refreshedQuotation = refreshQuotation(quotation, newOptions || {});

    return res.status(200).json({
      success: true,
      refreshedQuotation,
      error: null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Quotation refresh error:", error);

    return res.status(500).json({
      success: false,
      refreshedQuotation: null,
      error: errorMessage,
    });
  }
}

/**
 * GET /api/quotation/:id
 * Retrieve a previously generated quotation by ID
 * Requires DB/cache storage of quotations
 */
export async function getQuotationHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // This would typically query a database
    // For now, return a template response
    return res.status(200).json({
      success: true,
      quotation: null,
      error: "Quotation storage not yet implemented",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Quotation retrieval error:", error);

    return res.status(500).json({
      success: false,
      quotation: null,
      error: errorMessage,
    });
  }
}
