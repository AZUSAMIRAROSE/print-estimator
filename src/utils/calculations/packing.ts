// ============================================================================
// PACKING COST CALCULATION
// ============================================================================

import { PACKING_RATES } from "@/constants";
import type { PackingSection, BookSpec, PackingBreakdown } from "@/types";

export interface PackingCostInput {
  packing: PackingSection;
  quantity: number;
  bookSpec: BookSpec;
  spineThickness: number;
  weightPerBookGrams: number;
}

export function calculatePackingCost(input: PackingCostInput): {
  totalCost: number;
  costPerCopy: number;
  breakdown: PackingBreakdown;
} {
  const { packing, quantity, bookSpec, spineThickness, weightPerBookGrams } = input;
  const weightPerBookKg = weightPerBookGrams / 1000;
  
  // Calculate books per carton
  const cartonDims = PACKING_RATES.standardCartonDimensions;
  const bookH = bookSpec.heightMM;
  const bookW = bookSpec.widthMM;
  const bookD = spineThickness || 15; // minimum spine estimate
  
  // Try different orientations
  const fitsFlat = Math.floor(cartonDims.length / bookH) * Math.floor(cartonDims.width / bookW) * Math.floor(cartonDims.height / bookD);
  const fitsStand = Math.floor(cartonDims.length / bookH) * Math.floor(cartonDims.width / bookD) * Math.floor(cartonDims.height / bookW);
  const fitsByDim = Math.max(fitsFlat, fitsStand, 1);
  
  // Weight limit
  const fitsByWeight = weightPerBookKg > 0 ? Math.floor(packing.maxCartonWeight / weightPerBookKg) : fitsByDim;
  
  const booksPerCarton = packing.customBooksPerCarton > 0
    ? packing.customBooksPerCarton
    : Math.min(fitsByDim, fitsByWeight);
  
  const totalCartons = Math.ceil(quantity / Math.max(booksPerCarton, 1));
  
  // Carton cost
  let cartonUnitCost = packing.cartonRate || (packing.cartonType === "3_ply" ? PACKING_RATES.carton3Ply : PACKING_RATES.carton5Ply);
  if (packing.customPrinting) cartonUnitCost += PACKING_RATES.customPrintSurcharge;
  if (packing.innerPartition) cartonUnitCost += PACKING_RATES.innerPartition;
  
  const cartonCost = packing.useCartons ? totalCartons * cartonUnitCost : 0;
  
  // Pallet calculation
  const cartonH = cartonDims.height;
  const palletDims = PACKING_RATES.palletDimensions;
  const cartonsPerPalletLayer = Math.floor(palletDims.length / cartonDims.length) * Math.floor(palletDims.width / cartonDims.width);
  const maxLayers = Math.floor((packing.maxPalletHeight - palletDims.height) / cartonH);
  const cartonsPerPallet = Math.max(cartonsPerPalletLayer * maxLayers, 1);
  const totalPallets = packing.usePallets ? Math.ceil(totalCartons / cartonsPerPallet) : 0;
  
  const palletRate = packing.palletRate || PACKING_RATES.palletStandard;
  const palletCost = totalPallets * palletRate;
  
  // Wrapping costs
  const stretchWrapCost = packing.stretchWrap ? totalPallets * (packing.stretchWrapRate || PACKING_RATES.stretchWrap) : 0;
  const shrinkWrapCost = packing.shrinkWrap ? totalPallets * (packing.shrinkWrapRate || 350) : 0;
  const strappingCost = packing.strapping ? totalPallets * (packing.strappingRate || PACKING_RATES.strapping) : 0;
  const cornerProtectorCost = packing.cornerProtectors ? totalPallets * (packing.cornerProtectorRate || PACKING_RATES.cornerProtectors) : 0;
  
  // Individual packing
  let otherPackingCost = 0;
  if (packing.polybagIndividual) {
    otherPackingCost += quantity * (packing.polybagRate || PACKING_RATES.polybag);
  }
  if (packing.kraftWrapping) {
    otherPackingCost += quantity * PACKING_RATES.kraftWrap;
  }
  
  const totalPackingCost = cartonCost + palletCost + stretchWrapCost + shrinkWrapCost + strappingCost + cornerProtectorCost + otherPackingCost;
  const totalWeight = quantity * weightPerBookKg;
  
  return {
    totalCost: Math.round(totalPackingCost * 100) / 100,
    costPerCopy: quantity > 0 ? Math.round((totalPackingCost / quantity) * 100) / 100 : 0,
    breakdown: {
      booksPerCarton,
      totalCartons,
      cartonCost: Math.round(cartonCost * 100) / 100,
      totalPallets,
      palletCost: Math.round(palletCost * 100) / 100,
      stretchWrapCost: Math.round(stretchWrapCost * 100) / 100,
      shrinkWrapCost: Math.round(shrinkWrapCost * 100) / 100,
      strappingCost: Math.round(strappingCost * 100) / 100,
      cornerProtectorCost: Math.round(cornerProtectorCost * 100) / 100,
      otherPackingCost: Math.round(otherPackingCost * 100) / 100,
      totalPackingCost: Math.round(totalPackingCost * 100) / 100,
      weightPerBook: Math.round(weightPerBookGrams * 100) / 100,
      totalWeight: Math.round(totalWeight * 100) / 100,
    },
  };
}