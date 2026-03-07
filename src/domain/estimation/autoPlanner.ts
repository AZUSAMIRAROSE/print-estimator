// ============================================================================
// AUTO-PLANNING ORCHESTRATOR — GOD MODE
// ============================================================================
// Unified constraint-based planner that generates candidate production plans,
// validates constraints, scores alternatives, and selects the optimal plan
// for each section of a print job.
//
// ALGORITHM:
//   Step 1: Generate candidate signature plans (8, 16, 24, 32pp)
//   Step 2: Generate sheet orientations for each candidate
//   Step 3: Validate grain rules, machine compatibility, paper availability
//   Step 4: Reject impossible plans
//   Step 5: Score candidates using weighted scoring
//   Step 6: Select optimal candidate per section
//
// SCORING WEIGHTS:
//   feasibility:       pass/fail gate
//   grain compliance:  10%
//   paper availability: 15%
//   waste percentage:  20%
//   machine efficiency: 15%
//   total cost:        40%
// ============================================================================

import type { EstimationInput, TextSection, CoverSection, JacketSection, EndleavesSection } from "@/types";
import { runFullOptimization, optimizeSheetSize, optimizeSignature, optimizeMachine, type OptimizationResult, type SheetOption, type MachineOption, type SignatureOption } from "@/utils/calculations/optimizer";
import { calculatePaperRequirement, type PaperCalculationResult } from "@/utils/calculations/paper";
import { calculateSpineThickness, type SpineInput } from "@/utils/calculations/spine";
import type { ProcurementRecommendation } from "@/types";

// ─── SCORING WEIGHTS ─────────────────────────────────────────────────────────

const SCORING_WEIGHTS = {
    GRAIN_COMPLIANCE: 0.10,
    PAPER_AVAILABILITY: 0.15,
    WASTE_PERCENTAGE: 0.20,
    MACHINE_EFFICIENCY: 0.15,
    TOTAL_COST: 0.40,
} as const;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SectionPlanCandidate {
    id: string;
    sectionName: string;
    sectionType: "text1" | "text2" | "cover" | "jacket" | "endleaves";

    // Paper plan
    paperSizeLabel: string;
    paperSizeId: string;
    sheetWidthMM: number;
    sheetHeightMM: number;
    orientation: "PORTRAIT" | "LANDSCAPE";

    // Signature plan
    signaturePP: number;           // Pages per form (4, 8, 16, 24, 32)
    numberOfForms: number;
    ups: number;

    // Machine plan
    machineId: string;
    machineName: string;
    machineCode: string;
    runtimeHours: number;
    machineCost: number;

    // Paper source
    paperSource: "inventory" | "rate_card" | "fallback";
    paperSourceReference?: string;
    paperAvailability: number;     // 0-1 confidence
    costPerKg: number;

    // Grain
    grainCompliant: boolean;
    grainDirection: "LONG_GRAIN" | "SHORT_GRAIN";

    // Cost breakdown
    paperCost: number;
    printingCost: number;
    ctpCost: number;
    totalCost: number;
    costPerCopy: number;

    // Waste metrics
    wastePct: number;
    wastageSheets: number;
    grossSheets: number;
    netSheets: number;

    // Scoring
    score: number;
    scoreBreakdown: {
        grainScore: number;
        availabilityScore: number;
        wasteScore: number;
        machineScore: number;
        costScore: number;
    };

    // Status
    feasible: boolean;
    selected: boolean;
    rejectionReason: string | null;
}

export interface SectionAutoPlan {
    sectionName: string;
    sectionType: string;
    selectedPlan: SectionPlanCandidate | null;
    allCandidates: SectionPlanCandidate[];
    blocked: boolean;
    blockReason: string | null;
    warnings: string[];
    diagnostics: SectionDiagnostic;
    procurementRecommendation?: ProcurementRecommendation;
}

