import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  EstimationInput, BookSpec, TextSection, CoverSection, JacketSection,
  EndleavesSection, BindingSection, FinishingSection, PackingSection,
  DeliverySection, PrePressSection, PricingSection,
  EstimationResult
} from "@/types";
import { generateId } from "@/utils/format";
import { EPSON_PROOF_RATE, WET_PROOF_RATE, PACKING_RATES } from "@/constants";
import type { EstimationRequest, EstimationResult as DomainEstimationResult, CustomerQuotation } from "@/domain/estimation/imposition/types";
import type { QuotationOptions } from "@/domain/estimation/pricing/quotationGenerator";

interface EstimationState {
  estimation: EstimationInput;
  currentStep: number;
  results: EstimationResult[];
  isCalculating: boolean;
  isCalculated: boolean;
  showResults: boolean;

  // NEW: Domain-driven estimation fields
  domainRequest: EstimationRequest | null;
  domainEstimation: DomainEstimationResult | null;
  quotation: CustomerQuotation | null;
  quotationHistory: CustomerQuotation[];
  quotationOptions: QuotationOptions | null;
  estimationProgress: number; // 0-100
  estimationProgressMessage: string;
  estimationError: string | null;

  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Updates - Advanced field-level updates with dot notation support
  updateEstimation: (updates: Partial<EstimationInput>) => void;
  updateEstimationField: <T = unknown>(fieldPath: string, value: T) => void;
  updateTextSectionField: <T = unknown>(index: number, fieldPath: string, value: T) => void;
  updateBookSpec: (updates: Partial<BookSpec>) => void;
  updateTextSection: (index: number, updates: Partial<TextSection>) => void;
  updateCover: (updates: Partial<CoverSection>) => void;
  updateJacket: (updates: Partial<JacketSection>) => void;
  updateEndleaves: (updates: Partial<EndleavesSection>) => void;
  updateBinding: (updates: Partial<BindingSection>) => void;
  updateFinishing: (updates: Partial<FinishingSection>) => void;
  updatePacking: (updates: Partial<PackingSection>) => void;
  updateDelivery: (updates: Partial<DeliverySection>) => void;
  updatePrePress: (updates: Partial<PrePressSection>) => void;
  updatePricing: (updates: Partial<PricingSection>) => void;
  updateQuantity: (index: number, value: number) => void;

  // NEW: Domain estimation setters
  setDomainRequest: (request: EstimationRequest) => void;
  setDomainEstimation: (estimation: DomainEstimationResult) => void;
  setQuotation: (quotation: CustomerQuotation) => void;
  addToQuotationHistory: (quotation: CustomerQuotation) => void;
  setQuotationOptions: (options: QuotationOptions) => void;
  setEstimationProgress: (progress: number, message?: string) => void;
  setEstimationError: (error: string | null) => void;
  clearDomainEstimation: () => void;

  // Results
  setResults: (results: EstimationResult[]) => void;
  setIsCalculating: (val: boolean) => void;
  setShowResults: (val: boolean) => void;

  // State management
  resetEstimation: () => void;
  loadEstimation: (estimation: EstimationInput) => void;
}

