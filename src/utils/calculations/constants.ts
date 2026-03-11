// ============================================================================
// INDUSTRY CONSTANTS & PHYSICS BASES — THOMSON PRESS CALIBRATED
// ============================================================================
//
// These constants are derived from:
//   - Thomson Press actual estimation Excel sheet (68-page PDF)
//   - ISO 12647 (Printing), ISO 187 (Paper)
//   - BPIF & GATF standards
//   - 30+ years of production measurement data
//
// CALIBRATION TARGET (per the Thomson Press Excel):
//   240×195mm hardcase, 32pp 4/4 150GSM Matt, 2000 copies
//   Production: Rs 31.31/copy, Paper: Rs 21.53/copy
//   Packing: Rs 4.08/copy, Freight: Rs 7.84/copy
//   GRAND TOTAL: Rs 65.25/copy = GBP 0.738 FOB Mumbai
// ============================================================================

export interface CartonSpecPhysics {
    name: string;
    internalLength_mm: number;
    internalWidth_mm: number;
    internalHeight_mm: number;
    cartonWeight_grams: number;
    costPerCarton: number;
    maxGrossWeight_kg: number;
}

export interface CalculationConstants {
    factory: {
        electricityCost_perKwh: number;
        workingHours_perYear: number;
    };
    ink: {
        baseMileage_sqmPerKg: number;
        washupSolventCostPerWash: number;
        transferEfficiency_percent: number;
        processInk_costPerKg: number;
        pantoneInk_costPerKg: number;
        metallicInk_costPerKg: number;
        whiteInk_costPerKg: number;
        defaultInkFilmThickness_offset_microns: number;
        defaultInkFilmThickness_digital_microns: number;
        defaultInkFilmThickness_flexo_microns: number;
        defaultInkFilmThickness_screen_microns: number;
        rollerTrainResidual_grams_perColor: number;
        specificGravity: {
            cyan: number;
            magenta: number;
            yellow: number;
            black: number;
            pantoneAvg: number;
            metallicAvg: number;
            white: number;
        };
        transferEfficiency: {
            coatedGloss: number;
            coatedMatte: number;
            coatedSilk: number;
            uncoated: number;
            uncoatedRough: number;
            recycled: number;
        };
    };
    adhesives: {
        EVA_costPerKg: number;
        EVA_density_gPerCm3: number;
        EVA_defaultFilmThickness_mm: number;
        PUR_costPerKg: number;
        PUR_density_gPerCm3: number;
        PUR_defaultFilmThickness_mm: number;
        caseMaking_PVA_costPerKg: number;
        caseMaking_PVA_density_gPerCm3: number;
        applicationWasteFactor: number;
    };
    board: {
        greyboard_2mm_costPerSqm: number;
        greyboard_2_5mm_costPerSqm: number;
        greyboard_3mm_costPerSqm: number;
        swellFactor_default: number;
    };
    thread: {
        costPerMeter: number;
        metersPerSpool: number;
        stitchMultiplier_french: number;
        stitchMultiplier_kettle: number;
        stitchMultiplier_tape: number;
        wasteFactor: number;
    };
    foil: {
        metallicGold_costPerSqm: number;
        metallicSilver_costPerSqm: number;
        holographic_costPerSqm: number;
        pigment_costPerSqm: number;
        setupWaste_mm: number;
        gapBetweenImpressions_mm: number;
        rollCoreWaste_meters: number;
    };
    lamination: {
        BOPP_gloss_costPerSqm: number;
        BOPP_matte_costPerSqm: number;
        softTouch_costPerSqm: number;
        antiScuff_costPerSqm: number;
        setupWaste_mm: number;
        gapBetweenSheets_mm: number;
        sideOverlap_mm: number;
        tailWaste_meters: number;
    };
    varnish: {
        UV_gloss_costPerKg: number;
        UV_matte_costPerKg: number;
        aqueous_gloss_costPerKg: number;
        aqueous_matte_costPerKg: number;
        softTouch_UV_costPerKg: number;
        spotUV_polymer_costPerKg: number;
    };
    energy: {
        electricityCost_perKWh: number;
        makereadyPowerFactor: number;
        runningPowerFactor: number;
        standbyPowerFactor: number;
        uvLampPower_kW: number;
        compressorPower_kW: number;
        dryerPower_kW: number;
    };
    packing: {
        standardCartons: CartonSpecPhysics[];
        palletLength_mm: number;
        palletWidth_mm: number;
        maxPalletHeight_mm: number;
        maxPalletWeight_kg: number;
        palletCost: number;
        shrinkWrapCostPerPallet: number;
        strappingCostPerPallet: number;
        voidFillCost_perCm3: number;
    };
    freight: {
        volumetricDivisor_air: number;
        volumetricDivisor_courier: number;
        cbmToKg_air: number;
        cbmToKg_road: number;
        defaultFuelSurcharge_percent: number;
        defaultInsuranceRate_percent: number;
    };
    paper: {
        standardMoistureContent_percent: number;
        moistureCoeff_uncoated: number;
        moistureCoeff_coated: number;
        moistureCoeff_board: number;
        standardEquilibriumRH_percent: number;
    };
    spoilage: {
        offset_printing_base_percent: number;
        digital_printing_base_percent: number;
        folding_base_percent: number;
        collating_base_percent: number;
        saddleStitch_base_percent: number;
        perfectBind_base_percent: number;
        caseBind_base_percent: number;
        sewing_base_percent: number;
        lamination_base_percent: number;
        uvVarnish_base_percent: number;
        foilStamping_base_percent: number;
        embossing_base_percent: number;
        dieCutting_base_percent: number;
        guillotineTrimming_base_percent: number;
        scoring_base_percent: number;
        perforating_base_percent: number;
    };
    // ── Thomson Press specific binding rates ──
    thomsonPress: {
        hardcaseBinding: {
            labourPerCopy: number;
            gluePerCopy: number;
            caseLaminationFilmPerCopy: number;
            sewingRatePerCopyPerSection: number;
            foldingRatePerCopy: number;
            saddleStitchPerCopy: number;
            htBandPerCopy: number;
            ribbonPerCopy: number;
            giltEdgingPerCopy: number;
            foamPaddingPerCopy: number;
        };
        board: {
            imported_ratePerKg: number;
            indian_ratePerKg: number;
            imported_sheetWidth_inch: number;
            imported_sheetHeight_inch: number;
            imported_3mm_ratePerSheet: number;
            imported_3mm_weightPerSheet_kg: number;
        };
        perfectBinding: {
            lessThan8pp: number;
            from8to16pp: number;
            from16to32pp: number;
            from32ppPlus: number;
        };
        sewnPB: {
            lessThan8pp: number;
            from8to16pp: number;
            from16to32pp: number;
            from32ppPlus: number;
        };
        lamination: {
            glossPerCopy: number;
            mattPerCopy: number;
        };
        spotUV: {
            perCopy: number;
        };
        prePress: {
            epsonProofRate: number;
            hpProofRate: number;
        };
        packing: {
            cartonCost: number;
            palletCost: number;
            stretchWrapPerCopy: number;
            cartonsPerPallet: number;
            maxCartonWeight_grams: number;
        };
        exchangeRates: {
            USD: number;
            GBP: number;
            EUR: number;
        };
    };
}

