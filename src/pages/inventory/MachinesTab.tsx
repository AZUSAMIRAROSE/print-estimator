import { useState } from "react";
import { useMachineStore } from "@/stores/machineStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/format";
import { Machine, createDefaultMachine } from "@/types/machine.types";
import { MachineStatus } from "@/types/machine.enums";
import { Plus, Settings, Trash2, Archive, Activity as Pulse } from "lucide-react";

import { MachineTable } from "@/components/machines/MachineTable";
import { MachineDetailPanel } from "@/components/machines/MachineDetailPanel";
import { MachineImportExport } from "@/components/machines/MachineImportExport";

export function MachinesTab() {
    const {
        machines, addMachine, updateMachine, deleteMachine,
        duplicateMachine, restoreMachine
    } = useMachineStore();
    const { addNotification } = useAppStore();

    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const machinesArray = Array.from(machines.values());
    const activeMachines = machinesArray.filter(m => !m.isArchived);
    const archivedMachinesCount = machinesArray.filter(m => m.isArchived).length;

    const totalAssetValue = machinesArray.reduce((sum, m) => sum + (m.currentBookValue || 0), 0);
    const operationalCount = machinesArray.filter(m => m.status === MachineStatus.ACTIVE).length;

    const handleSave = (machine: Machine) => {
        if (isAdding) {
            addMachine(machine);
            addNotification({
                type: "success",
                title: "Machine Commissioned",
                message: `${machine.name} has been added to the active fleet.`,
                category: "system"
            });
        } else {
            updateMachine(machine.id, machine);
            addNotification({
                type: "success",
                title: "Configuration Synchronized",
                message: `Updated parameters for ${machine.name} committed.`,
                category: "system"
            });
        }
        setIsAdding(false);
        setSelectedMachine(null);
    };

    const handleDelete = (id: string) => {
        const m = machines.get(id);
        if (confirm(`CRITICAL: Are you sure you want to PERMANENTLY PURGE the records for ${m?.name}? This action is irreversible.`)) {
            useMachineStore.getState().permanentlyDeleteMachine(id, 'PURGE-MACHINE');
            addNotification({ type: "warning", title: "Record Purged", message: "Machine records physically deleted.", category: "system" });
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* High-Level Fleet Intelligence */}
            <div className="grid grid-cols-4 gap-3">
                {[
                    { label: "Fleet Size", value: activeMachines.length, sub: `${archivedMachinesCount} Archived`, icon: <Settings className="w-5 h-5" />, color: "text-primary-600 dark:text-primary-400", bg: "bg-primary-50 dark:bg-primary-500/10" },
                    { label: "Active State", value: operationalCount, sub: "Machines online", icon: <Pulse className="w-5 h-5" />, color: "text-success-600 dark:text-success-400", bg: "bg-success-50 dark:bg-success-500/10" },
                    { label: "Maintenance", value: machinesArray.filter(m => m.status === MachineStatus.MAINTENANCE).length, sub: "Requires attention", icon: <Pulse className="w-5 h-5" />, color: "text-warning-600 dark:text-warning-400", bg: "bg-warning-50 dark:bg-warning-500/10" },
                    { label: "Total Book Value", value: formatCurrency(totalAssetValue), sub: "Asset Valuation", icon: <Trash2 className="w-5 h-5" />, color: "text-primary-600 dark:text-primary-400", bg: "bg-primary-50 dark:bg-primary-500/10" },
                ].map(c => (
                    <div key={c.label} className="card p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <div className={`p-1.5 rounded-lg ${c.bg}`}>{c.icon}</div>
                            <p className="text-[10px] uppercase font-semibold text-text-light-tertiary dark:text-text-dark-tertiary tracking-wider">{c.label}</p>
                        </div>
                        <div className="flex items-end gap-2">
                            <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
                            <span className="text-[10px] text-text-light-tertiary mb-1">{c.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center gap-4">
                <MachineImportExport />

                <button
                    onClick={() => { setIsAdding(true); setSelectedMachine(createDefaultMachine()); }}
                    className="btn-primary text-sm flex items-center gap-1.5"
                >
                    <Plus className="w-4 h-4" />
                    <span>Deploy Machine</span>
                </button>
            </div>

            {/* Main Table */}
            <MachineTable
                machines={activeMachines}
                onEdit={m => { setSelectedMachine(m); setIsAdding(false); }}
                onDuplicate={id => duplicateMachine(id)}
                onDelete={id => handleDelete(id)}
                onArchive={id => deleteMachine(id)}
                onRestore={id => restoreMachine(id)}
            />

            {/* Archived Section */}
            {archivedMachinesCount > 0 && (
                <div className="space-y-3 pt-4 border-t border-surface-light-border dark:border-surface-dark-border mt-6">
                    <div className="flex items-center gap-2 pl-1">
                        <Archive className="w-4 h-4 text-text-light-tertiary" />
                        <h3 className="text-xs font-semibold uppercase text-text-light-tertiary">Archived Records</h3>
                    </div>
                    <MachineTable
                        machines={machinesArray.filter(m => m.isArchived)}
                        onEdit={m => setSelectedMachine(m)}
                        onDuplicate={id => duplicateMachine(id)}
                        onDelete={id => handleDelete(id)}
                        onArchive={id => deleteMachine(id)}
                        onRestore={id => restoreMachine(id)}
                    />
                </div>
            )}

            {/* Editing Logic */}
            {(selectedMachine || isAdding) && (
                <MachineDetailPanel
                    machine={selectedMachine!}
                    isNew={isAdding}
                    onSave={handleSave}
                    onCancel={() => { setSelectedMachine(null); setIsAdding(false); }}
                />
            )}
        </div>
    );
}
