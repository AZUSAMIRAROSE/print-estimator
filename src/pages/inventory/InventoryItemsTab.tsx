import { useState, useMemo } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber, generateId } from "@/utils/format";
import type { InventoryItem, InventoryCategory } from "@/types";
import {
    Search, Plus, Edit3, Trash2, Copy, Save, AlertTriangle,
    ChevronDown, ChevronUp, MapPin, Package, X, Filter
} from "lucide-react";

const CATEGORIES: InventoryCategory[] = ["paper", "plates", "finishing", "packing", "ink", "chemicals", "consumables", "spare_parts", "other"];
const CAT_COLORS: Record<string, string> = {
    paper: "#3b82f6", plates: "#8b5cf6", finishing: "#22c55e", packing: "#f59e0b",
    ink: "#ef4444", chemicals: "#06b6d4", consumables: "#ec4899", spare_parts: "#f97316", other: "#64748b",
};

function emptyItem(): Partial<InventoryItem> {
    return {
        name: "", sku: "", barcode: "", category: "paper" as InventoryCategory, subcategory: "", description: "", tags: [],
        stock: 0, minLevel: 0, maxLevel: 9999, reorderQty: 0, unit: "Reams", batchNumber: "", lotNumber: "",
        costPerUnit: 0, sellingPrice: 0, lastPurchasePrice: 0, avgCost: 0, taxRate: 18, hsnCode: "",
        warehouse: "Main Warehouse", zone: "A", rack: "", shelf: "", bin: "",
        supplier: "", supplierCode: "", leadTimeDays: 7, alternateSuppliers: [],
        expiryDate: "", manufacturedDate: "", lastAuditDate: "",
        weight: 0, weightUnit: "kg", length: 0, width: 0, height: 0, dimensionUnit: "mm", volumeCBM: 0,
        status: "active", condition: "new", nmiFlag: false, movementClass: "fast_moving",
        qualityGrade: "A", certifications: [], shelfLifeDays: 0, storageConditions: "", handlingInstructions: "", notes: "",
    };
}