export const ENGINE_CONSTANTS: CalculationConstants = {
    factory: {
        electricityCost_perKwh: 8.5,  // INR per kWh (Indian rates)
        workingHours_perYear: 4000
    },
    ink: {
        baseMileage_sqmPerKg: 400,
        washupSolventCostPerWash: 150,
        transferEfficiency_percent: 85,
        processInk_costPerKg: 500,     // INR per kg CMYK ink
        pantoneInk_costPerKg: 800,
        metallicInk_costPerKg: 1500,
        whiteInk_costPerKg: 600,
        defaultInkFilmThickness_offset_microns: 1.0,
        defaultInkFilmThickness_digital_microns: 5.0,
        defaultInkFilmThickness_flexo_microns: 4.0,
        defaultInkFilmThickness_screen_microns: 20.0,
        rollerTrainResidual_grams_perColor: 150,
        specificGravity: {
            cyan: 1.08,
            magenta: 1.15,
            yellow: 1.02,
            black: 1.18,
            pantoneAvg: 1.12,
            metallicAvg: 1.75,
            white: 2.00,
        },
        transferEfficiency: {
            coatedGloss: 0.73,
            coatedMatte: 0.67,
            coatedSilk: 0.70,
            uncoated: 0.60,
            uncoatedRough: 0.52,
            recycled: 0.50,
        },
    },
    adhesives: {
        EVA_costPerKg: 180,    // INR values
        EVA_density_gPerCm3: 0.94,
        EVA_defaultFilmThickness_mm: 0.5,
        PUR_costPerKg: 450,
        PUR_density_gPerCm3: 1.12,
        PUR_defaultFilmThickness_mm: 0.3,
        caseMaking_PVA_costPerKg: 120,
        caseMaking_PVA_density_gPerCm3: 1.08,
        applicationWasteFactor: 1.15,
    },
    board: {
        greyboard_2mm_costPerSqm: 80,    // INR
        greyboard_2_5mm_costPerSqm: 100,
        greyboard_3mm_costPerSqm: 120,
        swellFactor_default: 1.005,
    },
    thread: {
        costPerMeter: 0.05,   // INR 0.05/m = 5 paise
        metersPerSpool: 10000,
        stitchMultiplier_french: 2.2,
        stitchMultiplier_kettle: 1.8,
        stitchMultiplier_tape: 1.35,
        wasteFactor: 1.08,
    },
    foil: {
        metallicGold_costPerSqm: 1200,   // INR
        metallicSilver_costPerSqm: 1000,
        holographic_costPerSqm: 1800,
        pigment_costPerSqm: 800,
        setupWaste_mm: 500,
        gapBetweenImpressions_mm: 5,
        rollCoreWaste_meters: 3,
    },
    lamination: {
        BOPP_gloss_costPerSqm: 8,   // INR
        BOPP_matte_costPerSqm: 10,
        softTouch_costPerSqm: 18,
        antiScuff_costPerSqm: 15,
        setupWaste_mm: 1000,
        gapBetweenSheets_mm: 8,
        sideOverlap_mm: 7,
        tailWaste_meters: 3,
    },
    varnish: {
        UV_gloss_costPerKg: 1800,   // INR
        UV_matte_costPerKg: 2200,
        aqueous_gloss_costPerKg: 800,
        aqueous_matte_costPerKg: 1000,
        softTouch_UV_costPerKg: 3500,
        spotUV_polymer_costPerKg: 4500,
    },
    energy: {
        electricityCost_perKWh: 8.5,   // INR per kWh
        makereadyPowerFactor: 0.45,
        runningPowerFactor: 0.85,
        standbyPowerFactor: 0.10,
        uvLampPower_kW: 25,
        compressorPower_kW: 10,
        dryerPower_kW: 15,
    },
    packing: {
        standardCartons: [
            { name: "Small", internalLength_mm: 400, internalWidth_mm: 300, internalHeight_mm: 200, cartonWeight_grams: 400, costPerCarton: 45, maxGrossWeight_kg: 14 },
            { name: "Standard", internalLength_mm: 595, internalWidth_mm: 420, internalHeight_mm: 320, cartonWeight_grams: 800, costPerCarton: 65, maxGrossWeight_kg: 14 },
            { name: "Large", internalLength_mm: 600, internalWidth_mm: 400, internalHeight_mm: 400, cartonWeight_grams: 1000, costPerCarton: 85, maxGrossWeight_kg: 14 }
        ],
        palletLength_mm: 1200,
        palletWidth_mm: 1000,
        maxPalletHeight_mm: 1500,
        maxPalletWeight_kg: 800,
        palletCost: 1350,           // Rs 1,350 per pallet (Thomson Press)
        shrinkWrapCostPerPallet: 250,
        strappingCostPerPallet: 80,
        voidFillCost_perCm3: 0.0002,
    },
    freight: {
        volumetricDivisor_air: 6000,
        volumetricDivisor_courier: 5000,
        cbmToKg_air: 167,
        cbmToKg_road: 333,
        defaultFuelSurcharge_percent: 15,
        defaultInsuranceRate_percent: 0.5,
    },
    paper: {
        standardMoistureContent_percent: 5.0,
        moistureCoeff_uncoated: 7.0,
        moistureCoeff_coated: 3.5,
        moistureCoeff_board: 5.0,
        standardEquilibriumRH_percent: 50,
    },
    spoilage: {
        offset_printing_base_percent: 2.5,
        digital_printing_base_percent: 0.5,
        folding_base_percent: 1.5,
        collating_base_percent: 1.0,
        saddleStitch_base_percent: 1.0,
        perfectBind_base_percent: 2.0,
        caseBind_base_percent: 2.5,
        sewing_base_percent: 1.0,
        lamination_base_percent: 3.0,
        uvVarnish_base_percent: 1.5,
        foilStamping_base_percent: 2.0,
        embossing_base_percent: 2.5,
        dieCutting_base_percent: 2.0,
        guillotineTrimming_base_percent: 0.5,
        scoring_base_percent: 0.5,
        perforating_base_percent: 0.5,
    },
    // ── THOMSON PRESS EXACT RATES (from 68-page PDF) ──
    thomsonPress: {
        hardcaseBinding: {
            labourPerCopy: 3.75,
            gluePerCopy: 2.10,
            caseLaminationFilmPerCopy: 0.55,
            sewingRatePerCopyPerSection: 0.11,
            foldingRatePerCopy: 0.04,
            saddleStitchPerCopy: 0.25,
            htBandPerCopy: 0.18,
            ribbonPerCopy: 1.00,
            giltEdgingPerCopy: 2.503,
            foamPaddingPerCopy: 8.84,
        },
        board: {
            imported_ratePerKg: 70,
            indian_ratePerKg: 20,
            imported_sheetWidth_inch: 31,
            imported_sheetHeight_inch: 41,
            imported_3mm_ratePerSheet: 112,
            imported_3mm_weightPerSheet_kg: 1.599,
        },
        perfectBinding: {
            lessThan8pp: 15,
            from8to16pp: 10.75,
            from16to32pp: 7.5,
            from32ppPlus: 5.5,
        },
        sewnPB: {
            lessThan8pp: 17.25,
            from8to16pp: 13,
            from16to32pp: 8.5,
            from32ppPlus: 7.5,
        },
        lamination: {
            glossPerCopy: 0.78,
            mattPerCopy: 0.78,
        },
        spotUV: {
            perCopy: 1.28,
        },
        prePress: {
            epsonProofRate: 116,
            hpProofRate: 36,
        },
        packing: {
            cartonCost: 65,
            palletCost: 1350,
            stretchWrapPerCopy: 0.91,
            cartonsPerPallet: 32,
            maxCartonWeight_grams: 14000,
        },
        exchangeRates: {
            USD: 90,
            GBP: 118,
            EUR: 104,
        },
    },
};

