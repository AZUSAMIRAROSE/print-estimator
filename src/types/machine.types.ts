import {
    MachineType, MachineStatus, ColorMode, SpeedUnit,
    MaintenanceInterval, DepreciationMethod, InkType
} from './machine.enums';

/**
 * ═══════════════════════════════════════════════════════════════
 * THE CANONICAL MACHINE INTERFACE
 * ═══════════════════════════════════════════════════════════════
 * 
 * This interface is the SINGLE, ABSOLUTE, NON-NEGOTIABLE
 * definition of a machine in this application. It unifies and
 * permanently replaces:
 *   - MachineDetail (from types/index.ts) — DEPRECATED & DELETED
 *   - MachineEntry (from rateCardStore.ts) — DEPRECATED & DELETED
 * 
 * ANY code referencing either of those dead types MUST be
 * migrated to this interface. No exceptions. No wrappers.
 * No "compatibility layers." Direct migration only.
 * 
 * Every field in this interface exists because it DIRECTLY
 * affects cost calculation. This is not a data model for
 * display — it is a FINANCIAL INSTRUMENT.
 * ═══════════════════════════════════════════════════════════════
 */
export interface Machine {
    // ─── IDENTITY & METADATA ─────────────────────────────────
    readonly id: string;                    // UUID v4, immutable after creation
    name: string;                           // Human-readable identifier
    nickname: string;                       // Short alias for UI display
    manufacturer: string;
    model: string;
    serialNumber: string;
    type: MachineType;
    status: MachineStatus;
    tags: string[];                         // Arbitrary classification tags
    notes: string;                          // Free-text operational notes

    // ─── PHYSICAL SPECIFICATIONS ──────────────────────────────
    maxSheetWidth_mm: number;               // Maximum substrate width
    maxSheetHeight_mm: number;              // Maximum substrate height
    minSheetWidth_mm: number;               // Minimum substrate width
    minSheetHeight_mm: number;              // Minimum substrate height
    maxSubstrateThickness_microns: number;  // Maximum paper/board thickness
    minSubstrateThickness_microns: number;  // Minimum paper/board thickness
    maxSubstrateWeight_gsm: number;         // Maximum paper weight
    minSubstrateWeight_gsm: number;         // Minimum paper weight
    gripperMargin_mm: number;              // Non-printable gripper edge
    tailMargin_mm: number;                 // Non-printable tail edge
    sideMargin_mm: number;                 // Non-printable side margins
    printableAreaWidth_mm: number;          // Effective printable width (derived but overridable)
    printableAreaHeight_mm: number;         // Effective printable height (derived but overridable)

    // ─── COLOR CONFIGURATION ─────────────────────────────────
    colorMode: ColorMode;
    maxColorsPerPass: number;               // e.g., 4 for a 4-color press, 8 for extended
    frontColors: number;                    // Colors available on front (e.g., 4 in 4+0)
    backColors: number;                     // Colors available on back (e.g., 0 in 4+0, 4 in 4+4)
    hasCoatingUnit: boolean;                // Inline coating unit
    coatingUnitCount: number;               // Number of inline coating units
    hasVarnishUnit: boolean;                // Inline varnish unit
    supportsPantone: boolean;               // Can mix/run Pantone spot colors
    maxPantoneUnits: number;                // How many Pantone units available
    inkType: InkType;

    // ─── SPEED & THROUGHPUT ───────────────────────────────────
    ratedSpeed: number;                     // Manufacturer-rated max speed
    ratedSpeedUnit: SpeedUnit;
    effectiveSpeed: number;                 // Real-world operational speed (always ≤ ratedSpeed)
    effectiveSpeedUnit: SpeedUnit;
    speedReductionThickStock_percent: number;  // Speed penalty for heavy stock
    speedReductionThinStock_percent: number;   // Speed penalty for lightweight stock
    speedReductionCoating_percent: number;     // Speed penalty when coating inline
    duplexSpeedFactor: number;                 // Multiplier for perfecting/duplex (e.g., 0.6 = 60% of simplex speed)

