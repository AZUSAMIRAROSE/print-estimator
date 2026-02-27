// ============================================================================
// FULL ESTIMATION ORCHESTRATOR — BRINGS EVERYTHING TOGETHER
// ============================================================================

import type { EstimationInput, EstimationResult } from "@/types";
import { calculateSpineThickness, calculateSpineWithBoard } from "./spine";
import { calculatePaperRequirement } from "./paper";
import { calculatePrintingCost } from "./printing";
import { calculateCTPCost } from "./ctp";
import { calculateBindingCost } from "./binding";
import { calculateFinishingCost } from "./finishing";
import { calculatePackingCost } from "./packing";
import { calculateFreightCost } from "./freight";
import { calculateBookWeight } from "./weight";
import { generateId } from "@/utils/format";
import { DEFAULT_MACHINES } from "@/constants";

export function calculateFullEstimation(estimation: EstimationInput): EstimationResult[] {
  const results: EstimationResult[] = [];
  
  // Calculate spine thickness
  const spine = calculateSpineThickness({
    textSections: estimation.textSections
      .filter(s => s.enabled)
      .map(s => ({ pages: s.pages, gsm: s.gsm, paperType: s.paperTypeName })),
    endleaves: estimation.endleaves.enabled
      ? { pages: estimation.endleaves.pages, gsm: estimation.endleaves.gsm, paperType: estimation.endleaves.paperTypeName }
      : undefined,
  });
  
  const spineWithBoard = calculateSpineWithBoard(
    spine,
    estimation.binding.boardThickness,
    estimation.binding.primaryBinding
  );
  
  const activeQuantities = estimation.quantities.filter(q => q > 0);
  
  for (let qi = 0; qi < activeQuantities.length; qi++) {
    const quantity = activeQuantities[qi];
    
    // ── Paper Costs ──────────────────────────────────────────────────────
    const paperCosts = [];
    const printingCosts = [];
    const ctpCosts = [];
    let totalForms = 0;
    let totalSections = 0;
    
    // Text sections
    for (let i = 0; i < estimation.textSections.length; i++) {
      const section = estimation.textSections[i];
      if (!section.enabled || section.pages <= 0) continue;
      
      totalSections++;
      
      const machine = DEFAULT_MACHINES.find(m => m.id === section.machineId);
      
      const paperResult = calculatePaperRequirement({
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
        machineMaxWidth: machine?.maxSheetWidth,
        machineMaxHeight: machine?.maxSheetHeight,
        gripperMM: machine?.gripperMargin,
        bleedMM: 3,
      });
      
      paperCosts.push(paperResult);
      totalForms += paperResult.imposition.numberOfForms;
      
      // Printing cost
      const printResult = calculatePrintingCost({
        sectionName: section.label,
        sectionType: i === 0 ? "text1" : "text2",
        machineId: section.machineId,
        machineName: section.machineName,
        colorsFront: section.colorsFront,
        colorsBack: section.colorsBack,
        quantity,
        imposition: paperResult.imposition,
        wastageResult: paperResult.wastageResult,
        gsm: section.gsm,
        printingMethod: section.printingMethod,
      });
      
      printingCosts.push(printResult);
      
      // CTP cost
      const ctpResult = calculateCTPCost({
        sectionName: section.label,
        sectionType: i === 0 ? "text1" : "text2",
        machineId: section.machineId,
        totalPlates: printResult.totalPlates,
      });
      
      ctpCosts.push(ctpResult);
    }
    
    // Cover paper + printing + CTP
    if (estimation.cover.enabled && !estimation.cover.selfCover) {
      const coverMachine = DEFAULT_MACHINES.find(m => m.id === estimation.cover.machineId);
      
      const coverPaper = calculatePaperRequirement({
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
        machineMaxWidth: coverMachine?.maxSheetWidth,
        machineMaxHeight: coverMachine?.maxSheetHeight,
        spineThickness: spineWithBoard,
      });
      
      paperCosts.push(coverPaper);
      
      const coverPrint = calculatePrintingCost({
        sectionName: "Cover",
        sectionType: "cover",
        machineId: estimation.cover.machineId,
        machineName: estimation.cover.machineName,
        colorsFront: estimation.cover.colorsFront,
        colorsBack: estimation.cover.colorsBack,
        quantity,
        imposition: coverPaper.imposition,
        wastageResult: coverPaper.wastageResult,
        gsm: estimation.cover.gsm,
        printingMethod: "sheetwise",
      });
      
      printingCosts.push(coverPrint);
      ctpCosts.push(calculateCTPCost({
        sectionName: "Cover",
        sectionType: "cover",
        machineId: estimation.cover.machineId,
        totalPlates: coverPrint.totalPlates,
      }));
    }
    
    // Jacket
    if (estimation.jacket.enabled) {
      const jacketMachine = DEFAULT_MACHINES.find(m => m.id === estimation.jacket.machineId);
      const jacketQty = Math.ceil(quantity * (1 + estimation.jacket.extraJacketsPercent / 100));
      
      const jacketPaper = calculatePaperRequirement({
        sectionName: "Jacket",
        sectionType: "jacket",
        totalPages: 2,
        trimWidthMM: estimation.bookSpec.widthMM,
        trimHeightMM: estimation.bookSpec.heightMM,
        gsm: estimation.jacket.gsm,
        paperType: estimation.jacket.paperTypeName,
        paperCode: estimation.jacket.paperTypeId,
        paperSizeLabel: estimation.jacket.paperSizeLabel,
        quantity: jacketQty,
        colorsFront: estimation.jacket.colorsFront,
        colorsBack: estimation.jacket.colorsBack,
        machineMaxWidth: jacketMachine?.maxSheetWidth,
        machineMaxHeight: jacketMachine?.maxSheetHeight,
        spineThickness: spineWithBoard,
      });
      
      paperCosts.push(jacketPaper);
      
      const jacketPrint = calculatePrintingCost({
        sectionName: "Jacket",
        sectionType: "jacket",
        machineId: estimation.jacket.machineId,
        machineName: estimation.jacket.machineName,
        colorsFront: estimation.jacket.colorsFront,
        colorsBack: estimation.jacket.colorsBack,
        quantity: jacketQty,
        imposition: jacketPaper.imposition,
        wastageResult: jacketPaper.wastageResult,
        gsm: estimation.jacket.gsm,
        printingMethod: "sheetwise",
      });
      
      printingCosts.push(jacketPrint);
      ctpCosts.push(calculateCTPCost({
        sectionName: "Jacket",
        sectionType: "jacket",
        machineId: estimation.jacket.machineId,
        totalPlates: jacketPrint.totalPlates,
      }));
    }
    
    // Endleaves
    if (estimation.endleaves.enabled && !estimation.endleaves.selfEndleaves && estimation.endleaves.colorsFront > 0) {
      const endMachine = DEFAULT_MACHINES.find(m => m.id === estimation.endleaves.machineId);
      
      const endPaper = calculatePaperRequirement({
        sectionName: "Endleaves",
        sectionType: "endleaves",
        totalPages: estimation.endleaves.pages,
        trimWidthMM: estimation.bookSpec.widthMM,
        trimHeightMM: estimation.bookSpec.heightMM,
        gsm: estimation.endleaves.gsm,
        paperType: estimation.endleaves.paperTypeName,
        paperCode: estimation.endleaves.paperTypeId,
        paperSizeLabel: estimation.endleaves.paperSizeLabel,
        quantity,
        colorsFront: estimation.endleaves.colorsFront,
        colorsBack: estimation.endleaves.colorsBack,
        machineMaxWidth: endMachine?.maxSheetWidth,
        machineMaxHeight: endMachine?.maxSheetHeight,
      });
      
      paperCosts.push(endPaper);
      
      if (estimation.endleaves.colorsFront > 0) {
        const endPrint = calculatePrintingCost({
          sectionName: "Endleaves",
          sectionType: "endleaves",
          machineId: estimation.endleaves.machineId,
          machineName: estimation.endleaves.machineName,
          colorsFront: estimation.endleaves.colorsFront,
          colorsBack: estimation.endleaves.colorsBack,
          quantity,
          imposition: endPaper.imposition,
          wastageResult: endPaper.wastageResult,
          gsm: estimation.endleaves.gsm,
          printingMethod: "sheetwise",
        });
        
        printingCosts.push(endPrint);
        ctpCosts.push(calculateCTPCost({
          sectionName: "Endleaves",
          sectionType: "endleaves",
          machineId: estimation.endleaves.machineId,
          totalPlates: endPrint.totalPlates,
        }));
      }
    }
    
    // ── Totals ────────────────────────────────────────────────────────────
    const totalPaperCost = paperCosts.reduce((sum, p) => sum + p.totalCost, 0);
    const totalPrintingCost = printingCosts.reduce((sum, p) => sum + p.totalCost, 0);
    const totalCTPCost = ctpCosts.reduce((sum, c) => sum + c.totalCost, 0);
    
    // ── Book Weight ──────────────────────────────────────────────────────
    const isHardcase = estimation.binding.primaryBinding === "section_sewn_hardcase" || estimation.binding.primaryBinding === "case_binding";
    
    const bookWeight = calculateBookWeight({
      trimHeightMM: estimation.bookSpec.heightMM,
      trimWidthMM: estimation.bookSpec.widthMM,
      textSections: estimation.textSections.filter(s => s.enabled).map(s => ({ pages: s.pages, gsm: s.gsm })),
      coverGSM: estimation.cover.gsm,
      spineThickness: spine,
      hasEndleaves: estimation.endleaves.enabled,
      endleavesPages: estimation.endleaves.pages,
      endleavesGSM: estimation.endleaves.gsm,
      hasJacket: estimation.jacket.enabled,
      jacketGSM: estimation.jacket.gsm,
      boardThicknessMM: isHardcase ? estimation.binding.boardThickness : 0,
      hasBoard: isHardcase,
    });
    
    // ── Binding Cost ─────────────────────────────────────────────────────
    const totalTextPages = estimation.textSections.reduce((sum, s) => s.enabled ? sum + s.pages : sum, 0);
    
    const bindingResult = calculateBindingCost({
      binding: estimation.binding,
      quantity,
      bookSpec: estimation.bookSpec,
      spineThickness: spine,
      totalForms,
      totalSections,
      textPages: totalTextPages,
    });
    
    // ── Finishing Cost ────────────────────────────────────────────────────
    const coverMachine = DEFAULT_MACHINES.find(m => m.id === estimation.cover.machineId);
    
    const finishingResult = calculateFinishingCost({
      finishing: estimation.finishing,
      quantity,
      bookSpec: estimation.bookSpec,
      spineThickness: spineWithBoard,
      coverMachineHasAQ: coverMachine?.hasAQUnit || false,
    });
    
    // ── Packing Cost ─────────────────────────────────────────────────────
    const packingResult = calculatePackingCost({
      packing: estimation.packing,
      quantity,
      bookSpec: estimation.bookSpec,
      spineThickness: spineWithBoard,
      weightPerBookGrams: bookWeight.totalWeight,
    });
    
    // ── Pre-Press Cost ───────────────────────────────────────────────────
    const prePressCost =
      (estimation.prePress.epsonProofs * estimation.prePress.epsonRatePerPage) +
      (estimation.prePress.wetProofs * estimation.prePress.wetProofRatePerForm) +
      (estimation.prePress.designCharges || 0);
    
    // ── Additional Costs ─────────────────────────────────────────────────
    const additionalCost = estimation.additionalCosts.reduce((sum, c) => {
      if (c.isPerCopy) return sum + c.costPerCopy * quantity;
      return sum + c.totalCost;
    }, 0);
    
    // ── Freight Cost ─────────────────────────────────────────────────────
    const totalProductionCostBeforeFreight = totalPaperCost + totalPrintingCost + totalCTPCost +
      bindingResult.totalCost + finishingResult.totalCost + packingResult.totalCost +
      prePressCost + additionalCost;
    
    const freightResult = calculateFreightCost({
      delivery: estimation.delivery,
      quantity,
      packingBreakdown: packingResult.breakdown,
      totalFOBValue: totalProductionCostBeforeFreight,
    });
    
    // ── Final Totals ─────────────────────────────────────────────────────
    const totalProductionCost = totalProductionCostBeforeFreight + freightResult.totalCost;
    const totalCostPerCopy = quantity > 0 ? totalProductionCost / quantity : 0;
    
    // Selling price with margin
    const marginMultiplier = estimation.pricing.marginPercent > 0
      ? 1 / (1 - estimation.pricing.marginPercent / 100)
      : 1;
    
    const sellingPricePerCopy = totalCostPerCopy * marginMultiplier;
    
    // Volume discount
    const discountedPrice = sellingPricePerCopy * (1 - estimation.pricing.volumeDiscount / 100);
    
    // Convert to foreign currency
    const exchangeRate = estimation.pricing.exchangeRate || 1;
    const sellingPriceForeignCurrency = exchangeRate > 0 ? discountedPrice / exchangeRate : discountedPrice;
    
    const totalSellingPrice = discountedPrice * quantity;
    const totalSellingPriceForeign = sellingPriceForeignCurrency * quantity;
    
    const marginAmount = totalSellingPrice - totalProductionCost;
    const commission = totalSellingPrice * (estimation.pricing.commissionPercent / 100);
    
    // Tax
    const taxAmount = estimation.pricing.includesTax
      ? totalSellingPrice * (estimation.pricing.taxRate / (100 + estimation.pricing.taxRate))
      : totalSellingPrice * (estimation.pricing.taxRate / 100);
    
    const grandTotal = estimation.pricing.includesTax
      ? totalSellingPrice
      : totalSellingPrice + taxAmount;
    
    // Machine hours
    const totalMachineHours = printingCosts.reduce((sum, p) => {
      const machine = DEFAULT_MACHINES.find(m => m.name === p.machineName || m.id === p.sectionType);
      const speed = machine?.speedSPH || 6000;
      return sum + (p.totalImpressions / speed) + (p.makeReadyCost / (machine?.hourlyRate || 4000));
    }, 0);
    
    const tph = totalMachineHours > 0 ? totalProductionCost / totalMachineHours : 0;
    
    results.push({
      id: generateId(),
      estimationId: estimation.id,
      quantity,
      quantityIndex: qi,
      
      paperCosts,
      totalPaperCost: Math.round(totalPaperCost * 100) / 100,
      
      printingCosts,
      totalPrintingCost: Math.round(totalPrintingCost * 100) / 100,
      
      ctpCosts,
      totalCTPCost: Math.round(totalCTPCost * 100) / 100,
      
      bindingCost: bindingResult.totalCost,
      bindingCostPerCopy: bindingResult.costPerCopy,
      bindingBreakdown: bindingResult.breakdown,
      
      finishingCost: finishingResult.totalCost,
      finishingCostPerCopy: finishingResult.costPerCopy,
      finishingBreakdown: finishingResult.breakdown,
      
      packingCost: packingResult.totalCost,
      packingCostPerCopy: packingResult.costPerCopy,
      packingBreakdown: packingResult.breakdown,
      
      freightCost: freightResult.totalCost,
      freightCostPerCopy: freightResult.costPerCopy,
      freightBreakdown: freightResult.breakdown,
      
      prePressCost: Math.round(prePressCost * 100) / 100,
      additionalCost: Math.round(additionalCost * 100) / 100,
      
      totalProductionCost: Math.round(totalProductionCost * 100) / 100,
      totalCostPerCopy: Math.round(totalCostPerCopy * 100) / 100,
      sellingPricePerCopy: Math.round(discountedPrice * 100) / 100,
      sellingPriceForeignCurrency: Math.round(sellingPriceForeignCurrency * 1000) / 1000,
      totalSellingPrice: Math.round(totalSellingPrice * 100) / 100,
      totalSellingPriceForeign: Math.round(totalSellingPriceForeign * 100) / 100,
      marginAmount: Math.round(marginAmount * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      
      tph: Math.round(tph),
      totalMachineHours: Math.round(totalMachineHours * 100) / 100,
      makeReadyHours: 0,
      runningHours: 0,
      weightPerBook: bookWeight.totalWeight,
      totalWeight: Math.round(bookWeight.totalWeight * quantity / 1000 * 100) / 100,
      spineThickness: spine,
      spineWithBoard,
      booksPerCarton: packingResult.breakdown.booksPerCarton,
      totalCartons: packingResult.breakdown.totalCartons,
      cartonsPerPallet: 0,
      totalPallets: packingResult.breakdown.totalPallets,
      
      createdAt: new Date().toISOString(),
    });
  }
  
  return results;
}