import type { EstimationInput, EstimationResult } from "@/types";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  section?: string;
  impact?: string;
}

export interface ProcurementRecommendation {
  section: string;
  requiredSpec: {
    paperType: string;
    gsm: number;
    preferredSize: string;
    quantitySheets: number;
    grain: "LONG_GRAIN" | "SHORT_GRAIN" | "UNKNOWN";
  };
  nearestMatches: Array<{
    source: "rate_card" | "inventory";
    reference: string;
    paperType: string;
    gsm: number;
    size: string;
    deltaCostPerCopy: number;
    stockStatus: "available" | "limited" | "not_available";
  }>;
  recommendedBuy: {
    paperType: string;
    gsm: number;
    size: string;
    estimatedRatePerReam: number;
    suggestedOrderQtySheets: number;
    supplierId?: string;
    supplierName?: string;
  };
  impactIfNotAvailable: string;
  confidence: number;
}

export interface PlannedSection {
  section: string;
  paperSize: string;
  imposition: string;
  signature: number;
  ups: number;
  grainCompliant: boolean;
  machineId: string;
  machineName: string;
  source: "auto" | "manual_override";
  warnings: string[];
}

export interface PlanningOutput {
  sections: PlannedSection[];
  blocked: boolean;
  issues: ValidationIssue[];
}

export interface CostBreakdown {
  paper: number;
  printing: number;
  ctp: number;
  binding: number;
  finishing: number;
  packing: number;
  freight: number;
  prePress: number;
  additional: number;
  totalProduction: number;
}

export interface EstimationResultEnvelope {
  input: EstimationInput;
  results: EstimationResult[];
  planning: PlanningOutput;
  procurement: ProcurementRecommendation[];
  issues: ValidationIssue[];
}

export interface QuoteSnapshot {
  id: string;
  quotationId: string;
  sourceEstimateId: string;
  pricingVersion: number;
  plannedAt: string;
  estimationInput: EstimationInput;
  result: EstimationResult;
  planning: PlanningOutput;
  procurement: ProcurementRecommendation[];
  issues: ValidationIssue[];
}

export interface PricingRevision {
  id: string;
  quotationId: string;
  version: number;
  createdAt: string;
  reason: string;
  snapshot: QuoteSnapshot;
}