    // ─── ADVANCED SPEED DYNAMICS (OEE & KINEMATICS) ──────────
    speedCurve_startup_percent: number;        // Speed during ramp-up phase (e.g., 50%)
    speedCurve_startupDuration_mins: number;   // How long ramp-up takes per job
    speedReduction_heavyInkCoverage_percent: number; // Penalty for >250% TIC
    speedReduction_perAdditionalColor_percent: number; // Penalty for multi-unit sync

    // ─── SETUP & MAKEREADY ───────────────────────────────────
    setupTimeBase_mins: number;             // Base makeready time (no color changes)
    setupTimePerColor_mins: number;         // Additional makeready per color unit
    plateChangeTime_mins: number;           // Time to change one plate
    blanketWashTime_mins: number;           // Blanket washing between jobs
    impressionCylinderWashTime_mins: number; // Impression cylinder cleaning
    inkRollerWashTime_mins: number;         // Full ink roller wash time
    fullWashupTime_mins: number;            // Complete washup (all units)
    colorMatchingTime_mins: number;         // Time for Pantone/color matching
    registerSetupTime_mins: number;         // Fine registration adjustment
    paperLoadTime_mins: number;             // Time to load paper into feeder
    deliverySetupTime_mins: number;         // Delivery/stacker setup
    dieCuttingSetupTime_mins: number;       // If applicable
    jobProgrammingTime_mins: number;        // RIP/digital front-end setup (digital)
    calibrationTime_mins: number;           // Color calibration (digital)

    // ─── MICRO-MAKEREADY OPERATIONS (PRO TIER) ───────────────
    setupTime_sheetSizeChange_mins: number; // Time to adjust guides for new size
    setupTime_caliperChange_mins: number;   // Time to adjust pressure/bearers
    setupTime_inkSystemWash_mins: number;   // Deep clean (e.g., UV to Conventional)
    setupTime_coatingChange_mins: number;   // Swap anilox/coating type
    setupTime_feederAdjustment_mins: number;
    setupTime_deliveryAdjustment_mins: number;
    autoPlateLoadingTime_perPlate_mins: number; // APC time per unit
    cip3DataProcessingTime_mins: number;    // Pre-inking data ingestion

    // ─── WASTE & SPOILAGE ────────────────────────────────────
    setupWasteSheets_base: number;          // Base setup waste (sheets)
    setupWasteSheets_perColor: number;      // Additional waste per color unit
    setupWasteSheets_perPantone: number;    // Additional waste per Pantone color
    setupWasteSheets_coatingUnit: number;   // Additional waste for coating makeready
    runningWaste_percent: number;           // Running waste as percentage of run
    runningWaste_minimum: number;           // Minimum running waste (sheets)
    binderyWaste_percent: number;           // Post-press waste allowance
    dieStrikeWaste_percent: number;         // Die cutting waste
    foldingWaste_percent: number;           // Folding waste
    cuttingWaste_percent: number;           // Guillotine cutting waste
    testPrintWaste_sheets: number;          // Digital test prints before approval

    // ─── GRANULAR SPOILAGE TRACKING (SIX SIGMA) ──────────────
    spoilage_jamRate_percent: number;       // Expected feeder/delivery jam allowance
    spoilage_colorVariation_percent: number; // Sheets lost during run for color drift
    setupWaste_caliperChange_sheets: number; // Extra waste when changing stock thickness
    setupWaste_colorProfileChange_sheets: number; // Extra waste for massive profile shifts

