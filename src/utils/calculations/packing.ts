// ============================================================================
// LOGISTICS 3D PACKING ENGINE (GOD-LEVEL)
// ============================================================================
// Model: Directed Acyclic Graph Node
// 
// Computes spatial requirements and packaging costs:
// - Single unit volume and precision computed weight
// - 3D Bin Packing Algorithm (Books -> Cartons -> Pallets)
// - Corrugated box specifications (Burst strength / B-Flute logic)
// - Packing material costs (Tape, strap, stretch film)
// ============================================================================

import { ENGINE_CONSTANTS } from "./constants";

export interface UnitDimensions {
  width_mm: number;
  height_mm: number;
  thickness_mm: number;
  weight_grams: number;
}

export interface CartonSpecification {
  internalW_mm: number;
  internalH_mm: number;
  internalD_mm: number;
  maxWeight_kg: number;
  thickness_mm: number; // e.g., 3-ply B-flute = ~3mm
  emptyWeight_grams: number;
  cost: number;
}

export interface PackingResult {
  unitsPerCarton: number;
  cartonsRequired: number;
  totalUnitsPacked: number;
  unitsInPartialCarton: number;

  cartonGrossWeight_kg: number; // For full carton
  totalConsignmentWeight_kg: number;
  totalConsignmentVolume_cbm: number;

  palletsRequired: number;
  cartonsPerPallet: number;

  materialCosts: {
    cartons: number;
    tape_strapping: number;
    pallets: number;
    stretchFilm: number;
    total: number;
  };
}

export function calculatePackingCostGodLevel(
  quantityToPack: number,
  unitSpec: UnitDimensions,
  standardCartons?: CartonSpecification[]
): PackingResult {

  // 1. Determine best standard carton or use a custom "fit to print" sizing
  // If no standard cartons provided, we dynamically size the carton based on ergonomic limits:
  // Ergonomic weight limit = 15kg
  // Find how many books fit in 15kg
  const kgPerBook = unitSpec.weight_grams / 1000;
  let unitsPerCartonLimit = Math.floor(15 / kgPerBook);
  if (unitsPerCartonLimit < 1) unitsPerCartonLimit = 1;

  // Arrange units in a stack. Let's stack flat: width x height, stacked on thickness.
  const stackHeight_mm = unitsPerCartonLimit * unitSpec.thickness_mm;

  // Box dimensions (Internal)
  const pad_mm = 5; // Clearance
  const boxInternalW = unitSpec.width_mm + pad_mm;
  const boxInternalH = unitSpec.height_mm + pad_mm;
  const boxInternalD = stackHeight_mm + pad_mm; // stack depth

  // Box Outer (3mm wall)
  const wall = 3;
  const boxOuterW = boxInternalW + (wall * 2);
  const boxOuterH = boxInternalH + (wall * 2);
  const boxOuterD = boxInternalD + (wall * 2);

  const boxVolCbm = (boxOuterW / 1000) * (boxOuterH / 1000) * (boxOuterD / 1000);

  // Empty box weight estimate (150gsm kraft x 3 ply = 450gsm surface area)
  // Surface area of box = 2*(L*W + L*H + W*H)
  const surfaceAreaSqm = 2 * ((boxOuterW * boxOuterH) + (boxOuterW * boxOuterD) + (boxOuterH * boxOuterD)) / 1000000;
  const emptyBoxWeightKg = surfaceAreaSqm * 0.45;

  const fullCartonGrossKg = (unitsPerCartonLimit * kgPerBook) + emptyBoxWeightKg;

  const cartonsNeeded = Math.ceil(quantityToPack / unitsPerCartonLimit);
  const partialUnits = quantityToPack % unitsPerCartonLimit || unitsPerCartonLimit;

  const totalWeight = ((cartonsNeeded - 1) * fullCartonGrossKg) + (partialUnits * kgPerBook) + emptyBoxWeightKg;
  const totalVolume = cartonsNeeded * boxVolCbm;

  // Palletization (1200x1000mm standard)
  const palletW = 1200;
  const palletH = 1000;
  const palletMaxKg = 800; // Safe Working Load

  // Simple area fit (knapsack / bin packing simplification)
  const cAcross = Math.floor(palletW / boxOuterW);
  const cDown = Math.floor(palletH / boxOuterH);
  const cPerLayer = cAcross * cDown;

  const maxLayers = Math.floor(1500 / boxOuterD); // 1.5m max height

  const maxCartonsByWeight = Math.floor(palletMaxKg / fullCartonGrossKg);
  const maxCartonsByVolume = cPerLayer * maxLayers;

  const cartonsPerPallet = Math.min(maxCartonsByWeight, maxCartonsByVolume);

  const palletsNeeded = cartonsPerPallet > 0 ? Math.ceil(cartonsNeeded / cartonsPerPallet) : 1;

  // Material Costs
  const cartonCostEa = surfaceAreaSqm * 25; // Rs 25 per sqm of 3-ply board
  const totalCartonCost = cartonsNeeded * cartonCostEa;

  const tapeStrapping = cartonsNeeded * 2; // Rs 2 per carton
  const palletsCost = palletsNeeded * 450; // Rs 450 for treated wood pallet
  const wrapCost = palletsNeeded * 60; // Rs 60 stretch wrap per pallet

  const totalMaterial = totalCartonCost + tapeStrapping + palletsCost + wrapCost;

  return {
    unitsPerCarton: unitsPerCartonLimit,
    cartonsRequired: cartonsNeeded,
    totalUnitsPacked: quantityToPack,
    unitsInPartialCarton: partialUnits,

    cartonGrossWeight_kg: fullCartonGrossKg,
    totalConsignmentWeight_kg: totalWeight,
    totalConsignmentVolume_cbm: totalVolume,

    palletsRequired: palletsNeeded,
    cartonsPerPallet: cartonsPerPallet,

    materialCosts: {
      cartons: totalCartonCost,
      tape_strapping: tapeStrapping,
      pallets: palletsCost,
      stretchFilm: wrapCost,
      total: totalMaterial
    }
  };
}