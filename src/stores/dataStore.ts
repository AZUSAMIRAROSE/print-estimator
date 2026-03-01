import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  Customer, Job, Quotation, PaperType, Machine,
  FreightDestination, BoardType, CoveringMaterial, EstimationInput,
  EstimationResult
} from "@/types";
import {
  DEFAULT_MACHINES, DEFAULT_DESTINATIONS, DEFAULT_BOARD_TYPES,
  DEFAULT_COVERING_MATERIALS, DEFAULT_PAPER_RATES, STANDARD_PAPER_SIZES
} from "@/constants";
import { generateId, generateJobNumber, generateQuotationNumber, generateCustomerCode } from "@/utils/format";

interface DataState {
  // Entities
  customers: Customer[];
  jobs: Job[];
  quotations: Quotation[];

  // Rate Card Data
  machines: Machine[];
  destinations: FreightDestination[];
  boardTypes: BoardType[];
  coveringMaterials: CoveringMaterial[];

  // Draft estimation
  draftEstimation: EstimationInput | null;

  // Customer CRUD
  addCustomer: (customer: Omit<Customer, "id" | "createdAt" | "updatedAt" | "totalOrders" | "totalRevenue">) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomer: (id: string) => Customer | undefined;
  duplicateCustomer: (id: string) => Customer | undefined;

  // Job CRUD
  addJob: (job: Omit<Job, "id" | "jobNumber" | "createdAt" | "updatedAt">) => Job;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  getJob: (id: string) => Job | undefined;
  duplicateJob: (id: string) => Job | undefined;

  // Quotation CRUD
  addQuotation: (quotation: Omit<Quotation, "id" | "quotationNumber" | "createdAt" | "updatedAt">) => Quotation;
  updateQuotation: (id: string, updates: Partial<Quotation>) => void;
  deleteQuotation: (id: string) => void;
  getQuotation: (id: string) => Quotation | undefined;
  duplicateQuotation: (id: string) => Quotation | undefined;
  addQuotationComment: (quotationId: string, author: string, text: string, type: "internal" | "external") => void;

  // Rate Card CRUD
  addMachine: (machine: Omit<Machine, "id">) => void;
  updateMachine: (id: string, updates: Partial<Machine>) => void;
  addDestination: (dest: Omit<FreightDestination, "id">) => void;
  updateDestination: (id: string, updates: Partial<FreightDestination>) => void;
  addBoardType: (board: Omit<BoardType, "id">) => void;
  addCoveringMaterial: (mat: Omit<CoveringMaterial, "id">) => void;

  // Draft
  saveDraft: (estimation: EstimationInput) => void;
  clearDraft: () => void;

  // Bulk
  exportCustomersCSV: () => string;
  resetAllData: () => void;
}

