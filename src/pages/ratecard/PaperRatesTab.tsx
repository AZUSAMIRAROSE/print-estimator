import { useState } from "react";
import { useRateCardStore, type PaperRateEntry } from "@/stores/rateCardStore";
import { formatCurrency } from "@/utils/format";
import { cn } from "@/utils/cn";
import {
    TabActionBar, RowActions, StatusBadge, AddItemModal, FormField, TH, TR, TD, exportTabCSV
} from "./RateCardShared";
import { useAppStore } from "@/stores/appStore";

export function PaperRatesTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { paperRates, addPaperRate, updatePaperRate, deletePaperRate, duplicatePaperRate, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<PaperRateEntry>>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState<Partial<PaperRateEntry>>({});
    const [sortField, setSortField] = useState<string>("paperType");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const filtered = paperRates
        .filter(r => !search || r.paperType.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase()) || r.size.includes(search))
        .sort((a, b) => {
            const av = (a as any)[sortField], bv = (b as any)[sortField];
            if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
            return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });

    const handleSort = (field: string) => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
    };

    const startEdit = (r: PaperRateEntry) => { setEditingId(r.id); setEditData({ ...r }); };
    const cancelEdit = () => { setEditingId(null); setEditData({}); };
    const saveEdit = () => {
        if (editingId) {
            updatePaperRate(editingId, editData);
            addNotification({ type: "success", title: "Paper Rate Updated", message: `${editData.paperType || ""} rate saved.`, category: "system" });
        }
        cancelEdit();
    };

    const handleAdd = () => {
        if (!newItem.paperType || !newItem.code) return;
        const margin = (newItem.chargeRate && newItem.landedCost && newItem.landedCost > 0)
            ? Math.round(((newItem.chargeRate - newItem.landedCost) / newItem.landedCost) * 100) : 0;
        addPaperRate({ ...newItem, marginPercent: margin, effectiveRate: newItem.chargeRate || 0 });
        addNotification({ type: "success", title: "Paper Rate Added", message: `${newItem.paperType} added.`, category: "system" });
        setNewItem({});
        setShowAdd(false);
    };

    const handleExport = () => {
        exportTabCSV("paper-rates.csv",
            ["Paper Type", "Code", "GSM", "Size", "Landed Cost", "Charge Rate", "Rate/Kg", "Supplier", "MOQ", "HSN", "Margin%", "Status", "Notes"],
            filtered.map(r => [r.paperType, r.code, String(r.gsm), r.size, String(r.landedCost), String(r.chargeRate), String(r.ratePerKg), r.supplier, String(r.moq), r.hsnCode, String(r.marginPercent), r.status, r.notes]),
            "Paper rates exported as CSV."
        );
    };

    const SortIcon = ({ field }: { field: string }) => (
        <span className="ml-1 text-[10px] opacity-50">{sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "↕"}</span>
    );

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                            <TH><button onClick={() => handleSort("paperType")} className="flex items-center">Paper Type<SortIcon field="paperType" /></button></TH>
                            <TH><button onClick={() => handleSort("code")} className="flex items-center">Code<SortIcon field="code" /></button></TH>
                            <TH align="right"><button onClick={() => handleSort("gsm")} className="flex items-center justify-end">GSM<SortIcon field="gsm" /></button></TH>
                            <TH align="center">Size</TH>
                            <TH align="right"><button onClick={() => handleSort("landedCost")} className="flex items-center justify-end">Landed Cost<SortIcon field="landedCost" /></button></TH>
                            <TH align="right"><button onClick={() => handleSort("chargeRate")} className="flex items-center justify-end">Charge Rate<SortIcon field="chargeRate" /></button></TH>
                            <TH align="right">Rate/Kg</TH>
                            <TH align="right">Margin%</TH>
                            <TH>Supplier</TH>
                            <TH align="center">Status</TH>
                            <TH align="center">Actions</TH>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(rate => {
                            const isEditing = editingId === rate.id;
                            return (
                                <TR key={rate.id}>
                                    <TD className="font-medium text-text-light-primary dark:text-text-dark-primary">
                                        {isEditing ? <input defaultValue={rate.paperType} onChange={e => setEditData(d => ({ ...d, paperType: e.target.value }))} className="input-field text-xs py-1 px-2 w-full min-w-[120px]" /> : rate.paperType}
                                    </TD>
                                    <TD className="font-mono text-xs text-text-light-tertiary">
                                        {isEditing ? <input defaultValue={rate.code} onChange={e => setEditData(d => ({ ...d, code: e.target.value }))} className="input-field text-xs py-1 px-2 w-20" /> : rate.code}
                                    </TD>
                                    <TD align="right">
                                        {isEditing ? <input type="number" defaultValue={rate.gsm} onChange={e => setEditData(d => ({ ...d, gsm: +e.target.value }))} className="input-field text-xs py-1 px-2 w-16 text-right" /> : rate.gsm}
                                    </TD>
                                    <TD align="center">
                                        {isEditing ? <input defaultValue={rate.size} onChange={e => setEditData(d => ({ ...d, size: e.target.value }))} className="input-field text-xs py-1 px-2 w-20 text-center" /> : rate.size}
                                    </TD>
                                    <TD align="right">
                                        {isEditing ? <input type="number" defaultValue={rate.landedCost} onChange={e => setEditData(d => ({ ...d, landedCost: +e.target.value }))} className="input-field text-xs py-1 px-2 w-24 text-right" /> : formatCurrency(rate.landedCost)}
                                    </TD>
                                    <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">
                                        {isEditing ? <input type="number" defaultValue={rate.chargeRate} onChange={e => setEditData(d => ({ ...d, chargeRate: +e.target.value }))} className="input-field text-xs py-1 px-2 w-24 text-right" /> : formatCurrency(rate.chargeRate)}
                                    </TD>
                                    <TD align="right">
                                        {isEditing ? <input type="number" defaultValue={rate.ratePerKg} onChange={e => setEditData(d => ({ ...d, ratePerKg: +e.target.value }))} className="input-field text-xs py-1 px-2 w-20 text-right" /> : `₹${rate.ratePerKg}`}
                                    </TD>
                                    <TD align="right">
                                        <span className={cn("text-xs font-medium", rate.marginPercent > 15 ? "text-success-600" : rate.marginPercent > 5 ? "text-warning-600" : "text-danger-600")}>
                                            {rate.marginPercent}%
                                        </span>
                                    </TD>
                                    <TD className="text-text-light-secondary dark:text-text-dark-secondary text-xs">
                                        {isEditing ? <input defaultValue={rate.supplier} onChange={e => setEditData(d => ({ ...d, supplier: e.target.value }))} className="input-field text-xs py-1 px-2 w-24" /> : (rate.supplier || "—")}
                                    </TD>
                                    <TD align="center"><StatusBadge status={rate.status} /></TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEditing} canEdit={canEdit}
                                            onEdit={() => startEdit(rate)} onSave={saveEdit} onCancel={cancelEdit}
                                            onDelete={() => { deletePaperRate(rate.id); addNotification({ type: "info", title: "Deleted", message: `${rate.paperType} removed.`, category: "system" }); }}
                                            onDuplicate={() => { duplicatePaperRate(rate.id); addNotification({ type: "success", title: "Duplicated", message: `${rate.paperType} duplicated as draft.`, category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <TabActionBar onAdd={() => setShowAdd(true)} onExport={handleExport}
                onReset={() => { resetToDefaults("paper"); addNotification({ type: "info", title: "Reset", message: "Paper rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={filtered.length} tabName="paper rate"
            />

            <AddItemModal title="Add Paper Rate" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField label="Paper Type" required>
                        <input className="input-field" value={newItem.paperType || ""} onChange={e => setNewItem(n => ({ ...n, paperType: e.target.value }))} placeholder="e.g. Matt Art Paper" />
                    </FormField>
                    <FormField label="Code" required>
                        <input className="input-field" value={newItem.code || ""} onChange={e => setNewItem(n => ({ ...n, code: e.target.value }))} placeholder="e.g. matt" />
                    </FormField>
                    <FormField label="GSM" required>
                        <input type="number" className="input-field" value={newItem.gsm || ""} onChange={e => setNewItem(n => ({ ...n, gsm: +e.target.value }))} placeholder="130" />
                    </FormField>
                    <FormField label="Sheet Size" required>
                        <select className="input-field" value={newItem.size || "23x36"} onChange={e => setNewItem(n => ({ ...n, size: e.target.value }))}>
                            <option>23x36</option><option>25x36</option><option>28x40</option><option>20x30</option><option>22x28</option><option>18x23</option><option>24x36</option>
                        </select>
                    </FormField>
                    <FormField label="Landed Cost/Ream" required>
                        <input type="number" className="input-field" value={newItem.landedCost || ""} onChange={e => setNewItem(n => ({ ...n, landedCost: +e.target.value }))} />
                    </FormField>
                    <FormField label="Charge Rate/Ream" required>
                        <input type="number" className="input-field" value={newItem.chargeRate || ""} onChange={e => setNewItem(n => ({ ...n, chargeRate: +e.target.value }))} />
                    </FormField>
                    <FormField label="Rate Per Kg">
                        <input type="number" className="input-field" value={newItem.ratePerKg || ""} onChange={e => setNewItem(n => ({ ...n, ratePerKg: +e.target.value }))} />
                    </FormField>
                    <FormField label="Supplier">
                        <input className="input-field" value={newItem.supplier || ""} onChange={e => setNewItem(n => ({ ...n, supplier: e.target.value }))} />
                    </FormField>
                    <FormField label="MOQ (Min Order Qty)">
                        <input type="number" className="input-field" value={newItem.moq || ""} onChange={e => setNewItem(n => ({ ...n, moq: +e.target.value }))} />
                    </FormField>
                    <FormField label="HSN Code">
                        <input className="input-field" value={newItem.hsnCode || "4802"} onChange={e => setNewItem(n => ({ ...n, hsnCode: e.target.value }))} />
                    </FormField>
                    <FormField label="Valid From">
                        <input type="date" className="input-field" value={newItem.validFrom || ""} onChange={e => setNewItem(n => ({ ...n, validFrom: e.target.value }))} />
                    </FormField>
                    <FormField label="Valid To">
                        <input type="date" className="input-field" value={newItem.validTo || ""} onChange={e => setNewItem(n => ({ ...n, validTo: e.target.value }))} />
                    </FormField>
                    <FormField label="Status">
                        <select className="input-field" value={newItem.status || "active"} onChange={e => setNewItem(n => ({ ...n, status: e.target.value as any }))}>
                            <option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option>
                        </select>
                    </FormField>
                    <div className="col-span-full">
                        <FormField label="Notes">
                            <textarea className="input-field" rows={2} value={newItem.notes || ""} onChange={e => setNewItem(n => ({ ...n, notes: e.target.value }))} />
                        </FormField>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-surface-light-border dark:border-surface-dark-border">
                    <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button>
                    <button onClick={handleAdd} className="btn-primary text-sm px-6" disabled={!newItem.paperType || !newItem.code}>
                        Add Paper Rate
                    </button>
                </div>
            </AddItemModal>
        </div>
    );
}