// ── THOMSON PRESS IMPRESSION RATE TABLE ──
// Rates are per 1000 impressions, in RUPEES (converted from paise in the Excel)
// Indexed by paper size code and impression quantity range
export interface TPImpressionRate {
    minImpressions: number;
    maxImpressions: number;
    rates: {
        "28x38": { fourColor: number; twoColor: number; oneColor: number };
        "23x36": { fourColor: number; twoColor: number; oneColor: number };
        "22x28": { fourColor: number; twoColor: number; oneColor: number };
        "20x30": { fourColor: number; twoColor: number; oneColor: number };
        "18x23": { fourColor: number; twoColor: number; oneColor: number };
    };
}

// NOTE: These rates from the Excel are per 1000 impressions in RUPEES
// The PDF shows values like 170, 207 etc — these ARE the per-1000 rates in Rupees
export const TP_IMPRESSION_RATES: TPImpressionRate[] = [
    {
        minImpressions: 0, maxImpressions: 500,
        rates: {
            "28x38": { fourColor: 170, twoColor: 187, oneColor: 187 },
            "23x36": { fourColor: 207, twoColor: 131, oneColor: 131 },
            "22x28": { fourColor: 166, twoColor: 166, oneColor: 166 },
            "20x30": { fourColor: 153, twoColor: 153, oneColor: 153 },
            "18x23": { fourColor: 141, twoColor: 141, oneColor: 141 },
        },
    },
    {
        minImpressions: 501, maxImpressions: 750,
        rates: {
            "28x38": { fourColor: 161, twoColor: 176, oneColor: 176 },
            "23x36": { fourColor: 192, twoColor: 128, oneColor: 128 },
            "22x28": { fourColor: 154, twoColor: 154, oneColor: 154 },
            "20x30": { fourColor: 139, twoColor: 139, oneColor: 139 },
            "18x23": { fourColor: 130, twoColor: 130, oneColor: 130 },
        },
    },
    {
        minImpressions: 751, maxImpressions: 1000,
        rates: {
            "28x38": { fourColor: 158, twoColor: 171, oneColor: 171 },
            "23x36": { fourColor: 186, twoColor: 125, oneColor: 125 },
            "22x28": { fourColor: 148, twoColor: 148, oneColor: 148 },
            "20x30": { fourColor: 133, twoColor: 133, oneColor: 133 },
            "18x23": { fourColor: 125, twoColor: 125, oneColor: 125 },
        },
    },
    {
        minImpressions: 1001, maxImpressions: 1500,
        rates: {
            "28x38": { fourColor: 133, twoColor: 150, oneColor: 150 },
            "23x36": { fourColor: 156, twoColor: 108, oneColor: 108 },
            "22x28": { fourColor: 124, twoColor: 124, oneColor: 124 },
            "20x30": { fourColor: 124, twoColor: 124, oneColor: 124 },
            "18x23": { fourColor: 104, twoColor: 104, oneColor: 104 },
        },
    },
    {
        minImpressions: 1501, maxImpressions: 2000,
        rates: {
            "28x38": { fourColor: 131, twoColor: 146, oneColor: 146 },
            "23x36": { fourColor: 148, twoColor: 100, oneColor: 100 },
            "22x28": { fourColor: 119, twoColor: 119, oneColor: 119 },
            "20x30": { fourColor: 112, twoColor: 112, oneColor: 112 },
            "18x23": { fourColor: 100, twoColor: 100, oneColor: 100 },
        },
    },
    {
        minImpressions: 2001, maxImpressions: 3000,
        rates: {
            "28x38": { fourColor: 129, twoColor: 144, oneColor: 144 },
            "23x36": { fourColor: 146, twoColor: 81, oneColor: 81 },
            "22x28": { fourColor: 117, twoColor: 117, oneColor: 117 },
            "20x30": { fourColor: 97, twoColor: 97, oneColor: 97 },
            "18x23": { fourColor: 98, twoColor: 98, oneColor: 98 },
        },
    },
    {
        minImpressions: 3001, maxImpressions: 4000,
        rates: {
            "28x38": { fourColor: 99, twoColor: 121, oneColor: 121 },
            "23x36": { fourColor: 111, twoColor: 72, oneColor: 72 },
            "22x28": { fourColor: 89, twoColor: 89, oneColor: 89 },
            "20x30": { fourColor: 79, twoColor: 79, oneColor: 79 },
            "18x23": { fourColor: 75, twoColor: 75, oneColor: 75 },
        },
    },
    {
        minImpressions: 4001, maxImpressions: 5000,
        rates: {
            "28x38": { fourColor: 99, twoColor: 120, oneColor: 120 },
            "23x36": { fourColor: 110, twoColor: 70, oneColor: 70 },
            "22x28": { fourColor: 88, twoColor: 88, oneColor: 88 },
            "20x30": { fourColor: 77, twoColor: 77, oneColor: 77 },
            "18x23": { fourColor: 74, twoColor: 74, oneColor: 74 },
        },
    },
    {
        minImpressions: 5001, maxImpressions: 6000,
        rates: {
            "28x38": { fourColor: 98, twoColor: 118, oneColor: 118 },
            "23x36": { fourColor: 108, twoColor: 66, oneColor: 66 },
            "22x28": { fourColor: 86, twoColor: 86, oneColor: 86 },
            "20x30": { fourColor: 75, twoColor: 75, oneColor: 75 },
            "18x23": { fourColor: 72, twoColor: 72, oneColor: 72 },
        },
    },
    {
        minImpressions: 6001, maxImpressions: 7000,
        rates: {
            "28x38": { fourColor: 98, twoColor: 118, oneColor: 118 },
            "23x36": { fourColor: 107, twoColor: 66, oneColor: 66 },
            "22x28": { fourColor: 86, twoColor: 86, oneColor: 86 },
            "20x30": { fourColor: 75, twoColor: 75, oneColor: 75 },
            "18x23": { fourColor: 72, twoColor: 72, oneColor: 72 },
        },
    },
    {
        minImpressions: 7001, maxImpressions: 8000,
        rates: {
            "28x38": { fourColor: 98, twoColor: 118, oneColor: 118 },
            "23x36": { fourColor: 107, twoColor: 66, oneColor: 66 },
            "22x28": { fourColor: 86, twoColor: 86, oneColor: 86 },
            "20x30": { fourColor: 74, twoColor: 74, oneColor: 74 },
            "18x23": { fourColor: 72, twoColor: 72, oneColor: 72 },
        },
    },
    {
        minImpressions: 8001, maxImpressions: 10000,
        rates: {
            "28x38": { fourColor: 98, twoColor: 118, oneColor: 118 },
            "23x36": { fourColor: 107, twoColor: 65, oneColor: 65 },
            "22x28": { fourColor: 85, twoColor: 85, oneColor: 85 },
            "20x30": { fourColor: 74, twoColor: 74, oneColor: 74 },
            "18x23": { fourColor: 72, twoColor: 72, oneColor: 72 },
        },
    },
    {
        minImpressions: 10001, maxImpressions: 15000,
        rates: {
            "28x38": { fourColor: 98, twoColor: 117, oneColor: 117 },
            "23x36": { fourColor: 106, twoColor: 64, oneColor: 64 },
            "22x28": { fourColor: 85, twoColor: 85, oneColor: 85 },
            "20x30": { fourColor: 74, twoColor: 74, oneColor: 74 },
            "18x23": { fourColor: 71, twoColor: 71, oneColor: 71 },
        },
    },
    {
        minImpressions: 15001, maxImpressions: 20000,
        rates: {
            "28x38": { fourColor: 97, twoColor: 117, oneColor: 117 },
            "23x36": { fourColor: 106, twoColor: 64, oneColor: 64 },
            "22x28": { fourColor: 85, twoColor: 85, oneColor: 85 },
            "20x30": { fourColor: 72, twoColor: 72, oneColor: 72 },
            "18x23": { fourColor: 71, twoColor: 71, oneColor: 71 },
        },
    },
    {
        minImpressions: 20001, maxImpressions: 50000,
        rates: {
            "28x38": { fourColor: 97, twoColor: 117, oneColor: 117 },
            "23x36": { fourColor: 106, twoColor: 64, oneColor: 64 },
            "22x28": { fourColor: 85, twoColor: 85, oneColor: 85 },
            "20x30": { fourColor: 72, twoColor: 72, oneColor: 72 },
            "18x23": { fourColor: 71, twoColor: 71, oneColor: 71 },
        },
    },
    {
        minImpressions: 50001, maxImpressions: 999999999,
        rates: {
            "28x38": { fourColor: 169, twoColor: 169, oneColor: 169 },
            "23x36": { fourColor: 151, twoColor: 151, oneColor: 151 },
            "22x28": { fourColor: 151, twoColor: 151, oneColor: 151 },
            "20x30": { fourColor: 151, twoColor: 151, oneColor: 151 },
            "18x23": { fourColor: 97, twoColor: 97, oneColor: 97 },
        },
    },
];

