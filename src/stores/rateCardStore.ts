import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { generateId } from "@/utils/format";
import type { InventoryTransfer } from "@/types";
import {
    DEFAULT_PAPER_RATES, IMPRESSION_RATES_DATA,
    WASTAGE_CHART, PERFECT_BINDING_RATES, SADDLE_STITCHING_RATES,
    LAMINATION_RATES, SPOT_UV_RATES, UV_VARNISH_RATES,
    AQUEOUS_VARNISH_RATE, GOLD_BLOCKING_RATES, EMBOSSING_RATES,
    DIE_CUTTING_RATES, PACKING_RATES, DEFAULT_DESTINATIONS,
    DEFAULT_COVERING_MATERIALS, DEFAULT_BOARD_TYPES,
    HARDCASE_DEFAULTS, WIRE_O_RATES, CTP_RATES
} from "@/constants";

// ── Types ────────────────────────────────────────────────────────────────────

export type RateStatus = "active" | "draft" | "inactive";

export interface PaperRateEntry {
    id: string;
    paperType: string;
    code: string;
    gsm: number;
    size: string;
    landedCost: number;
    chargeRate: number;
    ratePerKg: number;
    supplier: string;
    moq: number;
    hsnCode: string;
    marginPercent: number;
    effectiveRate: number;
    validFrom: string;
    validTo: string;
    notes: string;
    status: RateStatus;
    createdAt: string;
    updatedAt: string;
}

export interface WastageEntry {
    id: string;
    minQuantity: number;
    maxQuantity: number;
    fourColorWaste: number;
    twoColorWaste: number;
    oneColorWaste: number;
    isPercentage: boolean;
    status: RateStatus;
}

export interface PerfectBindingEntry {
    id: string;
    minQty: number;
    maxQty: number;
    ratePer16pp: number;
    gatheringRate: number;
    setupCost: number;
    notes: string;
    status: RateStatus;
}

export interface SaddleStitchEntry {
    id: string;
    minQty: number;
    maxQty: number;
    ratePerCopy: number;
    setupCost: number;
    status: RateStatus;
}

export interface WireOEntry {
    id: string;
    diameter: string;
    mm: number;
    pitch: string;
    maxThickness: number;
    standardPer100: number;
    metalPer100: number;
    status: RateStatus;
}

export interface LaminationEntry {
    id: string;
    type: string;
    ratePerCopy: number;
    minOrder: number;
    setupCost: number;
    notes: string;
    status: RateStatus;
}

export interface SpotUVEntry {
    id: string;
    minQty: number;
    maxQty: number;
    ratePerCopy: number;
    blockCost: number;
    status: RateStatus;
}

export interface CoveringMaterialEntry {
    id: string;
    name: string;
    code: string;
    rollWidth: number;
    rollLength: number;
    ratePerSqMeter: number;
    ratePerMeter: number;
    costPerRoll: number;
    supplier: string;
    moq: number;
    leadTimeDays: number;
    notes: string;
    isActive: boolean;
    status: RateStatus;
}

export interface BoardTypeEntry {
    id: string;
    name: string;
    origin: "imported" | "indian";
    thickness: number;
    sheetWidth: number;
    sheetHeight: number;
    weightPerSheet: number;
    ratePerKg: number;
    ratePerSheet: number;
    supplier: string;
    notes: string;
    isActive: boolean;
    status: RateStatus;
}

export interface ImpressionRateEntry {
    id: string;
    rangeMin: number;
    rangeMax: number;
    fav: number;
    rekordAQ: number;
    rekordNoAQ: number;
    rmgt: number;
    rmgtPerfecto: number;
    status: RateStatus;
}

export interface FreightDestEntry {
    id: string;
    code: string;
    name: string;
    country: string;
    isOverseas: boolean;
    seaFreightPerContainer20: number;
    seaFreightPerContainer40: number;
    seaFreightPerPallet: number;
    surfacePerContainer: number;
    surfacePerPallet: number;
    surfacePerTruck: number;
    surfacePerTon: number;
    airFreightPerKg: number;
    clearanceCharges: number;
    chaCharges: number;
    portHandling: number;
    documentation: number;
    blCharges: number;
    insurancePercent: number;
    transitTimeDays: number;
    notes: string;
    isActive: boolean;
    status: RateStatus;
}