export interface SectionDiagnostic {
    strategy: "auto_planning" | "manual_override";
    selectedSummary: string;
    rejectedSummaries: string[];
    grainStatus: "compliant" | "warning" | "blocked";
    grainDetail: string;
    paperSourceStatus: "inventory" | "rate_card" | "procurement_needed" | "fallback";
    paperSourceDetail: string;
    machineSelectionDetail: string;
    candidatesEvaluated: number;
    candidatesFeasible: number;
    candidatesRejected: number;
    optimizationTimeMs: number;
}

export interface AutoPlanResult {
    sections: SectionAutoPlan[];
    blocked: boolean;
    blockReasons: string[];
    warnings: string[];
    totalOptimizationTimeMs: number;
    totalCandidatesEvaluated: number;
}

// ─── HELPER: BINDING TYPE REQUIRES STRICT GRAIN ──────────────────────────────

const STRICT_GRAIN_BINDINGS = [
    "perfect_binding", "pur_binding", "section_sewn_perfect",
    "section_sewn_hardcase", "case_binding", "saddle_stitching",
];

function bindingRequiresStrictGrain(bindingType: string): boolean {
    return STRICT_GRAIN_BINDINGS.some(b =>
        bindingType.toLowerCase().includes(b.replace(/_/g, " ")) ||
        bindingType.toLowerCase().replace(/[_\s]/g, "") === b.replace(/[_\s]/g, "")
    );
}

// ─── HELPER: GENERATE SIGNATURE CANDIDATES ───────────────────────────────────

function getSignatureCandidates(totalPages: number, sectionType: string): number[] {
    if (sectionType === "cover" || sectionType === "jacket") {
        return [totalPages]; // Cover/jacket is always 1 form
    }
    if (sectionType === "endleaves") {
        return [Math.min(8, totalPages)];
    }

    const candidates = [8, 16, 24, 32].filter(pp => pp <= totalPages);

    // Also try totalPages itself if it's <=32 and not already in the list
    if (totalPages <= 32 && !candidates.includes(totalPages)) {
        candidates.push(totalPages);
    }

    // Fallback
    if (candidates.length === 0) {
        candidates.push(Math.min(4, totalPages));
    }

    return candidates.sort((a, b) => a - b);
}

// ─── HELPER: CALCULATE CANDIDATE SCORE ───────────────────────────────────────

function scoreCandidate(candidate: SectionPlanCandidate, allCandidates: SectionPlanCandidate[]): number {
    const feasible = allCandidates.filter(c => c.feasible);
    if (!candidate.feasible || feasible.length === 0) return Infinity;

    // Normalize each metric to 0-100 range
    const costs = feasible.map(c => c.costPerCopy);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const costRange = maxCost - minCost || 1;

    const wastes = feasible.map(c => c.wastePct);
    const minWaste = Math.min(...wastes);
    const maxWaste = Math.max(...wastes);
    const wasteRange = maxWaste - minWaste || 1;

    const times = feasible.map(c => c.runtimeHours);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1;

    // Grain compliance: 0 (compliant) or 100 (non-compliant)
    const grainScore = candidate.grainCompliant ? 0 : 100;

    // Paper availability: 0 (best) to 100 (worst)
    const availabilityScore = (1 - candidate.paperAvailability) * 100;

    // Waste: normalized 0-100
    const wasteScore = ((candidate.wastePct - minWaste) / wasteRange) * 100;

    // Machine efficiency (time-based): normalized 0-100
    const machineScore = ((candidate.runtimeHours - minTime) / timeRange) * 100;

    // Cost: normalized 0-100
    const costScore = ((candidate.costPerCopy - minCost) / costRange) * 100;

    // Store breakdown
    candidate.scoreBreakdown = {
        grainScore,
        availabilityScore,
        wasteScore,
        machineScore,
        costScore,
    };

    // Weighted composite (lower = better)
    return (
        grainScore * SCORING_WEIGHTS.GRAIN_COMPLIANCE +
        availabilityScore * SCORING_WEIGHTS.PAPER_AVAILABILITY +
        wasteScore * SCORING_WEIGHTS.WASTE_PERCENTAGE +
        machineScore * SCORING_WEIGHTS.MACHINE_EFFICIENCY +
        costScore * SCORING_WEIGHTS.TOTAL_COST
    );
}

