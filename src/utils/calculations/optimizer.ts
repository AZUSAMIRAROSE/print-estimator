// ============================================================================
// SHEET / MACHINE / SIGNATURE OPTIMIZER WITH COST-DOMINATED SCORING
// ============================================================================
// Implements constrained optimization for:
//   1. Sheet size selection — cost-dominant scoring
//   2. Machine selection — lowest cost for capability
//   3. Signature optimization loop — test ALL (4/8/16/32pp), pick lowest cost
//
// CONSTRAINTS (prevent search space explosion):
//   max_ups = 16
//   max_signature = 32pp
//   max_sheet_options = 12 (STANDARD_PAPER_SIZES)
//   max_machines = 8 (DEFAULT_MACHINES)
//
// SCORING MODEL (professional MIS-grade):
//   Sheet: score = (cost_per_copy × 0.7) + (waste_pct × 0.2) + (grain_penalty × 0.1)
//   Machine: score = (cost × 0.6) + (time × rate × 0.3) + (quality × 0.1)
//
// SIGNATURE OPTIMIZATION LOOP:
//   for sig in [4, 8, 16, 32]:
//     plan sheets → calculate plates → calculate paper cost → printing cost
//     total = paper + print + plates
//   choose minimum total_cost
// ============================================================================

import { STANDARD_PAPER_SIZES, DEFAULT_MACHINES } from "@/constants";
import {
    lookupTPImpressionRate,
    lookupTPPlateRates,
    lookupTPWastagePercent,
    lookupTPMachineReadyWastage,
} from "./constants";
import { useMachineStore } from "@/stores/machineStore";

// ─── CONSTRAINTS ─────────────────────────────────────────────────────────────

export const OPTIMIZER_CONSTRAINTS = {
    MAX_UPS: 16,            // Max pages per press sheet side
    MAX_SIGNATURE: 32,      // Max pages per signature (form)
    MAX_SHEET_OPTIONS: 12,  // Max paper sizes to evaluate
    MAX_MACHINES: 8,        // Max machines to evaluate
    MIN_UPS: 1,
    MIN_SIGNATURE: 4,       // Minimum signature size (4pp)
    GRAIN_PENALTY: 10,      // Score penalty for cross-grain (normalized 0-100 scale)
    MACHINE_CHANGE_PENALTY: 3, // Score penalty if press changes between sections
    STRICT_BINDINGS: ['perfect', 'sewn', 'section sewn', 'hardcase'], // Bindings that REJECT cross-grain

    // Scoring weights (professional MIS grade)
    SHEET_COST_WEIGHT: 0.7,
    SHEET_WASTE_WEIGHT: 0.2,
    SHEET_GRAIN_WEIGHT: 0.1,

    MACHINE_COST_WEIGHT: 0.6,
    MACHINE_TIME_WEIGHT: 0.3,
    MACHINE_QUALITY_WEIGHT: 0.1,
} as const;

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface SheetOption {
    sheetId: string;
    label: string;
    widthMM: number;
    heightMM: number;
    widthInch: number;
    heightInch: number;
    ups: number;
    orientation: 'PORTRAIT' | 'LANDSCAPE';
    grainCompliant: boolean;
    paperWastePct: number;     // Area wasted as %
    totalCost: number;          // Estimated paper cost
    costPerCopy: number;
    score: number;              // Composite score (lower = better)
    selected: boolean;
    rejectionReason: string | null;
}

export interface MachineOption {
    machineId: string;
    machineName: string;
    machineCode: string;
    canPrint: boolean;
    totalCost: number;
    costPerCopy: number;
    timeHours: number;
    score: number;
    selected: boolean;
    rejectionReason: string | null;
}

export interface SignatureOption {
    ppPerForm: number;          // Pages per form (signature)
    numberOfForms: number;
    ups: number;
    pressSheets: number;        // Net press sheets
    wastageSheets: number;      // Total wastage sheets
    grossSheets: number;        // Net + wastage
    totalPlates: number;        // Plates needed for this signature
    paperCost: number;          // Paper cost for this option
    ctpCost: number;            // CTP cost
    printingCost: number;       // Printing cost (plate rate + impression rate)
    totalCost: number;          // Paper + CTP + Printing combined
    costPerCopy: number;
    wastePct: number;
    score: number;
    selected: boolean;
    traceDetail: string;        // Human-readable trace line
}

