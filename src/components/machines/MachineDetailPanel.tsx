import { Machine } from '@/types/machine.types';
import { MachineType, MachineStatus, ColorMode, InkType } from '@/types/machine.enums';
import { recalculateMachineComputedFields } from '@/types/machine.computed';
import { formatCurrency } from '@/utils/format';
import { X, Save, Settings, Layers, Droplets, CreditCard, ChevronDown, ChevronUp, Zap, Clock, Trash2, Box, Wind, Activity } from 'lucide-react';
import { useState } from 'react';

interface MachineDetailPanelProps {
    machine: Machine;
    onSave: (machine: Machine) => void;
    onCancel: () => void;
    isNew?: boolean;
}

function Section({ title, icon: Icon, defaultOpen, children }: { title: string; icon?: any; defaultOpen?: boolean; children: React.ReactNode }) {
    const [open, setOpen] = useState(defaultOpen ?? false);
    return (
        <div className="border border-surface-light-border dark:border-surface-dark-border rounded-lg overflow-hidden bg-surface-light-primary dark:bg-surface-dark-primary shadow-sm">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-2.5 bg-surface-light-tertiary/50 dark:bg-surface-dark-tertiary/50 hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary text-sm font-semibold text-text-light-primary dark:text-text-dark-primary transition-colors">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-primary-500" />}
                    {title}
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-text-light-tertiary" /> : <ChevronDown className="w-4 h-4 text-text-light-tertiary" />}
            </button>
            {open && <div className="p-4 space-y-4">{children}</div>}
        </div>
    );
}

