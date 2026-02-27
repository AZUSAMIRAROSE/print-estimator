import { useState, useMemo } from "react";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber, mmToInch } from "@/utils/format";
import { calculateSpineThickness } from "@/utils/calculations/spine";
import { calculateBookWeight } from "@/utils/calculations/weight";
import {
  Calculator as CalcIcon, Book, Layers, Printer,
  BookMarked, DollarSign, RefreshCcw, Sparkles
} from "lucide-react";
import { DEFAULT_PAPER_RATES, DEFAULT_MACHINES, TRIM_SIZE_PRESETS, BULK_FACTORS } from "@/constants";

export function Calculator() {
  const [input, setInput] = useState({
    bookHeight: 234,
    bookWidth: 153,
    pages: 256,
    gsm: 130,
    paperType: "Matt Art Paper",
    quantity: 5000,
    colorsFront: 4,
    colorsBack: 4,
    coverGSM: 300,
    coverPaper: "Art Card",
    bindingType: "perfect_binding",
    laminationType: "gloss",
    machineId: "rmgt",
  });

  const spine = useMemo(() => calculateSpineThickness({
    textSections: [{ pages: input.pages, gsm: input.gsm, paperType: input.paperType }],
  }), [input.pages, input.gsm, input.paperType]);

  const bookWeight = useMemo(() => calculateBookWeight({
    trimHeightMM: input.bookHeight,
    trimWidthMM: input.bookWidth,
    textSections: [{ pages: input.pages, gsm: input.gsm }],
    coverGSM: input.coverGSM,
    spineThickness: spine,
    hasEndleaves: false,
    endleavesPages: 0,
    endleavesGSM: 0,
    hasJacket: false,
    jacketGSM: 0,
    boardThicknessMM: 0,
    hasBoard: false,
  }), [input, spine]);

  // Quick cost estimate
  const quickEstimate = useMemo(() => {
    const paperRate = DEFAULT_PAPER_RATES.find(r => r.paperType === input.paperType && r.gsm === input.gsm);
    const coverRate = DEFAULT_PAPER_RATES.find(r => r.paperType === input.coverPaper && r.gsm === input.coverGSM);

    const sheetsPerReam = 500;
    const formsNeeded = Math.ceil(input.pages / 16);
    const netSheets = Math.ceil(input.quantity * formsNeeded / 2);
    const wastage = Math.ceil(netSheets * 0.05);
    const grossSheets = netSheets + wastage;
    const reams = grossSheets / sheetsPerReam;

    const paperCost = reams * (paperRate?.chargeRate || 4000);
    const coverCost = Math.ceil(input.quantity / 2) / sheetsPerReam * (coverRate?.chargeRate || 9600);

    const impressions = grossSheets;
    const printingCost = (impressions / 1000) * 199;
    const plates = formsNeeded * Math.max(input.colorsFront, input.colorsBack);
    const ctpCost = plates * 271;
    const makeReady = formsNeeded * 1200;

    const bindingCost = input.quantity * (input.bindingType === "perfect_binding" ? 0.22 * Math.ceil(input.pages / 16) : input.bindingType === "saddle_stitching" ? 0.30 : 0.35 * Math.ceil(input.pages / 16));
    const laminationCost = input.quantity * 0.78;

    const totalCost = paperCost + coverCost + printingCost + ctpCost + makeReady + bindingCost + laminationCost;
    const costPerCopy = input.quantity > 0 ? totalCost / input.quantity : 0;

    return {
      paperCost, coverCost, printingCost, ctpCost, makeReady, bindingCost, laminationCost,
      totalCost, costPerCopy, reams, plates, impressions,
    };
  }, [input]);

  const handleReset = () => setInput({ bookHeight: 234, bookWidth: 153, pages: 256, gsm: 130, paperType: "Matt Art Paper", quantity: 5000, colorsFront: 4, colorsBack: 4, coverGSM: 300, coverPaper: "Art Card", bindingType: "perfect_binding", laminationType: "gloss", machineId: "rmgt" });

  const paperTypes = [...new Set(DEFAULT_PAPER_RATES.map(r => r.paperType))];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <CalcIcon className="w-6 h-6" /> Quick Calculator
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Fast paper + printing cost calculation without the full wizard
          </p>
        </div>
        <button onClick={handleReset} className="btn-secondary flex items-center gap-1.5">
          <RefreshCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Book Spec */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <Book className="w-4 h-4 text-primary-500" /> Book Specification
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Width (mm)</label>
                <input type="number" value={input.bookWidth} onChange={e => setInput({ ...input, bookWidth: +e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Height (mm)</label>
                <input type="number" value={input.bookHeight} onChange={e => setInput({ ...input, bookHeight: +e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Pages</label>
                <input type="number" value={input.pages} onChange={e => setInput({ ...input, pages: +e.target.value })} step={4} className="input-field" />
              </div>
              <div>
                <label className="label">Quantity</label>
                <input type="number" value={input.quantity} onChange={e => setInput({ ...input, quantity: +e.target.value })} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Preset Size</label>
              <div className="flex flex-wrap gap-1.5">
                {TRIM_SIZE_PRESETS.slice(0, 10).map(p => (
                  <button key={p.label} onClick={() => setInput({ ...input, bookWidth: p.width, bookHeight: p.height })} className={cn("px-2.5 py-1 rounded-lg border text-xs transition-all", input.bookWidth === p.width && input.bookHeight === p.height ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400" : "border-surface-light-border dark:border-surface-dark-border hover:border-primary-300")}>
                    {p.label.split("(")[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Paper & Printing */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> Paper & Printing
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Text Paper</label>
                <select value={input.paperType} onChange={e => setInput({ ...input, paperType: e.target.value })} className="input-field">{paperTypes.map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
              <div>
                <label className="label">Text GSM</label>
                <input type="number" value={input.gsm} onChange={e => setInput({ ...input, gsm: +e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Colors Front</label>
                <select value={input.colorsFront} onChange={e => setInput({ ...input, colorsFront: +e.target.value })} className="input-field">
                  {[1, 2, 3, 4].map(c => <option key={c} value={c}>{c}C</option>)}
                </select>
              </div>
              <div>
                <label className="label">Machine</label>
                <select value={input.machineId} onChange={e => setInput({ ...input, machineId: e.target.value })} className="input-field">
                  {DEFAULT_MACHINES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Cover Paper</label>
                <select value={input.coverPaper} onChange={e => setInput({ ...input, coverPaper: e.target.value })} className="input-field">{paperTypes.map(p => <option key={p} value={p}>{p}</option>)}</select>
              </div>
              <div>
                <label className="label">Cover GSM</label>
                <input type="number" value={input.coverGSM} onChange={e => setInput({ ...input, coverGSM: +e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">Binding</label>
                <select value={input.bindingType} onChange={e => setInput({ ...input, bindingType: e.target.value })} className="input-field">
                  <option value="perfect_binding">Perfect Binding</option>
                  <option value="saddle_stitching">Saddle Stitching</option>
                  <option value="section_sewn_hardcase">Section Sewn HC</option>
                </select>
              </div>
              <div>
                <label className="label">Lamination</label>
                <select value={input.laminationType} onChange={e => setInput({ ...input, laminationType: e.target.value })} className="input-field">
                  <option value="gloss">Gloss</option>
                  <option value="matt">Matt</option>
                  <option value="velvet">Velvet</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Book Preview */}
          <div className="card p-5 text-center">
            <div className="flex items-center justify-center py-4">
              <div className="relative">
                <div className="bg-gradient-to-br from-primary-400 to-primary-600 rounded-r-md rounded-l-sm shadow-lg flex items-center justify-center" style={{ width: `${Math.min(Math.max(input.bookWidth * 0.5, 40), 100)}px`, height: `${Math.min(Math.max(input.bookHeight * 0.5, 50), 130)}px` }}>
                  <div className="text-white text-center">
                    <p className="text-[9px] font-medium">{input.bookWidth}×{input.bookHeight}mm</p>
                    <p className="text-[8px] opacity-70">{input.pages}pp</p>
                  </div>
                </div>
                {spine > 0 && (
                  <div className="absolute top-0 left-0 bg-primary-800 rounded-l-sm" style={{ width: `${Math.max(spine * 0.7, 2)}px`, height: "100%" }} />
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div>
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Spine</p>
                <p className="font-bold text-primary-600 dark:text-primary-400">{spine.toFixed(2)}mm</p>
              </div>
              <div>
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Weight</p>
                <p className="font-bold">{bookWeight.totalWeight.toFixed(0)}g</p>
              </div>
              <div>
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Bulk</p>
                <p className="font-bold">{BULK_FACTORS[input.paperType] || 1.0}×</p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" /> Quick Estimate
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { label: "Text Paper", value: quickEstimate.paperCost },
                { label: "Cover Paper", value: quickEstimate.coverCost },
                { label: "Printing", value: quickEstimate.printingCost },
                { label: "CTP Plates", value: quickEstimate.ctpCost },
                { label: "Make Ready", value: quickEstimate.makeReady },
                { label: "Binding", value: quickEstimate.bindingCost },
                { label: "Lamination", value: quickEstimate.laminationCost },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">{row.label}</span>
                  <span className="font-medium">{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div className="border-t-2 border-primary-500 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-bold text-text-light-primary dark:text-text-dark-primary">Total Cost</span>
                  <span className="font-bold text-primary-600 dark:text-primary-400 text-lg">{formatCurrency(quickEstimate.totalCost)}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">Cost/Copy</span>
                  <span className="font-semibold">{formatCurrency(quickEstimate.costPerCopy)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface-light-border dark:border-surface-dark-border text-xs text-center">
              <div>
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Reams</p>
                <p className="font-bold">{quickEstimate.reams.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Plates</p>
                <p className="font-bold">{quickEstimate.plates}</p>
              </div>
              <div>
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Impressions</p>
                <p className="font-bold">{formatNumber(quickEstimate.impressions)}</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary text-center">
            ⚡ Quick estimate — use the full 15-step wizard for precise calculations
          </p>
        </div>
      </div>
    </div>
  );
}