export const useDataStore = create<DataState>()(
  persist(
    immer((set, get) => ({
      customers: [],
      jobs: [],
      quotations: [],
      machines: DEFAULT_MACHINES as Machine[],
      destinations: DEFAULT_DESTINATIONS as FreightDestination[],
      boardTypes: DEFAULT_BOARD_TYPES as BoardType[],
      coveringMaterials: DEFAULT_COVERING_MATERIALS as CoveringMaterial[],
      draftEstimation: null,

      // ── Customer ──────────────────────────────────────────────────────────
      addCustomer: (customerData) => {
        const now = new Date().toISOString();
        const customer: Customer = {
          ...customerData,
          id: generateId(),
          code: customerData.code || generateCustomerCode(customerData.name),
          createdAt: now,
          updatedAt: now,
          totalOrders: 0,
          totalRevenue: 0,
        };
        set((state) => { state.customers.unshift(customer); });
        return customer;
      },

      updateCustomer: (id, updates) => set((state) => {
        const idx = state.customers.findIndex((c) => c.id === id);
        if (idx >= 0) {
          Object.assign(state.customers[idx], updates, { updatedAt: new Date().toISOString() });
        }
      }),

      deleteCustomer: (id) => set((state) => {
        state.customers = state.customers.filter((c) => c.id !== id);
      }),

      getCustomer: (id) => get().customers.find((c) => c.id === id),

      duplicateCustomer: (id) => {
        const original = get().customers.find((c) => c.id === id);
        if (!original) return undefined;
        const now = new Date().toISOString();
        const clone: Customer = {
          ...JSON.parse(JSON.stringify(original)),
          id: generateId(),
          code: generateCustomerCode(`${original.name} Copy`),
          name: `${original.name} (Copy)`,
          status: "draft",
          createdAt: now,
          updatedAt: now,
          totalOrders: 0,
          totalRevenue: 0,
        };
        set((state) => { state.customers.unshift(clone); });
        return clone;
      },

      // ── Job ───────────────────────────────────────────────────────────────
      addJob: (jobData) => {
        const now = new Date().toISOString();
        const job: Job = {
          ...jobData,
          id: generateId(),
          jobNumber: generateJobNumber(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => { state.jobs.unshift(job); });
        return job;
      },

      updateJob: (id, updates) => set((state) => {
        const idx = state.jobs.findIndex((j) => j.id === id);
        if (idx >= 0) {
          Object.assign(state.jobs[idx], updates, { updatedAt: new Date().toISOString() });
        }
      }),

      deleteJob: (id) => set((state) => {
        state.jobs = state.jobs.filter((j) => j.id !== id);
      }),

      getJob: (id) => get().jobs.find((j) => j.id === id),

      duplicateJob: (id) => {
        const original = get().jobs.find((j) => j.id === id);
        if (!original) return undefined;
        const now = new Date().toISOString();
        const dup: Job = {
          ...JSON.parse(JSON.stringify(original)),
          id: generateId(),
          jobNumber: generateJobNumber(),
          title: `${original.title} (Copy)`,
          status: "draft",
          createdAt: now,
          updatedAt: now,
        };
        set((state) => { state.jobs.unshift(dup); });
        return dup;
      },

      // ── Quotation ─────────────────────────────────────────────────────────
      addQuotation: (qData) => {
        const now = new Date().toISOString();
        const quotation: Quotation = {
          ...qData,
          id: generateId(),
          quotationNumber: generateQuotationNumber(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => { state.quotations.unshift(quotation); });
        return quotation;
      },

      updateQuotation: (id, updates) => set((state) => {
        const idx = state.quotations.findIndex((q) => q.id === id);
        if (idx >= 0) {
          Object.assign(state.quotations[idx], updates, { updatedAt: new Date().toISOString() });
        }
      }),

      deleteQuotation: (id) => set((state) => {
        state.quotations = state.quotations.filter((q) => q.id !== id);
      }),

      getQuotation: (id) => get().quotations.find((q) => q.id === id),

      duplicateQuotation: (id) => {
        const original = get().quotations.find((q) => q.id === id);
        if (!original) return undefined;
        const now = new Date().toISOString();
        const clone: Quotation = {
          ...JSON.parse(JSON.stringify(original)),
          id: generateId(),
          quotationNumber: generateQuotationNumber(),
          status: "draft",
          revisionNumber: original.revisionNumber + 1,
          createdAt: now,
          updatedAt: now,
          comments: []
        };
        set((state) => { state.quotations.unshift(clone); });
        return clone;
      },

      addQuotationComment: (quotationId, author, text, type) => set((state) => {
        const q = state.quotations.find((q) => q.id === quotationId);
        if (q) {
          q.comments.push({
            id: generateId(),
            author,
            text,
            timestamp: new Date().toISOString(),
            type,
          });
        }
      }),

      // ── Rate Card ─────────────────────────────────────────────────────────
      addMachine: (machine) => set((state) => {
        state.machines.push({ ...machine, id: generateId() } as Machine);
      }),

      updateMachine: (id, updates) => set((state) => {
        const idx = state.machines.findIndex((m) => m.id === id);
        if (idx >= 0) Object.assign(state.machines[idx], updates);
      }),

      addDestination: (dest) => set((state) => {
        state.destinations.push({ ...dest, id: generateId() } as FreightDestination);
      }),

      updateDestination: (id, updates) => set((state) => {
        const idx = state.destinations.findIndex((d) => d.id === id);
        if (idx >= 0) Object.assign(state.destinations[idx], updates);
      }),

      addBoardType: (board) => set((state) => {
        state.boardTypes.push({ ...board, id: generateId() } as BoardType);
      }),

      addCoveringMaterial: (mat) => set((state) => {
        state.coveringMaterials.push({ ...mat, id: generateId() } as CoveringMaterial);
      }),

      // ── Draft ─────────────────────────────────────────────────────────────
      saveDraft: (estimation) => set((state) => {
        state.draftEstimation = estimation;
      }),

      clearDraft: () => set((state) => {
        state.draftEstimation = null;
      }),

      // ── Export ────────────────────────────────────────────────────────────
      exportCustomersCSV: () => {
        const customers = get().customers;
        const headers = ["Code", "Name", "Contact Person", "Email", "Phone", "City", "Country", "Priority", "GST Number"];
        const rows = customers.map((c) =>
          [c.code, c.name, c.contactPerson, c.email, c.phone, c.city, c.country, c.priority, c.gstNumber]
            .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
            .join(",")
        );
        return [headers.join(","), ...rows].join("\n");
      },

      // ── Reset ─────────────────────────────────────────────────────────────
      resetAllData: () => set((state) => {
        state.customers = [];
        state.jobs = [];
        state.quotations = [];
        state.draftEstimation = null;
        state.machines = DEFAULT_MACHINES as Machine[];
        state.destinations = DEFAULT_DESTINATIONS as FreightDestination[];
        state.boardTypes = DEFAULT_BOARD_TYPES as BoardType[];
        state.coveringMaterials = DEFAULT_COVERING_MATERIALS as CoveringMaterial[];
      }),
    })),
    {
      name: "print-estimator-data-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);