export interface OptimizationResult {
    bestSheet: SheetOption | null;
    allSheets: SheetOption[];
    bestMachine: MachineOption | null;
    allMachines: MachineOption[];
    bestSignature: SignatureOption | null;
    allSignatures: SignatureOption[];
    optimizationTimeMs: number;
    combinationsEvaluated: number;
}

// ─── 1. SHEET SIZE OPTIMIZER ─────────────────────────────────────────────────
// Professional MIS scoring:
//   score = (cost_per_copy × 0.7) + (waste_pct × 0.2) + (grain_penalty × 0.1)
// Cost dominates because cheap high-waste paper can beat expensive low-waste.

export function optimizeSheetSize(
    trimWidthMM: number,
    trimHeightMM: number,
    gsm: number,
    costPerKg: number,
    quantity: number,
    totalPages: number,
    maxColors: number,
    sectionType: string = 'text1',
    bindingType: string = '',
    bleedMM: number = 3,
    spineThickness: number = 0,
    isCustomPaper: boolean = false,
    customPaperWidth?: number,
    customPaperHeight?: number,
    customPaperGrain?: "LONG_GRAIN" | "SHORT_GRAIN"
): SheetOption[] {

    // Effective trim dimensions (cover wraps around spine)
    let effectiveWidth = trimWidthMM;
    if (sectionType === 'cover' && spineThickness > 0) {
        effectiveWidth = trimWidthMM * 2 + spineThickness + 20;
    }
    if (sectionType === 'jacket' && spineThickness > 0) {
        effectiveWidth = trimWidthMM * 2 + spineThickness + 180;
    }

    const trimW = effectiveWidth + (bleedMM * 2);
    const trimH = trimHeightMM + (bleedMM * 2);

    const gripper = 12;
    const tail = 8;
    const side = 5;

    const options: SheetOption[] = [];

    // Determine the paper sizes to evaluate
    let paperSizesToEvaluate = STANDARD_PAPER_SIZES;
    if (isCustomPaper && customPaperWidth && customPaperHeight) {
        // Evaluate only the custom paper size
        paperSizesToEvaluate = [{
            id: `custom_${customPaperWidth}x${customPaperHeight}`,
            label: `Custom (${Math.round(customPaperWidth)}×${Math.round(customPaperHeight)}mm)`,
            widthMM: customPaperWidth,
            heightMM: customPaperHeight,
            widthInch: customPaperWidth / 25.4,
            heightInch: customPaperHeight / 25.4
        }];
    }

    for (const size of paperSizesToEvaluate) {
        const sheetW = size.widthMM;
        const sheetH = size.heightMM;

        const printableW = sheetW - (side * 2);
        const printableH = sheetH - gripper - tail;

        // Calculate ups in both orientations
        const upsP_across = Math.floor(printableW / trimW);
        const upsP_down = Math.floor(printableH / trimH);
        const upsP = upsP_across * upsP_down;

        const upsL_across = Math.floor(printableW / trimH);
        const upsL_down = Math.floor(printableH / trimW);
        const upsL = upsL_across * upsL_down;

        const bestUps = Math.min(Math.max(upsP, upsL), OPTIMIZER_CONSTRAINTS.MAX_UPS);

        if (bestUps <= 0) {
            options.push({
                sheetId: size.id,
                label: size.label,
                widthMM: sheetW,
                heightMM: sheetH,
                widthInch: size.widthInch,
                heightInch: size.heightInch,
                ups: 0,
                orientation: 'PORTRAIT',
                grainCompliant: false,
                paperWastePct: 100,
                totalCost: Infinity,
                costPerCopy: Infinity,
                score: Infinity,
                selected: false,
                rejectionReason: 'Sheet too small for trim size',
            });
            continue;
        }

        const orient = upsP >= upsL ? 'PORTRAIT' as const : 'LANDSCAPE' as const;

        // Grain check: for books, grain parallel to spine (= parallel to height)
        let isLongGrain = sheetH > sheetW;
        if (isCustomPaper && customPaperGrain) {
            isLongGrain = customPaperGrain === "LONG_GRAIN";
        }
        const grainOk = orient === 'PORTRAIT' ? isLongGrain : !isLongGrain;

        // HARD RULE: Reject cross grain for strict bindings
        if (!grainOk && bindingType) {
            const isStrict = OPTIMIZER_CONSTRAINTS.STRICT_BINDINGS.some(b => bindingType.toLowerCase().includes(b));
            if (isStrict) {
                options.push({
                    sheetId: size.id, label: size.label,
                    widthMM: sheetW, heightMM: sheetH,
                    widthInch: size.widthInch, heightInch: size.heightInch,
                    ups: bestUps, orientation: orient,
                    grainCompliant: false,
                    paperWastePct: 100, totalCost: Infinity, costPerCopy: Infinity, score: Infinity,
                    selected: false,
                    rejectionReason: `Cross-grain rejected for ${bindingType} binding`,
                });
                continue;
            }
        }

        // Calculate paper waste percentage
        const usedArea = bestUps * trimW * trimH;
        const totalArea = sheetW * sheetH;
        const wastePct = Math.max(0, ((totalArea - usedArea) / totalArea) * 100);

        // Estimate cost for this sheet option
        const ppPerForm = Math.min(
            sectionType === 'cover' ? totalPages : (totalPages <= 16 ? 8 : 16),
            bestUps * 2,
            totalPages
        );
        const numberOfForms = Math.max(1, Math.ceil(totalPages / ppPerForm));
        const netSheets = Math.ceil((quantity * numberOfForms) / bestUps);
        const runningWastePct = lookupTPWastagePercent(netSheets);
        const wastageSheets = Math.ceil(netSheets * runningWastePct / 100);
        const grossSheets = netSheets + wastageSheets;

        const sheetAreaSqM = (sheetW / 1000) * (sheetH / 1000);
        const sheetWeightKg = sheetAreaSqM * gsm / 1000;
        const totalWeightKg = grossSheets * sheetWeightKg;
        const totalCost = totalWeightKg * costPerKg;
        const costPerCopy = quantity > 0 ? totalCost / quantity : 0;

        // ── PROFESSIONAL SCORING ─────────────────────────────────────────────
        // score = (cost_per_copy × 0.7) + (waste_pct × 0.2) + (grain_penalty × 0.1)
        // Cost dominates → Sheet B at 9% waste / Rs 19 beats Sheet A at 6% waste / Rs 22
        const grainPenalty = grainOk ? 0 : OPTIMIZER_CONSTRAINTS.GRAIN_PENALTY;
        const score =
            (costPerCopy * OPTIMIZER_CONSTRAINTS.SHEET_COST_WEIGHT) +
            (wastePct * OPTIMIZER_CONSTRAINTS.SHEET_WASTE_WEIGHT) +
            (grainPenalty * OPTIMIZER_CONSTRAINTS.SHEET_GRAIN_WEIGHT);

        options.push({
            sheetId: size.id,
            label: size.label,
            widthMM: sheetW,
            heightMM: sheetH,
            widthInch: size.widthInch,
            heightInch: size.heightInch,
            ups: bestUps,
            orientation: orient,
            grainCompliant: grainOk,
            paperWastePct: wastePct,
            totalCost: totalCost,
            costPerCopy: costPerCopy,
            score: score,
            selected: false,
            rejectionReason: null,
        });
    }

    // Sort by score (ascending — lowest score wins)
    options.sort((a, b) => a.score - b.score);

    // Mark best
    if (options.length > 0 && options[0].score < Infinity) {
        options[0].selected = true;
    }

    return options;
}

