// ============================================================================
// PRINT ESTIMATOR PRO â€” COMPLETE TYPE DEFINITIONS
// ============================================================================

// â”€â”€ User & Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  phone: string;
  avatar?: string;
  designation: string;
  department: string;
  initials: string;
  createdAt: string;
  lastLogin: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark";
  currency: CurrencyCode;
  language: string;
  dateFormat: string;
  numberFormat: string;
  defaultMargin: number;
  defaultTaxRate: number;
  quotationValidity: number;
  autoSaveDraft: boolean;
  showTips: boolean;
  sidebarCollapsed: boolean;
  notificationsEnabled: boolean;
}

// â”€â”€ Currency â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type CurrencyCode = "INR" | "USD" | "GBP" | "EUR" | "AUD" | "CAD" | "SGD" | "AED" | "ZAR" | "BRL" | "HKD" | "JPY" | "CNY";

export interface CurrencyRate {
  code: CurrencyCode;
  name: string;
  symbol: string;
  exchangeRate: number; // Rate relative to INR
  updatedAt: string;
}

// â”€â”€ Customer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// â”€â”€ Customer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Customer {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone: string;

  // â”€â”€ Company & Social â”€â”€
  website: string;
  industry: string;
  companyRegNumber: string;
  leadSource: string;
  socialLinks: { platform: string; url: string }[];

  // â”€â”€ Financials & Preferences â”€â”€
  defaultDiscount: number;
  defaultMargin: number;
  defaultTaxRate: number;
  preferredCurrency: CurrencyCode | string;
  preferredBank: string;
  accountManager: string;
  creditLimit: number;
  paymentTerms: string;

  // â”€â”€ Billing Address â”€â”€
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  gstNumber: string;
  panNumber: string;

  // â”€â”€ Shipping Address â”€â”€
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
  };

  // â”€â”€ Metadata â”€â”€
  priority: "high" | "medium" | "low";
  category: string;
  notes: string;
  status: "active" | "inactive" | "draft" | "lead";

  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}

// â”€â”€ Paper Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface PaperType {
  id: string;
  code: string;
  name: string;
  category: "coated" | "uncoated" | "specialty" | "board";
  finish: "matt" | "gloss" | "silk" | "uncoated" | "textured";
  bulkFactor: number;
  availableGSMs: number[];
  availableSizes: PaperSize[];
  rates: PaperRate[];
  isImported: boolean;
  supplier: string;
  description: string;
  isActive: boolean;
}

export interface PaperSize {
  id: string;
  widthInch: number;
  heightInch: number;
  label: string; // e.g., "23x36"
  widthMM: number;
  heightMM: number;
}

export interface PaperRate {
  id: string;
  paperTypeId: string;
  gsm: number;
  sizeId: string;
  sizeLabel: string;
  landedCostPerReam: number;
  chargeRatePerReam: number;
  ratePerKg: number;
  weightPerReam: number;
  isActive: boolean;
}

// â”€â”€ Machine interface has been moved to machine.types.ts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ Advanced Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type InventoryCategory = "paper" | "plates" | "finishing" | "packing" | "ink" | "chemicals" | "consumables" | "spare_parts" | "other";
export type InventoryStatus = "active" | "inactive" | "discontinued" | "draft";
export type ItemCondition = "new" | "good" | "fair" | "damaged";
export type MovementClass = "fast_moving" | "slow_moving" | "non_moving";

export interface InventoryItem {
  id: string;
  categoryCode: string;
  itemCode: string;
  // â”€â”€ Basic â”€â”€
  name: string;
  sku: string;
  barcode: string;
  category: InventoryCategory;
  subcategory: string;
  description: string;
  tags: string[];
  // â”€â”€ Stock â”€â”€
  stock: number;
  minLevel: number;
  maxLevel: number;
  reorderQty: number;
  unit: string;
  batchNumber: string;
  lotNumber: string;
  // â”€â”€ Pricing â”€â”€
  costPerUnit: number;
  sellingPrice: number;
  lastPurchasePrice: number;
  avgCost: number;
  taxRate: number;
  hsnCode: string;
  // â”€â”€ Location â”€â”€
  warehouse: string;
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
  // â”€â”€ Supplier â”€â”€
  supplier: string;
  supplierCode: string;
  leadTimeDays: number;
  alternateSuppliers: string[];
  // â”€â”€ Dates â”€â”€
  lastUpdated: string;
  expiryDate: string;
  manufacturedDate: string;
  lastAuditDate: string;
  lastMovedDate: string;
  // â”€â”€ Physical â”€â”€
  weight: number;
  weightUnit: string;
  length: number;
  width: number;
  height: number;
  dimensionUnit: string;
  volumeCBM: number;
  // â”€â”€ Status â”€â”€
  status: InventoryStatus;
  condition: ItemCondition;
  nmiFlag: boolean;
  movementClass: MovementClass;
  // â”€â”€ Quality â”€â”€
  qualityGrade: string;
  certifications: string[];
  shelfLifeDays: number;
  storageConditions: string;
  handlingInstructions: string;
  // â”€â”€ Notes â”€â”€
  notes: string;
}