    // ─── COST STRUCTURE — MACHINE ─────────────────────────────
    hourlyRate: number;                     // Machine hour rate (excluding labor)
    hourlyRate_overtime: number;            // Overtime machine rate
    hourlyRate_weekend: number;             // Weekend/holiday machine rate
    impressionCost: number;                 // Cost per impression/click (digital)
    impressionCost_color: number;           // Per-click color charge (digital)
    impressionCost_bw: number;             // Per-click B&W charge (digital)
    impressionCost_spotVarnish: number;     // Per-impression spot varnish
    fixedSetupCost: number;                 // Fixed charge per job setup
    minimumJobCharge: number;               // Minimum charge regardless of quantity
    totalHourlyCost: number;                // COMPUTED: Total effective hourly rate (labor+rent+depreciation+energy+consumables)

    // ─── COST STRUCTURE — LABOR ───────────────────────────────
    operatorsRequired: number;              // Number of operators needed
    operatorCostPerHour: number;            // Loaded cost per operator per hour
    helpersRequired: number;                // Number of helpers/assistants
    helperCostPerHour: number;              // Loaded cost per helper per hour
    supervisorAllocation_percent: number;   // Percentage of supervisor time allocated
    supervisorCostPerHour: number;          // Supervisor loaded cost
    totalLaborCostPerHour: number;          // COMPUTED: sum of all labor (can be overridden)
    laborCostOvertime_multiplier: number;   // e.g., 1.5x for OT
    laborCostWeekend_multiplier: number;    // e.g., 2.0x for weekends

    // ─── COST STRUCTURE — FACILITY ────────────────────────────
    spaceOccupied_sqft: number;             // Floor space consumed
    rentPerSqft_monthly: number;            // Rent cost per sqft per month
    monthlyRentAllocation: number;          // COMPUTED: space × rent
    dailyRentAllocation: number;            // COMPUTED: monthly / operating days
    hourlyRentAllocation: number;           // COMPUTED: daily / operating hours
    operatingDaysPerMonth: number;          // Typically 22-26
    operatingHoursPerDay: number;           // Typically 8-24
    utilization_percent: number;            // Expected utilization (for cost absorption)

    // ─── COST STRUCTURE — CONSUMABLES ─────────────────────────
    inkCoverage_gramsPerSqm: number;        // Default ink coverage factor
    inkCost_perKg: number;                  // Ink cost per kilogram
    inkCost_perGram: number;                // COMPUTED: perKg / 1000
    inkCost_pantoneMultiplier: number;      // Pantone ink cost multiplier vs process
    ctpRate_perPlate: number;               // CTP processing rate per plate
    plateCost_each: number;                 // Cost per plate
    platesPerColorPerJob: number;           // Usually 1, but can be more for large runs
    blanketCost_each: number;               // Cost per blanket
    blanketLifespan_impressions: number;    // Impressions before blanket replacement
    blanketCostPerImpression: number;       // COMPUTED: cost / lifespan
    rollerReplacementCost: number;          // Cost of full roller set replacement
    rollerLifespan_impressions: number;     // Impressions before roller replacement
    rollerCostPerImpression: number;        // COMPUTED: cost / lifespan
    washSolventCost_perLiter: number;       // Wash chemical cost
    washSolventUsage_litersPerWash: number; // Consumption per wash cycle
    fountainSolutionCost_perLiter: number;  // Dampening solution cost
    fountainSolutionUsage_litersPerHour: number;
    tonerCost_perPage_bw: number;           // Digital toner/ink cost per page
    tonerCost_perPage_color: number;        // Digital toner/ink cost per page color
    fusionOilCost_perHour: number;          // Fuser oil consumption (digital)
    maintenanceKitCost: number;             // Periodic maintenance kit
    maintenanceKitInterval_impressions: number;
    maintenanceKitCostPerImpression: number; // COMPUTED
    consumablesCostPerHour_aggregate: number; // COMPUTED: Total consumables/hour

