import { useState, useRef } from "react";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { cn } from "@/utils/cn";
import { useAppStore } from "@/stores/appStore";
import { useRateCardStore } from "@/stores/rateCardStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { exportTabCSV } from "./ratecard/RateCardShared";
import { PaperRatesTab } from "./ratecard/PaperRatesTab";
import { MachinesTab, MachineDetailsTab } from "./ratecard/MachinesTab";
import { ImpressionRatesTab, WastageChartTab, BindingRatesTab, FinishingRatesTab, CoveringMaterialTab, BoardTypesTab, FreightRatesTab, PackingRatesTab } from "./ratecard/RateTabsExtra";
import { TransferTab } from "./ratecard/TransferTab";
import {
  CreditCard, Search, Upload, Download, FileText, Printer, Layers,
  BookMarked, Sparkles, Package, Truck, AlertCircle, Settings,
  ArrowLeftRight, Cpu, BarChart3
} from "lucide-react";

type RateTab = "paper" | "machines" | "machine_details" | "impressions" | "wastage" | "binding" | "finishing" | "covering" | "board" | "freight" | "packing" | "transfers";

const TABS: { key: RateTab; label: string; icon: React.ReactNode }[] = [
  { key: "paper", label: "Paper Rates", icon: <FileText className="w-4 h-4" /> },
  { key: "machines", label: "Machines", icon: <Printer className="w-4 h-4" /> },
  { key: "machine_details", label: "Machine Details", icon: <Cpu className="w-4 h-4" /> },
  { key: "impressions", label: "Impression Rates", icon: <Layers className="w-4 h-4" /> },
  { key: "wastage", label: "Wastage Chart", icon: <AlertCircle className="w-4 h-4" /> },
  { key: "binding", label: "Binding Rates", icon: <BookMarked className="w-4 h-4" /> },
  { key: "finishing", label: "Finishing Rates", icon: <Sparkles className="w-4 h-4" /> },
  { key: "covering", label: "Covering Material", icon: <Layers className="w-4 h-4" /> },
  { key: "board", label: "Board Types", icon: <Package className="w-4 h-4" /> },
  { key: "freight", label: "Freight Rates", icon: <Truck className="w-4 h-4" /> },
  { key: "packing", label: "Packing Rates", icon: <Package className="w-4 h-4" /> },
  { key: "transfers", label: "Moving/Transfer", icon: <ArrowLeftRight className="w-4 h-4" /> },
];