// Machine detail interface unified into `Machine` above

export type NMIAction = "hold" | "write_off" | "liquidate" | "transfer" | "dispose" | "revalue";
export type NMICategory = "slow_moving" | "non_moving" | "dead_stock" | "obsolete";

export interface NMIRecord {
  id: string;
  inventoryItemId: string;
  itemName: string;
  sku: string;
  category: InventoryCategory;
  daysWithoutMovement: number;
  lastMovementDate: string;
  currentStock: number;
  unit: string;
  currentValue: number;
  depreciatedValue: number;
  nmiCategory: NMICategory;
  action: NMIAction;
  actionDate: string;
  actionNotes: string;
  approvedBy: string;
  location: string;
  status: "pending" | "approved" | "completed" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export type TransferStatus = "pending" | "approved" | "in_transit" | "received" | "cancelled";

export interface InventoryTransfer {
  id: string;
  inventoryItemId: string;
  itemName: string;
  sku: string;
  quantity: number;
  unit: string;
  // â”€â”€ Locations â”€â”€
  fromWarehouse: string;
  fromZone: string;
  toWarehouse: string;
  toZone: string;
  // â”€â”€ Dates â”€â”€
  transferDate: string;
  expectedArrivalDate: string;
  actualArrivalDate: string;
  // â”€â”€ Status â”€â”€
  status: TransferStatus;
  // â”€â”€ Transport â”€â”€
  transportMode: "manual" | "truck" | "courier" | "rail" | "air";
  vehicleNumber: string;
  driverName: string;
  trackingNumber: string;
  // â”€â”€ Charges â”€â”€
  transportCharges: number;
  handlingCharges: number;
  insuranceCharges: number;
  packagingCharges: number;
  otherCharges: number;
  totalTransferCost: number;
  // â”€â”€ People â”€â”€
  requestedBy: string;
  approvedBy: string;
  receivedBy: string;
  // â”€â”€ Notes â”€â”€
  notes: string;
  reason: string;
  priorityLevel: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  updatedAt: string;
}

// â”€â”€ Impression Rates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface ImpressionRate {
  id: string;
  machineId: string;
  machineName: string;
  minImpressions: number;
  maxImpressions: number;
  ratePer1000: number;
}

// â”€â”€ Wastage Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface WastageEntry {
  id: string;
  minQuantity: number;
  maxQuantity: number;
  fourColorWaste: number;
  twoColorWaste: number;
  oneColorWaste: number;
  isPercentage: boolean;
}

// â”€â”€ Binding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type BindingType =
  | "perfect_binding"
  | "pur_binding"
  | "section_sewn_perfect"
  | "section_sewn_hardcase"
  | "saddle_stitching"
  | "wire_o"
  | "spiral"
  | "case_binding"
  | "lay_flat"
  | "coptic"
  | "japanese"
  | "singer_sewn"
  | "pamphlet"
  | "tape_binding"
  | "thermal_binding";

export interface BindingRate {
  id: string;
  bindingType: BindingType;
  label: string;
  description: string;
  minQuantity: number;
  maxQuantity: number;
  ratePer16pp: number;
  gatheringRatePerSection: number;
  setupCost: number;
  additionalNotes: string;
}