    // ─── ADVANCED CONSUMABLES LOGISTICS ──────────────────────
    fountainSolutionAdditiveCost_perLiter: number; // Alcohol substituents/additives
    platePunchingCost_perPlate: number;     // Automated punching/bending
    washRollerCloth_costPerMeter: number;   // Auto-wash cloth rolls
    washRollerCloth_metersPerWash: number;  // Cloth used per washup
    antiSetoffPowder_costPerKg: number;     // Spray powder
    antiSetoffPowder_kgPer10k_sheets: number; // Powder usage

    // ─── DEPRECIATION & ASSET ────────────────────────────────
    purchasePrice: number;                  // Original acquisition cost
    currentBookValue: number;               // Current depreciated value
    depreciationMethod: DepreciationMethod;
    usefulLife_years: number;               // Expected useful life
    salvageValue: number;                   // Expected salvage/residual value
    annualDepreciation: number;             // COMPUTED based on method
    monthlyDepreciation: number;            // COMPUTED
    hourlyDepreciation: number;             // COMPUTED
    installationDate: string;               // ISO 8601 date
    warrantyExpiry: string;                 // ISO 8601 date

    // ─── MAINTENANCE & DOWNTIME ───────────────────────────────
    maintenanceInterval: MaintenanceInterval;
    maintenanceIntervalValue: number;       // Numeric interval (hours/impressions/etc.)
    averageMaintenanceDuration_hours: number;
    maintenanceCostPerEvent: number;
    annualMaintenanceBudget: number;
    plannedDowntime_hoursPerMonth: number;
    unplannedDowntime_percent: number;      // Historical unplanned downtime
    effectiveAvailability_percent: number;  // COMPUTED: 100 - planned - unplanned

    // ─── ENERGY ──────────────────────────────────────────────
    powerConsumption_kW: number;            // Operating power draw
    standbyPower_kW: number;               // Standby power draw
    electricityCost_perKWh: number;         // Electricity rate
    energyCostPerHour: number;              // COMPUTED: kW × rate

    // ─── ULTRA-DETAILED ENVIRONMENTAL OVERHEAD ───────────────
    hvacConsumption_kW_perHour: number;     // Chillers/exhaust dedicated to this press
    airCompressor_kW_perHour: number;       // Pneumatic system draw
    uvLampPower_kW_perHour: number;         // Curing units power
    irDryerPower_kW_perHour: number;        // IR/Hot air knife power
    environmentalTax_perHour: number;       // Carbon footprint / VOC tax allocation

    // ─── PROFIT & PRICING STRATEGY ────────────────────────────
    profitMargin_percent: number;           // Default markup on this machine
    markupMethod: 'COST_PLUS' | 'MARGIN' | 'MULTIPLIER';
    markupValue: number;                    // The markup/margin/multiplier value
    rushSurcharge_percent: number;          // Rush job surcharge
    nightShiftSurcharge_percent: number;    // Night shift premium
    complexityMultiplier_base: number;      // Base complexity factor (1.0 = standard)

    // ─── RUN LENGTH & QUANTITY BREAKS ─────────────────────────
    minimumRunLength: number;               // Minimum quantity for this machine
    defaultMinRunLength: number;            // Default minimum (can be overridden per job)
    economicRunLength_min: number;          // Economically viable minimum
    economicRunLength_max: number;          // Economically viable maximum (before another machine is better)
    maxRunLength: number;                   // Physical maximum per run
    quantityBreaks: QuantityBreak[];        // Volume discount tiers

    // ─── CAPABILITIES & CONSTRAINTS ───────────────────────────
    supportedSubstrates: string[];          // Paper types, board, vinyl, etc.
    supportedFinishes: string[];            // Matte, gloss, satin, etc.
    maxDPI: number;                         // Maximum resolution
    registrationAccuracy_mm: number;        // Registration tolerance

    // ─── KINEMATIC & PHYSICAL CONSTRAINTS ────────────────────
    maxSubstrateRigidity_pts: number;       // Maximum board stiffness rating
    minCaliper_pts: number;                 // Minimum actionable caliper
    gripperBite_min_mm: number;             // Minimum edge required to pull sheet
    gripperBite_max_mm: number;             // Maximum gripper bite

