// ============================================================================
// AUTO-PLANNER ORCHESTRATOR
// ============================================================================
//
// This is the TOP-LEVEL entry point for the auto-planning pipeline.
//
// Input:  Trim size + pages + paper category + GSM + binding + quantities
// Output: Complete production plan for every section
//
// Pipeline:
//   1. Build section configs from user input
//   2. Calculate preliminary spine thickness
//   3. Auto-impose ALL sections (imposition engine)
//   4. Resolve paper for each section (paper resolver)
//   5. Select machine for each section (machine selector)
//   6. Calculate wastage (ADDITIVE, Thomson Press method)
//   7. Assemble complete SectionPlan with all production data
//   8. Return BookPlan with diagnostics and procurement
//
// This module coordinates Parts 1 & 2 into a unified planning result
// that the estimation engine (Part 3) will consume for costing.
// ============================================================================

import type {
  Dimensions_mm,
  AnySectionConfig,
  SectionType,
  PaperSpec,
  SheetSpec,
  MachineSpec,
  PrintingMethod,
  ImpositionPlan,
  ImpositionCandidate,
  GrainDirection,
  ProcurementRecommendation,
  Diagnostic,
  BindingConfig,
  CustomPaperOverride,
} from "./types";

import {
  STANDARD_SHEETS,
  MACHINE_DATABASE,
  BULK_FACTORS,
  calculateCaliper,
  calculateSpineThickness,
  lookupWastage,
} from "./constants";

import {
  autoImposeSection,
  autoImposeBook,
  reImposeSection,
  getImpositionSummary,
} from "./imposition";

import type {
  PaperRequirement,
  InventoryPaperItem,
  RateCardPaperEntry,
  PaperCandidate,
  PaperResolutionResult,
} from "./paperResolver";
import { resolvePaper, sheetWeight_kg } from "./paperResolver";

import type {
  MachineRequirement,
  MachineCandidate,
  MachineSelectionResult,
} from "./machineSelector";
import { selectMachine } from "./machineSelector";

// ─── PLAN TYPES ─────────────────────────────────────────────────────────────

/** Complete production plan for one section */
export interface SectionPlan {
  readonly sectionId: string;
  readonly sectionType: SectionType;
  readonly label: string;
  readonly pages: number;
  readonly colorsFront: number;
  readonly colorsBack: number;

  // ── Imposition ──
  readonly imposition: ImpositionPlan;
  readonly impositionSummary: ReturnType<typeof getImpositionSummary>;

  // ── Paper ──
  readonly paper: PaperCandidate | null;
  readonly paperAlternatives: PaperCandidate[];
  readonly paperDiagnostics: PaperResolutionResult["diagnostics"];

  // ── Machine ──
  readonly machine: MachineCandidate | null;
  readonly machineAlternatives: MachineCandidate[];

  // ── Sheet math ──
  readonly netSheets: number;
  readonly wastageSheets: number;
  readonly grossSheets: number;
  readonly totalWeight_kg: number;

  // ── Costing inputs (for estimation engine) ──
  readonly paperCostTotal: number;
  readonly forms: number;
  readonly totalPlates: number;
  readonly estimatedMachineHours: number;
}

/** Complete production plan for the entire book */
export interface BookPlan {
  readonly id: string;
  readonly trimSize: Dimensions_mm;
  readonly totalPages: number;
  readonly quantity: number;
  readonly spineThickness_mm: number;

  /** Plan for each section */
  readonly sections: readonly SectionPlan[];

  /** Aggregated procurement needs */
  readonly procurement: readonly ProcurementRecommendation[];

  /** All diagnostics from all sub-systems */
  readonly diagnostics: readonly Diagnostic[];

  /** Planning metadata */
  readonly meta: {
    readonly planningTime_ms: number;
    readonly candidatesEvaluated: number;
    readonly timestamp: string;
  };
}

// ─── ORCHESTRATOR INPUT ─────────────────────────────────────────────────────

export interface AutoPlanInput {
  /** Book trim size */
  readonly trimSize: Dimensions_mm;
  /** All sections to plan */
  readonly sections: readonly AnySectionConfig[];
  /** Binding configuration (needed for spine calculation) */
  readonly binding: BindingConfig;
  /** Quantity to plan for */
  readonly quantity: number;

  // ── Data sources (injected from stores) ──
  readonly inventory: readonly InventoryPaperItem[];
  readonly rateCard: readonly RateCardPaperEntry[];
  readonly machines?: readonly MachineSpec[];
  readonly sheets?: readonly SheetSpec[];

