import type { EstimationInput, EstimationResult } from "@/types";

export function buildEstimationCsv(estimation: EstimationInput, results: EstimationResult[]): string {
  const header = [
    "Job Title",
    "Customer",
    "Quantity",
    "Paper Cost",
    "Printing Cost",
    "CTP Cost",
    "Binding Cost",
    "Finishing Cost",
    "Packing Cost",
    "Freight Cost",
    "Total Production Cost",
    "Selling Per Copy",
    "Grand Total",
    "Currency",
  ];

  const rows = results.map((r) => [
    estimation.jobTitle || "Untitled",
    estimation.customerName || "",
    r.quantity,
    r.totalPaperCost,
    r.totalPrintingCost,
    r.totalCTPCost,
    r.bindingCost,
    r.finishingCost,
    r.packingCost,
    r.freightCost,
    r.totalProductionCost,
    r.sellingPricePerCopy,
    r.grandTotal,
    estimation.pricing.currency,
  ]);

  return [
    header.join(","),
    ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
}

export function downloadTextFile(filename: string, content: string, mimeType = "text/plain;charset=utf-8"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