export const createDefaultEstimation = (): EstimationInput => ({
  id: generateId(),
  jobTitle: "",
  customerName: "",
  customerId: "",
  referenceNumber: "",
  estimatedBy: "",
  estimationDate: new Date().toISOString().split("T")[0],
  poNumber: "",

  bookSpec: {
    heightMM: 234,
    widthMM: 153,
    orientation: "portrait",
    trimSizePreset: "Royal Octavo (153 × 234mm)",
    customSize: false,
    spineThickness: 0,
    spineWithBoard: 0,
    totalPages: 0,
  },

  quantities: [3000, 5000, 0, 0, 0],

  textSections: [
    {
      id: generateId(),
      enabled: true,
      label: "Text Section 1",
      pages: 256,
      colorsFront: 4,
      colorsBack: 4,
      paperTypeId: "matt",
      paperTypeName: "Matt Art Paper",
      gsm: 130,
      paperSizeId: "ps_23x36",
      paperSizeLabel: "23×36",
      machineId: "rmgt",
      machineName: "RMGT",
      plateChanges: 0,
      printingMethod: "sheetwise",
    },
    {
      id: generateId(),
      enabled: false,
      label: "Text Section 2",
      pages: 0,
      colorsFront: 4,
      colorsBack: 4,
      paperTypeId: "matt",
      paperTypeName: "Matt Art Paper",
      gsm: 150,
      paperSizeId: "ps_23x36",
      paperSizeLabel: "23×36",
      machineId: "rmgt",
      machineName: "RMGT",
      plateChanges: 0,
      printingMethod: "sheetwise",
    },
  ],

  cover: {
    enabled: true,
    pages: 4,
    colorsFront: 4,
    colorsBack: 0,
    paperTypeId: "Art card",
    paperTypeName: "Art Card",
    gsm: 300,
    paperSizeId: "ps_23x36",
    paperSizeLabel: "23×36",
    machineId: "rmgt",
    machineName: "RMGT",
    selfCover: false,
    separateCover: true,
    foldType: "wrap_around",
  },

  jacket: {
    enabled: false,
    colorsFront: 4,
    colorsBack: 0,
    paperTypeId: "matt",
    paperTypeName: "Matt Art Paper",
    gsm: 130,
    paperSizeId: "ps_25x36",
    paperSizeLabel: "25×36",
    machineId: "fav",
    machineName: "Favourit (FAV)",
    laminationType: "gloss",
    extraJacketsPercent: 5,
    goldBlockingFront: false,
    goldBlockingSpine: false,
    spotUV: false,
    flapWidth: 90,
  },

  endleaves: {
    enabled: false,
    pages: 4,
    colorsFront: 0,
    colorsBack: 0,
    paperTypeId: "CW",
    paperTypeName: "Woodfree Paper (CW)",
    gsm: 120,
    paperSizeId: "ps_23x36",
    paperSizeLabel: "23×36",
    machineId: "rmgt",
    machineName: "RMGT",
    type: "plain",
    selfEndleaves: false,
  },

  binding: {
    primaryBinding: "perfect_binding",
    purBinding: false,
    backShape: "square",
    boardType: "bd_imp_3",
    boardThickness: 3,
    boardOrigin: "imported",
    coveringMaterialId: "cm_printed",
    coveringMaterialName: "Printed Paper",
    caseMaterial: "printed_paper",
    ribbonMarker: 0,
    headTailBand: false,
    giltEdging: false,
    foamPadding: false,
    roundCornering: false,
    goldBlockingFront: false,
    goldBlockingSpine: false,
    embossingFront: false,
    roundingBacking: false,
  },

  finishing: {
    coverLamination: { enabled: true, type: "gloss", machineId: "" },
    jacketLamination: { enabled: false, type: "gloss" },
    spotUVCover: { enabled: false, type: "front" },
    spotUVJacket: { enabled: false },
    uvVarnish: { enabled: false, sections: [] },
    aqueousVarnish: { enabled: false, freeOnRekord: false },
    embossing: { enabled: false, type: "single", location: ["front"] },
    goldBlocking: { enabled: false, location: ["front"], foilType: "gold" },
    dieCutting: { enabled: false, complexity: "simple" },
    foilStamping: { enabled: false, foilType: "gold", location: ["front"] },
    edgeGilding: { enabled: false, edges: [] },
    perforation: { enabled: false },
    scoring: { enabled: false },
    numbering: { enabled: false },
    collation: { enabled: false, mode: "standard", ratePerCopy: 0.04, setupCost: 0 },
    holePunch: { enabled: false, holes: 2, ratePerCopy: 0.05, setupCost: 350 },
    trimming: { enabled: false, sides: 3, ratePerCopy: 0.03 },
    envelopePrinting: { enabled: false, envelopeSize: "dl", quantity: 0, colors: 1, ratePerEnvelope: 1.2, setupCost: 500 },
    largeFormat: { enabled: false, productType: "poster", widthMM: 594, heightMM: 841, quantity: 0, ratePerSqM: 140 },
    additionalFinishing: [],
  },

  packing: {
    useCartons: true,
    usePallets: true,
    cartonType: "5_ply",
    cartonRate: PACKING_RATES.carton5Ply,
    customBooksPerCarton: 0,
    palletType: "heat_treated",
    palletRate: PACKING_RATES.palletHeatTreated,
    stretchWrap: true,
    stretchWrapRate: PACKING_RATES.stretchWrap,
    shrinkWrap: false,
    shrinkWrapRate: 350,
    strapping: true,
    strappingRate: PACKING_RATES.strapping,
    cornerProtectors: true,
    cornerProtectorRate: PACKING_RATES.cornerProtectors,
    innerPartition: false,
    customPrinting: false,
    kraftWrapping: false,
    polybagIndividual: false,
    polybagRate: PACKING_RATES.polybag,
    bandingPerPack: 0,
    insertSlipSheet: false,
    containerization: "with_pallets",
    containerType: "20ft",
    maxCartonWeight: PACKING_RATES.maxCartonWeight,
    maxPalletHeight: PACKING_RATES.maxPalletHeight,
    maxPalletWeight: PACKING_RATES.maxPalletWeight,
  },

  delivery: {
    destinationId: "felix",
    destinationName: "Felixstowe",
    deliveryType: "fob",
    freightMode: "sea",
    portOfLoading: "JNPT Mumbai",
    numberOfDespatches: 1,
    localDespatches: 0,
    overseasDespatches: 1,
    advanceCopies: 10,
    advanceCopiesAirFreight: true,
    advanceCopiesRate: 900,
    customsClearance: 8500,
    insurance: true,
    insuranceRate: 0.3,
  },

  prePress: {
    epsonProofs: 0,
    epsonRatePerPage: EPSON_PROOF_RATE,
    wetProofs: 0,
    wetProofRatePerForm: WET_PROOF_RATE,
    filmOutput: false,
    filmRatePerPlate: 180,
    designCharges: 0,
    originationType: "from_pdf",
  },

  pricing: {
    marginPercent: 25,
    commissionPercent: 0,
    targetTPH: 4000,
    currency: "GBP",
    exchangeRate: 118,
    volumeDiscount: 0,
    paymentTerms: "L/C at Sight",
    paymentDays: 30,
    quotationValidity: 15,
    taxType: "none",
    taxRate: 0,
    includesTax: false,
  },

  additionalCosts: [],
  notes: "",
  internalNotes: "",
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useEstimationStore = create<EstimationState>()(
  persist(
    immer((set) => ({
      estimation: createDefaultEstimation(),
      currentStep: 1,
      results: [],
      isCalculating: false,
      isCalculated: false,
      showResults: false,

      // NEW: Domain estimation state initialization
      domainRequest: null,
      domainEstimation: null,
      quotation: null,
      quotationHistory: [],
      quotationOptions: null,
      estimationProgress: 0,
      estimationProgressMessage: "",
      estimationError: null,

      // Navigation
      setCurrentStep: (step) => set((state) => { state.currentStep = step; }),
      nextStep: () => set((state) => { if (state.currentStep < 15) state.currentStep++; }),
      prevStep: () => set((state) => { if (state.currentStep > 1) state.currentStep--; }),

      // Updates - clean without auto-planning
      updateEstimation: (updates) => set((state) => { 
        Object.assign(state.estimation, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      // Advanced field-level update with dot notation support (e.g., "bookSpec.heightMM" or "pricing.marginPercent")
      updateEstimationField: (fieldPath, value) => set((state) => {
        const keys = fieldPath.split('.');
        let target: Record<string, unknown> = state.estimation;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (target && typeof target === 'object') {
            target = target[keys[i]] as Record<string, unknown>;
          }
        }
        
        if (target && typeof target === 'object') {
          const lastKey = keys[keys.length - 1];
          (target as Record<string, unknown>)[lastKey] = value;
          state.estimation.updatedAt = new Date().toISOString();
        }
      }),

      // Update a specific field in a text section
      updateTextSectionField: (index, fieldPath, value) => set((state) => {
        if (state.estimation.textSections[index]) {
          const keys = fieldPath.split('.');
          let target: Record<string, unknown> = state.estimation.textSections[index];
          
          for (let i = 0; i < keys.length - 1; i++) {
            if (target && typeof target === 'object') {
              target = target[keys[i]] as Record<string, unknown>;
            }
          }
          
          if (target && typeof target === 'object') {
            const lastKey = keys[keys.length - 1];
            (target as Record<string, unknown>)[lastKey] = value;
            state.estimation.updatedAt = new Date().toISOString();
          }
        }
      }),

      updateBookSpec: (updates) => set((state) => {
        Object.assign(state.estimation.bookSpec, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updateTextSection: (index, updates) => set((state) => {
        if (state.estimation.textSections[index]) {
          Object.assign(state.estimation.textSections[index], updates);
          state.estimation.updatedAt = new Date().toISOString();
        }
      }),

      updateCover: (updates) => set((state) => { 
        Object.assign(state.estimation.cover, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updateJacket: (updates) => set((state) => { 
        Object.assign(state.estimation.jacket, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updateEndleaves: (updates) => set((state) => { 
        Object.assign(state.estimation.endleaves, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updateBinding: (updates) => set((state) => { 
        Object.assign(state.estimation.binding, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updateFinishing: (updates) => set((state) => {
        const f = state.estimation.finishing;
        for (const [key, value] of Object.entries(updates)) {
          if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            (f as any)[key] = { ...(f as any)[key], ...value };
          } else {
            (f as any)[key] = value;
          }
        }
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updatePacking: (updates) => set((state) => { 
        Object.assign(state.estimation.packing, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updateDelivery: (updates) => set((state) => { 
        Object.assign(state.estimation.delivery, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updatePrePress: (updates) => set((state) => { 
        Object.assign(state.estimation.prePress, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updatePricing: (updates) => set((state) => { 
        Object.assign(state.estimation.pricing, updates);
        state.estimation.updatedAt = new Date().toISOString();
      }),

      updateQuantity: (index, value) => set((state) => {
        state.estimation.quantities[index] = value;
        state.estimation.updatedAt = new Date().toISOString();
      }),

      // NEW: Domain estimation setters
      setDomainRequest: (request) => set((state) => {
        state.domainRequest = request;
        state.estimationProgress = 0;
        state.estimationError = null;
      }),

      setDomainEstimation: (estimation) => set((state) => {
        state.domainEstimation = estimation;
        state.estimationProgress = 100;
        state.estimationError = null;
      }),

      setQuotation: (quotation) => set((state) => {
        state.quotation = quotation;
      }),

      addToQuotationHistory: (quotation) => set((state) => {
        state.quotationHistory = [quotation, ...state.quotationHistory];
      }),

      setQuotationOptions: (options) => set((state) => {
        state.quotationOptions = options;
      }),

      setEstimationProgress: (progress, message) => set((state) => {
        state.estimationProgress = Math.min(100, Math.max(0, progress));
        if (message) {
          state.estimationProgressMessage = message;
        }
      }),

      setEstimationError: (error) => set((state) => {
        state.estimationError = error;
      }),

      clearDomainEstimation: () => set((state) => {
        state.domainRequest = null;
        state.domainEstimation = null;
        state.quotation = null;
        state.quotationHistory = [];
        state.quotationOptions = null;
        state.estimationProgress = 0;
        state.estimationProgressMessage = "";
        state.estimationError = null;
      }),

      // Results
      setResults: (results) => set((state) => {
        state.results = results;
        state.isCalculated = true;
      }),

      setIsCalculating: (val) => set((state) => { state.isCalculating = val; }),
      setShowResults: (val) => set((state) => { state.showResults = val; }),

      // State management
      resetEstimation: () => set((state) => {
        state.estimation = createDefaultEstimation();
        state.currentStep = 1;
        state.results = [];
        state.isCalculating = false;
        state.isCalculated = false;
        state.showResults = false;
      }),

      loadEstimation: (estimation) => set((state) => {
        state.estimation = estimation;
        state.currentStep = 1;
        state.results = [];
        state.isCalculated = false;
        state.showResults = false;
      }),
    })),
    {
      name: "print-estimator-estimation-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        estimation: state.estimation,
        currentStep: state.currentStep,
        results: state.results,
        isCalculated: state.isCalculated,
        showResults: state.showResults,
        // NEW: Persist domain estimation state
        domainRequest: state.domainRequest,
        domainEstimation: state.domainEstimation,
        quotation: state.quotation,
        quotationHistory: state.quotationHistory,
        quotationOptions: state.quotationOptions,
      }),
    }
  )
);

