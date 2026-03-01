import React from 'react';
import { Machine } from '@/types/machine.types';
import { useMachineStore } from '@/stores/machineStore';
import { useAppStore } from '@/stores/appStore';
import { saveTextFilePortable } from '@/utils/fileSave';
import { Upload, Download, FileJson, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

export function MachineImportExport() {
    const { machines, importMachines } = useMachineStore();
    const { addNotification, addActivityLog } = useAppStore();

    const handleExportJSON = async () => {
        try {
            const data = JSON.stringify(Array.from(machines.values()), null, 2);
            const path = await saveTextFilePortable(
                {
                    filters: [{ name: "Nuclear Machine Backup", extensions: ["json"] }],
                    defaultPath: `machine-backup-${new Date().toISOString().split('T')[0]}.json`,
                },
                data
            );

            if (!path) return;

            addNotification({
                type: 'success',
                title: 'Deterministic Export Successful',
                message: `Machine state archived to ${path}`,
                category: 'export'
            });

            addActivityLog({
                action: 'MACHINES_EXPORTED',
                category: 'inventory',
                description: `Exported ${machines.size} machine profiles to JSON`,
                user: 'Admin',
                entityType: 'machine',
                entityId: 'all',
                level: 'info'
            });
        } catch (err: any) {
            addNotification({
                type: 'error',
                title: 'Export Failed',
                message: err.message,
                category: 'system'
            });
        }
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const imported = JSON.parse(text) as Machine[];

                if (Array.isArray(imported)) {
                    importMachines(imported, 'JSON', 'REPLACE');
                    addNotification({
                        type: 'success',
                        title: 'Synchronization Complete',
                        message: `Successfully merged ${imported.length} machine profiles`,
                        category: 'import'
                    });
                }
            } catch (err) {
                console.error("Import integrity fail:", err);
                addNotification({
                    type: 'error',
                    title: 'Import Integrity Error',
                    message: `Failed to parse the machine archive: ${err instanceof Error ? err.message : 'Unknown error'}`,
                    category: 'import'
                });
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset input
    };

    return (
        <div className={cn("flex items-center gap-2", "machine-import-export-controls")}>
            <input
                type="file"
                id="machine-import-input"
                className="hidden"
                accept=".json"
                onChange={handleImportJSON}
            />
            <button
                onClick={() => document.getElementById('machine-import-input')?.click()}
                className={cn("btn-secondary text-sm flex items-center gap-1.5", "group")}
                title="Import Machines"
            >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
                <FileJson className="w-3.5 h-3.5 text-text-light-tertiary group-hover:text-primary-500 transition-colors" />
            </button>

            <button
                onClick={handleExportJSON}
                className={cn("btn-secondary text-sm flex items-center gap-1.5", "group")}
                title="Export Machines"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <div className="flex -space-x-1 opacity-60">
                    <FileSpreadsheet className="w-3 h-3" />
                    <ShieldCheck className="w-3 h-3 text-success-500" />
                </div>
            </button>
        </div>
    );
}
