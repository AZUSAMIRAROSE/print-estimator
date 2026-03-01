import { useState } from "react";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { formatCurrency, formatNumber } from "@/utils/format";
import {
    Plus, Edit3, Trash2, Save, X, Check, Copy, Download,
    RotateCcw, ChevronDown, ChevronUp, MoreHorizontal, FileCheck, AlertTriangle, Settings
} from "lucide-react";
import type { RateStatus } from "@/stores/rateCardStore";

// ── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: RateStatus }) {
    return (
        <span className={cn("badge text-[10px]",
            status === "active" ? "badge-success" : status === "draft" ? "badge-warning" : "badge-danger"
        )}>
            {status}
        </span>
    );
}

// ── Tab Action Bar ───────────────────────────────────────────────────────────
export function TabActionBar({
    onAdd, onExport, onReset, onSave, canEdit, itemCount, tabName, hasChanges
}: {
    onAdd: () => void; onExport: () => void; onReset: () => void;
    onSave?: () => void; canEdit: boolean; itemCount: number;
    tabName: string; hasChanges?: boolean;
}) {
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    return (
        <div className="p-3 border-t border-surface-light-border dark:border-surface-dark-border flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    {itemCount} {tabName} {itemCount === 1 ? "entry" : "entries"}
                </p>
                {hasChanges && (
                    <span className="text-[10px] text-warning-600 dark:text-warning-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Unsaved changes
                    </span>
                )}
            </div>
            <div className="flex items-center gap-1.5">
                {onSave && hasChanges && (
                    <button onClick={onSave} className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
                        <Save className="w-3.5 h-3.5" /> Save All
                    </button>
                )}
                <button onClick={onExport} className="btn-secondary text-xs flex items-center gap-1 px-2.5 py-1.5">
                    <Download className="w-3.5 h-3.5" /> Export
                </button>
                {showResetConfirm ? (
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-danger-600 dark:text-danger-400">Reset all?</span>
                        <button onClick={() => { onReset(); setShowResetConfirm(false); }} className="p-1 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded">
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setShowResetConfirm(false)} className="p-1 text-text-light-tertiary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button onClick={() => setShowResetConfirm(true)} disabled={!canEdit} className="btn-secondary text-xs flex items-center gap-1 px-2.5 py-1.5 disabled:opacity-40">
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                )}
                <button onClick={onAdd} disabled={!canEdit} className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5 disabled:opacity-40">
                    <Plus className="w-3.5 h-3.5" /> Add New
                </button>
            </div>
        </div>
    );
}

// ── Row Action Buttons ───────────────────────────────────────────────────────
export function RowActions({
    isEditing, canEdit, onEdit, onSave, onCancel, onDelete, onDuplicate
}: {
    isEditing: boolean; canEdit: boolean;
    onEdit: () => void; onSave: () => void; onCancel: () => void;
    onDelete: () => void; onDuplicate?: () => void;
}) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    if (isEditing) {
        return (
            <div className="flex items-center justify-center gap-1">
                <button onClick={onSave} className="p-1 text-success-600 hover:bg-success-50 dark:hover:bg-success-500/10 rounded" title="Save">
                    <Check className="w-4 h-4" />
                </button>
                <button onClick={onCancel} className="p-1 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded" title="Cancel">
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }

    if (showDeleteConfirm) {
        return (
            <div className="flex items-center justify-center gap-1">
                <span className="text-[10px] text-danger-500">Delete?</span>
                <button onClick={() => { onDelete(); setShowDeleteConfirm(false); }} className="p-1 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded">
                    <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} className="p-1 text-text-light-tertiary hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center gap-0.5">
            <button disabled={!canEdit} onClick={onEdit} className="p-1 hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded disabled:opacity-40" title="Edit">
                <Edit3 className="w-3.5 h-3.5 text-text-light-tertiary" />
            </button>
            {onDuplicate && (
                <button disabled={!canEdit} onClick={onDuplicate} className="p-1 hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded disabled:opacity-40" title="Duplicate">
                    <Copy className="w-3.5 h-3.5 text-text-light-tertiary" />
                </button>
            )}
            <button disabled={!canEdit} onClick={() => setShowDeleteConfirm(true)} className="p-1 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded disabled:opacity-40" title="Delete">
                <Trash2 className="w-3.5 h-3.5 text-danger-400" />
            </button>
        </div>
    );
}

