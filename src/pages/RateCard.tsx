import { useState } from "react";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/appStore";
import { formatCurrency, formatNumber } from "@/utils/format";
import {
  CreditCard, Plus, Edit3, Trash2, Save, X, Search,
  FileText, Printer, Layers, BookMarked, Sparkles,
  Package, Truck, ChevronDown, ChevronUp, Upload,
  Download, AlertCircle, Check
} from "lucide-react";
import {
  DEFAULT_PAPER_RATES, DEFAULT_MACHINES, IMPRESSION_RATES_DATA,
  WASTAGE_CHART, PERFECT_BINDING_RATES, SADDLE_STITCHING_RATES,
  LAMINATION_RATES, SPOT_UV_RATES, DEFAULT_COVERING_MATERIALS,
  DEFAULT_BOARD_TYPES, DEFAULT_DESTINATIONS, HARDCASE_DEFAULTS,
  STANDARD_PAPER_SIZES, CTP_RATES
} from "@/constants";

type RateTab = "paper" | "machines" | "impressions" | "wastage" | "binding" | "finishing" | "covering" | "board" | "freight" | "pallet";

const TABS: { key: RateTab; label: string; icon: React.ReactNode }[] = [
  { key: "paper", label: "Paper Rates", icon: <FileText className="w-4 h-4" /> },
  { key: "machines", label: "Machines", icon: <Printer className="w-4 h-4" /> },
  { key: "impressions", label: "Impression Rates", icon: <Layers className="w-4 h-4" /> },
  { key: "wastage", label: "Wastage Chart", icon: <AlertCircle className="w-4 h-4" /> },
  { key: "binding", label: "Binding Rates", icon: <BookMarked className="w-4 h-4" /> },
  { key: "finishing", label: "Finishing Rates", icon: <Sparkles className="w-4 h-4" /> },
  { key: "covering", label: "Covering Material", icon: <Layers className="w-4 h-4" /> },
  { key: "board", label: "Board Types", icon: <Package className="w-4 h-4" /> },
  { key: "freight", label: "Freight Rates", icon: <Truck className="w-4 h-4" /> },
  { key: "pallet", label: "Packing Rates", icon: <Package className="w-4 h-4" /> },
];

export function RateCard() {
  const { addNotification, addActivityLog } = useAppStore();
  const [activeTab, setActiveTab] = useState<RateTab>("paper");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = (tableName: string) => {
    setEditingId(null);
    addNotification({ type: "success", title: "Rate Updated", message: `${tableName} rate has been saved.`, category: "system" });
    addActivityLog({ action: "RATE_UPDATED", category: "settings", description: `${tableName} rate updated`, user: "Current User", entityType: "rate", entityId: "", level: "info" });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <CreditCard className="w-6 h-6" /> Rate Card
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Manage all pricing rates, machine details, and cost tables
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearch(""); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              activeTab === tab.key
                ? "bg-primary-600 text-white shadow-md"
                : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary-50 dark:hover:bg-primary-500/10"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${TABS.find(t => t.key === activeTab)?.label}...`} className="input-field pl-9" />
      </div>

      {/* Tab Content */}
      <div className="card overflow-hidden">
        {activeTab === "paper" && <PaperRatesTable search={search} editingId={editingId} setEditingId={setEditingId} onSave={() => handleSave("Paper")} />}
        {activeTab === "machines" && <MachinesTable search={search} />}
        {activeTab === "impressions" && <ImpressionRatesTable />}
        {activeTab === "wastage" && <WastageChartTable />}
        {activeTab === "binding" && <BindingRatesTable />}
        {activeTab === "finishing" && <FinishingRatesTable />}
        {activeTab === "covering" && <CoveringMaterialTable />}
        {activeTab === "board" && <BoardTypesTable />}
        {activeTab === "freight" && <FreightRatesTable search={search} />}
        {activeTab === "pallet" && <PackingRatesTable />}
      </div>
    </div>
  );
}

