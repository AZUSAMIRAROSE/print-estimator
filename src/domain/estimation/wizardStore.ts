// ============================================================================
// WIZARD STORE — ZUSTAND STATE MANAGEMENT FOR ESTIMATION WIZARD
// ============================================================================
//
// This is the CENTRAL HUB for the new estimation wizard.
//
// Responsibilities:
//   1. Maintain wizard navigation state (currentStep 0–14)
//   2. Store user-entered estimation input
//   3. Auto-plan and cache BookPlan results
//   4. Track field-level metadata (source, confidence, overrides)
//   5. Handle re-planning when user overrides a selection
//   6. Manage UI state (loading, error, preview visibility)
//   7. Persist to localStorage (ongoing estimation recovery)
//
// Design:
//   - Single "estimation" state object (entire form state)
//   - Separate "plan" state (auto-planned result)
//   - Separate "meta" state (field metadata)
//   - Async actions that call into the estimation domain
//   - Immer middleware for immutable updates
//   - Persist middleware for localStorage
// ============================================================================

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { persist } from "zustand/middleware";

import type {
  CanonicalEstimationInput,
  AnySectionConfig,
  CoverConfig,
} from "./types";

import type { BookPlan, PlanSummary } from "./autoPlanner";
import {
  autoPlanBook,
  replanSection,
  summarizePlan,
} from "./autoPlanner";

import type { InventoryPaperItem, RateCardPaperEntry } from "./paperResolver";
import type { EstimationMeta, SectionMeta } from "./fieldMeta";
import {
  createFieldMeta,
  overrideFieldMeta,
  revertFieldMeta,
  getOverriddenFields,
  getLowConfidenceFields,
  getMetaStats,
  generateAuditTrail,
} from "./fieldMeta";

// ─── STORE STATE TYPE ──────────────────────────────────────────────────────

export interface WizardState {
  // ── Navigation ──
  currentStep: number;
  isLinearMode: boolean; // If true, user can only go forward; if false, free navigation

  // ── Estimation input ──
  estimation: CanonicalEstimationInput;

  // ── Auto-planning results (cached) ──
  plans: Map<number, BookPlan>;
  activePlanQuantity: number | null; // Which quantity's plan is currently displayed
  planSummaries: Map<number, PlanSummary>;

  // ── Field metadata ──
  meta: EstimationMeta;

  // ── UI state ──
  isPlanning: boolean; // Auto-planning in progress
  planError: string | null;
  planningTime_ms: number | null;

  showLivePreview: boolean;
  showMetaPanel: boolean; // Show confidence scores, overrides, etc.

  // ── Data sources (injected) ──
  inventory: readonly InventoryPaperItem[];
  rateCard: readonly RateCardPaperEntry[];

  // ── Actions ─�

  // Wizard navigation
  setStep(step: number): void;
  nextStep(): void;
  prevStep(): void;
  goToStep(step: number): boolean; // Returns false if step invalid

  // Estimation input updates
  setEstimationField<T>(path: string, value: T): void; // path: "book.trimSize.width", etc.
  addSection(section: AnySectionConfig): void;
  removeSection(sectionId: string): void;
  enableSection(sectionId: string, enabled: boolean): void;
  updateSection(sectionId: string, section: Partial<AnySectionConfig>): void;

  // Auto-planning
  runAutoPlanning(
    inventory: readonly InventoryPaperItem[],
    rateCard: readonly RateCardPaperEntry[],
  ): Promise<void>;

  // Override handling
  overrideField(sectionId: string, fieldName: string, newValue: unknown, reason?: string): void;
  revertFieldOverride(sectionId: string, fieldName: string): void;
  getOverrides(): ReturnType<typeof getOverriddenFields>;

  // Re-planning after override
  replanSection(sectionId: string, overrides: Record<string, unknown>): Promise<void>;

  // UI toggles
  toggleLivePreview(): void;
  toggleMetaPanel(): void;

  // Data injection
  setDataSources(inventory: readonly InventoryPaperItem[], rateCard: readonly RateCardPaperEntry[]): void;

  // Metadata queries
  getMetaStats(): ReturnType<typeof getMetaStats>;
  getLowConfidenceFields(): ReturnType<typeof getLowConfidenceFields>;
  getAuditTrail(): string;

  // Reset & recovery
  resetToDefault(): void;
  resetCaches(): void;

  // Snapshot integration (exported for Part 4)
  toEstimationInput(): CanonicalEstimationInput;
  toMetadata(): EstimationMeta;
}

// ─── DEFAULT STATE ──────────────────────────────────────────────────────────

