// ============================================================================
// FULL ESTIMATION ORCHESTRATOR — THOMSON PRESS CALIBRATED (REWRITE)
// ============================================================================
// Implements the EXACT calculation pipeline from the Excel workbook:
//
//   STEP 1-3: Input → Signature → Imposition
//   STEP 4:   Wastage (ADDITIVE: M/R + running)
//   STEP 5-7: Paper → CTP → Printing (SEPARATE cost lines)
//   STEP 8-9: Binding → Finishing
//   STEP 10:  Covering material
//   STEP 11:  PVC aggregation
//   STEP 12:  Machine hours
//   STEP 13:  Packing
//   STEP 14:  Freight
//   STEP 15:  Selling price (MAX formula from V189)
//   STEP 16:  Currency conversion
//
// CALIBRATION TARGET:
//   Production: Rs 31.31/copy, Paper: Rs 21.53/copy
//   Packing: Rs 4.08/copy, Freight: Rs 7.84/copy
//   GRAND TOTAL: Rs 65.25/copy = GBP 0.738 FOB Mumbai
//
// CRITICAL FORMULA (V189):
//   selling_price = MAX(
//     (base_cost + machine_overhead/qty/conv) / (1 - margin%),
//     base_cost / (1 - discount%) / (1 - margin%)
//   )
// ============================================================================

import type {
  EstimationInput,
  EstimationResult,
  SectionPaperCost,
  SectionPrintingCost,
  PackingBreakdown,
  SectionCTPCost,
} from "@/types";
import { calculatePaperRequirement } from "./paper";
import { calculatePrintingCostGodLevel } from "./printing";
import { calculateBindingCostGodLevel } from "./binding";
import { calculateFinishingCostGodLevel, type FinishingOperationDef } from "./finishing";
import { calculatePackingCostGodLevel } from "./packing";
import { calculateFreightCostGodLevel } from "./freight";
import { generateId } from "@/utils/format";
import { lookupTPPlateRates } from "./constants";
import { validateJob, type ValidationResult } from "./validate";
import { createTrace, type TraceBuilder } from "./trace";



function normalizePrintMethod(method: string): "SHEETWISE" | "WORK_AND_TURN" | "WORK_AND_TUMBLE" | "PERFECTING" {
  const m = (method || "").toLowerCase();
  if (m === "work_and_turn") return "WORK_AND_TURN";
  if (m === "work_and_tumble") return "WORK_AND_TUMBLE";
  if (m === "perfector" || m === "perfecting") return "PERFECTING";
  return "SHEETWISE";
}

function round2(n: number): number {
  return Math.round((n || 0) * 100) / 100;
}

function round3(n: number): number {
  return Math.round((n || 0) * 1000) / 1000;
}

// ─── SELLING PRICE: MAX() FORMULA FROM EXCEL V189 ────────────────────────────
// V189 = MAX(
//   ROUNDUP((V188 + B224*B223/D8/I207) / (1-T189), 3),
//   ROUNDUP(V188 / (1-AK189) / (1-T189), 3)
// )
function calculateSellingPriceTP(
  baseCostPerCopy: number,     // V188: PVC per copy
  machineHourlyRate: number,   // B224: machine hourly rate (typically Rs 6,500)
  totalMachineHours: number,   // B223: total machine hours
  quantity: number,             // D8: print quantity
  conversionFactor: number,     // I207: depends on binding type
  marginPercent: number,        // T189: target margin (e.g., 0.25 = 25%)
  discountPercent: number,      // AK189: discount factor (e.g., 0.05 = 5%)
): { pricePerCopy: number; method: string } {

  // Option A: cost + machine overhead
  const machineOverheadPerCopy = (machineHourlyRate * totalMachineHours) / Math.max(1, quantity) / Math.max(0.01, conversionFactor);
  const priceA = (baseCostPerCopy + machineOverheadPerCopy) / Math.max(0.01, 1 - marginPercent);
  const priceARounded = Math.ceil(priceA * 1000) / 1000; // ROUNDUP to 3 decimal places

  // Option B: cost + margin + discount
  const priceB = baseCostPerCopy / Math.max(0.01, 1 - discountPercent) / Math.max(0.01, 1 - marginPercent);
  const priceBRounded = Math.ceil(priceB * 1000) / 1000;

  // Final selling price = MAX(A, B)
  if (priceARounded >= priceBRounded) {
    return { pricePerCopy: priceARounded, method: 'overhead' };
  } else {
    return { pricePerCopy: priceBRounded, method: 'margin' };
  }
}