export interface HardcaseBindingDetail {
  sewingRatePerSection: number;
  tippingEndleaves: number;
  foldingRatePerForm: number;
  backLining: number;
  casingIn: number;
  pressing: number;
  glueCost: number;
  htBandRate: number;
  htBandSpool: number;
  ribbonRate: number;
  headTailTrimming: number;
  qualityInspection: number;
  caseLamination: number;
  goldBlockingFront: number;
  goldBlockingSpine: number;
  goldBlockingDie: number;
  embossingFront: number;
  embossingDie: number;
  roundingBacking: number;
  giltEdging: number;
  foamPadding: number;
  roundCornering: number;
}

// â”€â”€ Finishing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export type FinishingType =
  | "lamination_gloss"
  | "lamination_matt"
  | "lamination_velvet"
  | "lamination_anti_scratch"
  | "spot_uv"
  | "uv_varnish"
  | "aqueous_varnish"
  | "gold_foil_blocking"
  | "silver_foil_blocking"
  | "embossing"
  | "debossing"
  | "die_cutting"
  | "foil_stamping"
  | "edge_gilding"
  | "perforation"
  | "scoring"
  | "numbering"
  | "drip_off"
  | "raised_spot_uv"
  | "thermography"
  | "flocking"
  | "soft_touch_coating";

export interface FinishingRate {
  id: string;
  finishingType: FinishingType;
  label: string;
  description: string;
  minQuantity: number;
  maxQuantity: number;
  ratePerCopy: number;
  setupCost: number;
  dieCost: number;
  machineId?: string;
  machineName?: string;
  areaFactor: boolean;
  baseArea: number; // sq inches for base rate
  isActive: boolean;
}

// â”€â”€ Board Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface BoardType {
  id: string;
  name: string;
  origin: "imported" | "indian";
  thickness: number; // mm
  sheetWidth: number; // inches
  sheetHeight: number; // inches
  weightPerSheet: number; // kg
  ratePerKg: number;
  ratePerSheet: number;
  isActive: boolean;
}

// â”€â”€ Covering Material â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface CoveringMaterial {
  id: string;
  name: string;
  code: string;
  rollWidth: number; // mm
  rollLength: number; // mm (100000 = 100m)
  ratePerSqMeter: number;
  ratePerMeter: number;
  costPerRoll: number;
  supplier: string;
  isActive: boolean;
}

// â”€â”€ Freight â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface FreightDestination {
  id: string;
  code: string;
  name: string;
  country: string;
  isOverseas: boolean;
  seaFreightPerContainer20: number;
  seaFreightPerContainer40: number;
  seaFreightPerPallet: number;
  surfacePerContainer: number;
  surfacePerPallet: number;
  surfacePerTruck: number;
  surfacePerTon: number;
  airFreightPerKg: number;
  clearanceCharges: number;
  chaCharges: number;
  portHandling: number;
  documentation: number;
  blCharges: number;
  insurancePercent: number;
  isActive: boolean;
}

// â”€â”€ Carton Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface CartonConfiguration {
  id: string;
  destinationId: string;
  bookSizeGroup: number; // 1-6 groups
  rows: number;
  cartonH: number;
  cartonW: number;
  cartonD: number;
  cartonsPerPallet: number;
}

// â”€â”€ Estimation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface EstimationInput {
  // Basic Info
  id: string;
  jobTitle: string;
  customerName: string;
  customerId?: string;
  referenceNumber: string;
  estimatedBy: string;
  estimationDate: string;
  poNumber: string;

  // Dynamic tracking fields (e.g., step_1_visited_at, step_2_visited_at)
  [key: string]: unknown;

  // Book Spec
  bookSpec: BookSpec;

  // Quantities (up to 5)
  quantities: number[];

  // Text Sections
  textSections: TextSection[];

  // Cover
  cover: CoverSection;

  // Jacket
  jacket: JacketSection;

  // Endleaves
  endleaves: EndleavesSection;

  // Binding
  binding: BindingSection;

  // Finishing
  finishing: FinishingSection;

  // Packing
  packing: PackingSection;

  // Delivery
  delivery: DeliverySection;

  // Pre-press
  prePress: PrePressSection;

  // Pricing
  pricing: PricingSection;

  // Additional
  additionalCosts: AdditionalCost[];

  // Notes
  notes: string;
  internalNotes: string;

  // Status
  status: "draft" | "estimated" | "quoted" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface BookSpec {
  heightMM: number;
  widthMM: number;
  orientation: "portrait" | "landscape" | "square";
  trimSizePreset: string;
  customSize: boolean;
  spineThickness: number; // calculated
  spineWithBoard: number; // calculated
  totalPages: number; // calculated
}

