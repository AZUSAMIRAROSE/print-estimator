// ============================================================================
// FULL ESTIMATION ORCHESTRATOR - BRINGS EVERYTHING TOGETHER (GOD-LEVEL)
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
import { DEFAULT_MACHINES } from "@/constants";
import { useMachineStore } from "@/stores/machineStore";

function safelyFindMachine(id: string): any {
  const { machines } = useMachineStore.getState();
  const machine = Array.from(machines.values()).find((m) => m.id === id);
  return machine || DEFAULT_MACHINES.find((m) => m.id === id) || { name: "Unknown", speedSPH: 5000, hourlyRate: 3000 };
}

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

export function calculateFullEstimation(estimation: EstimationInput): EstimationResult[] {
  const results: EstimationResult[] = [];
  const activeQuantities = estimation.quantities.filter((q) => q > 0);
  if (activeQuantities.length === 0) return results;

  activeQuantities.forEach((quantity, qi) => {
    try {
      const paperCosts: SectionPaperCost[] = [];
      const printingCosts: SectionPrintingCost[] = [];
      const ctpCosts: SectionCTPCost[] = [];
      const rawPaperResults: any[] = [];
      const rawPrintResults: any[] = [];

      let totalForms = 0;

      for (let i = 0; i < estimation.textSections.length; i++) {
        const section = estimation.textSections[i];
        if (!section.enabled || section.pages <= 0) continue;

        console.log(`  Processing Text Section: ${section.label} (Pages: ${section.pages}, GSM: ${section.gsm})`);

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
        });
        rawPaperResults.push(paperRaw);

        console.log(`    Paper Requirement for ${section.label}: ${paperRaw.grossSheets} sheets, Cost: ${paperRaw.totalCost}`);

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
        });
        totalForms += paperRaw.numberOfForms;

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

        console.log(`    Printing Cost for ${section.label}: ${printRaw.totalImpressions} impressions, Cost: ${printRaw.totalCost}`);

        printingCosts.push({
          sectionName: printRaw.sectionName,
          sectionType: printRaw.sectionType,
          machineId: printRaw.machineId,
          machineName: printRaw.machineName,
          totalPlates: printRaw.totalPlates,
          impressionsPerForm: printRaw.impressionsPerForm,
          totalImpressions: printRaw.totalImpressions,
          ratePer1000: printRaw.effectiveRatePer1000,
          printingCost: printRaw.timeRunningCost + printRaw.energyCost + printRaw.depreciationCost,
          makeReadyCost: printRaw.timeMakereadyCost,
          runningHours: printRaw.kinematics.runningTime_hours,
          makereadyHours: printRaw.makeready.totalMakereadyTime_hours,
          totalCost: printRaw.totalCost,
        });

        ctpCosts.push({
          sectionName: section.label,
          sectionType: i === 0 ? "text1" : "text2",
          totalPlates: printRaw.totalPlates,
          ratePerPlate: printRaw.platesCost / (printRaw.totalPlates || 1),
          totalCost: printRaw.platesCost,
        });
      }

      if (estimation.cover.enabled && !estimation.cover.selfCover) {
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
              substrate: rawPaperResults[idx]?.substrate || ({ caliper_microns: s.gsm * 1.05 } as any),
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
          printingCost: coverPrintRaw.timeRunningCost + coverPrintRaw.energyCost + coverPrintRaw.depreciationCost,
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
      });

      const totalPaperCost = paperCosts.reduce((sum, p) => sum + (p.totalCost || 0), 0);
      const totalPrintingCost = printingCosts.reduce((sum, p) => sum + (p.totalCost || 0), 0);
      const totalCTPCost = ctpCosts.reduce((sum, c) => sum + (c.totalCost || 0), 0);
      const totalPaperWeightKg = paperCosts.reduce((sum, p) => sum + (p.totalWeight || 0), 0);
      const bookWeightGrams = quantity > 0 ? (totalPaperWeightKg * 1000) / quantity : 0;

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

      const packingRaw = calculatePackingCostGodLevel(quantity, {
        width_mm: estimation.bookSpec.widthMM,
        height_mm: estimation.bookSpec.heightMM,
        thickness_mm: Math.max(1, bindingRaw.geometry.totalSpineThickness_mm || estimation.bookSpec.spineThickness || 10),
        weight_grams: Math.max(1, bookWeightGrams || 1),
      });

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

      const totalPlatesAll = ctpCosts.reduce((sum, c) => sum + (c.totalPlates || 0), 0);
      const prePressCost =
        (estimation.prePress.epsonProofs || 0) * (estimation.prePress.epsonRatePerPage || 0) +
        (estimation.prePress.wetProofs || 0) * (estimation.prePress.wetProofRatePerForm || 0) * Math.max(1, totalForms) +
        ((estimation.prePress.filmOutput ? 1 : 0) * (estimation.prePress.filmRatePerPlate || 0) * totalPlatesAll) +
        (estimation.prePress.designCharges || 0);

      const additionalCost = (estimation.additionalCosts || []).reduce((sum, item) => {
        const line = item.isPerCopy ? (item.costPerCopy || 0) * quantity : (item.totalCost || 0);
        return sum + line;
      }, 0);

      const totalProductionCost =
        totalPaperCost +
        totalPrintingCost +
        totalCTPCost +
        bindingRaw.costBreakdown.totalCost +
        finTotal +
        packingRaw.materialCosts.total +
        freightRaw.totalFreightCost +
        prePressCost +
        additionalCost;

      const totalCostPerCopy = quantity > 0 ? totalProductionCost / quantity : 0;
      const discountedProduction = totalProductionCost * (1 - (estimation.pricing.volumeDiscount || 0) / 100);
      const marginPct = Math.min(99.99, Math.max(0, estimation.pricing.marginPercent || 0));
      const sellingBeforeTax = discountedProduction / Math.max(0.0001, 1 - marginPct / 100);
      const marginAmount = sellingBeforeTax - discountedProduction;
      const commission = sellingBeforeTax * ((estimation.pricing.commissionPercent || 0) / 100);

      const taxRate = estimation.pricing.taxType === "none" ? 0 : (estimation.pricing.taxRate || 0);
      const taxAmount = estimation.pricing.includesTax
        ? sellingBeforeTax - sellingBeforeTax / (1 + taxRate / 100)
        : sellingBeforeTax * (taxRate / 100);
      const grandTotal = estimation.pricing.includesTax ? sellingBeforeTax : sellingBeforeTax + taxAmount;

      const totalSellingPrice = sellingBeforeTax;
      const discountedPrice = quantity > 0 ? totalSellingPrice / quantity : 0;
      const fx = estimation.pricing.exchangeRate > 0 ? estimation.pricing.exchangeRate : 1;
      const totalSellingPriceForeign = estimation.pricing.currency === "INR" ? totalSellingPrice : totalSellingPrice / fx;
      const sellingPriceForeignCurrency = quantity > 0 ? totalSellingPriceForeign / quantity : 0;

      const makeReadyHours = printingCosts.reduce((sum, p) => sum + p.makereadyHours, 0);
      const runningHours = printingCosts.reduce((sum, p) => sum + p.runningHours, 0);
      const totalMachineHours = makeReadyHours + runningHours;

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
          adhesive: bindingRaw.costBreakdown.adhesiveCost,
          case: bindingRaw.costBreakdown.hardcoverMaterialsCost,
          machine: bindingRaw.costBreakdown.machineTimeCost,
        },

        finishingCost: round2(finTotal),
        finishingCostPerCopy: round3(finTotal / Math.max(1, quantity)),
        finishingBreakdown: {
          total: finTotal,
        },

        packingCost: round2(packingRaw.materialCosts.total),
        packingCostPerCopy: round3(packingRaw.materialCosts.total / Math.max(1, quantity)),
        packingBreakdown: packingBreakdownObj,

        freightCost: round2(freightRaw.totalFreightCost),
        freightCostPerCopy: round2(freightRaw.totalFreightCost / Math.max(1, quantity)),
        freightBreakdown: {
          baseTariff: freightRaw.baseTariffCost,
          fuel: freightRaw.fuelSurchargeAmount,
        },

        prePressCost: round2(prePressCost),
        additionalCost: round2(additionalCost),

        totalProductionCost: round2(totalProductionCost),
        totalCostPerCopy: round2(totalCostPerCopy),
        sellingPricePerCopy: round2(discountedPrice),
        sellingPriceForeignCurrency: round3(sellingPriceForeignCurrency),
        totalSellingPrice: round2(totalSellingPrice),
        totalSellingPriceForeign: round2(totalSellingPriceForeign),
        marginAmount: round2(marginAmount),
        commission: round2(commission),
        taxAmount: round2(taxAmount),
        grandTotal: round2(grandTotal),

        tph: Math.round(totalProductionCost / Math.max(1, totalMachineHours)),
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

        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error(`Error calculating estimation for quantity ${quantity}:`, e);
      throw e;
    }
  });

  return results;
}