export function InventoryItemsTab() {
    const { items, addItem, updateItem, deleteItem, duplicateItem } = useInventoryStore();
    const { addNotification, addActivityLog } = useAppStore();
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<InventoryItem>>(emptyItem());
    const [page, setPage] = useState(1);
    const perPage = 10;

    const filtered = useMemo(() => {
        let r = [...items];
        if (search) { const q = search.toLowerCase(); r = r.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q)); }
        if (catFilter !== "all") r = r.filter(i => i.category === catFilter);
        if (statusFilter !== "all") r = r.filter(i => i.status === statusFilter);
        return r;
    }, [items, search, catFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const openAdd = () => { setForm(emptyItem()); setEditId(null); setShowModal(true); };
    const openEdit = (item: InventoryItem) => { setForm({ ...item }); setEditId(item.id); setShowModal(true); };

    const handleSave = () => {
        if (!form.name?.trim()) return;
        if (editId) {
            updateItem(editId, form);
            addNotification({ type: "success", title: "Item Updated", message: `${form.name} updated.`, category: "system" });
            addActivityLog({ action: "INVENTORY_UPDATED", category: "inventory", description: `Updated: ${form.name}`, user: "Current User", entityType: "inventory", entityId: editId, level: "info" });
        } else {
            addItem(form as Omit<InventoryItem, "id" | "lastUpdated">);
            addNotification({ type: "success", title: "Item Added", message: `${form.name} added to inventory.`, category: "system" });
            addActivityLog({ action: "INVENTORY_ADDED", category: "inventory", description: `Added: ${form.name}`, user: "Current User", entityType: "inventory", entityId: "", level: "info" });
        }
        setShowModal(false); setEditId(null);
    };

    const handleSaveDraft = () => {
        if (!form.name?.trim()) return;
        if (editId) { updateItem(editId, { ...form, status: "draft" }); }
        else { addItem({ ...form, status: "draft" } as Omit<InventoryItem, "id" | "lastUpdated">); }
        addNotification({ type: "info", title: "Draft Saved", message: `${form.name} saved as draft.`, category: "system" });
        setShowModal(false); setEditId(null);
    };

    const handleDelete = (id: string) => {
        const item = items.find(i => i.id === id);
        deleteItem(id);
        addNotification({ type: "warning", title: "Item Deleted", message: `${item?.name} removed.`, category: "system" });
        addActivityLog({ action: "INVENTORY_DELETED", category: "inventory", description: `Deleted: ${item?.name}`, user: "Current User", entityType: "inventory", entityId: id, level: "warning" });
        setDeleteConfirm(null);
    };

    const handleDuplicate = (id: string) => {
        duplicateItem(id);
        const item = items.find(i => i.id === id);
        addNotification({ type: "info", title: "Item Duplicated", message: `${item?.name} duplicated.`, category: "system" });
    };

    const lowStock = items.filter(i => i.stock <= i.minLevel && i.status === "active");

    return (
        <div className="space-y-4">
            {/* Low Stock Alert */}
            {lowStock.length > 0 && (
                <div className="card p-3 border-warning-500/30 bg-warning-50 dark:bg-warning-500/10">
                    <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400" /><span className="text-sm font-semibold text-warning-700 dark:text-warning-400">Low Stock Alert — {lowStock.length} items</span></div>
                    <div className="flex flex-wrap gap-1.5">{lowStock.map(i => (<span key={i.id} className="text-[10px] px-2 py-0.5 bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-300 rounded-full">{i.name}: {i.stock} {i.unit}</span>))}</div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..." className="input-field pl-9 text-sm" />
                </div>
                <div className="flex items-center gap-1.5 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg overflow-x-auto">
                    {["all", ...CATEGORIES].map(c => (
                        <button key={c} onClick={() => { setCatFilter(c); setPage(1); }} className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all capitalize whitespace-nowrap", catFilter === c ? "bg-white dark:bg-surface-dark-secondary shadow-sm text-text-light-primary dark:text-text-dark-primary" : "text-text-light-secondary dark:text-text-dark-secondary")}>{c.replace("_", " ")}</button>
                    ))}
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input-field text-xs w-28">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                </select>
                <button onClick={openAdd} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Item</button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                                <th className="py-2.5 px-3 text-left font-semibold text-xs">Item</th>
                                <th className="py-2.5 px-3 text-center font-semibold text-xs">Stock</th>
                                <th className="py-2.5 px-3 text-right font-semibold text-xs">Cost/Unit</th>
                                <th className="py-2.5 px-3 text-right font-semibold text-xs">Value</th>
                                <th className="py-2.5 px-3 text-left font-semibold text-xs">Location</th>
                                <th className="py-2.5 px-3 text-left font-semibold text-xs">Supplier</th>
                                <th className="py-2.5 px-3 text-center font-semibold text-xs">Status</th>
                                <th className="py-2.5 px-3 text-center font-semibold text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.map(item => (
                                <tr key={item.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors">
                                    <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: CAT_COLORS[item.category] }} />
                                            <div>
                                                <p className="font-medium text-text-light-primary dark:text-text-dark-primary text-xs">{item.name}</p>
                                                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary font-mono">{item.sku}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {item.stock <= item.minLevel && <AlertTriangle className="w-3 h-3 text-danger-500" />}
                                            <span className={cn("font-semibold text-xs", item.stock <= item.minLevel ? "text-danger-600 dark:text-danger-400" : "")}>{formatNumber(item.stock)}</span>
                                            <span className="text-[9px] text-text-light-tertiary">{item.unit}</span>
                                        </div>
                                        <p className="text-[9px] text-text-light-tertiary">Min: {item.minLevel} | Max: {item.maxLevel}</p>
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-xs">{formatCurrency(item.costPerUnit)}</td>
                                    <td className="py-2.5 px-3 text-right font-semibold text-xs text-primary-600 dark:text-primary-400">{formatCurrency(item.stock * item.costPerUnit)}</td>
                                    <td className="py-2.5 px-3">
                                        <div className="flex items-center gap-1 text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
                                            <MapPin className="w-3 h-3" />
                                            <span>{item.warehouse} / {item.zone}{item.rack ? `-${item.rack}` : ""}</span>
                                        </div>
                                    </td>
                                    <td className="py-2.5 px-3 text-xs text-text-light-secondary dark:text-text-dark-secondary">{item.supplier}</td>
                                    <td className="py-2.5 px-3 text-center">
                                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize",
                                            item.status === "active" ? "bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400"
                                                : item.status === "draft" ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                                                    : "bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400"
                                        )}>{item.status}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                        <div className="flex items-center justify-center gap-0.5">
                                            <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary" title="Edit"><Edit3 className="w-3.5 h-3.5 text-text-light-tertiary" /></button>
                                            <button onClick={() => handleDuplicate(item.id)} className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary" title="Duplicate"><Copy className="w-3.5 h-3.5 text-text-light-tertiary" /></button>
                                            <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10" title="Delete"><Trash2 className="w-3.5 h-3.5 text-danger-400" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between p-3 border-t border-surface-light-border dark:border-surface-dark-border text-xs text-text-light-tertiary">
                    <span>Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}</span>
                    <div className="flex items-center gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded bg-surface-light-tertiary dark:bg-surface-dark-tertiary disabled:opacity-40">Prev</button>
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                            <button key={p} onClick={() => setPage(p)} className={cn("px-2 py-1 rounded", page === p ? "bg-primary-600 text-white" : "bg-surface-light-tertiary dark:bg-surface-dark-tertiary")}>{p}</button>
                        ))}
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-surface-light-tertiary dark:bg-surface-dark-tertiary disabled:opacity-40">Next</button>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && <ItemFormModal form={form} setForm={setForm} onSave={handleSave} onSaveDraft={handleSaveDraft} onClose={() => { setShowModal(false); setEditId(null); }} isEdit={!!editId} />}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative card p-6 w-full max-w-sm animate-scale-in text-center">
                        <Trash2 className="w-12 h-12 text-danger-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Delete Item?</h3>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">"{items.find(i => i.id === deleteConfirm)?.name}" will be permanently removed.</p>
                        <div className="flex justify-center gap-3 mt-5">
                            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
                            <button onClick={() => handleDelete(deleteConfirm)} className="btn-danger flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Accordion Section ────────────────────────────────────────────────────────
