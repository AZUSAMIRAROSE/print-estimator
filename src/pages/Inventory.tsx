import { useState } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useMachineStore } from "@/stores/machineStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";
import { downloadTextFile } from "@/utils/export";
import {
  Warehouse, Download, Package, Settings, AlertTriangle,
  ArrowRightLeft, BarChart3
} from "lucide-react";
import { InventoryItemsTab } from "./inventory/InventoryItemsTab";
import { MachinesTab } from "./inventory/MachinesTab";
import { NMITab } from "./inventory/NMITab";
import { TransfersTab } from "./inventory/TransfersTab";
import { AnalyticsTab } from "./inventory/AnalyticsTab";

type TabKey = "items" | "machines" | "nmi" | "transfers" | "analytics";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "items", label: "Inventory Items", icon: <Package className="w-4 h-4" /> },
  { key: "machines", label: "Machines", icon: <Settings className="w-4 h-4" /> },
  { key: "nmi", label: "NMI", icon: <AlertTriangle className="w-4 h-4" /> },
  { key: "transfers", label: "Transfers", icon: <ArrowRightLeft className="w-4 h-4" /> },
  { key: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" /> },
];

export function Inventory() {
  const [activeTab, setActiveTab] = useState<TabKey>("items");
  const { items, nmiRecords, transfers } = useInventoryStore();
  const { machines } = useMachineStore();
  const { addNotification } = useAppStore();

  const totalValue = items.reduce((s, i) => s + i.stock * i.costPerUnit, 0);
  const lowStockCount = items.filter(i => i.stock <= i.minLevel && i.status === "active").length;

  const tabCounts: Record<TabKey, number> = {
    items: items.length,
    machines: machines.size,
    nmi: nmiRecords.length,
    transfers: transfers.length,
    analytics: 0,
  };

  const handleExport = () => {
    const lines: string[] = [];

    // Items CSV
    lines.push("=== INVENTORY ITEMS ===");
    lines.push("SKU,Name,Category,Subcategory,Stock,MinLevel,MaxLevel,Unit,CostPerUnit,SellingPrice,AvgCost,Supplier,Warehouse,Zone,Rack,Shelf,Bin,Status,Condition,MovementClass,BatchNumber,LotNumber,HSNCode,TaxRate,Weight,WeightUnit,QualityGrade,ExpiryDate,ShelfLifeDays,Notes");
    items.forEach(i => {
      lines.push([i.sku, i.name, i.category, i.subcategory, i.stock, i.minLevel, i.maxLevel, i.unit, i.costPerUnit, i.sellingPrice, i.avgCost, i.supplier, i.warehouse, i.zone, i.rack, i.shelf, i.bin, i.status, i.condition, i.movementClass, i.batchNumber, i.lotNumber, i.hsnCode, i.taxRate, i.weight, i.weightUnit, i.qualityGrade, i.expiryDate, i.shelfLifeDays, i.notes].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });

    lines.push("");
    lines.push("=== MACHINES ===");
    lines.push("Nickname,Name,Type,Manufacturer,Model,SerialNumber,MaxColors,Speed,HourlyRate,SetupCost,Status,BookValue");
    Array.from(machines.values()).forEach(m => {
      lines.push([m.nickname, m.name, m.type, m.manufacturer, m.model, m.serialNumber, m.maxColorsPerPass, m.effectiveSpeed, m.hourlyRate, m.fixedSetupCost, m.status, m.currentBookValue].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    });

    lines.push("");
    lines.push("=== NMI RECORDS ===");
    lines.push("ItemName,SKU,DaysWithoutMovement,Category,CurrentValue,DepreciatedValue,Action,Status,Location");
    nmiRecords.forEach(r => {
      lines.push([r.itemName, r.sku, r.daysWithoutMovement, r.nmiCategory, r.currentValue, r.depreciatedValue, r.action, r.status, r.location].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });

    lines.push("");
    lines.push("=== TRANSFERS ===");
    lines.push("ItemName,SKU,Quantity,FromWarehouse,FromZone,ToWarehouse,ToZone,TransportMode,TransportCharges,HandlingCharges,InsuranceCharges,TotalCost,Status,TransferDate");
    transfers.forEach(t => {
      lines.push([t.itemName, t.sku, t.quantity, t.fromWarehouse, t.fromZone, t.toWarehouse, t.toZone, t.transportMode, t.transportCharges, t.handlingCharges, t.insuranceCharges, t.totalTransferCost, t.status, t.transferDate].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });

    downloadTextFile("inventory-full-export.csv", lines.join("\n"), "text/csv;charset=utf-8");
    addNotification({ type: "success", title: "Export Complete", message: `Exported ${items.length} items, ${machines.size} machines, ${nmiRecords.length} NMI records, ${transfers.length} transfers.`, category: "export" });
  };

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <Warehouse className="w-6 h-6" /> Inventory Management
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {items.length} items • {machines.size} machines • Total value: {formatCurrency(totalValue)}
            {lowStockCount > 0 && <span className="text-danger-500 ml-2">• {lowStockCount} low stock</span>}
          </p>
        </div>
        <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
          <Download className="w-4 h-4" /> Export All
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-xl">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-white dark:bg-surface-dark-secondary shadow-sm text-primary-700 dark:text-primary-400 border border-primary-200/50 dark:border-primary-500/20"
                : "text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary"
            )}
          >
            {tab.icon}
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                activeTab === tab.key
                  ? "bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400"
                  : "bg-surface-light-border dark:bg-surface-dark-border text-text-light-tertiary dark:text-text-dark-tertiary"
              )}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "items" && <InventoryItemsTab />}
        {activeTab === "machines" && <MachinesTab />}
        {activeTab === "nmi" && <NMITab />}
        {activeTab === "transfers" && <TransfersTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </div>
    </div>
  );
}
