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
            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => { exportTabCSV("impression-rates.csv", ["Range Min", "Range Max", "FAV", "Rekord+AQ", "Rekord-AQ", "RMGT", "RMGT Perfecto"], impressionRates.map(r => [String(r.rangeMin), String(r.rangeMax), String(r.fav), String(r.rekordAQ), String(r.rekordNoAQ), String(r.rmgt), String(r.rmgtPerfecto)])); addNotification({ type: "success", title: "Exported", message: "Impression rates exported.", category: "export" }); }}
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
            <TabActionBar onAdd={() => setShowAdd(true)} onExport={() => { exportTabCSV("wastage-chart.csv", ["Min Qty", "Max Qty", "4-Color", "2-Color", "1-Color", "Type"], wastageChart.map(w => [String(w.minQuantity), String(w.maxQuantity), String(w.fourColorWaste), String(w.twoColorWaste), String(w.oneColorWaste), w.isPercentage ? "Percentage" : "Fixed"])); addNotification({ type: "success", title: "Exported", message: "Wastage chart exported.", category: "export" }); }}
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
    const { perfectBinding, saddleStitch, wireO, hardcaseDefaults, addPerfectBinding, updatePerfectBinding, deletePerfectBinding, addSaddleStitch, updateSaddleStitch, deleteSaddleStitch, updateHardcaseDefaults, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const [editingHC, setEditingHC] = useState(false);
    const [hcData, setHcData] = useState<Record<string, number>>({});

    return (
        <div className="p-5 space-y-6">
            {/* Perfect Binding */}
            <div>
                <SectionHeader title="Perfect Binding Rates" count={perfectBinding.length} />
                <table className="w-full text-sm mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary"><TH>Qty Range</TH><TH align="right">Rate/16pp</TH><TH align="right">Gathering/Section</TH><TH align="right">Setup Cost</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {perfectBinding.map(r => (
                            <TR key={r.id}>
                                <TD>{formatNumber(r.minQty)} — {r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}</TD>
                                <TD align="right" className="font-semibold">₹{r.ratePer16pp}</TD>
                                <TD align="right">₹{r.gatheringRate}</TD>
                                <TD align="right">₹{r.setupCost}</TD>
                                <TD align="center"><RowActions isEditing={false} canEdit={canEdit} onEdit={() => { }} onSave={() => { }} onCancel={() => { }} onDelete={() => deletePerfectBinding(r.id)} /></TD>
                            </TR>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Saddle Stitching */}
            <div>
                <SectionHeader title="Saddle Stitching Rates" count={saddleStitch.length} />
                <table className="w-full text-sm mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary"><TH>Qty Range</TH><TH align="right">Rate/Copy</TH><TH align="right">Setup Cost</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {saddleStitch.map(r => (
                            <TR key={r.id}>
                                <TD>{formatNumber(r.minQty)} — {r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}</TD>
                                <TD align="right" className="font-semibold">₹{r.ratePerCopy}</TD>
                                <TD align="right">₹{r.setupCost}</TD>
                                <TD align="center"><RowActions isEditing={false} canEdit={canEdit} onEdit={() => { }} onSave={() => { }} onCancel={() => { }} onDelete={() => deleteSaddleStitch(r.id)} /></TD>
                            </TR>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Wire-O */}
            <div>
                <SectionHeader title="Wire-O Binding Rates" count={wireO.length} />
                <table className="w-full text-sm mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary"><TH>Diameter</TH><TH align="right">mm</TH><TH align="center">Pitch</TH><TH align="right">Max Thick</TH><TH align="right">Standard/100</TH><TH align="right">Metal/100</TH></tr></thead>
                    <tbody>
                        {wireO.map(r => (
                            <TR key={r.id}>
                                <TD className="font-medium">{r.diameter}"</TD>
                                <TD align="right">{r.mm}</TD><TD align="center">{r.pitch}</TD>
                                <TD align="right">{r.maxThickness}mm</TD>
                                <TD align="right">₹{r.standardPer100}</TD>
                                <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">₹{r.metalPer100}</TD>
                            </TR>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Hardcase */}
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
                        <div key={key} className="flex justify-between items-center p-2.5 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-xs">
                            <span className="text-text-light-secondary dark:text-text-dark-secondary capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                            {editingHC ? (
                                <input type="number" defaultValue={value} onChange={e => setHcData(d => ({ ...d, [key]: +e.target.value }))} className="input-field w-20 text-right text-xs py-0.5 px-1" />
                            ) : (
                                <span className="font-semibold text-text-light-primary dark:text-text-dark-primary">₹{value}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <TabActionBar onAdd={() => { }} onExport={() => { exportTabCSV("binding-rates.csv", ["Type", "Range", "Rate", "Setup"], [...perfectBinding.map(r => ["Perfect Binding", `${r.minQty}-${r.maxQty}`, String(r.ratePer16pp), String(r.setupCost)]), ...saddleStitch.map(r => ["Saddle Stitch", `${r.minQty}-${r.maxQty}`, String(r.ratePerCopy), String(r.setupCost)])]); addNotification({ type: "success", title: "Exported", message: "Binding rates exported.", category: "export" }); }}
                onReset={() => { resetToDefaults("binding"); addNotification({ type: "info", title: "Reset", message: "Binding rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={perfectBinding.length + saddleStitch.length + wireO.length} tabName="binding rate" />
        </div>
    );
}

// ── Finishing Rates Tab ──────────────────────────────────────────────────────
export function FinishingRatesTab({ canEdit }: { canEdit: boolean }) {
    const { lamination, spotUV, addLamination, updateLamination, deleteLamination, addSpotUV, updateSpotUV, deleteSpotUV, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();

    return (
        <div className="p-5 space-y-6">
            <div>
                <SectionHeader title="Lamination Rates" count={lamination.length} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {lamination.map(l => (
                        <div key={l.id} className="p-4 bg-surface-light-secondary dark:bg-surface-dark-tertiary rounded-lg text-center relative group">
                            <button onClick={() => deleteLamination(l.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-500/10 rounded transition-opacity" disabled={!canEdit}>
                                <X className="w-3 h-3" />
                            </button>
                            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary uppercase font-medium capitalize">{l.type.replace("_", " ")}</p>
                            <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary mt-1">₹{l.ratePerCopy}</p>
                            <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">per copy • Min ₹{formatNumber(l.minOrder)}</p>
                            <StatusBadge status={l.status} />
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <SectionHeader title="Spot UV Rates" count={spotUV.length} />
                <table className="w-full text-sm mt-2">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary"><TH>Qty Range</TH><TH align="right">Rate/Copy</TH><TH align="right">Block Cost</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {spotUV.map(r => (
                            <TR key={r.id}>
                                <TD>{formatNumber(r.minQty)} — {r.maxQty > 900000 ? "∞" : formatNumber(r.maxQty)}</TD>
                                <TD align="right" className="font-semibold">₹{r.ratePerCopy}</TD>
                                <TD align="right">₹{formatNumber(r.blockCost)}</TD>
                                <TD align="center"><RowActions isEditing={false} canEdit={canEdit} onEdit={() => { }} onSave={() => { }} onCancel={() => { }} onDelete={() => deleteSpotUV(r.id)} /></TD>
                            </TR>
                        ))}
                    </tbody>
                </table>
            </div>

            <TabActionBar onAdd={() => { }} onExport={() => { exportTabCSV("finishing-rates.csv", ["Type", "Rate", "Min Order"], lamination.map(l => [l.type, String(l.ratePerCopy), String(l.minOrder)])); addNotification({ type: "success", title: "Exported", message: "Finishing rates exported.", category: "export" }); }}
                onReset={() => { resetToDefaults("finishing"); addNotification({ type: "info", title: "Reset", message: "Finishing rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={lamination.length + spotUV.length} tabName="finishing rate" />
        </div>
    );
}

// ── Covering Material Tab ────────────────────────────────────────────────────
export function CoveringMaterialTab({ canEdit }: { canEdit: boolean }) {
    const { coveringMaterials, addCovering, updateCovering, deleteCovering, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b">
                            <TH>Material</TH><TH>Code</TH><TH align="right">Roll Width (mm)</TH><TH align="right">Rate/sqm (₹)</TH><TH align="right">Rate/m (₹)</TH><TH>Supplier</TH><TH align="right">MOQ</TH><TH align="right">Lead Time</TH><TH align="center">Status</TH><TH align="center">Actions</TH>
                        </tr>
                    </thead>
                    <tbody>
                        {coveringMaterials.map(m => (
                            <TR key={m.id}>
                                <TD className="font-medium text-text-light-primary dark:text-text-dark-primary">{m.name}</TD>
                                <TD className="font-mono text-xs text-text-light-tertiary">{m.code}</TD>
                                <TD align="right">{m.rollWidth || "—"}</TD>
                                <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">{m.ratePerSqMeter > 0 ? `₹${m.ratePerSqMeter}` : "Paper rate"}</TD>
                                <TD align="right">{m.ratePerMeter > 0 ? `₹${m.ratePerMeter}` : "—"}</TD>
                                <TD className="text-text-light-secondary dark:text-text-dark-secondary">{m.supplier}</TD>
                                <TD align="right">{m.moq || "—"}</TD>
                                <TD align="right">{m.leadTimeDays}d</TD>
                                <TD align="center"><StatusBadge status={m.status} /></TD>
                                <TD align="center"><RowActions isEditing={false} canEdit={canEdit} onEdit={() => { }} onSave={() => { }} onCancel={() => { }} onDelete={() => { deleteCovering(m.id); addNotification({ type: "info", title: "Deleted", message: `${m.name} removed.`, category: "system" }); }} /></TD>
                            </TR>
                        ))}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => { }} onExport={() => { exportTabCSV("covering-materials.csv", ["Name", "Code", "Roll Width", "Rate/sqm", "Rate/m", "Supplier"], coveringMaterials.map(m => [m.name, m.code, String(m.rollWidth), String(m.ratePerSqMeter), String(m.ratePerMeter), m.supplier])); addNotification({ type: "success", title: "Exported", message: "Covering materials exported.", category: "export" }); }}
                onReset={() => { resetToDefaults("covering"); addNotification({ type: "info", title: "Reset", message: "Covering materials restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={coveringMaterials.length} tabName="covering material" />
        </div>
    );
}

// ── Board Types Tab ──────────────────────────────────────────────────────────
export function BoardTypesTab({ canEdit }: { canEdit: boolean }) {
    const { boardTypes, deleteBoard, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b"><TH>Board</TH><TH align="center">Origin</TH><TH align="right">Thickness</TH><TH align="center">Sheet Size</TH><TH align="right">Weight/Sheet</TH><TH align="right">Rate/kg</TH><TH align="right">Rate/Sheet</TH><TH align="center">Status</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {boardTypes.map(b => (
                            <TR key={b.id}>
                                <TD className="font-medium">{b.name}</TD>
                                <TD align="center"><span className={cn("badge text-[10px]", b.origin === "imported" ? "badge-info" : "badge-success")}>{b.origin}</span></TD>
                                <TD align="right">{b.thickness}mm</TD>
                                <TD align="center">{b.sheetWidth}"×{b.sheetHeight}"</TD>
                                <TD align="right">{b.weightPerSheet}kg</TD>
                                <TD align="right">₹{b.ratePerKg}</TD>
                                <TD align="right" className="font-semibold text-primary-600 dark:text-primary-400">₹{b.ratePerSheet.toFixed(2)}</TD>
                                <TD align="center"><StatusBadge status={b.status} /></TD>
                                <TD align="center"><RowActions isEditing={false} canEdit={canEdit} onEdit={() => { }} onSave={() => { }} onCancel={() => { }} onDelete={() => deleteBoard(b.id)} /></TD>
                            </TR>
                        ))}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => { }} onExport={() => { exportTabCSV("board-types.csv", ["Name", "Origin", "Thickness", "Size", "Weight", "Rate/kg", "Rate/Sheet"], boardTypes.map(b => [b.name, b.origin, String(b.thickness), `${b.sheetWidth}x${b.sheetHeight}`, String(b.weightPerSheet), String(b.ratePerKg), String(b.ratePerSheet)])); addNotification({ type: "success", title: "Exported", message: "Board types exported.", category: "export" }); }}
                onReset={() => { resetToDefaults("board"); addNotification({ type: "info", title: "Reset", message: "Board types restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={boardTypes.length} tabName="board type" />
        </div>
    );
}

// ── Freight Rates Tab ────────────────────────────────────────────────────────
export function FreightRatesTab({ search, canEdit }: { search: string; canEdit: boolean }) {
    const { freightDestinations, deleteFreight, resetToDefaults } = useRateCardStore();
    const { addNotification } = useAppStore();
    const filtered = freightDestinations.filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase()));

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead><tr className="bg-surface-light-tertiary dark:bg-surface-dark-tertiary border-b"><TH>Destination</TH><TH>Country</TH><TH align="center">Type</TH><TH align="right">Sea/20ft ($)</TH><TH align="right">Sea/Pallet ($)</TH><TH align="right">Surface/Pallet (₹)</TH><TH align="right">Air/kg (₹)</TH><TH align="right">Clearance (₹)</TH><TH align="right">Transit</TH><TH align="center">Actions</TH></tr></thead>
                    <tbody>
                        {filtered.map(d => (
                            <TR key={d.id}>
                                <TD className="font-medium text-text-light-primary dark:text-text-dark-primary">{d.name}</TD>
                                <TD className="text-text-light-secondary dark:text-text-dark-secondary">{d.country}</TD>
                                <TD align="center"><span className={cn("badge text-[9px]", d.isOverseas ? "badge-info" : "badge-success")}>{d.isOverseas ? "Overseas" : "Domestic"}</span></TD>
                                <TD align="right">{d.seaFreightPerContainer20 > 0 ? `$${formatNumber(d.seaFreightPerContainer20)}` : "—"}</TD>
                                <TD align="right">{d.seaFreightPerPallet > 0 ? `$${d.seaFreightPerPallet}` : "—"}</TD>
                                <TD align="right">{d.surfacePerPallet > 0 ? `₹${formatNumber(d.surfacePerPallet)}` : d.surfacePerTruck > 0 ? `₹${formatNumber(d.surfacePerTruck)}/truck` : "—"}</TD>
                                <TD align="right">{d.airFreightPerKg > 0 ? `₹${d.airFreightPerKg}` : "—"}</TD>
                                <TD align="right">{d.clearanceCharges > 0 ? `₹${formatNumber(d.clearanceCharges)}` : "—"}</TD>
                                <TD align="right">{d.transitTimeDays}d</TD>
                                <TD align="center"><RowActions isEditing={false} canEdit={canEdit} onEdit={() => { }} onSave={() => { }} onCancel={() => { }} onDelete={() => deleteFreight(d.id)} /></TD>
                            </TR>
                        ))}
                    </tbody>
                </table>
            </div>
            <TabActionBar onAdd={() => { }} onExport={() => { exportTabCSV("freight-rates.csv", ["Name", "Country", "Type", "Sea/20ft", "Sea/Pallet", "Surface", "Air/kg", "Clearance"], filtered.map(d => [d.name, d.country, d.isOverseas ? "Overseas" : "Domestic", String(d.seaFreightPerContainer20), String(d.seaFreightPerPallet), String(d.surfacePerPallet), String(d.airFreightPerKg), String(d.clearanceCharges)])); addNotification({ type: "success", title: "Exported", message: "Freight rates exported.", category: "export" }); }}
                onReset={() => { resetToDefaults("freight"); addNotification({ type: "info", title: "Reset", message: "Freight rates restored.", category: "system" }); }}
                canEdit={canEdit} itemCount={filtered.length} tabName="freight destination" />
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
                <TabActionBar onAdd={() => { }} onExport={() => { exportTabCSV("packing-rates.csv", ["Item", "Rate"], Object.entries(packingRates).map(([k, v]) => [k, String(v)])); addNotification({ type: "success", title: "Exported", message: "Packing rates exported.", category: "export" }); }}
                    onReset={() => { resetToDefaults("packing"); addNotification({ type: "info", title: "Reset", message: "Packing rates restored.", category: "system" }); }}
                    canEdit={canEdit} itemCount={Object.keys(packingRates).length} tabName="packing rate" />
            </div>
        </div>
    );
}
