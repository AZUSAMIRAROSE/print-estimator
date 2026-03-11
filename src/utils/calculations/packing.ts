// ============================================================================
// PACKING COST ENGINE — THOMSON PRESS CALIBRATED
// ============================================================================
// Uses Thomson Press exact packing rates:
//   Carton: Rs 65 each
//   Pallet: Rs 1,350 each
//   Books per carton: floor(14000 / weight_per_book_grams)
//   Cartons per pallet: 32 (standard)
//   Stretch wrap: Rs 0.91/copy
//
// CALIBRATION TARGET (2000 copies, ~383g/book):
//   Books/carton: 36
//   Total cartons: 56
//   Carton cost: Rs 3,640
//   Pallets: 2 @ Rs 1,350 = Rs 2,700
//   Stretch wrap: Rs 1,820
//   TOTAL PACKING: Rs 8,160 (Rs 4.08/copy)
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
  thickness_mm: number;
  emptyWeight_grams: number;
  cost: number;
}

export interface PackingResult {
  unitsPerCarton: number;
  cartonsRequired: number;
  totalUnitsPacked: number;
  unitsInPartialCarton: number;

  cartonGrossWeight_kg: number;
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
  _standardCartons?: CartonSpecification[]
): PackingResult {

  const tp = ENGINE_CONSTANTS.thomsonPress.packing;

  // 1. Books per carton = floor(maxCartonWeight / weightPerBook)
  // Thomson Press uses 14kg (14000g) max carton weight
  const booksPerCarton = Math.max(1, Math.floor(tp.maxCartonWeight_grams / Math.max(1, unitSpec.weight_grams)));

  // 2. Total cartons
  const cartonsNeeded = Math.ceil(quantityToPack / booksPerCarton);
  const partialUnits = quantityToPack % booksPerCarton || booksPerCarton;

  // 3. Carton dimensions (estimated from book size)
  const pad_mm = 10;
  // Stack books flat in carton
  const stackHeight_mm = booksPerCarton * unitSpec.thickness_mm;
  const boxW = unitSpec.width_mm + pad_mm;
  const boxH = unitSpec.height_mm + pad_mm;
  const boxD = stackHeight_mm + pad_mm;

  const wall = 3;
  const boxOuterW = boxW + (wall * 2);
  const boxOuterH = boxH + (wall * 2);
  const boxOuterD = boxD + (wall * 2);

  const boxVolCbm = (boxOuterW / 1000) * (boxOuterH / 1000) * (boxOuterD / 1000);

  // 4. Weights
  const emptyBoxWeightKg = 0.8; // ~800g for standard 5-ply carton
  const kgPerBook = unitSpec.weight_grams / 1000;
  const fullCartonGrossKg = (booksPerCarton * kgPerBook) + emptyBoxWeightKg;

  const totalWeight = ((cartonsNeeded - 1) * fullCartonGrossKg) + (partialUnits * kgPerBook) + emptyBoxWeightKg;
  const totalVolume = cartonsNeeded * boxVolCbm;

  // 5. Palletization — Thomson Press: 32 cartons per pallet (standard)
  const cartonsPerPallet = tp.cartonsPerPallet; // 32 standard
  const palletsNeeded = cartonsPerPallet > 0 ? Math.ceil(cartonsNeeded / cartonsPerPallet) : 1;

  // 6. Costs — Thomson Press exact rates
  const cartonCostEach = tp.cartonCost; // Rs 65
  const totalCartonCost = cartonsNeeded * cartonCostEach;

  const palletCost = palletsNeeded * tp.palletCost; // Rs 1,350 per pallet

  // Stretch wrap: Rs 0.91/copy (Thomson Press rate)
  const stretchWrapCost = quantityToPack * tp.stretchWrapPerCopy;

  // Tape/strapping: minimal cost per carton
  const tapeStrapping = cartonsNeeded * 2; // Rs 2 per carton

  const totalMaterial = totalCartonCost + tapeStrapping + palletCost + stretchWrapCost;

  return {
    unitsPerCarton: booksPerCarton,
    cartonsRequired: cartonsNeeded,
    totalUnitsPacked: quantityToPack,
    unitsInPartialCarton: partialUnits,

    cartonGrossWeight_kg: Math.round(fullCartonGrossKg * 100) / 100,
    totalConsignmentWeight_kg: Math.round(totalWeight * 100) / 100,
    totalConsignmentVolume_cbm: Math.round(totalVolume * 10000) / 10000,

    palletsRequired: palletsNeeded,
    cartonsPerPallet,

    materialCosts: {
      cartons: Math.round(totalCartonCost * 100) / 100,
      tape_strapping: Math.round(tapeStrapping * 100) / 100,
      pallets: Math.round(palletCost * 100) / 100,
      stretchFilm: Math.round(stretchWrapCost * 100) / 100,
      total: Math.round(totalMaterial * 100) / 100
    }
  };
}