// ─── PLAN A SINGLE SECTION ───────────────────────────────────────────────────

function planSection(params: {
    sectionName: string;
    sectionType: "text1" | "text2" | "cover" | "jacket" | "endleaves";
    totalPages: number;
    trimWidthMM: number;
    trimHeightMM: number;
    gsm: number;
    paperType: string;
    paperCode: string;
    paperSizeLabel: string;
    colorsFront: number;
    colorsBack: number;
    quantity: number;
    bindingType: string;
    spineThickness: number;
    machineId?: string;
    planningMode?: "auto" | "manual_override";
    isCustomPaper?: boolean;
    customPaperWidth?: number;
    customPaperHeight?: number;
    customPaperGrain?: "LONG_GRAIN" | "SHORT_GRAIN";
}): SectionAutoPlan {
    const startTime = performance.now();
    const {
        sectionName, sectionType, totalPages, trimWidthMM, trimHeightMM,
        gsm, paperType, paperCode, paperSizeLabel, colorsFront, colorsBack,
        quantity, bindingType, spineThickness, machineId, planningMode,
        isCustomPaper, customPaperWidth, customPaperHeight, customPaperGrain
    } = params;

    const warnings: string[] = [];
    const allCandidates: SectionPlanCandidate[] = [];
    let candidateId = 0;

    // If manual override, skip auto-planning
    if (planningMode === "manual_override") {
        const elapsed = performance.now() - startTime;
        return {
            sectionName, sectionType,
            selectedPlan: null,
            allCandidates: [],
            blocked: false,
            blockReason: null,
            warnings: ["Manual override active — auto-planning skipped"],
            diagnostics: {
                strategy: "manual_override",
                selectedSummary: "User has manually selected production parameters",
                rejectedSummaries: [],
                grainStatus: "compliant",
                grainDetail: "Manual override — grain validation deferred to user",
                paperSourceStatus: "rate_card",
                paperSourceDetail: "Manual override — paper source selected by user",
                machineSelectionDetail: "Manual override — machine selected by user",
                candidatesEvaluated: 0,
                candidatesFeasible: 0,
                candidatesRejected: 0,
                optimizationTimeMs: Math.round(elapsed * 100) / 100,
            },
        };
    }

    // Skip if pages = 0 or section not valid
    if (totalPages <= 0 || quantity <= 0) {
        return {
            sectionName, sectionType, selectedPlan: null, allCandidates: [],
            blocked: false, blockReason: null, warnings: [],
            diagnostics: {
                strategy: "auto_planning", selectedSummary: "Section inactive (0 pages or 0 qty)",
                rejectedSummaries: [], grainStatus: "compliant", grainDetail: "",
                paperSourceStatus: "rate_card", paperSourceDetail: "", machineSelectionDetail: "",
                candidatesEvaluated: 0, candidatesFeasible: 0, candidatesRejected: 0,
                optimizationTimeMs: 0,
            },
        };
    }

    // Determine if strict grain is required
    const strictGrain = bindingRequiresStrictGrain(bindingType);

    // Run unified optimization — gets best sheet, machine, and signature
    const maxColors = Math.max(colorsFront, colorsBack);
    const defaultCostPerKg = 80; // Will be resolved by paper resolver

    const signatureCandidates = getSignatureCandidates(totalPages, sectionType);

    // Also run paper requirement to get source selection
    const paperResult = calculatePaperRequirement({
        sectionName, sectionType,
        totalPages, trimWidthMM, trimHeightMM,
        gsm, paperType, paperCode,
        paperSizeLabel: paperSizeLabel || "",
        colorsFront, colorsBack,
        quantity, machineCode: machineId,
        spineThickness,
    });

    const paperSourceInfo = paperResult.sourceSelection || { source: "fallback" as const, confidence: 0.2, inStock: false };
    const actualCostPerKg = paperResult.substrate?.costPerKg || defaultCostPerKg;

    // 1. Get all feasible sheets
    const sheets = optimizeSheetSize(
        trimWidthMM, trimHeightMM,
        gsm, actualCostPerKg,
        quantity, totalPages,
        maxColors,
        sectionType, bindingType, 3, spineThickness,
        isCustomPaper, customPaperWidth, customPaperHeight, customPaperGrain
    );

    // 2. Cartesian Generation
    for (const sheet of sheets) {
        if (sheet.ups <= 0) continue;

        const grainCompliant = sheet.grainCompliant;
        let sheetFeasible = true;
        let sheetRejReason = sheet.rejectionReason;

        if (!grainCompliant && strictGrain) {
            sheetFeasible = false;
            sheetRejReason = `Grain direction invalid for ${bindingType} binding — BLOCKED`;
        }
        if (sheet.score === Infinity) {
            sheetFeasible = false;
            sheetRejReason = sheetRejReason || "Sheet size not viable";
        }

        // Optimize signatures for THIS sheet
        const signatures = optimizeSignature({
            totalPages,
            sheetWidthMM: sheet.widthMM,
            sheetHeightMM: sheet.heightMM,
            trimWidthMM,
            trimHeightMM,
            gsm,
            costPerKg: actualCostPerKg,
            quantity,
            colorsFront,
            colorsBack,
            machineCode: machineId || "RMGT",
            paperSizeCode: sheet.label,
        });

        // If no signatures, dummy pass for failure recording
        const sigsToEval = signatures.length > 0 ? signatures : [null];

        for (const sig of sigsToEval) {
            const sigPP = sig ? sig.ppPerForm : signatureCandidates[0];
            const numberOfForms = Math.max(1, Math.ceil(totalPages / sigPP));
            const ups = sig ? sig.ups : sheet.ups;
            const netSheets = sig ? sig.pressSheets : Math.ceil((quantity * numberOfForms) / ups);
            const wastageSheets = sig ? sig.wastageSheets : Math.ceil(netSheets * 0.07);
            const grossSheets = sig ? sig.grossSheets : netSheets + wastageSheets;

            const totalPlates = sig ? sig.totalPlates : (colorsFront + colorsBack) * numberOfForms;

            // Optimize machines for THIS sheet and signature
            const machines = optimizeMachine(
                sheet.widthMM, sheet.heightMM,
                maxColors,
                totalPlates,
                grossSheets,
                sheet.label,
                quantity
            );

            // If no machines, dummy pass
            const machinesToEval = machines.length > 0 ? machines : [null];

            for (const machine of machinesToEval) {
                let feasible = sheetFeasible;
                let rejectionReason = sheetRejReason;

                if (machine && !machine.canPrint) {
                    feasible = false;
                    rejectionReason = rejectionReason || machine.rejectionReason || "Machine incapable";
                }

                if (machine && machine.score === Infinity) {
                    feasible = false;
                    rejectionReason = rejectionReason || "Machine cost/time not viable";
                }

                const paperCost = sig ? sig.paperCost : sheet.totalCost;

                // Machine totalCost includes CTP, Print Plates, and Impressions.
                const printingCost = machine ? machine.totalCost : (sig ? sig.printingCost + sig.ctpCost : 0);

                const totalCost = paperCost + printingCost;
                const costPerCopy = quantity > 0 ? totalCost / quantity : 0;

                const candidate: SectionPlanCandidate = {
                    id: `${sectionType}-${candidateId++}`,
                    sectionName, sectionType,
                    paperSizeLabel: sheet.label,
                    paperSizeId: sheet.sheetId,
                    sheetWidthMM: sheet.widthMM,
                    sheetHeightMM: sheet.heightMM,
                    orientation: sheet.orientation,
                    signaturePP: sigPP,
                    numberOfForms,
                    ups,
                    machineId: machine?.machineId || "",
                    machineName: machine?.machineName || "Auto",
                    machineCode: machine?.machineCode || "RMGT",
                    runtimeHours: machine?.timeHours || 0,
                    machineCost: machine?.totalCost || 0,
                    paperSource: paperSourceInfo.source as "inventory" | "rate_card" | "fallback",
                    paperSourceReference: (paperSourceInfo as any).reference,
                    paperAvailability: paperSourceInfo.confidence,
                    costPerKg: actualCostPerKg,
                    grainCompliant,
                    grainDirection: sheet.heightMM > sheet.widthMM ? "LONG_GRAIN" : "SHORT_GRAIN",
                    paperCost,
                    printingCost, // Combined print/CTP here
                    ctpCost: 0, // In subsumed machine total
                    totalCost,
                    costPerCopy,
                    wastePct: sig ? sig.wastePct : sheet.paperWastePct,
                    wastageSheets,
                    grossSheets,
                    netSheets,
                    score: Infinity,
                    scoreBreakdown: { grainScore: 0, availabilityScore: 0, wasteScore: 0, machineScore: 0, costScore: 0 },
                    feasible,
                    selected: false,
                    rejectionReason,
                };

                allCandidates.push(candidate);
            }
        }
    }

    // Score all feasible candidates
    for (const candidate of allCandidates) {
        if (candidate.feasible) {
            candidate.score = scoreCandidate(candidate, allCandidates);
        }
    }

    // Select best
    const feasibleCandidates = allCandidates.filter(c => c.feasible).sort((a, b) => a.score - b.score);
    const selectedPlan = feasibleCandidates.length > 0 ? feasibleCandidates[0] : null;
    if (selectedPlan) {
        selectedPlan.selected = true;
    }

    // Check if blocked (all candidates rejected due to grain)
    const grainBlockedAll = allCandidates.length > 0 && allCandidates.every(c => !c.feasible && c.rejectionReason?.includes("Grain"));
    const blocked = grainBlockedAll;
    const blockReason = blocked ? `All sheet sizes rejected: grain direction invalid for ${bindingType} binding` : null;

    // Grain warnings
    if (selectedPlan && !selectedPlan.grainCompliant) {
        warnings.push(`WARNING: Selected sheet ${selectedPlan.paperSizeLabel} has suboptimal grain direction. Potential curl/crack risk.`);
    }

    // Paper source warnings
    if (paperSourceInfo.source === "fallback") {
        warnings.push("Paper not found in inventory or rate card — procurement recommendation generated.");
    }

    const elapsedMs = performance.now() - startTime;

    // Build diagnostics
    const rejectedSummaries = allCandidates
        .filter(c => !c.selected && !c.feasible)
        .slice(0, 5)
        .map(c => {
            let reason = `${c.paperSizeLabel} (${c.signaturePP}pp, ${c.ups} up)`;
            if (c.rejectionReason) reason += ` — ${c.rejectionReason}`;
            return reason;
        });

    const grainStatus: "compliant" | "warning" | "blocked" = blocked
        ? "blocked"
        : (selectedPlan && !selectedPlan.grainCompliant ? "warning" : "compliant");

    const diagnostics: SectionDiagnostic = {
        strategy: "auto_planning",
        selectedSummary: selectedPlan
            ? `${selectedPlan.paperSizeLabel} / ${selectedPlan.signaturePP}pp / ${selectedPlan.ups} up / ${selectedPlan.machineName} — ₹${selectedPlan.costPerCopy.toFixed(2)}/copy`
            : "No viable plan found",
        rejectedSummaries,
        grainStatus,
        grainDetail: grainStatus === "blocked"
            ? `Grain direction perpendicular for all sheets with ${bindingType}. Production cannot proceed.`
            : grainStatus === "warning"
                ? `Selected sheet has suboptimal grain. Consider oversized sheet or alternate paper.`
                : "Grain direction compliant with binding requirements.",
        paperSourceStatus: paperSourceInfo.source === "inventory"
            ? "inventory"
            : paperSourceInfo.source === "rate_card"
                ? "rate_card"
                : (paperResult.procurementRecommendation ? "procurement_needed" : "fallback"),
        paperSourceDetail: paperSourceInfo.source === "inventory"
            ? `In-stock match found (confidence: ${Math.round(paperSourceInfo.confidence * 100)}%)`
            : paperSourceInfo.source === "rate_card"
                ? `Rate card pricing used (confidence: ${Math.round(paperSourceInfo.confidence * 100)}%)`
                : "No inventory/rate card match — using fallback assumptions.",
        machineSelectionDetail: selectedPlan
            ? `${selectedPlan.machineName} selected (${selectedPlan.runtimeHours.toFixed(1)}h runtime, ₹${Math.round(selectedPlan.machineCost)} total)`
            : "No machine selected",
        candidatesEvaluated: allCandidates.length,
        candidatesFeasible: feasibleCandidates.length,
        candidatesRejected: allCandidates.length - feasibleCandidates.length,
        optimizationTimeMs: Math.round(elapsedMs * 100) / 100,
    };

    return {
        sectionName, sectionType,
        selectedPlan, allCandidates,
        blocked, blockReason, warnings,
        diagnostics,
        procurementRecommendation: paperResult.procurementRecommendation,
    };
}

