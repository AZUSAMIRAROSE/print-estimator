/**
 * Resolver module - Paper sourcing, machine selection, and auto-planning orchestration
 * 
 * Exports paper resolution, machine ranking, and complete auto-planning functions.
 */

export * from "./paperResolver";
export * from "./machineSelector";
export * from "./autoPlan";

// Re-export commonly-used types from imposition module
export type { ImpositionPlan, EstimationRequest, EstimationResult } from "@/domain/estimation/imposition/types";
