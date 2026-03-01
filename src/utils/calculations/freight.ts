// ============================================================================
// FREIGHT & LOGISTICS COST ENGINE (GOD-LEVEL)
// ============================================================================
// Model: Directed Acyclic Graph Node
// 
// Computes ultimate delivery costs based on constraints:
// - Volumetric (Dimensional) Weight vs Actual Gross Weight comparison
// - Multi-zone distance tariffs (Fuel surcharge, toll multipliers)
// - Transport mode selection (FTL, LTL, Air, Courier)
// - Last-mile delivery complications
// ============================================================================

import type { PackingResult } from "./packing";

export interface FreightRouteConfig {
  distance_km: number;
  zone: 'LOCAL' | 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL';
  mode: 'ROAD_FTL' | 'ROAD_LTL' | 'AIR' | 'SEA' | 'COURIER';
  isExpress: boolean;
  requiresTailift: boolean;
}

export interface FreightCalculationResult {
  chargeableWeight_kg: number;
  volumetricWeight_kg: number;
  actualGrossWeight_kg: number;

  baseTariffCost: number;
  fuelSurcharge_percent: number;
  fuelSurchargeAmount: number;
  accessorialCharges: number; // Tailift, tolls, residential

  transportModeSelected: string;
  totalFreightCost: number;
}

export function calculateFreightCostGodLevel(
  packingData: PackingResult,
  routeMap: FreightRouteConfig
): FreightCalculationResult {

  const actualWt = packingData.totalConsignmentWeight_kg;

  // 1. Dimensional / Volumetric Weight
  // Air divisor: Usually 5000 (1 cbm = 200kg)
  // Road divisor: Usually 4000 (1 cbm = 250kg)
  // Courier/Express: Usually 5000
  let dimDivisorFactor = 250; // Road = 250kg / CBM
  if (routeMap.mode === 'AIR' || routeMap.mode === 'COURIER') {
    dimDivisorFactor = 200; // 200kg / CBM
  }

  const volumetricWt = packingData.totalConsignmentVolume_cbm * dimDivisorFactor;

  // Chargeable is heavier of the two
  let chargeableWt = Math.max(actualWt, volumetricWt);

  // 2. Select logical mode if unconstrained / analyze
  let finalMode = routeMap.mode;
  if (routeMap.mode === 'ROAD_LTL' && chargeableWt > 5000) {
    // If over 5 tons, Full Truck Load is likely cheaper than Less than Truck Load
    finalMode = 'ROAD_FTL';
  }

  // 3. Base Tariffs (Synthetic matrix)
  // In a real application, this pulls from rateCardStore logistics rates
  let ratePerKg = 0;
  let flatTruckRate = 0;

  if (finalMode === 'COURIER') {
    ratePerKg = routeMap.zone === 'LOCAL' ? 15 : (routeMap.zone === 'REGIONAL' ? 25 : 60);
  } else if (finalMode === 'AIR') {
    ratePerKg = 90; // High rate
  } else if (finalMode === 'ROAD_LTL') {
    ratePerKg = routeMap.zone === 'LOCAL' ? 2 : (routeMap.zone === 'REGIONAL' ? 4 : 8);
    // Minimum weights apply
    if (chargeableWt < 50) chargeableWt = 50;
  } else if (finalMode === 'ROAD_FTL') {
    // Distance based flat rate for truck (e.g. 19ft Eicher)
    const truckRatePerKm = 30; // Rs 30 / km
    flatTruckRate = routeMap.distance_km * truckRatePerKm;
    // Floor rate
    if (flatTruckRate < 3000) flatTruckRate = 3000;
  }

  const baseTariff = finalMode === 'ROAD_FTL' ? flatTruckRate : (chargeableWt * ratePerKg);

  // 4. Surcharges
  const fuelSurchargePct = 15; // 15% FSC
  const fscAmount = baseTariff * (fuelSurchargePct / 100);

  let accessorial = 0;
  if (routeMap.requiresTailift) accessorial += 1500; // Rs 1500 for tailLift drop

  // Handling (If multiple pallets LTL)
  if (finalMode === 'ROAD_LTL') {
    accessorial += packingData.palletsRequired * 100; // Rs 100 handling per pallet
  }

  const total = baseTariff + fscAmount + accessorial;

  return {
    chargeableWeight_kg: Math.round(chargeableWt * 100) / 100,
    volumetricWeight_kg: Math.round(volumetricWt * 100) / 100,
    actualGrossWeight_kg: Math.round(actualWt * 100) / 100,

    baseTariffCost: Math.round(baseTariff),
    fuelSurcharge_percent: fuelSurchargePct,
    fuelSurchargeAmount: Math.round(fscAmount),
    accessorialCharges: Math.round(accessorial),

    transportModeSelected: finalMode,
    totalFreightCost: Math.round(total)
  };
}