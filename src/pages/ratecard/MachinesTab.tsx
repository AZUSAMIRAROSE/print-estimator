import { useState } from "react";
import { useRateCardStore, type MachineEntry } from "@/stores/rateCardStore";
import { formatCurrency, formatNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import { TabActionBar, RowActions, StatusBadge, AddItemModal, FormField, exportTabCSV } from "./RateCardShared";
import { useAppStore } from "@/stores/appStore";
import {
    Check, X, ChevronDown, ChevronUp, Wrench, Zap, Shield, Settings,
    Activity, DollarSign, Clock, Cpu, Plus
} from "lucide-react";

// ── Machines Summary Tab ─────────────────────────────────────────────────────
export function MachinesTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { machines, deleteMachine, duplicateMachine, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();

    const filtered = machines.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                            <th className="py-3 px-4 text-left font-semibold text-xs">Machine</th>
                            <th className="py-3 px-4 text-center font-semibold text-xs">Max Sheet</th>
                            <th className="py-3 px-4 text-center font-semibold text-xs">Colors</th>
                            <th className="py-3 px-4 text-center font-semibold text-xs">AQ</th>
                            <th className="py-3 px-4 text-center font-semibold text-xs">Perfector</th>
                            <th className="py-3 px-4 text-right font-semibold text-xs">Speed (SPH)</th>
                            <th className="py-3 px-4 text-right font-semibold text-xs">Make Ready</th>
                            <th className="py-3 px-4 text-right font-semibold text-xs">CTP Rate</th>
                            <th className="py-3 px-4 text-right font-semibold text-xs">Hourly Rate</th>
                            <th className="py-3 px-4 text-center font-semibold text-xs">Status</th>
                            <th className="py-3 px-4 text-center font-semibold text-xs">Operational</th>
                            <th className="py-3 px-4 text-center font-semibold text-xs">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(m => (
                            <tr key={m.id} className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors">
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
                                <td className="py-2.5 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(m.hourlyRate)}</td>
                                <td className="py-2.5 px-4 text-center"><StatusBadge status={m.status} /></td>
                                <td className="py-2.5 px-4 text-center">
                                    <span className={cn("badge text-[10px]",
                                        m.operationalStatus === "running" ? "badge-success" :
                                            m.operationalStatus === "idle" ? "badge-warning" :
                                                m.operationalStatus === "maintenance" ? "badge-info" : "badge-danger"
                                    )}>
                                        {m.operationalStatus}
                                    </span>
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                    <RowActions isEditing={false} canEdit={canEdit}
                                        onEdit={() => { }} onSave={() => { }} onCancel={() => { }}
                                        onDelete={() => { deleteMachine(m.id); addNotification({ type: "info", title: "Deleted", message: `${m.name} removed.`, category: "system" }); }}
                                        onDuplicate={() => { duplicateMachine(m.id); addNotification({ type: "success", title: "Duplicated", message: `${m.name} duplicated.`, category: "system" }); }}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => { }} onExport={() => {
                exportTabCSV("machines.csv",
                    ["Name", "Code", "Type", "Max Sheet", "Colors", "AQ", "Perfector", "Speed", "Make Ready", "CTP Rate", "Hourly Rate", "Status"],
                    filtered.map(m => [m.name, m.code, m.type, `${m.maxSheetWidth}x${m.maxSheetHeight}`, String(m.maxColors), m.hasAQUnit ? "Yes" : "No", m.hasPerfector ? "Yes" : "No", String(m.speedSPH), String(m.makeReadyCost), String(m.ctpRate), String(m.hourlyRate), m.operationalStatus])
                );
                addNotification({ type: "success", title: "Exported", message: "Machines exported.", category: "export" });
            }}
                onReset={() => { resetToDefaults("machines"); addNotification({ type: "info", title: "Reset", message: "Machines restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={filtered.length} tabName="machine"
            />
        </div>
    );
}

// ── Machine Details Tab (Full ~50 field editing) ─────────────────────────────
export function MachineDetailsTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { machines, updateMachine, addMachine } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<MachineEntry>>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newMachine, setNewMachine] = useState<Partial<MachineEntry>>({});

    const filtered = machines.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()));

    const toggleExpand = (id: string) => { setExpandedId(expandedId === id ? null : id); setEditMode(null); };

    const startEdit = (m: MachineEntry) => { setEditMode(m.id); setEditData({ ...m }); };
    const saveEdit = () => {
        if (editMode) { updateMachine(editMode, editData); addNotification({ type: "success", title: "Saved", message: "Machine details updated.", category: "system" }); }
        setEditMode(null); setEditData({});
    };

    const F = ({ label, field, type = "text" }: { label: string; field: keyof MachineEntry; type?: string }) => {
        const m = editMode ? editData : machines.find(x => x.id === expandedId);
        if (!m) return null;
        const val = m[field as keyof typeof m] as any;
        const isEdit = editMode === expandedId;
        return (
            <div>
                <label className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wide">{label}</label>
                {isEdit ? (
                    type === "select-status" ? (
                        <select className="input-field text-xs mt-0.5" value={val || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}>
                            <option value="running">Running</option><option value="idle">Idle</option><option value="maintenance">Maintenance</option><option value="decommissioned">Decommissioned</option>
                        </select>
                    ) : type === "checkbox" ? (
                        <input type="checkbox" checked={!!val} onChange={e => setEditData(d => ({ ...d, [field]: e.target.checked }))} className="mt-1" />
                    ) : (
                        <input type={type} className="input-field text-xs mt-0.5" value={val ?? ""} onChange={e => setEditData(d => ({ ...d, [field]: type === "number" ? +e.target.value : e.target.value }))} />
                    )
                ) : (
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mt-0.5">
                        {typeof val === "boolean" ? (val ? "Yes" : "No") : (val || "—")}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="divide-y divide-surface-light-border dark:divide-surface-dark-border">
            {filtered.map(m => (
                <div key={m.id}>
                    <button onClick={() => toggleExpand(m.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                                m.operationalStatus === "running" ? "bg-success-100 dark:bg-success-500/20" :
                                    m.operationalStatus === "maintenance" ? "bg-warning-100 dark:bg-warning-500/20" : "bg-gray-100 dark:bg-gray-500/20"
                            )}>
                                <Cpu className={cn("w-5 h-5",
                                    m.operationalStatus === "running" ? "text-success-600" :
                                        m.operationalStatus === "maintenance" ? "text-warning-600" : "text-gray-500"
                                )} />
                            </div>
                            <div className="text-left">
                                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">{m.name}</p>
                                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{m.code} • {m.type} • {m.maxSheetWidth}"×{m.maxSheetHeight}"</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={cn("badge text-[10px]",
                                m.operationalStatus === "running" ? "badge-success" : m.operationalStatus === "maintenance" ? "badge-warning" : "badge-info"
                            )}>{m.operationalStatus}</span>
                            {expandedId === m.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </button>

                    {expandedId === m.id && (
                        <div className="px-5 pb-5 pt-2 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 animate-in">
                            {/* Action buttons */}
                            <div className="flex items-center gap-2 mb-4">
                                {editMode === m.id ? (
                                    <>
                                        <button onClick={saveEdit} className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5"><Check className="w-3.5 h-3.5" /> Save</button>
                                        <button onClick={() => { setEditMode(null); setEditData({}); }} className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5"><X className="w-3.5 h-3.5" /> Cancel</button>
                                    </>
                                ) : (
                                    <button onClick={() => startEdit(m)} disabled={!canEdit} className="btn-secondary text-xs flex items-center gap-1 px-3 py-1.5 disabled:opacity-40"><Settings className="w-3.5 h-3.5" /> Edit Details</button>
                                )}
                            </div>

                            {/* Sections */}
                            <div className="space-y-5">
                                <div>
                                    <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-primary-500" /> Basic Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <F label="Machine Name" field="name" /><F label="Code" field="code" />
                                        <F label="Type" field="type" /><F label="Manufacturer" field="manufacturer" />
                                        <F label="Model" field="model" /><F label="Serial Number" field="serialNumber" />
                                        <F label="Year of Manufacture" field="yearOfManufacture" type="number" /><F label="Location" field="location" />
                                        <F label="Operator" field="operatorName" /><F label="Operational Status" field="operationalStatus" type="select-status" />
                                        <F label="Description" field="description" />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><Settings className="w-3.5 h-3.5 text-info-500" /> Sheet Specifications</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <F label="Max Sheet Width (in)" field="maxSheetWidth" type="number" />
                                        <F label="Max Sheet Height (in)" field="maxSheetHeight" type="number" />
                                        <F label="Min Sheet Width (in)" field="minSheetWidth" type="number" />
                                        <F label="Min Sheet Height (in)" field="minSheetHeight" type="number" />
                                        <F label="Max Colors" field="maxColors" type="number" />
                                        <F label="Has AQ Unit" field="hasAQUnit" type="checkbox" />
                                        <F label="Has Perfector" field="hasPerfector" type="checkbox" />
                                        <F label="Speed (SPH)" field="speedSPH" type="number" />
                                        <F label="Plate Size" field="plateSize" />
                                        <F label="Gripper Margin (mm)" field="gripperMargin" type="number" />
                                        <F label="Tail Margin (mm)" field="tailMargin" type="number" />
                                        <F label="Side Margin (mm)" field="sideMargin" type="number" />
                                        <F label="Max Paper Weight (gsm)" field="maxPaperWeight" type="number" />
                                        <F label="Min Paper Weight (gsm)" field="minPaperWeight" type="number" />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-success-500" /> Cost Information</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <F label="Purchase Cost" field="purchaseCost" type="number" />
                                        <F label="Current Value" field="currentValue" type="number" />
                                        <F label="Depreciation Rate (%)" field="depreciationRate" type="number" />
                                        <F label="Make Ready Cost" field="makeReadyCost" type="number" />
                                        <F label="Make Ready Time (hrs)" field="makeReadyTime" type="number" />
                                        <F label="Washing Cost" field="washingCost" type="number" />
                                        <F label="CTP Rate" field="ctpRate" type="number" />
                                        <F label="Hourly Rate" field="hourlyRate" type="number" />
                                        <F label="Maintenance Cost/Month" field="maintenanceCostPerMonth" type="number" />
                                        <F label="Ink Cost/Hour" field="inkCostPerHour" type="number" />
                                        <F label="Power (KW)" field="powerConsumptionKW" type="number" />
                                        <F label="Electricity Cost/Unit" field="electricityCostPerUnit" type="number" />
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-warning-500" /> Maintenance</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <F label="Last Maintenance" field="lastMaintenanceDate" type="date" />
                                        <F label="Next Maintenance" field="nextMaintenanceDate" type="date" />
                                        <F label="Interval (days)" field="maintenanceIntervalDays" type="number" />
                                        <F label="Total Running Hours" field="totalRunningHours" type="number" />
                                        <F label="Hours Until Service" field="hoursUntilService" type="number" />
                                        <F label="Shift Capacity (hrs)" field="shiftCapacity" type="number" />
                                        <F label="Avg Uptime %" field="avgUptimePercent" type="number" />
                                        <F label="Avg Efficiency %" field="avgEfficiencyPercent" type="number" />
                                    </div>
                                    <div className="mt-2"><F label="Maintenance Notes" field="maintenanceNotes" /></div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-danger-500" /> Insurance & Warranty</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <F label="Insurance Provider" field="insuranceProvider" />
                                        <F label="Insurance Expiry" field="insuranceExpiry" type="date" />
                                        <F label="Insurance Premium" field="insurancePremium" type="number" />
                                        <F label="Warranty Expiry" field="warrantyExpiry" type="date" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => {
                exportTabCSV("machine-details.csv",
                    ["Name", "Code", "Type", "Manufacturer", "Model", "Serial", "Year", "MaxSheet", "Speed", "MakeReady", "CTP", "Hourly", "Status", "Uptime%", "Efficiency%"],
                    filtered.map(m => [m.name, m.code, m.type, m.manufacturer, m.model, m.serialNumber, String(m.yearOfManufacture), `${m.maxSheetWidth}x${m.maxSheetHeight}`, String(m.speedSPH), String(m.makeReadyCost), String(m.ctpRate), String(m.hourlyRate), m.operationalStatus, String(m.avgUptimePercent), String(m.avgEfficiencyPercent)])
                );
                addNotification({ type: "success", title: "Exported", message: "Machine details exported.", category: "export" });
            }}
                onReset={() => { }}
                canEdit={canEdit} itemCount={filtered.length} tabName="machine detail"
            />

            <AddItemModal title="Add Machine" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField label="Machine Name" required><input className="input-field" value={newMachine.name || ""} onChange={e => setNewMachine(n => ({ ...n, name: e.target.value }))} /></FormField>
                    <FormField label="Code" required><input className="input-field" value={newMachine.code || ""} onChange={e => setNewMachine(n => ({ ...n, code: e.target.value }))} /></FormField>
                    <FormField label="Type">
                        <select className="input-field" value={newMachine.type || "offset"} onChange={e => setNewMachine(n => ({ ...n, type: e.target.value as any }))}>
                            <option value="offset">Offset</option><option value="digital">Digital</option><option value="flexo">Flexo</option><option value="gravure">Gravure</option>
                            <option value="screen">Screen</option><option value="cutting">Cutting</option><option value="folding">Folding</option><option value="binding">Binding</option>
                            <option value="lamination">Lamination</option><option value="other">Other</option>
                        </select>
                    </FormField>
                    <FormField label="Manufacturer"><input className="input-field" value={newMachine.manufacturer || ""} onChange={e => setNewMachine(n => ({ ...n, manufacturer: e.target.value }))} /></FormField>
                    <FormField label="Model"><input className="input-field" value={newMachine.model || ""} onChange={e => setNewMachine(n => ({ ...n, model: e.target.value }))} /></FormField>
                    <FormField label="Max Colors"><input type="number" className="input-field" value={newMachine.maxColors || 4} onChange={e => setNewMachine(n => ({ ...n, maxColors: +e.target.value }))} /></FormField>
                    <FormField label="Speed (SPH)"><input type="number" className="input-field" value={newMachine.speedSPH || ""} onChange={e => setNewMachine(n => ({ ...n, speedSPH: +e.target.value }))} /></FormField>
                    <FormField label="Hourly Rate"><input type="number" className="input-field" value={newMachine.hourlyRate || ""} onChange={e => setNewMachine(n => ({ ...n, hourlyRate: +e.target.value }))} /></FormField>
                    <FormField label="CTP Rate"><input type="number" className="input-field" value={newMachine.ctpRate || ""} onChange={e => setNewMachine(n => ({ ...n, ctpRate: +e.target.value }))} /></FormField>
                    <FormField label="Make Ready Cost"><input type="number" className="input-field" value={newMachine.makeReadyCost || ""} onChange={e => setNewMachine(n => ({ ...n, makeReadyCost: +e.target.value }))} /></FormField>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                    <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button>
                    <button onClick={() => { if (newMachine.name && newMachine.code) { addMachine(newMachine); setNewMachine({}); setShowAdd(false); addNotification({ type: "success", title: "Added", message: `${newMachine.name} added.`, category: "system" }); } }} className="btn-primary text-sm px-6" disabled={!newMachine.name || !newMachine.code}>Add Machine</button>
                </div>
            </AddItemModal>
        </div>
    );
}
