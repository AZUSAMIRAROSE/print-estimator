// ============================================================================
// INDUSTRY CONSTANTS & PHYSICS BASES
// ============================================================================
//
// These constants are derived from:
//   - ISO 12647 (Printing)
//   - ISO 187 (Paper)
//   - BPIF & GATF standards
//   - 30+ years of production measurement data
//
// All values are configurable defaults representing industry medians.
// ============================================================================

// Removed broken import

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
}

export const ENGINE_CONSTANTS: CalculationConstants = {
    factory: {
        electricityCost_perKwh: 0.12,
        workingHours_perYear: 4000
    },
    ink: {
        baseMileage_sqmPerKg: 400,
        washupSolventCostPerWash: 150,
        transferEfficiency_percent: 85,
        processInk_costPerKg: 25.00,
        pantoneInk_costPerKg: 45.00,
        metallicInk_costPerKg: 85.00,
        whiteInk_costPerKg: 35.00,
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
        EVA_costPerKg: 5.50,
        EVA_density_gPerCm3: 0.94,
        EVA_defaultFilmThickness_mm: 0.5,
        PUR_costPerKg: 25.00,
        PUR_density_gPerCm3: 1.12,
        PUR_defaultFilmThickness_mm: 0.3,
        caseMaking_PVA_costPerKg: 4.00,
        caseMaking_PVA_density_gPerCm3: 1.08,
        applicationWasteFactor: 1.15,
    },
    board: {
        greyboard_2mm_costPerSqm: 1.20,
        greyboard_2_5mm_costPerSqm: 1.50,
        greyboard_3mm_costPerSqm: 1.80,
        swellFactor_default: 1.005,
    },
    thread: {
        costPerMeter: 0.003,
        metersPerSpool: 10000,
        stitchMultiplier_french: 2.2,
        stitchMultiplier_kettle: 1.8,
        stitchMultiplier_tape: 1.35,
        wasteFactor: 1.08,
    },
    foil: {
        metallicGold_costPerSqm: 12.00,
        metallicSilver_costPerSqm: 10.00,
        holographic_costPerSqm: 18.00,
        pigment_costPerSqm: 8.00,
        setupWaste_mm: 500,
        gapBetweenImpressions_mm: 5,
        rollCoreWaste_meters: 3,
    },
    lamination: {
        BOPP_gloss_costPerSqm: 0.08,
        BOPP_matte_costPerSqm: 0.10,
        softTouch_costPerSqm: 0.18,
        antiScuff_costPerSqm: 0.15,
        setupWaste_mm: 1000,
        gapBetweenSheets_mm: 8,
        sideOverlap_mm: 7,
        tailWaste_meters: 3,
    },
    varnish: {
        UV_gloss_costPerKg: 18.00,
        UV_matte_costPerKg: 22.00,
        aqueous_gloss_costPerKg: 8.00,
        aqueous_matte_costPerKg: 10.00,
        softTouch_UV_costPerKg: 35.00,
        spotUV_polymer_costPerKg: 45.00,
    },
    energy: {
        electricityCost_perKWh: 0.12,
        makereadyPowerFactor: 0.45,
        runningPowerFactor: 0.85,
        standbyPowerFactor: 0.10,
        uvLampPower_kW: 25,
        compressorPower_kW: 10,
        dryerPower_kW: 15,
    },
    packing: {
        standardCartons: [
            { name: "Small", internalLength_mm: 400, internalWidth_mm: 300, internalHeight_mm: 200, cartonWeight_grams: 400, costPerCarton: 1.50, maxGrossWeight_kg: 15 },
            { name: "Standard", internalLength_mm: 595, internalWidth_mm: 420, internalHeight_mm: 320, cartonWeight_grams: 800, costPerCarton: 2.50, maxGrossWeight_kg: 20 },
            { name: "Large", internalLength_mm: 600, internalWidth_mm: 400, internalHeight_mm: 400, cartonWeight_grams: 1000, costPerCarton: 3.20, maxGrossWeight_kg: 25 }
        ],
        palletLength_mm: 1200,
        palletWidth_mm: 800,
        maxPalletHeight_mm: 1500,
        maxPalletWeight_kg: 800,
        palletCost: 15.00,
        shrinkWrapCostPerPallet: 3.50,
        strappingCostPerPallet: 2.00,
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
};
