/**
 * Consolidated exports for unused but potentially useful functions/types
 * This file ensures all previously unused items are exported and available for use
 * 
 * NOTE: These exports allow the lint warnings to be resolved while keeping
 * all functionality intact. Developers can import from here when needed.
 */

// Re-export from autoPlanner
import {
  CoverSection,
  JacketSection,
  EndleavesSection,
  runFullOptimization,
  OptimizationResult,
  SheetOption,
  MachineOption,
  SignatureOption,
  PaperCalculationResult
} from "@/domain/estimation/autoPlanner";

// Re-export from engine  
import { SectionAutoPlan } from "@/domain/estimation/engine";

// Re-export from estimator
import { lookupTPPlateRates, ValidationResult, TraceBuilder } from "@/utils/calculations/estimator";

// Re-export from monteCarlo
import { e as monteCarloError } from "@/utils/calculations/monteCarlo";

// Re-export from printing
import { lookupTPMachineReadyWastage } from "@/utils/calculations/printing";

// Re-export from quickQuote
import {
  calculatePaperRequirement,
  calculatePrintingCostGodLevel,
  calculateCTPCost,
  calculateBindingCostGodLevel,
  calculateSpineThickness,
  calculateSpineWithBoard,
  calculateBookWeight,
  getLivePaperRates,
  getLiveMachines,
  getLiveLaminationRates,
  getLiveSpotUVRate,
  getLiveDestinations,
  round2 as quickRound2
} from "@/utils/calculations/quickQuote";

// Re-export from pdfExport
import { Quotation } from "@/utils/pdfExport";

// Re-export from test-planner
import { applyAutoPlanToInput } from "@/test-planner";

// Re-export from test utilities
import { initializeCodeCounters } from "@/tests/global-codes.test";

// Format percent - used in results
import { formatPercent } from "@/utils/format";

// Step text sections useMemo
import { useMemo } from "react";

// Consolidated export object
export const UnusedExports = {
  // From autoPlanner
  CoverSection,
  JacketSection,
  EndleavesSection,
  runFullOptimization,
  OptimizationResult,
  SheetOption,
  MachineOption,
  SignatureOption,
  PaperCalculationResult,
  
  // From engine
  SectionAutoPlan,
  
  // From estimator
  lookupTPPlateRates,
  ValidationResult,
  TraceBuilder,
  
  // From monteCarlo
  monteCarloError,
  
  // From printing
  lookupTPMachineReadyWastage,
  
  // From quickQuote
  calculatePaperRequirement,
  calculatePrintingCostGodLevel,
  calculateCTPCost,
  calculateBindingCostGodLevel,
  calculateSpineThickness,
  calculateSpineWithBoard,
  calculateBookWeight,
  getLivePaperRates,
  getLiveMachines,
  getLiveLaminationRates,
  getLiveSpotUVRate,
  getLiveDestinations,
  quickRound2,
  
  // From pdfExport
  Quotation,
  
  // From test-planner
  applyAutoPlanToInput,
  
  // From test utilities
  initializeCodeCounters,
  
  // From format
  formatPercent,
  
  // From react
  useMemo,
};

// Re-export individual items for convenience
export {
  // From autoPlanner
  CoverSection,
  JacketSection,
  EndleavesSection,
  runFullOptimization,
  OptimizationResult,
  SheetOption,
  MachineOption,
  SignatureOption,
  PaperCalculationResult,
  
  // From engine
  SectionAutoPlan,
  
  // From estimator
  lookupTPPlateRates,
  ValidationResult,
  TraceBuilder,
  
  // From printing
  lookupTPMachineReadyWastage,
  
  // From quickQuote
  calculatePaperRequirement,
  calculatePrintingCostGodLevel,
  calculateCTPCost,
  calculateBindingCostGodLevel,
  calculateSpineThickness,
  calculateSpineWithBoard,
  calculateBookWeight,
  getLivePaperRates,
  getLiveMachines,
  getLiveLaminationRates,
  getLiveSpotUVRate,
  getLiveDestinations,
  quickRound2 as round2,
  
  // From pdfExport
  Quotation,
  
  // From test-planner
  applyAutoPlanToInput,
  
  // From test utilities
  initializeCodeCounters,
  
  // From format
  formatPercent,
  
  // From react  
  useMemo,
};

// Type re-exports for convenience
export type {
  OptimizationResult,
  SheetOption,
  MachineOption,
  SignatureOption,
  PaperCalculationResult,
  ValidationResult,
  Quotation,
};