export function RateCard() {
  const { addNotification, addActivityLog, user } = useAppStore();
  const store = useRateCardStore();
  const invStore = useInventoryStore();
  const [activeTab, setActiveTab] = useState<RateTab>("paper");
  const [search, setSearch] = useState("");
  const canEditRates = (user?.role || "").toLowerCase().includes("admin");
  const importRef = useRef<HTMLInputElement>(null);

  // ── Export All ──────────────────────────────────────────────────────────────
  const handleExportAll = async () => {
    const sections: string[] = [];

    sections.push("=== PAPER RATES ===");
    sections.push("Paper Type,Code,GSM,Size,Landed Cost,Charge Rate,Rate/Kg,Supplier,MOQ,HSN,Margin%,Status");
    store.paperRates.forEach(r => sections.push(`"${r.paperType}","${r.code}",${r.gsm},"${r.size}",${r.landedCost},${r.chargeRate},${r.ratePerKg},"${r.supplier}",${r.moq},"${r.hsnCode}",${r.marginPercent},"${r.status}"`));

    sections.push("", "=== MACHINES ===");
    sections.push("Name,Code,Type,Max Sheet,Colors,AQ,Perfector,Speed,Make Ready,CTP Rate,Hourly Rate,Status,Manufacturer,Model");
    store.machines.forEach(m => sections.push(`"${m.name}","${m.code}","${m.type}","${m.maxSheetWidth}x${m.maxSheetHeight}",${m.maxColors},${m.hasAQUnit},${m.hasPerfector},${m.speedSPH},${m.makeReadyCost},${m.ctpRate},${m.hourlyRate},"${m.operationalStatus}","${m.manufacturer}","${m.model}"`));

    sections.push("", "=== IMPRESSION RATES ===");
    sections.push("Range Min,Range Max,FAV,Rekord+AQ,Rekord-AQ,RMGT,RMGT Perfecto");
    store.impressionRates.forEach(r => sections.push(`${r.rangeMin},${r.rangeMax},${r.fav},${r.rekordAQ},${r.rekordNoAQ},${r.rmgt},${r.rmgtPerfecto}`));

    sections.push("", "=== WASTAGE CHART ===");
    sections.push("Min Qty,Max Qty,4-Color,2-Color,1-Color,Type");
    store.wastageChart.forEach(w => sections.push(`${w.minQuantity},${w.maxQuantity},${w.fourColorWaste},${w.twoColorWaste},${w.oneColorWaste},${w.isPercentage ? "Percentage" : "Fixed"}`));

    sections.push("", "=== PERFECT BINDING ===");
    sections.push("Min Qty,Max Qty,Rate/16pp,Gathering Rate");
    store.perfectBinding.forEach(r => sections.push(`${r.minQty},${r.maxQty},${r.ratePer16pp},${r.gatheringRate}`));

    sections.push("", "=== SADDLE STITCHING ===");
    sections.push("Min Qty,Max Qty,Rate/Copy");
    store.saddleStitch.forEach(r => sections.push(`${r.minQty},${r.maxQty},${r.ratePerCopy}`));

    sections.push("", "=== LAMINATION ===");
    sections.push("Type,Rate/Copy,Min Order");
    store.lamination.forEach(l => sections.push(`"${l.type}",${l.ratePerCopy},${l.minOrder}`));

    sections.push("", "=== SPOT UV ===");
    sections.push("Min Qty,Max Qty,Rate/Copy,Block Cost");
    store.spotUV.forEach(r => sections.push(`${r.minQty},${r.maxQty},${r.ratePerCopy},${r.blockCost}`));

    sections.push("", "=== COVERING MATERIALS ===");
    sections.push("Name,Code,Roll Width,Rate/sqm,Rate/m,Supplier");
    store.coveringMaterials.forEach(m => sections.push(`"${m.name}","${m.code}",${m.rollWidth},${m.ratePerSqMeter},${m.ratePerMeter},"${m.supplier}"`));

    sections.push("", "=== BOARD TYPES ===");
    sections.push("Name,Origin,Thickness,Size,Weight/Sheet,Rate/kg,Rate/Sheet");
    store.boardTypes.forEach(b => sections.push(`"${b.name}","${b.origin}",${b.thickness},"${b.sheetWidth}x${b.sheetHeight}",${b.weightPerSheet},${b.ratePerKg},${b.ratePerSheet}`));

    sections.push("", "=== FREIGHT DESTINATIONS ===");
    sections.push("Name,Country,Type,Sea/20ft,Sea/Pallet,Surface/Pallet,Air/kg,Clearance");
    store.freightDestinations.forEach(d => sections.push(`"${d.name}","${d.country}","${d.isOverseas ? "Overseas" : "Domestic"}",${d.seaFreightPerContainer20},${d.seaFreightPerPallet},${d.surfacePerPallet},${d.airFreightPerKg},${d.clearanceCharges}`));

    sections.push("", "=== PACKING RATES ===");
    Object.entries(store.packingRates).forEach(([k, v]) => sections.push(`"${k}",${v}`));

    if (invStore.transfers.length > 0) {
      sections.push("", "=== TRANSFERS ===");
      sections.push("Item,SKU,Qty,From,To,Status,Total Cost,Date");
      invStore.transfers.forEach(t => sections.push(`"${t.itemName}","${t.sku}",${t.quantity},"${t.fromWarehouse}","${t.toWarehouse}","${t.status}",${t.totalTransferCost},"${t.transferDate}"`));
    }

    const csv = sections.join("\n");

    try {
      const filePath = await save({
        filters: [{ name: 'CSV File', extensions: ['csv'] }],
        defaultPath: "rate-card-complete-export.csv",
      });

      if (!filePath) return;

      await writeTextFile(filePath, csv);

      addNotification({ type: "success", title: "Rate Card Exported", message: `Complete rate card saved to ${filePath}`, category: "export" });
      addActivityLog({ action: "RATE_CARD_EXPORTED", category: "settings", description: "Complete rate card exported", user: "Current User", entityType: "rate", entityId: "", level: "info" });
    } catch (error: any) {
      addNotification({ type: "error", title: "Export Failed", message: error.message || "Failed to export complete rate card.", category: "system" });
    }
  };

  // ── Import CSV ─────────────────────────────────────────────────────────────
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        addNotification({ type: "error", title: "Import Failed", message: "CSV file is empty or has no data rows.", category: "import" });
        return;
      }
      const dataRows = lines.filter(l => !l.startsWith("===") && l.includes(",")).length - 1;
      addNotification({ type: "success", title: "Rate Card Imported", message: `${Math.max(0, dataRows)} rate entries read from CSV.`, category: "import" });
      addActivityLog({ action: "RATE_CARD_IMPORTED", category: "settings", description: `Rate card CSV imported with ${Math.max(0, dataRows)} entries`, user: "Current User", entityType: "rate", entityId: "", level: "info" });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Tab stats ──────────────────────────────────────────────────────────────
  const tabCount = (tab: RateTab): number => {
    switch (tab) {
      case "paper": return store.paperRates.length;
      case "machines": return store.machines.length;
      case "machine_details": return store.machines.length;
      case "impressions": return store.impressionRates.length;
      case "wastage": return store.wastageChart.length;
      case "binding": return store.perfectBinding.length + store.saddleStitch.length + store.wireO.length;
      case "finishing": return store.lamination.length + store.spotUV.length;
      case "covering": return store.coveringMaterials.length;
      case "board": return store.boardTypes.length;
      case "freight": return store.freightDestinations.length;
      case "packing": return Object.keys(store.packingRates).length;
      case "transfers": return invStore.transfers.length;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <CreditCard className="w-6 h-6" /> Rate Card
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Manage all pricing rates, machine details, cost tables & inventory transfers — {store.paperRates.length + store.machines.length + store.impressionRates.length + invStore.transfers.length} total entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="file" ref={importRef} accept=".csv,.tsv,.xlsx,.xls" onChange={handleImportCSV} className="hidden" />
          <button onClick={() => importRef.current?.click()} className="btn-secondary text-sm flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={handleExportAll} className="btn-primary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export All
          </button>
        </div>
      </div>

      {!canEditRates && (
        <div className="card p-3 border-warning-500/30 bg-warning-50 dark:bg-warning-500/10">
          <p className="text-xs text-warning-700 dark:text-warning-400">
            View-only mode: admin role is required to edit pricing tables.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setSearch(""); }}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all relative",
              activeTab === tab.key
                ? "bg-primary-600 text-white shadow-md"
                : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-text-light-secondary dark:text-text-dark-secondary hover:bg-primary-50 dark:hover:bg-primary-500/10"
            )}
          >
            {tab.icon}
            {tab.label}
            <span className={cn(
              "ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
              activeTab === tab.key ? "bg-white/20 text-white" : "bg-surface-light-border dark:bg-surface-dark-border text-text-light-tertiary dark:text-text-dark-tertiary"
            )}>
              {tabCount(tab.key)}
            </span>
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
        {activeTab === "paper" && <PaperRatesTab search={search} canEdit={canEditRates} />}
        {activeTab === "machines" && <MachinesTab search={search} canEdit={canEditRates} />}
        {activeTab === "machine_details" && <MachineDetailsTab search={search} canEdit={canEditRates} />}
        {activeTab === "impressions" && <ImpressionRatesTab canEdit={canEditRates} />}
        {activeTab === "wastage" && <WastageChartTab canEdit={canEditRates} />}
        {activeTab === "binding" && <BindingRatesTab canEdit={canEditRates} />}
        {activeTab === "finishing" && <FinishingRatesTab canEdit={canEditRates} />}
        {activeTab === "covering" && <CoveringMaterialTab canEdit={canEditRates} />}
        {activeTab === "board" && <BoardTypesTab canEdit={canEditRates} />}
        {activeTab === "freight" && <FreightRatesTab search={search} canEdit={canEditRates} />}
        {activeTab === "packing" && <PackingRatesTab canEdit={canEditRates} />}
        {activeTab === "transfers" && <TransferTab search={search} canEdit={canEditRates} />}
      </div>
    </div>
  );
}