  // ── User overrides ──
  readonly overrides?: {
    readonly forceSpineThickness_mm?: number;
    readonly customPaperCostPerKg?: number;
  };
}

// ─── SPINE CALCULATION ──────────────────────────────────────────────────────

/**
 * Calculate preliminary spine thickness from all text sections.
 * This is needed BEFORE cover/jacket imposition (they wrap around the spine).
 */
function calculatePreliminarySpine(
  sections: readonly AnySectionConfig[],
  binding: BindingConfig,
): number {
  let totalThickness_mm = 0;

  for (const section of sections) {
    if (!section.enabled || section.type !== "TEXT") continue;

    const bulkFactor = section.customPaper?.bulkFactor ?? section.paper.bulkFactor;
    const gsm = section.customPaper?.gsm ?? section.paper.gsm;
    const thickness = calculateSpineThickness(section.pages, gsm, bulkFactor);
    totalThickness_mm += thickness;
  }

  // Add board thickness for case binding
  if (binding.method === "CASE" && binding.boardThickness_mm) {
    totalThickness_mm += binding.boardThickness_mm * 2;
  }

  // Add cover card thickness for perfect binding
  if (binding.method === "PERFECT") {
    // Assume 300gsm cover card ≈ 0.4mm per side
    totalThickness_mm += 0.8;
  }

  return Math.max(1, totalThickness_mm);
}

// ─── SECTION PLANNER ────────────────────────────────────────────────────────

/**
 * Plan a single section: impose → resolve paper → select machine → calculate sheets.
 */
function planSection(
  section: AnySectionConfig,
  trimSize: Dimensions_mm,
  spineThickness_mm: number,
  quantity: number,
  inventory: readonly InventoryPaperItem[],
  rateCard: readonly RateCardPaperEntry[],
  sheets: readonly SheetSpec[],
  machines: readonly MachineSpec[],
  customCostPerKg?: number,
): SectionPlan {
  // ── Step 1: Imposition ──
  const imposition = autoImposeSection({
    section,
    trimSize,
    spineThickness_mm,
    quantity,
    sheets,
    machines,
    constraints: {
      preferredSheet: section.preferredSheet,
      preferredMachine: section.preferredMachine,
      preferredMethod: section.preferredMethod,
    },
  });

  const impositionSummary = getImpositionSummary(imposition);
  const selectedImp = imposition.selected;

  // If no imposition candidate, return empty plan
  if (!selectedImp) {
    return buildEmptySectionPlan(section, imposition, impositionSummary);
  }

  // ── Step 2: Calculate sheet requirements ──
  const netSheets = selectedImp.totalNetSheets;
  const wastage = lookupWastage(quantity, netSheets);
  const grossSheets = netSheets + wastage.totalWaste;

  // ── Step 3: Resolve paper ──
  const paperReq: PaperRequirement = {
    category: section.paper.category,
    gsm: section.customPaper?.gsm ?? section.paper.gsm,
    requiredGrain: selectedImp.grain.compliant
      ? section.paper.grain
      : (selectedImp.grain.grainAxis === "HEIGHT" ? "LONG_GRAIN" : "SHORT_GRAIN"),
    sheetSpec: selectedImp.sheet,
    grossSheets,
    quantity,
    customOverride: section.customPaper,
  };

  const paperResult = resolvePaper(
    paperReq,
    inventory,
    rateCard,
    customCostPerKg,
  );

  // ── Step 4: Select machine ──
  const maxColors = Math.max(section.colorsFront, section.colorsBack);
  const machineReq: MachineRequirement = {
    sheet: selectedImp.sheet,
    maxColors,
    preferredMethod: selectedImp.method,
    preferredMachineId: section.preferredMachine,
    prefersPerfecting: selectedImp.method === "PERFECTING",
    quantity,
    forms: selectedImp.forms,
  };

  const machineResult = selectMachine(machineReq, machines);

  // ── Step 5: Calculate totals ──
  const weightPerSheet = paperResult.selected
    ? paperResult.selected.weightPerSheet_kg
    : sheetWeight_kg(
        selectedImp.sheet.size_mm,
        section.customPaper?.gsm ?? section.paper.gsm,
      );

  const totalWeight = weightPerSheet * grossSheets;
  const paperCostTotal = paperResult.selected
    ? paperResult.selected.costPerSheet * grossSheets
    : 0;

  return {
    sectionId: section.id,
    sectionType: section.type,
    label: section.label,
    pages: section.pages,
    colorsFront: section.colorsFront,
    colorsBack: section.colorsBack,

    imposition,
    impositionSummary,

    paper: paperResult.selected,
    paperAlternatives: paperResult.alternatives,
    paperDiagnostics: paperResult.diagnostics,

    machine: machineResult.selected,
    machineAlternatives: machineResult.alternatives,

    netSheets,
    wastageSheets: wastage.totalWaste,
    grossSheets,
    totalWeight_kg: totalWeight,

    paperCostTotal,
    forms: selectedImp.forms,
    totalPlates: selectedImp.totalPlates,
    estimatedMachineHours: machineResult.selected?.estimatedHours ?? 0,
  };
}