export function MachineDetailPanel({ machine, onSave, onCancel, isNew }: MachineDetailPanelProps) {
    const [form, setForm] = useState<Machine>(machine);

    const updateField = (field: keyof Machine, value: any) => {
        setForm(prev => {
            const next = { ...prev, [field]: value };
            return recalculateMachineComputedFields(next);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
            <div className="relative card w-full max-w-5xl max-h-[90vh] animate-scale-in flex flex-col shadow-2xl border border-surface-light-border dark:border-surface-dark-border">
                <div className="flex items-center justify-between p-5 border-b border-surface-light-border dark:border-surface-dark-border bg-surface-light-primary dark:bg-surface-dark-secondary rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center border border-primary-100 dark:border-primary-500/20 shadow-inner">
                            <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary tracking-tight">
                                {isNew ? 'Initialize Machine Profile' : 'Refine Machine Configuration'}
                            </h2>
                            <p className="text-[11px] font-mono text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wider mt-0.5">
                                UID: {form.id.split('-')[0]} • PRO_TIER_CONFIG
                            </p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 rounded-lg hover:bg-surface-light-tertiary dark:hover:bg-surface-dark-tertiary text-text-light-tertiary hover:text-text-light-primary transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-surface-light-secondary/20 dark:bg-surface-dark-secondary/5">

                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-primary-50 dark:bg-primary-500/10 rounded-xl border border-primary-200 dark:border-primary-500/20 shadow-sm relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-5">
                            <Activity className="w-32 h-32" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-primary-600 dark:text-primary-400 tracking-widest mb-1">Total Effective Hourly Rate</p>
                            <p className="text-2xl font-black text-text-light-primary dark:text-text-dark-primary font-mono tracking-tighter">
                                {formatCurrency(form.totalHourlyCost)}<span className="text-sm font-semibold text-text-light-tertiary">/hr</span>
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-text-light-tertiary tracking-widest mb-1">Labor Map</p>
                            <p className="text-lg font-bold text-text-light-primary dark:text-text-dark-primary font-mono">{formatCurrency(form.totalLaborCostPerHour)}/hr</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <p className="text-[10px] font-bold uppercase text-text-light-tertiary tracking-widest mb-1">Asset Decay</p>
                                <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary font-mono">{formatCurrency(form.hourlyRentAllocation + form.hourlyDepreciation)}/hr</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase text-text-light-tertiary tracking-widest mb-1">Energy Load</p>
                                <p className="text-sm font-bold text-text-light-primary dark:text-text-dark-primary font-mono">{formatCurrency(form.energyCostPerHour)}/hr</p>
                            </div>
                        </div>
                    </div>

                    <Section title="Core Identity & Meta" icon={Settings} defaultOpen>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="System Namespace" value={form.name} onChange={(v: any) => updateField('name', v)} required />
                            <Field label="Short Alias" value={form.nickname} onChange={(v: any) => updateField('nickname', v)} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Select label="Topology Class" value={form.type} onChange={(v: any) => updateField('type', v)} options={Object.values(MachineType)} />
                            <Select label="Operational Vector" value={form.status} onChange={(v: any) => updateField('status', v)} options={Object.values(MachineStatus)} />
                            <Field label="Hardware Serial" value={form.serialNumber} onChange={(v: any) => updateField('serialNumber', v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="OEM Provider" value={form.manufacturer} onChange={(v: any) => updateField('manufacturer', v)} />
                            <Field label="Chassis Designation" value={form.model} onChange={(v: any) => updateField('model', v)} />
                        </div>
                    </Section>

                    <Section title="Kinematic & Physical Constraints" icon={Layers}>
                        <div className="grid grid-cols-4 gap-4">
                            <Field label="Max Width (mm)" type="number" value={form.maxSheetWidth_mm} onChange={(v: any) => updateField('maxSheetWidth_mm', Number(v))} />
                            <Field label="Max Height (mm)" type="number" value={form.maxSheetHeight_mm} onChange={(v: any) => updateField('maxSheetHeight_mm', Number(v))} />
                            <Field label="Min Width (mm)" type="number" value={form.minSheetWidth_mm} onChange={(v: any) => updateField('minSheetWidth_mm', Number(v))} />
                            <Field label="Min Height (mm)" type="number" value={form.minSheetHeight_mm} onChange={(v: any) => updateField('minSheetHeight_mm', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <Field label="Gripper Base (mm)" type="number" value={form.gripperMargin_mm} onChange={(v: any) => updateField('gripperMargin_mm', Number(v))} />
                            <Field label="Side Margin (mm)" type="number" value={form.sideMargin_mm} onChange={(v: any) => updateField('sideMargin_mm', Number(v))} />
                            <Field label="Tail Margin (mm)" type="number" value={form.tailMargin_mm} onChange={(v: any) => updateField('tailMargin_mm', Number(v))} />
                            <Field label="Max Rigidity (pts)" type="number" value={form.maxSubstrateRigidity_pts} onChange={(v: any) => updateField('maxSubstrateRigidity_pts', Number(v))} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <Field label="Min Caliper (pts)" type="number" value={form.minCaliper_pts} onChange={(v: any) => updateField('minCaliper_pts', Number(v))} />
                            <Field label="Gripper Bite Min (mm)" type="number" value={form.gripperBite_min_mm} onChange={(v: any) => updateField('gripperBite_min_mm', Number(v))} />
                            <Field label="Gripper Bite Max (mm)" type="number" value={form.gripperBite_max_mm} onChange={(v: any) => updateField('gripperBite_max_mm', Number(v))} />
                        </div>
                    </Section>

                    <Section title="Color Architecture Matrix" icon={Droplets}>
                        <div className="grid grid-cols-4 gap-4">
                            <Select label="Color Profile" value={form.colorMode} onChange={(v: any) => updateField('colorMode', v)} options={Object.values(ColorMode)} />
                            <Field label="Tower Count" type="number" value={form.maxColorsPerPass} onChange={(v: any) => updateField('maxColorsPerPass', Number(v))} />
                            <Select label="Ink Rheology" value={form.inkType} onChange={(v: any) => updateField('inkType', v)} options={Object.values(InkType)} />
                            <div className="flex items-end gap-2 pb-0.5">
                                <label className="label flex items-center gap-2">
                                    <input type="checkbox" checked={form.canPerfect || false} onChange={e => updateField('canPerfect', e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500" /> Engage Perfector
                                </label>
                            </div>
                        </div>
                    </Section>

                    <Section title="Advanced Kinematics & Velocity (OEE)" icon={Zap}>
                        <div className="grid grid-cols-4 gap-4">
                            <Field label="Rated Max (Cycles/hr)" type="number" value={form.ratedSpeed} onChange={(v: any) => updateField('ratedSpeed', Number(v))} />
                            <Field label="Effective OEE Speed" type="number" value={form.effectiveSpeed} onChange={(v: any) => updateField('effectiveSpeed', Number(v))} />
                            <Field label="Duplex Mod Factor (x)" type="number" value={form.duplexSpeedFactor} onChange={(v: any) => updateField('duplexSpeedFactor', Number(v))} />
                            <Field label="Ramp-Up Curve (%)" type="number" value={form.speedCurve_startup_percent} onChange={(v: any) => updateField('speedCurve_startup_percent', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                            <Field label="Ramp Duration (m)" type="number" value={form.speedCurve_startupDuration_mins} onChange={(v: any) => updateField('speedCurve_startupDuration_mins', Number(v))} />
                            <Field label="Heavy TIC Drag (%)" type="number" value={form.speedReduction_heavyInkCoverage_percent} onChange={(v: any) => updateField('speedReduction_heavyInkCoverage_percent', Number(v))} />
                            <Field label="Multi-Unit Sync Drag (%)" type="number" value={form.speedReduction_perAdditionalColor_percent} onChange={(v: any) => updateField('speedReduction_perAdditionalColor_percent', Number(v))} />
                            <Field label="Coating Pass Drag (%)" type="number" value={form.speedReductionCoating_percent} onChange={(v: any) => updateField('speedReductionCoating_percent', Number(v))} />
                        </div>
                    </Section>

                    <Section title="Micro-Makeready Pro Operations" icon={Clock}>
                        <div className="grid grid-cols-4 gap-4 p-3 bg-surface-light-tertiary/30 dark:bg-surface-dark-tertiary/20 rounded-lg">
                            <Field label="Base Setup (m)" type="number" value={form.setupTimeBase_mins} onChange={(v: any) => updateField('setupTimeBase_mins', Number(v))} />
                            <Field label="Per-Color Wash (m)" type="number" value={form.setupTimePerColor_mins} onChange={(v: any) => updateField('setupTimePerColor_mins', Number(v))} />
                            <Field label="Plate APC Time (m)" type="number" value={form.autoPlateLoadingTime_perPlate_mins} onChange={(v: any) => updateField('autoPlateLoadingTime_perPlate_mins', Number(v))} />
                            <Field label="CIP3 Ingest (m)" type="number" value={form.cip3DataProcessingTime_mins} onChange={(v: any) => updateField('cip3DataProcessingTime_mins', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <Field label="Size Adjust (m)" type="number" value={form.setupTime_sheetSizeChange_mins} onChange={(v: any) => updateField('setupTime_sheetSizeChange_mins', Number(v))} />
                            <Field label="Caliper Adjust (m)" type="number" value={form.setupTime_caliperChange_mins} onChange={(v: any) => updateField('setupTime_caliperChange_mins', Number(v))} />
                            <Field label="Deep Wash (UV/Conv) (m)" type="number" value={form.setupTime_inkSystemWash_mins} onChange={(v: any) => updateField('setupTime_inkSystemWash_mins', Number(v))} />
                            <Field label="Coating/Anilox Swap (m)" type="number" value={form.setupTime_coatingChange_mins} onChange={(v: any) => updateField('setupTime_coatingChange_mins', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <Field label="Feeder Align (m)" type="number" value={form.setupTime_feederAdjustment_mins} onChange={(v: any) => updateField('setupTime_feederAdjustment_mins', Number(v))} />
                            <Field label="Delivery Align (m)" type="number" value={form.setupTime_deliveryAdjustment_mins} onChange={(v: any) => updateField('setupTime_deliveryAdjustment_mins', Number(v))} />
                            <Field label="Register Sync (m)" type="number" value={form.registerSetupTime_mins} onChange={(v: any) => updateField('registerSetupTime_mins', Number(v))} />
                            <Field label="Substrate Load (m)" type="number" value={form.paperLoadTime_mins} onChange={(v: any) => updateField('paperLoadTime_mins', Number(v))} />
                        </div>
                    </Section>

                    <Section title="Six Sigma Waste & Spoilage Matrix" icon={Trash2}>
                        <div className="grid grid-cols-4 gap-4 p-3 bg-danger-50 dark:bg-danger-500/5 rounded-lg border border-danger-200 dark:border-danger-500/10">
                            <Field label="Base Waste (Sht)" type="number" value={form.setupWasteSheets_base} onChange={(v: any) => updateField('setupWasteSheets_base', Number(v))} />
                            <Field label="Waste per Color (Sht)" type="number" value={form.setupWasteSheets_perColor} onChange={(v: any) => updateField('setupWasteSheets_perColor', Number(v))} />
                            <Field label="Run Spoilage (%)" type="number" value={form.runningWaste_percent} onChange={(v: any) => updateField('runningWaste_percent', Number(v))} />
                            <Field label="Min Spoilage (Sht)" type="number" value={form.runningWaste_minimum} onChange={(v: any) => updateField('runningWaste_minimum', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <Field label="Jam Allowance (%)" type="number" value={form.spoilage_jamRate_percent} onChange={(v: any) => updateField('spoilage_jamRate_percent', Number(v))} />
                            <Field label="Color Drift Drop (%)" type="number" value={form.spoilage_colorVariation_percent} onChange={(v: any) => updateField('spoilage_colorVariation_percent', Number(v))} />
                            <Field label="Caliper Delta Waste (Sht)" type="number" value={form.setupWaste_caliperChange_sheets} onChange={(v: any) => updateField('setupWaste_caliperChange_sheets', Number(v))} />
                            <Field label="Profile Delta Waste (Sht)" type="number" value={form.setupWaste_colorProfileChange_sheets} onChange={(v: any) => updateField('setupWaste_colorProfileChange_sheets', Number(v))} />
                        </div>
                    </Section>

                    <Section title="Advanced Consumables Logistics" icon={Box}>
                        <div className="grid grid-cols-4 gap-4">
                            <Field label="Ink Load (g/sqm)" type="number" value={form.inkCoverage_gramsPerSqm} onChange={(v: any) => updateField('inkCoverage_gramsPerSqm', Number(v))} />
                            <Field label="Ink Bulk Cost ($/kg)" type="number" value={form.inkCost_perKg} onChange={(v: any) => updateField('inkCost_perKg', Number(v))} />
                            <Field label="Pantone Diff (x)" type="number" value={form.inkCost_pantoneMultiplier} onChange={(v: any) => updateField('inkCost_pantoneMultiplier', Number(v))} />
                            <Field label="Additives ($/L)" type="number" value={form.fountainSolutionAdditiveCost_perLiter} onChange={(v: any) => updateField('fountainSolutionAdditiveCost_perLiter', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <Field label="Plate Die/Punch ($)" type="number" value={form.platePunchingCost_perPlate} onChange={(v: any) => updateField('platePunchingCost_perPlate', Number(v))} />
                            <Field label="Wash Cloth Roll ($/m)" type="number" value={form.washRollerCloth_costPerMeter} onChange={(v: any) => updateField('washRollerCloth_costPerMeter', Number(v))} />
                            <Field label="Cloth per Cycle (m)" type="number" value={form.washRollerCloth_metersPerWash} onChange={(v: any) => updateField('washRollerCloth_metersPerWash', Number(v))} />
                            <Field label="Setoff Powder ($/kg)" type="number" value={form.antiSetoffPowder_costPerKg} onChange={(v: any) => updateField('antiSetoffPowder_costPerKg', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <Field label="Powder/10k (kg)" type="number" value={form.antiSetoffPowder_kgPer10k_sheets} onChange={(v: any) => updateField('antiSetoffPowder_kgPer10k_sheets', Number(v))} />
                            <Field label="Wash Solv. ($/L)" type="number" value={form.washSolventCost_perLiter} onChange={(v: any) => updateField('washSolventCost_perLiter', Number(v))} />
                            <Field label="Solvent/Cycle (L)" type="number" value={form.washSolventUsage_litersPerWash} onChange={(v: any) => updateField('washSolventUsage_litersPerWash', Number(v))} />
                            <Field label="Dampening Sol. ($/L)" type="number" value={form.fountainSolutionCost_perLiter} onChange={(v: any) => updateField('fountainSolutionCost_perLiter', Number(v))} />
                        </div>
                    </Section>

                    <Section title="Ultra-Detailed Environmental Overhead" icon={Wind}>
                        <div className="grid grid-cols-4 gap-4 p-3 bg-success-50 dark:bg-success-500/5 rounded-lg border border-success-200 dark:border-success-500/10">
                            <Field label="Base Ops (kW)" type="number" value={form.powerConsumption_kW} onChange={(v: any) => updateField('powerConsumption_kW', Number(v))} />
                            <Field label="Standby (kW)" type="number" value={form.standbyPower_kW} onChange={(v: any) => updateField('standbyPower_kW', Number(v))} />
                            <Field label="Utility Rate ($/kWh)" type="number" value={form.electricityCost_perKWh} onChange={(v: any) => updateField('electricityCost_perKWh', Number(v))} />
                            <Field label="Env. Tax Penalty ($/h)" type="number" value={form.environmentalTax_perHour} onChange={(v: any) => updateField('environmentalTax_perHour', Number(v))} />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <Field label="HVAC Chiller Load (kW)" type="number" value={form.hvacConsumption_kW_perHour} onChange={(v: any) => updateField('hvacConsumption_kW_perHour', Number(v))} />
                            <Field label="Pneumatic Load (kW)" type="number" value={form.airCompressor_kW_perHour} onChange={(v: any) => updateField('airCompressor_kW_perHour', Number(v))} />
                            <Field label="UV Array (kW)" type="number" value={form.uvLampPower_kW_perHour} onChange={(v: any) => updateField('uvLampPower_kW_perHour', Number(v))} />
                            <Field label="IR Therm. Dryer (kW)" type="number" value={form.irDryerPower_kW_perHour} onChange={(v: any) => updateField('irDryerPower_kW_perHour', Number(v))} />
                        </div>
                    </Section>

                    <Section title="Base Financial Modifiers" icon={CreditCard}>
                        <div className="grid grid-cols-4 gap-4">
                            <Field label="Base Hr Rate" type="number" value={form.hourlyRate} onChange={(v: any) => updateField('hourlyRate', Number(v))} />
                            <Field label="Fixed Setup Chg" type="number" value={form.fixedSetupCost} onChange={(v: any) => updateField('fixedSetupCost', Number(v))} />
                            <Field label="CTP Pre-press / Plt" type="number" value={form.ctpRate_perPlate} onChange={(v: any) => updateField('ctpRate_perPlate', Number(v))} />
                            <Field label="Material / Plt" type="number" value={form.plateCost_each} onChange={(v: any) => updateField('plateCost_each', Number(v))} />
                        </div>
                    </Section>
                </div>

                <div className="flex justify-between items-center gap-3 p-5 border-t border-surface-light-border dark:border-surface-dark-border bg-surface-light-primary dark:bg-surface-dark-secondary rounded-b-2xl">
                    <div className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary flex items-center gap-2 font-mono uppercase tracking-widest">
                        <Activity className="w-3 h-3 text-success-500" /> Validation Engine Online • Deep Compute Active
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onCancel} className="btn-secondary text-sm">Cancel Sequence</button>
                        <button onClick={() => onSave(form)} disabled={!form.name?.trim()} className="btn-primary flex items-center gap-1.5 text-sm shadow-xl shadow-primary-500/20">
                            <Save className="w-4 h-4" /> {isNew ? "Engage Profile" : "Commit Overrides"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text', required }: any) {
    return (
        <div>
            <label className="text-[11px] font-bold text-text-light-secondary dark:text-text-dark-secondary tracking-wider uppercase mb-1.5 block">
                {label} {required && <span className="text-danger-500">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="input-field text-sm font-semibold text-text-light-primary dark:text-text-dark-primary h-10 shadow-sm"
                placeholder="--/--"
            />
        </div>
    );
}

function Select({ label, value, onChange, options, required }: any) {
    return (
        <div>
            <label className="text-[11px] font-bold text-text-light-secondary dark:text-text-dark-secondary tracking-wider uppercase mb-1.5 block">
                {label} {required && <span className="text-danger-500">*</span>}
            </label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="input-field text-sm font-semibold text-text-light-primary dark:text-text-dark-primary h-10 shadow-sm"
            >
                {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}
