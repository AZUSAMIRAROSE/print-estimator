import { useState } from "react";
import { useRateCardStore } from "@/stores/rateCardStore";
import { formatCurrency, formatNumber } from "@/utils/format";
import { cn } from "@/utils/cn";
import { TabActionBar, RowActions, StatusBadge, AddItemModal, FormField, SectionHeader, exportTabCSV, TH, TR, TD } from "./RateCardShared";
import { useAppStore } from "@/stores/appStore";
import { Check, X, Edit3, Save } from "lucide-react";

// ── Impression Rates Tab ─────────────────────────────────────────────────────
export function ImpressionRatesTab({ canEdit }: { canEdit: boolean }) {
    const { impressionRates, addImpressionRate, updateImpressionRate, deleteImpressionRate, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState<any>({});

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                            <TH>Impression Range</TH><TH align="right">FAV (₹/1000)</TH><TH align="right">Rekord+AQ</TH>
                            <TH align="right">Rekord-AQ</TH><TH align="right">RMGT</TH><TH align="right">RMGT Perfecto</TH>
                            <TH align="center">Status</TH><TH align="center">Actions</TH>
                        </tr>
                    </thead>
                    <tbody>
                        {impressionRates.map(r => {
                            const isEd = editingId === r.id;
                            return (
                                <TR key={r.id}>
                                    <TD className="font-medium">{isEd ? <><input type="number" defaultValue={r.rangeMin} onChange={e => setEditData((d: any) => ({ ...d, rangeMin: +e.target.value }))} className="input-field w-20 text-xs py-1 mr-1" /> — <input type="number" defaultValue={r.rangeMax} onChange={e => setEditData((d: any) => ({ ...d, rangeMax: +e.target.value }))} className="input-field w-24 text-xs py-1 ml-1" /></> : `${formatNumber(r.rangeMin)} — ${r.rangeMax > 900000000 ? "∞" : formatNumber(r.rangeMax)}`}</TD>
                                    <TD align="right">{isEd ? <input type="number" defaultValue={r.fav} onChange={e => setEditData((d: any) => ({ ...d, fav: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : formatCurrency(r.fav)}</TD>
                                    <TD align="right">{isEd ? <input type="number" defaultValue={r.rekordAQ} onChange={e => setEditData((d: any) => ({ ...d, rekordAQ: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : formatCurrency(r.rekordAQ)}</TD>
                                    <TD align="right">{isEd ? <input type="number" defaultValue={r.rekordNoAQ} onChange={e => setEditData((d: any) => ({ ...d, rekordNoAQ: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : formatCurrency(r.rekordNoAQ)}</TD>
                                    <TD align="right">{isEd ? <input type="number" defaultValue={r.rmgt} onChange={e => setEditData((d: any) => ({ ...d, rmgt: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : formatCurrency(r.rmgt)}</TD>
                                    <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">{isEd ? <input type="number" defaultValue={r.rmgtPerfecto} onChange={e => setEditData((d: any) => ({ ...d, rmgtPerfecto: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : formatCurrency(r.rmgtPerfecto)}</TD>
                                    <TD align="center"><StatusBadge status={r.status} /></TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(r.id); setEditData({ ...r }); }}
                                            onSave={() => { updateImpressionRate(r.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Impression rate updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteImpressionRate(r.id); addNotification({ type: "info", title: "Deleted", message: "Rate removed.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => { exportTabCSV("impression-rates.csv", ["Range Min", "Range Max", "FAV", "Rekord+AQ", "Rekord-AQ", "RMGT", "RMGT Perfecto"], impressionRates.map(r => [String(r.rangeMin), String(r.rangeMax), String(r.fav), String(r.rekordAQ), String(r.rekordNoAQ), String(r.rmgt), String(r.rmgtPerfecto)]), "Impression rates exported."); }}
                onReset={() => { resetToDefaults("impressions"); addNotification({ type: "info", title: "Reset", message: "Impression rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={impressionRates.length} tabName="impression rate" />
            <AddItemModal title="Add Impression Rate" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField label="Range Min" required><input type="number" className="input-field" value={newItem.rangeMin || ""} onChange={e => setNewItem((n: any) => ({ ...n, rangeMin: +e.target.value }))} /></FormField>
                    <FormField label="Range Max" required><input type="number" className="input-field" value={newItem.rangeMax || ""} onChange={e => setNewItem((n: any) => ({ ...n, rangeMax: +e.target.value }))} /></FormField>
                    <FormField label="FAV Rate"><input type="number" className="input-field" value={newItem.fav || ""} onChange={e => setNewItem((n: any) => ({ ...n, fav: +e.target.value }))} /></FormField>
                    <FormField label="Rekord+AQ"><input type="number" className="input-field" value={newItem.rekordAQ || ""} onChange={e => setNewItem((n: any) => ({ ...n, rekordAQ: +e.target.value }))} /></FormField>
                    <FormField label="Rekord-AQ"><input type="number" className="input-field" value={newItem.rekordNoAQ || ""} onChange={e => setNewItem((n: any) => ({ ...n, rekordNoAQ: +e.target.value }))} /></FormField>
                    <FormField label="RMGT"><input type="number" className="input-field" value={newItem.rmgt || ""} onChange={e => setNewItem((n: any) => ({ ...n, rmgt: +e.target.value }))} /></FormField>
                    <FormField label="RMGT Perfecto"><input type="number" className="input-field" value={newItem.rmgtPerfecto || ""} onChange={e => setNewItem((n: any) => ({ ...n, rmgtPerfecto: +e.target.value }))} /></FormField>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button><button onClick={() => { addImpressionRate(newItem); setNewItem({}); setShowAdd(false); addNotification({ type: "success", title: "Added", message: "Rate added.", category: "system" }); }} className="btn-primary text-sm px-6">Add Rate</button></div>
            </AddItemModal>
        </div>
    );
}

// ── Wastage Chart Tab ────────────────────────────────────────────────────────
export function WastageChartTab({ canEdit }: { canEdit: boolean }) {
    const { wastageChart, addWastageEntry, updateWastageEntry, deleteWastageEntry, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState<any>({});

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                            <TH>Quantity Range</TH><TH align="right">4-Color Waste</TH><TH align="right">2-Color Waste</TH>
                            <TH align="right">1-Color Waste</TH><TH align="center">Type</TH><TH align="center">Actions</TH>
                        </tr>
                    </thead>
                    <tbody>
                        {wastageChart.map(w => {
                            const isEd = editingId === w.id;
                            return (
                                <TR key={w.id}>
                                    <TD className="font-medium">{formatNumber(w.minQuantity)} — {w.maxQuantity > 900000000 ? "∞" : formatNumber(w.maxQuantity)}</TD>
                                    <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">
                                        {isEd ? <input type="number" defaultValue={w.fourColorWaste} onChange={e => setEditData((d: any) => ({ ...d, fourColorWaste: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : (w.isPercentage ? `${w.fourColorWaste}%` : `${formatNumber(w.fourColorWaste)} sheets`)}
                                    </TD>
                                    <TD align="right">{isEd ? <input type="number" defaultValue={w.twoColorWaste} onChange={e => setEditData((d: any) => ({ ...d, twoColorWaste: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : (w.isPercentage ? `${w.twoColorWaste}%` : `${formatNumber(w.twoColorWaste)} sheets`)}</TD>
                                    <TD align="right">{isEd ? <input type="number" defaultValue={w.oneColorWaste} onChange={e => setEditData((d: any) => ({ ...d, oneColorWaste: +e.target.value }))} className="input-field w-20 text-xs py-1 text-right" /> : (w.isPercentage ? `${w.oneColorWaste}%` : `${formatNumber(w.oneColorWaste)} sheets`)}</TD>
                                    <TD align="center"><span className={cn("badge text-[10px]", w.isPercentage ? "badge-warning" : "badge-info")}>{w.isPercentage ? "%" : "Fixed"}</span></TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(w.id); setEditData({ ...w }); }}
                                            onSave={() => { updateWastageEntry(w.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Wastage updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteWastageEntry(w.id); }}
                                        />
                                    </TD>
                                </TR>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-4 py-2 border-t border-surface-light-border dark:border-surface-dark-border">
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">⚠️ Wastage is applied PER FORM, not per total. Total wastage = wastage × number_of_forms</p>
            </div>
            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => { exportTabCSV("wastage-chart.csv", ["Min Qty", "Max Qty", "4-Color", "2-Color", "1-Color", "Type"], wastageChart.map(w => [String(w.minQuantity), String(w.maxQuantity), String(w.fourColorWaste), String(w.twoColorWaste), String(w.oneColorWaste), w.isPercentage ? "Percentage" : "Fixed"]), "Wastage chart exported."); }}
                onReset={() => { resetToDefaults("wastage"); addNotification({ type: "info", title: "Reset", message: "Wastage chart restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={wastageChart.length} tabName="wastage entry" />
            <AddItemModal title="Add Wastage Entry" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField label="Min Quantity" required><input type="number" className="input-field" value={newItem.minQuantity || ""} onChange={e => setNewItem((n: any) => ({ ...n, minQuantity: +e.target.value }))} /></FormField>
                    <FormField label="Max Quantity" required><input type="number" className="input-field" value={newItem.maxQuantity || ""} onChange={e => setNewItem((n: any) => ({ ...n, maxQuantity: +e.target.value }))} /></FormField>
                    <FormField label="4-Color Waste"><input type="number" className="input-field" value={newItem.fourColorWaste || ""} onChange={e => setNewItem((n: any) => ({ ...n, fourColorWaste: +e.target.value }))} /></FormField>
                    <FormField label="2-Color Waste"><input type="number" className="input-field" value={newItem.twoColorWaste || ""} onChange={e => setNewItem((n: any) => ({ ...n, twoColorWaste: +e.target.value }))} /></FormField>
                    <FormField label="1-Color Waste"><input type="number" className="input-field" value={newItem.oneColorWaste || ""} onChange={e => setNewItem((n: any) => ({ ...n, oneColorWaste: +e.target.value }))} /></FormField>
                    <FormField label="Is Percentage">
                        <select className="input-field" value={newItem.isPercentage ? "yes" : "no"} onChange={e => setNewItem((n: any) => ({ ...n, isPercentage: e.target.value === "yes" }))}>
                            <option value="no">Fixed (sheets)</option><option value="yes">Percentage</option>
                        </select>
                    </FormField>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button><button onClick={() => { addWastageEntry(newItem); setNewItem({}); setShowAdd(false); }} className="btn-primary text-sm px-6">Add Entry</button></div>
            </AddItemModal>
        </div>
    );
}

// ── Binding Rates Tab ────────────────────────────────────────────────────────
export function BindingRatesTab({ canEdit }: { canEdit: boolean }) {
    const { perfectBinding, saddleStitch, wireO, hardcaseDefaults, addPerfectBinding, updatePerfectBinding, deletePerfectBinding, addSaddleStitch, updateSaddleStitch, deleteSaddleStitch, addWireO, updateWireO, deleteWireO, updateHardcaseDefaults, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();

    // Hardcase State
    const [editingHC, setEditingHC] = useState(false);
    const [hcData, setHcData] = useState<Record<string, number>>({});

    // Shared state for lists
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});

    // Add Modal State
    const [showAdd, setShowAdd] = useState(false);
    const [addType, setAddType] = useState<"perfect" | "saddle" | "wire">("perfect");
    const [newItem, setNewItem] = useState<any>({});

    return (
        <div className="p-5 space-y-6">
            {/* Perfect Binding */}
            <div>
                <SectionHeader title="Perfect Binding Rates" count={perfectBinding.length} action={canEdit && <button onClick={() => { setAddType("perfect"); setShowAdd(true); setNewItem({}); }} className="btn-secondary text-[10px] px-2 py-1 ml-2">Add PB Rate</button>} />
                <table className="w-full text-xs mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border"><TH>Qty Range</TH><TH align="right">Rate/16pp</TH><TH align="right">Gathering/Sec</TH><TH align="right">Setup Cost</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {perfectBinding.map(r => {
                            const isEd = editingId === r.id;
                            return (
                                <TR key={r.id}>
                                    <TD>
                                        {isEd ? (
                                            <div className="flex items-center gap-1"><input type="number" className="input-field text-xs py-1 w-16" defaultValue={r.minQty} onChange={e => setEditData((d: any) => ({ ...d, minQty: +e.target.value }))} /> - <input type="number" className="input-field text-xs py-1 w-16" defaultValue={r.maxQty} onChange={e => setEditData((d: any) => ({ ...d, maxQty: +e.target.value }))} /></div>
                                        ) : `${formatNumber(r.minQty)} — ${r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}`}
                                    </TD>
                                    <TD align="right" className="font-semibold">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.ratePer16pp} onChange={e => setEditData((d: any) => ({ ...d, ratePer16pp: +e.target.value }))} /> : `₹${r.ratePer16pp}`}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.gatheringRate} onChange={e => setEditData((d: any) => ({ ...d, gatheringRate: +e.target.value }))} /> : `₹${r.gatheringRate}`}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.setupCost} onChange={e => setEditData((d: any) => ({ ...d, setupCost: +e.target.value }))} /> : `₹${r.setupCost}`}</TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(r.id); setEditData({ ...r }); }}
                                            onSave={() => { updatePerfectBinding(r.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "PB rate updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deletePerfectBinding(r.id); addNotification({ type: "info", title: "Deleted", message: "Rate removed.", category: "system" }); }}
                                            onDuplicate={() => { addPerfectBinding({ ...r, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Saddle Stitching */}
            <div>
                <SectionHeader title="Saddle Stitching Rates" count={saddleStitch.length} action={canEdit && <button onClick={() => { setAddType("saddle"); setShowAdd(true); setNewItem({}); }} className="btn-secondary text-[10px] px-2 py-1 ml-2">Add SS Rate</button>} />
                <table className="w-full text-xs mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border"><TH>Qty Range</TH><TH align="right">Rate/Copy</TH><TH align="right">Setup Cost</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {saddleStitch.map(r => {
                            const isEd = editingId === r.id;
                            return (
                                <TR key={r.id}>
                                    <TD>
                                        {isEd ? (
                                            <div className="flex items-center gap-1"><input type="number" className="input-field text-xs py-1 w-16" defaultValue={r.minQty} onChange={e => setEditData((d: any) => ({ ...d, minQty: +e.target.value }))} /> - <input type="number" className="input-field text-xs py-1 w-16" defaultValue={r.maxQty} onChange={e => setEditData((d: any) => ({ ...d, maxQty: +e.target.value }))} /></div>
                                        ) : `${formatNumber(r.minQty)} — ${r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}`}
                                    </TD>
                                    <TD align="right" className="font-semibold">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.ratePerCopy} onChange={e => setEditData((d: any) => ({ ...d, ratePerCopy: +e.target.value }))} /> : `₹${r.ratePerCopy}`}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.setupCost} onChange={e => setEditData((d: any) => ({ ...d, setupCost: +e.target.value }))} /> : `₹${r.setupCost}`}</TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(r.id); setEditData({ ...r }); }}
                                            onSave={() => { updateSaddleStitch(r.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "SS rate updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteSaddleStitch(r.id); addNotification({ type: "info", title: "Deleted", message: "Rate removed.", category: "system" }); }}
                                            onDuplicate={() => { addSaddleStitch({ ...r, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Wire-O */}
            <div>
                <SectionHeader title="Wire-O Binding Rates" count={wireO.length} action={canEdit && <button onClick={() => { setAddType("wire"); setShowAdd(true); setNewItem({}); }} className="btn-secondary text-[10px] px-2 py-1 ml-2">Add Wire-O Rate</button>} />
                <table className="w-full text-xs mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border"><TH>Diameter</TH><TH align="right">mm</TH><TH align="center">Pitch</TH><TH align="right">Max Thick(mm)</TH><TH align="right">Standard/100</TH><TH align="right">Metal/100</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {wireO.map(r => {
                            const isEd = editingId === r.id;
                            return (
                                <TR key={r.id}>
                                    <TD className="font-medium">{isEd ? <input className="input-field text-xs py-1 w-16" defaultValue={r.diameter} onChange={e => setEditData((d: any) => ({ ...d, diameter: e.target.value }))} /> : `${r.diameter}"`}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-12 text-right" defaultValue={r.mm} onChange={e => setEditData((d: any) => ({ ...d, mm: +e.target.value }))} /> : r.mm}</TD>
                                    <TD align="center">{isEd ? <input className="input-field text-xs py-1 w-12 text-center" defaultValue={r.pitch} onChange={e => setEditData((d: any) => ({ ...d, pitch: e.target.value }))} /> : r.pitch}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-12 text-right" defaultValue={r.maxThickness} onChange={e => setEditData((d: any) => ({ ...d, maxThickness: +e.target.value }))} /> : r.maxThickness}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.standardPer100} onChange={e => setEditData((d: any) => ({ ...d, standardPer100: +e.target.value }))} /> : `₹${r.standardPer100}`}</TD>
                                    <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.metalPer100} onChange={e => setEditData((d: any) => ({ ...d, metalPer100: +e.target.value }))} /> : `₹${r.metalPer100}`}</TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(r.id); setEditData({ ...r }); }}
                                            onSave={() => { updateWireO(r.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Wire-O updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteWireO(r.id); addNotification({ type: "info", title: "Deleted", message: "Rate removed.", category: "system" }); }}
                                            onDuplicate={() => { addWireO({ ...r, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Hardcase Rates block remains same structurally */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <SectionHeader title="Hardcase Binding Components" />
                    {editingHC ? (
                        <div className="flex gap-1">
                            <button onClick={() => { updateHardcaseDefaults(hcData); setEditingHC(false); addNotification({ type: "success", title: "Saved", message: "Hardcase rates updated.", category: "system" }); }} className="btn-primary text-xs px-3 py-1"><Save className="w-3 h-3 inline mr-1" />Save</button>
                            <button onClick={() => setEditingHC(false)} className="btn-secondary text-xs px-3 py-1"><X className="w-3 h-3 inline mr-1" />Cancel</button>
                        </div>
                    ) : (
                        <button onClick={() => { setEditingHC(true); setHcData({ ...hardcaseDefaults }); }} disabled={!canEdit} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"><Edit3 className="w-3 h-3 inline mr-1" />Edit</button>
                    )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(hardcaseDefaults).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center p-2.5 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-xs border border-surface-light-border dark:border-surface-dark-border">
                            <span className="text-text-light-secondary dark:text-text-dark-secondary capitalize font-medium">{key.replace(/([A-Z])/g, " $1")}</span>
                            {editingHC ? (
                                <input type="number" defaultValue={value} onChange={e => setHcData(d => ({ ...d, [key]: +e.target.value }))} className="input-field w-20 text-right text-xs py-0.5 px-1 font-mono" />
                            ) : (
                                <span className="font-semibold text-primary-600 dark:text-primary-400 font-mono">₹{value}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <TabActionBar onAdd={() => { setShowAdd(true); setAddType("perfect"); setNewItem({}); }} onExport={() => { exportTabCSV("binding-rates.csv", ["Type", "Range", "Rate", "Setup"], [...perfectBinding.map(r => ["Perfect Binding", `${r.minQty}-${r.maxQty}`, String(r.ratePer16pp), String(r.setupCost)]), ...saddleStitch.map(r => ["Saddle Stitch", `${r.minQty}-${r.maxQty}`, String(r.ratePerCopy), String(r.setupCost)])], "Binding rates exported."); }}
                onReset={() => { resetToDefaults("binding"); addNotification({ type: "info", title: "Reset", message: "Binding rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={perfectBinding.length + saddleStitch.length + wireO.length} tabName="binding rate" />

            {/* Add Modal */}
            <AddItemModal title="Add Binding Rate" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary mb-1">Binding Type</label>
                    <select className="input-field" value={addType} onChange={e => { setAddType(e.target.value as any); setNewItem({}); }}>
                        <option value="perfect">Perfect Binding / Section Sewing</option>
                        <option value="saddle">Saddle Stitching</option>
                        <option value="wire">Wire-O Binding</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {addType === "perfect" && (
                        <>
                            <FormField label="Min Qty"><input type="number" className="input-field" value={newItem.minQty || ""} onChange={e => setNewItem((n: any) => ({ ...n, minQty: +e.target.value }))} /></FormField>
                            <FormField label="Max Qty"><input type="number" className="input-field" value={newItem.maxQty || ""} onChange={e => setNewItem((n: any) => ({ ...n, maxQty: +e.target.value }))} /></FormField>
                            <FormField label="Rate/16pp (₹)"><input type="number" className="input-field" value={newItem.ratePer16pp || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePer16pp: +e.target.value }))} /></FormField>
                            <FormField label="Gathering/Sec (₹)"><input type="number" className="input-field" value={newItem.gatheringRate || ""} onChange={e => setNewItem((n: any) => ({ ...n, gatheringRate: +e.target.value }))} /></FormField>
                            <FormField label="Setup Cost (₹)"><input type="number" className="input-field" value={newItem.setupCost || ""} onChange={e => setNewItem((n: any) => ({ ...n, setupCost: +e.target.value }))} /></FormField>
                        </>
                    )}
                    {addType === "saddle" && (
                        <>
                            <FormField label="Min Qty"><input type="number" className="input-field" value={newItem.minQty || ""} onChange={e => setNewItem((n: any) => ({ ...n, minQty: +e.target.value }))} /></FormField>
                            <FormField label="Max Qty"><input type="number" className="input-field" value={newItem.maxQty || ""} onChange={e => setNewItem((n: any) => ({ ...n, maxQty: +e.target.value }))} /></FormField>
                            <FormField label="Rate/Copy (₹)"><input type="number" className="input-field" value={newItem.ratePerCopy || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePerCopy: +e.target.value }))} /></FormField>
                            <FormField label="Setup Cost (₹)"><input type="number" className="input-field" value={newItem.setupCost || ""} onChange={e => setNewItem((n: any) => ({ ...n, setupCost: +e.target.value }))} /></FormField>
                        </>
                    )}
                    {addType === "wire" && (
                        <>
                            <FormField label="Diameter (inches)"><input className="input-field" value={newItem.diameter || ""} onChange={e => setNewItem((n: any) => ({ ...n, diameter: e.target.value }))} placeholder="e.g. 1/4" /></FormField>
                            <FormField label="mm"><input type="number" className="input-field" value={newItem.mm || ""} onChange={e => setNewItem((n: any) => ({ ...n, mm: +e.target.value }))} /></FormField>
                            <FormField label="Pitch"><input className="input-field" value={newItem.pitch || ""} onChange={e => setNewItem((n: any) => ({ ...n, pitch: e.target.value }))} placeholder="e.g. 3:1" /></FormField>
                            <FormField label="Max Thickness (mm)"><input type="number" className="input-field" value={newItem.maxThickness || ""} onChange={e => setNewItem((n: any) => ({ ...n, maxThickness: +e.target.value }))} /></FormField>
                            <FormField label="Standard Rate/100 (₹)"><input type="number" className="input-field" value={newItem.standardPer100 || ""} onChange={e => setNewItem((n: any) => ({ ...n, standardPer100: +e.target.value }))} /></FormField>
                            <FormField label="Metal Rate/100 (₹)"><input type="number" className="input-field" value={newItem.metalPer100 || ""} onChange={e => setNewItem((n: any) => ({ ...n, metalPer100: +e.target.value }))} /></FormField>
                        </>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button>
                    <button onClick={() => {
                        if (addType === "perfect") addPerfectBinding(newItem);
                        else if (addType === "saddle") addSaddleStitch(newItem);
                        else addWireO(newItem);
                        setNewItem({});
                        setShowAdd(false);
                        addNotification({ type: "success", title: "Added", message: "Rate added successfully.", category: "system" });
                    }} className="btn-primary text-sm px-6">Add</button>
                </div>
            </AddItemModal>
        </div>
    );
}

// ── Finishing Rates Tab ──────────────────────────────────────────────────────
export function FinishingRatesTab({ canEdit }: { canEdit: boolean }) {
    const { lamination, spotUV, addLamination, updateLamination, deleteLamination, addSpotUV, updateSpotUV, deleteSpotUV, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();

    // Shared state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});

    // Add Modal state
    const [showAdd, setShowAdd] = useState(false);
    const [addType, setAddType] = useState<"lamination" | "spotUV">("lamination");
    const [newItem, setNewItem] = useState<any>({});

    return (
        <div className="p-5 space-y-6">
            <div>
                <SectionHeader title="Lamination Rates" count={lamination.length} action={canEdit && <button onClick={() => { setAddType("lamination"); setShowAdd(true); setNewItem({}); }} className="btn-secondary text-[10px] px-2 py-1 ml-2">Add Lamination</button>} />
                <table className="w-full text-xs mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border"><TH>Type</TH><TH align="right">Rate/Copy (₹)</TH><TH align="right">Min Order (₹)</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {lamination.map(l => {
                            const isEd = editingId === l.id;
                            return (
                                <TR key={l.id}>
                                    <TD className="font-medium text-text-light-primary dark:text-text-dark-primary capitalize">
                                        {isEd ? <input className="input-field text-xs py-1 w-32" defaultValue={l.type} onChange={e => setEditData((d: any) => ({ ...d, type: e.target.value }))} /> : l.type.replace("_", " ")}
                                    </TD>
                                    <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">
                                        {isEd ? <input type="number" className="input-field text-xs py-1 w-20 text-right" defaultValue={l.ratePerCopy} onChange={e => setEditData((d: any) => ({ ...d, ratePerCopy: +e.target.value }))} /> : `₹${l.ratePerCopy}`}
                                    </TD>
                                    <TD align="right">
                                        {isEd ? <input type="number" className="input-field text-xs py-1 w-20 text-right" defaultValue={l.minOrder} onChange={e => setEditData((d: any) => ({ ...d, minOrder: +e.target.value }))} /> : `₹${formatNumber(l.minOrder)}`}
                                    </TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(l.id); setEditData({ ...l }); }}
                                            onSave={() => { updateLamination(l.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Lamination updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteLamination(l.id); addNotification({ type: "info", title: "Deleted", message: "Lamination removed.", category: "system" }); }}
                                            onDuplicate={() => { addLamination({ ...l, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div>
                <SectionHeader title="Spot UV Rates" count={spotUV.length} action={canEdit && <button onClick={() => { setAddType("spotUV"); setShowAdd(true); setNewItem({}); }} className="btn-secondary text-[10px] px-2 py-1 ml-2">Add Spot UV</button>} />
                <table className="w-full text-xs mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border"><TH>Qty Range</TH><TH align="right">Rate/Copy (₹)</TH><TH align="right">Block Cost (₹)</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {spotUV.map(r => {
                            const isEd = editingId === r.id;
                            return (
                                <TR key={r.id}>
                                    <TD>
                                        {isEd ? (
                                            <div className="flex items-center gap-1"><input type="number" className="input-field text-xs py-1 w-16" defaultValue={r.minQty} onChange={e => setEditData((d: any) => ({ ...d, minQty: +e.target.value }))} /> - <input type="number" className="input-field text-xs py-1 w-16" defaultValue={r.maxQty} onChange={e => setEditData((d: any) => ({ ...d, maxQty: +e.target.value }))} /></div>
                                        ) : `${formatNumber(r.minQty)} — ${r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}`}
                                    </TD>
                                    <TD align="right" className="font-semibold">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={r.ratePerCopy} onChange={e => setEditData((d: any) => ({ ...d, ratePerCopy: +e.target.value }))} /> : `₹${r.ratePerCopy}`}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-20 text-right" defaultValue={r.blockCost} onChange={e => setEditData((d: any) => ({ ...d, blockCost: +e.target.value }))} /> : `₹${formatNumber(r.blockCost)}`}</TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(r.id); setEditData({ ...r }); }}
                                            onSave={() => { updateSpotUV(r.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Spot UV updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteSpotUV(r.id); addNotification({ type: "info", title: "Deleted", message: "Spot UV removed.", category: "system" }); }}
                                            onDuplicate={() => { addSpotUV({ ...r, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <TabActionBar onAdd={() => { setShowAdd(true); setAddType("lamination"); setNewItem({}); }} onExport={() => { exportTabCSV("finishing-rates.csv", ["Type", "Rate", "Min Order"], lamination.map(l => [l.type, String(l.ratePerCopy), String(l.minOrder)]), "Finishing rates exported."); }}
                onReset={() => { resetToDefaults("finishing"); addNotification({ type: "info", title: "Reset", message: "Finishing rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={lamination.length + spotUV.length} tabName="finishing rate" />

            <AddItemModal title="Add Finishing Rate" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="mb-4">
                    <label className="block text-xs font-semibold text-text-light-tertiary dark:text-text-dark-tertiary mb-1">Finishing Type</label>
                    <select className="input-field" value={addType} onChange={e => { setAddType(e.target.value as any); setNewItem({}); }}>
                        <option value="lamination">Lamination</option>
                        <option value="spotUV">Spot UV</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {addType === "lamination" && (
                        <>
                            <FormField label="Lamination Type" required><input className="input-field" value={newItem.type || ""} onChange={e => setNewItem((n: any) => ({ ...n, type: e.target.value }))} placeholder="e.g. Matte Lamination" /></FormField>
                            <FormField label="Rate/Copy (₹)"><input type="number" className="input-field" value={newItem.ratePerCopy || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePerCopy: +e.target.value }))} /></FormField>
                            <FormField label="Min Order Value (₹)"><input type="number" className="input-field" value={newItem.minOrder || ""} onChange={e => setNewItem((n: any) => ({ ...n, minOrder: +e.target.value }))} /></FormField>
                        </>
                    )}
                    {addType === "spotUV" && (
                        <>
                            <FormField label="Min Qty"><input type="number" className="input-field" value={newItem.minQty || ""} onChange={e => setNewItem((n: any) => ({ ...n, minQty: +e.target.value }))} /></FormField>
                            <FormField label="Max Qty"><input type="number" className="input-field" value={newItem.maxQty || ""} onChange={e => setNewItem((n: any) => ({ ...n, maxQty: +e.target.value }))} /></FormField>
                            <FormField label="Rate/Copy (₹)"><input type="number" className="input-field" value={newItem.ratePerCopy || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePerCopy: +e.target.value }))} /></FormField>
                            <FormField label="Block Cost (₹)"><input type="number" className="input-field" value={newItem.blockCost || ""} onChange={e => setNewItem((n: any) => ({ ...n, blockCost: +e.target.value }))} /></FormField>
                        </>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button>
                    <button onClick={() => {
                        if (addType === "lamination") addLamination(newItem);
                        else addSpotUV(newItem);
                        setNewItem({});
                        setShowAdd(false);
                        addNotification({ type: "success", title: "Added", message: "Rate added successfully.", category: "system" });
                    }} className="btn-primary text-sm px-6">Add</button>
                </div>
            </AddItemModal>
        </div>
    );
}

// ── Covering Material Tab ────────────────────────────────────────────────────
export function CoveringMaterialTab({ canEdit }: { canEdit: boolean }) {
    const { coveringMaterials, addCovering, updateCovering, deleteCovering, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState<any>({});

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border">
                            <TH>Material</TH><TH>Code</TH><TH align="right">Roll Width (mm)</TH><TH align="right">Rate/sqm (₹)</TH><TH align="right">Rate/m (₹)</TH><TH>Supplier</TH><TH align="center">Status</TH><TH align="center">Actions</TH>
                        </tr>
                    </thead>
                    <tbody>
                        {coveringMaterials.map(m => {
                            const isEd = editingId === m.id;
                            return (
                                <TR key={m.id}>
                                    <TD className="font-medium">{isEd ? <input className="input-field text-xs py-1" defaultValue={m.name} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))} /> : m.name}</TD>
                                    <TD className="font-mono text-xs text-text-light-tertiary">{isEd ? <input className="input-field text-xs py-1 w-20" defaultValue={m.code} onChange={e => setEditData((d: any) => ({ ...d, code: e.target.value }))} /> : m.code}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-20 text-right" defaultValue={m.rollWidth} onChange={e => setEditData((d: any) => ({ ...d, rollWidth: +e.target.value }))} /> : (m.rollWidth || "—")}</TD>
                                    <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">{isEd ? <input type="number" className="input-field text-xs py-1 w-20 text-right" defaultValue={m.ratePerSqMeter} onChange={e => setEditData((d: any) => ({ ...d, ratePerSqMeter: +e.target.value }))} /> : (m.ratePerSqMeter > 0 ? `₹${m.ratePerSqMeter}` : "Paper rate")}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-20 text-right" defaultValue={m.ratePerMeter} onChange={e => setEditData((d: any) => ({ ...d, ratePerMeter: +e.target.value }))} /> : (m.ratePerMeter > 0 ? `₹${m.ratePerMeter}` : "—")}</TD>
                                    <TD>{isEd ? <input className="input-field text-xs py-1 w-24" defaultValue={m.supplier} onChange={e => setEditData((d: any) => ({ ...d, supplier: e.target.value }))} /> : m.supplier}</TD>
                                    <TD align="center"><StatusBadge status={m.status} /></TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(m.id); setEditData({ ...m }); }}
                                            onSave={() => { updateCovering(m.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Material updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteCovering(m.id); addNotification({ type: "info", title: "Deleted", message: "Material removed.", category: "system" }); }}
                                            onDuplicate={() => { addCovering({ ...m, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => { exportTabCSV("covering-materials.csv", ["Name", "Code", "Roll Width", "Rate/sqm", "Rate/m", "Supplier"], coveringMaterials.map(m => [m.name, m.code, String(m.rollWidth), String(m.ratePerSqMeter), String(m.ratePerMeter), m.supplier]), "Covering materials exported."); }}
                onReset={() => { resetToDefaults("covering"); addNotification({ type: "info", title: "Reset", message: "Covering materials restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={coveringMaterials.length} tabName="covering material" />
            <AddItemModal title="Add Covering Material" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-2 gap-4">
                    <FormField label="Material Name" required><input className="input-field" value={newItem.name || ""} onChange={e => setNewItem((n: any) => ({ ...n, name: e.target.value }))} placeholder="e.g. PU Leather" /></FormField>
                    <FormField label="Code"><input className="input-field" value={newItem.code || ""} onChange={e => setNewItem((n: any) => ({ ...n, code: e.target.value }))} placeholder="e.g. pu-lr" /></FormField>
                    <FormField label="Roll Width (mm)"><input type="number" className="input-field" value={newItem.rollWidth || ""} onChange={e => setNewItem((n: any) => ({ ...n, rollWidth: +e.target.value }))} /></FormField>
                    <FormField label="Rate/sqm (₹)"><input type="number" className="input-field" value={newItem.ratePerSqMeter || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePerSqMeter: +e.target.value }))} /></FormField>
                    <FormField label="Rate/m (₹)"><input type="number" className="input-field" value={newItem.ratePerMeter || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePerMeter: +e.target.value }))} /></FormField>
                    <FormField label="Supplier"><input className="input-field" value={newItem.supplier || ""} onChange={e => setNewItem((n: any) => ({ ...n, supplier: e.target.value }))} /></FormField>
                    <FormField label="Status">
                        <select className="input-field" value={newItem.status || "active"} onChange={e => setNewItem((n: any) => ({ ...n, status: e.target.value }))}>
                            <option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option>
                        </select>
                    </FormField>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button><button onClick={() => { if (!newItem.name) return; addCovering(newItem); setNewItem({}); setShowAdd(false); addNotification({ type: "success", title: "Added", message: "Material added.", category: "system" }); }} className="btn-primary text-sm px-6">Add</button></div>
            </AddItemModal>
        </div>
    );
}

// ── Board Types Tab ──────────────────────────────────────────────────────────
export function BoardTypesTab({ canEdit }: { canEdit: boolean }) {
    const { boardTypes, addBoard, updateBoard, deleteBoard, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState<any>({});

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border"><TH>Board</TH><TH align="center">Origin</TH><TH align="right">Thickness(mm)</TH><TH align="center">Sheet Size</TH><TH align="right">Rate/kg</TH><TH align="right">Rate/Sheet</TH><TH align="center">Status</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {boardTypes.map(b => {
                            const isEd = editingId === b.id;
                            return (
                                <TR key={b.id}>
                                    <TD className="font-medium">{isEd ? <input className="input-field w-24 text-xs py-1" defaultValue={b.name} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))} /> : b.name}</TD>
                                    <TD align="center">
                                        {isEd ? (
                                            <select className="input-field text-xs py-1" defaultValue={b.origin} onChange={e => setEditData((d: any) => ({ ...d, origin: e.target.value }))}>
                                                <option value="indian">Indian</option>
                                                <option value="imported">Imported</option>
                                            </select>
                                        ) : (
                                            <span className={cn("badge text-[10px]", b.origin === "imported" ? "badge-info" : "badge-success")}>{b.origin}</span>
                                        )}
                                    </TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field w-16 text-xs py-1 text-right" defaultValue={b.thickness} onChange={e => setEditData((d: any) => ({ ...d, thickness: +e.target.value }))} /> : `${b.thickness}mm`}</TD>
                                    <TD align="center">
                                        {isEd ? (
                                            <div className="flex gap-1 justify-center"><input type="number" className="input-field w-12 text-xs py-1" defaultValue={b.sheetWidth} onChange={e => setEditData((d: any) => ({ ...d, sheetWidth: +e.target.value }))} /> × <input type="number" className="input-field w-12 text-xs py-1" defaultValue={b.sheetHeight} onChange={e => setEditData((d: any) => ({ ...d, sheetHeight: +e.target.value }))} /></div>
                                        ) : `${b.sheetWidth}"×${b.sheetHeight}"`}
                                    </TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field w-16 text-xs py-1 text-right" defaultValue={b.ratePerKg} onChange={e => setEditData((d: any) => ({ ...d, ratePerKg: +e.target.value }))} /> : `₹${b.ratePerKg}`}</TD>
                                    <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">{isEd ? <input type="number" className="input-field w-16 text-xs py-1 text-right" defaultValue={b.ratePerSheet} onChange={e => setEditData((d: any) => ({ ...d, ratePerSheet: +e.target.value }))} /> : `₹${b.ratePerSheet.toFixed(2)}`}</TD>
                                    <TD align="center"><StatusBadge status={b.status} /></TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(b.id); setEditData({ ...b }); }}
                                            onSave={() => { updateBoard(b.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Board updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteBoard(b.id); addNotification({ type: "info", title: "Deleted", message: "Board removed.", category: "system" }); }}
                                            onDuplicate={() => { addBoard({ ...b, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => { exportTabCSV("board-types.csv", ["Name", "Origin", "Thickness", "Size", "Weight", "Rate/kg", "Rate/Sheet"], boardTypes.map(b => [b.name, b.origin, String(b.thickness), `${b.sheetWidth}x${b.sheetHeight}`, String(b.weightPerSheet), String(b.ratePerKg), String(b.ratePerSheet)]), "Board types exported."); }}
                onReset={() => { resetToDefaults("board"); addNotification({ type: "info", title: "Reset", message: "Board types restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={boardTypes.length} tabName="board type" />
            <AddItemModal title="Add Board Type" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField label="Board Name" required><input className="input-field" value={newItem.name || ""} onChange={e => setNewItem((n: any) => ({ ...n, name: e.target.value }))} placeholder="e.g. Kappa Board" /></FormField>
                    <FormField label="Origin">
                        <select className="input-field" value={newItem.origin || "indian"} onChange={e => setNewItem((n: any) => ({ ...n, origin: e.target.value }))}>
                            <option value="indian">Indian</option><option value="imported">Imported</option>
                        </select>
                    </FormField>
                    <FormField label="Thickness (mm)"><input type="number" className="input-field" value={newItem.thickness || ""} onChange={e => setNewItem((n: any) => ({ ...n, thickness: +e.target.value }))} /></FormField>
                    <FormField label="Sheet Width (inch)"><input type="number" className="input-field" value={newItem.sheetWidth || ""} onChange={e => setNewItem((n: any) => ({ ...n, sheetWidth: +e.target.value }))} /></FormField>
                    <FormField label="Sheet Height (inch)"><input type="number" className="input-field" value={newItem.sheetHeight || ""} onChange={e => setNewItem((n: any) => ({ ...n, sheetHeight: +e.target.value }))} /></FormField>
                    <FormField label="Weight/Sheet (kg)"><input type="number" className="input-field" value={newItem.weightPerSheet || ""} onChange={e => setNewItem((n: any) => ({ ...n, weightPerSheet: +e.target.value }))} /></FormField>
                    <FormField label="Rate/kg (₹)"><input type="number" className="input-field" value={newItem.ratePerKg || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePerKg: +e.target.value }))} /></FormField>
                    <FormField label="Rate/Sheet (₹)"><input type="number" className="input-field" value={newItem.ratePerSheet || ""} onChange={e => setNewItem((n: any) => ({ ...n, ratePerSheet: +e.target.value }))} /></FormField>
                    <FormField label="Status">
                        <select className="input-field" value={newItem.status || "active"} onChange={e => setNewItem((n: any) => ({ ...n, status: e.target.value }))}>
                            <option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option>
                        </select>
                    </FormField>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button><button onClick={() => { if (!newItem.name) return; addBoard(newItem); setNewItem({}); setShowAdd(false); addNotification({ type: "success", title: "Added", message: "Board type added.", category: "system" }); }} className="btn-primary text-sm px-6">Add</button></div>
            </AddItemModal>
        </div>
    );
}

// ── Freight Rates Tab ────────────────────────────────────────────────────────
export function FreightRatesTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { freightDestinations, addFreight, updateFreight, deleteFreight, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newItem, setNewItem] = useState<any>({});

    const filtered = freightDestinations.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b border-surface-light-border dark:border-surface-dark-border"><TH>Destination</TH><TH>Country</TH><TH align="center">Type</TH><TH align="right">Sea/20ft ($)</TH><TH align="right">Sea/Pallet ($)</TH><TH align="right">Surface/Pallet (₹)</TH><TH align="right">Air/kg (₹)</TH><TH align="right">Clearance (₹)</TH><TH align="right">Transit</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {filtered.map(d => {
                            const isEd = editingId === d.id;
                            return (
                                <TR key={d.id}>
                                    <TD className="font-medium text-text-light-primary dark:text-text-dark-primary">{isEd ? <input className="input-field text-xs py-1 w-20" defaultValue={d.name} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))} /> : d.name}</TD>
                                    <TD className="text-text-light-secondary dark:text-text-dark-secondary">{isEd ? <input className="input-field text-xs py-1 w-16" defaultValue={d.country} onChange={e => setEditData((d: any) => ({ ...d, country: e.target.value }))} /> : d.country}</TD>
                                    <TD align="center">
                                        {isEd ? (
                                            <select className="input-field text-[10px] py-1" defaultValue={d.isOverseas ? "true" : "false"} onChange={e => setEditData((d: any) => ({ ...d, isOverseas: e.target.value === "true" }))}>
                                                <option value="false">Domestic</option><option value="true">Overseas</option>
                                            </select>
                                        ) : <span className={cn("badge text-[9px]", d.isOverseas ? "badge-info" : "badge-success")}>{d.isOverseas ? "Overseas" : "Domestic"}</span>}
                                    </TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-12 text-right" defaultValue={d.seaFreightPerContainer20} onChange={e => setEditData((d: any) => ({ ...d, seaFreightPerContainer20: +e.target.value }))} /> : (d.seaFreightPerContainer20 > 0 ? `$${formatNumber(d.seaFreightPerContainer20)}` : "—")}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-12 text-right" defaultValue={d.seaFreightPerPallet} onChange={e => setEditData((d: any) => ({ ...d, seaFreightPerPallet: +e.target.value }))} /> : (d.seaFreightPerPallet > 0 ? `$${d.seaFreightPerPallet}` : "—")}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={d.surfacePerPallet} onChange={e => setEditData((d: any) => ({ ...d, surfacePerPallet: +e.target.value }))} /> : (d.surfacePerPallet > 0 ? `₹${formatNumber(d.surfacePerPallet)}` : d.surfacePerTruck > 0 ? `₹${formatNumber(d.surfacePerTruck)}/truck` : "—")}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-12 text-right" defaultValue={d.airFreightPerKg} onChange={e => setEditData((d: any) => ({ ...d, airFreightPerKg: +e.target.value }))} /> : (d.airFreightPerKg > 0 ? `₹${d.airFreightPerKg}` : "—")}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-16 text-right" defaultValue={d.clearanceCharges} onChange={e => setEditData((d: any) => ({ ...d, clearanceCharges: +e.target.value }))} /> : (d.clearanceCharges > 0 ? `₹${formatNumber(d.clearanceCharges)}` : "—")}</TD>
                                    <TD align="right">{isEd ? <input type="number" className="input-field text-xs py-1 w-10 text-right" defaultValue={d.transitTimeDays} onChange={e => setEditData((d: any) => ({ ...d, transitTimeDays: +e.target.value }))} /> : `${d.transitTimeDays}d`}</TD>
                                    <TD align="center">
                                        <RowActions isEditing={isEd} canEdit={canEdit}
                                            onEdit={() => { setEditingId(d.id); setEditData({ ...d }); }}
                                            onSave={() => { updateFreight(d.id, editData); setEditingId(null); addNotification({ type: "success", title: "Saved", message: "Freight destination updated.", category: "system" }); }}
                                            onCancel={() => setEditingId(null)}
                                            onDelete={() => { deleteFreight(d.id); addNotification({ type: "info", title: "Deleted", message: "Destination removed.", category: "system" }); }}
                                            onDuplicate={() => { addFreight({ ...d, status: "draft" }); addNotification({ type: "success", title: "Duplicated", message: "Copied as draft.", category: "system" }); }}
                                        />
                                    </TD>
                                </TR>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => { exportTabCSV("freight-rates.csv", ["Name", "Country", "Type", "Sea/20ft", "Sea/Pallet", "Surface", "Air/kg", "Clearance"], filtered.map(d => [d.name, d.country, d.isOverseas ? "Overseas" : "Domestic", String(d.seaFreightPerContainer20), String(d.seaFreightPerPallet), String(d.surfacePerPallet), String(d.airFreightPerKg), String(d.clearanceCharges)]), "Freight rates exported."); }}
                onReset={() => { resetToDefaults("freight"); addNotification({ type: "info", title: "Reset", message: "Freight rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={filtered.length} tabName="freight destination" />
            <AddItemModal title="Add Freight Destination" isOpen={showAdd} onClose={() => setShowAdd(false)}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField label="Destination" required><input className="input-field" value={newItem.name || ""} onChange={e => setNewItem((n: any) => ({ ...n, name: e.target.value }))} placeholder="e.g. Dubai" /></FormField>
                    <FormField label="Country" required><input className="input-field" value={newItem.country || ""} onChange={e => setNewItem((n: any) => ({ ...n, country: e.target.value }))} placeholder="e.g. UAE" /></FormField>
                    <FormField label="Type">
                        <select className="input-field" value={newItem.isOverseas ? "true" : "false"} onChange={e => setNewItem((n: any) => ({ ...n, isOverseas: e.target.value === "true" }))}>
                            <option value="false">Domestic</option><option value="true">Overseas</option>
                        </select>
                    </FormField>
                    <FormField label="Transit Time (Days)"><input type="number" className="input-field" value={newItem.transitTimeDays || ""} onChange={e => setNewItem((n: any) => ({ ...n, transitTimeDays: +e.target.value }))} /></FormField>

                    <div className="col-span-full font-semibold text-xs text-text-light-primary dark:text-text-dark-primary mt-2 flex items-center gap-2">
                        <div className="h-px bg-surface-light-border dark:bg-surface-dark-border flex-1"></div><span>Sea & Air Freight ($/₹)</span><div className="h-px bg-surface-light-border dark:bg-surface-dark-border flex-1"></div>
                    </div>
                    <FormField label="Sea/20ft ($)"><input type="number" className="input-field" value={newItem.seaFreightPerContainer20 || ""} onChange={e => setNewItem((n: any) => ({ ...n, seaFreightPerContainer20: +e.target.value }))} /></FormField>
                    <FormField label="Sea/40ft ($)"><input type="number" className="input-field" value={newItem.seaFreightPerContainer40 || ""} onChange={e => setNewItem((n: any) => ({ ...n, seaFreightPerContainer40: +e.target.value }))} /></FormField>
                    <FormField label="Sea/Pallet ($)"><input type="number" className="input-field" value={newItem.seaFreightPerPallet || ""} onChange={e => setNewItem((n: any) => ({ ...n, seaFreightPerPallet: +e.target.value }))} /></FormField>
                    <FormField label="Air/kg (₹)"><input type="number" className="input-field" value={newItem.airFreightPerKg || ""} onChange={e => setNewItem((n: any) => ({ ...n, airFreightPerKg: +e.target.value }))} /></FormField>

                    <div className="col-span-full font-semibold text-xs text-text-light-primary dark:text-text-dark-primary mt-2 flex items-center gap-2">
                        <div className="h-px bg-surface-light-border dark:bg-surface-dark-border flex-1"></div><span>Surface Freight (₹)</span><div className="h-px bg-surface-light-border dark:bg-surface-dark-border flex-1"></div>
                    </div>
                    <FormField label="Surface/Pallet (₹)"><input type="number" className="input-field" value={newItem.surfacePerPallet || ""} onChange={e => setNewItem((n: any) => ({ ...n, surfacePerPallet: +e.target.value }))} /></FormField>
                    <FormField label="Surface/Truck (₹)"><input type="number" className="input-field" value={newItem.surfacePerTruck || ""} onChange={e => setNewItem((n: any) => ({ ...n, surfacePerTruck: +e.target.value }))} /></FormField>

                    <div className="col-span-full font-semibold text-xs text-text-light-primary dark:text-text-dark-primary mt-2 flex items-center gap-2">
                        <div className="h-px bg-surface-light-border dark:bg-surface-dark-border flex-1"></div><span>Other Charges</span><div className="h-px bg-surface-light-border dark:bg-surface-dark-border flex-1"></div>
                    </div>
                    <FormField label="Clearance (₹)"><input type="number" className="input-field" value={newItem.clearanceCharges || ""} onChange={e => setNewItem((n: any) => ({ ...n, clearanceCharges: +e.target.value }))} /></FormField>
                    <FormField label="CHA Charges (₹)"><input type="number" className="input-field" value={newItem.chaCharges || ""} onChange={e => setNewItem((n: any) => ({ ...n, chaCharges: +e.target.value }))} /></FormField>
                    <FormField label="Documentation (₹)"><input type="number" className="input-field" value={newItem.documentation || ""} onChange={e => setNewItem((n: any) => ({ ...n, documentation: +e.target.value }))} /></FormField>
                    <FormField label="Status">
                        <select className="input-field" value={newItem.status || "active"} onChange={e => setNewItem((n: any) => ({ ...n, status: e.target.value }))}>
                            <option value="active">Active</option><option value="draft">Draft</option><option value="inactive">Inactive</option>
                        </select>
                    </FormField>
                </div>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setShowAdd(false)} className="btn-secondary text-sm px-4">Cancel</button><button onClick={() => { if (!newItem.name) return; addFreight(newItem); setNewItem({}); setShowAdd(false); addNotification({ type: "success", title: "Added", message: "Freight rate added.", category: "system" }); }} className="btn-primary text-sm px-6">Add</button></div>
            </AddItemModal>
        </div>
    );
}

// ── Packing Rates Tab ────────────────────────────────────────────────────────
export function PackingRatesTab({ canEdit }: { canEdit: boolean }) {
    const { packingRates, updatePackingRates, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState<Record<string, number>>({});

    return (
        <div className="p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">Packing Material Rates</h3>
                {editing ? (
                    <div className="flex gap-1">
                        <button onClick={() => { updatePackingRates(editData); setEditing(false); addNotification({ type: "success", title: "Saved", message: "Packing rates updated.", category: "system" }); }} className="btn-primary text-xs px-3 py-1"><Save className="w-3 h-3 inline mr-1" />Save</button>
                        <button onClick={() => setEditing(false)} className="btn-secondary text-xs px-3 py-1"><X className="w-3 h-3 inline mr-1" />Cancel</button>
                    </div>
                ) : (
                    <button onClick={() => { setEditing(true); setEditData({ ...packingRates }); }} disabled={!canEdit} className="btn-secondary text-xs px-3 py-1 disabled:opacity-40"><Edit3 className="w-3 h-3 inline mr-1" />Edit</button>
                )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(packingRates).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-3 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg">
                        <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                        {editing ? (
                            <input type="number" defaultValue={value} onChange={e => setEditData(d => ({ ...d, [key]: +e.target.value }))} className="input-field w-20 text-right text-xs py-0.5" />
                        ) : (
                            <span className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary">₹{value}</span>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <TabActionBar onAdd={() => { }} onExport={() => { exportTabCSV("packing-rates.csv", ["Item", "Rate"], Object.entries(packingRates).map(([k, v]) => [k, String(v)]), "Packing rates exported."); }}
                    onReset={() => { resetToDefaults("packing"); addNotification({ type: "info", title: "Reset", message: "Packing rates restored.", category: "system" }); }}
                    canEdit={canEdit} itemCount={Object.keys(packingRates).length} tabName="packing rate" />
            </div>
        </div>
    );
}