function PaperRatesTable({ search, editingId, setEditingId, onSave }: { search: string; editingId: string | null; setEditingId: (id: string | null) => void; onSave: () => void }) {
  const filtered = DEFAULT_PAPER_RATES.filter(r => !search || r.paperType.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
            <th className="py-3 px-4 text-left font-semibold text-text-light-primary dark:text-text-dark-primary">Paper Type</th>
            <th className="py-3 px-4 text-left font-semibold">Code</th>
            <th className="py-3 px-4 text-right font-semibold">GSM</th>
            <th className="py-3 px-4 text-center font-semibold">Size</th>
            <th className="py-3 px-4 text-right font-semibold">Landed Cost/Ream</th>
            <th className="py-3 px-4 text-right font-semibold">Charge Rate/Ream</th>
            <th className="py-3 px-4 text-right font-semibold">Rate/Kg</th>
            <th className="py-3 px-4 text-center font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((rate, i) => {
            const id = `${rate.code}-${rate.gsm}-${rate.size}`;
            const isEditing = editingId === id;
            return (
              <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors">
                <td className="py-2.5 px-4 font-medium text-text-light-primary dark:text-text-dark-primary">{rate.paperType}</td>
                <td className="py-2.5 px-4 text-text-light-secondary dark:text-text-dark-secondary font-mono text-xs">{rate.code}</td>
                <td className="py-2.5 px-4 text-right">{rate.gsm}</td>
                <td className="py-2.5 px-4 text-center">{rate.size}</td>
                <td className="py-2.5 px-4 text-right">{isEditing ? <input type="number" defaultValue={rate.landedCost} className="input-field w-24 text-right text-xs py-1" /> : formatCurrency(rate.landedCost)}</td>
                <td className="py-2.5 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">{isEditing ? <input type="number" defaultValue={rate.chargeRate} className="input-field w-24 text-right text-xs py-1" /> : formatCurrency(rate.chargeRate)}</td>
                <td className="py-2.5 px-4 text-right">{isEditing ? <input type="number" defaultValue={rate.ratePerKg} className="input-field w-20 text-right text-xs py-1" /> : `₹${rate.ratePerKg}`}</td>
                <td className="py-2.5 px-4 text-center">
                  {isEditing ? (
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={onSave} className="p-1 text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10 rounded"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditingId(id)} className="p-1 hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded"><Edit3 className="w-3.5 h-3.5 text-text-light-tertiary" /></button>
                      <button className="p-1 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded"><Trash2 className="w-3.5 h-3.5 text-danger-400" /></button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-3 border-t border-surface-light-border dark:border-surface-dark-border flex justify-between items-center">
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{filtered.length} paper rates</p>
        <button className="btn-secondary text-xs flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Paper Rate</button>
      </div>
    </div>
  );
}

function MachinesTable({ search }: { search: string }) {
  const filtered = DEFAULT_MACHINES.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
            <th className="py-3 px-4 text-left font-semibold">Machine</th>
            <th className="py-3 px-4 text-center font-semibold">Max Sheet</th>
            <th className="py-3 px-4 text-center font-semibold">Colors</th>
            <th className="py-3 px-4 text-center font-semibold">AQ</th>
            <th className="py-3 px-4 text-center font-semibold">Perfector</th>
            <th className="py-3 px-4 text-right font-semibold">Speed (SPH)</th>
            <th className="py-3 px-4 text-right font-semibold">Make Ready</th>
            <th className="py-3 px-4 text-right font-semibold">CTP Rate</th>
            <th className="py-3 px-4 text-right font-semibold">Hourly Rate</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(m => (
            <tr key={m.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
              <td className="py-2.5 px-4">
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{m.name}</p>
                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{m.description}</p>
              </td>
              <td className="py-2.5 px-4 text-center text-xs">{m.maxSheetWidth}"×{m.maxSheetHeight}"</td>
              <td className="py-2.5 px-4 text-center">{m.maxColors}</td>
              <td className="py-2.5 px-4 text-center">{m.hasAQUnit ? <Check className="w-4 h-4 text-success-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
              <td className="py-2.5 px-4 text-center">{m.hasPerfector ? <Check className="w-4 h-4 text-success-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}</td>
              <td className="py-2.5 px-4 text-right">{formatNumber(m.speedSPH)}</td>
              <td className="py-2.5 px-4 text-right">{formatCurrency(m.makeReadyCost)}</td>
              <td className="py-2.5 px-4 text-right">{formatCurrency(m.ctpRate)}</td>
              <td className="py-2.5 px-4 text-right">{formatCurrency(m.hourlyRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImpressionRatesTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
            <th className="py-3 px-4 text-left font-semibold">Impression Range</th>
            <th className="py-3 px-4 text-right font-semibold">FAV (₹/1000)</th>
            <th className="py-3 px-4 text-right font-semibold">Rekord+AQ</th>
            <th className="py-3 px-4 text-right font-semibold">Rekord-AQ</th>
            <th className="py-3 px-4 text-right font-semibold">RMGT</th>
            <th className="py-3 px-4 text-right font-semibold">RMGT Perfecto</th>
          </tr>
        </thead>
        <tbody>
          {IMPRESSION_RATES_DATA.map((r, i) => (
            <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
              <td className="py-2 px-4 font-medium">{formatNumber(r.range[0])} — {r.range[1] > 900000000 ? "∞" : formatNumber(r.range[1])}</td>
              <td className="py-2 px-4 text-right">{formatCurrency(r.fav)}</td>
              <td className="py-2 px-4 text-right">{formatCurrency(r.rekordAQ)}</td>
              <td className="py-2 px-4 text-right">{formatCurrency(r.rekordNoAQ)}</td>
              <td className="py-2 px-4 text-right">{formatCurrency(r.rmgt)}</td>
              <td className="py-2 px-4 text-right">{formatCurrency(r.rmgtPerfecto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WastageChartTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
            <th className="py-3 px-4 text-left font-semibold">Quantity Range</th>
            <th className="py-3 px-4 text-right font-semibold">4-Color Waste</th>
            <th className="py-3 px-4 text-right font-semibold">2-Color Waste</th>
            <th className="py-3 px-4 text-right font-semibold">1-Color Waste</th>
            <th className="py-3 px-4 text-center font-semibold">Type</th>
          </tr>
        </thead>
        <tbody>
          {WASTAGE_CHART.map((w, i) => (
            <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
              <td className="py-2 px-4 font-medium">{formatNumber(w.minQuantity)} — {w.maxQuantity > 900000000 ? "∞" : formatNumber(w.maxQuantity)}</td>
              <td className="py-2 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">{w.isPercentage ? `${w.fourColorWaste}%` : `${formatNumber(w.fourColorWaste)} sheets`}</td>
              <td className="py-2 px-4 text-right">{w.isPercentage ? `${w.twoColorWaste}%` : `${formatNumber(w.twoColorWaste)} sheets`}</td>
              <td className="py-2 px-4 text-right">{w.isPercentage ? `${w.oneColorWaste}%` : `${formatNumber(w.oneColorWaste)} sheets`}</td>
              <td className="py-2 px-4 text-center"><span className={cn("badge text-[10px]", w.isPercentage ? "badge-warning" : "badge-info")}>{w.isPercentage ? "%" : "Fixed"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 border-t border-surface-light-border dark:border-surface-dark-border">
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">⚠️ Wastage is applied PER FORM, not per total. Total wastage = wastage × number_of_forms</p>
      </div>
    </div>
  );
}

function BindingRatesTable() {
  return (
    <div className="p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Perfect Binding Rates</h3>
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary"><th className="py-2 px-4 text-left font-medium">Qty Range</th><th className="py-2 px-4 text-right font-medium">Rate/16pp</th><th className="py-2 px-4 text-right font-medium">Gathering/Section</th></tr></thead>
          <tbody>
            {PERFECT_BINDING_RATES.map((r, i) => (
              <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                <td className="py-2 px-4">{formatNumber(r.minQty)} — {r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}</td>
                <td className="py-2 px-4 text-right font-semibold">₹{r.ratePer16pp}</td>
                <td className="py-2 px-4 text-right">₹{r.gatheringRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Saddle Stitching Rates</h3>
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary"><th className="py-2 px-4 text-left font-medium">Qty Range</th><th className="py-2 px-4 text-right font-medium">Rate/Copy</th></tr></thead>
          <tbody>
            {SADDLE_STITCHING_RATES.map((r, i) => (
              <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                <td className="py-2 px-4">{formatNumber(r.minQty)} — {r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}</td>
                <td className="py-2 px-4 text-right font-semibold">₹{r.ratePerCopy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Hardcase Binding Components</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(HARDCASE_DEFAULTS).map(([key, value]) => (
            <div key={key} className="flex justify-between p-2.5 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-xs">
              <span className="text-text-light-secondary dark:text-text-dark-secondary capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
              <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">₹{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinishingRatesTable() {
  return (
    <div className="p-5 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Lamination</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(LAMINATION_RATES).map(([type, rate]) => (
            <div key={type} className="p-4 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-center">
              <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary uppercase font-medium capitalize">{type.replace("_", " ")}</p>
              <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mt-1">₹{rate.ratePerCopy}</p>
              <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">per copy • Min ₹{formatNumber(rate.minOrder)}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Spot UV Rates</h3>
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary"><th className="py-2 px-4 text-left font-medium">Qty Range</th><th className="py-2 px-4 text-right font-medium">Rate/Copy</th><th className="py-2 px-4 text-right font-medium">Block Cost</th></tr></thead>
          <tbody>
            {SPOT_UV_RATES.map((r, i) => (
              <tr key={i} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50">
                <td className="py-2 px-4">{formatNumber(r.minQty)} — {r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}</td>
                <td className="py-2 px-4 text-right font-semibold">₹{r.ratePerCopy}</td>
                <td className="py-2 px-4 text-right">₹{formatNumber(r.blockCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CoveringMaterialTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b"><th className="py-3 px-4 text-left font-semibold">Material</th><th className="py-3 px-4 text-left font-semibold">Code</th><th className="py-3 px-4 text-right font-semibold">Roll Width (mm)</th><th className="py-3 px-4 text-right font-semibold">Rate/sqm (₹)</th><th className="py-3 px-4 text-right font-semibold">Rate/m (₹)</th><th className="py-3 px-4 text-left font-semibold">Supplier</th></tr></thead>
        <tbody>
          {DEFAULT_COVERING_MATERIALS.map(m => (
            <tr key={m.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
              <td className="py-2.5 px-4 font-medium text-text-light-primary dark:text-text-dark-primary">{m.name}</td>
              <td className="py-2.5 px-4 font-mono text-xs text-text-light-tertiary">{m.code}</td>
              <td className="py-2.5 px-4 text-right">{m.rollWidth || "—"}</td>
              <td className="py-2.5 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">{m.ratePerSqMeter > 0 ? `₹${m.ratePerSqMeter}` : "Paper rate"}</td>
              <td className="py-2.5 px-4 text-right">{m.ratePerMeter > 0 ? `₹${m.ratePerMeter}` : "—"}</td>
              <td className="py-2.5 px-4 text-text-light-secondary dark:text-text-dark-secondary">{m.supplier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardTypesTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b"><th className="py-3 px-4 text-left font-semibold">Board</th><th className="py-3 px-4 text-center font-semibold">Origin</th><th className="py-3 px-4 text-right font-semibold">Thickness</th><th className="py-3 px-4 text-center font-semibold">Sheet Size</th><th className="py-3 px-4 text-right font-semibold">Weight/Sheet</th><th className="py-3 px-4 text-right font-semibold">Rate/kg</th><th className="py-3 px-4 text-right font-semibold">Rate/Sheet</th></tr></thead>
        <tbody>
          {DEFAULT_BOARD_TYPES.map(b => (
            <tr key={b.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
              <td className="py-2.5 px-4 font-medium">{b.name}</td>
              <td className="py-2.5 px-4 text-center"><span className={cn("badge text-[10px]", b.origin === "imported" ? "badge-info" : "badge-success")}>{b.origin}</span></td>
              <td className="py-2.5 px-4 text-right">{b.thickness}mm</td>
              <td className="py-2.5 px-4 text-center">{b.sheetWidth}"×{b.sheetHeight}"</td>
              <td className="py-2.5 px-4 text-right">{b.weightPerSheet}kg</td>
              <td className="py-2.5 px-4 text-right">₹{b.ratePerKg}</td>
              <td className="py-2.5 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">₹{b.ratePerSheet.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FreightRatesTable({ search }: { search: string }) {
  const filtered = DEFAULT_DESTINATIONS.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b"><th className="py-3 px-3 text-left font-semibold">Destination</th><th className="py-3 px-3 text-left font-semibold">Country</th><th className="py-3 px-3 text-center font-semibold">Type</th><th className="py-3 px-3 text-right font-semibold">Sea/20ft ($)</th><th className="py-3 px-3 text-right font-semibold">Sea/Pallet ($)</th><th className="py-3 px-3 text-right font-semibold">Surface/Pallet (₹)</th><th className="py-3 px-3 text-right font-semibold">Air/kg (₹)</th><th className="py-3 px-3 text-right font-semibold">Clearance (₹)</th></tr></thead>
        <tbody>
          {filtered.map(d => (
            <tr key={d.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
              <td className="py-2 px-3 font-medium text-text-light-primary dark:text-text-dark-primary">{d.name}</td>
              <td className="py-2 px-3 text-text-light-secondary dark:text-text-dark-secondary">{d.country}</td>
              <td className="py-2 px-3 text-center"><span className={cn("badge text-[9px]", d.isOverseas ? "badge-info" : "badge-success")}>{d.isOverseas ? "Overseas" : "Domestic"}</span></td>
              <td className="py-2 px-3 text-right">{d.seaFreightPerContainer20 > 0 ? `$${formatNumber(d.seaFreightPerContainer20)}` : "—"}</td>
              <td className="py-2 px-3 text-right">{d.seaFreightPerPallet > 0 ? `$${d.seaFreightPerPallet}` : "—"}</td>
              <td className="py-2 px-3 text-right">{d.surfacePerPallet > 0 ? `₹${formatNumber(d.surfacePerPallet)}` : d.surfacePerTruck > 0 ? `₹${formatNumber(d.surfacePerTruck)}/truck` : "—"}</td>
              <td className="py-2 px-3 text-right">{d.airFreightPerKg > 0 ? `₹${d.airFreightPerKg}` : "—"}</td>
              <td className="py-2 px-3 text-right">{d.clearanceCharges > 0 ? `₹${formatNumber(d.clearanceCharges)}` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PackingRatesTable() {
  const { PACKING_RATES: PR } = { PACKING_RATES: { carton3Ply: 45, carton5Ply: 65, customPrintSurcharge: 15, innerPartition: 8, palletStandard: 1350, palletHeatTreated: 1600, palletEuro: 1500, stretchWrap: 250, strapping: 80, cornerProtectors: 60, polybag: 1.50, kraftWrap: 3.00 } };
  return (
    <div className="p-5">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(PR).map(([key, value]) => (
          <div key={key} className="flex justify-between items-center p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg">
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
            <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">₹{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}