    canPerfect: boolean;                    // Can print both sides in one pass
    canCollate: boolean;
    canStaple: boolean;
    canFold: boolean;
    maxFoldTypes: number;
    hasContinuousFeed: boolean;
    hasAutoFeeder: boolean;
    hasAutoPlateMounting: boolean;
    hasInlineQualityControl: boolean;
    hasColorManagement: boolean;
    iccProfilePath: string;                // Path to ICC profile

    // ─── VERSIONING & AUDIT ───────────────────────────────────
    readonly createdAt: string;             // ISO 8601
    readonly createdBy: string;             // User ID
    updatedAt: string;                      // ISO 8601
    updatedBy: string;                      // User ID
    version: number;                        // Optimistic concurrency control
    changeLog: MachineChangeLogEntry[];     // Full audit trail
    isArchived: boolean;
    archivedAt: string | null;
    archivedBy: string | null;
}

export interface QuantityBreak {
    fromQty: number;
    toQty: number | null;                   // null = unlimited
    discountPercent: number;
    pricePerUnitOverride: number | null;    // Optional fixed price override
}

export interface MachineChangeLogEntry {
    readonly timestamp: string;             // ISO 8601
    readonly userId: string;
    readonly action: 'CREATE' | 'UPDATE' | 'DUPLICATE' | 'ARCHIVE' | 'RESTORE' | 'IMPORT';
    readonly fieldChanged: string | null;
    readonly oldValue: string | null;
    readonly newValue: string | null;
    readonly batchId: string | null;        // Groups bulk import changes
}

/**
 * Default values factory — ensures every new machine has
 * financially safe, non-zero, non-destructive defaults.
 * A machine created with defaults must produce a VALID
 * (even if rough) cost estimate without any user edits.
 */