export interface TextSection {
  id: string;
  enabled: boolean;
  label: string;
  pages: number;
  colorsFront: number;
  colorsBack: number;
  paperTypeId: string;
  paperTypeName: string;
  gsm: number;
  paperSizeId: string;
  paperSizeLabel: string;

  // Custom Paper metrics
  isCustomPaper?: boolean;
  customPaperWidth?: number;
  customPaperHeight?: number;
  customPaperGrain?: "LONG_GRAIN" | "SHORT_GRAIN";
  customPaperBulk?: number;

  machineId: string;
  machineName: string;
  plateChanges: number;
  printingMethod: "sheetwise" | "work_and_turn" | "work_and_tumble" | "perfector";
  planningMode?: "auto" | "manual_override";
  recommendedPaperSizeLabel?: string;
  recommendedMachineId?: string;
  recommendedMachineName?: string;
  recommendedSignature?: number;
  recommendedUps?: number;
  planningWarnings?: string[];
}

export interface CoverSection {
  enabled: boolean;
  pages: number; // Usually 4 for single cover
  colorsFront: number;
  colorsBack: number;
  paperTypeId: string;
  paperTypeName: string;
  gsm: number;
  paperSizeId: string;
  paperSizeLabel: string;

  // Custom Paper metrics
  isCustomPaper?: boolean;
  customPaperWidth?: number;
  customPaperHeight?: number;
  customPaperGrain?: "LONG_GRAIN" | "SHORT_GRAIN";
  customPaperBulk?: number;

  machineId: string;
  machineName: string;
  selfCover: boolean;
  separateCover: boolean;
  foldType: "wrap_around" | "french_fold" | "gatefold" | "none";
  planningMode?: "auto" | "manual_override";
  recommendedPaperSizeLabel?: string;
  recommendedMachineId?: string;
  recommendedMachineName?: string;
  planningWarnings?: string[];
}

export interface JacketSection {
  enabled: boolean;
  colorsFront: number;
  colorsBack: number;
  paperTypeId: string;
  paperTypeName: string;
  gsm: number;
  paperSizeId: string;
  paperSizeLabel: string;

  // Custom Paper metrics
  isCustomPaper?: boolean;
  customPaperWidth?: number;
  customPaperHeight?: number;
  customPaperGrain?: "LONG_GRAIN" | "SHORT_GRAIN";
  customPaperBulk?: number;

  machineId: string;
  machineName: string;
  laminationType: string;
  extraJacketsPercent: number;
  goldBlockingFront: boolean;
  goldBlockingSpine: boolean;
  spotUV: boolean;
  flapWidth: number; // mm
  planningMode?: "auto" | "manual_override";
  recommendedPaperSizeLabel?: string;
  recommendedMachineId?: string;
  recommendedMachineName?: string;
  planningWarnings?: string[];
}

export interface EndleavesSection {
  enabled: boolean;
  pages: number;
  colorsFront: number;
  colorsBack: number;
  paperTypeId: string;
  paperTypeName: string;
  gsm: number;
  paperSizeId: string;
  paperSizeLabel: string;

  // Custom Paper metrics
  isCustomPaper?: boolean;
  customPaperWidth?: number;
  customPaperHeight?: number;
  customPaperGrain?: "LONG_GRAIN" | "SHORT_GRAIN";
  customPaperBulk?: number;

  machineId: string;
  machineName: string;
  type: "printed" | "plain" | "tipped" | "map" | "self" | "special";
  selfEndleaves: boolean;
  planningMode?: "auto" | "manual_override";
  recommendedPaperSizeLabel?: string;
  recommendedMachineId?: string;
  recommendedMachineName?: string;
  planningWarnings?: string[];
}

export interface BindingSection {
  primaryBinding: BindingType;
  purBinding: boolean; // PUR toggle for perfect binding
  backShape: "square" | "round";
  boardType: string;
  boardThickness: number;
  boardOrigin: "imported" | "indian";
  coveringMaterialId: string;
  coveringMaterialName: string;
  caseMaterial: "printed_paper" | "cloth" | "leather" | "pvc";
  ribbonMarker: number;
  headTailBand: boolean;
  giltEdging: boolean;
  foamPadding: boolean;
  roundCornering: boolean;
  goldBlockingFront: boolean;
  goldBlockingSpine: boolean;
  embossingFront: boolean;
  roundingBacking: boolean;
}

