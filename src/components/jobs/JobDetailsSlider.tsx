import { useState, useMemo, useEffect } from "react";
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";
import { useDataStore } from "@/stores/dataStore";
import { useAppStore } from "@/stores/appStore";
import { cn } from "@/utils/cn";
import {
    X, Briefcase, Calendar, Clock, User, Tag, FileText,
    CreditCard, Truck, Settings, FileDigit, Box,
} from "lucide-react";
import type { Job } from "@/types";

interface JobDetailsSliderProps {
    jobId: string;
    isOpen: boolean;
    onClose: () => void;
    onEditJob: (id: string, updates: Partial<Job>) => void;
}

const STATUS_OPTIONS = [
    { value: "draft", label: "Draft", color: "text-gray-700 bg-gray-100 dark:bg-gray-400 dark:text-gray-300" },
    { value: "estimated", label: "Estimated", color: "text-blue-700 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400" },
    { value: "quoted", label: "Quoted", color: "text-amber-700 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400" },
    { value: "in_production", label: "In Production", color: "text-purple-700 bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400" },
    { value: "completed", label: "Completed", color: "text-green-700 bg-green-100 dark:bg-green-500/10 dark:text-green-400" },
    { value: "cancelled", label: "Cancelled", color: "text-red-700 bg-red-100 dark:bg-red-500/10 dark:text-red-400" }
];