// ── Editable Cell ────────────────────────────────────────────────────────────
export function EditableCell({
    value, isEditing, onChange, type = "text", className = "", align = "left"
}: {
    value: string | number; isEditing: boolean;
    onChange: (val: string) => void; type?: "text" | "number";
    className?: string; align?: "left" | "right" | "center";
}) {
    if (!isEditing) {
        return (
            <span className={cn(
                align === "right" && "text-right block",
                align === "center" && "text-center block",
                className
            )}>
                {type === "number" && typeof value === "number" ? (value >= 1000 ? formatNumber(value) : String(value)) : String(value)}
            </span>
        );
    }

    return (
        <input
            type={type}
            defaultValue={value}
            onChange={e => onChange(e.target.value)}
            className={cn("input-field text-xs py-1 px-2", type === "number" ? "w-24 text-right" : "w-full min-w-[80px]")}
        />
    );
}

// ── Currency Display ─────────────────────────────────────────────────────────
export function CurrencyCell({ value, isEditing, onChange }: {
    value: number; isEditing: boolean; onChange: (val: string) => void;
}) {
    if (!isEditing) return <span className="text-right block">{formatCurrency(value)}</span>;
    return <input type="number" defaultValue={value} onChange={e => onChange(e.target.value)} className="input-field w-24 text-right text-xs py-1 px-2" />;
}

// ── Section Header in Tables ─────────────────────────────────────────────────
export function SectionHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-light-secondary dark:bg-surface-dark-secondary border-b border-surface-light-border dark:border-surface-dark-border">
            <div className="flex flex-1 items-center gap-3">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{title}</h3>
                {count !== undefined && (
                    <span className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">{count} items</span>
                )}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

// ── Table Header ─────────────────────────────────────────────────────────────
export function TH({ children, align = "left", className = "" }: {
    children: React.ReactNode; align?: "left" | "right" | "center"; className?: string;
}) {
    return (
        <th className={cn("py-3 px-4 font-semibold text-text-light-primary dark:text-text-dark-primary text-xs",
            align === "right" && "text-right", align === "center" && "text-center", className
        )}>
            {children}
        </th>
    );
}

// ── Table Row ────────────────────────────────────────────────────────────────
export function TR({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <tr className={cn("border-b border-surface-light-border/50 dark:border-surface-dark-border/50 hover:bg-surface-light-secondary dark:hover:bg-surface-dark-tertiary transition-colors", className)}>
            {children}
        </tr>
    );
}

export function TD({ children, className = "", align = "left" }: {
    children: React.ReactNode; className?: string; align?: "left" | "right" | "center";
}) {
    return (
        <td className={cn("py-2.5 px-4 text-sm", align === "right" && "text-right", align === "center" && "text-center", className)}>
            {children}
        </td>
    );
}

// ── Sliding Side Panel (God-Level Editor) ───────────────────────────────────
export function SlidingSidePanel({
    title, isOpen, onClose, children, width = "max-w-4xl"
}: {
    title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode; width?: string;
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className={cn("bg-surface-light-primary dark:bg-surface-dark-primary h-full w-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300", width)}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary dark:bg-surface-dark-secondary">
                    <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                        <Settings className="w-6 h-6 text-primary-600" /> {title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded-xl transition-colors">
                        <X className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ── Add Item Modal ───────────────────────────────────────────────────────────
export function AddItemModal({
    title, isOpen, onClose, children
}: {
    title: string; isOpen: boolean; onClose: () => void; children: React.ReactNode;
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-surface-light-primary dark:bg-surface-dark-primary rounded-2xl shadow-2xl border border-surface-light-border dark:border-surface-dark-border w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-secondary dark:bg-surface-dark-secondary">
                    <h2 className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary-600" /> {title}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary rounded-lg transition-colors">
                        <X className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
                    </button>
                </div>
                <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ── Form Field ───────────────────────────────────────────────────────────────
export function FormField({ label, required, children, hint }: {
    label: string; required?: boolean; children: React.ReactNode; hint?: string;
}) {
    return (
        <div>
            <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                {label} {required && <span className="text-danger-500">*</span>}
            </label>
            {children}
            {hint && <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">{hint}</p>}
        </div>
    );
}

// ── Export helper ─────────────────────────────────────────────────────────────
export async function exportTabCSV(filename: string, headers: string[], rows: string[][], customSuccessMessage?: string) {
    try {
        const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
        const filePath = await save({
            filters: [{ name: 'CSV File', extensions: ['csv'] }],
            defaultPath: filename,
        });

        if (!filePath) return;

        await writeTextFile(filePath, csv);
        const { addNotification } = useAppStore.getState();
        addNotification({
            type: "success",
            title: "Exported Successfully",
            message: customSuccessMessage || `Saved to ${filePath}`,
            category: "export"
        });
    } catch (error: any) {
        const { addNotification } = useAppStore.getState();
        addNotification({
            type: "error",
            title: "Export Failed",
            message: error.message || "Failed to export CSV.",
            category: "system"
        });
    }
}
