import test from "node:test";
import assert from "node:assert/strict";
import { buildEstimationCsv } from "../src/utils/export.ts";

test("buildEstimationCsv creates header and rows", () => {
  const estimation: any = {
    jobTitle: "Sample",
    customerName: "Acme",
    pricing: { currency: "USD" },
  };
  const results: any[] = [
    {
      quantity: 1000,
      totalPaperCost: 100,
      totalPrintingCost: 200,
      totalCTPCost: 25,
      bindingCost: 50,
      finishingCost: 30,
      packingCost: 20,
      freightCost: 10,
      totalProductionCost: 435,
      sellingPricePerCopy: 0.6,
      grandTotal: 600,
    },
  ];
  const csv = buildEstimationCsv(estimation, results);
  assert.ok(csv.includes("Job Title"));
  assert.ok(csv.includes("\"Sample\""));
  assert.ok(csv.includes("\"1000\""));
});
