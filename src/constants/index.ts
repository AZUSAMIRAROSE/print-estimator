// ============================================================================
// PRINT ESTIMATOR PRO — ALL CONSTANTS & INDUSTRY DATA
// ============================================================================

import type { WizardStep, WastageEntry, ImpressionRate, BindingRate, HardcaseBindingDetail, PaperSize, CurrencyRate } from "@/types";

// ── Trim Size Presets ────────────────────────────────────────────────────────
export const TRIM_SIZE_PRESETS = [
  { label: "A4 (210 × 297mm)", width: 210, height: 297, category: "ISO" },
  { label: "A5 (148 × 210mm)", width: 148, height: 210, category: "ISO" },
  { label: "A6 (105 × 148mm)", width: 105, height: 148, category: "ISO" },
  { label: "B5 (176 × 250mm)", width: 176, height: 250, category: "ISO" },
  { label: "B6 (125 × 176mm)", width: 125, height: 176, category: "ISO" },
  { label: "Crown Quarto (189 × 246mm)", width: 189, height: 246, category: "British" },
  { label: "Demy Quarto (219 × 276mm)", width: 219, height: 276, category: "British" },
  { label: "Royal Quarto (234 × 312mm)", width: 234, height: 312, category: "British" },
  { label: "Crown Octavo (123 × 186mm)", width: 123, height: 186, category: "British" },
  { label: "Demy Octavo (138 × 216mm)", width: 138, height: 216, category: "British" },
  { label: "Royal Octavo (153 × 234mm)", width: 153, height: 234, category: "British" },
  { label: 'US Trade (6" × 9")', width: 152, height: 229, category: "US" },
  { label: 'US Letter (8.5" × 11")', width: 216, height: 279, category: "US" },
  { label: 'Pocket (4.25" × 6.875")', width: 108, height: 175, category: "US" },
  { label: 'Digest (5.5" × 8.5")', width: 140, height: 216, category: "US" },
  { label: 'US Comic (6.625" × 10.25")', width: 168, height: 260, category: "US" },
  { label: "Square Small (200 × 200mm)", width: 200, height: 200, category: "Square" },
  { label: "Square Medium (210 × 210mm)", width: 210, height: 210, category: "Square" },
  { label: "Square Large (250 × 250mm)", width: 250, height: 250, category: "Square" },
  { label: "Square XL (300 × 300mm)", width: 300, height: 300, category: "Square" },
  { label: "Coffee Table (240 × 300mm)", width: 240, height: 300, category: "Special" },
  { label: "Children's Book (250 × 250mm)", width: 250, height: 250, category: "Special" },
  { label: "Art Book (280 × 350mm)", width: 280, height: 350, category: "Special" },
  { label: "Landscape A4 (297 × 210mm)", width: 297, height: 210, category: "Landscape" },
  { label: "Landscape Wide (305 × 215mm)", width: 305, height: 215, category: "Landscape" },
  { label: "240 × 195mm", width: 240, height: 195, category: "Custom" },
] as const;

// ── Available Paper Sizes (Stock sheets) ─────────────────────────────────────
export const STANDARD_PAPER_SIZES: PaperSize[] = [
  { id: "ps_23x36", widthInch: 23, heightInch: 36, label: "23×36", widthMM: 585, heightMM: 915 },
  { id: "ps_25x36", widthInch: 25, heightInch: 36, label: "25×36", widthMM: 635, heightMM: 915 },
  { id: "ps_28x40", widthInch: 28, heightInch: 40, label: "28×40", widthMM: 711, heightMM: 1016 },
  { id: "ps_20x30", widthInch: 20, heightInch: 30, label: "20×30", widthMM: 508, heightMM: 762 },
  { id: "ps_22x28", widthInch: 22, heightInch: 28, label: "22×28", widthMM: 559, heightMM: 711 },
  { id: "ps_18x23", widthInch: 18, heightInch: 23, label: "18×23", widthMM: 457, heightMM: 585 },
  { id: "ps_22x35", widthInch: 22, heightInch: 35, label: "22×35", widthMM: 559, heightMM: 889 },
  { id: "ps_24x36", widthInch: 24, heightInch: 36, label: "24×36", widthMM: 610, heightMM: 915 },
  { id: "ps_30x39", widthInch: 30, heightInch: 39, label: "30×39", widthMM: 762, heightMM: 991 },
  { id: "ps_28x38", widthInch: 28, heightInch: 38, label: "28×38", widthMM: 711, heightMM: 965 },
];

// ── Bulk Factor Table ────────────────────────────────────────────────────────
export const BULK_FACTORS: Record<string, number> = {
  matt: 1.0,
  "Matt Art Paper": 1.0,
  "MATT": 1.0,
  gloss: 0.9,
  "Glossy Art Paper": 0.9,
  CW: 1.4,
  "Woodfree Paper (CW)": 1.4,
  HB: 2.3,
  "Holmen Bulky": 2.3,
  Hcream: 2.3,
  "Holmen Creamy": 2.3,
  map: 1.3,
  "White Uncoated": 1.3,
  SP: 1.3,
  "Woodfree white offset paper": 1.3,
  ML70: 2.0,
  "Woodfree Paper (Hibulk)": 2.0,
  "Art Card": 1.2,
  "Art card": 1.2,
  C1s: 1.6,
  "C1S Art Card": 1.6,
  Scream: 2.4,
  "Stora creamy": 2.4,
  Wib: 1.25,
  "Wibalin": 1.25,
  "Munken Pure": 1.6,
  "Munken Lynx": 2.0,
  "Bible Paper": 0.7,
};