// ─── 2. MACHINE OPTIMIZER ────────────────────────────────────────────────────
// Score = (cost × 0.6) + (time × hourly_rate × 0.3) + (quality_penalty × 0.1)

export function optimizeMachine(
    sheetWidthMM: number,
    sheetHeightMM: number,
    maxColors: number,
    totalPlates: number,
    totalImpressions: number,
    paperSizeCode: string,
    quantity: number,
    previousMachineId?: string,
): MachineOption[] {
    const { machines } = useMachineStore.getState();
    // machines is a Map<string, Machine> — convert to array first
    const allMachines = Array.from(machines.values());
    const activeMachines = allMachines.filter((m: any) => !m.isArchived && m.status === 'ACTIVE');

    // Fallback to default machines if store is empty
    const machineList: any[] = activeMachines.length > 0 ? activeMachines : DEFAULT_MACHINES;

    const options: MachineOption[] = [];

    for (const machine of machineList) {
        const maxW_mm = (machine.maxSheetWidth || machine.maxSheetWidth_mm || 585);
        const maxH_mm = (machine.maxSheetHeight || machine.maxSheetHeight_mm || 915);

        // Check if sheet fits this machine (either orientation)
        const fitsNormal = sheetWidthMM <= maxW_mm && sheetHeightMM <= maxH_mm;
        const fitsRotated = sheetHeightMM <= maxW_mm && sheetWidthMM <= maxH_mm;
        const canPrint = fitsNormal || fitsRotated;

        // Check colour capability
        const machineColors = machine.maxColors || machine.maxColorsPerPass || 4;
        const hasEnoughColors = machineColors >= maxColors;

        if (!canPrint || !hasEnoughColors) {
            options.push({
                machineId: machine.id,
                machineName: machine.name,
                machineCode: machine.code || machine.id,
                canPrint: false,
                totalCost: Infinity,
                costPerCopy: Infinity,
                timeHours: Infinity,
                score: Infinity,
                selected: false,
                rejectionReason: !canPrint
                    ? `Sheet ${Math.round(sheetWidthMM)}×${Math.round(sheetHeightMM)}mm exceeds machine max`
                    : `Machine has ${machineColors} colours, job needs ${maxColors}`,
            });
            continue;
        }

        // Calculate cost for this machine
        const machineCode = getMachineCodeFromId(machine.code || machine.id);
        const plateRates = lookupTPPlateRates(machineCode);
        const ctpCost = totalPlates * plateRates.ctpRatePerPlate;
        const printPlateCost = totalPlates * plateRates.printingRatePerPlate;
        const impressionRate = lookupTPImpressionRate(totalImpressions, paperSizeCode, maxColors);
        const impressionCost = (totalImpressions / 1000) * impressionRate;

        const totalCost = ctpCost + printPlateCost + impressionCost;
        const costPerCopy = quantity > 0 ? totalCost / quantity : 0;

        // Time estimate
        const speed = machine.speedSPH || machine.effectiveSpeed || 8000;
        const timeHours = totalImpressions / speed + (machine.makeReadyTime || 0.3);

        // ── SCORING ──────────────────────────────────────────────────────────
        const hourlyRate = machine.hourlyRate || 3200;
        const costScore = costPerCopy * OPTIMIZER_CONSTRAINTS.MACHINE_COST_WEIGHT;
        const timeScore = (timeHours * hourlyRate / Math.max(1, quantity)) * OPTIMIZER_CONSTRAINTS.MACHINE_TIME_WEIGHT;
        const qualityScore = 0 * OPTIMIZER_CONSTRAINTS.MACHINE_QUALITY_WEIGHT;
        const machineChangePenalty = (previousMachineId && machine.id !== previousMachineId) ? OPTIMIZER_CONSTRAINTS.MACHINE_CHANGE_PENALTY : 0;

        const score = costScore + timeScore + qualityScore + machineChangePenalty;

        options.push({
            machineId: machine.id,
            machineName: machine.name,
            machineCode: machine.code || machine.id,
            canPrint: true,
            totalCost: totalCost,
            costPerCopy: costPerCopy,
            timeHours: timeHours,
            score: score,
            selected: false,
            rejectionReason: null,
        });
    }

    // Sort by score
    options.sort((a, b) => a.score - b.score);

    if (options.length > 0 && options[0].score < Infinity) {
        options[0].selected = true;
    }

    return options;
}