// ── THOMSON PRESS WASTAGE CHART ──
// Machine-Ready wastage per COLOUR (sheets wasted for each colour during setup)
export interface TPMachineReadyWastage {
    machineCode: string;
    fourColor: number;
    twoColor: number;
    oneColor: number;
}

export const TP_MACHINE_READY_WASTAGE: TPMachineReadyWastage[] = [
    { machineCode: "FAV", fourColor: 12.5, twoColor: 7.5, oneColor: 1 },
    { machineCode: "REK", fourColor: 9, twoColor: 8.5, oneColor: 0 },
    { machineCode: "RMGT", fourColor: 10, twoColor: 7.5, oneColor: 0 },
];

// Wastage by impression count (percentage of total impressions)
export interface TPWastageByImpressions {
    maxImpressions: number;
    wastagePercent: number;
}

export const TP_WASTAGE_BY_IMPRESSIONS: TPWastageByImpressions[] = [
    { maxImpressions: 1000, wastagePercent: 25 },
    { maxImpressions: 2000, wastagePercent: 15 },
    { maxImpressions: 3000, wastagePercent: 11 },
    { maxImpressions: 4000, wastagePercent: 10 },
    { maxImpressions: 5000, wastagePercent: 9 },
    { maxImpressions: 6000, wastagePercent: 8 },
    { maxImpressions: 7000, wastagePercent: 7 },
    { maxImpressions: 8000, wastagePercent: 7 },
    { maxImpressions: 9000, wastagePercent: 7 },
    { maxImpressions: 10000, wastagePercent: 7 },
    { maxImpressions: 12000, wastagePercent: 6 },
    { maxImpressions: 15000, wastagePercent: 6 },
    { maxImpressions: 17000, wastagePercent: 5 },
    { maxImpressions: 21000, wastagePercent: 5 },
    { maxImpressions: 999999999, wastagePercent: 5 },
];

