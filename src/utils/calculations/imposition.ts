// ============================================================================
// IMPOSITION / FORMAT CALCULATION — EXACT EXCEL LOGIC
// ============================================================================
// Determines how many pages fit on a printing sheet (the "form")
// Tries 4pp, 8pp, 16pp, 32pp impositions on each available paper size
// Selects the optimal combination of paper size + pages per form
// ============================================================================

import { mmToInch } from "@/utils/format";
import { STANDARD_PAPER_SIZES } from "@/constants";
import type { PaperSize } from "@/types";

export interface ImpositionInput {
  trimWidthMM: number;
  trimHeightMM: number;
  totalPages: number;
  bleedMM?: number;
  gripperMM?: number;
  machineMaxWidth?: number;  // inches
  machineMaxHeight?: number; // inches
  availablePaperSizes?: PaperSize[];
}

export interface ImpositionResult {
  ppPerForm: number;       // Pages per form (4, 8, 16, 32)
  numberOfForms: number;   // Total forms needed
  ups: number;             // Number of ups (copies per sheet)
  paperSizeId: string;
  paperSizeLabel: string;
  paperWidthInch: number;
  paperHeightInch: number;
  formatWidth: number;     // Form width in inches
  formatHeight: number;    // Form height in inches
  formatLabel: string;     // e.g., "20.6x32.4"
  leavesPerForm: number;
  sheetsPerCopy: number;   // Forms/ups = sheets needed per copy
  orientation: "portrait" | "landscape";
  isWorkAndTurn: boolean;
  wastePercent: number;    // Paper waste percentage
}

/**
 * Calculate all possible impositions and find the optimal one
 */
export function findOptimalImposition(input: ImpositionInput): ImpositionResult {
  const bleed = input.bleedMM ?? 3;
  const gripper = input.gripperMM ?? 12;
  const paperSizes = input.availablePaperSizes || STANDARD_PAPER_SIZES;
  
  // Convert trim size to inches with bleeds
  const trimWInch = mmToInch(input.trimWidthMM + bleed * 2);
  const trimHInch = mmToInch(input.trimHeightMM + bleed * 2);
  const gripperInch = mmToInch(gripper);

  const results: ImpositionResult[] = [];
  const ppOptions = [4, 8, 16, 32];

  for (const ppPerForm of ppOptions) {
    const leavesPerForm = ppPerForm / 2; // Each leaf = 2 pages (front + back)
    
    // Calculate form dimensions based on pp/form
    // 4pp = 1 leaf: 1 high × 1 wide (after fold)
    // 8pp = 2 leaves: 2 high × 1 wide OR 1 high × 2 wide
    // 16pp = 4 leaves: 2 high × 2 wide
    // 32pp = 8 leaves: 4 high × 2 wide OR 2 high × 4 wide
    
    const layouts = getFormLayouts(ppPerForm);
    
    for (const layout of layouts) {
      const formW = trimWInch * layout.cols + gripperInch;
      const formH = trimHInch * layout.rows;
      
      for (const paperSize of paperSizes) {
        // Check if machine can handle this paper size
        if (input.machineMaxWidth && paperSize.widthInch > input.machineMaxWidth) continue;
        if (input.machineMaxHeight && paperSize.heightInch > input.machineMaxHeight) continue;
        
        // Try both orientations of paper
        for (const orient of ["normal", "rotated"] as const) {
          const pw = orient === "normal" ? paperSize.widthInch : paperSize.heightInch;
          const ph = orient === "normal" ? paperSize.heightInch : paperSize.widthInch;
          
          const upsW = Math.floor(pw / formW);
          const upsH = Math.floor(ph / formH);
          const ups = upsW * upsH;
          
          if (ups < 1) continue;
          
          const numberOfForms = Math.ceil(input.totalPages / ppPerForm);
          const sheetsPerCopy = numberOfForms / ups;
          
          // Calculate paper waste
          const usedArea = formW * formH * ups;
          const totalArea = pw * ph;
          const wastePercent = ((totalArea - usedArea) / totalArea) * 100;
          
          results.push({
            ppPerForm,
            numberOfForms,
            ups,
            paperSizeId: paperSize.id,
            paperSizeLabel: paperSize.label,
            paperWidthInch: pw,
            paperHeightInch: ph,
            formatWidth: formW,
            formatHeight: formH,
            formatLabel: `${formW.toFixed(1)}x${formH.toFixed(1)}`,
            leavesPerForm: leavesPerForm,
            sheetsPerCopy,
            orientation: orient === "normal" ? "portrait" : "landscape",
            isWorkAndTurn: false,
            wastePercent,
          });
        }
      }
    }
  }

  if (results.length === 0) {
    // Fallback: use largest paper with 4pp
    const fallbackPaper = paperSizes[0];
    return {
      ppPerForm: 4,
      numberOfForms: Math.ceil(input.totalPages / 4),
      ups: 1,
      paperSizeId: fallbackPaper.id,
      paperSizeLabel: fallbackPaper.label,
      paperWidthInch: fallbackPaper.widthInch,
      paperHeightInch: fallbackPaper.heightInch,
      formatWidth: trimWInch + gripperInch,
      formatHeight: trimHInch,
      formatLabel: `${(trimWInch + gripperInch).toFixed(1)}x${trimHInch.toFixed(1)}`,
      leavesPerForm: 2,
      sheetsPerCopy: Math.ceil(input.totalPages / 4),
      orientation: "portrait",
      isWorkAndTurn: false,
      wastePercent: 50,
    };
  }

  // Sort by: fewer sheets per copy (less paper), then lower waste
  results.sort((a, b) => {
    const sheetsA = a.numberOfForms / a.ups;
    const sheetsB = b.numberOfForms / b.ups;
    if (sheetsA !== sheetsB) return sheetsA - sheetsB;
    return a.wastePercent - b.wastePercent;
  });

  return results[0];
}

export function calculateImposition(input: ImpositionInput): ImpositionResult {
  return findOptimalImposition(input);
}

function getFormLayouts(ppPerForm: number): { rows: number; cols: number }[] {
  switch (ppPerForm) {
    case 4: return [{ rows: 1, cols: 2 }]; // 1 leaf = 2 pages front+back, opened = 2 pages wide
    case 8: return [{ rows: 2, cols: 2 }, { rows: 1, cols: 4 }];
    case 16: return [{ rows: 2, cols: 4 }, { rows: 4, cols: 2 }];
    case 32: return [{ rows: 4, cols: 4 }, { rows: 2, cols: 8 }];
    default: return [{ rows: 1, cols: 2 }];
  }
}