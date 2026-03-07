import type { EstimationInput } from "@/types";
import { calculateFullEstimation } from "@/utils/calculations/estimator";
import { normalizeEstimationForCalculation, validateEstimation } from "@/utils/validation/estimation";
import type {
  CostBreakdown,
  EstimationResultEnvelope,
  PlannedSection,
  PlanningOutput,
  ProcurementRecommendation,
  ValidationIssue,
} from "./types";
import type { PlanningDiagnostics } from "@/types";
import { runAutoPlanning, type AutoPlanResult, type SectionAutoPlan } from "./autoPlanner";

function buildIssues(validationErrors: string[]): ValidationIssue[] {
  return validationErrors.map((message, idx) => ({
    code: `VALIDATION_${idx + 1}`,
    severity: "error" as const,
    message,
  }));
}

function sectionTypeToLabel(sectionType: string): string {
  switch (sectionType) {
    case "text1":
      return "Text Section 1";
    case "text2":
      return "Text Section 2";
    case "cover":
      return "Cover";
    case "jacket":
      return "Jacket";
    case "endleaves":
      return "Endleaves";
    default:
      return sectionType;
  }
}

function buildPlanningDiagnostics(
  input: EstimationInput,
  result: ReturnType<typeof calculateFullEstimation>[number] | undefined
): PlanningDiagnostics[] {
  if (!result) return [];

  const diagnostics: PlanningDiagnostics[] = [];

  // Text sections diagnostics
  input.textSections.forEach((section, index) => {
    if (!section.enabled || section.pages <= 0) return;

    const sectionType = index === 0 ? "text1" : "text2";
    const paperCost = result.paperCosts.find(p => p.sectionType === sectionType);
    const printCost = result.printingCosts.find(p => p.sectionType === sectionType);

    // Get all evaluated options from auto-planning
    const allOptions = (paperCost as any)?.autoPlanning?.allEvaluated || [];
    const selectedOption = allOptions.find((opt: any) => opt.selected);
    const rejectedOptions = allOptions.filter((opt: any) => !opt.selected).slice(0, 3);

    // Build reason explanation
    const reasons: string[] = [];

    // Primary selection reason
    if (section.planningMode === "manual_override") {
      reasons.push(`Manual override: user selected ${paperCost?.paperSize} manually`);
    } else if (selectedOption) {
      reasons.push(`Auto-selected: ${selectedOption.paperSize} (${selectedOption.ups} up) - lowest effective cost`);
    }

    // Grain compliance
    if (paperCost?.grainCompliant === false) {
      reasons.push("WARNING: Suboptimal grain direction - potential curl/crack risk");
    } else if (selectedOption?.grainOk) {
      reasons.push("Grain direction: compliant with book spine");
    }

    // Machine selection reason
    if (printCost) {
      reasons.push(`Machine: ${printCost.machineName} (best cost/speed balance)`);
    }

    // Source selection
    const sourceInfo = (paperCost as any)?.sourceSelection;
    if (sourceInfo) {
      if (sourceInfo.source === 'inventory' && sourceInfo.inStock) {
        reasons.push(`Paper source: inventory (in stock, confidence ${Math.round(sourceInfo.confidence * 100)}%)`);
      } else if (sourceInfo.source === 'rate_card') {
        reasons.push(`Paper source: rate card (confidence ${Math.round(sourceInfo.confidence * 100)}%)`);
      } else {
        reasons.push("Paper source: fallback rate (procurement may be required)");
      }
    }

    // Rejection reasons for alternatives
    const rejectedReasons = rejectedOptions.map((opt: any) => {
      let reason = `${opt.paperSize} (${opt.ups} up)`;
      if (!opt.grainOk) reason += " - grain mismatch";
      if (opt.totalCost > (selectedOption?.totalCost || 0)) reason += " - higher cost";
      return reason;
    });

    diagnostics.push({
      section: section.label || sectionType,
      strategy: section.planningMode === "manual_override" ? "manual_override" : "auto_paper_planning",
      selectedCandidate: selectedOption
        ? `${selectedOption.paperSize} / ${selectedOption.ups} up / grain=${selectedOption.grainOk ? 'ok' : 'warn'}`
        : `${paperCost?.paperSize || 'unknown'} / ${paperCost?.ups || 0} up`,
      rejectedCandidates: rejectedReasons,
    });
  });

  // Cover section diagnostics
  if (input.cover.enabled && input.cover.separateCover) {
    const paperCost = result.paperCosts.find(p => p.sectionType === "cover");
    const printCost = result.printingCosts.find(p => p.sectionType === "cover");
    const allOptions = (paperCost as any)?.autoPlanning?.allEvaluated || [];
    const selectedOption = allOptions.find((opt: any) => opt.selected);

    const reasons: string[] = [];
    if (input.cover.planningMode === "manual_override") {
      reasons.push(`Manual override: user selected ${paperCost?.paperSize} manually`);
    } else if (selectedOption) {
      reasons.push(`Auto-selected: ${selectedOption.paperSize} (${selectedOption.ups} up)`);
    }
    if (printCost) {
      reasons.push(`Machine: ${printCost.machineName}`);
    }

    diagnostics.push({
      section: "Cover",
      strategy: input.cover.planningMode === "manual_override" ? "manual_override" : "auto_paper_planning",
      selectedCandidate: selectedOption
        ? `${selectedOption.paperSize} / ${selectedOption.ups} up`
        : `${paperCost?.paperSize || 'unknown'} / ${paperCost?.ups || 0} up`,
      rejectedCandidates: [],
    });
  }

  return diagnostics;
}