// ── CTP + Printing Plate Rates (Thomson Press exact) ──
export interface TPPlateRate {
    machineCode: string;
    ctpRatePerPlate: number;      // CTP plate making cost per plate
    printingRatePerPlate: number;  // Printing plate rate (per plate per impression run)
}

export const TP_PLATE_RATES: TPPlateRate[] = [
    { machineCode: "FAV", ctpRatePerPlate: 247, printingRatePerPlate: 131 },
    { machineCode: "REK", ctpRatePerPlate: 403, printingRatePerPlate: 148 },
    { machineCode: "RMGT", ctpRatePerPlate: 271, printingRatePerPlate: 146 },
];

// ── Bible/Thin Paper Surcharges ──
export interface TPBiblePaperSurcharge {
    minGSM: number;
    maxGSM: number;
    printingFoldingSurchargePercent: number;
    extraWastagePercent: number;
}

export const TP_BIBLE_PAPER_SURCHARGES: TPBiblePaperSurcharge[] = [
    { minGSM: 0, maxGSM: 35, printingFoldingSurchargePercent: 30, extraWastagePercent: 5 },
    { minGSM: 36, maxGSM: 40, printingFoldingSurchargePercent: 12, extraWastagePercent: 3 },
    { minGSM: 41, maxGSM: 45, printingFoldingSurchargePercent: 8, extraWastagePercent: 2 },
];

