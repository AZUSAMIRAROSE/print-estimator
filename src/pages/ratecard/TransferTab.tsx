import { useState } from "react";
import { useRateCardStore, type TransferEntry } from "@/stores/rateCardStore";
import { formatCurrency, formatNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import { TabActionBar, RowActions, StatusBadge, AddItemModal, FormField, TH, TR, TD, exportTabCSV } from "./RateCardShared";
import { useAppStore } from "@/stores/appStore";
import { Truck, ArrowRight, DollarSign, Package, Clock, MapPin, AlertTriangle, Check, X, Save, Edit3 } from "lucide-react";

export function TransferTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { transfers, addTransfer, updateTransfer, deleteTransfer, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [showAdd, setShowAdd] = useState(false);
    const [newT, setNewT] = useState<Partial<TransferEntry>>({});
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<TransferEntry>>({});

    const filtered = transfers.filter(t => !search || t.itemName.toLowerCase().includes(search.toLowerCase()) || t.itemSku.toLowerCase().includes(search.toLowerCase()) || t.fromWarehouse.toLowerCase().includes(search.toLowerCase()) || t.toWarehouse.toLowerCase().includes(search.toLowerCase()));

    const calcTotal = (d: Partial<TransferEntry>) => (d.transportCharges || 0) + (d.handlingCharges || 0) + (d.insuranceCharges || 0) + (d.packagingCharges || 0) + (d.otherCharges || 0);

    const handleAdd = () => {
        if (!newT.itemName) return;
        addTransfer({ ...newT, totalTransferCost: calcTotal(newT) });
        addNotification({ type: "success", title: "Transfer Added", message: `Transfer for ${newT.itemName} created.`, category: "system" });
        setNewT({});
        setShowAdd(false);
    };

    const saveEdit = () => {
        if (editMode) {
            updateTransfer(editMode, { ...editData, totalTransferCost: calcTotal(editData) });
            addNotification({ type: "success", title: "Transfer Updated", message: "Transfer details saved.", category: "system" });
        }
        setEditMode(null);
        setEditData({});
    };

    const statusColor = (s: string) => s === "received" ? "badge-success" : s === "in_transit" ? "badge-info" : s === "pending" ? "badge-warning" : s === "approved" ? "badge-primary" : "badge-danger";
    const priorityColor = (p: string) => p === "urgent" ? "text-danger-600" : p === "high" ? "text-warning-600" : p === "medium" ? "text-info-600" : "text-text-light-tertiary";

    return (
        <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-surface-light-border dark:border-surface-dark-border">
                <div className="p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-center">
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase">Total Transfers</p>
                    <p className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">{transfers.length}</p>
                </div>
                <div className="p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-center">
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase">In Transit</p>
                    <p className="text-xl font-bold text-info-600">{transfers.filter(t => t.status === "in_transit").length}</p>
                </div>
                <div className="p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-center">
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase">Pending</p>
                    <p className="text-xl font-bold text-warning-600">{transfers.filter(t => t.status === "pending").length}</p>
                </div>
                <div className="p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-center">
                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase">Total Transfer Cost</p>
                    <p className="text-xl font-bold text-primary-600">{formatCurrency(transfers.reduce((s, t) => s + t.totalTransferCost, 0))}</p>
                </div>
            </div>

            {/* Transfer List */}
            {filtered.length === 0 ? (
                <div className="p-12 text-center">
                    <Truck className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary mx-auto mb-3 opacity-40" />
                    <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">No transfers yet. Click "Add New" to create a transfer.</p>
                </div>
            ) : (
                <div className="divide-y divide-surface-light-border dark:divide-surface-dark-border">
                    {filtered.map(t => (
                        <div key={t.id}>
                            <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center",
                                        t.status === "in_transit" ? "bg-info-100 dark:bg-info-500/20" :
                                            t.status === "received" ? "bg-success-100 dark:bg-success-500/20" : "bg-warning-100 dark:bg-warning-500/20"
                                    )}>
                                        <Truck className={cn("w-4 h-4", t.status === "in_transit" ? "text-info-600" : t.status === "received" ? "text-success-600" : "text-warning-600")} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-sm text-text-light-primary dark:text-text-dark-primary">{t.itemName} <span className="text-xs text-text-light-tertiary">({t.itemSku})</span></p>
                                        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {t.fromWarehouse} <ArrowRight className="w-3 h-3" /> {t.toWarehouse} • {t.quantity} {t.unit}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={cn(priorityColor(t.priorityLevel), "text-[10px] font-bold uppercase")}>{t.priorityLevel}</span>
                                    <span className={cn("badge text-[10px]", statusColor(t.status))}>{t.status.replace("_", " ")}</span>
                                    <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(t.totalTransferCost)}</span>
                                </div>
                            </button>

                            {expandedId === t.id && (
                                <div className="px-5 pb-5 pt-2 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 animate-in">
                                    <div className="flex items-center gap-2 mb-4">
                                        {editMode === t.id ? (
                                            <>
                                                <button onClick={saveEdit} className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
                                                <button onClick={() => { setEditMode(null); setEditData({}); }} className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5"><X className="w-3.5 h-3.5" /> Cancel</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditMode(t.id); setEditData({ ...t }); }} disabled={!canEdit} className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5 disabled:opacity-40"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                                                <button onClick={() => { deleteTransfer(t.id); setExpandedId(null); addNotification({ type: "info", title: "Deleted", message: "Transfer removed.", category: "system" }); }} disabled={!canEdit} className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5 text-danger-600 disabled:opacity-40">Delete</button>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { label: "Item Name", field: "itemName" as const },
                                            { label: "SKU", field: "itemSku" as const },
                                            { label: "Category", field: "category" as const },
                                            { label: "Quantity", field: "quantity" as const, type: "number" },
                                            { label: "Unit", field: "unit" as const },
                                            { label: "From Warehouse", field: "fromWarehouse" as const },
                                            { label: "From Zone", field: "fromZone" as const },
                                            { label: "To Warehouse", field: "toWarehouse" as const },
                                            { label: "To Zone", field: "toZone" as const },
                                            { label: "Transfer Date", field: "transferDate" as const, type: "date" },
                                            { label: "Expected Arrival", field: "expectedArrivalDate" as const, type: "date" },
                                            { label: "Status", field: "status" as const, type: "select" },
                                            { label: "Transport Mode", field: "transportMode" as const, type: "select2" },
                                            { label: "Vehicle Number", field: "vehicleNumber" as const },
                                            { label: "Driver Name", field: "driverName" as const },
                                            { label: "Tracking Number", field: "trackingNumber" as const },
                                            { label: "Priority", field: "priorityLevel" as const, type: "select3" },
                                            { label: "Requested By", field: "requestedBy" as const },
                                            { label: "Approved By", field: "approvedBy" as const },
                                            { label: "Reason", field: "reason" as const },
                                        ].map(({ label, field, type }) => (
                                            <div key={field}>
                                                <label className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wide">{label}</label>
                                                {editMode === t.id ? (
                                                    type === "select" ? (
                                                        <select className="input-field text-xs mt-0.5" value={(editData as any)[field] || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}>
                                                            <option value="pending">Pending</option><option value="approved">Approved</option><option value="in_transit">In Transit</option><option value="received">Received</option><option value="cancelled">Cancelled</option>
                                                        </select>
                                                    ) : type === "select2" ? (
                                                        <select className="input-field text-xs mt-0.5" value={(editData as any)[field] || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}>
                                                            <option value="manual">Manual</option><option value="truck">Truck</option><option value="courier">Courier</option><option value="rail">Rail</option><option value="air">Air</option>
                                                        </select>
                                                    ) : type === "select3" ? (
                                                        <select className="input-field text-xs mt-0.5" value={(editData as any)[field] || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}>
                                                            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                                                        </select>
                                                    ) : (
                                                        <input type={type || "text"} className="input-field text-xs mt-0.5" value={(editData as any)[field] ?? ""} onChange={e => setEditData(d => ({ ...d, [field]: type === "number" ? +e.target.value : e.target.value }))} />
                                                    )
                                                ) : (
                                                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mt-0.5">{(t as any)[field] || "—"}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Charges Section */}
                                    <div className="mt-4 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                                        <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-success-500" /> Transfer Charges</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                            {[
                                                { label: "Transport", field: "transportCharges" as const },
                                                { label: "Handling", field: "handlingCharges" as const },
                                                { label: "Insurance", field: "insuranceCharges" as const },
                                                { label: "Packaging", field: "packagingCharges" as const },
                                                { label: "Other", field: "otherCharges" as const },
                                                { label: "TOTAL", field: "totalTransferCost" as const, isTotal: true },
                                            ].map(({ label, field, isTotal }) => (
                                                <div key={field} className={cn("p-3 rounded-lg text-center", isTotal ? "bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30" : "bg-surface-light-secondary dark:bg-surface-dark-tertiary")}>
                                                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase">{label}</p>
                                                    {editMode === t.id && !isTotal ? (
                                                        <input type="number" className="input-field text-center text-sm font-bold mt-1 w-full" value={(editData as any)[field] || 0} onChange={e => setEditData(d => ({ ...d, [field]: +e.target.value }))} />
                                                    ) : (
                                                        <p className={cn("text-sm font-bold mt-1", isTotal ? "text-primary-600 dark:text-primary-400" : "text-text-light-primary dark:text-text-dark-primary")}>{formatCurrency((t as any)[field])}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="mt-3">
                                        <label className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase">Notes</label>
                                        {editMode === t.id ? (
                                            <textarea className="input-field text-xs mt-0.5 w-full" rows={2} value={editData.notes || ""} onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} />
                                        ) : (
                                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-0.5">{t.notes || "—"}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => {
                exportTabCSV("transfers.csv",
                    ["Item", "SKU", "Qty", "From", "To", "Status", "Transport", "Handling", "Insurance", "Packaging", "Other", "Total", "Date"],
                    transfers.map(t => [t.itemName, t.itemSku, String(t.quantity), t.fromWarehouse, t.toWarehouse, t.status, String(t.transportCharges), String(t.handlingCharges), String(t.insuranceCharges), String(t.packagingCharges), String(t.otherCharges), String(t.totalTransferCost), t.transferDate]),
                    "Transfers exported."
                );
            }}
                onReset={() => { resetToDefaults("transfers"); addNotification({ type: "info", title: "Cleared", message: "All transfers cleared.", category: "system" }); }}
                canEdit={canEdit} itemCount={filtered.length} tabName="transfer"
            />

            {/* Add Transfer Modal */}
            <AddItemModal title="New Inventory Transfer" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="space-y-5">
                    <div>
                        <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-primary-500" /> Item Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <FormField label="Item Name" required><input className="input-field" value={newT.itemName || ""} onChange={e => setNewT(n => ({ ...n, itemName: e.target.value }))} placeholder="e.g. Matt Art Paper 130gsm" /></FormField>
                            <FormField label="SKU"><input className="input-field" value={newT.itemSku || ""} onChange={e => setNewT(n => ({ ...n, itemSku: e.target.value }))} /></FormField>
                            <FormField label="Category">
                                <select className="input-field" value={newT.category || ""} onChange={e => setNewT(n => ({ ...n, category: e.target.value }))}>
                                    <option value="">Select...</option><option>paper</option><option>plates</option><option>finishing</option><option>packing</option><option>ink</option><option>chemicals</option><option>consumables</option><option>spare_parts</option><option>other</option>
                                </select>
                            </FormField>
                            <FormField label="Quantity" required><input type="number" className="input-field" value={newT.quantity || ""} onChange={e => setNewT(n => ({ ...n, quantity: +e.target.value }))} /></FormField>
                            <FormField label="Unit">
                                <select className="input-field" value={newT.unit || "pcs"} onChange={e => setNewT(n => ({ ...n, unit: e.target.value }))}>
                                    <option>pcs</option><option>reams</option><option>kg</option><option>liters</option><option>rolls</option><option>sheets</option><option>cartons</option><option>pallets</option>
                                </select>
                            </FormField>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-info-500" /> Location Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <FormField label="From Warehouse" required><input className="input-field" value={newT.fromWarehouse || ""} onChange={e => setNewT(n => ({ ...n, fromWarehouse: e.target.value }))} placeholder="Main Warehouse" /></FormField>
                            <FormField label="From Zone"><input className="input-field" value={newT.fromZone || ""} onChange={e => setNewT(n => ({ ...n, fromZone: e.target.value }))} placeholder="Zone A" /></FormField>
                            <FormField label="To Warehouse" required><input className="input-field" value={newT.toWarehouse || ""} onChange={e => setNewT(n => ({ ...n, toWarehouse: e.target.value }))} placeholder="Press Floor" /></FormField>
                            <FormField label="To Zone"><input className="input-field" value={newT.toZone || ""} onChange={e => setNewT(n => ({ ...n, toZone: e.target.value }))} placeholder="Zone B" /></FormField>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-warning-500" /> Transport Details</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <FormField label="Transfer Date"><input type="date" className="input-field" value={newT.transferDate || ""} onChange={e => setNewT(n => ({ ...n, transferDate: e.target.value }))} /></FormField>
                            <FormField label="Expected Arrival"><input type="date" className="input-field" value={newT.expectedArrivalDate || ""} onChange={e => setNewT(n => ({ ...n, expectedArrivalDate: e.target.value }))} /></FormField>
                            <FormField label="Transport Mode">
                                <select className="input-field" value={newT.transportMode || "manual"} onChange={e => setNewT(n => ({ ...n, transportMode: e.target.value as any }))}>
                                    <option value="manual">Manual</option><option value="truck">Truck</option><option value="courier">Courier</option><option value="rail">Rail</option><option value="air">Air</option>
                                </select>
                            </FormField>
                            <FormField label="Priority">
                                <select className="input-field" value={newT.priorityLevel || "medium"} onChange={e => setNewT(n => ({ ...n, priorityLevel: e.target.value as any }))}>
                                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                                </select>
                            </FormField>
                            <FormField label="Vehicle Number"><input className="input-field" value={newT.vehicleNumber || ""} onChange={e => setNewT(n => ({ ...n, vehicleNumber: e.target.value }))} /></FormField>
                            <FormField label="Driver Name"><input className="input-field" value={newT.driverName || ""} onChange={e => setNewT(n => ({ ...n, driverName: e.target.value }))} /></FormField>
                            <FormField label="Tracking Number"><input className="input-field" value={newT.trackingNumber || ""} onChange={e => setNewT(n => ({ ...n, trackingNumber: e.target.value }))} /></FormField>
                            <FormField label="Reason"><input className="input-field" value={newT.reason || ""} onChange={e => setNewT(n => ({ ...n, reason: e.target.value }))} placeholder="Production requirement" /></FormField>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-success-500" /> Charges</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <FormField label="Transport ₹"><input type="number" className="input-field" value={newT.transportCharges || ""} onChange={e => setNewT(n => ({ ...n, transportCharges: +e.target.value }))} /></FormField>
                            <FormField label="Handling ₹"><input type="number" className="input-field" value={newT.handlingCharges || ""} onChange={e => setNewT(n => ({ ...n, handlingCharges: +e.target.value }))} /></FormField>
                            <FormField label="Insurance ₹"><input type="number" className="input-field" value={newT.insuranceCharges || ""} onChange={e => setNewT(n => ({ ...n, insuranceCharges: +e.target.value }))} /></FormField>
                            <FormField label="Packaging ₹"><input type="number" className="input-field" value={newT.packagingCharges || ""} onChange={e => setNewT(n => ({ ...n, packagingCharges: +e.target.value }))} /></FormField>
                            <FormField label="Other ₹"><input type="number" className="input-field" value={newT.otherCharges || ""} onChange={e => setNewT(n => ({ ...n, otherCharges: +e.target.value }))} /></FormField>
                            <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-lg text-center border border-primary-200 dark:border-primary-500/30">
                                <p className="text-[10px] text-primary-600 uppercase font-medium">Total</p>
                                <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{formatCurrency(calcTotal(newT))}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <FormField label="Requested By"><input className="input-field" value={newT.requestedBy || ""} onChange={e => setNewT(n => ({ ...n, requestedBy: e.target.value }))} /></FormField>
                        <FormField label="Approved By"><input className="input-field" value={newT.approvedBy || ""} onChange={e => setNewT(n => ({ ...n, approvedBy: e.target.value }))} /></FormField>
                        <div className="col-span-full">
                            <FormField label="Notes"><textarea className="input-field" rows={2} value={newT.notes || ""} onChange={e => setNewT(n => ({ ...n, notes: e.target.value }))} /></FormField>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                    <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button>
                    <button onClick={() => { setNewT(n => ({ ...n, status: "pending" })); handleAdd(); }} className="btn-secondary text-sm px-4">Save as Draft</button>
                    <button onClick={handleAdd} className="btn-primary text-sm px-6" disabled={!newT.itemName || !newT.fromWarehouse || !newT.toWarehouse}>
                        Create Transfer
                    </button>
                </div>
            </AddItemModal>
        </div>
    );
}