export interface PackingRatesEntry {
    carton3Ply: number;
    carton5Ply: number;
    customPrintSurcharge: number;
    innerPartition: number;
    palletStandard: number;
    palletHeatTreated: number;
    palletEuro: number;
    stretchWrap: number;
    strapping: number;
    cornerProtectors: number;
    polybag: number;
    kraftWrap: number;
}

export interface TransferEntry {
    id: string;
    itemName: string;
    itemSku: string;
    category: string;
    quantity: number;
    unit: string;
    fromWarehouse: string;
    fromZone: string;
    toWarehouse: string;
    toZone: string;
    transferDate: string;
    expectedArrivalDate: string;
    actualArrivalDate: string;
    status: "pending" | "approved" | "in_transit" | "received" | "cancelled";
    transportMode: "manual" | "truck" | "courier" | "rail" | "air";
    vehicleNumber: string;
    driverName: string;
    trackingNumber: string;
    transportCharges: number;
    handlingCharges: number;
    insuranceCharges: number;
    packagingCharges: number;
    otherCharges: number;
    totalTransferCost: number;
    requestedBy: string;
    approvedBy: string;
    receivedBy: string;
    notes: string;
    reason: string;
    priorityLevel: "low" | "medium" | "high" | "urgent";
    createdAt: string;
    updatedAt: string;
}

// ── Seed Functions ───────────────────────────────────────────────────────────

function seedPaperRates(): PaperRateEntry[] {
    return DEFAULT_PAPER_RATES.map((r, i) => ({
        id: `pr_${i}`,
        paperType: r.paperType,
        code: r.code,
        gsm: r.gsm,
        size: r.size,
        landedCost: r.landedCost,
        chargeRate: r.chargeRate,
        ratePerKg: r.ratePerKg,
        supplier: "",
        moq: 0,
        hsnCode: "4802",
        marginPercent: r.chargeRate > 0 && r.landedCost > 0 ? Math.round(((r.chargeRate - r.landedCost) / r.landedCost) * 100) : 0,
        effectiveRate: r.chargeRate,
        validFrom: "",
        validTo: "",
        notes: "",
        status: "active" as RateStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }));
}

function seedWastage(): WastageEntry[] {
    return WASTAGE_CHART.map(w => ({ ...w, status: "active" as RateStatus }));
}

function seedImpressionRates(): ImpressionRateEntry[] {
    return IMPRESSION_RATES_DATA.map((r, i) => ({
        id: `ir_${i}`,
        rangeMin: r.range[0],
        rangeMax: r.range[1],
        fav: r.fav,
        rekordAQ: r.rekordAQ,
        rekordNoAQ: r.rekordNoAQ,
        rmgt: r.rmgt,
        rmgtPerfecto: r.rmgtPerfecto,
        status: "active" as RateStatus,
    }));
}

function seedPerfectBinding(): PerfectBindingEntry[] {
    return PERFECT_BINDING_RATES.map((r, i) => ({
        id: `pb_${i}`, minQty: r.minQty, maxQty: r.maxQty,
        ratePer16pp: r.ratePer16pp, gatheringRate: r.gatheringRate,
        setupCost: 0, notes: "", status: "active" as RateStatus,
    }));
}

function seedSaddleStitch(): SaddleStitchEntry[] {
    return SADDLE_STITCHING_RATES.map((r, i) => ({
        id: `ss_${i}`, minQty: r.minQty, maxQty: r.maxQty,
        ratePerCopy: r.ratePerCopy, setupCost: 0, status: "active" as RateStatus,
    }));
}

function seedWireO(): WireOEntry[] {
    return WIRE_O_RATES.map((r, i) => ({
        id: `wo_${i}`, ...r, status: "active" as RateStatus,
    }));
}

function seedLamination(): LaminationEntry[] {
    return Object.entries(LAMINATION_RATES).map(([type, rate], i) => ({
        id: `lam_${i}`, type, ratePerCopy: rate.ratePerCopy, minOrder: rate.minOrder,
        setupCost: 0, notes: "", status: "active" as RateStatus,
    }));
}

function seedSpotUV(): SpotUVEntry[] {
    return SPOT_UV_RATES.map((r, i) => ({
        id: `suv_${i}`, ...r, status: "active" as RateStatus,
    }));
}