export function calculateFullEstimation(estimation: EstimationInput): EstimationResult[] {
  // ── STEP 0: VALIDATION ───────────────────────────────────────────────
  const validation = validateJob(estimation);
  if (!validation.valid) {
    console.error('❌ Validation failed:', validation.errors.map(e => e.message).join('; '));
    // Don't throw — let UI show errors. Log and continue with best-effort.
  }
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Validation warnings:', validation.warnings.map(w => w.message).join('; '));
  }

  const results: EstimationResult[] = [];
  const activeQuantities = estimation.quantities.filter((q) => q > 0);
  if (activeQuantities.length === 0) return results;

  activeQuantities.forEach((quantity, qi) => {
    try {
      // ── TRACE INIT ──────────────────────────────────────────────────
      const isDebug = typeof window !== 'undefined' && (window as any).__PRINT_DEBUG__;
      const trace = createTrace(estimation.jobTitle || 'Untitled', isDebug || import.meta.env?.DEV);

      trace.section('Job Parameters');
      trace.log('Job Title', estimation.jobTitle || '—');
      trace.log('Quantity', quantity);
      trace.log('Trim Size', `${estimation.bookSpec.widthMM}×${estimation.bookSpec.heightMM}mm`);
      trace.log('Binding', estimation.binding.primaryBinding);
      trace.separator();

      const paperCosts: SectionPaperCost[] = [];
      const printingCosts: SectionPrintingCost[] = [];
      const ctpCosts: SectionCTPCost[] = [];
      const rawPaperResults: any[] = [];
      const rawPrintResults: any[] = [];

      let totalForms = 0;

      // ── STEP 1-3: TEXT SECTIONS ────────────────────────────────────────
      for (let i = 0; i < estimation.textSections.length; i++) {
        const section = estimation.textSections[i];
        if (!section.enabled || section.pages <= 0) continue;

        trace.section(`Paper — ${section.label}`);
        trace.log('Pages', section.pages);
        trace.log('GSM', section.gsm);
        trace.log('Colors', `${section.colorsFront}/${section.colorsBack}`);

        const paperRaw = calculatePaperRequirement({
          sectionName: section.label,
          sectionType: i === 0 ? "text1" : "text2",
          totalPages: section.pages,
          trimWidthMM: estimation.bookSpec.widthMM,
          trimHeightMM: estimation.bookSpec.heightMM,
          gsm: section.gsm,
          paperType: section.paperTypeName,
          paperCode: section.paperTypeId,
          paperSizeLabel: section.paperSizeLabel,
          quantity,
          colorsFront: section.colorsFront,
          colorsBack: section.colorsBack,
          printingMethod: normalizePrintMethod(section.printingMethod),
          machineCode: section.machineId, // For M/R wastage lookup
        });
        rawPaperResults.push(paperRaw);

        trace.log('Sheet size', paperRaw.paperSize);
        trace.log('PP/form', paperRaw.ppPerForm);
        trace.log('Forms', paperRaw.numberOfForms);
        trace.log('Ups', paperRaw.ups);
        trace.value('Net sheets', paperRaw.netSheets);
        trace.value('Wastage sheets', paperRaw.wastageSheets);
        trace.value('Gross sheets', paperRaw.grossSheets);
        trace.cost('Paper cost', paperRaw.totalCost);
        trace.cost('Paper/copy', paperRaw.totalCost / Math.max(1, quantity), 'per copy');

        paperCosts.push({
          sectionName: paperRaw.sectionName,
          sectionType: paperRaw.sectionType as any,
          paperType: paperRaw.paperType,
          gsm: paperRaw.gsm,
          paperSize: paperRaw.paperSize,
          ppPerForm: paperRaw.ppPerForm,
          numberOfForms: paperRaw.numberOfForms,
          ups: paperRaw.ups,
          formatSize: paperRaw.formatSize,
          netSheets: paperRaw.netSheets,
          wastageSheets: paperRaw.wastageSheets,
          grossSheets: paperRaw.grossSheets,
          reams: paperRaw.reams,
          weightPerReam: paperRaw.weightPerReam,
          totalWeight: paperRaw.totalWeight,
          ratePerReam: paperRaw.ratePerReam,
          totalCost: paperRaw.totalCost,
          imposition: paperRaw.imposition,
          grainCompliant: paperRaw.grainAnalysis?.grainCompliant ?? true,
          sourceSelection: paperRaw.sourceSelection,
          procurementRecommendation: paperRaw.procurementRecommendation,
        });
        totalForms += paperRaw.numberOfForms;

        trace.section(`Printing — ${section.label}`);

        const printRaw = calculatePrintingCostGodLevel({
          sectionName: section.label,
          sectionType: i === 0 ? "text1" : "text2",
          machineId: section.machineId,
          colorsFront: section.colorsFront,
          colorsBack: section.colorsBack,
          quantity,
          imposition: paperRaw.imposition,
          wastageResult: paperRaw.wastageResult,
          substrate: paperRaw.substrate,
          printingMethod: normalizePrintMethod(section.printingMethod),
        });
        rawPrintResults.push(printRaw);

        trace.log('Machine', printRaw.machineName);
        trace.value('Total plates', printRaw.totalPlates);
        trace.value('Total impressions', printRaw.totalImpressions);
        trace.cost('CTP cost', printRaw.platesCost);
        trace.cost('Printing plate cost', printRaw.printingPlateCost);
        trace.cost('Total print+CTP', printRaw.totalCost);
        trace.cost('Print/copy', printRaw.totalCost / Math.max(1, quantity), 'per copy');

        printingCosts.push({
          sectionName: printRaw.sectionName,
          sectionType: printRaw.sectionType,
          machineId: printRaw.machineId,
          machineName: printRaw.machineName,
          totalPlates: printRaw.totalPlates,
          impressionsPerForm: printRaw.impressionsPerForm,
          totalImpressions: printRaw.totalImpressions,
          ratePer1000: printRaw.effectiveRatePer1000,
          printingCost: printRaw.printingPlateCost,  // Press running cost only
          makeReadyCost: printRaw.timeMakereadyCost,
          runningHours: printRaw.kinematics.runningTime_hours,
          makereadyHours: printRaw.makeready.totalMakereadyTime_hours,
          totalCost: printRaw.totalCost,  // Includes CTP + printing + impression
        });

        // ── CTP COST: Separate line item ──
        ctpCosts.push({
          sectionName: section.label,
          sectionType: i === 0 ? "text1" : "text2",
          totalPlates: printRaw.totalPlates,
          ratePerPlate: printRaw.platesCost / (printRaw.totalPlates || 1),
          totalCost: printRaw.platesCost,  // CTP cost only
        });
      }

      // ── COVER SECTION ──────────────────────────────────────────────────
      if (estimation.cover.enabled && !estimation.cover.selfCover) {
        // Pre-calculate spine for cover dimensions
        const bindingRawFast = calculateBindingCostGodLevel({
          jobType: "BOOK",
          bindingMethod: estimation.binding.primaryBinding.includes("perfect")
            ? "PERFECT"
            : estimation.binding.primaryBinding.includes("case")
              ? "CASE"
              : "SECTION_SEWN",
          quantity,
          bookWidth_mm: estimation.bookSpec.widthMM,
          bookHeight_mm: estimation.bookSpec.heightMM,
          textSections: estimation.textSections
            .filter((s) => s.enabled)
            .map((s, idx) => ({
              pages: s.pages,
              substrate: rawPaperResults[idx]?.substrate || ({ caliper_microns: s.gsm * 1.05, grammage_gsm: s.gsm, bulkFactor: 1.0 } as any),
              signatures: Math.ceil(s.pages / 16),
            })),
        });

        const coverPaperRaw = calculatePaperRequirement({
          sectionName: "Cover",
          sectionType: "cover",
          totalPages: estimation.cover.pages,
          trimWidthMM: estimation.bookSpec.widthMM,
          trimHeightMM: estimation.bookSpec.heightMM,
          gsm: estimation.cover.gsm,
          paperType: estimation.cover.paperTypeName,
          paperCode: estimation.cover.paperTypeId,
          paperSizeLabel: estimation.cover.paperSizeLabel,
          quantity,
          colorsFront: estimation.cover.colorsFront,
          colorsBack: estimation.cover.colorsBack,
          spineThickness: bindingRawFast.geometry.totalSpineThickness_mm,
          printingMethod: "SHEETWISE",
          machineCode: estimation.cover.machineId,
        });
        rawPaperResults.push(coverPaperRaw);

        paperCosts.push({
          sectionName: coverPaperRaw.sectionName,
          sectionType: "cover",
          paperType: coverPaperRaw.paperType,
          gsm: coverPaperRaw.gsm,
          paperSize: coverPaperRaw.paperSize,
          ppPerForm: coverPaperRaw.ppPerForm,
          numberOfForms: coverPaperRaw.numberOfForms,
          ups: coverPaperRaw.ups,
          formatSize: coverPaperRaw.formatSize,
          netSheets: coverPaperRaw.netSheets,
          wastageSheets: coverPaperRaw.wastageSheets,
          grossSheets: coverPaperRaw.grossSheets,
          reams: coverPaperRaw.reams,
          weightPerReam: coverPaperRaw.weightPerReam,
          totalWeight: coverPaperRaw.totalWeight,
          ratePerReam: coverPaperRaw.ratePerReam,
          totalCost: coverPaperRaw.totalCost,
          imposition: coverPaperRaw.imposition,
          grainCompliant: coverPaperRaw.grainAnalysis?.grainCompliant ?? true,
          sourceSelection: coverPaperRaw.sourceSelection,
          procurementRecommendation: coverPaperRaw.procurementRecommendation,
        });

        const coverPrintRaw = calculatePrintingCostGodLevel({
          sectionName: "Cover",
          sectionType: "cover",
          machineId: estimation.cover.machineId,
          colorsFront: estimation.cover.colorsFront,
          colorsBack: estimation.cover.colorsBack,
          quantity,
          imposition: coverPaperRaw.imposition,
          wastageResult: coverPaperRaw.wastageResult,
          substrate: coverPaperRaw.substrate,
          printingMethod: "SHEETWISE",
        });
        rawPrintResults.push(coverPrintRaw);

        printingCosts.push({
          sectionName: coverPrintRaw.sectionName,
          sectionType: "cover",
          machineId: coverPrintRaw.machineId,
          machineName: coverPrintRaw.machineName,
          totalPlates: coverPrintRaw.totalPlates,
          impressionsPerForm: coverPrintRaw.impressionsPerForm,
          totalImpressions: coverPrintRaw.totalImpressions,
          ratePer1000: coverPrintRaw.effectiveRatePer1000,
          printingCost: coverPrintRaw.printingPlateCost,
          makeReadyCost: coverPrintRaw.timeMakereadyCost,
          runningHours: coverPrintRaw.kinematics.runningTime_hours,
          makereadyHours: coverPrintRaw.makeready.totalMakereadyTime_hours,
          totalCost: coverPrintRaw.totalCost,
        });

        ctpCosts.push({
          sectionName: "Cover",
          sectionType: "cover",
          totalPlates: coverPrintRaw.totalPlates,
          ratePerPlate: coverPrintRaw.platesCost / (coverPrintRaw.totalPlates || 1),
          totalCost: coverPrintRaw.platesCost,
        });
      }

      // ── BINDING ────────────────────────────────────────────────────────
      const bindingRaw = calculateBindingCostGodLevel({
        jobType: "BOOK",
        bindingMethod: estimation.binding.primaryBinding.includes("perfect")
          ? "PERFECT"
          : estimation.binding.primaryBinding.includes("case")
            ? "CASE"
            : "SECTION_SEWN",
        quantity,
        bookWidth_mm: estimation.bookSpec.widthMM,
        bookHeight_mm: estimation.bookSpec.heightMM,
        textSections: estimation.textSections
          .filter((s) => s.enabled)
          .map((s, idx) => ({
            pages: s.pages,
            substrate: rawPaperResults.find((r) => r.sectionType === (idx === 0 ? "text1" : "text2"))?.substrate as any,
            signatures:
              rawPaperResults.find((r) => r.sectionType === (idx === 0 ? "text1" : "text2"))?.numberOfForms ||
              Math.ceil(s.pages / 16),
          })),
        hardcoverSpecs: estimation.binding.primaryBinding.includes("case") ? {
          boardThickness_mm: estimation.binding.boardThickness || 3,
          clothMaterial: estimation.binding.coveringMaterialName || 'printed_paper',
          headTailBands: estimation.binding.headTailBand || false,
          ribbonMarker: (estimation.binding.ribbonMarker || 0) > 0,
        } : undefined,
      });

      // ── COST AGGREGATION ───────────────────────────────────────────────
      const totalPaperCost = paperCosts.reduce((sum, p) => sum + (p.totalCost || 0), 0);

      // CTP and Printing are now properly separated inside printing engine
      // totalCost from printing includes CTP + printing plate + impression
      const totalPrintingCost = printingCosts.reduce((sum, p) => sum + (p.totalCost || 0), 0);
      const totalCTPCost = ctpCosts.reduce((sum, c) => sum + (c.totalCost || 0), 0);

      // NOTE: CTP cost is INCLUDED in totalPrintingCost already
      // The ctpCosts array is for DISPLAY purposes (breakdown)
      // We should NOT add totalCTPCost again to avoid double-counting

      const totalPaperWeightKg = paperCosts.reduce((sum, p) => sum + (p.totalWeight || 0), 0);
      const bookWeightGrams = quantity > 0 ? (totalPaperWeightKg * 1000) / quantity : 0;

      // ── FINISHING ──────────────────────────────────────────────────────
      const finishingOperations: FinishingOperationDef[] = [];
      if (estimation.finishing.coverLamination.enabled && estimation.finishing.coverLamination.type !== "none") {
        finishingOperations.push({
          type: "LAMINATION",
          params: { filmType: `BOPP_${estimation.finishing.coverLamination.type.toUpperCase()}`, sides: 1, isThermal: true },
        });
      }
      if (estimation.finishing.uvVarnish.enabled) {
        finishingOperations.push({ type: "UV_VARNISH", params: {} });
      }
      if (estimation.finishing.spotUVCover.enabled) {
        finishingOperations.push({ type: "SPOT_UV", params: { coveragePercent: 15, raised: false } });
      }
      if (estimation.finishing.dieCutting.enabled) {
        finishingOperations.push({ type: "DIE_CUT", params: { complexity: estimation.finishing.dieCutting.complexity } });
      }
      if (estimation.finishing.embossing.enabled) {
        finishingOperations.push({ type: "EMBOSS", params: { multiLevel: estimation.finishing.embossing.type === "multi_level" } });
      }

      const finishingBasePaper = rawPaperResults.find((r) => r.sectionType === "cover") || rawPaperResults[0];
      const finishingSteps = finishingOperations.length
        ? calculateFinishingCostGodLevel({
          jobQuantity: quantity,
          totalPressSheets: finishingBasePaper?.grossSheets || quantity,
          sheetWidth_mm: finishingBasePaper?.imposition?.pressSheetWidth_mm || estimation.bookSpec.widthMM,
          sheetHeight_mm: finishingBasePaper?.imposition?.pressSheetHeight_mm || estimation.bookSpec.heightMM,
          ups: finishingBasePaper?.ups || 1,
          operations: finishingOperations,
        })
        : [];
      const finTotal = finishingSteps.reduce((sum, step) => sum + (step.totalStepCost || 0), 0);

      // ── PACKING ────────────────────────────────────────────────────────
      const packingRaw = calculatePackingCostGodLevel(quantity, {
        width_mm: estimation.bookSpec.widthMM,
        height_mm: estimation.bookSpec.heightMM,
        thickness_mm: Math.max(1, bindingRaw.geometry.totalSpineThickness_mm || estimation.bookSpec.spineThickness || 10),
        weight_grams: Math.max(1, bookWeightGrams || 1),
      });

      // ── FREIGHT ────────────────────────────────────────────────────────
      const freightMode = estimation.delivery.freightMode;
      const routeMode =
        freightMode === "air"
          ? "AIR"
          : freightMode === "sea"
            ? "SEA"
            : freightMode === "courier"
              ? "COURIER"
              : "ROAD_LTL";
      const international = estimation.delivery.deliveryType === "cif" || estimation.delivery.deliveryType === "fob";
      const freightRaw = calculateFreightCostGodLevel(packingRaw, {
        distance_km: international ? 5000 : freightMode === "road" ? 1200 : 800,
        zone: international ? "INTERNATIONAL" : "NATIONAL",
        mode: routeMode as any,
        isExpress: freightMode === "air" || freightMode === "courier",
        requiresTailift: packingRaw.palletsRequired > 0,
      });

      // ── PRE-PRESS ──────────────────────────────────────────────────────
      const totalPlatesAll = ctpCosts.reduce((sum, c) => sum + (c.totalPlates || 0), 0);
      const prePressCost =
        (estimation.prePress.epsonProofs || 0) * (estimation.prePress.epsonRatePerPage || 0) +
        (estimation.prePress.wetProofs || 0) * (estimation.prePress.wetProofRatePerForm || 0) * Math.max(1, totalForms) +
        ((estimation.prePress.filmOutput ? 1 : 0) * (estimation.prePress.filmRatePerPlate || 0) * totalPlatesAll) +
        (estimation.prePress.designCharges || 0);

      // ── ADDITIONAL COSTS ───────────────────────────────────────────────
      const additionalCost = (estimation.additionalCosts || []).reduce((sum, item) => {
        const line = item.isPerCopy ? (item.costPerCopy || 0) * quantity : (item.totalCost || 0);
        return sum + line;
      }, 0);

      // ── STEP 11: PVC AGGREGATION ───────────────────────────────────────
      // PVC = paper + printing (incl CTP) + binding + finishing + packing + freight + prepress + additional
      const totalProductionCost =
        totalPaperCost +
        totalPrintingCost +        // Already includes CTP cost
        bindingRaw.costBreakdown.totalCost +
        finTotal +
        packingRaw.materialCosts.total +
        freightRaw.totalFreightCost +
        prePressCost +
        additionalCost;

      const totalCostPerCopy = quantity > 0 ? totalProductionCost / quantity : 0;

      // ── STEP 12: MACHINE HOURS ─────────────────────────────────────────
      const makeReadyHours = printingCosts.reduce((sum, p) => sum + p.makereadyHours, 0);
      const runningHours = printingCosts.reduce((sum, p) => sum + p.runningHours, 0);
      const totalMachineHours = makeReadyHours + runningHours;

      // ── STEP 15: SELLING PRICE (EXCEL V189 MAX FORMULA) ────────────────
      const marginPct = Math.min(99.99, Math.max(0, estimation.pricing.marginPercent || 0)) / 100;
      const discountPct = (estimation.pricing.volumeDiscount || 0) / 100;
      const machineHourlyRate = 6500; // Target TPH rate
      const conversionFactor = 1.0; // Default, adjusted by binding type

      // Use Excel MAX formula for selling price
      const tpPrice = calculateSellingPriceTP(
        totalCostPerCopy,
        machineHourlyRate,
        totalMachineHours,
        quantity,
        conversionFactor,
        marginPct,
        discountPct,
      );

      const sellingPricePerCopy = tpPrice.pricePerCopy;
      const totalSellingPrice = sellingPricePerCopy * quantity;
      const marginAmount = totalSellingPrice - totalProductionCost;
      const commission = totalSellingPrice * ((estimation.pricing.commissionPercent || 0) / 100);

      const taxRate = estimation.pricing.taxType === "none" ? 0 : (estimation.pricing.taxRate || 0);
      const taxAmount = estimation.pricing.includesTax
        ? totalSellingPrice - totalSellingPrice / (1 + taxRate / 100)
        : totalSellingPrice * (taxRate / 100);
      const grandTotal = estimation.pricing.includesTax ? totalSellingPrice : totalSellingPrice + taxAmount;

      const fx = estimation.pricing.exchangeRate > 0 ? estimation.pricing.exchangeRate : 1;
      const totalSellingPriceForeign = estimation.pricing.currency === "INR" ? totalSellingPrice : totalSellingPrice / fx;
      const sellingPriceForeignCurrency = quantity > 0 ? totalSellingPriceForeign / quantity : 0;

      // ── PACKING BREAKDOWN ──────────────────────────────────────────────
      const packingBreakdownObj: PackingBreakdown = {
        booksPerCarton: packingRaw.unitsPerCarton,
        totalCartons: packingRaw.cartonsRequired,
        cartonCost: packingRaw.materialCosts.cartons,
        totalPallets: packingRaw.palletsRequired,
        palletCost: packingRaw.materialCosts.pallets,
        stretchWrapCost: packingRaw.materialCosts.stretchFilm,
        shrinkWrapCost: 0,
        strappingCost: packingRaw.materialCosts.tape_strapping,
        cornerProtectorCost: 0,
        otherPackingCost: 0,
        totalPackingCost: packingRaw.materialCosts.total,
        weightPerBook: bookWeightGrams,
        totalWeight: packingRaw.totalConsignmentWeight_kg,
      };

      // ── TRACE SUMMARY ──────────────────────────────────────────────────
      trace.section('Cost Summary');
      trace.separator();
      trace.cost('Paper', totalPaperCost);
      trace.cost('Paper/copy', totalPaperCost / Math.max(1, quantity), 'per copy');
      trace.separator();
      trace.cost('CTP (plate making)', totalCTPCost);
      trace.cost('Printing (total)', totalPrintingCost, '', 'includes CTP');
      trace.cost('Printing/copy', totalPrintingCost / Math.max(1, quantity), 'per copy');
      trace.separator();
      trace.cost('Binding', bindingRaw.costBreakdown.totalCost);
      trace.cost('Binding/copy', bindingRaw.costBreakdown.totalCost / Math.max(1, quantity), 'per copy');
      trace.separator();
      trace.cost('Finishing', finTotal);
      trace.cost('Packing', packingRaw.materialCosts.total);
      trace.cost('Freight', freightRaw.totalFreightCost);
      trace.cost('Pre-press', prePressCost);
      trace.separator();
      trace.cost('TOTAL PRODUCTION', totalProductionCost);
      trace.cost('COST/COPY', totalCostPerCopy, 'per copy');
      trace.cost('SELLING PRICE/COPY', sellingPricePerCopy, 'per copy', tpPrice.method);
      if (estimation.pricing.currency !== 'INR') {
        trace.cost(`PRICE (${estimation.pricing.currency})`, sellingPriceForeignCurrency, 'per copy');
      }
      trace.separator();
      trace.value('Machine hours', totalMachineHours, 'hrs');
      trace.value('TPH', Math.round(totalSellingPrice / Math.max(0.01, totalMachineHours)), 'Rs/hr');
      trace.value('Book weight', Math.round(bookWeightGrams), 'g');
      trace.value('Spine', bindingRaw.geometry.baseThickness_mm, 'mm');

      // Print trace to console in dev mode
      trace.print();

      const planningIssues = paperCosts
        .filter((paper) => paper.grainCompliant === false)
        .map((paper, idx) => ({
          code: `GRAIN_SUBOPTIMAL_${idx + 1}`,
          severity: "warning" as const,
          message: `${paper.sectionName}: grain direction is suboptimal for selected imposition.`,
          section: paper.sectionName,
          impact: "Potential cracking/curl risk and higher spoilage.",
        }));

      const procurementRecommendations = paperCosts
        .map((paper) => paper.procurementRecommendation)
        .filter((rec): rec is NonNullable<typeof rec> => Boolean(rec));

      const diagnostics = rawPaperResults.map((paper) => ({
        section: paper.sectionName,
        strategy: paper.autoPlanning ? "auto_paper_planning" : "manual_sheet_selection",
        selectedCandidate: `${paper.paperSize} / ${paper.ups} up`,
        rejectedCandidates: (paper.autoPlanning?.allEvaluated || [])
          .filter((opt: any) => !opt.selected)
          .slice(0, 5)
          .map((opt: any) => `${opt.paperSize} (${opt.ups} up, grain=${opt.grainOk ? "ok" : "warn"})`),
      }));

      const planningSummary = paperCosts.map((paper) => {
        const linkedPrint = printingCosts.find((p) => p.sectionName === paper.sectionName);
        return {
          section: paper.sectionName,
          paperSize: paper.paperSize,
          signature: paper.ppPerForm,
          ups: paper.ups,
          machineId: linkedPrint?.machineId || "",
          grainCompliant: paper.grainCompliant !== false,
          source: "auto" as const,
          warnings: paper.grainCompliant === false
            ? ["Suboptimal grain detected. Review before production release."]
            : [],
        };
      });

      // ── RESULT ASSEMBLY ────────────────────────────────────────────────
      results.push({
        id: generateId(),
        estimationId: estimation.id,
        quantity,
        quantityIndex: qi,

        paperCosts,
        totalPaperCost: round2(totalPaperCost),

        printingCosts,
        totalPrintingCost: round2(totalPrintingCost),

        ctpCosts,
        totalCTPCost: round2(totalCTPCost),

        bindingCost: round2(bindingRaw.costBreakdown.totalCost),
        bindingCostPerCopy: round3(bindingRaw.costBreakdown.totalCost / Math.max(1, quantity)),
        bindingBreakdown: {
          "Adhesive Cost": round2(bindingRaw.costBreakdown.adhesiveCost),
          "Thread / Sewing": round2(bindingRaw.costBreakdown.threadCost),
          "Hardcover Materials": round2(bindingRaw.costBreakdown.hardcoverMaterialsCost),
          "Machine Time": round2(bindingRaw.costBreakdown.machineTimeCost),
          "Setup Cost": round2(bindingRaw.costBreakdown.setupCost),
          ...(bindingRaw.costBreakdown.subcontractorCost > 0 ? { "Subcontractor": round2(bindingRaw.costBreakdown.subcontractorCost) } : {}),
        },

        finishingCost: round2(finTotal),
        finishingCostPerCopy: round3(finTotal / Math.max(1, quantity)),
        finishingBreakdown: Object.fromEntries(
          finishingSteps.map(step => [
            `${step.operationType.replace(/_/g, ' ')} — Material`,
            round2(step.materialCost),
          ]).concat(
            finishingSteps.filter(s => s.toolingCost > 0).map(step => [
              `${step.operationType.replace(/_/g, ' ')} — Tooling`,
              round2(step.toolingCost),
            ])
          ).concat(
            finishingSteps.map(step => [
              `${step.operationType.replace(/_/g, ' ')} — Machine & Energy`,
              round2(step.machineCost + step.energyCost),
            ])
          ).filter(([, v]) => (v as number) > 0)
        ),

        packingCost: round2(packingRaw.materialCosts.total),
        packingCostPerCopy: round3(packingRaw.materialCosts.total / Math.max(1, quantity)),
        packingBreakdown: packingBreakdownObj,

        freightCost: round2(freightRaw.totalFreightCost),
        freightCostPerCopy: round2(freightRaw.totalFreightCost / Math.max(1, quantity)),
        freightBreakdown: {
          "Base Tariff": round2(freightRaw.baseTariffCost),
          "Fuel Surcharge": round2(freightRaw.fuelSurchargeAmount),
          ...(freightRaw.accessorialCharges > 0 ? { "Accessorial Charges": round2(freightRaw.accessorialCharges) } : {}),
        },

        prePressCost: round2(prePressCost),
        additionalCost: round2(additionalCost),

        totalProductionCost: round2(totalProductionCost),
        totalCostPerCopy: round2(totalCostPerCopy),
        sellingPricePerCopy: round2(sellingPricePerCopy),
        sellingPriceForeignCurrency: round3(sellingPriceForeignCurrency),
        totalSellingPrice: round2(totalSellingPrice),
        totalSellingPriceForeign: round2(totalSellingPriceForeign),
        marginAmount: round2(marginAmount),
        commission: round2(commission),
        taxAmount: round2(taxAmount),
        grandTotal: round2(grandTotal),

        tph: Math.round(totalSellingPrice / Math.max(0.01, totalMachineHours)),
        totalMachineHours: round2(totalMachineHours),
        makeReadyHours: round2(makeReadyHours),
        runningHours: round2(runningHours),
        weightPerBook: Math.round(bookWeightGrams),
        totalWeight: packingRaw.totalConsignmentWeight_kg,
        spineThickness: round2(bindingRaw.geometry.baseThickness_mm),
        spineWithBoard: round2(bindingRaw.geometry.totalSpineThickness_mm),
        booksPerCarton: packingRaw.unitsPerCarton,
        totalCartons: packingRaw.cartonsRequired,
        cartonsPerPallet: packingRaw.cartonsPerPallet,
        totalPallets: packingRaw.palletsRequired,
        planningIssues,
        procurementRecommendations,
        diagnostics,
        planningSummary,

        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error(`Error calculating estimation for quantity ${quantity}:`, e);
      throw e;
    }
  });

  return results;
}