// ─── MAIN: RUN AUTO-PLANNING FOR ALL SECTIONS ────────────────────────────────

export function runAutoPlanning(input: EstimationInput): AutoPlanResult {
    const startTime = performance.now();

    // Calculate spine thickness for cover/jacket planning
    const spineInput: SpineInput = {
        textSections: input.textSections
            .filter(s => s.enabled && s.pages > 0)
            .map(s => ({ pages: s.pages, gsm: s.gsm, paperType: s.paperTypeName || "", customPaperBulk: s.customPaperBulk })),
        endleaves: input.endleaves.enabled
            ? { pages: input.endleaves.pages, gsm: input.endleaves.gsm, paperType: input.endleaves.paperTypeName || "", customPaperBulk: input.endleaves.customPaperBulk }
            : undefined,
    };
    const spineThickness = input.bookSpec.spineThickness || calculateSpineThickness(spineInput);

    const sections: SectionAutoPlan[] = [];
    const allWarnings: string[] = [];
    const blockReasons: string[] = [];

    // Plan text sections
    input.textSections.forEach((section: TextSection, index: number) => {
        if (!section.enabled || section.pages <= 0) return;

        const plan = planSection({
            sectionName: section.label || `Text ${index + 1}`,
            sectionType: index === 0 ? "text1" : "text2",
            totalPages: section.pages,
            trimWidthMM: input.bookSpec.widthMM,
            trimHeightMM: input.bookSpec.heightMM,
            gsm: section.gsm,
            paperType: section.paperTypeName || "",
            paperCode: section.paperTypeId || "",
            paperSizeLabel: section.paperSizeLabel || "",
            colorsFront: section.colorsFront,
            colorsBack: section.colorsBack,
            quantity: input.quantities[0] || 0,
            bindingType: input.binding.primaryBinding,
            spineThickness,
            machineId: section.machineId,
            planningMode: section.planningMode,
            isCustomPaper: section.isCustomPaper,
            customPaperWidth: section.customPaperWidth,
            customPaperHeight: section.customPaperHeight,
            customPaperGrain: section.customPaperGrain,
        });

        sections.push(plan);
        allWarnings.push(...plan.warnings);
        if (plan.blocked && plan.blockReason) blockReasons.push(plan.blockReason);
    });

    // Plan cover
    const cover = input.cover;
    if (cover.enabled && !cover.selfCover) {
        const plan = planSection({
            sectionName: "Cover",
            sectionType: "cover",
            totalPages: cover.pages || 4,
            trimWidthMM: input.bookSpec.widthMM,
            trimHeightMM: input.bookSpec.heightMM,
            gsm: cover.gsm,
            paperType: cover.paperTypeName || "",
            paperCode: cover.paperTypeId || "",
            paperSizeLabel: cover.paperSizeLabel || "",
            colorsFront: cover.colorsFront,
            colorsBack: cover.colorsBack,
            quantity: input.quantities[0] || 0,
            bindingType: input.binding.primaryBinding,
            spineThickness,
            machineId: cover.machineId,
            planningMode: cover.planningMode,
            isCustomPaper: cover.isCustomPaper,
            customPaperWidth: cover.customPaperWidth,
            customPaperHeight: cover.customPaperHeight,
            customPaperGrain: cover.customPaperGrain,
        });

        sections.push(plan);
        allWarnings.push(...plan.warnings);
        if (plan.blocked && plan.blockReason) blockReasons.push(plan.blockReason);
    }

    // Plan jacket
    const jacket = input.jacket;
    if (jacket.enabled) {
        const plan = planSection({
            sectionName: "Jacket",
            sectionType: "jacket",
            totalPages: 2, // Jacket is always a single piece (2 sides)
            trimWidthMM: input.bookSpec.widthMM,
            trimHeightMM: input.bookSpec.heightMM,
            gsm: jacket.gsm,
            paperType: jacket.paperTypeName || "",
            paperCode: jacket.paperTypeId || "",
            paperSizeLabel: jacket.paperSizeLabel || "",
            colorsFront: jacket.colorsFront,
            colorsBack: jacket.colorsBack,
            quantity: input.quantities[0] || 0,
            bindingType: input.binding.primaryBinding,
            spineThickness,
            machineId: jacket.machineId,
            planningMode: jacket.planningMode,
            isCustomPaper: jacket.isCustomPaper,
            customPaperWidth: jacket.customPaperWidth,
            customPaperHeight: jacket.customPaperHeight,
            customPaperGrain: jacket.customPaperGrain,
        });

        sections.push(plan);
        allWarnings.push(...plan.warnings);
        if (plan.blocked && plan.blockReason) blockReasons.push(plan.blockReason);
    }

    // Plan endleaves
    const endleaves = input.endleaves;
    if (endleaves.enabled && endleaves.pages > 0) {
        const plan = planSection({
            sectionName: "Endleaves",
            sectionType: "endleaves",
            totalPages: endleaves.pages,
            trimWidthMM: input.bookSpec.widthMM,
            trimHeightMM: input.bookSpec.heightMM,
            gsm: endleaves.gsm,
            paperType: endleaves.paperTypeName || "",
            paperCode: endleaves.paperTypeId || "",
            paperSizeLabel: endleaves.paperSizeLabel || "",
            colorsFront: endleaves.colorsFront,
            colorsBack: endleaves.colorsBack,
            quantity: input.quantities[0] || 0,
            bindingType: input.binding.primaryBinding,
            spineThickness,
            machineId: endleaves.machineId,
            planningMode: endleaves.planningMode,
            isCustomPaper: endleaves.isCustomPaper,
            customPaperWidth: endleaves.customPaperWidth,
            customPaperHeight: endleaves.customPaperHeight,
            customPaperGrain: endleaves.customPaperGrain,
        });

        sections.push(plan);
        allWarnings.push(...plan.warnings);
        if (plan.blocked && plan.blockReason) blockReasons.push(plan.blockReason);
    }

    const totalMs = performance.now() - startTime;
    const totalCandidates = sections.reduce((sum, s) => sum + s.allCandidates.length, 0);

    return {
        sections,
        blocked: blockReasons.length > 0,
        blockReasons,
        warnings: allWarnings,
        totalOptimizationTimeMs: Math.round(totalMs * 100) / 100,
        totalCandidatesEvaluated: totalCandidates,
    };
}