function seedCovering(): CoveringMaterialEntry[] {
    return DEFAULT_COVERING_MATERIALS.map(m => ({
        ...m, moq: 0, leadTimeDays: 14, notes: "", status: "active" as RateStatus,
    }));
}

function seedBoards(): BoardTypeEntry[] {
    return DEFAULT_BOARD_TYPES.map(b => ({
        ...b, supplier: "", notes: "", status: "active" as RateStatus,
    }));
}

function seedFreight(): FreightDestEntry[] {
    return DEFAULT_DESTINATIONS.map(d => ({
        ...d, transitTimeDays: d.isOverseas ? 28 : 3, notes: "", status: "active" as RateStatus,
    }));
}

function seedPacking(): PackingRatesEntry {
    return {
        carton3Ply: PACKING_RATES.carton3Ply,
        carton5Ply: PACKING_RATES.carton5Ply,
        customPrintSurcharge: PACKING_RATES.customPrintSurcharge,
        innerPartition: PACKING_RATES.innerPartition,
        palletStandard: PACKING_RATES.palletStandard,
        palletHeatTreated: PACKING_RATES.palletHeatTreated,
        palletEuro: PACKING_RATES.palletEuro,
        stretchWrap: PACKING_RATES.stretchWrap,
        strapping: PACKING_RATES.strapping,
        cornerProtectors: PACKING_RATES.cornerProtectors,
        polybag: PACKING_RATES.polybag,
        kraftWrap: PACKING_RATES.kraftWrap,
    };
}

// ── Store Interface ──────────────────────────────────────────────────────────

interface RateCardState {
    paperRates: PaperRateEntry[];
    wastageChart: WastageEntry[];
    perfectBinding: PerfectBindingEntry[];
    bindingRates: PerfectBindingEntry[];
    saddleStitch: SaddleStitchEntry[];
    wireO: WireOEntry[];
    lamination: LaminationEntry[];
    spotUV: SpotUVEntry[];
    coveringMaterials: CoveringMaterialEntry[];
    boardTypes: BoardTypeEntry[];
    freightDestinations: FreightDestEntry[];
    impressionRates: ImpressionRateEntry[];
    packingRates: PackingRatesEntry;
    hardcaseDefaults: Record<string, number>;
    transfers: TransferEntry[];

    // ── Impression Rate Actions ──
    addImpressionRate: (data: Partial<ImpressionRateEntry>) => void;
    updateImpressionRate: (id: string, updates: Partial<ImpressionRateEntry>) => void;
    deleteImpressionRate: (id: string) => void;

    // ── Paper Actions ──
    addPaperRate: (data: Partial<PaperRateEntry>) => void;
    updatePaperRate: (id: string, updates: Partial<PaperRateEntry>) => void;
    deletePaperRate: (id: string) => void;
    duplicatePaperRate: (id: string) => void;

    // ── Wastage Actions ──
    addWastageEntry: (data: Partial<WastageEntry>) => void;
    updateWastageEntry: (id: string, updates: Partial<WastageEntry>) => void;
    deleteWastageEntry: (id: string) => void;

    // ── Binding Actions ──
    addPerfectBinding: (data: Partial<PerfectBindingEntry>) => void;
    updatePerfectBinding: (id: string, updates: Partial<PerfectBindingEntry>) => void;
    deletePerfectBinding: (id: string) => void;
    addSaddleStitch: (data: Partial<SaddleStitchEntry>) => void;
    updateSaddleStitch: (id: string, updates: Partial<SaddleStitchEntry>) => void;
    deleteSaddleStitch: (id: string) => void;
    addWireO: (data: Partial<WireOEntry>) => void;
    updateWireO: (id: string, updates: Partial<WireOEntry>) => void;
    deleteWireO: (id: string) => void;
    updateHardcaseDefaults: (updates: Record<string, number>) => void;

    // ── Finishing Actions ──
    addLamination: (data: Partial<LaminationEntry>) => void;
    updateLamination: (id: string, updates: Partial<LaminationEntry>) => void;
    deleteLamination: (id: string) => void;
    addSpotUV: (data: Partial<SpotUVEntry>) => void;
    updateSpotUV: (id: string, updates: Partial<SpotUVEntry>) => void;
    deleteSpotUV: (id: string) => void;