export function JobDetailsSlider({ jobId, isOpen, onClose, onEditJob }: JobDetailsSliderProps) {
    const { getJob } = useDataStore();
    const { settings } = useAppStore();
    const job = getJob(jobId);

    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<Partial<Job>>({});

    useEffect(() => {
        if (job) {
            setFormData({
                title: job.title,
                customerName: job.customerName,
                totalValue: job.totalValue,
                status: job.status,
                dueDate: job.dueDate || "",
                assignedTo: job.assignedTo || "",
                tags: job.tags || [],
                notes: job.notes || ""
            });
            setEditMode(false);
        }
    }, [job, isOpen]);

    if (!isOpen || !job) return null;

    const result = job.results?.[0]; // Default to first quantity result

    const handleSave = () => {
        onEditJob(job.id, formData);
        setEditMode(false);
    };

    const currentStatusConfig = STATUS_OPTIONS.find(s => s.value === (editMode ? formData.status : job.status));

    return (
        <>
            <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm dark:bg-black/40 transition-opacity"
                onClick={onClose}
            />
            <div className={cn(
                "fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-surface-dark-secondary shadow-2xl transition-transform duration-300 ease-in-out transform flex flex-col border-l border-border-light dark:border-border-dark",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-brand-50 dark:bg-brand-500/10 rounded-xl">
                            <Briefcase className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
                                    {job.jobNumber}
                                </h2>
                                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase", currentStatusConfig?.color)}>
                                    {currentStatusConfig?.label}
                                </span>
                            </div>
                            {editMode ? (
                                <input
                                    type="text"
                                    value={formData.title || ""}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="input-field py-1 px-2 h-8 text-sm w-full mt-1 mb-1 font-medium bg-transparent"
                                    placeholder="Job Title"
                                />
                            ) : (
                                <p className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                                    {job.title}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {!editMode ? (
                            <button onClick={() => setEditMode(true)} className="btn-secondary text-sm h-9">
                                Edit Details
                            </button>
                        ) : (
                            <button onClick={handleSave} className="btn-primary text-sm h-9">
                                Save Changes
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-text-light-tertiary transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Metadata Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider flex items-center gap-2">
                            <FileDigit className="w-4 h-4 text-brand-500" /> Job Overview
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="card p-4 bg-surface-light-secondary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark shadow-none">
                                <label className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-secondary block mb-1">Customer</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.customerName || ""}
                                        onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                                        className="input-field py-1 px-2 h-8 text-sm w-full"
                                        placeholder="Customer Name"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                        <User className="w-4 h-4 text-text-light-tertiary" /> {job.customerName}
                                    </div>
                                )}
                            </div>

                            <div className="card p-4 bg-surface-light-secondary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark shadow-none">
                                <label className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-secondary block mb-1">Total Value Override</label>
                                {editMode ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-text-light-tertiary">{job.currency}</span>
                                        <input
                                            type="number"
                                            value={formData.totalValue || ""}
                                            onChange={e => setFormData({ ...formData, totalValue: Number(e.target.value) })}
                                            className="input-field py-1 px-2 h-8 text-sm w-full"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                        <CreditCard className="w-4 h-4 text-text-light-tertiary" /> {formatCurrency(job.totalValue, job.currency)}
                                    </div>
                                )}
                            </div>

                            <div className="card p-4 bg-surface-light-secondary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark shadow-none">
                                <label className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-secondary block mb-1">Due Date</label>
                                {editMode ? (
                                    <input
                                        type="date"
                                        value={formData.dueDate ? formData.dueDate.split('T')[0] : ""}
                                        onChange={e => setFormData({ ...formData, dueDate: new Date(e.target.value).toISOString() })}
                                        className="input-field py-1 px-2 h-8 text-sm w-full"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                        <Calendar className="w-4 h-4 text-text-light-tertiary" />
                                        {job.dueDate ? formatDate(job.dueDate) : "Not Set"}
                                    </div>
                                )}
                            </div>

                            <div className="card p-4 bg-surface-light-secondary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark shadow-none">
                                <label className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-secondary block mb-1">Assigned To</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.assignedTo || ""}
                                        onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                                        placeholder="E.g., Production Team"
                                        className="input-field py-1 px-2 h-8 text-sm w-full"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                        <User className="w-4 h-4 text-text-light-tertiary" /> {job.assignedTo || "Unassigned"}
                                    </div>
                                )}
                            </div>

                            <div className="card p-4 bg-surface-light-secondary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark shadow-none">
                                <label className="text-xs font-semibold text-text-light-tertiary dark:text-text-dark-secondary block mb-1">Status</label>
                                {editMode ? (
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                        className="input-field py-1 px-2 h-8 text-sm w-full"
                                    >
                                        {STATUS_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary capitalize">
                                        {job.status.replace("_", " ")}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tags & Notes */}
                        {editMode && (
                            <div className="space-y-3 mt-4">
                                <div>
                                    <label className="text-xs font-bold text-text-light-secondary block mb-1">Tags (comma separated)</label>
                                    <input
                                        type="text"
                                        value={(formData.tags || []).join(", ")}
                                        onChange={e => setFormData({ ...formData, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                                        className="input-field text-sm"
                                        placeholder="urgent, premium, reprint..."
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-text-light-secondary block mb-1">Notes</label>
                                    <textarea
                                        value={formData.notes || ""}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        className="input-field text-sm min-h-[80px]"
                                        placeholder="Add production notes..."
                                    />
                                </div>
                            </div>
                        )}

                        {!editMode && job.tags && job.tags.length > 0 && (
                            <div className="flex gap-2 mt-4 px-1">
                                {job.tags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 px-2 py-1 rounded-md">
                                        <Tag className="w-3 h-3" /> {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {!editMode && job.notes && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg mt-4 text-sm text-yellow-800 dark:text-yellow-200">
                                <span className="font-bold flex items-center gap-1.5 mb-1"><FileText className="w-4 h-4" /> Notes:</span>
                                {job.notes}
                            </div>
                        )}
                    </div>

                    <hr className="border-border-light dark:border-border-dark" />

                    {/* Book Specs */}
                    {job.bookSpec ? (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider flex items-center gap-2">
                                <Box className="w-4 h-4 text-indigo-500" /> Book Specifications
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 rounded-lg bg-surface-light-tertiary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark">
                                    <span className="block text-[10px] font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase mb-0.5">Trim Size</span>
                                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                        {job.bookSpec.widthMM} × {job.bookSpec.heightMM} mm
                                    </span>
                                </div>
                                <div className="p-3 rounded-lg bg-surface-light-tertiary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark">
                                    <span className="block text-[10px] font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase mb-0.5">Total Pages</span>
                                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                        {job.bookSpec.totalPages}
                                    </span>
                                </div>
                                <div className="p-3 rounded-lg bg-surface-light-tertiary dark:bg-surface-dark-tertiary border border-border-light dark:border-border-dark">
                                    <span className="block text-[10px] font-bold text-text-light-tertiary dark:text-text-dark-tertiary uppercase mb-0.5">Spine Thickness</span>
                                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                                        {job.bookSpec.spineThickness?.toFixed(1) || 0} mm
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-text-light-tertiary italic">Book Specification Details Not Available</div>
                    )}

                    {/* Detailed Financial Breakdown from Estimation Results */}
                    {result && (
                        <div className="space-y-4 pb-8">
                            <h3 className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-green-500" /> Estimation Financials
                            </h3>

                            <div className="card overflow-hidden">
                                <div className="bg-surface-light-secondary dark:bg-surface-dark-secondary p-4 flex justify-between items-center border-b border-border-light dark:border-border-dark">
                                    <span className="text-sm font-bold text-text-light-secondary dark:text-text-dark-secondary">Cost Calculation for {formatNumber(result.quantity || 0)} copies</span>
                                    <span className="text-xl font-black text-brand-600 dark:text-brand-400">{formatCurrency(result.grandTotal || 0, job.currency)}</span>
                                </div>

                                <div className="p-4 space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-border-light/50 dark:border-border-dark/50">
                                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Paper Cost</span>
                                        <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{formatCurrency(result.totalPaperCost || 0, job.currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border-light/50 dark:border-border-dark/50">
                                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Printing Cost</span>
                                        <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{formatCurrency(result.totalPrintingCost || 0, job.currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border-light/50 dark:border-border-dark/50">
                                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Binding Cost</span>
                                        <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{formatCurrency(result.bindingCost || 0, job.currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border-light/50 dark:border-border-dark/50">
                                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Finishing Cost</span>
                                        <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{formatCurrency(result.finishingCost || 0, job.currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-border-light/50 dark:border-border-dark/50">
                                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Packing & Freight Costs</span>
                                        <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{formatCurrency((result.packingCost || 0) + (result.freightCost || 0), job.currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 bg-brand-50/50 dark:bg-brand-900/10 px-3 rounded-lg mt-3 border border-brand-100 dark:border-brand-900/50">
                                        <span className="text-sm font-bold text-brand-700 dark:text-brand-300">Total Production Cost</span>
                                        <span className="text-lg font-black text-brand-700 dark:text-brand-300">{formatCurrency(result.totalProductionCost || 0, job.currency)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Manufacturing Metrics */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-900/50">
                                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-2">
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Prod. Time</span>
                                    </div>
                                    <p className="text-2xl font-black text-indigo-900 dark:text-indigo-100">
                                        {result.totalMachineHours?.toFixed(1) || 0} <span className="text-sm font-medium text-indigo-600/70 dark:text-indigo-400/70">hrs</span>
                                    </p>
                                    <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-1">Total machine hours</p>
                                </div>

                                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-900/20 border border-purple-100 dark:border-purple-900/50">
                                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                                        <Truck className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase">Total Weight</span>
                                    </div>
                                    <p className="text-2xl font-black text-purple-900 dark:text-purple-100">
                                        {formatNumber(result.totalWeight || 0)} <span className="text-sm font-medium text-purple-600/70 dark:text-purple-400/70">kg</span>
                                    </p>
                                    <p className="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">Approximate shipment weight</p>
                                </div>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
