import type { PlanSummary } from "./autoPlanner";
import type {
  CanonicalEstimationInput,
  CanonicalEstimationResult,
} from "./types";
import type { QuotationSnapshot } from "./snapshot";

export type DeepMutable<T> =
  T extends (...args: never[]) => unknown ? T :
  T extends readonly (infer Item)[] ? DeepMutable<Item>[] :
  T extends object ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> } :
  T;

export interface CanonicalQuotationAttachment {
  input: DeepMutable<CanonicalEstimationInput>;
  results: DeepMutable<CanonicalEstimationResult>[];
  planSummaries: DeepMutable<Array<{ quantity: number; summary: PlanSummary }>>;
  snapshot: DeepMutable<QuotationSnapshot>;
}