function generateId(): string {
  return `est_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_ESTIMATION: CanonicalEstimationInput = {
  id: generateId(),
  jobTitle: "Untitled Job",
  customerName: "—",
  book: {
    trimSize: { width: 153, height: 234 },
    totalPages: 0,
    quantities: [1000, 2000, 3000, 5000, 0],
  },
  sections: [
    {
      id: "text1",
      type: "TEXT",
      label: "Text Section 1",
      enabled: true,
      pages: 192,
      colorsFront: 4,
      colorsBack: 4,
      paper: {
        code: "matt_130",
        name: "Matt Art Paper",
        category: "MATT_ART",
        gsm: 130,
        bulkFactor: 1.0,
        caliper_microns: 136.5,
        grain: "LONG_GRAIN",
      },
    },
    {
      id: "cover",
      type: "COVER",
      label: "Cover",
      enabled: true,
      pages: 4,
      colorsFront: 4,
      colorsBack: 0,
      foldType: "WRAP_AROUND",
      selfCover: false,
      paper: {
        code: "artcard_300",
        name: "Art Card",
        category: "ART_CARD",
        gsm: 300,
        bulkFactor: 1.2,
        caliper_microns: 378,
        grain: "LONG_GRAIN",
      },
    } as CoverConfig,
  ],
  binding: { method: "PERFECT" },
  finishing: {},
  pricing: {
    currency: "INR",
    exchangeRate: 1,
    marginPercent: 25,
    discountPercent: 0,
    commissionPercent: 0,
    taxRate: 0,
    includesTax: false,
  },
};

// ─── STORE CREATION ─────────────────────────────────────────────────────────

export const useWizardStore = create<WizardState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentStep: 0,
      isLinearMode: false,
      estimation: DEFAULT_ESTIMATION,
      plans: new Map(),
      activePlanQuantity: null,
      planSummaries: new Map(),
      meta: {},
      isPlanning: false,
      planError: null,
      planningTime_ms: null,
      showLivePreview: true,
      showMetaPanel: false,
      inventory: [],
      rateCard: [],

      // ── NAVIGATION ──

      setStep: (step: number) => {
        set((state) => {
          if (step < 0 || step > 14) {
            console.warn(`Invalid step ${step}, staying at ${state.currentStep}`);
            return;
          }
          state.currentStep = step;
        });
      },

      nextStep: () => {
        set((state) => {
          if (state.currentStep < 14) state.currentStep++;
        });
      },

      prevStep: () => {
        set((state) => {
          if (state.currentStep > 0) state.currentStep--;
        });
      },

      goToStep: (step: number): boolean => {
        const state = get();
        if (state.isLinearMode && step > state.currentStep + 1) {
          return false; // Not allowed in linear mode
        }
        if (step < 0 || step > 14) return false;
        set((s) => {
          s.currentStep = step;
        });
        return true;
      },

      // ── ESTIMATION INPUT UPDATES ──

      setEstimationField: <T,>(path: string, value: T) => {
        set((state) => {
          const keys = path.split(".");
          let obj: any = state.estimation;

          // Navigate to parent
          for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
          }

          // Set value
          obj[keys[keys.length - 1]] = value;

          // Update metadata to flag as user-modified
          const sectionId = keys[0] === "sections" ? keys[1] : "__global__";
          if (!state.meta[sectionId]) state.meta[sectionId] = {};
          const fieldName = keys[keys.length - 1];
          if (state.meta[sectionId][fieldName]) {
            // Existing field: mark as override
            const existing = state.meta[sectionId][fieldName];
            state.meta[sectionId][fieldName] = overrideFieldMeta(
              existing,
              value,
              `User edited: ${path} = ${value}`,
            );
          }
        });
      },

      addSection: (section: AnySectionConfig) => {
        set((state) => {
          state.estimation.sections.push(section);
          state.meta[section.id] = {};
          state.plans.delete(section.id as any); // Invalidate plans
        });
      },

      removeSection: (sectionId: string) => {
        set((state) => {
          state.estimation.sections = state.estimation.sections.filter(
            (s) => s.id !== sectionId,
          );
          delete state.meta[sectionId];
        });
      },

      enableSection: (sectionId: string, enabled: boolean) => {
        set((state) => {
          const section = state.estimation.sections.find((s) => s.id === sectionId);
          if (section) section.enabled = enabled;
        });
      },

      updateSection: (sectionId: string, updates: Partial<AnySectionConfig>) => {
        set((state) => {
          const section = state.estimation.sections.find((s) => s.id === sectionId);
          if (section) Object.assign(section, updates);
        });
      },

      // ── AUTO-PLANNING ──

      runAutoPlanning: async (
        inventory: readonly InventoryPaperItem[],
        rateCard: readonly RateCardPaperEntry[],
      ) => {
        const state = get();
        set((s) => {
          s.isPlanning = true;
          s.planError = null;
        });

        const startTime = performance.now();

        try {
          const firstQty = state.estimation.book.quantities.find((q) => q > 0) || 1000;
          
          const bookPlans = autoPlanBook({
            trimSize: state.estimation.book.trimSize,
            sections: state.estimation.sections,
            binding: state.estimation.binding,
            quantity: firstQty,
            inventory: [...inventory],
            rateCard: [...rateCard],
          });

          // Cache the plans
          const summaries = new Map<number, PlanSummary>();
          const plan = bookPlans; // single plan for now
          const summary = summarizePlan(plan);
          summaries.set(firstQty, summary);

          const planningTime = performance.now() - startTime;

          set((s) => {
            s.plans.set(firstQty, plan as any);
            s.activePlanQuantity = firstQty;
            s.planSummaries = summaries;

            // Update metadata from plan diagnostics
            for (const section of plan.sections) {
              if (!s.meta[section.sectionId]) s.meta[section.sectionId] = {};

              // Mark imposition as auto-planned
              if (section.imposition.selected) {
                s.meta[section.sectionId]["imposition"] = createFieldMeta(
                  section.imposition.selected.sheet.label,
                  "AUTO_PLANNED",
                  0.8,
                  `Auto-imposed: ${section.imposition.selected.sheet.label}, ${section.imposition.selected.signaturePages}pp`,
                );
              }

              // Mark paper as auto-resolved
              if (section.paper) {
                s.meta[section.sectionId]["paper"] = createFieldMeta(
                  section.paper.paper.name,
                  "AUTO_PLANNED",
                  section.paper.confidence,
                  `Auto-resolved: ${section.paper.source}`,
                );
              }

              // Mark machine as auto-selected
              if (section.machine) {
                s.meta[section.sectionId]["machine"] = createFieldMeta(
                  section.machine.machine.name,
                  "AUTO_PLANNED",
                  0.75,
                  `Auto-selected: compatible with sheet and colors`,
                );
              }
            }

            s.isPlanning = false;
            s.planningTime_ms = Math.round(planningTime);
          });
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          set((s) => {
            s.isPlanning = false;
            s.planError = `Auto-planning failed: ${errorMsg}`;
          });
          console.error("Auto-planning error:", err);
        }
      },

      // ── OVERRIDE HANDLING ──

      overrideField: (sectionId: string, fieldName: string, newValue: unknown, reason?: string) => {
        set((state) => {
          if (!state.meta[sectionId]) state.meta[sectionId] = {};

          const existing = state.meta[sectionId][fieldName];
          state.meta[sectionId][fieldName] = existing
            ? overrideFieldMeta(existing, newValue, reason)
            : createFieldMeta(newValue, "USER_OVERRIDE", 1.0, reason);

          // Invalidate plan
          state.plans.clear();
        });
      },

      revertFieldOverride: (sectionId: string, fieldName: string) => {
        set((state) => {
          if (!state.meta[sectionId]) return;
          const existing = state.meta[sectionId][fieldName];
          if (!existing) return;

          const reverted = revertFieldMeta(existing);
          if (reverted) {
            state.meta[sectionId][fieldName] = reverted;
            state.plans.clear(); // Invalidate
          }
        });
      },

      getOverrides: () => getOverriddenFields(get().meta),

      // ── RE-PLANNING ──

      replanSection: async (sectionId: string, overrides: Record<string, unknown>) => {
        const state = get();
        const plan = state.plans.get(state.activePlanQuantity ?? 1000);
        if (!plan) return;

        set((s) => {
          s.isPlanning = true;
          s.planError = null;
        });

        try {
          const section = state.estimation.sections.find((s) => s.id === sectionId);
          if (!section) throw new Error(`Section ${sectionId} not found`);

          // Call replanSection with the correct signature
          const newPlan = replanSection(
            plan,
            {
              sectionId,
              forceSheet: overrides.sheet as string | undefined,
              forceMachine: overrides.machine as string | undefined,
              forceMethod: overrides.method as any,
              forceSignature: overrides.signature as number | undefined,
            },
            {
              trimSize: state.estimation.book.trimSize,
              sections: state.estimation.sections,
              binding: state.estimation.binding,
              quantity: plan.quantity,
              inventory: state.inventory as any,
              rateCard: state.rateCard as any,
            }
          );

          // Store the replanned section data
          set((s) => {
            s.plans.set(state.activePlanQuantity ?? 1000, newPlan as any);
            
            // Update metadata
            if (!s.meta[sectionId]) s.meta[sectionId] = {};

            for (const [key, value] of Object.entries(overrides)) {
              s.meta[sectionId][key] = overrideFieldMeta(
                s.meta[sectionId][key] || createFieldMeta(value, "AUTO_PLANNED"),
                value,
                `User override: ${key}`,
              );
            }

            s.isPlanning = false;
          });
        } catch (err) {
          set((s) => {
            s.isPlanning = false;
            s.planError = `Re-planning failed: ${err instanceof Error ? err.message : String(err)}`;
          });
        }
      },

      // ── UI TOGGLES ──

      toggleLivePreview: () => {
        set((state) => {
          state.showLivePreview = !state.showLivePreview;
        });
      },

      toggleMetaPanel: () => {
        set((state) => {
          state.showMetaPanel = !state.showMetaPanel;
        });
      },

      // ── DATA INJECTION ──

      setDataSources: (inventory: readonly InventoryPaperItem[], rateCard: readonly RateCardPaperEntry[]) => {
        set((state) => {
          state.inventory = inventory as any;
          state.rateCard = rateCard as any;
        });
      },

      // ── METADATA QUERIES ──

      getMetaStats: () => getMetaStats(get().meta),

      getLowConfidenceFields: () => getLowConfidenceFields(get().meta),

      getAuditTrail: () => generateAuditTrail(get().meta),

      // ── RESET & RECOVERY ──

      resetToDefault: () => {
        set((state) => {
          state.estimation = JSON.parse(JSON.stringify(DEFAULT_ESTIMATION));
          state.estimation.id = generateId();
          state.currentStep = 0;
          state.plans.clear();
          state.meta = {};
          state.planError = null;
        });
      },

      resetCaches: () => {
        set((state) => {
          state.plans.clear();
          state.planSummaries.clear();
          state.activePlanQuantity = null;
          state.planError = null;
        });
      },

      // ── SNAPSHOT INTEGRATION ──

      toEstimationInput: (): CanonicalEstimationInput => get().estimation,

      toMetadata: (): EstimationMeta => get().meta,
    })),
    {
      name: "wizard-store-v2", // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        currentStep: state.currentStep,
        estimation: state.estimation,
        meta: state.meta,
        showLivePreview: state.showLivePreview,
      }),
      version: 1,
    },
  ),
);

// ─── HELPER HOOKS ──────────────────────────────────────────────────────────

/**
 * Hook: Get current step name for display.
 */
export function useStepName(step: number): string {
  const steps = [
    "Basic Info",
    "Book Specification",
    "Text Sections",
    "Cover",
    "Jacket",
    "Endleaves",
    "Binding",
    "Finishing",
    "Packing",
    "Delivery",
    "Pre-Press",
    "Pricing",
    "Additional",
    "Notes",
    "Review & Create",
  ];
  return steps[step] ?? "Unknown";
}

/**
 * Hook: Check if current step is valid (all required fields filled).
 * Can be customized per step.
 */
export function useStepValid(step: number, estimation: CanonicalEstimationInput): boolean {
  switch (step) {
    case 0: // Basic Info
      return (estimation.jobTitle?.trim().length ?? 0) > 0 &&
        (estimation.customerName?.trim().length ?? 0) > 0;
    case 1: // Book Specification
      return estimation.book.trimSize.width > 0 &&
        estimation.book.trimSize.height > 0 &&
        estimation.book.quantities.some((q) => q > 0);
    case 2: // Text Sections
      return estimation.sections.some(
        (s) => s.type === "TEXT" && s.enabled && s.pages > 0,
      );
    case 14: // Review
      return true; // Always allow review
    default:
      return true; // Other steps are optional
  }
}

/**
 * Hook: Get the currently active plan for live preview.
 */
export function useActivePlan(): BookPlan | null {
  const { plans, activePlanQuantity } = useWizardStore();
  if (!activePlanQuantity) return null;
  return plans.get(activePlanQuantity) ?? null;
}

/**
 * Hook: Get metadata for a specific section.
 */
export function useSectionMeta(sectionId: string): SectionMeta | null {
  const { meta } = useWizardStore();
  return meta[sectionId] ?? null;
}

/**
 * Hook: Check if a field has been overridden by user.
 */
export function useFieldOverridden(sectionId: string, fieldName: string): boolean {
  const { meta } = useWizardStore();
  const field = meta[sectionId]?.[fieldName];
  return field?.source === "USER_OVERRIDE" && field?.overriddenFrom !== undefined;
}

/**
 * Hook: Get confidence score for a field.
 */
export function useFieldConfidence(sectionId: string, fieldName: string): number {
  const { meta } = useWizardStore();
  return meta[sectionId]?.[fieldName]?.confidence ?? 0.5;
}

