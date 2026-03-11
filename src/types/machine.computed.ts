import { Machine } from './machine.types';

export function recalculateMachineComputedFields(machine: Machine): Machine {
    const updated = { ...machine };

    // Total Labor Cost
    updated.totalLaborCostPerHour =
        (updated.operatorsRequired * updated.operatorCostPerHour) +
        (updated.helpersRequired * updated.helperCostPerHour) +
        ((updated.supervisorAllocation_percent / 100) * updated.supervisorCostPerHour);

    // Rent Allocation
    updated.monthlyRentAllocation = updated.spaceOccupied_sqft * updated.rentPerSqft_monthly;
    updated.dailyRentAllocation = updated.operatingDaysPerMonth > 0 ? updated.monthlyRentAllocation / updated.operatingDaysPerMonth : 0;
    updated.hourlyRentAllocation = updated.operatingHoursPerDay > 0 ? updated.dailyRentAllocation / updated.operatingHoursPerDay : 0;

    // Consumables
    updated.inkCost_perGram = updated.inkCost_perKg / 1000;
    updated.blanketCostPerImpression = updated.blanketLifespan_impressions > 0 ? updated.blanketCost_each / updated.blanketLifespan_impressions : 0;
    updated.rollerCostPerImpression = updated.rollerLifespan_impressions > 0 ? updated.rollerReplacementCost / updated.rollerLifespan_impressions : 0;
    updated.maintenanceKitCostPerImpression = updated.maintenanceKitInterval_impressions > 0 ? updated.maintenanceKitCost / updated.maintenanceKitInterval_impressions : 0;

    // Aggregate consumables per hour (rough estimate using effective speed)
    const advancedPowderCost = (updated.effectiveSpeed / 10000) * updated.antiSetoffPowder_kgPer10k_sheets * updated.antiSetoffPowder_costPerKg;
    const washClothCost_perHour = (updated.washRollerCloth_metersPerWash * updated.washRollerCloth_costPerMeter) / 4; // Assume wash every 4 hours for rough estimate

    updated.consumablesCostPerHour_aggregate =
        (updated.effectiveSpeed * updated.blanketCostPerImpression) +
        (updated.effectiveSpeed * updated.rollerCostPerImpression) +
        ((updated.fountainSolutionCost_perLiter + updated.fountainSolutionAdditiveCost_perLiter) * updated.fountainSolutionUsage_litersPerHour) +
        updated.fusionOilCost_perHour + advancedPowderCost + washClothCost_perHour;

    // Depreciation
    updated.annualDepreciation = updated.usefulLife_years > 0 ? (updated.purchasePrice - updated.salvageValue) / updated.usefulLife_years : 0;
    updated.monthlyDepreciation = updated.annualDepreciation / 12;
    const hoursPerYear = updated.operatingDaysPerMonth * updated.operatingHoursPerDay * 12;
    updated.hourlyDepreciation = hoursPerYear > 0 ? updated.annualDepreciation / hoursPerYear : 0;

    // Energy & Environment
    updated.energyCostPerHour = (updated.powerConsumption_kW + updated.hvacConsumption_kW_perHour + updated.airCompressor_kW_perHour + updated.uvLampPower_kW_perHour + updated.irDryerPower_kW_perHour) * updated.electricityCost_perKWh;

    updated.totalHourlyCost =
        updated.totalLaborCostPerHour +
        updated.hourlyRentAllocation +
        updated.hourlyDepreciation +
        updated.energyCostPerHour +
        updated.environmentalTax_perHour +
        updated.consumablesCostPerHour_aggregate;

    return updated;
}
