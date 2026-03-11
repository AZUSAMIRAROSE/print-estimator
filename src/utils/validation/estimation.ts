import type { EstimationInput } from "@/types";

export function validateEstimation(estimation: EstimationInput): string[] {
  const errors: string[] = [];
  const activeQuantities = estimation.quantities.filter((q) => q > 0);
  const enabledTextSections = estimation.textSections.filter((s) => s.enabled);

  if (!estimation.jobTitle.trim()) {
    errors.push("Job title is required.");
  }

  if (estimation.bookSpec.widthMM <= 0 || estimation.bookSpec.heightMM <= 0) {
    errors.push("Book width and height must be greater than 0.");
  }

  if (activeQuantities.length === 0) {
    errors.push("At least one print quantity is required.");
  }

  if (enabledTextSections.length === 0) {
    errors.push("Enable at least one text section.");
  }

  if (enabledTextSections.some((s) => s.pages <= 0)) {
    errors.push("Enabled text sections must have pages greater than 0.");
  }

  if (enabledTextSections.some((s) => s.gsm <= 0)) {
    errors.push("Enabled text sections must have GSM greater than 0.");
  }

  if (estimation.cover.enabled && (estimation.cover.pages <= 0 || estimation.cover.gsm <= 0)) {
    errors.push("Cover pages and GSM must be greater than 0.");
  }

  if (!estimation.delivery.destinationId) {
    errors.push("Delivery destination is required.");
  }

  if (estimation.pricing.marginPercent >= 100) {
    errors.push("Margin percentage must be below 100.");
  }

  return errors;
}

export function normalizeEstimationForCalculation(estimation: EstimationInput): EstimationInput {
  return {
    ...estimation,
    quantities: estimation.quantities.map((q) => Math.max(0, Math.floor(q || 0))),
    textSections: estimation.textSections.map((section) => ({
      ...section,
      pages: Math.max(0, Math.floor(section.pages || 0)),
      gsm: Math.max(0, Number(section.gsm || 0)),
      colorsFront: Math.max(0, Math.floor(section.colorsFront || 0)),
      colorsBack: Math.max(0, Math.floor(section.colorsBack || 0)),
    })),
    cover: {
      ...estimation.cover,
      pages: Math.max(0, Math.floor(estimation.cover.pages || 0)),
      gsm: Math.max(0, Number(estimation.cover.gsm || 0)),
      colorsFront: Math.max(0, Math.floor(estimation.cover.colorsFront || 0)),
      colorsBack: Math.max(0, Math.floor(estimation.cover.colorsBack || 0)),
    },
    jacket: {
      ...estimation.jacket,
      gsm: Math.max(0, Number(estimation.jacket.gsm || 0)),
      colorsFront: Math.max(0, Math.floor(estimation.jacket.colorsFront || 0)),
      colorsBack: Math.max(0, Math.floor(estimation.jacket.colorsBack || 0)),
      extraJacketsPercent: Math.max(0, Number(estimation.jacket.extraJacketsPercent || 0)),
    },
    endleaves: {
      ...estimation.endleaves,
      pages: Math.max(0, Math.floor(estimation.endleaves.pages || 0)),
      gsm: Math.max(0, Number(estimation.endleaves.gsm || 0)),
      colorsFront: Math.max(0, Math.floor(estimation.endleaves.colorsFront || 0)),
      colorsBack: Math.max(0, Math.floor(estimation.endleaves.colorsBack || 0)),
    },
    pricing: {
      ...estimation.pricing,
      marginPercent: Math.max(0, Math.min(99.99, Number(estimation.pricing.marginPercent || 0))),
      commissionPercent: Math.max(0, Number(estimation.pricing.commissionPercent || 0)),
      exchangeRate: Math.max(0, Number(estimation.pricing.exchangeRate || 0)),
      volumeDiscount: Math.max(0, Number(estimation.pricing.volumeDiscount || 0)),
      taxRate: Math.max(0, Number(estimation.pricing.taxRate || 0)),
    },
  };
}
