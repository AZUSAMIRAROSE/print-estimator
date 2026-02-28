import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber, generateId } from "@/utils/format";
import {
  Warehouse, Search, Plus, Edit3, Trash2,
  AlertTriangle, BarChart3, Download
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { downloadTextFile } from "@/utils/export";

interface InventoryItem {
  id: string;
  name: string;
  category: "paper" | "plates" | "finishing" | "packing" | "ink" | "other";
  unit: string;
  stock: number;
  minLevel: number;
  costPerUnit: number;
  supplier: string;
  lastUpdated: string;
  sku: string;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "1", name: "Matt Art Paper 80gsm", category: "paper", unit: "Reams", stock: 350, minLevel: 50, costPerUnit: 2800, supplier: "JK Paper", lastUpdated: "2025-07-10T08:00:00Z", sku: "PAP-MA-080" },
  { id: "2", name: "Matt Art Paper 130gsm", category: "paper", unit: "Reams", stock: 180, minLevel: 30, costPerUnit: 4200, supplier: "JK Paper", lastUpdated: "2025-07-09T14:30:00Z", sku: "PAP-MA-130" },
  { id: "3", name: "Woodfree CW 70gsm", category: "paper", unit: "Reams", stock: 420, minLevel: 100, costPerUnit: 2100, supplier: "Ballarpur Industries", lastUpdated: "2025-07-08T11:00:00Z", sku: "PAP-WF-070" },
  { id: "4", name: "Art Card 300gsm", category: "paper", unit: "Reams", stock: 85, minLevel: 20, costPerUnit: 8500, supplier: "ITC", lastUpdated: "2025-07-07T09:00:00Z", sku: "PAP-AC-300" },
  { id: "5", name: "CTP Plates 660×820", category: "plates", unit: "Pieces", stock: 200, minLevel: 50, costPerUnit: 600, supplier: "Kodak", lastUpdated: "2025-07-06T16:00:00Z", sku: "PLT-CTP-660" },
  { id: "6", name: "CTP Plates 790×1030", category: "plates", unit: "Pieces", stock: 120, minLevel: 30, costPerUnit: 950, supplier: "Kodak", lastUpdated: "2025-07-05T10:00:00Z", sku: "PLT-CTP-790" },
  { id: "7", name: "Gloss Lamination Film", category: "finishing", unit: "Rolls", stock: 15, minLevel: 5, costPerUnit: 6500, supplier: "Cosmo Films", lastUpdated: "2025-07-04T13:00:00Z", sku: "FIN-GL-LAM" },
  { id: "8", name: "Matt Lamination Film", category: "finishing", unit: "Rolls", stock: 12, minLevel: 5, costPerUnit: 7200, supplier: "Cosmo Films", lastUpdated: "2025-07-03T08:30:00Z", sku: "FIN-MT-LAM" },
  { id: "9", name: "PUR Hot Melt Adhesive", category: "finishing", unit: "Kg", stock: 45, minLevel: 10, costPerUnit: 850, supplier: "Henkel", lastUpdated: "2025-07-02T12:00:00Z", sku: "FIN-PUR-HM" },
  { id: "10", name: "3-Ply Cartons", category: "packing", unit: "Pieces", stock: 500, minLevel: 100, costPerUnit: 45, supplier: "Local Supplier", lastUpdated: "2025-07-01T15:00:00Z", sku: "PKG-CTN-3P" },
  { id: "11", name: "5-Ply Cartons", category: "packing", unit: "Pieces", stock: 280, minLevel: 50, costPerUnit: 65, supplier: "Local Supplier", lastUpdated: "2025-06-30T09:00:00Z", sku: "PKG-CTN-5P" },
  { id: "12", name: "Wooden Pallets (Standard)", category: "packing", unit: "Pieces", stock: 30, minLevel: 10, costPerUnit: 1350, supplier: "Pallet Co", lastUpdated: "2025-06-29T11:00:00Z", sku: "PKG-PLT-STD" },
  { id: "13", name: "Process Black Ink", category: "ink", unit: "Kg", stock: 25, minLevel: 10, costPerUnit: 1200, supplier: "DIC India", lastUpdated: "2025-07-08T14:00:00Z", sku: "INK-PRO-BK" },
  { id: "14", name: "Process Cyan Ink", category: "ink", unit: "Kg", stock: 18, minLevel: 8, costPerUnit: 1400, supplier: "DIC India", lastUpdated: "2025-07-07T10:00:00Z", sku: "INK-PRO-CY" },
];

const CATEGORIES = ["all", "paper", "plates", "finishing", "packing", "ink", "other"];
const CATEGORY_COLORS: Record<string, string> = {
  paper: "#3b82f6",
  plates: "#8b5cf6",
  finishing: "#22c55e",
  packing: "#f59e0b",
  ink: "#ef4444",
  other: "#64748b",
};

