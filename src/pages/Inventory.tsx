import { useState } from "react";
import { cn } from "@/utils/cn";
import { formatNumber, formatCurrency } from "@/utils/format";
import { Warehouse, Search, Plus, Package, Layers, AlertTriangle, TrendingDown, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAppStore } from "@/stores/appStore";

const MOCK_INVENTORY = [
  { id: "1", name: "Matt Art Paper 130gsm", category: "Paper", size: "23×36", unit: "reams", inStock: 245, minLevel: 50, maxLevel: 500, lastReceived: "2025-07-05", cost: 3467, supplier: "Import" },
  { id: "2", name: "Matt Art Paper 150gsm", category: "Paper", size: "23×36", unit: "reams", inStock: 180, minLevel: 40, maxLevel: 400, lastReceived: "2025-07-01", cost: 4000, supplier: "Import" },
  { id: "3", name: "Art Card 300gsm", category: "Paper", size: "23×36", unit: "reams", inStock: 85, minLevel: 20, maxLevel: 200, lastReceived: "2025-06-28", cost: 9600, supplier: "Import" },
  { id: "4", name: "CTP Plates (23×36)", category: "Plates", size: "23×36", unit: "plates", inStock: 520, minLevel: 100, maxLevel: 1000, lastReceived: "2025-07-08", cost: 271, supplier: "Kodak" },
  { id: "5", name: "CTP Plates (28×40)", category: "Plates", size: "28×40", unit: "plates", inStock: 340, minLevel: 80, maxLevel: 800, lastReceived: "2025-07-06", cost: 403, supplier: "Kodak" },
  { id: "6", name: "BOPP Gloss Lamination Film", category: "Finishing", size: "Roll", unit: "rolls", inStock: 12, minLevel: 5, maxLevel: 30, lastReceived: "2025-07-03", cost: 8500, supplier: "Cosmo Films" },
  { id: "7", name: "5-Ply Cartons (Standard)", category: "Packing", size: "595×420×320mm", unit: "pieces", inStock: 1850, minLevel: 500, maxLevel: 5000, lastReceived: "2025-07-10", cost: 65, supplier: "Local" },
  { id: "8", name: "HB 80gsm", category: "Paper", size: "25×36", unit: "reams", inStock: 15, minLevel: 30, maxLevel: 200, lastReceived: "2025-06-15", cost: 2920, supplier: "Holmen" },
  { id: "9", name: "Wibalin Covering", category: "Covering", size: "Roll", unit: "rolls", inStock: 6, minLevel: 3, maxLevel: 15, lastReceived: "2025-06-20", cost: 9800, supplier: "Winter & Co" },
  { id: "10", name: "Imported Board 3mm", category: "Board", size: "31×41", unit: "sheets", inStock: 2400, minLevel: 500, maxLevel: 5000, lastReceived: "2025-07-02", cost: 112, supplier: "Import" },
];

export function Inventory() {
  const { theme } = useAppStore();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = [...new Set(MOCK_INVENTORY.map(i => i.category))];
  const filtered = MOCK_INVENTORY.filter(i => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  });

  const lowStockItems = MOCK_INVENTORY.filter(i => i.inStock <= i.minLevel);
  const totalValue = MOCK_INVENTORY.reduce((s, i) => s + i.inStock * i.cost, 0);

  const chartData = categories.map(cat => ({
    category: cat,
    items: MOCK_INVENTORY.filter(i => i.category === cat).length,
    value: MOCK_INVENTORY.filter(i => i.category === cat).reduce((s, i) => s + i.inStock * i.cost, 0),
  }));

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <Warehouse className="w-6 h-6" /> Inventory
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            Track paper stock, plates, finishing materials, and packing supplies
          </p>
        </div>
        <button className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1"><Package className="w-4 h-4" /> Total Items</div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{MOCK_INVENTORY.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1"><Layers className="w-4 h-4" /> Total Value</div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(totalValue)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1"><AlertTriangle className="w-4 h-4 text-warning-500" /> Low Stock</div>
          <p className={cn("text-2xl font-bold", lowStockItems.length > 0 ? "text-danger-600 dark:text-danger-400" : "text-success-600")}>{lowStockItems.length}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary mb-1"><BarChart3 className="w-4 h-4" /> Categories</div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">{categories.length}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5 min-w-0">
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">Inventory Value by Category</h3>
        <div className="h-48 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} />
              <YAxis tick={{ fontSize: 12, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#1e293b" : "#fff", borderRadius: "8px", fontSize: "12px", border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}` }} formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Value"]} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search inventory..." className="input-field pl-9" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setCategoryFilter("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", categoryFilter === "all" ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10" : "border-surface-light-border dark:border-surface-dark-border")}>All</button>
          {categories.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all", categoryFilter === c ? "border-primary-500 bg-primary-50 dark:bg-primary-500/10" : "border-surface-light-border dark:border-surface-dark-border")}>{c}</button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b">
            <th className="py-3 px-4 text-left font-semibold">Item</th>
            <th className="py-3 px-4 text-center font-semibold">Category</th>
            <th className="py-3 px-4 text-center font-semibold">Size</th>
            <th className="py-3 px-4 text-right font-semibold">In Stock</th>
            <th className="py-3 px-4 text-right font-semibold">Min Level</th>
            <th className="py-3 px-4 text-center font-semibold">Status</th>
            <th className="py-3 px-4 text-right font-semibold">Unit Cost</th>
            <th className="py-3 px-4 text-right font-semibold">Stock Value</th>
          </tr></thead>
          <tbody>
            {filtered.map(item => {
              const isLow = item.inStock <= item.minLevel;
              return (
                <tr key={item.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
                  <td className="py-2.5 px-4">
                    <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{item.name}</p>
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{item.supplier}</p>
                  </td>
                  <td className="py-2.5 px-4 text-center"><span className="badge badge-info text-[10px]">{item.category}</span></td>
                  <td className="py-2.5 px-4 text-center text-xs">{item.size}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">{formatNumber(item.inStock)} <span className="text-[10px] text-text-light-tertiary">{item.unit}</span></td>
                  <td className="py-2.5 px-4 text-right text-text-light-tertiary dark:text-text-dark-tertiary">{formatNumber(item.minLevel)}</td>
                  <td className="py-2.5 px-4 text-center">
                    {isLow ? <span className="badge-danger text-[10px] flex items-center gap-1 justify-center"><TrendingDown className="w-3 h-3" />Low</span> : <span className="badge-success text-[10px]">OK</span>}
                  </td>
                  <td className="py-2.5 px-4 text-right">{formatCurrency(item.cost)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold">{formatCurrency(item.inStock * item.cost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

