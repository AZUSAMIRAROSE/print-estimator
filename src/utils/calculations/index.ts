// ============================================================================
// PRINT ESTIMATOR PRO — NUCLEAR-GRADE CALCULATION ENGINE
// ============================================================================
// This is the CORE calculation engine. Every formula matches the Excel reference.
//
// Architecture:
//   validate.ts    → Pre-estimation input validation
//   trace.ts       → Debug trace / calibration comparison system
//   optimizer.ts   → Sheet / Machine / Signature scoring & optimization
//   paper.ts       → Paper physics, imposition, wastage (ADDITIVE)
//   printing.ts    → CTP + Printing (SEPARATE, TP rate tables)
//   binding.ts     → Binding cost (TP per-copy rates)
//   finishing.ts   → Lamination, UV, embossing, die-cutting
//   packing.ts     → Packing cost (TP formula)
//   freight.ts     → Freight / logistics cost
//   estimator.ts   → Full estimation orchestrator (16-step pipeline)
// ============================================================================

export { calculateSpineThickness, calculateSpineWithBoard } from "./spine";
export { calculateImposition, findOptimalImposition } from "./imposition";
export { calculatePaperRequirement } from "./paper";
export { calculateWastage } from "./wastage";
export { calculatePrintingCostGodLevel } from "./printing";
export { calculateCTPCost } from "./ctp";
export { calculateBindingCostGodLevel } from "./binding";
export { calculateFinishingCostGodLevel } from "./finishing";
export { calculatePackingCostGodLevel } from "./packing";
export { calculateFreightCostGodLevel } from "./freight";
export { calculateFullEstimation } from "./estimator";
export { calculateBookWeight } from "./weight";

// New modules (architecture improvements)
export { validateJob, quickValidate } from "./validate";
export { createTrace, runCalibrationCheck, compareCostBreakdown, formatComparisonTable, CALIBRATION_BENCHMARK } from "./trace";
export { optimizeSheetSize, optimizeMachine, optimizeSignature, runFullOptimization, OPTIMIZER_CONSTRAINTS } from "./optimizer";
export { runMonteCarloSimulation, formatMonteCarloReport } from "./monteCarlo";