type InventoryFormData = {
  name: string; category: InventoryItem["category"]; unit: string; stock: number;
  minLevel: number; costPerUnit: number; supplier: string; sku: string;
};

const EMPTY_FORM: InventoryFormData = {
  name: "", category: "paper", unit: "Reams", stock: 0,
  minLevel: 0, costPerUnit: 0, supplier: "", sku: "",
};

export function Inventory() {
  const { theme, addNotification, addActivityLog } = useAppStore();
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>({ ...EMPTY_FORM });

  const filtered = useMemo(() => {
    let result = [...items];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") result = result.filter(i => i.category === categoryFilter);
    return result;
  }, [items, search, categoryFilter]);

  const lowStockItems = items.filter(i => i.stock <= i.minLevel);

  const categoryValues = useMemo(() => {
    const catMap: Record<string, number> = {};
    items.forEach(i => { catMap[i.category] = (catMap[i.category] || 0) + i.stock * i.costPerUnit; });
    return Object.entries(catMap).map(([category, value]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      value,
      fill: CATEGORY_COLORS[category] || "#64748b",
    }));
  }, [items]);

  const totalValue = items.reduce((s, i) => s + i.stock * i.costPerUnit, 0);

  const handleAdd = () => {
    if (!formData.name.trim()) return;
    const newItem: InventoryItem = {
      id: generateId(),
      ...formData,
      lastUpdated: new Date().toISOString(),
    };
    setItems(prev => [...prev, newItem]);
    addNotification({ type: "success", title: "Item Added", message: `${newItem.name} added to inventory.`, category: "system" });
    addActivityLog({ action: "INVENTORY_ITEM_ADDED", category: "inventory", description: `Added: ${newItem.name} (${newItem.stock} ${newItem.unit})`, user: "Current User", entityType: "inventory", entityId: newItem.id, level: "info" });
    setShowAddModal(false);
    setFormData({ ...EMPTY_FORM });
  };

  const handleEdit = () => {
    if (!editingId || !formData.name.trim()) return;
    setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...formData, lastUpdated: new Date().toISOString() } : i));
    addNotification({ type: "success", title: "Item Updated", message: `${formData.name} has been updated.`, category: "system" });
    addActivityLog({ action: "INVENTORY_ITEM_UPDATED", category: "inventory", description: `Updated: ${formData.name}`, user: "Current User", entityType: "inventory", entityId: editingId, level: "info" });
    setShowEditModal(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const item = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    addNotification({ type: "warning", title: "Item Deleted", message: `${item?.name} removed from inventory.`, category: "system" });
    addActivityLog({ action: "INVENTORY_ITEM_DELETED", category: "inventory", description: `Deleted: ${item?.name}`, user: "Current User", entityType: "inventory", entityId: id, level: "warning" });
    setShowDeleteConfirm(null);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormData({ name: item.name, category: item.category, unit: item.unit, stock: item.stock, minLevel: item.minLevel, costPerUnit: item.costPerUnit, supplier: item.supplier, sku: item.sku });
    setShowEditModal(true);
  };

  const handleExport = () => {
    const csv = [
      "SKU,Name,Category,Stock,Min Level,Unit,Cost/Unit,Value,Supplier,Last Updated",
      ...items.map(i => `"${i.sku}","${i.name}","${i.category}",${i.stock},${i.minLevel},"${i.unit}",${i.costPerUnit},${i.stock * i.costPerUnit},"${i.supplier}","${i.lastUpdated}"`)
    ].join("\n");
    downloadTextFile("inventory-export.csv", csv, "text/csv;charset=utf-8");
    addNotification({ type: "success", title: "Inventory Exported", message: `${items.length} items exported.`, category: "export" });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
            <Warehouse className="w-6 h-6" /> Inventory
          </h1>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {items.length} items • Total value: {formatCurrency(totalValue)}
            {lowStockItems.length > 0 && <span className="text-danger-500 ml-2">• {lowStockItems.length} low stock</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => { setFormData({ ...EMPTY_FORM }); setShowAddModal(true); }} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="card p-4 border-warning-500/30 bg-warning-50 dark:bg-warning-500/10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
            <span className="text-sm font-semibold text-warning-700 dark:text-warning-400">Low Stock Alert</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(i => (
              <span key={i.id} className="text-xs px-2.5 py-1 bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-300 rounded-full">
                {i.name}: {i.stock} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search inventory..." className="input-field pl-9" />
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategoryFilter(c)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize", categoryFilter === c ? "bg-white dark:bg-surface-dark-secondary shadow-sm text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Table */}
        <div className="lg:col-span-2 card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                <th className="py-3 px-4 text-left font-semibold">Item</th>
                <th className="py-3 px-4 text-center font-semibold">Stock</th>
                <th className="py-3 px-4 text-right font-semibold">Cost/Unit</th>
                <th className="py-3 px-4 text-right font-semibold">Value</th>
                <th className="py-3 px-4 text-left font-semibold">Supplier</th>
                <th className="py-3 px-4 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[item.category] }} />
                      <div>
                        <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{item.name}</p>
                        <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary font-mono">{item.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {item.stock <= item.minLevel && <AlertTriangle className="w-3.5 h-3.5 text-danger-500" />}
                      <span className={cn("font-semibold", item.stock <= item.minLevel ? "text-danger-600 dark:text-danger-400" : "text-text-light-primary dark:text-text-dark-primary")}>
                        {formatNumber(item.stock)}
                      </span>
                      <span className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{item.unit}</span>
                    </div>
                    <p className="text-[9px] text-text-light-tertiary dark:text-text-dark-tertiary">Min: {item.minLevel}</p>
                  </td>
                  <td className="py-3 px-4 text-right">{formatCurrency(item.costPerUnit)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(item.stock * item.costPerUnit)}</td>
                  <td className="py-3 px-4 text-text-light-secondary dark:text-text-dark-secondary text-xs">{item.supplier}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary" title="Edit">
                        <Edit3 className="w-3.5 h-3.5 text-text-light-tertiary" />
                      </button>
                      <button onClick={() => setShowDeleteConfirm(item.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-danger-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t border-surface-light-border dark:border-surface-dark-border text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            Showing {filtered.length} of {items.length} items
          </div>
        </div>

        {/* Value Chart */}
        <div className="card p-5 min-w-0">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            <BarChart3 className="w-4 h-4 inline mr-1.5" />
            Value by Category
          </h3>
          <div className="h-52 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <BarChart data={categoryValues} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                <XAxis type="number" tick={{ fontSize: 10, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: theme === "dark" ? "#94a3b8" : "#64748b" }} width={70} />
                <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#1e293b" : "#fff", borderRadius: "8px", fontSize: "12px", border: `1px solid ${theme === "dark" ? "#475569" : "#e2e8f0"}` }} formatter={(v: number | undefined) => [formatCurrency(v ?? 0), "Value"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} fill="#3b82f6">
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary uppercase">Summary</h4>
            {categoryValues.map(cv => (
              <div key={cv.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cv.fill }} />
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">{cv.category}</span>
                </div>
                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{formatCurrency(cv.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <InventoryFormModal title="Add Inventory Item" formData={formData} setFormData={setFormData} onSave={handleAdd} onClose={() => setShowAddModal(false)} saveLabel="Add Item" />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <InventoryFormModal title="Edit Inventory Item" formData={formData} setFormData={setFormData} onSave={handleEdit} onClose={() => { setShowEditModal(false); setEditingId(null); }} saveLabel="Save Changes" />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative card p-6 w-full max-w-sm animate-scale-in text-center">
            <Trash2 className="w-12 h-12 text-danger-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Delete Item?</h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
              "{items.find(i => i.id === showDeleteConfirm)?.name}" will be permanently removed.
            </p>
            <div className="flex justify-center gap-3 mt-5">
              <button onClick={() => setShowDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="btn-danger flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryFormModal({ title, formData, setFormData, onSave, onClose, saveLabel }: {
  title: string; formData: InventoryFormData; setFormData: (d: InventoryFormData) => void;
  onSave: () => void; onClose: () => void; saveLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-lg animate-scale-in">
        <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4">{title}</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Item Name <span className="text-danger-500">*</span></label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" /></div>
            <div><label className="label">SKU</label><input type="text" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} className="input-field" placeholder="e.g. PAP-MA-080" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as InventoryItem["category"] })} className="input-field">
                <option value="paper">Paper</option>
                <option value="plates">Plates</option>
                <option value="finishing">Finishing</option>
                <option value="packing">Packing</option>
                <option value="ink">Ink</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label className="label">Unit</label><input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="input-field" placeholder="Reams, Pieces, Kg..." /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label">Current Stock</label><input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} className="input-field" /></div>
            <div><label className="label">Min Level</label><input type="number" value={formData.minLevel} onChange={e => setFormData({ ...formData, minLevel: parseInt(e.target.value) || 0 })} className="input-field" /></div>
            <div><label className="label">Cost/Unit (₹)</label><input type="number" value={formData.costPerUnit} onChange={e => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })} className="input-field" /></div>
          </div>
          <div><label className="label">Supplier</label><input type="text" value={formData.supplier} onChange={e => setFormData({ ...formData, supplier: e.target.value })} className="input-field" /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onSave} disabled={!formData.name.trim()} className="btn-primary disabled:opacity-40">{saveLabel}</button>
        </div>
      </div>
    </div>
  );
}