// ── Wastage Chart ────────────────────────────────────────────────────────────
export const WASTAGE_CHART: WastageEntry[] = [
  { id: "w1", minQuantity: 0, maxQuantity: 1000, fourColorWaste: 200, twoColorWaste: 150, oneColorWaste: 100, isPercentage: false },
  { id: "w2", minQuantity: 1001, maxQuantity: 2000, fourColorWaste: 250, twoColorWaste: 200, oneColorWaste: 150, isPercentage: false },
  { id: "w3", minQuantity: 2001, maxQuantity: 3000, fourColorWaste: 300, twoColorWaste: 250, oneColorWaste: 200, isPercentage: false },
  { id: "w4", minQuantity: 3001, maxQuantity: 5000, fourColorWaste: 350, twoColorWaste: 300, oneColorWaste: 250, isPercentage: false },
  { id: "w5", minQuantity: 5001, maxQuantity: 8000, fourColorWaste: 400, twoColorWaste: 350, oneColorWaste: 300, isPercentage: false },
  { id: "w6", minQuantity: 8001, maxQuantity: 10000, fourColorWaste: 500, twoColorWaste: 400, oneColorWaste: 350, isPercentage: false },
  { id: "w7", minQuantity: 10001, maxQuantity: 15000, fourColorWaste: 600, twoColorWaste: 500, oneColorWaste: 400, isPercentage: false },
  { id: "w8", minQuantity: 15001, maxQuantity: 20000, fourColorWaste: 750, twoColorWaste: 600, oneColorWaste: 500, isPercentage: false },
  { id: "w9", minQuantity: 20001, maxQuantity: 30000, fourColorWaste: 1000, twoColorWaste: 750, oneColorWaste: 600, isPercentage: false },
  { id: "w10", minQuantity: 30001, maxQuantity: 50000, fourColorWaste: 1250, twoColorWaste: 1000, oneColorWaste: 750, isPercentage: false },
  { id: "w11", minQuantity: 50001, maxQuantity: 999999999, fourColorWaste: 2.5, twoColorWaste: 2.0, oneColorWaste: 1.5, isPercentage: true },
];