export interface FinishingSection {
  coverLamination: {
    enabled: boolean;
    type: "gloss" | "matt" | "velvet" | "anti_scratch" | "none";
    machineId: string;
  };
  jacketLamination: {
    enabled: boolean;
    type: "gloss" | "matt" | "velvet" | "anti_scratch" | "none";
  };
  spotUVCover: {
    enabled: boolean;
    type: "front" | "front_and_back";
  };
  spotUVJacket: {
    enabled: boolean;
  };
  uvVarnish: {
    enabled: boolean;
    sections: ("cover" | "text" | "jacket")[];
  };
  aqueousVarnish: {
    enabled: boolean;
    freeOnRekord: boolean;
  };
  embossing: {
    enabled: boolean;
    type: "single" | "multi_level";
    location: ("front" | "spine" | "back")[];
  };
  goldBlocking: {
    enabled: boolean;
    location: ("front" | "spine" | "back")[];
    foilType: "gold" | "silver" | "copper" | "holographic";
  };
  dieCutting: {
    enabled: boolean;
    complexity: "simple" | "medium" | "complex";
  };
  foilStamping: {
    enabled: boolean;
    foilType: "gold" | "silver" | "copper" | "holographic";
    location: ("front" | "spine" | "back")[];
  };
  edgeGilding: {
    enabled: boolean;
    edges: ("top" | "bottom" | "fore_edge")[];
  };
  perforation: { enabled: boolean };
  scoring: { enabled: boolean };
  numbering: { enabled: boolean };
  collation: {
    enabled: boolean;
    mode: "standard" | "booklet" | "sectional";
    ratePerCopy: number;
    setupCost: number;
  };
  holePunch: {
    enabled: boolean;
    holes: 2 | 3 | 4;
    ratePerCopy: number;
    setupCost: number;
  };
  trimming: {
    enabled: boolean;
    sides: 1 | 2 | 3;
    ratePerCopy: number;
  };
  envelopePrinting: {
    enabled: boolean;
    envelopeSize: "dl" | "c5" | "c4" | "custom";
    quantity: number;
    colors: 1 | 2 | 4;
    ratePerEnvelope: number;
    setupCost: number;
  };
  largeFormat: {
    enabled: boolean;
    productType: "poster" | "banner" | "plotter";
    widthMM: number;
    heightMM: number;
    quantity: number;
    ratePerSqM: number;
  };
  additionalFinishing: {
    type: string;
    description: string;
    costPerCopy: number;
    setupCost: number;
  }[];
}

export interface PackingSection {
  useCartons: boolean;
  usePallets: boolean;
  cartonType: "3_ply" | "5_ply" | "custom";
  cartonRate: number;
  customBooksPerCarton: number;
  palletType: "standard" | "heat_treated" | "euro" | "custom";
  palletRate: number;
  stretchWrap: boolean;
  stretchWrapRate: number;
  shrinkWrap: boolean;
  shrinkWrapRate: number;
  strapping: boolean;
  strappingRate: number;
  cornerProtectors: boolean;
  cornerProtectorRate: number;
  innerPartition: boolean;
  customPrinting: boolean;
  kraftWrapping: boolean;
  polybagIndividual: boolean;
  polybagRate: number;
  bandingPerPack: number;
  insertSlipSheet: boolean;
  containerization: "with_pallets" | "without_pallets" | "none";
  containerType: "20ft" | "40ft" | "40ft_hc" | "none";
  maxCartonWeight: number;
  maxPalletHeight: number;
  maxPalletWeight: number;
}

export interface DeliverySection {
  destinationId: string;
  destinationName: string;
  deliveryType: "fob" | "cif" | "ddp" | "ex_works" | "domestic";
  freightMode: "sea" | "air" | "road" | "courier" | "rail";
  portOfLoading: string;
  numberOfDespatches: number;
  localDespatches: number;
  overseasDespatches: number;
  advanceCopies: number;
  advanceCopiesAirFreight: boolean;
  advanceCopiesRate: number;
  customsClearance: number;
  insurance: boolean;
  insuranceRate: number;
}

