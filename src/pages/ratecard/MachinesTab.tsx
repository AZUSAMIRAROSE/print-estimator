import { useState } from "react";
import { useRateCardStore, type MachineEntry } from "@/stores/rateCardStore";
import { formatCurrency, formatNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import { TabActionBar, RowActions, StatusBadge, AddItemModal, FormField, exportTabCSV, SlidingSidePanel } from "./RateCardShared";
import { useAppStore } from "@/stores/appStore";
import {
    Check, X, ChevronDown, ChevronUp, Wrench, Zap, Shield, Settings,
    Activity, DollarSign, Clock, Cpu, Plus, Copy, Trash2, Save
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
                    filtered.map(m => [m.name, m.code, m.type, `${m.maxSheetWidth}x${m.maxSheetHeight}`, String(m.maxColors), m.hasAQUnit ? "Yes" : "No", m.hasPerfector ? "Yes" : "No", String(m.speedSPH), String(m.makeReadyCost), String(m.ctpRate), String(m.hourlyRate), m.operationalStatus]),
                    "Machines exported."
                );
            }}
                onReset={() => { resetToDefaults("machines"); addNotification({ type: "info", title: "Reset", message: "Machines restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={filtered.length} tabName="machine"
            />
        </div>
    );
}

// ── Machine Details Tab (God-Level ~50 field editing) ────────────────────────
export function MachineDetailsTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { machines, updateMachine, addMachine, duplicateMachine, deleteMachine } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editMode, setEditMode] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<MachineEntry>>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newMachine, setNewMachine] = useState<Partial<MachineEntry>>({});

    const filtered = machines.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase()));

    const openEditPanel = (m: MachineEntry) => {
        setEditMode(m.id);
        setEditData({ ...m });
    };

    const saveEdit = () => {
        if (editMode) {
            updateMachine(editMode, editData);
            addNotification({ type: "success", title: "Saved", message: "Machine details updated successfully.", category: "system" });
        }
        setEditMode(null);
        setEditData({});
    };

    const F = ({ label, field, type = "text", required = false }: { label: string; field: keyof MachineEntry; type?: string; required?: boolean }) => {
        const val = editData[field as keyof typeof editData] as any;

        return (
            <FormField label={label} required={required}>
                {type === "select-status" ? (
                    <select className="input-field" value={val || ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}>
                        <option value="running">Running</option>
                        <option value="idle">Idle</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="decommissioned">Decommissioned</option>
                    </select>
                ) : type === "select-type" ? (
                    <select className="input-field" value={val || "offset"} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}>
                        <option value="offset">Offset</option><option value="digital">Digital</option><option value="flexo">Flexo</option><option value="gravure">Gravure</option>
                        <option value="screen">Screen</option><option value="cutting">Cutting</option><option value="folding">Folding</option><option value="binding">Binding</option>
                        <option value="lamination">Lamination</option><option value="other">Other</option>
                    </select>
                ) : type === "checkbox" ? (
                    <div className="flex items-center h-10">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={!!val} onChange={e => setEditData(d => ({ ...d, [field]: e.target.checked }))} />
                            <div className="w-9 h-5 bg-surface-light-border dark:bg-surface-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                    </div>
                ) : type === "textarea" ? (
                    <textarea className="input-field min-h-[80px]" value={val ?? ""} onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))} />
                ) : (
                    <input
                        type={type}
                        className="input-field"
                        value={val ?? ""}
                        onChange={e => setEditData(d => ({ ...d, [field]: type === "number" ? +e.target.value : e.target.value }))}
                    />
                )}
            </FormField>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filtered.map(m => (
                    <div key={m.id} className="card p-5 hover:border-primary-500/50 transition-all group flex flex-col relative overflow-hidden">
                        {/* Decorative background accent */}
                        <div className={cn(
                            "absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none transition-all group-hover:opacity-40",
                            m.operationalStatus === "running" ? "bg-success-500" :
                                m.operationalStatus === "maintenance" ? "bg-warning-500" :
                                    m.operationalStatus === "idle" ? "bg-info-500" : "bg-danger-500"
                        )} />

                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                                    m.operationalStatus === "running" ? "bg-gradient-to-br from-success-400 to-success-600 text-white" :
                                        m.operationalStatus === "maintenance" ? "bg-gradient-to-br from-warning-400 to-warning-600 text-white" :
                                            m.operationalStatus === "idle" ? "bg-gradient-to-br from-info-400 to-info-600 text-white" :
                                                "bg-gradient-to-br from-gray-400 to-gray-600 text-white"
                                )}>
                                    <Cpu className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-text-light-primary dark:text-text-dark-primary group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{m.name}</h3>
                                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">{m.code} • {m.type.charAt(0).toUpperCase() + m.type.slice(1)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-5 text-sm relative z-10 flex-1">
                            <div>
                                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-0.5">Speed</p>
                                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">{formatNumber(m.speedSPH)} <span className="text-xs font-normal text-text-light-tertiary">SPH</span></p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-0.5">Sheet Size</p>
                                <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">{m.maxSheetWidth}"×{m.maxSheetHeight}"</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-0.5">Hourly Rate</p>
                                <p className="font-semibold text-primary-600 dark:text-primary-400">{formatCurrency(m.hourlyRate)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mb-0.5">Status</p>
                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium inline-block",
                                    m.operationalStatus === "running" ? "bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-400" :
                                        m.operationalStatus === "maintenance" ? "bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400" :
                                            m.operationalStatus === "idle" ? "bg-info-100 text-info-700 dark:bg-info-500/20 dark:text-info-400" :
                                                "bg-danger-100 text-danger-700 dark:bg-danger-500/20 dark:text-danger-400"
                                )}>{m.operationalStatus.charAt(0).toUpperCase() + m.operationalStatus.slice(1)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-surface-light-border dark:border-surface-dark-border flex items-center justify-between relative z-10">
                            <div className="flex -space-x-1">
                                {m.hasAQUnit && <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 border-2 border-surface-light-primary dark:border-surface-dark-primary flex items-center justify-center text-[9px] font-bold text-blue-700 dark:text-blue-300" title="AQ Unit">AQ</span>}
                                {m.hasPerfector && <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 border-2 border-surface-light-primary dark:border-surface-dark-primary flex items-center justify-center text-[9px] font-bold text-purple-700 dark:text-purple-300" title="Perfector">PF</span>}
                                {(m.maxColors > 0) && <span className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 border-2 border-surface-light-primary dark:border-surface-dark-primary flex items-center justify-center text-[9px] font-bold text-orange-700 dark:text-orange-300" title="Colors">{m.maxColors}C</span>}
                            </div>

                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button disabled={!canEdit} onClick={() => openEditPanel(m)} className="p-1.5 text-text-light-secondary hover:bg-surface-light-secondary dark:text-text-dark-secondary dark:hover:bg-surface-dark-secondary rounded-lg transition-colors" title="Edit Full Details">
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button disabled={!canEdit} onClick={() => duplicateMachine(m.id)} className="p-1.5 text-text-light-secondary hover:bg-surface-light-secondary dark:text-text-dark-secondary dark:hover:bg-surface-dark-secondary rounded-lg transition-colors" title="Duplicate">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto">
                <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => {
                    exportTabCSV("machine-details.csv",
                        ["Name", "Code", "Type", "Manufacturer", "Model", "Serial", "Year", "MaxSheet", "Speed", "MakeReady", "CTP", "Hourly", "Status", "Uptime%", "Efficiency%"],
                        filtered.map(m => [m.name, m.code, m.type, m.manufacturer, m.model, m.serialNumber, String(m.yearOfManufacture), `${m.maxSheetWidth}x${m.maxSheetHeight}`, String(m.speedSPH), String(m.makeReadyCost), String(m.ctpRate), String(m.hourlyRate), m.operationalStatus, String(m.avgUptimePercent), String(m.avgEfficiencyPercent)]),
                        "Machine details exported."
                    );
                }}
                    onReset={() => { }}
                    canEdit={canEdit} itemCount={filtered.length} tabName="machine detail"
                />
            </div>

            {/* GOD-LEVEL MEGA FORM PANEL */}
            <SlidingSidePanel title={`${editData.name ? `Editing: ${editData.name}` : 'Machine Details Editor'}`} isOpen={!!editMode} onClose={() => { setEditMode(null); setEditData({}) }}>
                <div className="space-y-8 pb-20">
                    {/* Basic Info Section */}
                    <div className="bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/20 p-6 rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center">
                                <Cpu className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Basic Information</h3>
                                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Core details, identification, and operational status.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                            <F label="Machine Name" field="name" required />
                            <F label="Code / ID" field="code" required />
                            <F label="Type" field="type" type="select-type" />
                            <F label="Manufacturer" field="manufacturer" />
                            <F label="Model" field="model" />
                            <F label="Serial Number" field="serialNumber" />
                            <F label="Year of Manufacture" field="yearOfManufacture" type="number" />
                            <F label="Location / Bay" field="location" />
                            <F label="Primary Operator" field="operatorName" />
                            <F label="Operational Status" field="operationalStatus" type="select-status" />
                            <div className="lg:col-span-2">
                                <F label="Description / Notes" field="description" type="textarea" />
                            </div>
                        </div>
                    </div>

                    {/* Sheet & Specs Section */}
                    <div className="bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/20 p-6 rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-info-100 dark:bg-info-500/20 flex items-center justify-center">
                                <Settings className="w-5 h-5 text-info-600 dark:text-info-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Technical Specifications</h3>
                                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Dimensions, capabilities, and print specifications.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                            {/* Sheet Dimensions */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Sheet Capacity</h4>
                            </div>
                            <F label="Max Sheet Width (in)" field="maxSheetWidth" type="number" />
                            <F label="Max Sheet Height (in)" field="maxSheetHeight" type="number" />
                            <F label="Min Sheet Width (in)" field="minSheetWidth" type="number" />
                            <F label="Min Sheet Height (in)" field="minSheetHeight" type="number" />

                            {/* Capabilities */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2 mt-4">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Print Capabilities</h4>
                            </div>
                            <F label="Max Print Colors" field="maxColors" type="number" />
                            <F label="Rated Speed (SPH)" field="speedSPH" type="number" />
                            <F label="Has AQ Coating Unit" field="hasAQUnit" type="checkbox" />
                            <F label="Has Perfector" field="hasPerfector" type="checkbox" />

                            <F label="Max Paper Weight (gsm)" field="maxPaperWeight" type="number" />
                            <F label="Min Paper Weight (gsm)" field="minPaperWeight" type="number" />
                            <F label="Plate Size Structure" field="plateSize" />
                            <div className="hidden lg:block"></div>

                            {/* Margins */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2 mt-4">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Physical Margins (mm)</h4>
                            </div>
                            <F label="Gripper Margin" field="gripperMargin" type="number" />
                            <F label="Tail Margin" field="tailMargin" type="number" />
                            <F label="Side Margin" field="sideMargin" type="number" />
                        </div>
                    </div>

                    {/* Financial & Cost Section */}
                    <div className="bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/20 p-6 rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-success-100 dark:bg-success-500/20 flex items-center justify-center">
                                <DollarSign className="w-5 h-5 text-success-600 dark:text-success-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Financial & Costing Data</h3>
                                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Crucial metrics used deeply in the estimation calculation engine.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                            {/* Operational Rates */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Operational Rates</h4>
                            </div>
                            <F label="Hourly Run Rate" field="hourlyRate" type="number" />
                            <F label="Make Ready Cost" field="makeReadyCost" type="number" />
                            <F label="Make Ready Time (hrs)" field="makeReadyTime" type="number" />
                            <F label="CTP Rate / Plate" field="ctpRate" type="number" />
                            <F label="Washing Cost" field="washingCost" type="number" />
                            <F label="Ink Cost / Hour" field="inkCostPerHour" type="number" />

                            {/* Asset Value */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2 mt-4">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Asset Valuation</h4>
                            </div>
                            <F label="Initial Purchase Cost" field="purchaseCost" type="number" />
                            <F label="Current Book Value" field="currentValue" type="number" />
                            <F label="Depreciation Rate (%)" field="depreciationRate" type="number" />

                            {/* Utilities */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2 mt-4">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Utilities & Overhead</h4>
                            </div>
                            <F label="Power Consumption (KW)" field="powerConsumptionKW" type="number" />
                            <F label="Electricity Cost / Unit" field="electricityCostPerUnit" type="number" />
                            <F label="Maint. Cost / Month" field="maintenanceCostPerMonth" type="number" />
                        </div>
                    </div>

                    {/* Maintenance & Insurance Section */}
                    <div className="bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/20 p-6 rounded-2xl border border-surface-light-border dark:border-surface-dark-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-500/20 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary">Maintenance & Coverage</h3>
                                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">Service schedules, performance metrics, and insurance.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
                            {/* Maintenance */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Service Schedule</h4>
                            </div>
                            <F label="Last Maintenance Date" field="lastMaintenanceDate" type="date" />
                            <F label="Next Maintenance Date" field="nextMaintenanceDate" type="date" />
                            <F label="Maint. Interval (Days)" field="maintenanceIntervalDays" type="number" />
                            <F label="Hours Until Service" field="hoursUntilService" type="number" />
                            <div className="lg:col-span-4">
                                <F label="Maintenance Logs & Notes" field="maintenanceNotes" type="textarea" />
                            </div>

                            {/* Performance metrics */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2 mt-4">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Performance Metrics</h4>
                            </div>
                            <F label="Total Running Hours" field="totalRunningHours" type="number" />
                            <F label="Standard Shift (hrs)" field="shiftCapacity" type="number" />
                            <F label="Avg Uptime (%)" field="avgUptimePercent" type="number" />
                            <F label="Avg Efficiency (%)" field="avgEfficiencyPercent" type="number" />

                            {/* Insurance & Warranty */}
                            <div className="col-span-full border-b border-surface-light-border dark:border-surface-dark-border pb-2 mb-2 mt-4 flex items-center gap-2">
                                <h4 className="text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider">Coverage</h4>
                                <Shield className="w-3 h-3 text-danger-500" />
                            </div>
                            <F label="Insurance Provider" field="insuranceProvider" />
                            <F label="Insurance Expiry Date" field="insuranceExpiry" type="date" />
                            <F label="Annual Premium" field="insurancePremium" type="number" />
                            <F label="Warranty Expiry Date" field="warrantyExpiry" type="date" />
                        </div>
                    </div>
                </div>

                {/* Floating Action Bar */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-surface-light-primary/95 dark:bg-surface-dark-primary/95 backdrop-blur-md border-t border-surface-light-border dark:border-surface-dark-border flex justify-between items-center z-20">
                    <button onClick={() => {
                        if (window.confirm("Are you sure you want to delete this machine? This action cannot be undone.")) {
                            deleteMachine(editMode!);
                            setEditMode(null);
                            addNotification({ type: "info", title: "Deleted", message: "Machine removed.", category: "system" });
                        }
                    }} className="btn-secondary text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 border-transparent shadow-none gap-2">
                        <Trash2 className="w-4 h-4" /> Delete Machine
                    </button>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setEditMode(null)} className="btn-secondary px-6">Cancel</button>
                        <button onClick={saveEdit} className="btn-primary px-8 shadow-lg shadow-primary-500/20">
                            <Save className="w-4 h-4 mr-2" /> Save Configuration
                        </button>
                    </div>
                </div>
            </SlidingSidePanel>

            <AddItemModal title="Add New Machine" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    <FormField label="Machine Name" required><input className="input-field" value={newMachine.name || ""} onChange={e => setNewMachine(n => ({ ...n, name: e.target.value }))} placeholder="e.g. Speedmaster CD-102" /></FormField>
                    <FormField label="Identifier Code" required><input className="input-field" value={newMachine.code || ""} onChange={e => setNewMachine(n => ({ ...n, code: e.target.value }))} placeholder="e.g. MAC-001" /></FormField>

                    <FormField label="Equipment Type">
                        <select className="input-field" value={newMachine.type || "offset"} onChange={e => setNewMachine(n => ({ ...n, type: e.target.value as any }))}>
                            <option value="offset">Offset Press</option><option value="digital">Digital Press</option><option value="flexo">Flexo Press</option>
                            <option value="gravure">Gravure</option><option value="screen">Screen Print</option><option value="cutting">Die Cutting / Guillotine</option>
                            <option value="folding">Folding Machine</option><option value="binding">Binding Line</option><option value="lamination">Laminator</option>
                        </select>
                    </FormField>
                    <FormField label="Manufacturer"><input className="input-field" value={newMachine.manufacturer || ""} onChange={e => setNewMachine(n => ({ ...n, manufacturer: e.target.value }))} placeholder="e.g. Heidelberg" /></FormField>

                    <div className="col-span-full grid grid-cols-3 gap-5 border-t border-surface-light-border dark:border-surface-dark-border pt-5 mt-2">
                        <FormField label="Max Colors"><input type="number" className="input-field" value={newMachine.maxColors || 4} onChange={e => setNewMachine(n => ({ ...n, maxColors: +e.target.value }))} /></FormField>
                        <FormField label="Rated Speed (SPH)"><input type="number" className="input-field" value={newMachine.speedSPH || ""} onChange={e => setNewMachine(n => ({ ...n, speedSPH: +e.target.value }))} /></FormField>
                        <FormField label="Hourly Rate"><input type="number" className="input-field border-primary-500/30 bg-primary-50/10 dark:bg-primary-500/5 focus:border-primary-500" value={newMachine.hourlyRate || ""} onChange={e => setNewMachine(n => ({ ...n, hourlyRate: +e.target.value }))} placeholder="$0.00" /></FormField>
                    </div>
                </div>

                <div className="bg-info-50 dark:bg-info-500/10 border border-info-200 dark:border-info-500/20 rounded-xl p-4 text-sm text-info-800 dark:text-info-300 mb-6 flex items-start gap-3">
                    <Activity className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold mb-1">God-Level Configuration Available</p>
                        <p className="text-xs opacity-80">You can configure 40+ advanced technical, financial, and maintenance parameters for this machine after creating it by clicking the 'Settings' icon on its card.</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                    <button onClick={() => setShowAdd(false)} className="btn-secondary px-5">Cancel</button>
                    <button
                        onClick={() => {
                            if (newMachine.name && newMachine.code) {
                                addMachine(newMachine);
                                setNewMachine({});
                                setShowAdd(false);
                                addNotification({ type: "success", title: "Machine Added", message: `${newMachine.name} has been added successfully. Configure advanced settings now.`, category: "system" });
                            }
                        }}
                        className="btn-primary px-6"
                        disabled={!newMachine.name || !newMachine.code}
                    >
                        Create Machine Instance
                    </button>
                </div>
            </AddItemModal>
        </div>
    );
}
