// ============================================================================
// BOOK WEIGHT CALCULATION — EXACT EXCEL FORMULA
// ============================================================================

export interface BookWeightInput {
  trimHeightMM: number;
  trimWidthMM: number;
  textSections: { pages: number; gsm: number }[];
  coverGSM: number;
  spineThickness: number;
  hasEndleaves: boolean;
  endleavesPages: number;
  endleavesGSM: number;
  hasJacket: boolean;
  jacketGSM: number;
  boardThicknessMM: number;
  hasBoard: boolean;
}

export interface BookWeightResult {
  textWeight: number;    // grams
  coverWeight: number;
  endleavesWeight: number;
  jacketWeight: number;
  boardWeight: number;
  miscWeight: number;    // 10% of subtotal
  totalWeight: number;   // grams
  totalWeightKg: number;
}

/**
 * Calculate weight of a single book in grams
 */
export function calculateBookWeight(input: BookWeightInput): BookWeightResult {
  const trimHM = input.trimHeightMM / 1000; // Convert to meters
  const trimWM = input.trimWidthMM / 1000;
  
  // Text weight: (pages/2) × (trim_h_m × trim_w_m) × GSM
  let textWeight = 0;
  for (const section of input.textSections) {
    if (section.pages > 0) {
      textWeight += (section.pages / 2) * (trimHM * trimWM) * section.gsm;
    }
  }
  
  // Cover weight: 1 × (cover_h_m × cover_w_m) × cover_GSM
  // Cover width = trim_width × 2 + spine
  const coverWM = (input.trimWidthMM * 2 + input.spineThickness) / 1000;
  const coverWeight = 1 * (trimHM * coverWM) * input.coverGSM;
  
  // Endleaves weight
  let endleavesWeight = 0;
  if (input.hasEndleaves && input.endleavesPages > 0) {
    endleavesWeight = (input.endleavesPages / 2) * (trimHM * trimWM) * input.endleavesGSM;
  }
  
  // Jacket weight
  let jacketWeight = 0;
  if (input.hasJacket) {
    // Jacket width = trim × 2 + spine + flaps (90mm each)
    const jacketWM = (input.trimWidthMM * 2 + input.spineThickness + 180) / 1000;
    jacketWeight = 1 * (trimHM * jacketWM) * input.jacketGSM;
  }
  
  // Board weight: 2 boards per book
  // Board area per book: (book_h + 6mm) × (book_w + 3mm) per board
  let boardWeight = 0;
  if (input.hasBoard && input.boardThicknessMM > 0) {
    const boardHM = (input.trimHeightMM + 6) / 1000;
    const boardWM = (input.trimWidthMM + 3) / 1000;
    // Board density: approximately 1230 kg/m³ for standard gray board
    // Weight per sqm for 3mm board ≈ 3700 grams/sqm
    const boardWeightPerSqm = input.boardThicknessMM * 1230; // grams per sqm
    boardWeight = 2 * (boardHM * boardWM) * boardWeightPerSqm;
  }
  
  const subtotal = textWeight + coverWeight + endleavesWeight + jacketWeight + boardWeight;
  const miscWeight = subtotal * 0.10; // 10% for glue, lining, etc.
  const totalWeight = subtotal + miscWeight;
  
  return {
    textWeight: Math.round(textWeight * 100) / 100,
    coverWeight: Math.round(coverWeight * 100) / 100,
    endleavesWeight: Math.round(endleavesWeight * 100) / 100,
    jacketWeight: Math.round(jacketWeight * 100) / 100,
    boardWeight: Math.round(boardWeight * 100) / 100,
    miscWeight: Math.round(miscWeight * 100) / 100,
    totalWeight: Math.round(totalWeight * 100) / 100,
    totalWeightKg: Math.round(totalWeight / 10) / 100, // Round to 2 decimal kg
  };
}