    // ── Covering Actions ──
    addCovering: (data: Partial<CoveringMaterialEntry>) => void;
    updateCovering: (id: string, updates: Partial<CoveringMaterialEntry>) => void;
    deleteCovering: (id: string) => void;

    // ── Board Actions ──
    addBoard: (data: Partial<BoardTypeEntry>) => void;
    updateBoard: (id: string, updates: Partial<BoardTypeEntry>) => void;
    deleteBoard: (id: string) => void;

    // ── Freight Actions ──
    addFreight: (data: Partial<FreightDestEntry>) => void;
    updateFreight: (id: string, updates: Partial<FreightDestEntry>) => void;
    deleteFreight: (id: string) => void;

    // ── Packing Actions ──
    updatePackingRates: (updates: Partial<PackingRatesEntry>) => void;

    // ── Transfer Actions ──
    addTransfer: (data: Partial<TransferEntry>) => void;
    updateTransfer: (id: string, updates: Partial<TransferEntry>) => void;
    deleteTransfer: (id: string) => void;

    // ── Bulk Actions ──
    resetToDefaults: (category: string) => void;
}

// ── Store Implementation ─────────────────────────────────────────────────────

export const useRateCardStore = create<RateCardState>()(
    persist(
        immer((set) => ({
            paperRates: seedPaperRates(),
            wastageChart: seedWastage(),
            perfectBinding: seedPerfectBinding(),
            bindingRates: seedPerfectBinding(),
            saddleStitch: seedSaddleStitch(),
            wireO: seedWireO(),
            lamination: seedLamination(),
            spotUV: seedSpotUV(),
            coveringMaterials: seedCovering(),
            boardTypes: seedBoards(),
            freightDestinations: seedFreight(),
            impressionRates: seedImpressionRates(),
            packingRates: seedPacking(),
            hardcaseDefaults: { ...HARDCASE_DEFAULTS },
            transfers: [],

            // ── Paper ──────────────────────────────────────────────────────────
            addPaperRate(data) {
                set(s => {
                    s.paperRates.push({
                        id: generateId(), paperType: "", code: "", gsm: 0, size: "23x36",
                        landedCost: 0, chargeRate: 0, ratePerKg: 0, supplier: "", moq: 0,
                        hsnCode: "4802", marginPercent: 0, effectiveRate: 0,
                        validFrom: "", validTo: "", notes: "",
                        status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                        ...data,
                    } as PaperRateEntry);
                });
            },
            updatePaperRate(id, updates) {
                set(s => {
                    const idx = s.paperRates.findIndex(r => r.id === id);
                    if (idx >= 0) Object.assign(s.paperRates[idx], updates, { updatedAt: new Date().toISOString() });
                });
            },
            deletePaperRate(id) { set(s => { s.paperRates = s.paperRates.filter(r => r.id !== id); }); },
            duplicatePaperRate(id) {
                set(s => {
                    const orig = s.paperRates.find(r => r.id === id);
                    if (orig) s.paperRates.push({ ...orig, id: generateId(), status: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                });
            },

            // ── Impression Rates ───────────────────────────────────────────────
            addImpressionRate(data) {
                set(s => { s.impressionRates.push({ id: generateId(), rangeMin: 0, rangeMax: 0, fav: 0, rekordAQ: 0, rekordNoAQ: 0, rmgt: 0, rmgtPerfecto: 0, status: "active", ...data } as ImpressionRateEntry); });
            },
            updateImpressionRate(id, updates) {
                set(s => { const idx = s.impressionRates.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.impressionRates[idx], updates); });
            },
            deleteImpressionRate(id) { set(s => { s.impressionRates = s.impressionRates.filter(r => r.id !== id); }); },

            // ── Wastage ────────────────────────────────────────────────────────
            addWastageEntry(data) {
                set(s => { s.wastageChart.push({ id: generateId(), minQuantity: 0, maxQuantity: 0, fourColorWaste: 0, twoColorWaste: 0, oneColorWaste: 0, isPercentage: false, status: "active", ...data } as WastageEntry); });
            },
            updateWastageEntry(id, updates) {
                set(s => { const idx = s.wastageChart.findIndex(w => w.id === id); if (idx >= 0) Object.assign(s.wastageChart[idx], updates); });
            },
            deleteWastageEntry(id) { set(s => { s.wastageChart = s.wastageChart.filter(w => w.id !== id); }); },

            // ── Perfect Binding ────────────────────────────────────────────────
            addPerfectBinding(data) {
                set(s => { s.perfectBinding.push({ id: generateId(), minQty: 0, maxQty: 0, ratePer16pp: 0, gatheringRate: 0, setupCost: 0, notes: "", status: "active", ...data } as PerfectBindingEntry); });
            },
            updatePerfectBinding(id, updates) {
                set(s => { const idx = s.perfectBinding.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.perfectBinding[idx], updates); });
            },
            deletePerfectBinding(id) { set(s => { s.perfectBinding = s.perfectBinding.filter(r => r.id !== id); }); },

            // ── Saddle Stitch ──────────────────────────────────────────────────
            addSaddleStitch(data) {
                set(s => { s.saddleStitch.push({ id: generateId(), minQty: 0, maxQty: 0, ratePerCopy: 0, setupCost: 0, status: "active", ...data } as SaddleStitchEntry); });
            },
            updateSaddleStitch(id, updates) {
                set(s => { const idx = s.saddleStitch.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.saddleStitch[idx], updates); });
            },
            deleteSaddleStitch(id) { set(s => { s.saddleStitch = s.saddleStitch.filter(r => r.id !== id); }); },

            // ── Wire-O ─────────────────────────────────────────────────────────
            addWireO(data) {
                set(s => { s.wireO.push({ id: generateId(), diameter: "", mm: 0, pitch: "3:1", maxThickness: 0, standardPer100: 0, metalPer100: 0, status: "active", ...data } as WireOEntry); });
            },
            updateWireO(id, updates) {
                set(s => { const idx = s.wireO.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.wireO[idx], updates); });
            },
            deleteWireO(id) { set(s => { s.wireO = s.wireO.filter(r => r.id !== id); }); },
            updateHardcaseDefaults(updates) { set(s => { Object.assign(s.hardcaseDefaults, updates); }); },

            // ── Lamination ─────────────────────────────────────────────────────
            addLamination(data) {
                set(s => { s.lamination.push({ id: generateId(), type: "", ratePerCopy: 0, minOrder: 0, setupCost: 0, notes: "", status: "active", ...data } as LaminationEntry); });
            },
            updateLamination(id, updates) {
                set(s => { const idx = s.lamination.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.lamination[idx], updates); });
            },
            deleteLamination(id) { set(s => { s.lamination = s.lamination.filter(r => r.id !== id); }); },

            // ── Spot UV ────────────────────────────────────────────────────────
            addSpotUV(data) {
                set(s => { s.spotUV.push({ id: generateId(), minQty: 0, maxQty: 0, ratePerCopy: 0, blockCost: 0, status: "active", ...data } as SpotUVEntry); });
            },
            updateSpotUV(id, updates) {
                set(s => { const idx = s.spotUV.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.spotUV[idx], updates); });
            },
            deleteSpotUV(id) { set(s => { s.spotUV = s.spotUV.filter(r => r.id !== id); }); },

            // ── Covering ───────────────────────────────────────────────────────
            addCovering(data) {
                set(s => { s.coveringMaterials.push({ id: generateId(), name: "", code: "", rollWidth: 0, rollLength: 0, ratePerSqMeter: 0, ratePerMeter: 0, costPerRoll: 0, supplier: "", moq: 0, leadTimeDays: 14, notes: "", isActive: true, status: "active", ...data } as CoveringMaterialEntry); });
            },
            updateCovering(id, updates) {
                set(s => { const idx = s.coveringMaterials.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.coveringMaterials[idx], updates); });
            },
            deleteCovering(id) { set(s => { s.coveringMaterials = s.coveringMaterials.filter(r => r.id !== id); }); },

            // ── Board ──────────────────────────────────────────────────────────
            addBoard(data) {
                set(s => { s.boardTypes.push({ id: generateId(), name: "", origin: "indian", thickness: 0, sheetWidth: 0, sheetHeight: 0, weightPerSheet: 0, ratePerKg: 0, ratePerSheet: 0, supplier: "", notes: "", isActive: true, status: "active", ...data } as BoardTypeEntry); });
            },
            updateBoard(id, updates) {
                set(s => { const idx = s.boardTypes.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.boardTypes[idx], updates); });
            },
            deleteBoard(id) { set(s => { s.boardTypes = s.boardTypes.filter(r => r.id !== id); }); },

            // ── Freight ────────────────────────────────────────────────────────
            addFreight(data) {
                set(s => {
                    s.freightDestinations.push({
                        id: generateId(), code: "", name: "", country: "", isOverseas: false,
                        seaFreightPerContainer20: 0, seaFreightPerContainer40: 0, seaFreightPerPallet: 0,
                        surfacePerContainer: 0, surfacePerPallet: 0, surfacePerTruck: 0, surfacePerTon: 0,
                        airFreightPerKg: 0, clearanceCharges: 0, chaCharges: 0, portHandling: 0,
                        documentation: 0, blCharges: 0, insurancePercent: 0,
                        transitTimeDays: 7, notes: "", isActive: true, status: "active",
                        ...data,
                    } as FreightDestEntry);
                });
            },
            updateFreight(id, updates) {
                set(s => { const idx = s.freightDestinations.findIndex(r => r.id === id); if (idx >= 0) Object.assign(s.freightDestinations[idx], updates); });
            },
            deleteFreight(id) { set(s => { s.freightDestinations = s.freightDestinations.filter(r => r.id !== id); }); },

            // ── Packing ────────────────────────────────────────────────────────
            updatePackingRates(updates) { set(s => { Object.assign(s.packingRates, updates); }); },

            // ── Transfers ──────────────────────────────────────────────────────
            addTransfer(data) {
                set(s => {
                    const t: TransferEntry = {
                        id: generateId(), itemName: "", itemSku: "", category: "", quantity: 0, unit: "pcs",
                        fromWarehouse: "", fromZone: "", toWarehouse: "", toZone: "",
                        transferDate: new Date().toISOString().split("T")[0],
                        expectedArrivalDate: "", actualArrivalDate: "",
                        status: "pending", transportMode: "manual",
                        vehicleNumber: "", driverName: "", trackingNumber: "",
                        transportCharges: 0, handlingCharges: 0, insuranceCharges: 0,
                        packagingCharges: 0, otherCharges: 0, totalTransferCost: 0,
                        requestedBy: "", approvedBy: "", receivedBy: "",
                        notes: "", reason: "", priorityLevel: "medium",
                        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                        ...data,
                    };
                    t.totalTransferCost = t.transportCharges + t.handlingCharges + t.insuranceCharges + t.packagingCharges + t.otherCharges;
                    s.transfers.push(t);
                });
            },
            updateTransfer(id, updates) {
                set(s => {
                    const idx = s.transfers.findIndex(t => t.id === id);
                    if (idx >= 0) {
                        Object.assign(s.transfers[idx], updates, { updatedAt: new Date().toISOString() });
                        const t = s.transfers[idx];
                        t.totalTransferCost = t.transportCharges + t.handlingCharges + t.insuranceCharges + t.packagingCharges + t.otherCharges;
                    }
                });
            },
            deleteTransfer(id) { set(s => { s.transfers = s.transfers.filter(t => t.id !== id); }); },

            // ── Reset ──────────────────────────────────────────────────────────
            resetToDefaults(category) {
                set(s => {
                    switch (category) {
                        case "paper": s.paperRates = seedPaperRates(); break;
                        case "wastage": s.wastageChart = seedWastage(); break;
                        case "impressions": s.impressionRates = seedImpressionRates(); break;
                        case "binding": s.perfectBinding = seedPerfectBinding(); s.saddleStitch = seedSaddleStitch(); s.wireO = seedWireO(); s.hardcaseDefaults = { ...HARDCASE_DEFAULTS }; break;
                        case "finishing": s.lamination = seedLamination(); s.spotUV = seedSpotUV(); break;
                        case "covering": s.coveringMaterials = seedCovering(); break;
                        case "board": s.boardTypes = seedBoards(); break;
                        case "freight": s.freightDestinations = seedFreight(); break;
                        case "packing": s.packingRates = seedPacking(); break;
                        case "transfers": s.transfers = []; break;
                    }
                });
            },
        })),
        {
            name: "print-estimator-ratecard-store",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
