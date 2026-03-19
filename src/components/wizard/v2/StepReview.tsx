import React, { useCallback, useMemo, useState } from "react";
import type { CurrencyCode, Quotation } from "@/types";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { runCanonicalEstimation } from "@/domain/estimation/canonicalEngine";
import {
  buildQuotationArtifactsFromCanonical,
} from "@/domain/estimation/adapters/v2Workflow";
import { CostBreakdownTable } from "./results/CostBreakdownTable";
import { QuotationActions } from "./results/QuotationActions";
import { cn } from "@/utils/cn";
import { useDataStore } from "@/stores/dataStore";
import { useAppStore } from "@/stores/appStore";
import {
  syncJobCreate,
  syncJobUpdate,
  syncQuotationCreate,
} from "@/hooks/useDataSync";
import { formatCurrency } from "@/utils/format";
import type { CanonicalEstimationResult } from "@/domain/estimation/types";

export function StepReview() {
  const { estimation, getMetaStats, inventory, rateCard } = useWizardStore();
  const { addJob, addQuotation, jobs, updateJob, updateQuotation } = useDataStore();
  const { addActivityLog, addNotification } = useAppStore();

  const [results, setResults] = useState<CanonicalEstimationResult[] | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreatingQuotation, setIsCreatingQuotation] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [showAudit, setShowAudit] = useState(false);
  const [lastQuotationNumber, setLastQuotationNumber] = useState<string | null>(null);

  const stats = getMetaStats();
  const activeQuantities = useMemo(
    () => (estimation.book?.quantities ?? []).filter((quantity) => quantity > 0),
    [estimation.book?.quantities],
  );
  const enabledSections = useMemo(
    () => (estimation.sections ?? []).filter((section) => section?.enabled),
    [estimation.sections],
  );
  const bestResult = useMemo(() => {
    if (!results?.length) return null;
    return [...results].sort((left, right) => left.pricing.costPerCopy - right.pricing.costPerCopy)[0];
  }, [results]);
  const hasUsableResults = Boolean(results?.some((result) => result.costs.totalProduction > 0));

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setCalcError(null);
    setLastQuotationNumber(null);

    try {
      const calculated = runCanonicalEstimation(estimation, { inventory, rateCard })
        .sort((left, right) => left.quantity - right.quantity);

      if (!calculated.length) {
        throw new Error("No estimate tiers could be generated. Add at least one active quantity and enabled section.");
      }

      setResults(calculated);
      addNotification({
        type: "success",
        title: "Estimate Calculated",
        message: `${calculated.length} quantity tier(s) recalculated with the live V2 engine.`,
        category: "estimate",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCalcError(message);
      addNotification({
        type: "error",
        title: "Calculation Failed",
        message,
        category: "estimate",
      });
    } finally {
      setIsCalculating(false);
    }
  }, [addNotification, estimation, inventory, rateCard]);

  const handleCreateQuotation = useCallback(async () => {
    if (!results?.length || !hasUsableResults) return;

    setIsCreatingQuotation(true);

    try {
      const quotationArtifacts = buildQuotationArtifactsFromCanonical(
        estimation,
        results,
        { inventory, rateCard },
        estimation.estimatedBy || "Current User",
      );
      const { canonicalSnapshot, legacyEstimation, legacyResults, quantities, quoteSnapshot, totalValue } = quotationArtifacts;
      const existingJob = jobs.find((job) => job.estimationId === estimation.id);
      const currentUser = estimation.estimatedBy || "Current User";

      if (existingJob) {
        updateJob(existingJob.id, {
          title: estimation.jobTitle || existingJob.title,
          customerName: estimation.customerName || existingJob.customerName,
          quantities,
          results: legacyResults,
          totalValue,
          currency: legacyEstimation.pricing.currency,
          status: "quoted",
          notes: estimation.notes ?? "",
        });
        await syncJobUpdate(existingJob.id, {
          ...existingJob,
          title: estimation.jobTitle || existingJob.title,
          customerName: estimation.customerName || existingJob.customerName,
          quantities,
          results: legacyResults,
          totalValue,
          currency: legacyEstimation.pricing.currency,
          status: "quoted",
          notes: estimation.notes ?? "",
        });
      }

      const savedJob = existingJob ?? addJob({
        title: estimation.jobTitle || "Untitled Job",
        customerId: "",
        customerName: estimation.customerName || "Unknown Customer",
        estimationId: estimation.id,
        status: "quoted",
        quantities,
        results: legacyResults,
        bookSpec: legacyEstimation.bookSpec,
        totalValue,
        currency: legacyEstimation.pricing.currency,
        assignedTo: currentUser,
        dueDate: new Date(Date.now() + (15 * 24 * 60 * 60 * 1000)).toISOString(),
        notes: estimation.notes ?? "",
        tags: ["v2"],
      });

      if (!existingJob) {
        await syncJobCreate(savedJob);
      }

      const quotationSeed: Omit<Quotation, "id" | "quotationNumber" | "createdAt" | "updatedAt"> = {
        jobId: savedJob.id,
        jobTitle: estimation.jobTitle || savedJob.title,
        customerId: "",
        customerName: estimation.customerName || "Unknown Customer",
        status: "draft",
        quantities,
        results: legacyResults,
        currency: legacyEstimation.pricing.currency,
        exchangeRate: legacyEstimation.pricing.exchangeRate,
        validityDays: legacyEstimation.pricing.quotationValidity,
        validUntil: new Date(Date.now() + (legacyEstimation.pricing.quotationValidity * 24 * 60 * 60 * 1000)).toISOString(),
        paymentTerms: legacyEstimation.pricing.paymentTerms,
        deliveryTerms: `${legacyEstimation.delivery.deliveryType.toUpperCase()} ${legacyEstimation.delivery.freightMode.toUpperCase()}`,
        notes: estimation.notes ?? "",
        termsAndConditions: "Subject to final artwork approval, planning validation, and raw material availability.",
        comments: [],
        revisionNumber: 0,
        pricingVersion: 1,
        sourceEstimateId: estimation.id,
        quoteSnapshot,
        canonicalSnapshot,
      };

      const createdQuotation = addQuotation(quotationSeed);
      const persistedQuotation: Quotation = {
        ...createdQuotation,
        quoteSnapshot: createdQuotation.quoteSnapshot
          ? {
              ...createdQuotation.quoteSnapshot,
              quotationId: createdQuotation.id,
              pricingVersion: createdQuotation.pricingVersion ?? 1,
            }
          : undefined,
      };

      updateQuotation(createdQuotation.id, {
        quoteSnapshot: persistedQuotation.quoteSnapshot,
        canonicalSnapshot: persistedQuotation.canonicalSnapshot,
      });

      const syncSucceeded = await syncQuotationCreate(persistedQuotation);

      setLastQuotationNumber(createdQuotation.quotationNumber);
      addNotification({
        type: syncSucceeded ? "success" : "warning",
        title: "Quotation Created",
        message: syncSucceeded
          ? `${createdQuotation.quotationNumber} was saved with the canonical V2 snapshot.`
          : `${createdQuotation.quotationNumber} was saved locally. Backend sync is pending.`,
        category: "quotation",
        actionUrl: "/quotations",
      });
      addActivityLog({
        action: "QUOTATION_CREATED_V2",
        category: "quotation",
        description: `Created V2 quotation ${createdQuotation.quotationNumber} for "${estimation.jobTitle}"`,
        user: currentUser,
        entityType: "quotation",
        entityId: createdQuotation.id,
        level: syncSucceeded ? "info" : "warning",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addNotification({
        type: "error",
        title: "Quotation Creation Failed",
        message,
        category: "quotation",
      });
    } finally {
      setIsCreatingQuotation(false);
    }
  }, [
    addActivityLog,
    addQuotation,
    addJob,
    addNotification,
    estimation,
    hasUsableResults,
    inventory,
    jobs,
    rateCard,
    results,
    updateQuotation,
    updateJob,
  ]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Job</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{estimation.jobTitle || "Untitled Job"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Customer</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{estimation.customerName || "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quantity Tiers</p>
            <p className="mt-1 text-sm font-mono text-gray-900 dark:text-gray-100">
              {activeQuantities.length ? activeQuantities.join(", ") : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sections</p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{enabledSections.length}</p>
          </div>
        </div>
      </div>

      {bestResult && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Best Cost / Copy</p>
            <p className="mt-2 text-2xl font-black text-emerald-900 dark:text-emerald-100">
              {formatCurrency(bestResult.pricing.costPerCopy, estimation.pricing.currency as CurrencyCode)}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">{bestResult.quantity.toLocaleString()} copies</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Machine Hours</p>
            <p className="mt-2 text-2xl font-black text-sky-900 dark:text-sky-100">{bestResult.machineHours.toFixed(1)}h</p>
            <p className="mt-1 text-xs text-sky-700/80 dark:text-sky-300/80">Planned through the canonical engine</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Last Draft Quote</p>
            <p className="mt-2 text-2xl font-black text-amber-900 dark:text-amber-100">{lastQuotationNumber ?? "Not created"}</p>
            <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">Create after recalculation to save the latest numbers</p>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCalculate}
            disabled={isCalculating || activeQuantities.length === 0}
            className={cn(
              "inline-flex min-w-[180px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all",
              isCalculating
                ? "cursor-wait bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                : "bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200",
            )}
          >
            {isCalculating ? "Calculating..." : results ? "Recalculate Estimate" : "Calculate Estimate"}
          </button>

          {calcError && <p className="text-sm text-red-600 dark:text-red-400">{calcError}</p>}

          {stats.totalFields > 0 && (
            <button
              type="button"
              onClick={() => setShowAudit((value) => !value)}
              className="ml-auto text-xs font-semibold uppercase tracking-wide text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
            >
              {showAudit ? "Hide Audit Trail" : "Show Audit Trail"}
            </button>
          )}
        </div>

        {stats.totalFields > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Auto-planned: {stats.autoPlannedFields}</span>
            <span>Overrides: {stats.userOverrideFields}</span>
            <span>Low confidence: {stats.lowConfidenceFields}</span>
            <span>Average confidence: {(stats.averageConfidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {showAudit && (
        <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] text-emerald-300">
          {JSON.stringify({ meta: stats, estimation }, null, 2)}
        </pre>
      )}

      {!!results?.length && (
        <div className="space-y-4">
          <CostBreakdownTable results={results} currency={estimation.pricing.currency} />
          <QuotationActions
            results={results}
            jobTitle={estimation.jobTitle}
            currency={estimation.pricing.currency}
            canCreateQuotation={hasUsableResults}
            isCreatingQuotation={isCreatingQuotation}
            onCreateQuotation={handleCreateQuotation}
          />
        </div>
      )}
    </div>
  );
}
