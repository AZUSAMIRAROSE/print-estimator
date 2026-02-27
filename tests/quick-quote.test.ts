import test from "node:test";
import assert from "node:assert/strict";
import { calcVolumeDiscountPercent, calculateQuickCosts, validateAndParseQuickCalc, type QuickCalcForm } from "../src/utils/calculations/quickQuote.ts";

const baseForm: QuickCalcForm = {
  bookHeight: "234",
  bookWidth: "153",
  pages: "256",
  gsm: "130",
  paperType: "Matt Art Paper",
  quantity: "5000",
  colorsFront: "4",
  colorsBack: "4",
  coverGSM: "300",
  coverPaper: "Art Card",
  bindingType: "perfect_binding",
  laminationType: "gloss",
  pricingMode: "margin",
  pricingPercent: "20",
  taxRate: "0",
  turnaround: "standard",
};

test("quick calc rejects decimal quantities", () => {
  const { errors } = validateAndParseQuickCalc({ ...baseForm, quantity: "1500.5" });
  assert.ok(errors.some((e) => e.includes("whole number")));
});

test("quick calc computes valid total and no NaN", () => {
  const { parsed, errors } = validateAndParseQuickCalc(baseForm);
  assert.equal(errors.length, 0);
  const result = calculateQuickCosts(parsed!);
  assert.ok(result.grandTotal > 0);
  assert.equal(Number.isFinite(result.grandTotal), true);
});

test("volume discount tiers are applied", () => {
  assert.equal(calcVolumeDiscountPercent(3000), 0);
  assert.equal(calcVolumeDiscountPercent(5000), 1.5);
  assert.equal(calcVolumeDiscountPercent(10000), 3);
  assert.equal(calcVolumeDiscountPercent(50000), 7);
});