function buildEmptySectionPlan(
  section: AnySectionConfig,
  imposition: ImpositionPlan,
  impositionSummary: ReturnType<typeof getImpositionSummary>,
): SectionPlan {
  return {
    sectionId: section.id,
    sectionType: section.type,
    label: section.label,
    pages: section.pages,
    colorsFront: section.colorsFront,
    colorsBack: section.colorsBack,
    imposition,
    impositionSummary,
    paper: null,
    paperAlternatives: [],
    paperDiagnostics: [{ level: "ERROR", message: "No imposition solution — cannot resolve paper" }],
    machine: null,
    machineAlternatives: [],
    netSheets: 0,
    wastageSheets: 0,
    grossSheets: 0,
    totalWeight_kg: 0,
    paperCostTotal: 0,
    forms: 0,
    totalPlates: 0,
    estimatedMachineHours: 0,
  };
}

// ─── MAIN ORCHESTRATOR ──────────────────────────────────────────────────────

/**
 * Auto-plan an entire book.
 *
 * This is the TOP-LEVEL entry point. Feed it minimal user input
 * and it returns a complete production plan for every section.
 */
export function autoPlanBook(input: AutoPlanInput): BookPlan {
  const startTime = performance.now();

  const sheets = input.sheets ?? STANDARD_SHEETS;
  const machines = input.machines ?? MACHINE_DATABASE;
  const allDiagnostics: Diagnostic[] = [];
  const allProcurement: ProcurementRecommendation[] = [];
  let totalCandidatesEvaluated = 0;

  // ── Step 1: Spine thickness ──
  const spineThickness = input.overrides?.forceSpineThickness_mm
    ?? calculatePreliminarySpine(input.sections, input.binding);

  allDiagnostics.push({
    level: "INFO",
    code: "SPINE_CALCULATED",
    message: `Preliminary spine thickness: ${spineThickness.toFixed(1)}mm`,
  });

  // ── Step 2: Plan text sections FIRST (needed for spine → cover) ──
  const textSections = input.sections.filter(
    (s) => s.enabled && s.type === "TEXT",
  );
  const nonTextSections = input.sections.filter(
    (s) => s.enabled && s.type !== "TEXT",
  );

  const sectionPlans: SectionPlan[] = [];

  // Plan text sections
  for (const section of textSections) {
    const plan = planSection(
      section,
      input.trimSize,
      spineThickness,
      input.quantity,
      input.inventory,
      input.rateCard,
      sheets,
      machines,
      input.overrides?.customPaperCostPerKg,
    );

    sectionPlans.push(plan);

    // Collect diagnostics
    plan.imposition.diagnostics.forEach((d) =>
      allDiagnostics.push({ ...d, code: `${section.id}:${d.code}` }),
    );
    plan.paperDiagnostics.forEach((d) =>
      allDiagnostics.push({ level: d.level, code: `${section.id}:PAPER`, message: d.message }),
    );

    // Collect procurement
    const paperRes = resolvePaper(
      {
        category: section.paper.category,
        gsm: section.customPaper?.gsm ?? section.paper.gsm,
        requiredGrain: section.paper.grain,
        sheetSpec: plan.imposition.selected?.sheet ?? sheets[0],
        grossSheets: plan.grossSheets,
        quantity: input.quantity,
        customOverride: section.customPaper,
      },
      input.inventory,
      input.rateCard,
    );
    if (paperRes.procurement) {
      allProcurement.push(paperRes.procurement);
    }

    totalCandidatesEvaluated +=
      (plan.imposition.selected ? 1 : 0) +
      plan.imposition.alternatives.length +
      plan.imposition.rejected.length;
  }

  // Plan non-text sections (cover, jacket, endleaves)
  // These may need the spine thickness from text sections
  for (const section of nonTextSections) {
    // Inject spine thickness into cover/jacket
    let enrichedSection = section;
    if (section.type === "COVER" || section.type === "JACKET") {
      enrichedSection = {
        ...section,
        spineThickness_mm: spineThickness,
      } as AnySectionConfig;
    }

    const plan = planSection(
      enrichedSection,
      input.trimSize,
      spineThickness,
      input.quantity,
      input.inventory,
      input.rateCard,
      sheets,
      machines,
      input.overrides?.customPaperCostPerKg,
    );

    sectionPlans.push(plan);

    plan.imposition.diagnostics.forEach((d) =>
      allDiagnostics.push({ ...d, code: `${section.id}:${d.code}` }),
    );
    plan.paperDiagnostics.forEach((d) =>
      allDiagnostics.push({ level: d.level, code: `${section.id}:PAPER`, message: d.message }),
    );

    totalCandidatesEvaluated +=
      (plan.imposition.selected ? 1 : 0) +
      plan.imposition.alternatives.length +
      plan.imposition.rejected.length;
  }

  // ── Step 3: Calculate total pages ──
  const totalPages = input.sections
    .filter((s) => s.enabled && s.type === "TEXT")
    .reduce((sum, s) => sum + s.pages, 0);

  const planningTime = performance.now() - startTime;

  return {
    id: `plan_${Date.now()}`,
    trimSize: input.trimSize,
    totalPages,
    quantity: input.quantity,
    spineThickness_mm: spineThickness,
    sections: sectionPlans,
    procurement: allProcurement,
    diagnostics: allDiagnostics,
    meta: {
      planningTime_ms: Math.round(planningTime),
      candidatesEvaluated: totalCandidatesEvaluated,
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── RE-PLANNING (user overrides a selection) ───────────────────────────────

export interface ReplanOverrides {
  /** Section ID to re-plan */
  readonly sectionId: string;
  /** Force a specific sheet */
  readonly forceSheet?: string;
  /** Force a specific machine */
  readonly forceMachine?: string;
  /** Force a specific printing method */
  readonly forceMethod?: PrintingMethod;
  /** Force a specific signature size */
  readonly forceSignature?: number;
  /** Force a specific paper candidate */
  readonly forcePaperCandidateId?: string;
}

/**
 * Re-plan a single section within an existing BookPlan.
 *
 * Used when the user overrides a machine, sheet, or paper selection
 * in the wizard. Only the affected section is recalculated.
 *
 * Returns a new BookPlan with the updated section.
 */
export function replanSection(
  existingPlan: BookPlan,
  overrides: ReplanOverrides,
  input: AutoPlanInput,
): BookPlan {
  const sectionIdx = existingPlan.sections.findIndex(
    (s) => s.sectionId === overrides.sectionId,
  );

  if (sectionIdx === -1) {
    return existingPlan; // Section not found, return unchanged
  }

  const section = input.sections.find((s) => s.id === overrides.sectionId);
  if (!section) return existingPlan;

  const sheets = input.sheets ?? STANDARD_SHEETS;
  const machines = input.machines ?? MACHINE_DATABASE;

  // Re-impose with overrides
  const reImposed = reImposeSection(
    {
      section,
      trimSize: existingPlan.trimSize,
      spineThickness_mm: existingPlan.spineThickness_mm,
      quantity: existingPlan.quantity,
      sheets,
      machines,
    },
    {
      forceSheet: overrides.forceSheet,
      forceMachine: overrides.forceMachine,
      forceMethod: overrides.forceMethod,
      forceSignature: overrides.forceSignature,
    },
  );

  const selectedImp = reImposed.selected;
  if (!selectedImp) {
    // No valid candidate with overrides — keep existing
    return existingPlan;
  }

  // Recalculate paper and machine with new imposition
  const netSheets = selectedImp.totalNetSheets;
  const wastage = lookupWastage(existingPlan.quantity, netSheets);
  const grossSheets = netSheets + wastage.totalWaste;

  const paperResult = resolvePaper(
    {
      category: section.paper.category,
      gsm: section.customPaper?.gsm ?? section.paper.gsm,
      requiredGrain: section.paper.grain,
      sheetSpec: selectedImp.sheet,
      grossSheets,
      quantity: existingPlan.quantity,
      customOverride: section.customPaper,
    },
    input.inventory,
    input.rateCard,
    input.overrides?.customPaperCostPerKg,
  );

  // If user forced a specific paper candidate, select it
  let selectedPaper = paperResult.selected;
  if (overrides.forcePaperCandidateId) {
    const forced = [
      ...paperResult.alternatives,
      ...(paperResult.selected ? [paperResult.selected] : []),
    ].find((c) => c.candidateId === overrides.forcePaperCandidateId);
    if (forced) selectedPaper = forced;
  }

  const machineResult = selectMachine(
    {
      sheet: selectedImp.sheet,
      maxColors: Math.max(section.colorsFront, section.colorsBack),
      preferredMethod: overrides.forceMethod ?? selectedImp.method,
      preferredMachineId: overrides.forceMachine,
      quantity: existingPlan.quantity,
      forms: selectedImp.forms,
    },
    machines,
  );

  const weightPerSheet = selectedPaper
    ? selectedPaper.weightPerSheet_kg
    : sheetWeight_kg(selectedImp.sheet.size_mm, section.paper.gsm);

  const updatedPlan: SectionPlan = {
    sectionId: section.id,
    sectionType: section.type,
    label: section.label,
    pages: section.pages,
    colorsFront: section.colorsFront,
    colorsBack: section.colorsBack,
    imposition: reImposed,
    impositionSummary: getImpositionSummary(reImposed),
    paper: selectedPaper,
    paperAlternatives: paperResult.alternatives,
    paperDiagnostics: paperResult.diagnostics,
    machine: machineResult.selected,
    machineAlternatives: machineResult.alternatives,
    netSheets,
    wastageSheets: wastage.totalWaste,
    grossSheets,
    totalWeight_kg: weightPerSheet * grossSheets,
    paperCostTotal: selectedPaper ? selectedPaper.costPerSheet * grossSheets : 0,
    forms: selectedImp.forms,
    totalPlates: selectedImp.totalPlates,
    estimatedMachineHours: machineResult.selected?.estimatedHours ?? 0,
  };

  // Replace the section in the plan
  const newSections = [...existingPlan.sections];
  newSections[sectionIdx] = updatedPlan;

  return {
    ...existingPlan,
    sections: newSections,
    diagnostics: [
      ...existingPlan.diagnostics,
      {
        level: "INFO",
        code: "SECTION_REPLANNED",
        message: `Section '${section.label}' re-planned with overrides`,
      },
    ],
    meta: {
      ...existingPlan.meta,
      timestamp: new Date().toISOString(),
    },
  };
}

// ─── PLAN FOR MULTIPLE QUANTITIES ───────────────────────────────────────────

/**
 * Generate BookPlans for multiple quantities simultaneously.
 *
 * This is what the wizard calls when the user has entered
 * up to 5 quantity slots. Each quantity gets its own plan
 * because sheet counts and wastage change with quantity.
 */
export function autoPlanMultiQuantity(
  baseInput: Omit<AutoPlanInput, "quantity">,
  quantities: readonly number[],
): Map<number, BookPlan> {
  const plans = new Map<number, BookPlan>();

  for (const qty of quantities) {
    if (qty <= 0) continue;

    const plan = autoPlanBook({
      ...baseInput,
      quantity: qty,
    });

    plans.set(qty, plan);
  }

  return plans;
}

// ─── PLAN SUMMARY (for UI display) ──────────────────────────────────────────

export interface PlanSummary {
  readonly quantity: number;
  readonly spineThickness_mm: number;
  readonly sections: Array<{
    readonly label: string;
    readonly type: SectionType;
    readonly sheet: string;
    readonly signature: string;
    readonly method: string;
    readonly ups: number;
    readonly waste: string;
    readonly grain: string;
    readonly machine: string;
    readonly grossSheets: number;
    readonly paperCost: number;
    readonly inStock: boolean;
  }>;
  readonly totalPaperCost: number;
  readonly totalPlates: number;
  readonly totalMachineHours: number;
  readonly procurementNeeded: boolean;
  readonly planningTime_ms: number;
}

/**
 * Generate a human-readable summary of a BookPlan.
 * Used by the wizard's live preview panel.
 */
export function summarizePlan(plan: BookPlan): PlanSummary {
  return {
    quantity: plan.quantity,
    spineThickness_mm: plan.spineThickness_mm,
    sections: plan.sections.map((s) => ({
      label: s.label,
      type: s.sectionType,
      sheet: s.impositionSummary.sheet,
      signature: s.impositionSummary.signature,
      method: s.impositionSummary.method,
      ups: s.impositionSummary.ups,
      waste: s.impositionSummary.waste,
      grain: s.impositionSummary.grain,
      machine: s.machine?.machine.name ?? "—",
      grossSheets: s.grossSheets,
      paperCost: s.paperCostTotal,
      inStock: s.paper?.inStock ?? false,
    })),
    totalPaperCost: plan.sections.reduce((sum, s) => sum + s.paperCostTotal, 0),
    totalPlates: plan.sections.reduce((sum, s) => sum + s.totalPlates, 0),
    totalMachineHours: plan.sections.reduce((sum, s) => sum + s.estimatedMachineHours, 0),
    procurementNeeded: plan.procurement.length > 0,
    planningTime_ms: plan.meta.planningTime_ms,
  };
}

