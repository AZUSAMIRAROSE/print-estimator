/* eslint-disable no-console */
import { performance } from "node:perf_hooks";
import { calculateQuickCosts, validateAndParseQuickCalc, type QuickCalcForm } from "../src/utils/calculations/quickQuote.ts";

const sample: QuickCalcForm = {
  bookHeight: "234",
  bookWidth: "153",
  pages: "256",
  gsm: "130",
  paperType: "Matt Art Paper",
  paperSize: "23x36",
  quantity: "10000",
  quantities: ["10000", "", "", "", ""],
  colorsFront: "4",
  colorsBack: "4",
  coverGSM: "300",
  coverPaper: "Art Card",
  coverColorsFront: "4",
  coverColorsBack: "0",
  machineId: "rmgt",
  coverMachineId: "rmgt",
  printingMethod: "sheetwise",
  bindingType: "perfect_binding",
  boardThickness: "2.5",
  boardOrigin: "imported",
  laminationType: "matt",
  spotUV: false,
  embossing: false,
  foilBlocking: false,
  dieCutting: false,
  pricingMode: "margin",
  pricingPercent: "25",
  taxRate: "5",
  turnaround: "standard",
  destinationId: "ex",
  freightMode: "none",
  includeFinishing: true,
  includePacking: false,
  includeFreight: false,
  customerId: "none",
  customerDiscount: "0",
};

const validateResult = validateAndParseQuickCalc(sample);
const parsed = validateResult.parsed;

if (!parsed) {
  console.error("Validation errors:", validateResult.errors);
  throw new Error("Sample benchmark input failed validation.");
}

const iterations = 10000;
const start = performance.now();
for (let i = 0; i < iterations; i++) {
  calculateQuickCosts(parsed);
}
const end = performance.now();

const totalMs = end - start;
const avgMs = totalMs / iterations;

console.log(`Quick estimator benchmark`);
console.log(`Iterations: ${iterations}`);
console.log(`Total time: ${totalMs.toFixed(2)} ms`);
console.log(`Average per calculation: ${avgMs.toFixed(5)} ms`);
