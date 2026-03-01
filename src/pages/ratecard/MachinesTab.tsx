import { useState } from "react";
import { useMachineStore } from "@/stores/machineStore";
import { useAppStore } from "@/stores/appStore";
import { Machine, createDefaultMachine } from "@/types/machine.types";
import { MachineStatus } from "@/types/machine.enums";
import { Plus } from "lucide-react";

import { MachineTable } from "@/components/machines/MachineTable";
import { MachineDetailPanel } from "@/components/machines/MachineDetailPanel";
import { MachineImportExport } from "@/components/machines/MachineImportExport";

// ── Machines Summary Tab ─────────────────────────────────────────────────────
export function MachinesTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { machines, deleteMachine, duplicateMachine, restoreMachine } = useMachineStore();
    const { addNotification } = useAppStore();
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

    const machinesArray = Array.from(machines.values());
    const filtered = machinesArray.filter(m =>
        !m.isArchived && (
            !search ||
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            (m.nickname && m.nickname.toLowerCase().includes(search.toLowerCase()))
        )
    );

    const handleDelete = (id: string) => {
        const m = machines.get(id);
        if (confirm(`CRITICAL: Are you sure you want to PERMANENTLY PURGE the records for ${m?.name}? This action is irreversible.`)) {
            useMachineStore.getState().permanentlyDeleteMachine(id, 'PURGE-MACHINE');
            addNotification({ type: "warning", title: "Record Purged", message: "Machine records physically deleted.", category: "system" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4">
                <MachineImportExport />
                {canEdit && (
                    <button
                        onClick={() => { setSelectedMachine(createDefaultMachine()); }}
                        className="btn-primary text-sm flex items-center gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Machine</span>
                    </button>
                )}
            </div>

            <MachineTable
                machines={filtered}
                onEdit={m => setSelectedMachine(m)}
                onDuplicate={id => duplicateMachine(id)}
                onDelete={id => handleDelete(id)}
                onArchive={id => deleteMachine(id)}
                onRestore={id => restoreMachine(id)}
            />

            {selectedMachine && (
                <MachineDetailPanel
                    machine={selectedMachine}
                    isNew={selectedMachine.id === undefined || selectedMachine.id === ''} // simplified check
                    onSave={(m) => {
                        if (!m.id) {
                            useMachineStore.getState().addMachine(m);
                        } else {
                            useMachineStore.getState().updateMachine(m.id, m);
                        }
                        setSelectedMachine(null);
                        addNotification({ type: 'success', title: 'State Committed', message: 'Machine configuration synchronized.', category: 'system' });
                    }}
                    onCancel={() => setSelectedMachine(null)}
                />
            )}
        </div>
    );
}

// ── Machine Details Tab ──────────────────────────
// In the new architecture, Summary and Details use the same underlying engine.
// We keep the export for compatibility with the parent router.
export const MachineDetailsTab = MachinesTab;
