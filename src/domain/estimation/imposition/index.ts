/**
 * Imposition engine module - Core auto-planning system for sheet layout optimization
 * 
 * Export all types, constants, and functions for building the estimation pipeline.
 */

// Core types
export * from "./types";

// Physical constants and reference data
export * from "./constants";

// Re-export STANDARD_MACHINES for convenience (also available from parent constants)
export { STANDARD_MACHINES } from "../constants";

// Imposition engine logic
export { autoImpose, autoImposeMultipleSections } from "./imposition";
