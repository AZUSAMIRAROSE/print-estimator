/**
 * Auto-Planner Orchestrator - Coordinates the complete estimation flow
 * Integrates paper resolution, machine selection, and imposition planning
 * into a unified auto-planning system that produces ready-to-quote estimates.
 */

import type {
  EstimationRequest,
  EstimationResult,
  ImpositionPlan,
  Section,
  SectionCostBreakdown,
  ResolvedPaper,
} from "@/domain/estimation/imposition/types";
import { autoImposeMultipleSections, STANDARD_MACHINES } from "@/domain/estimation/imposition/";
import { resolvePaperCandidates, recommendPaperSource, type InventoryPaperItem, type RateCardPaper } from "./paperResolver";
import { rankMachines, findOptimalMachine } from "./machineSelector";

// ============================================================================
// AUTO-PLANNER MAIN FUNCTIONS
// ============================================================================

/**
 * Complete auto-planning flow: resolve paper → select machines → plan imposition
 */
export async function autoPlan(
  request: EstimationRequest,
  inventoryItems: InventoryPaperItem[],
  rateCardEntries: RateCardPaper[],
  options?: {
    onProgress?: (stage: string, progress: number) => void;
  }
): Promise<EstimationResult> {
  const diagnostics: Array<{ type: "info" | "warning" | "error"; section?: string; message: string }> = [];

  try {
    // ════════════════════════════════════════════════════════════════════
    // STAGE 1: Paper Resolution
    // ════════════════════════════════════════════════════════════════════
    options?.onProgress?.("Resolving papers...", 10);

    const paperResolutions = new Map<string, ReturnType<typeof recommendPaperSource>>();
    const selectedMachines = new Map<string, any>();

    for (const [sectionType, paper] of Object.entries(request.papers)) {
      if (!paper) continue;

      const resolution = recommendPaperSource(paper, inventoryItems, rateCardEntries);
      paperResolutions.set(sectionType, resolution);

      if (!resolution.recommended) {
        diagnostics.push({
          type: "warning",
          section: sectionType,
          message: resolution.note || `Unable to source paper for ${sectionType}`,
        });
      } else {
        diagnostics.push({
          type: "info",
          section: sectionType,
          message: `Paper: ${resolution.recommended.paper.name} (${resolution.recommended.paper.gsm}gsm, ${resolution.recommended.paper.grain}-grain)`,
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // STAGE 2: Imposition Planning
    // ════════════════════════════════════════════════════════════════════
    options?.onProgress?.("Planning imposition...", 35);

    const machines = request.machines || [...STANDARD_MACHINES] as any;
    const sheets = request.preferredSheets;

    const plans = autoImposeMultipleSections(request.sections, request.quantity, {
      machines,
      sheets,
      maxWastePercentage: request.preferences?.maxWastePercentage || 35,
    });

    for (const [sectionType, plan] of Object.entries(plans)) {
      if (plan?.selectedCandidate?.id) {
        diagnostics.push({
          type: "info",
          section: sectionType,
          message: `Imposition: ${plan.selectedCandidate.signaturePages}pp on ${plan.selectedCandidate.sheet.label} (${(plan.selectedCandidate.wastePercentage).toFixed(1)}% waste)`,
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // STAGE 3: Machine Selection for Each Section
    // ════════════════════════════════════════════════════════════════════
    options?.onProgress?.("Selecting machines...", 60);

    for (const [sectionType, plan] of Object.entries(plans)) {
      if (!plan?.selectedCandidate) continue;

      const section = request.sections[sectionType as keyof typeof request.sections];
      if (!section) continue;

      // Determine color count from section
      let colorCount = 4; // Default to 4-color
      if ("colors" in section) {
        // Count unique color specifications
        const colorSpecs = [section.colors.frontColor, section.colors.backColor];
        const uniqueColors = new Set(colorSpecs).size;
        colorCount = Math.max(...colorSpecs.map((c) => (c === "black" ? 1 : 4)));
      }

      try {
        // Build a list of candidates (just the selected one for now; could expand to alternatives)
        const candidates = [
          plan.selectedCandidate,
          ...plan.alternatives.slice(0, 2),
        ];

        const machineResult = findOptimalMachine(
          candidates,
          plan.selectedCandidate.totalImpressions,
          colorCount,
          [...machines] as any
        );

        selectedMachines.set(sectionType, machineResult.machineRanking.machine);

        diagnostics.push({
          type: "info",
          section: sectionType,
          message: `Machine: ${machineResult.machineRanking.machine.name} (score: ${machineResult.machineRanking.totalScore}/100)`,
        });
      } catch (error) {
        diagnostics.push({
          type: "warning",
          section: sectionType,
          message: `Machine selection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // STAGE 4: Cost Breakdown (Placeholder)
    // ════════════════════════════════════════════════════════════════════
    options?.onProgress?.("Calculating costs...", 80);

    const costs: SectionCostBreakdown[] = [];
    let totalCost = 0;

    for (const [sectionType, plan] of Object.entries(plans)) {
      if (!plan?.selectedCandidate) continue;

      const paperResolution = paperResolutions.get(sectionType);
      const paperCost = paperResolution?.recommended?.totalCost || 0;
      const printingCost = (plan.selectedCandidate.totalPlates * 500) + (plan.selectedCandidate.totalImpressions * 0.5);
      const finishingCost = 0; // To be calculated in Part 3

      const costBreakdown: SectionCostBreakdown = {
        sectionType: sectionType as any,
        paperCost,
        printingCost,
        finishingCost,
        total: paperCost + printingCost + finishingCost,
      };

      costs.push(costBreakdown);
      totalCost += costBreakdown.total;
    }

    options?.onProgress?.("Complete!", 100);

    // ════════════════════════════════════════════════════════════════════
    // BUILD RESULT
    // ════════════════════════════════════════════════════════════════════

    const result: EstimationResult = {
      request,
      plans: plans as any,
      paperSources: Object.fromEntries(paperResolutions) as any,
      costs,
      totalCost,
      costPerCopy: totalCost / request.quantity,
      diagnostics: diagnostics as any,
      generatedAt: new Date(),
    };

    return result;
  } catch (error) {
    diagnostics.push({
      type: "error",
      message: `Auto-planning failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });

    throw new Error(`Auto-planning failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Simplified auto-plan: Only imposition planning without paper/machine resolution
 * Useful for quick estimates when paper and machine are already selected
 */
export function autoImpositionOnly(
  request: EstimationRequest
): Record<string, ImpositionPlan | null> {
  const machines = request.machines;
  const sheets = request.preferredSheets;

  return autoImposeMultipleSections(request.sections, request.quantity, {
    machines,
    sheets,
    maxWastePercentage: request.preferences?.maxWastePercentage || 35,
  });
}

/**
 * Validate request completeness before auto-planning
 */
export function validateEstimationRequest(request: EstimationRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!request.jobId) errors.push("Job ID is required");
  if (request.quantity < 1) errors.push("Quantity must be at least 1");
  if (!request.trimSize || request.trimSize.width < 10 || request.trimSize.height < 10) {
    errors.push("Valid trim size required (minimum 10×10mm)");
  }

  // Check at least one section is defined
  const sectionCount = Object.values(request.sections).filter((s) => s).length;
  if (sectionCount === 0) {
    errors.push("At least one section (text, cover, jacket, or endleaf) required");
  }

  // Check papers defined for all present sections
  for (const [sectionType, section] of Object.entries(request.sections)) {
    if (section && !request.papers[sectionType as keyof typeof request.papers]) {
      errors.push(`Paper specification required for ${sectionType} section`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