export interface PrePressSection {
  epsonProofs: number;
  epsonRatePerPage: number;
  wetProofs: number;
  wetProofRatePerForm: number;
  filmOutput: boolean;
  filmRatePerPlate: number;
  designCharges: number;
  originationType: "from_positives" | "from_pdf" | "from_design";
}

export interface PricingSection {
  marginPercent: number;
  commissionPercent: number;
  targetTPH: number;
  currency: CurrencyCode;
  exchangeRate: number;
  volumeDiscount: number;
  paymentTerms: string;
  paymentDays: number;
  quotationValidity: number;
  taxType: "gst_print" | "gst_book" | "vat" | "none" | "custom";
  taxRate: number;
  includesTax: boolean;
}

export interface AdditionalCost {
  id: string;
  description: string;
  costPerCopy: number;
  totalCost: number;
  isPerCopy: boolean;
  category: string;
}

export interface EstimationValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  section?: string;
  impact?: string;
}

export interface PricingRevision {
  id: string;
  revisionNumber: number;
  createdAt: string;
  createdBy: string;
  marginPercent: number;
  commissionPercent: number;
  targetTPH: number;
  exchangeRate: number;
  volumeDiscount: number;
  paymentTerms: string;
  taxRate: number;
  notes: string;
}

export interface QuoteSnapshot {
  id: string;
  estimationId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  inputSnapshot: EstimationInput;
  resultsSnapshot: any; // Using any or EstimationResult array depending on import 
  revisions: PricingRevision[];
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  validUntil: string;
}

export interface ProcurementRecommendation {
  section: string;
  requiredSpec: {
    paperType: string;
    gsm: number;
    preferredSize: string;
    quantitySheets: number;
    grain: "LONG_GRAIN" | "SHORT_GRAIN" | "UNKNOWN";
  };
  nearestMatches: Array<{
    source: "rate_card" | "inventory";
    reference: string;
    paperType: string;
    gsm: number;
    size: string;
    deltaCostPerCopy: number;
    stockStatus: "available" | "limited" | "not_available";
  }>;
  recommendedBuy: {
    paperType: string;
    gsm: number;
    size: string;
    estimatedRatePerReam: number;
    suggestedOrderQtySheets: number;
    supplierId?: string;
    supplierName?: string;
  };
  impactIfNotAvailable: string;
  confidence: number;
}

export interface PlanningDiagnostics {
  section: string;
  strategy: string;
  selectedCandidate: string;
  rejectedCandidates: string[];
  paperSource?: string;
  grainStatus?: string;
  warnings?: string[];
}

// â”€â”€ Estimation Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface EstimationResult {
  id: string;
  estimationId: string;
  quantity: number;
  quantityIndex: number;

  // Paper costs
  paperCosts: SectionPaperCost[];
  totalPaperCost: number;

  // Printing costs
  printingCosts: SectionPrintingCost[];
  totalPrintingCost: number;

  // CTP costs
  ctpCosts: SectionCTPCost[];
  totalCTPCost: number;

  // Binding cost
  bindingCost: number;
  bindingCostPerCopy: number;
  bindingBreakdown: Record<string, number>;

  // Finishing cost
  finishingCost: number;
  finishingCostPerCopy: number;
  finishingBreakdown: Record<string, number>;

  // Packing cost
  packingCost: number;
  packingCostPerCopy: number;
  packingBreakdown: PackingBreakdown;

  // Freight cost
  freightCost: number;
  freightCostPerCopy: number;
  freightBreakdown: Record<string, number>;

  // Pre-press cost
  prePressCost: number;

  // Additional costs
  additionalCost: number;

  // Totals
  totalProductionCost: number;
  totalCostPerCopy: number;
  sellingPricePerCopy: number;
  sellingPriceForeignCurrency: number;
  totalSellingPrice: number;
  totalSellingPriceForeign: number;
  marginAmount: number;
  commission: number;
  taxAmount: number;
  grandTotal: number;

  // Metrics
  tph: number; // Throughput per hour
  totalMachineHours: number;
  makeReadyHours: number;
  runningHours: number;
  weightPerBook: number;
  totalWeight: number;
  spineThickness: number;
  spineWithBoard: number;
  booksPerCarton: number;
  totalCartons: number;
  cartonsPerPallet: number;
  totalPallets: number;

  planningIssues?: EstimationValidationIssue[];
  procurementRecommendations?: ProcurementRecommendation[];
  diagnostics?: PlanningDiagnostics[];
  planningSummary?: {
    section: string;
    paperSize: string;
    signature: number;
    ups: number;
    machineId: string;
    grainCompliant: boolean;
    source: "auto" | "manual_override";
    warnings: string[];
  }[];

  createdAt: string;
}