// Helper: look up impression rate
// CRITICAL: Uses FLOOR bracket selection (largest bracket where minImpressions <= totalImpressions)
// This matches Excel VLOOKUP approximate match behavior exactly.
// Example: impressions = 6200, brackets: ...5001-6000, 6001-7000, 7001-8000
// FLOOR result → 6001-7000 bracket (correct)
// CEILING would → wrong bracket, NEAREST → also wrong
export function lookupTPImpressionRate(
    totalImpressions: number,
    paperSizeCode: string,
    maxColors: number
): number {
    // FLOOR bracket: walk from highest to lowest, find first where minImpressions <= totalImpressions
    let selectedEntry: TPImpressionRate | null = null;
    for (let i = TP_IMPRESSION_RATES.length - 1; i >= 0; i--) {
        if (totalImpressions >= TP_IMPRESSION_RATES[i].minImpressions) {
            selectedEntry = TP_IMPRESSION_RATES[i];
            break;
        }
    }

    // Fallback to first bracket if totalImpressions is negative or zero
    if (!selectedEntry) {
        selectedEntry = TP_IMPRESSION_RATES[0];
    }

    return getColorRate(selectedEntry, paperSizeCode, maxColors);
}

function getColorRate(entry: TPImpressionRate, paperSizeCode: string, maxColors: number): number {
    // Normalize paper size code
    const sizeKey = normalizePaperSizeKey(paperSizeCode);
    const sizeRates = entry.rates[sizeKey as keyof typeof entry.rates];
    if (!sizeRates) {
        // Default to 23x36 if size not found
        const fallback = entry.rates["23x36"];
        return maxColors >= 4 ? fallback.fourColor : maxColors >= 2 ? fallback.twoColor : fallback.oneColor;
    }
    return maxColors >= 4 ? sizeRates.fourColor : maxColors >= 2 ? sizeRates.twoColor : sizeRates.oneColor;
}

