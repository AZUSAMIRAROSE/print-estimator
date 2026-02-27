import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEstimationForCalculation, validateEstimation } from "../src/utils/validation/estimation.ts";

function createBaseEstimation() {
  return {
    id: "est-1",
    jobTitle: "Sample Book",
    customerName: "Acme Publishing",
    referenceNumber: "REF-1",
    estimatedBy: "QA",
    estimationDate: "2026-02-27",
    poNumber: "",
    bookSpec: {
      widthMM: 153,
      heightMM: 234,
    },
    quantities: [3000, 0, 0, 0, 0],
    textSections: [
      {
        enabled: true,
        pages: 128,
        gsm: 80,
        colorsFront: 4,
        colorsBack: 4,
      },
    ],
    cover: {
      enabled: true,
      pages: 4,
      gsm: 300,
      colorsFront: 4,
      colorsBack: 0,
    },
    delivery: {
      destinationId: "felix",
    },
    pricing: {
      marginPercent: 25,
      commissionPercent: 0,
      exchangeRate: 1,
      volumeDiscount: 0,
      taxRate: 0,
    },
    jacket: {
      gsm: 130,
      colorsFront: 4,
      colorsBack: 0,
      extraJacketsPercent: 5,
    },
    endleaves: {
      pages: 4,
      gsm: 100,
      colorsFront: 0,
      colorsBack: 0,
    },
  } as any;
}

test("validateEstimation returns no error for valid baseline", () => {
  const estimation = createBaseEstimation();
  const errors = validateEstimation(estimation);
  assert.equal(errors.length, 0);
});

test("validateEstimation catches required field and quantity issues", () => {
  const estimation = createBaseEstimation();
  estimation.jobTitle = "";
  estimation.quantities = [0, 0, 0, 0, 0];
  const errors = validateEstimation(estimation);
  assert.ok(errors.some((e) => e.includes("Job title")));
  assert.ok(errors.some((e) => e.includes("quantity")));
});

test("normalizeEstimationForCalculation clamps invalid numeric values", () => {
  const estimation = createBaseEstimation();
  estimation.quantities[0] = -120;
  estimation.pricing.marginPercent = 140;
  estimation.textSections[0].pages = -16;
  estimation.cover.gsm = -20;

  const normalized = normalizeEstimationForCalculation(estimation);

  assert.equal(normalized.quantities[0], 0);
  assert.equal(normalized.pricing.marginPercent, 99.99);
  assert.equal(normalized.textSections[0].pages, 0);
  assert.equal(normalized.cover.gsm, 0);
});