export interface SectionPaperCost {
  sectionName: string;
  sectionType: "text1" | "text2" | "cover" | "jacket" | "endleaves" | "case";
  paperType: string;
  gsm: number;
  paperSize: string;
  ppPerForm: number;
  numberOfForms: number;
  ups: number;
  formatSize: string;
  netSheets: number;
  wastageSheets: number;
  grossSheets: number;
  reams: number;
  weightPerReam: number;
  totalWeight: number;
  ratePerReam: number;
  totalCost: number;
  imposition?: any;
  grainCompliant?: boolean;
  sourceSelection?: {
    source: "rate_card" | "inventory" | "fallback";
    reference?: string;
    confidence: number;
    inStock: boolean;
  };
  procurementRecommendation?: ProcurementRecommendation;
}

export interface SectionPrintingCost {
  sectionName: string;
  sectionType: string;
  machineId: string;
  machineName: string;
  totalPlates: number;
  impressionsPerForm: number;
  totalImpressions: number;
  ratePer1000: number;
  printingCost: number;
  makeReadyCost: number;
  runningHours: number;
  makereadyHours: number;
  totalCost: number;
}

export interface SectionCTPCost {
  sectionName: string;
  sectionType: string;
  totalPlates: number;
  ratePerPlate: number;
  totalCost: number;
}

export interface PackingBreakdown {
  booksPerCarton: number;
  totalCartons: number;
  cartonCost: number;
  totalPallets: number;
  palletCost: number;
  stretchWrapCost: number;
  shrinkWrapCost: number;
  strappingCost: number;
  cornerProtectorCost: number;
  otherPackingCost: number;
  totalPackingCost: number;
  weightPerBook: number;
  totalWeight: number;
}

// â”€â”€ Job â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Job {
  id: string;
  jobNumber: string;
  title: string;
  customerId: string;
  customerName: string;
  estimationId: string;
  status: "draft" | "estimated" | "quoted" | "in_production" | "completed" | "cancelled";
  quantities: number[];
  results: EstimationResult[];
  bookSpec: BookSpec;
  totalValue: number;
  currency: CurrencyCode;
  assignedTo: string;
  dueDate: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// â”€â”€ Quotation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface Quotation {
  id: string;
  quotationNumber: string;
  jobId: string;
  jobTitle: string;
  customerId: string;
  customerName: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "revised";
  quantities: number[];
  results: EstimationResult[];
  currency: CurrencyCode;
  exchangeRate: number;
  validityDays: number;
  validUntil: string;
  paymentTerms: string;
  deliveryTerms: string;
  notes: string;
  termsAndConditions: string;
  comments: QuotationComment[];
  revisionNumber: number;
  pricingVersion?: number;
  sourceEstimateId?: string;
  quoteSnapshot?: {
    id: string;
    quotationId: string;
    sourceEstimateId: string;
    pricingVersion: number;
    plannedAt: string;
    estimationInput: EstimationInput;
    result: EstimationResult;
    planning: {
      sections: Array<{
        section: string;
        paperSize: string;
        imposition: string;
        signature: number;
        ups: number;
        grainCompliant: boolean;
        machineId: string;
        machineName: string;
        source: "auto" | "manual_override";
        warnings: string[];
      }>;
      blocked: boolean;
      issues: EstimationValidationIssue[];
    };
    procurement: ProcurementRecommendation[];
    issues: EstimationValidationIssue[];
  };
  pricingRevisions?: Array<{
    id: string;
    quotationId: string;
    version: number;
    createdAt: string;
    reason: string;
    snapshot: Quotation["quoteSnapshot"];
  }>;
  sentDate?: string;
  acceptedDate?: string;
  rejectedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  type: "internal" | "external";
}

// â”€â”€ Notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface AppNotification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "action";
  title: string;
  message: string;
  category: "estimate" | "quotation" | "job" | "export" | "import" | "system" | "customer";
  read: boolean;
  actionUrl?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// â”€â”€ Activity Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface ActivityLog {
  id: string;
  action: string;
  category: string;
  description: string;
  user: string;
  entityType: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  level: "info" | "warning" | "error" | "debug";
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// â”€â”€ Settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface AppSettings {
  company: CompanySettings;
  estimation: EstimationSettings;
  printing: PrintingSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  backup: BackupSettings;
}