function Section({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div className="border border-surface-light-border dark:border-surface-dark-border rounded-lg overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                {title} {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {open && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );
}

// ── Full Item Form Modal ─────────────────────────────────────────────────────
function ItemFormModal({ form, setForm, onSave, onSaveDraft, onClose, isEdit }: {
    form: Partial<InventoryItem>; setForm: (d: Partial<InventoryItem>) => void;
    onSave: () => void; onSaveDraft: () => void; onClose: () => void; isEdit: boolean;
}) {
    const u = (field: string, val: unknown) => setForm({ ...form, [field]: val });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-3xl max-h-[85vh] animate-scale-in flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-surface-light-border dark:border-surface-dark-border">
                    <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">{isEdit ? "Edit Inventory Item" : "Add Inventory Item"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    <Section title="📦 Basic Information" defaultOpen>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">Item Name <span className="text-danger-500">*</span></label><input type="text" value={form.name || ""} onChange={e => u("name", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">SKU</label><input type="text" value={form.sku || ""} onChange={e => u("sku", e.target.value)} className="input-field text-sm" placeholder="e.g. PAP-MA-080" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Barcode</label><input type="text" value={form.barcode || ""} onChange={e => u("barcode", e.target.value)} className="input-field text-sm" /></div>
                            <div>
                                <label className="label">Category</label>
                                <select value={form.category || "paper"} onChange={e => u("category", e.target.value)} className="input-field text-sm">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                                </select>
                            </div>
                            <div><label className="label">Subcategory</label><input type="text" value={form.subcategory || ""} onChange={e => u("subcategory", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div><label className="label">Description</label><textarea rows={2} value={form.description || ""} onChange={e => u("description", e.target.value)} className="input-field text-sm" /></div>
                    </Section>

                    <Section title="📊 Stock & Pricing" defaultOpen>
                        <div className="grid grid-cols-4 gap-3">
                            <div><label className="label">Current Stock</label><input type="number" value={form.stock || 0} onChange={e => u("stock", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Min Level</label><input type="number" value={form.minLevel || 0} onChange={e => u("minLevel", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Max Level</label><input type="number" value={form.maxLevel || 0} onChange={e => u("maxLevel", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Reorder Qty</label><input type="number" value={form.reorderQty || 0} onChange={e => u("reorderQty", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Unit</label><input type="text" value={form.unit || ""} onChange={e => u("unit", e.target.value)} className="input-field text-sm" placeholder="Reams, Kg, Pieces..." /></div>
                            <div><label className="label">Batch Number</label><input type="text" value={form.batchNumber || ""} onChange={e => u("batchNumber", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Lot Number</label><input type="text" value={form.lotNumber || ""} onChange={e => u("lotNumber", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Cost/Unit (₹)</label><input type="number" value={form.costPerUnit || 0} onChange={e => u("costPerUnit", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Selling Price (₹)</label><input type="number" value={form.sellingPrice || 0} onChange={e => u("sellingPrice", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Last Purchase Price (₹)</label><input type="number" value={form.lastPurchasePrice || 0} onChange={e => u("lastPurchasePrice", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Avg Cost (₹)</label><input type="number" value={form.avgCost || 0} onChange={e => u("avgCost", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Tax Rate (%)</label><input type="number" value={form.taxRate || 0} onChange={e => u("taxRate", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">HSN Code</label><input type="text" value={form.hsnCode || ""} onChange={e => u("hsnCode", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                    </Section>

                    <Section title="📍 Location">
                        <div className="grid grid-cols-5 gap-3">
                            <div><label className="label">Warehouse</label><input type="text" value={form.warehouse || ""} onChange={e => u("warehouse", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Zone</label><input type="text" value={form.zone || ""} onChange={e => u("zone", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Rack</label><input type="text" value={form.rack || ""} onChange={e => u("rack", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Shelf</label><input type="text" value={form.shelf || ""} onChange={e => u("shelf", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Bin</label><input type="text" value={form.bin || ""} onChange={e => u("bin", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                    </Section>

                    <Section title="🚚 Supplier Details">
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Supplier</label><input type="text" value={form.supplier || ""} onChange={e => u("supplier", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Supplier Code</label><input type="text" value={form.supplierCode || ""} onChange={e => u("supplierCode", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Lead Time (days)</label><input type="number" value={form.leadTimeDays || 0} onChange={e => u("leadTimeDays", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                    </Section>

                    <Section title="📅 Dates">
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Expiry Date</label><input type="date" value={form.expiryDate || ""} onChange={e => u("expiryDate", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Manufactured Date</label><input type="date" value={form.manufacturedDate || ""} onChange={e => u("manufacturedDate", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Last Audit Date</label><input type="date" value={form.lastAuditDate || ""} onChange={e => u("lastAuditDate", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                    </Section>

                    <Section title="📏 Physical Dimensions">
                        <div className="grid grid-cols-4 gap-3">
                            <div><label className="label">Weight</label><input type="number" value={form.weight || 0} onChange={e => u("weight", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Weight Unit</label><select value={form.weightUnit || "kg"} onChange={e => u("weightUnit", e.target.value)} className="input-field text-sm"><option value="kg">Kg</option><option value="g">Grams</option><option value="lb">Pounds</option></select></div>
                            <div><label className="label">Volume (CBM)</label><input type="number" value={form.volumeCBM || 0} onChange={e => u("volumeCBM", +e.target.value)} className="input-field text-sm" step="0.01" /></div>
                            <div><label className="label">Dim Unit</label><select value={form.dimensionUnit || "mm"} onChange={e => u("dimensionUnit", e.target.value)} className="input-field text-sm"><option value="mm">mm</option><option value="cm">cm</option><option value="in">inches</option></select></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Length</label><input type="number" value={form.length || 0} onChange={e => u("length", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Width</label><input type="number" value={form.width || 0} onChange={e => u("width", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Height</label><input type="number" value={form.height || 0} onChange={e => u("height", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                    </Section>

                    <Section title="✅ Quality & Status">
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Status</label><select value={form.status || "active"} onChange={e => u("status", e.target.value)} className="input-field text-sm"><option value="active">Active</option><option value="inactive">Inactive</option><option value="discontinued">Discontinued</option><option value="draft">Draft</option></select></div>
                            <div><label className="label">Condition</label><select value={form.condition || "new"} onChange={e => u("condition", e.target.value)} className="input-field text-sm"><option value="new">New</option><option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option></select></div>
                            <div><label className="label">Movement Class</label><select value={form.movementClass || "fast_moving"} onChange={e => u("movementClass", e.target.value)} className="input-field text-sm"><option value="fast_moving">Fast Moving</option><option value="slow_moving">Slow Moving</option><option value="non_moving">Non Moving</option></select></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Quality Grade</label><input type="text" value={form.qualityGrade || ""} onChange={e => u("qualityGrade", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Shelf Life (days)</label><input type="number" value={form.shelfLifeDays || 0} onChange={e => u("shelfLifeDays", +e.target.value)} className="input-field text-sm" /></div>
                            <div className="flex items-end gap-2 pb-0.5"><label className="label flex items-center gap-2"><input type="checkbox" checked={form.nmiFlag || false} onChange={e => u("nmiFlag", e.target.checked)} className="rounded" /> NMI Flag</label></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">Storage Conditions</label><input type="text" value={form.storageConditions || ""} onChange={e => u("storageConditions", e.target.value)} className="input-field text-sm" placeholder="e.g. Cool, dry place" /></div>
                            <div><label className="label">Handling Instructions</label><input type="text" value={form.handlingInstructions || ""} onChange={e => u("handlingInstructions", e.target.value)} className="input-field text-sm" placeholder="e.g. Fragile — handle with care" /></div>
                        </div>
                    </Section>

                    <Section title="📝 Notes">
                        <div><textarea rows={3} value={form.notes || ""} onChange={e => u("notes", e.target.value)} className="input-field text-sm" placeholder="Additional notes about this item..." /></div>
                    </Section>
                </div>
                <div className="flex justify-between gap-3 p-5 border-t border-surface-light-border dark:border-surface-dark-border">
                    <button onClick={onSaveDraft} className="btn-secondary flex items-center gap-1.5 text-sm"><Save className="w-4 h-4" /> Save as Draft</button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={onSave} disabled={!form.name?.trim()} className="btn-primary disabled:opacity-40 text-sm">{isEdit ? "Save Changes" : "Add Item"}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