function normalizePaperSizeKey(code: string): string {
    const c = code.replace(/\s/g, '').toLowerCase();
    if (c.includes('28') && (c.includes('38') || c.includes('40'))) return "28x38";
    if (c.includes('23') && c.includes('36')) return "23x36";
    if (c.includes('22') && c.includes('28')) return "22x28";
    if (c.includes('20') && c.includes('30')) return "20x30";
    if (c.includes('18') && c.includes('23')) return "18x23";
    if (c.includes('25') && c.includes('36')) return "23x36"; // 25x36 uses 23x36 rates
    if (c.includes('24') && c.includes('36')) return "23x36"; // 24x36 uses 23x36 rates
    if (c.includes('30') && c.includes('39')) return "28x38"; // 30x39 uses 28x38 rates
    return "23x36"; // Default
}

// Helper: look up wastage percentage
export function lookupTPWastagePercent(totalImpressions: number): number {
    for (const entry of TP_WASTAGE_BY_IMPRESSIONS) {
        if (totalImpressions <= entry.maxImpressions) {
            return entry.wastagePercent;
        }
    }
    return 5; // Default 5% for very large runs
}

// Helper: look up machine-ready wastage
export function lookupTPMachineReadyWastage(machineCode: string, maxColors: number): number {
    const code = machineCode.toUpperCase();
    let entry = TP_MACHINE_READY_WASTAGE.find(e => code.includes(e.machineCode));
    if (!entry) entry = TP_MACHINE_READY_WASTAGE[2]; // Default to RMGT
    return maxColors >= 4 ? entry.fourColor : maxColors >= 2 ? entry.twoColor : entry.oneColor;
}

// Helper: look up plate rates
export function lookupTPPlateRates(machineCode: string): TPPlateRate {
    const code = machineCode.toUpperCase();
    let entry = TP_PLATE_RATES.find(e => code.includes(e.machineCode));
    if (!entry) entry = TP_PLATE_RATES[2]; // Default to RMGT
    return entry;
}
