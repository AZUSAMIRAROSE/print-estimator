import { Machine } from '@/types/machine.types';
import { MachineStatus } from '@/types/machine.enums';
import { cn } from '@/utils/cn';
import { formatCurrency, formatNumber } from '@/utils/format';
import {
    Settings, MoreVertical, Edit3, Copy, Trash2,
    Archive, RotateCcw, Activity
} from 'lucide-react';
import { useState } from 'react';

interface MachineTableProps {
    machines: Machine[];
    onEdit: (machine: Machine) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
    onArchive: (id: string) => void;
    onRestore: (id: string) => void;
}

const STATUS_CONFIG: Record<MachineStatus, { label: string; className: string }> = {
    [MachineStatus.ACTIVE]: {
        label: 'Active',
        className: 'bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400 border-success-200 dark:border-success-500/30'
    },
    [MachineStatus.MAINTENANCE]: {
        label: 'Maintenance',
        className: 'bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 border-warning-200 dark:border-warning-500/30'
    },
    [MachineStatus.INACTIVE]: {
        label: 'Inactive',
        className: 'bg-gray-100 dark:bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30'
    },
    [MachineStatus.PENDING_INSTALLATION]: {
        label: 'Pending',
        className: 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-500/30'
    },
    [MachineStatus.DECOMMISSIONED]: {
        label: 'Retired',
        className: 'bg-danger-100 dark:bg-danger-500/20 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-500/30'
    },
};

export function MachineTable({
    machines, onEdit, onDuplicate, onDelete, onArchive, onRestore
}: MachineTableProps) {
    return (
        <div className="card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                            <th className="py-2.5 px-3 text-left font-semibold text-xs">Machine</th>
                            <th className="py-2.5 px-3 text-left font-semibold text-xs">Specs</th>
                            <th className="py-2.5 px-3 text-left font-semibold text-xs">Status</th>
                            <th className="py-2.5 px-3 text-right font-semibold text-xs">Financials</th>
                            <th className="py-2.5 px-3 text-center font-semibold text-xs">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {machines.map((m) => (
                            <tr
                                key={m.id}
                                className="border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors"
                            >
                                {/* Identity */}
                                <td className="py-2.5 px-3" onClick={() => onEdit(m)}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center border border-primary-100 dark:border-primary-500/20 shrink-0">
                                            <Settings className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-xs text-text-light-primary dark:text-text-dark-primary">
                                                    {m.name}
                                                </span>
                                                {m.isArchived && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 uppercase font-bold tracking-tight">Archived</span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">
                                                {m.nickname || m.manufacturer + ' ' + m.model}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Specs */}
                                <td className="py-2.5 px-3 text-xs" onClick={() => onEdit(m)}>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-text-light-secondary dark:text-text-dark-secondary">
                                            {m.maxSheetWidth_mm}×{m.maxSheetHeight_mm}mm
                                        </span>
                                        <div className="flex items-center gap-1.5 text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">
                                            <span className="font-medium">{m.maxColorsPerPass} Colors</span>
                                            {m.canPerfect && <span className="bg-primary-500/10 text-primary-600 dark:text-primary-400 px-1 rounded uppercase tracking-tight">Perfector</span>}
                                        </div>
                                    </div>
                                </td>

                                {/* Operational State */}
                                <td className="py-2.5 px-3" onClick={() => onEdit(m)}>
                                    <div className="flex flex-col gap-1.5">
                                        <span className={cn(
                                            "inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                                            STATUS_CONFIG[m.status].className
                                        )}>
                                            {STATUS_CONFIG[m.status].label}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-16 h-1 bg-surface-light-border dark:bg-surface-dark-border rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all text-[0px]",
                                                        m.effectiveAvailability_percent > 90 ? "bg-success-500" : m.effectiveAvailability_percent > 75 ? "bg-warning-500" : "bg-danger-500"
                                                    )}
                                                    style={{ width: `${m.effectiveAvailability_percent}%` }}
                                                />
                                            </div>
                                            <span className="text-[9px] text-text-light-tertiary dark:text-text-dark-tertiary">{m.effectiveAvailability_percent}%</span>
                                        </div>
                                    </div>
                                </td>

                                {/* Financials */}
                                <td className="py-2.5 px-3 text-right" onClick={() => onEdit(m)}>
                                    <div className="text-xs font-semibold text-text-light-primary dark:text-text-dark-primary">
                                        {formatCurrency(m.totalHourlyCost)}
                                    </div>
                                    <div className="text-[9px] text-text-light-tertiary dark:text-text-dark-tertiary">
                                        / hr
                                    </div>
                                </td>

                                {/* Actions */}
                                <td className="py-2.5 px-3 text-center">
                                    <div className="flex items-center justify-center gap-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(m); }} className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary group" title="Edit">
                                            <Edit3 className="w-3.5 h-3.5 text-text-light-tertiary group-hover:text-primary-600 transition-colors" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onDuplicate(m.id); }} className="p-1.5 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary group" title="Duplicate">
                                            <Copy className="w-3.5 h-3.5 text-text-light-tertiary group-hover:text-blue-600 transition-colors" />
                                        </button>
                                        <div className="w-px h-3 bg-surface-light-border dark:bg-surface-dark-border mx-1"></div>
                                        {m.isArchived ? (
                                            <button onClick={(e) => { e.stopPropagation(); onRestore(m.id); }} className="p-1.5 rounded-lg hover:bg-success-50 dark:hover:bg-success-500/10 group" title="Restore">
                                                <RotateCcw className="w-3.5 h-3.5 text-success-500" />
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); onArchive(m.id); }} className="p-1.5 rounded-lg hover:bg-warning-50 dark:hover:bg-warning-500/10 group" title="Archive">
                                                <Archive className="w-3.5 h-3.5 text-warning-500" />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(m.id); }} className="p-1.5 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-500/10 group" title="Delete">
                                            <Trash2 className="w-3.5 h-3.5 text-danger-400 group-hover:text-danger-600 transition-colors" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