// ── Impression Rates ─────────────────────────────────────────────────────────
export const IMPRESSION_RATES_DATA: { range: [number, number]; fav: number; rekordAQ: number; rekordNoAQ: number; rmgt: number; rmgtPerfecto: number }[] = [
  { range: [0, 500], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [501, 1000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [1001, 2000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [2001, 3000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [3001, 4000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [4001, 5000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [5001, 6000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [6001, 8000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [8001, 10000], fav: 229, rekordAQ: 199, rekordNoAQ: 199, rmgt: 199, rmgtPerfecto: 169 },
  { range: [10001, 15000], fav: 187, rekordAQ: 163, rekordNoAQ: 163, rmgt: 163, rmgtPerfecto: 109 },
  { range: [15001, 20000], fav: 187, rekordAQ: 163, rekordNoAQ: 163, rmgt: 163, rmgtPerfecto: 109 },
  { range: [20001, 50000], fav: 187, rekordAQ: 163, rekordNoAQ: 163, rmgt: 163, rmgtPerfecto: 109 },
  { range: [50001, 999999999], fav: 169, rekordAQ: 151, rekordNoAQ: 151, rmgt: 151, rmgtPerfecto: 97 },
];

// Corrected rates from PDF (per 1000 impressions for FOUR COLOR / THREE COLOR on different sheet sizes)
export const IMPRESSION_RATES_BY_SIZE: {
  range: [number, number];
  rates: Record<string, Record<string, number>>;
}[] = [
  {
    range: [0, 1000],
    rates: {
      "28x38": { fourColor: 229, twoColor: 91 },
      "23x36": { fourColor: 199, twoColor: 79 },
      "22x28": { fourColor: 199, twoColor: 79 },
      "20x30": { fourColor: 199, twoColor: 79 },
      "18x23": { fourColor: 169, twoColor: 67 },
    },
  },
  // ... more entries follow the same pattern from the PDF
];

// ── Machine Defaults ─────────────────────────────────────────────────────────
export const DEFAULT_MACHINES = [
  {
    id: "fav",
    code: "FAV",
    name: "Favourit (FAV)",
    type: "offset" as const,
    maxSheetWidth: 28,
    maxSheetHeight: 40,
    minSheetWidth: 14,
    minSheetHeight: 20,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: false,
    speedSPH: 8000,
    makeReadyCost: 1500,
    makeReadyTime: 0.5,
    washingCost: 300,
    plateSize: "28x40",
    gripperMargin: 12,
    tailMargin: 8,
    sideMargin: 5,
    ctpRate: 247,
    hourlyRate: 3500,
    isActive: true,
    description: "Heidelberg Speedmaster - Large format 4-color press",
  },
  {
    id: "rekord_aq",
    code: "REK_AQ",
    name: "Rekord (With AQ)",
    type: "offset" as const,
    maxSheetWidth: 28,
    maxSheetHeight: 40,
    minSheetWidth: 14,
    minSheetHeight: 20,
    maxColors: 4,
    hasAQUnit: true,
    hasPerfector: false,
    speedSPH: 5500,
    makeReadyCost: 1800,
    makeReadyTime: 0.5,
    washingCost: 300,
    plateSize: "28x40",
    gripperMargin: 12,
    tailMargin: 8,
    sideMargin: 5,
    ctpRate: 403,
    hourlyRate: 5500,
    isActive: true,
    description: "MAN Roland with Aqueous Coating unit",
  },
  {
    id: "rekord_no_aq",
    code: "REK",
    name: "Rekord (Without AQ)",
    type: "offset" as const,
    maxSheetWidth: 28,
    maxSheetHeight: 40,
    minSheetWidth: 14,
    minSheetHeight: 20,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: false,
    speedSPH: 5500,
    makeReadyCost: 1800,
    makeReadyTime: 0.5,
    washingCost: 300,
    plateSize: "28x40",
    gripperMargin: 12,
    tailMargin: 8,
    sideMargin: 5,
    ctpRate: 403,
    hourlyRate: 5500,
    isActive: true,
    description: "MAN Roland without Aqueous Coating",
  },
  {
    id: "rmgt",
    code: "RMGT",
    name: "RMGT",
    type: "offset" as const,
    maxSheetWidth: 23,
    maxSheetHeight: 36,
    minSheetWidth: 12,
    minSheetHeight: 18,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: false,
    speedSPH: 8000,
    makeReadyCost: 1200,
    makeReadyTime: 0.3,
    washingCost: 200,
    plateSize: "23x36",
    gripperMargin: 12,
    tailMargin: 8,
    sideMargin: 5,
    ctpRate: 271,
    hourlyRate: 3200,
    isActive: true,
    description: "RMGT 920 - Medium format press",
  },
  {
    id: "rmgt_perfecto",
    code: "RMGT_P",
    name: "RMGT Perfecto",
    type: "offset" as const,
    maxSheetWidth: 23,
    maxSheetHeight: 36,
    minSheetWidth: 12,
    minSheetHeight: 18,
    maxColors: 4,
    hasAQUnit: false,
    hasPerfector: true,
    speedSPH: 8000,
    makeReadyCost: 1200,
    makeReadyTime: 0.3,
    washingCost: 200,
    plateSize: "23x36",
    gripperMargin: 12,
    tailMargin: 8,
    sideMargin: 5,
    ctpRate: 271,
    hourlyRate: 4000,
    isActive: true,
    description: "RMGT Perfector - prints both sides simultaneously",
  },
];

// ── CTP Plate Rates ──────────────────────────────────────────────────────────
export const CTP_RATES: Record<string, number> = {
  FAV: 247,
  "REK_AQ": 403,
  "REK": 403,
  RMGT: 271,
  "RMGT_P": 271,
  "b35": 271,
  "b45": 271,
  "rmgt35": 271,
  "rmgt45": 271,
};

// ── Make Ready Rates ─────────────────────────────────────────────────────────
export const MAKE_READY_RATES: Record<string, number> = {
  FAV: 1500,
  "REK_AQ": 1800,
  "REK": 1800,
  RMGT: 1200,
  "RMGT_P": 1200,
};

// ── Hardcase Binding Defaults ────────────────────────────────────────────────
export const HARDCASE_DEFAULTS: HardcaseBindingDetail = {
  sewingRatePerSection: 0.11,
  tippingEndleaves: 0.15,
  foldingRatePerForm: 0.04,
  backLining: 0.35,
  casingIn: 3.75,
  pressing: 0.25,
  glueCost: 2.10,
  htBandRate: 0.18,
  htBandSpool: 250,
  ribbonRate: 0.32,
  headTailTrimming: 0.08,
  qualityInspection: 0.15,
  caseLamination: 0.55,
  goldBlockingFront: 0.30,
  goldBlockingSpine: 0.25,
  goldBlockingDie: 3500,
  embossingFront: 0.45,
  embossingDie: 2500,
  roundingBacking: 0.30,
  giltEdging: 2.50,
  foamPadding: 8.84,
  roundCornering: 0.12,
};

// ── Perfect Binding Rates ────────────────────────────────────────────────────
export const PERFECT_BINDING_RATES = [
  { minQty: 0, maxQty: 3000, ratePer16pp: 0.30, gatheringRate: 0.04 },
  { minQty: 3001, maxQty: 5000, ratePer16pp: 0.25, gatheringRate: 0.03 },
  { minQty: 5001, maxQty: 8000, ratePer16pp: 0.22, gatheringRate: 0.025 },
  { minQty: 8001, maxQty: 10000, ratePer16pp: 0.20, gatheringRate: 0.02 },
  { minQty: 10001, maxQty: 15000, ratePer16pp: 0.18, gatheringRate: 0.018 },
  { minQty: 15001, maxQty: 20000, ratePer16pp: 0.16, gatheringRate: 0.015 },
  { minQty: 20001, maxQty: 999999, ratePer16pp: 0.14, gatheringRate: 0.012 },
];

// ── Saddle Stitching Rates ───────────────────────────────────────────────────
export const SADDLE_STITCHING_RATES = [
  { minQty: 0, maxQty: 5000, ratePerCopy: 0.40 },
  { minQty: 5001, maxQty: 10000, ratePerCopy: 0.30 },
  { minQty: 10001, maxQty: 20000, ratePerCopy: 0.25 },
  { minQty: 20001, maxQty: 999999, ratePerCopy: 0.20 },
];

// ── Lamination Rates ─────────────────────────────────────────────────────────
export const LAMINATION_RATES = {
  gloss: { ratePerCopy: 0.78, minOrder: 3500 },
  matt: { ratePerCopy: 0.78, minOrder: 3500 },
  velvet: { ratePerCopy: 1.20, minOrder: 5000 },
  anti_scratch: { ratePerCopy: 1.40, minOrder: 5000 },
};

// ── Spot UV Rates ────────────────────────────────────────────────────────────
export const SPOT_UV_RATES = [
  { minQty: 0, maxQty: 2000, ratePerCopy: 1.50, blockCost: 2500 },
  { minQty: 2001, maxQty: 5000, ratePerCopy: 1.28, blockCost: 2500 },
  { minQty: 5001, maxQty: 10000, ratePerCopy: 1.00, blockCost: 2500 },
  { minQty: 10001, maxQty: 999999, ratePerCopy: 0.80, blockCost: 2500 },
];

// ── UV Varnish Rates ─────────────────────────────────────────────────────────
export const UV_VARNISH_RATES = {
  coverOnly: 0.65,
  textBothSides: 0.45,
  machineCharge: 2000,
};

// ── Aqueous Varnish ──────────────────────────────────────────────────────────
export const AQUEOUS_VARNISH_RATE = 0.35; // per copy if not on Rekord with AQ

// ── Gold Blocking Rates ──────────────────────────────────────────────────────
export const GOLD_BLOCKING_RATES = {
  dieCost: 3500,
  frontRate: 0.30,
  spineRate: 0.25,
  foilPerSqInch: 0.15,
};

// ── Embossing Rates ──────────────────────────────────────────────────────────
export const EMBOSSING_RATES = {
  dieCost: 2500,
  singleLevel: 0.45,
  multiLevel: 0.65,
};

// ── Die Cutting ──────────────────────────────────────────────────────────────
export const DIE_CUTTING_RATES = {
  simple: { dieCost: 4000, ratePerCopy: 0.20 },
  medium: { dieCost: 8000, ratePerCopy: 0.30 },
  complex: { dieCost: 15000, ratePerCopy: 0.45 },
};

// ── Packing Rates ────────────────────────────────────────────────────────────
export const PACKING_RATES = {
  carton3Ply: 45,
  carton5Ply: 65,
  customPrintSurcharge: 15,
  innerPartition: 8,
  palletStandard: 1350,
  palletHeatTreated: 1600,
  palletEuro: 1500,
  stretchWrap: 250,
  strapping: 80,
  cornerProtectors: 60,
  polybag: 1.50,
  kraftWrap: 3.00,
  standardCartonDimensions: { length: 595, width: 420, height: 320 }, // mm
  maxCartonWeight: 14, // kg
  maxPalletHeight: 1500, // mm including pallet
  maxPalletWeight: 800, // kg
  palletDimensions: { length: 1200, width: 1000, height: 150 }, // mm
};

// ── Freight Destinations ─────────────────────────────────────────────────────
export const DEFAULT_DESTINATIONS = [
  { id: "bom", code: "BOM", name: "Bombay (Mumbai)", country: "India", isOverseas: false, seaFreightPerContainer20: 0, seaFreightPerContainer40: 0, seaFreightPerPallet: 0, surfacePerContainer: 0, surfacePerPallet: 0, surfacePerTruck: 14500, surfacePerTon: 3000, airFreightPerKg: 0, clearanceCharges: 0, chaCharges: 0, portHandling: 0, documentation: 0, blCharges: 0, insurancePercent: 0, isActive: true },
  { id: "nd", code: "ND", name: "New Delhi", country: "India", isOverseas: false, seaFreightPerContainer20: 0, seaFreightPerContainer40: 0, seaFreightPerPallet: 0, surfacePerContainer: 0, surfacePerPallet: 0, surfacePerTruck: 6000, surfacePerTon: 400, airFreightPerKg: 0, clearanceCharges: 0, chaCharges: 0, portHandling: 0, documentation: 0, blCharges: 0, insurancePercent: 0, isActive: true },
  { id: "felix", code: "FELIX", name: "Felixstowe", country: "United Kingdom", isOverseas: true, seaFreightPerContainer20: 1100, seaFreightPerContainer40: 0, seaFreightPerPallet: 80, surfacePerContainer: 19500, surfacePerPallet: 1500, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 700, clearanceCharges: 8500, chaCharges: 3500, portHandling: 3000, documentation: 1500, blCharges: 2500, insurancePercent: 0.3, isActive: true },
  { id: "ham", code: "HAM", name: "Hamburg", country: "Germany", isOverseas: true, seaFreightPerContainer20: 1100, seaFreightPerContainer40: 0, seaFreightPerPallet: 80, surfacePerContainer: 19500, surfacePerPallet: 1500, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 700, clearanceCharges: 8500, chaCharges: 3500, portHandling: 3000, documentation: 1500, blCharges: 2500, insurancePercent: 0.3, isActive: true },
  { id: "ny", code: "NY", name: "New York", country: "United States", isOverseas: true, seaFreightPerContainer20: 2350, seaFreightPerContainer40: 0, seaFreightPerPallet: 200, surfacePerContainer: 19500, surfacePerPallet: 1500, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 600, clearanceCharges: 8500, chaCharges: 3500, portHandling: 3000, documentation: 1500, blCharges: 2500, insurancePercent: 0.3, isActive: true },
  { id: "rot", code: "ROT", name: "Rotterdam", country: "Netherlands", isOverseas: true, seaFreightPerContainer20: 1100, seaFreightPerContainer40: 0, seaFreightPerPallet: 80, surfacePerContainer: 19500, surfacePerPallet: 1500, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 700, clearanceCharges: 8500, chaCharges: 3500, portHandling: 3000, documentation: 1500, blCharges: 2500, insurancePercent: 0.3, isActive: true },
  { id: "mel", code: "MEL", name: "Melbourne", country: "Australia", isOverseas: true, seaFreightPerContainer20: 1700, seaFreightPerContainer40: 0, seaFreightPerPallet: 150, surfacePerContainer: 19500, surfacePerPallet: 1500, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 900, clearanceCharges: 8500, chaCharges: 3500, portHandling: 3000, documentation: 1500, blCharges: 2500, insurancePercent: 0.3, isActive: true },
  { id: "sing", code: "SING", name: "Singapore", country: "Singapore", isOverseas: true, seaFreightPerContainer20: 1200, seaFreightPerContainer40: 0, seaFreightPerPallet: 80, surfacePerContainer: 19500, surfacePerPallet: 1500, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 750, clearanceCharges: 8500, chaCharges: 3500, portHandling: 3000, documentation: 1500, blCharges: 2500, insurancePercent: 0.3, isActive: true },
  { id: "tor", code: "TOR", name: "Toronto", country: "Canada", isOverseas: true, seaFreightPerContainer20: 2400, seaFreightPerContainer40: 0, seaFreightPerPallet: 200, surfacePerContainer: 19500, surfacePerPallet: 1500, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 900, clearanceCharges: 8500, chaCharges: 3500, portHandling: 3000, documentation: 1500, blCharges: 2500, insurancePercent: 0.3, isActive: true },
  { id: "ex", code: "EX", name: "Ex Works", country: "India", isOverseas: false, seaFreightPerContainer20: 0, seaFreightPerContainer40: 0, seaFreightPerPallet: 0, surfacePerContainer: 0, surfacePerPallet: 0, surfacePerTruck: 0, surfacePerTon: 0, airFreightPerKg: 0, clearanceCharges: 0, chaCharges: 0, portHandling: 0, documentation: 0, blCharges: 0, insurancePercent: 0, isActive: true },
];

// ── Currency Defaults ────────────────────────────────────────────────────────
export const DEFAULT_CURRENCIES: CurrencyRate[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹", exchangeRate: 1, updatedAt: new Date().toISOString() },
  { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 90, updatedAt: new Date().toISOString() },
  { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 118, updatedAt: new Date().toISOString() },
  { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 104, updatedAt: new Date().toISOString() },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", exchangeRate: 60, updatedAt: new Date().toISOString() },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", exchangeRate: 67, updatedAt: new Date().toISOString() },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", exchangeRate: 67, updatedAt: new Date().toISOString() },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", exchangeRate: 24.5, updatedAt: new Date().toISOString() },
  { code: "ZAR", name: "South African Rand", symbol: "R", exchangeRate: 5, updatedAt: new Date().toISOString() },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", exchangeRate: 16, updatedAt: new Date().toISOString() },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", exchangeRate: 11.5, updatedAt: new Date().toISOString() },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", exchangeRate: 0.60, updatedAt: new Date().toISOString() },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", exchangeRate: 12.5, updatedAt: new Date().toISOString() },
];

// ── Bible Paper Surcharge ────────────────────────────────────────────────────
export const BIBLE_PAPER_SURCHARGES = [
  { minGSM: 0, maxGSM: 30, surchargePercent: 30 },
  { minGSM: 31, maxGSM: 35, surchargePercent: 12 },
  { minGSM: 36, maxGSM: 40, surchargePercent: 8 },
  { minGSM: 41, maxGSM: 45, surchargePercent: 5 },
  { minGSM: 46, maxGSM: 50, surchargePercent: 3 },
];

// ── Tax Rates ────────────────────────────────────────────────────────────────
export const TAX_RATES = {
  gst_print: 12,
  gst_book: 5,
  igst_print: 12,
  igst_book: 5,
  vat_uk: 20,
  vat_eu: 21,
  none: 0,
};

// ── Epson Proof Rate ─────────────────────────────────────────────────────────
export const EPSON_PROOF_RATE = 116; // per page

// ── Wet Proof Rate ───────────────────────────────────────────────────────────
export const WET_PROOF_RATE = 2500; // per form

// ── Default Paper Rates (per ream of 500 sheets) ─────────────────────────────
export const DEFAULT_PAPER_RATES = [
  { paperType: "Matt Art Paper", code: "matt", gsm: 80, size: "23x36", landedCost: 2000, chargeRate: 2500, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 100, size: "23x36", landedCost: 2500, chargeRate: 3125, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 130, size: "23x36", landedCost: 3230, chargeRate: 3467, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 150, size: "23x36", landedCost: 3725, chargeRate: 4000, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 150, size: "25x36", landedCost: 4051, chargeRate: 4348, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 150, size: "28x40", landedCost: 5067, chargeRate: 5438, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 170, size: "23x36", landedCost: 4222, chargeRate: 4533, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 200, size: "23x36", landedCost: 5000, chargeRate: 5500, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 250, size: "23x36", landedCost: 6250, chargeRate: 6800, ratePerKg: 80 },
  { paperType: "Matt Art Paper", code: "matt", gsm: 300, size: "23x36", landedCost: 7500, chargeRate: 8200, ratePerKg: 80 },
  { paperType: "Glossy Art Paper", code: "gloss", gsm: 130, size: "23x36", landedCost: 3100, chargeRate: 3400, ratePerKg: 82 },
  { paperType: "Glossy Art Paper", code: "gloss", gsm: 150, size: "23x36", landedCost: 3600, chargeRate: 3900, ratePerKg: 82 },
  { paperType: "Glossy Art Paper", code: "gloss", gsm: 200, size: "23x36", landedCost: 4800, chargeRate: 5200, ratePerKg: 82 },
  { paperType: "Woodfree Paper (CW)", code: "CW", gsm: 80, size: "23x36", landedCost: 2000, chargeRate: 2500, ratePerKg: 76.5 },
  { paperType: "Woodfree Paper (CW)", code: "CW", gsm: 100, size: "23x36", landedCost: 2500, chargeRate: 3125, ratePerKg: 76.5 },
  { paperType: "Holmen Bulky", code: "HB", gsm: 60, size: "25x36", landedCost: 2500, chargeRate: 2800, ratePerKg: 73 },
  { paperType: "Holmen Bulky", code: "HB", gsm: 70, size: "25x36", landedCost: 2700, chargeRate: 2920, ratePerKg: 73 },
  { paperType: "Holmen Bulky", code: "HB", gsm: 80, size: "25x36", landedCost: 2888, chargeRate: 2920, ratePerKg: 73 },
  { paperType: "White Uncoated", code: "map", gsm: 90, size: "25x36", landedCost: 2800, chargeRate: 3000, ratePerKg: 82 },
  { paperType: "White Uncoated", code: "map", gsm: 100, size: "25x36", landedCost: 3100, chargeRate: 3333, ratePerKg: 82 },
  { paperType: "White Uncoated", code: "map", gsm: 120, size: "25x36", landedCost: 3700, chargeRate: 4000, ratePerKg: 82 },
  { paperType: "White Uncoated", code: "map", gsm: 140, size: "25x36", landedCost: 4300, chargeRate: 4667, ratePerKg: 82 },
  { paperType: "Art Card", code: "Art card", gsm: 300, size: "23x36", landedCost: 10880, chargeRate: 9600, ratePerKg: 96 },
  { paperType: "C1S Art Card", code: "C1s", gsm: 300, size: "23x36", landedCost: 14700, chargeRate: 15600, ratePerKg: 98 },
  { paperType: "C1S Art Card", code: "C1s", gsm: 350, size: "23x36", landedCost: 17150, chargeRate: 18200, ratePerKg: 98 },
  { paperType: "Woodfree Paper (Hibulk)", code: "ML70", gsm: 70, size: "23x36", landedCost: 2100, chargeRate: 2500, ratePerKg: 88 },
  { paperType: "Stora creamy", code: "Scream", gsm: 80, size: "23x36", landedCost: 3100, chargeRate: 3400, ratePerKg: 84 },
  { paperType: "Woodfree white offset paper", code: "SP", gsm: 70, size: "23x36", landedCost: 2350, chargeRate: 2700, ratePerKg: 91 },
  { paperType: "Woodfree white offset paper", code: "SP", gsm: 80, size: "23x36", landedCost: 2680, chargeRate: 3000, ratePerKg: 91 },
];

// ── Covering Material Defaults ───────────────────────────────────────────────
export const DEFAULT_COVERING_MATERIALS = [
  { id: "cm_printed", name: "Printed Paper", code: "PP", rollWidth: 0, rollLength: 0, ratePerSqMeter: 0, ratePerMeter: 0, costPerRoll: 0, supplier: "Self", isActive: true },
  { id: "cm_arlin", name: "Arlin", code: "ARL", rollWidth: 1000, rollLength: 100000, ratePerSqMeter: 20.0, ratePerMeter: 20.0, costPerRoll: 2000, supplier: "Import", isActive: true },
  { id: "cm_baladek", name: "Baladek", code: "BAL", rollWidth: 1400, rollLength: 100000, ratePerSqMeter: 37.5, ratePerMeter: 37.5, costPerRoll: 3750, supplier: "Import", isActive: true },
  { id: "cm_mundior", name: "Mundior", code: "MUN", rollWidth: 1400, rollLength: 100000, ratePerSqMeter: 56.0, ratePerMeter: 56.0, costPerRoll: 5600, supplier: "Import", isActive: true },
  { id: "cm_wibalin", name: "Wibalin", code: "WIB", rollWidth: 1400, rollLength: 100000, ratePerSqMeter: 98.0, ratePerMeter: 98.0, costPerRoll: 9800, supplier: "Import", isActive: true },
  { id: "cm_pu_skiver", name: "PU Skiver", code: "PUS", rollWidth: 1372, rollLength: 100000, ratePerSqMeter: 98.0, ratePerMeter: 98.0, costPerRoll: 13446, supplier: "Import", isActive: true },
  { id: "cm_latex", name: "Latex 8pt", code: "LAT", rollWidth: 1400, rollLength: 100000, ratePerSqMeter: 46.2, ratePerMeter: 46.2, costPerRoll: 6468, supplier: "Import", isActive: true },
  { id: "cm_buckram", name: "Buckram", code: "BUK", rollWidth: 1000, rollLength: 100000, ratePerSqMeter: 66.0, ratePerMeter: 66.0, costPerRoll: 6600, supplier: "Import", isActive: true },
  { id: "cm_permalex", name: "Permalex", code: "PER", rollWidth: 1400, rollLength: 100000, ratePerSqMeter: 66.0, ratePerMeter: 66.0, costPerRoll: 9217, supplier: "Import", isActive: true },
  { id: "cm_imcloth", name: "Imperial Cloth", code: "IMC", rollWidth: 1400, rollLength: 100000, ratePerSqMeter: 46.2, ratePerMeter: 46.2, costPerRoll: 6468, supplier: "Import", isActive: true },
];

// ── Board Defaults ───────────────────────────────────────────────────────────
export const DEFAULT_BOARD_TYPES = [
  { id: "bd_imp_2", name: "Imported Board 2mm", origin: "imported" as const, thickness: 2, sheetWidth: 31, sheetHeight: 41, weightPerSheet: 1.066, ratePerKg: 70, ratePerSheet: 74.62, isActive: true },
  { id: "bd_imp_25", name: "Imported Board 2.5mm", origin: "imported" as const, thickness: 2.5, sheetWidth: 31, sheetHeight: 41, weightPerSheet: 1.332, ratePerKg: 70, ratePerSheet: 93.27, isActive: true },
  { id: "bd_imp_3", name: "Imported Board 3mm", origin: "imported" as const, thickness: 3, sheetWidth: 31, sheetHeight: 41, weightPerSheet: 1.599, ratePerKg: 70, ratePerSheet: 112, isActive: true },
  { id: "bd_ind_2", name: "Indian Board 2mm", origin: "indian" as const, thickness: 2, sheetWidth: 31, sheetHeight: 41, weightPerSheet: 1.066, ratePerKg: 20, ratePerSheet: 21.32, isActive: true },
  { id: "bd_ind_25", name: "Indian Board 2.5mm", origin: "indian" as const, thickness: 2.5, sheetWidth: 31, sheetHeight: 41, weightPerSheet: 1.332, ratePerKg: 20, ratePerSheet: 26.64, isActive: true },
  { id: "bd_ind_3", name: "Indian Board 3mm", origin: "indian" as const, thickness: 3, sheetWidth: 31, sheetHeight: 41, weightPerSheet: 1.599, ratePerKg: 20, ratePerSheet: 31.98, isActive: true },
];

// ── Wire-O Binding Material Rates ────────────────────────────────────────────
export const WIRE_O_RATES = [
  { diameter: "3/16", mm: 4.8, pitch: "3:1", maxThickness: 2, standardPer100: 3.5, metalPer100: 3 },
  { diameter: "1/4", mm: 6.4, pitch: "3:1", maxThickness: 3, standardPer100: 5, metalPer100: 6.4 },
  { diameter: "5/16", mm: 8, pitch: "3:1", maxThickness: 5, standardPer100: 6.5, metalPer100: 8.8 },
  { diameter: "3/8", mm: 9.5, pitch: "3:1", maxThickness: 6.5, standardPer100: 8, metalPer100: 10.5 },
  { diameter: "7/16", mm: 11, pitch: "3:1", maxThickness: 8, standardPer100: 16.0, metalPer100: 18.5 },
  { diameter: "1/2", mm: 12.7, pitch: "3:1", maxThickness: 9.5, standardPer100: 18.8, metalPer100: 21.3 },
  { diameter: "9/16", mm: 14.3, pitch: "2:1", maxThickness: 11, standardPer100: 24.1, metalPer100: 26.6 },
  { diameter: "5/8", mm: 16, pitch: "2:1", maxThickness: 12.5, standardPer100: 34.2, metalPer100: 39.2 },
  { diameter: "3/4", mm: 19, pitch: "2:1", maxThickness: 15, standardPer100: 51.8, metalPer100: 59.3 },
  { diameter: "7/8", mm: 22, pitch: "2:1", maxThickness: 18, standardPer100: 62.3, metalPer100: 64.8 },
  { diameter: "1", mm: 25.4, pitch: "2:1", maxThickness: 22.3, standardPer100: 69.2, metalPer100: 78 },
];

// ── Estimation Wizard Steps ──────────────────────────────────────────────────
export const WIZARD_STEPS: WizardStep[] = [
  { id: 1, key: "basic_info", title: "Basic Info", subtitle: "Job & customer details", icon: "FileText", isOptional: false, isCompleted: false, isValid: false, tipText: "Enter the customer name, book title, and reference number. This information will appear on the quotation." },
  { id: 2, key: "book_spec", title: "Book Spec", subtitle: "Trim size & quantities", icon: "Book", isOptional: false, isCompleted: false, isValid: false, tipText: "Choose a preset trim size or enter custom dimensions. You can estimate up to 5 different quantities simultaneously." },
  { id: 3, key: "text_section", title: "Text Sections", subtitle: "Pages, paper & printing", icon: "Type", isOptional: false, isCompleted: false, isValid: false, tipText: "Configure text sections with different papers if needed. Most books have 1 text section, but some have 2 (e.g., color plates on different paper)." },
  { id: 4, key: "cover", title: "Cover", subtitle: "Cover specifications", icon: "Square", isOptional: false, isCompleted: false, isValid: false, tipText: "Set cover paper, colors, and machine. For self-cover, the cover is printed on the same paper as text." },
  { id: 5, key: "jacket", title: "Jacket", subtitle: "Dust jacket options", icon: "Layers", isOptional: true, isCompleted: false, isValid: true, tipText: "Dust jackets are optional wraps around hardcase books. They typically have flaps and are printed in full color." },
  { id: 6, key: "endleaves", title: "Endleaves", subtitle: "Endpaper specifications", icon: "BookOpen", isOptional: true, isCompleted: false, isValid: true, tipText: "Endleaves (endpapers) connect the book block to the case. They can be plain, printed, or use specialty papers." },
  { id: 7, key: "binding", title: "Binding", subtitle: "Binding method & options", icon: "BookMarked", isOptional: false, isCompleted: false, isValid: false, tipText: "Choose from 15 binding types. Hardcase binding has the most options including board, covering material, and embellishments." },
  { id: 8, key: "finishing", title: "Finishing", subtitle: "Lamination, UV & more", icon: "Sparkles", isOptional: false, isCompleted: false, isValid: false, tipText: "Add value with finishing options. Lamination protects covers, Spot UV adds glossy highlights, and foil blocking adds metallic elements." },
  { id: 9, key: "packing", title: "Packing", subtitle: "Cartons, pallets & wrap", icon: "Package", isOptional: false, isCompleted: false, isValid: false, tipText: "Configure packing for your shipment. Book weight determines books per carton, and destination determines pallet configuration." },
  { id: 10, key: "delivery", title: "Delivery", subtitle: "Freight & destination", icon: "Truck", isOptional: false, isCompleted: false, isValid: false, tipText: "Set the delivery destination, freight mode, and currency for pricing. FOB Mumbai is standard for exports." },
  { id: 11, key: "pre_press", title: "Pre-Press", subtitle: "Proofs & origination", icon: "Printer", isOptional: true, isCompleted: false, isValid: true, tipText: "Pre-press includes Epson proofs, wet proofs on machine, and origination type. Most jobs assume ready-to-print PDFs." },
  { id: 12, key: "pricing", title: "Pricing", subtitle: "Margin, tax & currency", icon: "DollarSign", isOptional: false, isCompleted: false, isValid: false, tipText: "Set your margin percentage, commission, and tax. The system calculates selling price automatically." },
  { id: 13, key: "additional", title: "Additional", subtitle: "Extra costs & labour", icon: "Plus", isOptional: true, isCompleted: false, isValid: true, tipText: "Add any additional costs not covered by the standard sections - design charges, special materials, manual labour, etc." },
  { id: 14, key: "notes", title: "Notes", subtitle: "Special instructions", icon: "MessageSquare", isOptional: true, isCompleted: false, isValid: true, tipText: "Add notes that will appear on the quotation and internal notes visible only to your team." },
  { id: 15, key: "review", title: "Review", subtitle: "Summary & calculate", icon: "CheckCircle", isOptional: false, isCompleted: false, isValid: false, tipText: "Review all specifications before calculating. You can go back to any step to make changes." },
];

// ── Sidebar Navigation ───────────────────────────────────────────────────────
export const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
  { id: "new_estimate", label: "New Estimate", icon: "FilePlus", path: "/estimate/new" },
  { id: "jobs", label: "Jobs", icon: "Briefcase", path: "/jobs" },
  { id: "quotations", label: "Quotations", icon: "FileCheck", path: "/quotations" },
  { id: "customers", label: "Customers", icon: "Users", path: "/customers" },
  { id: "rate_card", label: "Rate Card", icon: "CreditCard", path: "/rate-card" },
  { id: "calculator", label: "Calculator", icon: "Calculator", path: "/calculator" },
  { id: "inventory", label: "Inventory", icon: "Warehouse", path: "/inventory" },
  { id: "reports", label: "Reports", icon: "BarChart3", path: "/reports" },
  { id: "settings", label: "Settings", icon: "Settings", path: "/settings" },
] as const;

// ── Keyboard Shortcuts ───────────────────────────────────────────────────────
export const KEYBOARD_SHORTCUTS = [
  { keys: ["Ctrl", "N"], description: "New Estimate", action: "navigate:/estimate/new" },
  { keys: ["Ctrl", "K"], description: "Search", action: "open:search" },
  { keys: ["Ctrl", "S"], description: "Save", action: "save" },
  { keys: ["Ctrl", "Enter"], description: "Calculate", action: "calculate" },
  { keys: ["Ctrl", "P"], description: "Print", action: "print" },
  { keys: ["Ctrl", "E"], description: "Export", action: "export" },
  { keys: ["Ctrl", "D"], description: "Dashboard", action: "navigate:/dashboard" },
  { keys: ["Ctrl", ","], description: "Settings", action: "navigate:/settings" },
  { keys: ["Ctrl", "Z"], description: "Undo", action: "undo" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo", action: "redo" },
  { keys: ["Esc"], description: "Close/Cancel", action: "close" },
];

// ── App Version ──────────────────────────────────────────────────────────────
export const APP_VERSION = "2.0.0";
export const APP_NAME = "Print Estimator Pro";
export const APP_BUILD = "2025.07.14";
export const APP_AUTHOR = "Thomson Press India";