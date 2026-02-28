import { useState } from "react";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency, formatNumber } from "@/utils/format";
import type { MachineDetail } from "@/types";
import {
    Plus, Edit3, Trash2, Copy, Save, X,
    ChevronDown, ChevronUp, Settings, Wrench, Zap, Shield
} from "lucide-react";

function emptyMachine(): Partial<MachineDetail> {
    return {
        code: "", name: "", type: "offset", manufacturer: "", model: "", serialNumber: "", yearOfManufacture: 2024,
        maxSheetWidth: 0, maxSheetHeight: 0, minSheetWidth: 0, minSheetHeight: 0,
        maxColors: 4, hasAQUnit: false, hasPerfector: false, speedSPH: 10000,
        plateSize: "", gripperMargin: 10, tailMargin: 10, sideMargin: 5, maxPaperWeight: 400, minPaperWeight: 40,
        purchaseCost: 0, currentValue: 0, depreciationRate: 10, makeReadyCost: 0, makeReadyTime: 0.5,
        washingCost: 0, ctpRate: 0, hourlyRate: 0, maintenanceCostPerMonth: 0,
        inkCostPerHour: 0, powerConsumptionKW: 0, electricityCostPerUnit: 9,
        lastMaintenanceDate: "", nextMaintenanceDate: "", maintenanceIntervalDays: 90,
        totalRunningHours: 0, hoursUntilService: 0, maintenanceNotes: "",
        isActive: true, operationalStatus: "idle", location: "", operatorName: "",
        shiftCapacity: 1, avgUptimePercent: 0, avgEfficiencyPercent: 0, description: "",
        insuranceProvider: "", insuranceExpiry: "", insurancePremium: 0, warrantyExpiry: "",
    };
}

