import { useState, useMemo } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber, generateId } from "@/utils/format";
import type { NMIRecord, InventoryCategory, NMICategory, NMIAction } from "@/types";
import { AlertTriangle, Plus, Edit3, Trash2, CheckCircle, X, Clock, Ban, ArrowRightLeft } from "lucide-react";

const NMI_CATEGORY_COLORS: Record<NMICategory, string> = {
    slow_moving: "bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400",
    non_moving: "bg-danger-100 dark:bg-danger-500/20 text-danger-700 dark:text-danger-400",
    dead_stock: "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
    obsolete: "bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

const NMI_STATUS_COLORS: Record<string, string> = {
    pending: "bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400",
    approved: "bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400",
    completed: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
    rejected: "bg-danger-100 dark:bg-danger-500/20 text-danger-700 dark:text-danger-400",
};

const AGING_BANDS = [
    { label: "30-60 days", min: 30, max: 60, color: "#f59e0b" },
    { label: "60-90 days", min: 60, max: 90, color: "#f97316" },
    { label: "90-180 days", min: 90, max: 180, color: "#ef4444" },
    { label: "180-365 days", min: 180, max: 365, color: "#dc2626" },
    { label: "365+ days", min: 365, max: 99999, color: "#991b1b" },
];

export function NMITab() {
    const { nmiRecords, items, addNMI, updateNMI, deleteNMI } = useInventoryStore();
    const { addNotification } = useAppStore();
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<NMIRecord>>({});
    const [catFilter, setCatFilter] = useState<string>("all");

    // Auto-detect NMI items from inventory
    const autoNMI = useMemo(() => {
        return items.filter(i => i.nmiFlag || i.movementClass === "non_moving" || i.movementClass === "slow_moving");
    }, [items]);

    const filtered = catFilter === "all" ? nmiRecords : nmiRecords.filter(r => r.nmiCategory === catFilter);

    // Aging analysis
    const agingData = AGING_BANDS.map(band => ({
        ...band,
        count: nmiRecords.filter(r => r.daysWithoutMovement >= band.min && r.daysWithoutMovement < band.max).length,
        value: nmiRecords.filter(r => r.daysWithoutMovement >= band.min && r.daysWithoutMovement < band.max).reduce((s, r) => s + r.currentValue, 0),
    }));

    const totalNMIValue = nmiRecords.reduce((s, r) => s + r.currentValue, 0);
    const totalDepreciatedValue = nmiRecords.reduce((s, r) => s + r.depreciatedValue, 0);

    const openAdd = () => {
        setForm({
            inventoryItemId: "", itemName: "", sku: "", category: "other" as InventoryCategory,
            daysWithoutMovement: 30, lastMovementDate: "", currentStock: 0, unit: "Pcs",
            currentValue: 0, depreciatedValue: 0, nmiCategory: "slow_moving" as NMICategory,
            action: "hold" as NMIAction, actionDate: "", actionNotes: "", approvedBy: "",
            location: "", status: "pending",
        });
        setEditId(null); setShowModal(true);
    };

    const openEdit = (r: NMIRecord) => { setForm({ ...r }); setEditId(r.id); setShowModal(true); };

    const handleSave = () => {
        if (!form.itemName?.trim()) return;
        if (editId) {
            updateNMI(editId, form);
            addNotification({ type: "success", title: "NMI Updated", message: `${form.itemName} updated.`, category: "system" });
        } else {
            addNMI(form as Omit<NMIRecord, "id" | "createdAt" | "updatedAt">);
            addNotification({ type: "success", title: "NMI Record Added", message: `${form.itemName} added to NMI.`, category: "system" });
        }
        setShowModal(false); setEditId(null);
    };

    const handleAction = (id: string, action: NMIAction) => {
        updateNMI(id, { action, actionDate: new Date().toISOString(), status: "approved" });
        addNotification({ type: "info", title: "NMI Action Applied", message: `Action "${action}" applied.`, category: "system" });
    };

    const autoAddToNMI = (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        const daysSinceMove = item.lastMovedDate ? Math.floor((Date.now() - new Date(item.lastMovedDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        addNMI({
            inventoryItemId: item.id, itemName: item.name, sku: item.sku, category: item.category,
            daysWithoutMovement: daysSinceMove, lastMovementDate: item.lastMovedDate,
            currentStock: item.stock, unit: item.unit,
            currentValue: item.stock * item.costPerUnit, depreciatedValue: item.stock * item.costPerUnit * 0.7,
            nmiCategory: daysSinceMove > 365 ? "dead_stock" : daysSinceMove > 180 ? "non_moving" : "slow_moving",
            action: "hold", actionDate: "", actionNotes: "", approvedBy: "", location: `${item.warehouse} / ${item.zone}`,
            status: "pending",
        });
        addNotification({ type: "info", title: "Added to NMI", message: `${item.name} added to NMI tracking.`, category: "system" });
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
                <div className="card p-3 text-center"><p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">NMI Records</p><p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">{nmiRecords.length}</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">Total NMI Value</p><p className="text-lg font-bold text-danger-600 dark:text-danger-400 mt-1">{formatCurrency(totalNMIValue)}</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">Depreciated Value</p><p className="text-lg font-bold text-warning-600 dark:text-warning-400 mt-1">{formatCurrency(totalDepreciatedValue)}</p></div>
                <div className="card p-3 text-center"><p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">Flagged Items</p><p className="text-lg font-bold text-warning-600 dark:text-warning-400 mt-1">{autoNMI.length}</p></div>
            </div>

            {/* Aging Analysis */}
            <div className="card p-4">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">Aging Analysis</h3>
                <div className="flex gap-2">
                    {agingData.map(b => (
                        <div key={b.label} className="flex-1 rounded-lg p-2 text-center" style={{ backgroundColor: `${b.color}15` }}>
                            <p className="text-[10px] font-medium" style={{ color: b.color }}>{b.label}</p>
                            <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">{b.count}</p>
                            <p className="text-[9px] text-text-light-tertiary">{formatCurrency(b.value)}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Auto-detected NMI Items */}
            {autoNMI.length > 0 && (
                <div className="card p-4">
                    <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning-500" /> Auto-Detected Slow/Non-Moving Items</h3>
                    <div className="space-y-1.5">{autoNMI.slice(0, 5).map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg px-3 py-2">
                            <div><span className="font-medium">{item.name}</span> <span className="text-text-light-tertiary">({item.sku})</span></div>
                            <div className="flex items-center gap-2">
                                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium capitalize", item.movementClass === "non_moving" ? "bg-danger-100 text-danger-700" : "bg-warning-100 text-warning-700")}>{item.movementClass.replace("_", " ")}</span>
                                <button onClick={() => autoAddToNMI(item.id)} className="btn-secondary text-[10px] py-0.5 px-2">Add to NMI</button>
                            </div>
                        </div>
                    ))}</div>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
                    {["all", "slow_moving", "non_moving", "dead_stock", "obsolete"].map(c => (
                        <button key={c} onClick={() => setCatFilter(c)} className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all capitalize", catFilter === c ? "bg-white dark:bg-surface-dark-secondary shadow-sm" : "text-text-light-secondary dark:text-text-dark-secondary")}>{c.replace("_", " ")}</button>
                    ))}
                </div>
                <button onClick={openAdd} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add NMI Record</button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                        <th className="py-2.5 px-3 text-left text-xs font-semibold">Item</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Days</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Category</th>
                        <th className="py-2.5 px-3 text-right text-xs font-semibold">Value</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Status</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Actions</th>
                    </tr></thead>
                    <tbody>
                        {filtered.map(r => (
                            <tr key={r.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
                                <td className="py-2.5 px-3"><p className="font-medium text-xs">{r.itemName}</p><p className="text-[10px] text-text-light-tertiary font-mono">{r.sku} • {r.location}</p></td>
                                <td className="py-2.5 px-3 text-center"><span className="font-bold text-xs">{r.daysWithoutMovement}</span><span className="text-[10px] text-text-light-tertiary ml-1">days</span></td>
                                <td className="py-2.5 px-3 text-center"><span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", NMI_CATEGORY_COLORS[r.nmiCategory])}>{r.nmiCategory.replace("_", " ")}</span></td>
                                <td className="py-2.5 px-3 text-right text-xs"><div>{formatCurrency(r.currentValue)}</div><div className="text-[10px] text-text-light-tertiary line-through">{formatCurrency(r.depreciatedValue)}</div></td>
                                <td className="py-2.5 px-3 text-center"><span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", NMI_STATUS_COLORS[r.status])}>{r.status}</span></td>
                                <td className="py-2.5 px-3">
                                    <div className="flex items-center justify-center gap-0.5">
                                        <button onClick={() => handleAction(r.id, "write_off")} className="p-1 rounded hover:bg-surface-light-tertiary" title="Write Off"><Ban className="w-3.5 h-3.5 text-danger-400" /></button>
                                        <button onClick={() => handleAction(r.id, "transfer")} className="p-1 rounded hover:bg-surface-light-tertiary" title="Transfer"><ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" /></button>
                                        <button onClick={() => handleAction(r.id, "dispose")} className="p-1 rounded hover:bg-surface-light-tertiary" title="Dispose"><Trash2 className="w-3.5 h-3.5 text-warning-400" /></button>
                                        <button onClick={() => openEdit(r)} className="p-1 rounded hover:bg-surface-light-tertiary" title="Edit"><Edit3 className="w-3.5 h-3.5 text-text-light-tertiary" /></button>
                                        <button onClick={() => deleteNMI(r.id)} className="p-1 rounded hover:bg-danger-50" title="Delete"><Trash2 className="w-3.5 h-3.5 text-danger-400" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-text-light-tertiary">No NMI records. Add items that haven't moved for tracking.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
                    <div className="relative card p-6 w-full max-w-lg animate-scale-in">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">{editId ? "Edit NMI Record" : "Add NMI Record"}</h2>
                            <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="label">Item Name *</label><input type="text" value={form.itemName || ""} onChange={e => setForm({ ...form, itemName: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">SKU</label><input type="text" value={form.sku || ""} onChange={e => setForm({ ...form, sku: e.target.value })} className="input-field text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="label">Days W/O Movement</label><input type="number" value={form.daysWithoutMovement || 0} onChange={e => setForm({ ...form, daysWithoutMovement: +e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Stock</label><input type="number" value={form.currentStock || 0} onChange={e => setForm({ ...form, currentStock: +e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Unit</label><input type="text" value={form.unit || ""} onChange={e => setForm({ ...form, unit: e.target.value })} className="input-field text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="label">Current Value (₹)</label><input type="number" value={form.currentValue || 0} onChange={e => setForm({ ...form, currentValue: +e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Depreciated Value (₹)</label><input type="number" value={form.depreciatedValue || 0} onChange={e => setForm({ ...form, depreciatedValue: +e.target.value })} className="input-field text-sm" /></div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="label">NMI Category</label><select value={form.nmiCategory || "slow_moving"} onChange={e => setForm({ ...form, nmiCategory: e.target.value as NMICategory })} className="input-field text-sm"><option value="slow_moving">Slow Moving</option><option value="non_moving">Non Moving</option><option value="dead_stock">Dead Stock</option><option value="obsolete">Obsolete</option></select></div>
                                <div><label className="label">Action</label><select value={form.action || "hold"} onChange={e => setForm({ ...form, action: e.target.value as NMIAction })} className="input-field text-sm"><option value="hold">Hold</option><option value="write_off">Write Off</option><option value="liquidate">Liquidate</option><option value="transfer">Transfer</option><option value="dispose">Dispose</option><option value="revalue">Revalue</option></select></div>
                                <div><label className="label">Location</label><input type="text" value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field text-sm" /></div>
                            </div>
                            <div><label className="label">Action Notes</label><textarea rows={2} value={form.actionNotes || ""} onChange={e => setForm({ ...form, actionNotes: e.target.value })} className="input-field text-sm" /></div>
                        </div>
                        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={!form.itemName?.trim()} className="btn-primary disabled:opacity-40 text-sm">{editId ? "Save Changes" : "Add Record"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
