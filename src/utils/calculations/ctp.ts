// ============================================================================
// CTP PLATE COST CALCULATION
// ============================================================================

import { CTP_RATES, DEFAULT_MACHINES } from "@/constants";
import type { SectionCTPCost } from "@/types";

export interface CTPCostInput {
  sectionName: string;
  sectionType: string;
  machineId: string;
  totalPlates: number;
}

export function calculateCTPCost(input: CTPCostInput): SectionCTPCost {
  // Find CTP rate for this machine
  const machine = DEFAULT_MACHINES.find(m => m.id === input.machineId);
  const ratePerPlate = machine?.ctpRate || CTP_RATES[input.machineId.toUpperCase()] || 271;
  
  const totalCost = input.totalPlates * ratePerPlate;
  
  return {
    sectionName: input.sectionName,
    sectionType: input.sectionType,
    totalPlates: input.totalPlates,
    ratePerPlate,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}