import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  FileText,
  Package,
  RefreshCcw,
  Ruler,
  ShieldCheck,
} from "lucide-react";
import { WizardShell } from "@/components/wizard/v2";
import { buildCanonicalDataSources } from "@/domain/estimation/adapters/v2Workflow";
import { useWizardStore } from "@/domain/estimation/wizardStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useRateCardStore } from "@/stores/rateCardStore";

export function NewEstimateV2() {
  const navigate = useNavigate();
  const {
    estimation,
    resetToDefault,
    setDataSources,
    showLivePreview,
    toggleLivePreview,
  } = useWizardStore();
  const inventory = useInventoryStore((state) => state.items || []);
  const rateCard = useRateCardStore((state) => state.paperRates || []);

  const dataSources = useMemo(
    () => buildCanonicalDataSources(inventory, rateCard),
    [inventory, rateCard],
  );

  const activeQuantities = estimation.book.quantities.filter((quantity) => quantity > 0);
  const enabledSections = estimation.sections.filter((section) => section.enabled);

  useEffect(() => {
    setDataSources(dataSources.inventory, dataSources.rateCard);
  }, [dataSources.inventory, dataSources.rateCard, setDataSources]);

  return (
    <div className="min-h-[calc(100vh-8rem)] -m-3 sm:-m-4 md:-m-6 bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_45%,_#ffffff_100%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.18),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]">
      <div className="mx-auto flex min-h-full max-w-[1800px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/85 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/75">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/60 dark:text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Estimation V2 Control Room
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Precision quoting for complex print jobs without the legacy guesswork.
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  This workspace now runs on typed planning data, live inventory/rate-card feeds,
                  and a real calculation/review path so the quotation flow stays consistent from
                  wizard input to saved draft.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Live Quantities</span>
                    <Package className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{activeQuantities.length}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {activeQuantities.length > 0 ? activeQuantities.join(", ") : "No active tiers"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Enabled Sections</span>
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{enabledSections.length}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {enabledSections.map((section) => section.label).join(", ")}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resolved Paper Pool</span>
                    <Ruler className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{dataSources.inventory.length}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {dataSources.rateCard.length} rate-card lines ready for planning
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trim Size</span>
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                    {estimation.book.trimSize.width} × {estimation.book.trimSize.height}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    mm working size for the current book
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <button
                type="button"
                onClick={toggleLivePreview}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                {showLivePreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showLivePreview ? "Hide Preview" : "Show Preview"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/quotations")}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Open Quotations
              </button>

              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <RefreshCcw className="h-4 w-4" />
                Reset Workflow
              </button>
            </div>
          </div>
        </section>

        <section className="min-h-[900px] rounded-[32px] border border-slate-200/80 bg-white/90 shadow-[0_35px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="h-full p-2 sm:p-3 md:p-4">
            <WizardShell />
          </div>
        </section>
      </div>
    </div>
  );
}

export default NewEstimateV2;
