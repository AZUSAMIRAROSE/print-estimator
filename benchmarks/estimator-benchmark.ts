import { performance } from "node:perf_hooks";
import { calculateQuickCosts, validateAndParseQuickCalc, type QuickCalcForm } from "../src/utils/calculations/quickQuote.ts";

const sample: QuickCalcForm = {
  bookHeight: "234",
  bookWidth: "153",
  pages: "256",
  gsm: "130",
  paperType: "Matt Art Paper",
  quantity: "10000",
  colorsFront: "4",
  colorsBack: "4",
  coverGSM: "300",
  coverPaper: "Art Card",
  bindingType: "perfect_binding",
  laminationType: "matt",
  pricingMode: "margin",
  pricingPercent: "25",
  taxRate: "5",
  turnaround: "standard",
};

const parsed = validateAndParseQuickCalc(sample).parsed;
if (!parsed) {
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