// ─── 3. SIGNATURE OPTIMIZATION LOOP (THE KEY IMPROVEMENT) ────────────────────
// Tests ALL signature sizes: 4pp, 8pp, 16pp, 32pp
// For each, calculates: paper cost + CTP cost + printing cost
// Picks the combination with LOWEST TOTAL COST.
//
// Why this matters:
//   Sig  | Plates | Paper Waste | Cost
//   4pp  | many   | low        | high (many forms = many plates)
//   8pp  | medium | medium     | medium
//   16pp | fewer  | medium     | low (sweet spot for most jobs)
//   32pp | few    | high       | medium (large sheet, high waste)
//
// Only the loop can find the true minimum.

export function optimizeSignature(params: {
    totalPages: number;
    sheetWidthMM: number;
    sheetHeightMM: number;
    trimWidthMM: number;
    trimHeightMM: number;
    gsm: number;
    costPerKg: number;
    quantity: number;
    colorsFront: number;
    colorsBack: number;
    machineCode: string;
    paperSizeCode: string;
    bleedMM?: number;
    identicalForms?: boolean;
}): SignatureOption[] {
    const {
        totalPages, sheetWidthMM, sheetHeightMM,
        trimWidthMM, trimHeightMM, gsm, costPerKg,
        quantity, colorsFront, colorsBack,
        machineCode, paperSizeCode,
    } = params;
    const bleedMM = params.bleedMM ?? 3;

    const trimW = trimWidthMM + (bleedMM * 2);
    const trimH = trimHeightMM + (bleedMM * 2);

    const gripper = 12;
    const tail = 8;
    const side = 5;
    const printableW = sheetWidthMM - (side * 2);
    const printableH = sheetHeightMM - gripper - tail;

    // Calculate max ups for this sheet
    const upsP = Math.floor(printableW / trimW) * Math.floor(printableH / trimH);
    const upsL = Math.floor(printableW / trimH) * Math.floor(printableH / trimW);
    const maxUps = Math.min(Math.max(upsP, upsL, 1), OPTIMIZER_CONSTRAINTS.MAX_UPS);

    // Candidate signatures: 4, 8, 16, 32 (filtered by what fits)
    const candidates = [4, 8, 16, 32].filter(pp =>
        pp <= totalPages && pp <= OPTIMIZER_CONSTRAINTS.MAX_SIGNATURE
    );
    // Always try totalPages itself if it's small enough
    if (totalPages <= OPTIMIZER_CONSTRAINTS.MAX_SIGNATURE && !candidates.includes(totalPages)) {
        candidates.push(totalPages);
    }
    // Ensure at least one candidate
    if (candidates.length === 0) {
        candidates.push(Math.min(4, totalPages));
    }

    const maxColors = Math.max(colorsFront, colorsBack);
    const mCode = getMachineCodeFromId(machineCode);
    const plateRates = lookupTPPlateRates(mCode);
    const mrWaste = lookupTPMachineReadyWastage(mCode, maxColors);

    const sheetAreaSqM = (sheetWidthMM / 1000) * (sheetHeightMM / 1000);
    const sheetWeightKg = sheetAreaSqM * gsm / 1000;

    const options: SignatureOption[] = [];

    for (const ppPerForm of candidates) {
        // PP per form limited by what fits on the press sheet
        const effectivePP = Math.min(ppPerForm, maxUps * 2, totalPages);
        if (effectivePP <= 0) continue;

        const numberOfForms = Math.max(1, Math.ceil(totalPages / effectivePP));
        const ups = Math.min(Math.floor(effectivePP / 2), maxUps);
        if (ups <= 0) continue;

        // ── PAPER COST ───────────────────────────────────────────────────────
        const netSheets = Math.ceil((quantity * numberOfForms) / ups);

        // ADDITIVE wastage: M/R + running
        const mrWasteSheets = numberOfForms * maxColors * mrWaste;
        const runningWastePct = lookupTPWastagePercent(netSheets);
        const runningWasteSheets = Math.ceil(netSheets * runningWastePct / 100);
        const wastageSheets = Math.ceil(mrWasteSheets + runningWasteSheets);
        const grossSheets = netSheets + wastageSheets;

        const totalWeightKg = grossSheets * sheetWeightKg;
        const paperCost = totalWeightKg * costPerKg;

        // ── PLATE COUNT ──────────────────────────────────────────────────────
        // plates = (colours_front × forms) + (colours_back × forms)
        // If identicalForms, we only need 1 set of plates!
        const effectiveFormsForPlates = params.identicalForms ? 1 : numberOfForms;
        const totalPlates = (colorsFront * effectiveFormsForPlates) + (colorsBack * effectiveFormsForPlates);

        // ── CTP COST ─────────────────────────────────────────────────────────
        const ctpCost = totalPlates * plateRates.ctpRatePerPlate;

        // ── PRINTING COST ────────────────────────────────────────────────────
        const printPlateCost = totalPlates * plateRates.printingRatePerPlate;
        const impressionRate = lookupTPImpressionRate(grossSheets, paperSizeCode, maxColors);
        const impressionCost = (grossSheets / 1000) * impressionRate;
        const printingCost = printPlateCost + impressionCost;

        // ── TOTAL COST ───────────────────────────────────────────────────────
        const totalCost = paperCost + ctpCost + printingCost;
        const costPerCopy = quantity > 0 ? totalCost / quantity : 0;

        // Paper waste %
        const usedArea = ups * trimW * trimH;
        const totalArea = sheetWidthMM * sheetHeightMM;
        const wastePct = Math.max(0, ((totalArea - usedArea) / totalArea) * 100);

        // Score = total cost per copy (lowest wins)
        const score = costPerCopy;

        const traceDetail =
            `${effectivePP}pp: ${numberOfForms} forms, ${ups} ups → ` +
            `${totalPlates} plates, ${grossSheets} sheets → ` +
            `Paper ₹${Math.round(paperCost)} + CTP ₹${Math.round(ctpCost)} + Print ₹${Math.round(printingCost)} ` +
            `= ₹${Math.round(totalCost)} (₹${costPerCopy.toFixed(3)}/copy)`;

        options.push({
            ppPerForm: effectivePP,
            numberOfForms,
            ups,
            pressSheets: netSheets,
            wastageSheets,
            grossSheets,
            totalPlates,
            paperCost: paperCost,
            ctpCost: ctpCost,
            printingCost: printingCost,
            totalCost: totalCost,
            costPerCopy: costPerCopy,
            wastePct: wastePct,
            score: score,
            selected: false,
            traceDetail,
        });
    }

    // Sort by total cost per copy (lowest wins)
    options.sort((a, b) => a.score - b.score);

    if (options.length > 0) {
        options[0].selected = true;
    }

    return options;
}