const STATUS_COLORS: Record<string, string> = {
    running: "bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400",
    idle: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
    maintenance: "bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400",
    decommissioned: "bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

export function MachinesTab() {
    const { machines, addMachine, updateMachine, deleteMachine, duplicateMachine } = useInventoryStore();
    const { addNotification, addActivityLog } = useAppStore();
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<MachineDetail>>(emptyMachine());

    const openAdd = () => { setForm(emptyMachine()); setEditId(null); setShowModal(true); };
    const openEdit = (m: MachineDetail) => { setForm({ ...m }); setEditId(m.id); setShowModal(true); };

    const handleSave = () => {
        if (!form.name?.trim()) return;
        if (editId) {
            updateMachine(editId, form);
            addNotification({ type: "success", title: "Machine Updated", message: `${form.name} updated.`, category: "system" });
        } else {
            addMachine(form as Omit<MachineDetail, "id">);
            addNotification({ type: "success", title: "Machine Added", message: `${form.name} added.`, category: "system" });
        }
        setShowModal(false); setEditId(null);
    };

    const handleSaveDraft = () => {
        if (!form.name?.trim()) return;
        const data = { ...form, isActive: false, operationalStatus: "idle" as const };
        if (editId) updateMachine(editId, data); else addMachine(data as Omit<MachineDetail, "id">);
        addNotification({ type: "info", title: "Draft Saved", message: `${form.name} saved as draft.`, category: "system" });
        setShowModal(false); setEditId(null);
    };

    const handleDelete = (id: string) => {
        const m = machines.find(x => x.id === id);
        deleteMachine(id);
        addNotification({ type: "warning", title: "Machine Deleted", message: `${m?.name} removed.`, category: "system" });
        setDeleteConfirm(null);
    };

    return (
        <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Total Machines", value: machines.length, color: "text-primary-600 dark:text-primary-400" },
                    { label: "Running", value: machines.filter(m => m.operationalStatus === "running").length, color: "text-success-600 dark:text-success-400" },
                    { label: "In Maintenance", value: machines.filter(m => m.operationalStatus === "maintenance").length, color: "text-warning-600 dark:text-warning-400" },
                    { label: "Total Asset Value", value: formatCurrency(machines.reduce((s, m) => s + m.currentValue, 0)), color: "text-primary-600 dark:text-primary-400" },
                ].map(c => (
                    <div key={c.label} className="card p-3 text-center">
                        <p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">{c.label}</p>
                        <p className={cn("text-lg font-bold mt-1", c.color)}>{c.value}</p>
                    </div>
                ))}
            </div>

            {/* Add Button */}
            <div className="flex justify-end">
                <button onClick={openAdd} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Machine</button>
            </div>

            {/* Machine Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {machines.map(m => (
                    <div key={m.id} className="card p-4 space-y-3 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center"><Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" /></div>
                                <div>
                                    <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary text-sm">{m.name}</h3>
                                    <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary font-mono">{m.code} • {m.manufacturer} {m.model}</p>
                                </div>
                            </div>
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium capitalize", STATUS_COLORS[m.operationalStatus])}>{m.operationalStatus}</span>
                        </div>

                        {/* Key Specs */}
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg p-2 text-center">
                                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Max Colors</p>
                                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">{m.maxColors}</p>
                            </div>
                            <div className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg p-2 text-center">
                                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Speed SPH</p>
                                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">{formatNumber(m.speedSPH)}</p>
                            </div>
                            <div className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-lg p-2 text-center">
                                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">Hourly Rate</p>
                                <p className="font-bold text-text-light-primary dark:text-text-dark-primary">{formatCurrency(m.hourlyRate)}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[10px]">
                            <div><span className="text-text-light-tertiary">Sheet Max:</span> <span className="font-medium">{m.maxSheetWidth}×{m.maxSheetHeight}"</span></div>
                            <div><span className="text-text-light-tertiary">Running Hrs:</span> <span className="font-medium">{formatNumber(m.totalRunningHours)}</span></div>
                            <div><span className="text-text-light-tertiary">Uptime:</span> <span className="font-medium">{m.avgUptimePercent}%</span></div>
                            <div><span className="text-text-light-tertiary">Location:</span> <span className="font-medium">{m.location || "—"}</span></div>
                        </div>

                        {/* Maintenance Bar */}
                        {m.hoursUntilService > 0 && (
                            <div>
                                <div className="flex justify-between text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary mb-1"><span>Service in {m.hoursUntilService}h</span><span>Next: {m.nextMaintenanceDate || "—"}</span></div>
                                <div className="w-full h-1.5 bg-surface-light-tertiary dark:bg-surface-dark-tertiary rounded-full">
                                    <div className={cn("h-full rounded-full transition-all", m.hoursUntilService < 100 ? "bg-danger-500" : m.hoursUntilService < 300 ? "bg-warning-500" : "bg-success-500")} style={{ width: `${Math.min(100, (m.hoursUntilService / (m.maintenanceIntervalDays * 8)) * 100)}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 pt-1 border-t border-surface-light-border/50 dark:border-surface-dark-border/50">
                            <button onClick={() => openEdit(m)} className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                            <button onClick={() => duplicateMachine(m.id)} className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"><Copy className="w-3 h-3" /> Duplicate</button>
                            <button onClick={() => setDeleteConfirm(m.id)} className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 text-danger-500"><Trash2 className="w-3 h-3" /> Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Machine Form Modal */}
            {showModal && <MachineFormModal form={form} setForm={setForm} onSave={handleSave} onSaveDraft={handleSaveDraft} onClose={() => { setShowModal(false); setEditId(null); }} isEdit={!!editId} />}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative card p-6 w-full max-w-sm animate-scale-in text-center">
                        <Trash2 className="w-12 h-12 text-danger-500 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Delete Machine?</h3>
                        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">"{machines.find(x => x.id === deleteConfirm)?.name}" will be permanently removed.</p>
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

function Sec({ title, icon, defaultOpen, children }: { title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div className="border border-surface-light-border dark:border-surface-dark-border rounded-lg overflow-hidden">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 justify-between px-4 py-2.5 bg-surface-light-tertiary dark:bg-surface-dark-tertiary text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                <span className="flex items-center gap-2">{icon} {title}</span>{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {open && <div className="p-4 space-y-3">{children}</div>}
        </div>
    );
}

function MachineFormModal({ form, setForm, onSave, onSaveDraft, onClose, isEdit }: {
    form: Partial<MachineDetail>; setForm: (d: Partial<MachineDetail>) => void;
    onSave: () => void; onSaveDraft: () => void; onClose: () => void; isEdit: boolean;
}) {
    const u = (f: string, v: unknown) => setForm({ ...form, [f]: v });
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative card w-full max-w-3xl max-h-[85vh] animate-scale-in flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-surface-light-border dark:border-surface-dark-border">
                    <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">{isEdit ? "Edit Machine" : "Add Machine"}</h2>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    <Sec title="Basic Information" icon={<Settings className="w-4 h-4" />} defaultOpen>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">Machine Name <span className="text-danger-500">*</span></label><input type="text" value={form.name || ""} onChange={e => u("name", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Code</label><input type="text" value={form.code || ""} onChange={e => u("code", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Type</label><select value={form.type || "offset"} onChange={e => u("type", e.target.value)} className="input-field text-sm"><option value="offset">Offset</option><option value="digital">Digital</option><option value="flexo">Flexo</option><option value="gravure">Gravure</option><option value="screen">Screen</option><option value="cutting">Cutting</option><option value="folding">Folding</option><option value="binding">Binding</option><option value="lamination">Lamination</option><option value="other">Other</option></select></div>
                            <div><label className="label">Manufacturer</label><input type="text" value={form.manufacturer || ""} onChange={e => u("manufacturer", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Model</label><input type="text" value={form.model || ""} onChange={e => u("model", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Serial Number</label><input type="text" value={form.serialNumber || ""} onChange={e => u("serialNumber", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Year of Manufacture</label><input type="number" value={form.yearOfManufacture || 2024} onChange={e => u("yearOfManufacture", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Status</label><select value={form.operationalStatus || "idle"} onChange={e => u("operationalStatus", e.target.value)} className="input-field text-sm"><option value="running">Running</option><option value="idle">Idle</option><option value="maintenance">Maintenance</option><option value="decommissioned">Decommissioned</option></select></div>
                        </div>
                    </Sec>

                    <Sec title="Specifications" icon={<Zap className="w-4 h-4" />}>
                        <div className="grid grid-cols-4 gap-3">
                            <div><label className="label">Max Sheet W (in)</label><input type="number" value={form.maxSheetWidth || 0} onChange={e => u("maxSheetWidth", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Max Sheet H (in)</label><input type="number" value={form.maxSheetHeight || 0} onChange={e => u("maxSheetHeight", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Min Sheet W (in)</label><input type="number" value={form.minSheetWidth || 0} onChange={e => u("minSheetWidth", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Min Sheet H (in)</label><input type="number" value={form.minSheetHeight || 0} onChange={e => u("minSheetHeight", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div><label className="label">Max Colors</label><input type="number" value={form.maxColors || 0} onChange={e => u("maxColors", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Speed SPH</label><input type="number" value={form.speedSPH || 0} onChange={e => u("speedSPH", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Plate Size</label><input type="text" value={form.plateSize || ""} onChange={e => u("plateSize", e.target.value)} className="input-field text-sm" /></div>
                            <div className="flex items-end gap-3 pb-0.5">
                                <label className="label flex items-center gap-1.5"><input type="checkbox" checked={form.hasAQUnit || false} onChange={e => u("hasAQUnit", e.target.checked)} className="rounded" /> AQ Unit</label>
                                <label className="label flex items-center gap-1.5"><input type="checkbox" checked={form.hasPerfector || false} onChange={e => u("hasPerfector", e.target.checked)} className="rounded" /> Perfector</label>
                            </div>
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                            <div><label className="label">Gripper (mm)</label><input type="number" value={form.gripperMargin || 0} onChange={e => u("gripperMargin", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Tail (mm)</label><input type="number" value={form.tailMargin || 0} onChange={e => u("tailMargin", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Side (mm)</label><input type="number" value={form.sideMargin || 0} onChange={e => u("sideMargin", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Max GSM</label><input type="number" value={form.maxPaperWeight || 0} onChange={e => u("maxPaperWeight", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Min GSM</label><input type="number" value={form.minPaperWeight || 0} onChange={e => u("minPaperWeight", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                    </Sec>

                    <Sec title="Costs & Rates" icon={<span className="text-sm">₹</span>}>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Purchase Cost (₹)</label><input type="number" value={form.purchaseCost || 0} onChange={e => u("purchaseCost", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Current Value (₹)</label><input type="number" value={form.currentValue || 0} onChange={e => u("currentValue", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Depreciation %</label><input type="number" value={form.depreciationRate || 0} onChange={e => u("depreciationRate", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div><label className="label">Make-Ready Cost</label><input type="number" value={form.makeReadyCost || 0} onChange={e => u("makeReadyCost", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Make-Ready Time (h)</label><input type="number" step="0.25" value={form.makeReadyTime || 0} onChange={e => u("makeReadyTime", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Washing Cost</label><input type="number" value={form.washingCost || 0} onChange={e => u("washingCost", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">CTP Rate/Plate</label><input type="number" value={form.ctpRate || 0} onChange={e => u("ctpRate", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div><label className="label">Hourly Rate</label><input type="number" value={form.hourlyRate || 0} onChange={e => u("hourlyRate", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Maintenance/Month</label><input type="number" value={form.maintenanceCostPerMonth || 0} onChange={e => u("maintenanceCostPerMonth", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Ink Cost/Hour</label><input type="number" value={form.inkCostPerHour || 0} onChange={e => u("inkCostPerHour", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Power (KW)</label><input type="number" value={form.powerConsumptionKW || 0} onChange={e => u("powerConsumptionKW", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                    </Sec>

                    <Sec title="Maintenance" icon={<Wrench className="w-4 h-4" />}>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Last Maintenance</label><input type="date" value={form.lastMaintenanceDate || ""} onChange={e => u("lastMaintenanceDate", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Next Maintenance</label><input type="date" value={form.nextMaintenanceDate || ""} onChange={e => u("nextMaintenanceDate", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Interval (days)</label><input type="number" value={form.maintenanceIntervalDays || 90} onChange={e => u("maintenanceIntervalDays", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Total Running Hours</label><input type="number" value={form.totalRunningHours || 0} onChange={e => u("totalRunningHours", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Hours Until Service</label><input type="number" value={form.hoursUntilService || 0} onChange={e => u("hoursUntilService", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Operator</label><input type="text" value={form.operatorName || ""} onChange={e => u("operatorName", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div><label className="label">Maintenance Notes</label><textarea rows={2} value={form.maintenanceNotes || ""} onChange={e => u("maintenanceNotes", e.target.value)} className="input-field text-sm" /></div>
                    </Sec>

                    <Sec title="Operational & Insurance" icon={<Shield className="w-4 h-4" />}>
                        <div className="grid grid-cols-3 gap-3">
                            <div><label className="label">Location</label><input type="text" value={form.location || ""} onChange={e => u("location", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Shift Capacity</label><input type="number" value={form.shiftCapacity || 1} onChange={e => u("shiftCapacity", +e.target.value)} className="input-field text-sm" /></div>
                            <div className="flex items-end gap-2 pb-0.5"><label className="label flex items-center gap-2"><input type="checkbox" checked={form.isActive || false} onChange={e => u("isActive", e.target.checked)} className="rounded" /> Active</label></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label">Avg Uptime %</label><input type="number" value={form.avgUptimePercent || 0} onChange={e => u("avgUptimePercent", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Avg Efficiency %</label><input type="number" value={form.avgEfficiencyPercent || 0} onChange={e => u("avgEfficiencyPercent", +e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <div><label className="label">Insurance Provider</label><input type="text" value={form.insuranceProvider || ""} onChange={e => u("insuranceProvider", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Insurance Expiry</label><input type="date" value={form.insuranceExpiry || ""} onChange={e => u("insuranceExpiry", e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Premium (₹)</label><input type="number" value={form.insurancePremium || 0} onChange={e => u("insurancePremium", +e.target.value)} className="input-field text-sm" /></div>
                            <div><label className="label">Warranty Expiry</label><input type="date" value={form.warrantyExpiry || ""} onChange={e => u("warrantyExpiry", e.target.value)} className="input-field text-sm" /></div>
                        </div>
                        <div><label className="label">Description</label><textarea rows={2} value={form.description || ""} onChange={e => u("description", e.target.value)} className="input-field text-sm" /></div>
                    </Sec>
                </div>
                <div className="flex justify-between gap-3 p-5 border-t border-surface-light-border dark:border-surface-dark-border">
                    <button onClick={onSaveDraft} className="btn-secondary flex items-center gap-1.5 text-sm"><Save className="w-4 h-4" /> Save as Draft</button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
                        <button onClick={onSave} disabled={!form.name?.trim()} className="btn-primary disabled:opacity-40 text-sm">{isEdit ? "Save Changes" : "Add Machine"}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