export function createDefaultMachine(overrides?: Partial<Machine>): Machine {
    const now = new Date().toISOString();

    const defaultMachine: Machine = {
        id: window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2),
        name: "New Profile",
        nickname: "New",
        manufacturer: "Unknown",
        model: "Unknown",
        serialNumber: "",
        type: MachineType.OFFSET_SHEETFED,
        status: MachineStatus.ACTIVE,
        tags: [],
        notes: "",

        maxSheetWidth_mm: 720,
        maxSheetHeight_mm: 1020,
        minSheetWidth_mm: 200,
        minSheetHeight_mm: 200,
        maxSubstrateThickness_microns: 1000,
        minSubstrateThickness_microns: 40,
        maxSubstrateWeight_gsm: 400,
        minSubstrateWeight_gsm: 60,
        gripperMargin_mm: 10,
        tailMargin_mm: 5,
        sideMargin_mm: 5,
        printableAreaWidth_mm: 710,
        printableAreaHeight_mm: 1005,

        colorMode: ColorMode.FULL_COLOR,
        maxColorsPerPass: 4,
        frontColors: 4,
        backColors: 0,
        hasCoatingUnit: false,
        coatingUnitCount: 0,
        hasVarnishUnit: false,
        supportsPantone: true,
        maxPantoneUnits: 2,
        inkType: InkType.OIL_BASED,

        ratedSpeed: 10000,
        ratedSpeedUnit: SpeedUnit.SHEETS_PER_HOUR,
        effectiveSpeed: 8000,
        effectiveSpeedUnit: SpeedUnit.SHEETS_PER_HOUR,
        speedReductionThickStock_percent: 20,
        speedReductionThinStock_percent: 15,
        speedReductionCoating_percent: 10,
        duplexSpeedFactor: 1.0,

        speedCurve_startup_percent: 60,
        speedCurve_startupDuration_mins: 10,
        speedReduction_heavyInkCoverage_percent: 15,
        speedReduction_perAdditionalColor_percent: 2,

        setupTimeBase_mins: 15,
        setupTimePerColor_mins: 5,
        plateChangeTime_mins: 2,
        blanketWashTime_mins: 5,
        impressionCylinderWashTime_mins: 5,
        inkRollerWashTime_mins: 15,
        fullWashupTime_mins: 30,
        colorMatchingTime_mins: 10,
        registerSetupTime_mins: 5,
        paperLoadTime_mins: 5,
        deliverySetupTime_mins: 5,
        dieCuttingSetupTime_mins: 0,
        jobProgrammingTime_mins: 0,
        calibrationTime_mins: 0,

        setupTime_sheetSizeChange_mins: 5,
        setupTime_caliperChange_mins: 3,
        setupTime_inkSystemWash_mins: 45,
        setupTime_coatingChange_mins: 15,
        setupTime_feederAdjustment_mins: 5,
        setupTime_deliveryAdjustment_mins: 5,
        autoPlateLoadingTime_perPlate_mins: 1.5,
        cip3DataProcessingTime_mins: 2,

        setupWasteSheets_base: 50,
        setupWasteSheets_perColor: 25,
        setupWasteSheets_perPantone: 50,
        setupWasteSheets_coatingUnit: 50,
        runningWaste_percent: 2.0,
        runningWaste_minimum: 100,
        binderyWaste_percent: 1.0,
        dieStrikeWaste_percent: 0,
        foldingWaste_percent: 0.5,
        cuttingWaste_percent: 0.5,
        testPrintWaste_sheets: 0,

        spoilage_jamRate_percent: 0.5,
        spoilage_colorVariation_percent: 1.0,
        setupWaste_caliperChange_sheets: 25,
        setupWaste_colorProfileChange_sheets: 100,

        hourlyRate: 150,
        hourlyRate_overtime: 225,
        hourlyRate_weekend: 300,
        impressionCost: 0,
        impressionCost_color: 0,
        impressionCost_bw: 0,
        impressionCost_spotVarnish: 0,
        fixedSetupCost: 0,
        minimumJobCharge: 50,
        totalHourlyCost: 200, // Reasonable default

        operatorsRequired: 1,
        operatorCostPerHour: 40,
        helpersRequired: 0,
        helperCostPerHour: 20,
        supervisorAllocation_percent: 10,
        supervisorCostPerHour: 60,
        totalLaborCostPerHour: 46, // 40 + (0) + (60 * 0.1)
        laborCostOvertime_multiplier: 1.5,
        laborCostWeekend_multiplier: 2.0,

        spaceOccupied_sqft: 500,
        rentPerSqft_monthly: 1.5,
        monthlyRentAllocation: 750, // 500 * 1.5
        dailyRentAllocation: 34.09, // 750 / 22
        hourlyRentAllocation: 4.26, // 34.09 / 8
        operatingDaysPerMonth: 22,
        operatingHoursPerDay: 8,
        utilization_percent: 75,

        inkCoverage_gramsPerSqm: 1.5,
        inkCost_perKg: 15,
        inkCost_perGram: 0.015,
        inkCost_pantoneMultiplier: 2.0,
        ctpRate_perPlate: 12,
        plateCost_each: 10,
        platesPerColorPerJob: 1,
        blanketCost_each: 100,
        blanketLifespan_impressions: 5000000,
        blanketCostPerImpression: 0.00002,
        rollerReplacementCost: 5000,
        rollerLifespan_impressions: 20000000,
        rollerCostPerImpression: 0.00025,
        washSolventCost_perLiter: 5,
        washSolventUsage_litersPerWash: 0.5,
        fountainSolutionCost_perLiter: 3,
        fountainSolutionUsage_litersPerHour: 0.1,
        tonerCost_perPage_bw: 0,
        tonerCost_perPage_color: 0,
        fusionOilCost_perHour: 0,
        maintenanceKitCost: 0,
        maintenanceKitInterval_impressions: 0,
        maintenanceKitCostPerImpression: 0,
        consumablesCostPerHour_aggregate: 0,

        fountainSolutionAdditiveCost_perLiter: 8,
        platePunchingCost_perPlate: 1.5,
        washRollerCloth_costPerMeter: 2.5,
        washRollerCloth_metersPerWash: 1.2,
        antiSetoffPowder_costPerKg: 12,
        antiSetoffPowder_kgPer10k_sheets: 0.5,

        purchasePrice: 100000,
        currentBookValue: 80000,
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
        usefulLife_years: 10,
        salvageValue: 10000,
        annualDepreciation: 9000, // (100000-10000)/10
        monthlyDepreciation: 750, // 9000/12
        hourlyDepreciation: 4.26, // 750 / (22*8)
        installationDate: now,
        warrantyExpiry: now,

        maintenanceInterval: MaintenanceInterval.MONTHLY,
        maintenanceIntervalValue: 1,
        averageMaintenanceDuration_hours: 4,
        maintenanceCostPerEvent: 500,
        annualMaintenanceBudget: 6000,
        plannedDowntime_hoursPerMonth: 4,
        unplannedDowntime_percent: 2.0,
        effectiveAvailability_percent: 95,

        powerConsumption_kW: 30,
        standbyPower_kW: 5,
        electricityCost_perKWh: 0.15,
        energyCostPerHour: 4.5, // 30 * 0.15

        hvacConsumption_kW_perHour: 15,
        airCompressor_kW_perHour: 7.5,
        uvLampPower_kW_perHour: 0,
        irDryerPower_kW_perHour: 10,
        environmentalTax_perHour: 0.25,

        profitMargin_percent: 25,
        markupMethod: 'COST_PLUS',
        markupValue: 25,
        rushSurcharge_percent: 50,
        nightShiftSurcharge_percent: 15,
        complexityMultiplier_base: 1.0,

        minimumRunLength: 100,
        defaultMinRunLength: 100,
        economicRunLength_min: 500,
        economicRunLength_max: 50000,
        maxRunLength: 1000000,
        quantityBreaks: [],

        supportedSubstrates: ['Coated', 'Uncoated', 'Board'],
        supportedFinishes: ['Gloss', 'Matte', 'Silk', 'Uncoated'],
        maxDPI: 2400,
        registrationAccuracy_mm: 0.1,

        maxSubstrateRigidity_pts: 24,
        minCaliper_pts: 2,
        gripperBite_min_mm: 8,
        gripperBite_max_mm: 12,

        canPerfect: false,
        canCollate: false,
        canStaple: false,
        canFold: false,
        maxFoldTypes: 0,
        hasContinuousFeed: true,
        hasAutoFeeder: true,
        hasAutoPlateMounting: true,
        hasInlineQualityControl: false,
        hasColorManagement: true,
        iccProfilePath: "",

        createdAt: now,
        createdBy: "system",
        updatedAt: now,
        updatedBy: "system",
        version: 1,
        changeLog: [{
            timestamp: now,
            userId: "system",
            action: "CREATE",
            fieldChanged: null,
            oldValue: null,
            newValue: null,
            batchId: null
        }],
        isArchived: false,
        archivedAt: null,
        archivedBy: null,
    };

    return { ...defaultMachine, ...overrides };
}

/**
 * Machine validation schema — runtime validation that
 * catches impossible/contradictory values before they
 * corrupt the calculation engine.
 */
export interface MachineValidationResult {
    isValid: boolean;
    errors: MachineValidationError[];
    warnings: MachineValidationWarning[];
}

export interface MachineValidationError {
    field: keyof Machine;
    code: string;
    message: string;
    severity: 'CRITICAL' | 'ERROR';
}

export interface MachineValidationWarning {
    field: keyof Machine;
    code: string;
    message: string;
    suggestedValue?: number | string;
}