// ─── APPLY AUTO-PLAN TO ESTIMATION INPUT ─────────────────────────────────────
// Writes the auto-plan results back into the estimation input sections
// so the wizard shows the recommended values.

export function applyAutoPlanToInput(input: EstimationInput, plan: AutoPlanResult): Partial<EstimationInput> {
    const updated: Partial<EstimationInput> = {};

    // Process each section from the auto-plan result
    for (const sectionPlan of plan.sections) {
        const selected = sectionPlan.selectedPlan;

        if (sectionPlan.sectionType === "text1" || sectionPlan.sectionType === "text2") {
            const idx = sectionPlan.sectionType === "text1" ? 0 : 1;
            if (input.textSections[idx]) {
                if (!updated.textSections) updated.textSections = [...input.textSections];
                const section = { ...updated.textSections[idx] };
                section.recommendedPaperSizeLabel = selected?.paperSizeLabel;
                section.recommendedMachineId = selected?.machineId;
                section.recommendedMachineName = selected?.machineName;
                section.recommendedSignature = selected?.signaturePP;
                section.recommendedUps = selected?.ups;
                section.planningWarnings = sectionPlan.warnings;

                // Auto-fill if in auto mode and we have a selected plan
                if (selected && section.planningMode !== "manual_override") {
                    section.planningMode = "auto";
                    if (!section.paperSizeLabel || section.paperSizeLabel === "") {
                        section.paperSizeLabel = selected.paperSizeLabel;
                        section.paperSizeId = selected.paperSizeId;
                    }
                    if (!section.machineId || section.machineId === "") {
                        section.machineId = selected.machineId;
                        section.machineName = selected.machineName;
                    }
                }

                updated.textSections[idx] = section;
            }
        }

        if (sectionPlan.sectionType === "cover") {
            updated.cover = { ...input.cover };
            updated.cover.recommendedPaperSizeLabel = selected?.paperSizeLabel;
            updated.cover.recommendedMachineId = selected?.machineId;
            updated.cover.recommendedMachineName = selected?.machineName;
            updated.cover.planningWarnings = sectionPlan.warnings;

            if (selected && updated.cover.planningMode !== "manual_override") {
                updated.cover.planningMode = "auto";
                if (!updated.cover.paperSizeLabel || updated.cover.paperSizeLabel === "") {
                    updated.cover.paperSizeLabel = selected.paperSizeLabel;
                    updated.cover.paperSizeId = selected.paperSizeId;
                }
                if (!updated.cover.machineId || updated.cover.machineId === "") {
                    updated.cover.machineId = selected.machineId;
                    updated.cover.machineName = selected.machineName;
                }
            }
        }

        if (sectionPlan.sectionType === "jacket") {
            updated.jacket = { ...input.jacket };
            updated.jacket.recommendedPaperSizeLabel = selected?.paperSizeLabel;
            updated.jacket.recommendedMachineId = selected?.machineId;
            updated.jacket.recommendedMachineName = selected?.machineName;
            updated.jacket.planningWarnings = sectionPlan.warnings;

            if (selected && updated.jacket.planningMode !== "manual_override") {
                updated.jacket.planningMode = "auto";
                if (!updated.jacket.paperSizeLabel || updated.jacket.paperSizeLabel === "") {
                    updated.jacket.paperSizeLabel = selected.paperSizeLabel;
                    updated.jacket.paperSizeId = selected.paperSizeId;
                }
                if (!updated.jacket.machineId || updated.jacket.machineId === "") {
                    updated.jacket.machineId = selected.machineId;
                    updated.jacket.machineName = selected.machineName;
                }
            }
        }

        if (sectionPlan.sectionType === "endleaves") {
            updated.endleaves = { ...input.endleaves };
            updated.endleaves.recommendedPaperSizeLabel = selected?.paperSizeLabel;
            updated.endleaves.recommendedMachineId = selected?.machineId;
            updated.endleaves.recommendedMachineName = selected?.machineName;
            updated.endleaves.planningWarnings = sectionPlan.warnings;

            if (selected && updated.endleaves.planningMode !== "manual_override") {
                updated.endleaves.planningMode = "auto";
                if (!updated.endleaves.paperSizeLabel || updated.endleaves.paperSizeLabel === "") {
                    updated.endleaves.paperSizeLabel = selected.paperSizeLabel;
                    updated.endleaves.paperSizeId = selected.paperSizeId;
                }
                if (!updated.endleaves.machineId || updated.endleaves.machineId === "") {
                    updated.endleaves.machineId = selected.machineId;
                    updated.endleaves.machineName = selected.machineName;
                }
            }
        }
    }

    return updated;
}