export interface CompanySettings {
  name: string;
  logo: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  gstNumber: string;
  panNumber: string;
  registrationNumber: string;
  bankDetails: string;
}

export interface EstimationSettings {
  defaultCurrency: CurrencyCode;
  defaultMarginPercent: number;
  defaultTaxRate: number;
  quotationValidity: number;
  defaultPaymentTerms: string;
  bleedMM: number;
  gripperMM: number;
  autoCalculateSpine: boolean;
  includeAdvanceCopies: boolean;
  defaultAdvanceCopies: number;
  roundPriceTo: number;
}

export interface PrintingSettings {
  defaultMachine: string;
  enablePerfectorCalc: boolean;
  enableBiblePaperSurcharge: boolean;
  wastageChartId: string;
  defaultImpositionMethod: string;
}

export interface AppearanceSettings {
  theme: "light" | "dark";
  accentColor: string;
  fontSize: "small" | "medium" | "large";
  sidebarWidth: "narrow" | "normal" | "wide";
  compactMode: boolean;
  animationsEnabled: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  estimateCompleted: boolean;
  quotationStatusChange: boolean;
  exportCompleted: boolean;
  systemAlerts: boolean;
}

export interface BackupSettings {
  autoBackup: boolean;
  backupInterval: "daily" | "weekly" | "monthly";
  maxBackups: number;
  lastBackup: string;
  backupPath: string;
}

// â”€â”€ Report Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface ReportData {
  overview: OverviewReport;
  jobsReport: JobsReport;
  quotationsReport: QuotationsReport;
  customerReport: CustomerReport;
  revenueReport: RevenueReport;
  machineReport: MachineReport;
  paperReport: PaperReport;
}

export interface OverviewReport {
  totalJobs: number;
  totalQuotations: number;
  totalCustomers: number;
  totalRevenue: number;
  avgJobValue: number;
  conversionRate: number;
  jobsByMonth: { month: string; count: number; value: number }[];
  quotationsByStatus: { status: string; count: number }[];
  topCustomers: { name: string; revenue: number; jobs: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export interface JobsReport {
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  avgTurnaround: number;
  jobsByBindingType: { type: string; count: number }[];
  jobsByPaperType: { type: string; count: number }[];
  jobsByMachine: { machine: string; hours: number }[];
}

export interface QuotationsReport {
  total: number;
  accepted: number;
  rejected: number;
  pending: number;
  expired: number;
  conversionRate: number;
  avgQuotationValue: number;
  responseTime: number;
}

export interface CustomerReport {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  customersByPriority: Record<string, number>;
  topCustomersByRevenue: { name: string; revenue: number }[];
}

export interface RevenueReport {
  totalRevenue: number;
  revenueGrowth: number;
  avgOrderValue: number;
  revenueByCategory: { category: string; revenue: number }[];
  projectedRevenue: number;
}

export interface MachineReport {
  machines: {
    name: string;
    totalHours: number;
    utilization: number;
    jobCount: number;
    revenue: number;
  }[];
}

export interface PaperReport {
  totalConsumption: number;
  consumptionByType: { type: string; reams: number; weight: number }[];
  topPapers: { name: string; gsm: number; usage: number }[];
}

// â”€â”€ Quick Calculator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface QuickCalcInput {
  bookHeight: number;
  bookWidth: number;
  pages: number;
  gsm: number;
  paperType: string;
  quantity: number;
  colorsFront: number;
  colorsBack: number;
  bindingType: BindingType;
  coverGSM: number;
  coverPaperType: string;
  laminationType: string;
  machineId: string;
}

export interface QuickCalcResult {
  paperCost: number;
  printingCost: number;
  bindingCost: number;
  finishingCost: number;
  totalCost: number;
  costPerCopy: number;
  spineThickness: number;
  paperWeight: number;
  totalWeight: number;
  reams: number;
  plates: number;
  impressions: number;
}

// â”€â”€ Wizard Step â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface WizardStep {
  id: number;
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  isOptional: boolean;
  isCompleted: boolean;
  isValid: boolean;
  tipText: string;
}