function buildPlanning(input: EstimationInput, result: ReturnType<typeof calculateFullEstimation>[number] | undefined): PlanningOutput {
  if (!result) {
    return {
      sections: [],
      blocked: true,
      issues: [{ code: "NO_RESULT", severity: "error", message: "No estimation results were generated." }],
    };
  }

  const sectionCostMap = new Map(result.paperCosts.map((paper) => [paper.sectionType, paper]));

  const sections: PlannedSection[] = input.textSections
    .filter((section) => section.enabled && section.pages > 0)
    .map((section, index) => {
      const sectionType = index === 0 ? "text1" : "text2";
      const paperCost = sectionCostMap.get(sectionType);
      const recommendationWarnings: string[] = [];
      const grainFlag = (paperCost as any)?.grainCompliant;
      if (grainFlag === false) {
        recommendationWarnings.push("Suboptimal grain orientation selected. Review recommendation before production.");
      }
      const planningSource = section.planningMode === "manual_override" ? "manual_override" : "auto";
      return {
        section: section.label,
        paperSize: paperCost?.paperSize || section.paperSizeLabel,
        imposition: paperCost?.formatSize || "",
        signature: paperCost?.ppPerForm || 0,
        ups: paperCost?.ups || 0,
        grainCompliant: grainFlag !== false,
        machineId: section.machineId,
        machineName: section.machineName,
        source: planningSource,
        warnings: recommendationWarnings,
      };
    });

  const issues: ValidationIssue[] = [];
  sections.forEach((section) => {
    if (!section.grainCompliant) {
      issues.push({
        code: "GRAIN_SUBOPTIMAL",
        severity: "warning",
        message: `${section.section}: grain direction is suboptimal for selected sheet/orientation.`,
        section: section.section,
        impact: "Potential curl/crack risk and higher spoilage.",
      });
    }
  });

  return {
    sections,
    blocked: false,
    issues,
  };
}

function buildProcurement(results: ReturnType<typeof calculateFullEstimation>): ProcurementRecommendation[] {
  const recommendations: ProcurementRecommendation[] = [];
  results.forEach((result) => {
    result.paperCosts.forEach((paper) => {
      const recommendation = (paper as any).procurementRecommendation as ProcurementRecommendation | undefined;
      if (recommendation) {
        recommendations.push(recommendation);
      }
    });
  });
  return recommendations;
}

export function toCostBreakdown(result: ReturnType<typeof calculateFullEstimation>[number]): CostBreakdown {
  return {
    paper: result.totalPaperCost,
    printing: result.totalPrintingCost,
    ctp: result.totalCTPCost,
    binding: result.bindingCost,
    finishing: result.finishingCost,
    packing: result.packingCost,
    freight: result.freightCost,
    prePress: result.prePressCost,
    additional: result.additionalCost,
    totalProduction: result.totalProductionCost,
  };
}

export function runEstimation(input: EstimationInput): EstimationResultEnvelope {
  const normalized = normalizeEstimationForCalculation(input);
  const validationErrors = validateEstimation(normalized);
  const validationIssues = buildIssues(validationErrors);

  // ── AUTO-PLANNING: Run the constraint-based optimizer ──────────────────
  let autoPlanResult: AutoPlanResult | null = null;
  try {
    autoPlanResult = runAutoPlanning(normalized);
  } catch (_e) {
    // Auto-planning is non-critical; estimation can still proceed
  }

  const results = calculateFullEstimation(normalized);
  const planning = buildPlanning(normalized, results[0]);
  const procurement = buildProcurement(results);

  // Build planning diagnostics for "why this plan was chosen"
  const diagnostics = buildPlanningDiagnostics(normalized, results[0]);

  // ── GRAIN BLOCKING: If auto-planner says ALL candidates are grain-blocked ─
  if (autoPlanResult?.blocked) {
    planning.blocked = true;
    for (const reason of autoPlanResult.blockReasons) {
      planning.issues.push({
        code: "GRAIN_BLOCKED",
        severity: "error",
        message: reason,
        impact: "Production CANNOT proceed. All sheet sizes fail grain direction validation for the selected binding.",
      });
    }
  }

  // ── MERGE auto-plan diagnostics with legacy diagnostics ────────────────
  const enrichedDiagnostics: PlanningDiagnostics[] = [
    ...diagnostics,
  ];

  // Add auto-plan section diagnostics
  if (autoPlanResult) {
    for (const sectionPlan of autoPlanResult.sections) {
      if (!sectionPlan.diagnostics) continue;
      const d = sectionPlan.diagnostics;
      enrichedDiagnostics.push({
        section: sectionPlan.sectionName,
        strategy: d.strategy,
        selectedCandidate: d.selectedSummary,
        rejectedCandidates: d.rejectedSummaries,
        paperSource: `${d.paperSourceStatus}: ${d.paperSourceDetail}`,
        grainStatus: `${d.grainStatus}: ${d.grainDetail}`,
        warnings: sectionPlan.warnings,
      });
    }

    // Merge auto-plan warnings into planning issues
    for (const warning of autoPlanResult.warnings) {
      planning.issues.push({
        code: "AUTO_PLAN_WARNING",
        severity: "warning",
        message: warning,
      });
    }

    // Collect procurement recommendations from auto-planner
    for (const sectionPlan of autoPlanResult.sections) {
      if (sectionPlan.procurementRecommendation) {
        procurement.push(sectionPlan.procurementRecommendation);
      }
    }
  }

  // Add diagnostics to results
  if (results[0]) {
    (results[0] as any).diagnostics = enrichedDiagnostics;
    (results[0] as any).autoPlanResult = autoPlanResult;
  }

  return {
    input: normalized,
    results,
    planning,
    procurement,
    issues: [...validationIssues, ...planning.issues],
  };
}

export { sectionTypeToLabel };

