import { useState, useMemo } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";
import type { InventoryTransfer, TransferStatus } from "@/types";
import { Plus, Edit3, Trash2, CheckCircle, X, Truck, ArrowRight, MapPin } from "lucide-react";

const STATUS_COLORS: Record<TransferStatus, string> = {
    pending: "bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400",
    approved: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
    in_transit: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400",
    received: "bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400",
    cancelled: "bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

function emptyTransfer(): Partial<InventoryTransfer> {
    return {
        inventoryItemId: "", itemName: "", sku: "", quantity: 0, unit: "Pcs",
        fromWarehouse: "", fromZone: "", toWarehouse: "", toZone: "",
        transferDate: new Date().toISOString().split("T")[0], expectedArrivalDate: "", actualArrivalDate: "",
        status: "pending", transportMode: "manual", vehicleNumber: "", driverName: "", trackingNumber: "",
        transportCharges: 0, handlingCharges: 0, insuranceCharges: 0, packagingCharges: 0, otherCharges: 0,
        totalTransferCost: 0, requestedBy: "", approvedBy: "", receivedBy: "",
        notes: "", reason: "", priorityLevel: "medium",
    };
}

export function TransfersTab() {
    const { transfers, items, addTransfer, updateTransfer, deleteTransfer, completeTransfer } = useInventoryStore();
    const { addNotification } = useAppStore();
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<InventoryTransfer>>(emptyTransfer());
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const filtered = statusFilter === "all" ? transfers : transfers.filter(t => t.status === statusFilter);
    const totalCosts = transfers.reduce((s, t) => s + t.totalTransferCost, 0);

    const openAdd = () => { setForm(emptyTransfer()); setEditId(null); setShowModal(true); };
    const openEdit = (t: InventoryTransfer) => { setForm({ ...t }); setEditId(t.id); setShowModal(true); };

    const calcTotal = (f: Partial<InventoryTransfer>) =>
        (f.transportCharges || 0) + (f.handlingCharges || 0) + (f.insuranceCharges || 0) + (f.packagingCharges || 0) + (f.otherCharges || 0);

    const handleSave = () => {
        if (!form.itemName?.trim()) return;
        const data = { ...form, totalTransferCost: calcTotal(form) };
        if (editId) {
            updateTransfer(editId, data);
            addNotification({ type: "success", title: "Transfer Updated", message: `Transfer for ${form.itemName} updated.`, category: "system" });
        } else {
            addTransfer(data as Omit<InventoryTransfer, "id" | "createdAt" | "updatedAt">);
            addNotification({ type: "success", title: "Transfer Created", message: `Transfer for ${form.itemName} created.`, category: "system" });
        }
        setShowModal(false); setEditId(null);
    };

    const handleComplete = (id: string) => {
        completeTransfer(id, "Current User");
        addNotification({ type: "success", title: "Transfer Received", message: "Transfer marked as received.", category: "system" });
    };

    const selectItem = (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (item) setForm({ ...form, inventoryItemId: item.id, itemName: item.name, sku: item.sku, unit: item.unit, fromWarehouse: item.warehouse, fromZone: item.zone });
    };

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Total Transfers", value: transfers.length, color: "text-primary-600 dark:text-primary-400" },
                    { label: "Pending", value: transfers.filter(t => t.status === "pending").length, color: "text-warning-600 dark:text-warning-400" },
                    { label: "In Transit", value: transfers.filter(t => t.status === "in_transit").length, color: "text-purple-600 dark:text-purple-400" },
                    { label: "Total Transfer Cost", value: formatCurrency(totalCosts), color: "text-primary-600 dark:text-primary-400" },
                ].map(c => (
                    <div key={c.label} className="card p-3 text-center">
                        <p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">{c.label}</p>
                        <p className={cn("text-lg font-bold mt-1", c.color)}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 p-1 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg">
                    {["all", "pending", "approved", "in_transit", "received", "cancelled"].map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all capitalize", statusFilter === s ? "bg-white dark:bg-surface-dark-secondary shadow-sm" : "text-text-light-secondary dark:text-text-dark-secondary")}>{s.replace("_", " ")}</button>
                    ))}
                </div>
                <button onClick={openAdd} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> New Transfer</button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                <table className="w-full text-sm">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                        <th className="py-2.5 px-3 text-left text-xs font-semibold">Item</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Qty</th>
                        <th className="py-2.5 px-3 text-left text-xs font-semibold">Route</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Mode</th>
                        <th className="py-2.5 px-3 text-right text-xs font-semibold">Cost</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Status</th>
                        <th className="py-2.5 px-3 text-center text-xs font-semibold">Actions</th>
                    </tr></thead>
                    <tbody>
                        {filtered.map(t => (
                            <tr key={t.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary">
                                <td className="py-2.5 px-3"><p className="font-medium text-xs">{t.itemName}</p><p className="text-[10px] text-text-light-tertiary font-mono">{t.sku}</p></td>
                                <td className="py-2.5 px-3 text-center text-xs font-semibold">{t.quantity} {t.unit}</td>
                                <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1 text-[11px]">
                                        <MapPin className="w-3 h-3 text-text-light-tertiary" />
                                        <span>{t.fromWarehouse}/{t.fromZone}</span>
                                        <ArrowRight className="w-3 h-3 text-primary-500" />
                                        <span>{t.toWarehouse}/{t.toZone}</span>
                                    </div>
                                </td>
                                <td className="py-2.5 px-3 text-center"><span className="text-[10px] capitalize bg-surface-light-tertiary dark:bg-surface-dark-tertiary px-2 py-0.5 rounded-full">{t.transportMode}</span></td>
                                <td className="py-2.5 px-3 text-right text-xs font-medium">{formatCurrency(t.totalTransferCost)}</td>
                                <td className="py-2.5 px-3 text-center"><span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", STATUS_COLORS[t.status])}>{t.status.replace("_", " ")}</span></td>
                                <td className="py-2.5 px-3">
                                    <div className="flex items-center justify-center gap-0.5">
                                        {(t.status === "in_transit" || t.status === "approved") && <button onClick={() => handleComplete(t.id)} className="p-1 rounded hover:bg-success-50" title="Mark Received"><CheckCircle className="w-3.5 h-3.5 text-success-500" /></button>}
                                        <button onClick={() => openEdit(t)} className="p-1 rounded hover:bg-surface-light-tertiary"><Edit3 className="w-3.5 h-3.5 text-text-light-tertiary" /></button>
                                        <button onClick={() => deleteTransfer(t.id)} className="p-1 rounded hover:bg-danger-50"><Trash2 className="w-3.5 h-3.5 text-danger-400" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-text-light-tertiary">No transfers found. Create one to start tracking inventory movements.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
                    <div className="relative card w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">{editId ? "Edit Transfer" : "New Transfer"}</h2>
                            <button onClick={() => setShowModal(false)}><X className="w-5 h-5" /></button>
                        </div>
                        <div className="space-y-4">
                            {/* Item Selection */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label">Select Item</label>
                                    <select value={form.inventoryItemId || ""} onChange={e => selectItem(e.target.value)} className="input-field text-sm">
                                        <option value="">— Select —</option>
                                        {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                                    </select>
                                </div>
                                <div><label className="label">Quantity</label><input type="number" value={form.quantity || 0} onChange={e => setForm({ ...form, quantity: +e.target.value })} className="input-field text-sm" /></div>
                            </div>

                            {/* Locations */}
                            <div className="grid grid-cols-4 gap-3">
                                <div><label className="label">From Warehouse</label><input type="text" value={form.fromWarehouse || ""} onChange={e => setForm({ ...form, fromWarehouse: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">From Zone</label><input type="text" value={form.fromZone || ""} onChange={e => setForm({ ...form, fromZone: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">To Warehouse</label><input type="text" value={form.toWarehouse || ""} onChange={e => setForm({ ...form, toWarehouse: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">To Zone</label><input type="text" value={form.toZone || ""} onChange={e => setForm({ ...form, toZone: e.target.value })} className="input-field text-sm" /></div>
                            </div>

                            {/* Transport */}
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="label">Transport Mode</label><select value={form.transportMode || "manual"} onChange={e => setForm({ ...form, transportMode: e.target.value as InventoryTransfer["transportMode"] })} className="input-field text-sm"><option value="manual">Manual</option><option value="truck">Truck</option><option value="courier">Courier</option><option value="rail">Rail</option><option value="air">Air</option></select></div>
                                <div><label className="label">Vehicle Number</label><input type="text" value={form.vehicleNumber || ""} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Priority</label><select value={form.priorityLevel || "medium"} onChange={e => setForm({ ...form, priorityLevel: e.target.value as InventoryTransfer["priorityLevel"] })} className="input-field text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="label">Transfer Date</label><input type="date" value={form.transferDate || ""} onChange={e => setForm({ ...form, transferDate: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Expected Arrival</label><input type="date" value={form.expectedArrivalDate || ""} onChange={e => setForm({ ...form, expectedArrivalDate: e.target.value })} className="input-field text-sm" /></div>
                            </div>

                            {/* Charges */}
                            <div className="border border-surface-light-border dark:border-surface-dark-border rounded-lg p-3">
                                <h3 className="text-sm font-semibold mb-3 text-text-light-primary dark:text-text-dark-primary">💰 Transfer Charges</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div><label className="label">Transport (₹)</label><input type="number" value={form.transportCharges || 0} onChange={e => setForm({ ...form, transportCharges: +e.target.value })} className="input-field text-sm" /></div>
                                    <div><label className="label">Handling (₹)</label><input type="number" value={form.handlingCharges || 0} onChange={e => setForm({ ...form, handlingCharges: +e.target.value })} className="input-field text-sm" /></div>
                                    <div><label className="label">Insurance (₹)</label><input type="number" value={form.insuranceCharges || 0} onChange={e => setForm({ ...form, insuranceCharges: +e.target.value })} className="input-field text-sm" /></div>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mt-3">
                                    <div><label className="label">Packaging (₹)</label><input type="number" value={form.packagingCharges || 0} onChange={e => setForm({ ...form, packagingCharges: +e.target.value })} className="input-field text-sm" /></div>
                                    <div><label className="label">Other (₹)</label><input type="number" value={form.otherCharges || 0} onChange={e => setForm({ ...form, otherCharges: +e.target.value })} className="input-field text-sm" /></div>
                                    <div className="flex items-end pb-0.5"><p className="text-sm font-bold text-primary-600 dark:text-primary-400">Total: {formatCurrency(calcTotal(form))}</p></div>
                                </div>
                            </div>

                            {/* People */}
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="label">Requested By</label><input type="text" value={form.requestedBy || ""} onChange={e => setForm({ ...form, requestedBy: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Driver Name</label><input type="text" value={form.driverName || ""} onChange={e => setForm({ ...form, driverName: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Tracking Number</label><input type="text" value={form.trackingNumber || ""} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} className="input-field text-sm" /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="label">Reason</label><input type="text" value={form.reason || ""} onChange={e => setForm({ ...form, reason: e.target.value })} className="input-field text-sm" /></div>
                                <div><label className="label">Notes</label><input type="text" value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field text-sm" /></div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                            <button onClick={() => setShowModal(false)} className="btn-secondary text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={!form.itemName?.trim()} className="btn-primary disabled:opacity-40 text-sm">{editId ? "Save Changes" : "Create Transfer"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