// ─── HELPER ──────────────────────────────────────────────────────────────────

function getMachineCodeFromId(codeOrId: string): string {
    const c = (codeOrId || '').toUpperCase();
    if (c.includes('FAV')) return 'FAV';
    if (c.includes('REK')) return 'REK';
    if (c.includes('RMGT')) return 'RMGT';
    if (c.includes('AKI')) return 'AKI';
    return 'RMGT';
}

// ─── FULL OPTIMIZATION RUN ───────────────────────────────────────────────────
// Runs sheet + signature + machine optimization in sequence

export function runFullOptimization(params: {
    trimWidthMM: number;
    trimHeightMM: number;
    gsm: number;
    costPerKg: number;
    quantity: number;
    totalPages: number;
    colorsFront: number;
    colorsBack: number;
    machineCode?: string;
    sectionType?: string;
    bindingType?: string;
    identicalForms?: boolean;
    previousMachineId?: string;
    bleedMM?: number;
    spineThickness?: number;
}): OptimizationResult {
    const startTime = performance.now();
    let combinations = 0;

    const maxColors = Math.max(params.colorsFront, params.colorsBack);

    // 1. Sheet optimization
    const sheets = optimizeSheetSize(
        params.trimWidthMM, params.trimHeightMM,
        params.gsm, params.costPerKg,
        params.quantity, params.totalPages,
        maxColors,
        params.sectionType, params.bindingType, params.bleedMM, params.spineThickness
    );
    combinations += sheets.length;

    const bestSheet = sheets.find(s => s.selected) || null;

    // 2. Signature optimization loop (using best sheet)
    let signatures: SignatureOption[] = [];
    if (bestSheet) {
        signatures = optimizeSignature({
            totalPages: params.totalPages,
            sheetWidthMM: bestSheet.widthMM,
            sheetHeightMM: bestSheet.heightMM,
            trimWidthMM: params.trimWidthMM,
            trimHeightMM: params.trimHeightMM,
            gsm: params.gsm,
            costPerKg: params.costPerKg,
            quantity: params.quantity,
            colorsFront: params.colorsFront,
            colorsBack: params.colorsBack,
            machineCode: params.machineCode || 'RMGT',
            paperSizeCode: bestSheet.label,
            bleedMM: params.bleedMM,
            identicalForms: params.identicalForms,
        });
        combinations += signatures.length;
    }

    const bestSignature = signatures.find(s => s.selected) || null;

    // 3. Machine optimization (using best sheet + best signature)
    let machines: MachineOption[] = [];
    if (bestSheet && bestSignature) {
        machines = optimizeMachine(
            bestSheet.widthMM, bestSheet.heightMM,
            maxColors,
            bestSignature.totalPlates,
            bestSignature.grossSheets,
            bestSheet.label,
            params.quantity,
            params.previousMachineId,
        );
        combinations += machines.length;
    }

    const bestMachine = machines.find(m => m.selected) || null;

    const elapsedMs = performance.now() - startTime;

    return {
        bestSheet,
        allSheets: sheets,
        bestMachine,
        allMachines: machines,
        bestSignature,
        allSignatures: signatures,
        optimizationTimeMs: Math.round(elapsedMs * 100) / 100,
        combinationsEvaluated: combinations,
    };
}
