import { Machine } from '../types/machine.types';

/**
 * Calculates the total cost for a specific machining job.
 * 
 * Formula: Setup Cost + (Impressions * Cost Per Impression) + Labor + Energy
 */
export function calculateJobMachiningCost(
    machine: Machine,
    impressions: number,
    numColors: number,
    isDoubleSided: boolean
): {
    setupCost: number;
    runningCost: number;
    laborCost: number;
    energyCost: number;
    totalCost: number;
    durationHours: number;
} {
    // 1. Setup (Make-Ready)
    const baseMakeReadyTimeHours = machine.setupTimeBase_mins / 60;
    const colorMultiplier = numColors / machine.maxColorsPerPass; // Simplified
    const actualSetupTime = baseMakeReadyTimeHours * (1 + colorMultiplier);
    const setupCost = actualSetupTime * machine.totalHourlyCost;

    // 2. Running Time
    const effectiveSpeed = machine.effectiveSpeed; // SPH
    const actualImpressions = isDoubleSided && !machine.canPerfect
        ? impressions * 2
        : impressions;

    const runningTimeHours = effectiveSpeed > 0 ? actualImpressions / effectiveSpeed : 0;

    // 3. Components
    const runningCost = runningTimeHours * (machine.totalHourlyCost - machine.totalLaborCostPerHour);
    const laborCost = (actualSetupTime + runningTimeHours) * machine.totalLaborCostPerHour;
    const energyCost = (actualSetupTime + runningTimeHours) * machine.energyCostPerHour;

    const totalCost = setupCost + (runningTimeHours * machine.totalHourlyCost);

    return {
        setupCost,
        runningCost,
        laborCost,
        energyCost,
        totalCost,
        durationHours: actualSetupTime + runningTimeHours
    };
}

/**
 * Calculates plate/CTP costs.
 */
export function calculatePlateCost(
    machine: Machine,
    numPlates: number
): {
    materialCost: number;
    ctpCost: number;
    totalCost: number;
} {
    const materialCost = numPlates * machine.plateCost_each;
    const ctpCost = numPlates * machine.ctpRate_perPlate;

    return {
        materialCost,
        ctpCost,
        totalCost: materialCost + ctpCost
    };
}
