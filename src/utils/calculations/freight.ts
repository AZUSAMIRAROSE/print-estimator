// ============================================================================
// FREIGHT COST CALCULATION
// ============================================================================

import { DEFAULT_DESTINATIONS } from "@/constants";
import type { DeliverySection, PackingBreakdown } from "@/types";

export interface FreightCostInput {
  delivery: DeliverySection;
  quantity: number;
  packingBreakdown: PackingBreakdown;
  totalFOBValue: number; // For insurance calculation
}

export function calculateFreightCost(input: FreightCostInput): {
  totalCost: number;
  costPerCopy: number;
  breakdown: Record<string, number>;
} {
  const { delivery, quantity, packingBreakdown } = input;
  const breakdown: Record<string, number> = {};
  let totalCost = 0;
  
  const dest = DEFAULT_DESTINATIONS.find(d => d.id === delivery.destinationId);
  if (!dest) return { totalCost: 0, costPerCopy: 0, breakdown: {} };
  
  if (delivery.deliveryType === "ex_works") {
    return { totalCost: 0, costPerCopy: 0, breakdown: { "Ex Works": 0 } };
  }
  
  // Sea Freight
  if (delivery.freightMode === "sea" && dest.isOverseas) {
    // Surface charge per pallet (factory to port)
    const surfaceCost = packingBreakdown.totalPallets * dest.surfacePerPallet;
    breakdown["Surface Transport"] = Math.round(surfaceCost);
    totalCost += surfaceCost;
    
    // Sea freight per pallet
    const seaFreight = packingBreakdown.totalPallets * dest.seaFreightPerPallet;
    breakdown["Sea Freight"] = Math.round(seaFreight);
    totalCost += seaFreight;
    
    // Clearance charges
    const clearance = delivery.customsClearance || dest.clearanceCharges;
    breakdown["Customs Clearance"] = clearance;
    totalCost += clearance;
    
    // CHA charges
    if (dest.chaCharges > 0) {
      breakdown["CHA Charges"] = dest.chaCharges;
      totalCost += dest.chaCharges;
    }
    
    // Port handling
    if (dest.portHandling > 0) {
      breakdown["Port Handling"] = dest.portHandling;
      totalCost += dest.portHandling;
    }
    
    // Documentation
    if (dest.documentation > 0) {
      breakdown["Documentation"] = dest.documentation;
      totalCost += dest.documentation;
    }
    
    // BL charges
    if (dest.blCharges > 0) {
      breakdown["BL Charges"] = dest.blCharges;
      totalCost += dest.blCharges;
    }
  }
  
  // Road Freight (domestic)
  if (delivery.freightMode === "road" && !dest.isOverseas) {
    if (dest.surfacePerTruck > 0) {
      breakdown["Road Transport"] = dest.surfacePerTruck;
      totalCost += dest.surfacePerTruck;
    } else if (dest.surfacePerTon > 0) {
      const tons = packingBreakdown.totalWeight / 1000;
      const cost = tons * dest.surfacePerTon;
      breakdown["Road Transport"] = Math.round(cost);
      totalCost += cost;
    }
  }
  
  // Air Freight
  if (delivery.freightMode === "air") {
    const rate = dest.airFreightPerKg || 900;
    const weightKg = packingBreakdown.totalWeight;
    // Volumetric weight check
    const volWeight = (packingBreakdown.totalCartons * 595 * 420 * 320) / 5000000; // Volumetric
    const chargeableWeight = Math.max(weightKg, volWeight);
    const airCost = chargeableWeight * rate;
    breakdown["Air Freight"] = Math.round(airCost);
    totalCost += airCost;
  }
  
  // Insurance
  if (delivery.insurance && delivery.insuranceRate > 0) {
    const insuranceCost = input.totalFOBValue * (delivery.insuranceRate / 100);
    breakdown["Insurance"] = Math.round(insuranceCost);
    totalCost += insuranceCost;
  }
  
  // Advance copies (air courier)
  if (delivery.advanceCopies > 0 && delivery.advanceCopiesAirFreight) {
    const advWeightKg = (delivery.advanceCopies * packingBreakdown.weightPerBook) / 1000;
    const advCost = advWeightKg * (delivery.advanceCopiesRate || 900) + 150; // +150 packaging
    breakdown["Advance Copies (Air)"] = Math.round(advCost);
    totalCost += advCost;
  }
  
  // Multiple despatches
  if (delivery.numberOfDespatches > 1) {
    const extraDespatchCost = (delivery.numberOfDespatches - 1) * 3500; // Estimated per extra despatch
    breakdown["Extra Despatches"] = Math.round(extraDespatchCost);
    totalCost += extraDespatchCost;
  }
  
  const costPerCopy = quantity > 0 ? totalCost / quantity : 0;
  
  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costPerCopy: Math.round(costPerCopy * 100) / 100,
    breakdown,
  };
}