import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
    InventoryItem, InventoryCategory, MachineDetail,
    NMIRecord, InventoryTransfer
} from "@/types";
import { generateId } from "@/utils/format";

// ── Default Inventory Items (migrated from old schema) ───────────────────────
function createDefaultItem(overrides: Partial<InventoryItem>): InventoryItem {
    return {
        id: generateId(), name: "", sku: "", barcode: "", category: "other",
        subcategory: "", description: "", tags: [],
        stock: 0, minLevel: 0, maxLevel: 9999, reorderQty: 0, unit: "Pcs",
        batchNumber: "", lotNumber: "",
        costPerUnit: 0, sellingPrice: 0, lastPurchasePrice: 0, avgCost: 0,
        taxRate: 18, hsnCode: "",
        warehouse: "Main Warehouse", zone: "A", rack: "", shelf: "", bin: "",
        supplier: "", supplierCode: "", leadTimeDays: 7, alternateSuppliers: [],
        lastUpdated: new Date().toISOString(), expiryDate: "", manufacturedDate: "",
        lastAuditDate: "", lastMovedDate: new Date().toISOString(),
        weight: 0, weightUnit: "kg", length: 0, width: 0, height: 0,
        dimensionUnit: "mm", volumeCBM: 0,
        status: "active", condition: "new", nmiFlag: false, movementClass: "fast_moving",
        qualityGrade: "A", certifications: [], shelfLifeDays: 0,
        storageConditions: "", handlingInstructions: "", notes: "",
        ...overrides,
    };
}

const INITIAL_ITEMS: InventoryItem[] = [
    createDefaultItem({ id: "inv-1", name: "Matt Art Paper 80gsm", sku: "PAP-MA-080", category: "paper", subcategory: "Art Paper", unit: "Reams", stock: 350, minLevel: 50, maxLevel: 1000, reorderQty: 100, costPerUnit: 2800, sellingPrice: 3200, lastPurchasePrice: 2750, avgCost: 2775, supplier: "JK Paper", supplierCode: "JKP-001", hsnCode: "4810", warehouse: "Main Warehouse", zone: "A", rack: "R1", shelf: "S1", bin: "B1", weight: 25, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-2", name: "Matt Art Paper 130gsm", sku: "PAP-MA-130", category: "paper", subcategory: "Art Paper", unit: "Reams", stock: 180, minLevel: 30, maxLevel: 500, reorderQty: 50, costPerUnit: 4200, sellingPrice: 4800, lastPurchasePrice: 4100, avgCost: 4150, supplier: "JK Paper", supplierCode: "JKP-001", hsnCode: "4810", warehouse: "Main Warehouse", zone: "A", rack: "R1", shelf: "S2", bin: "B1", weight: 40, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-3", name: "Woodfree CW 70gsm", sku: "PAP-WF-070", category: "paper", subcategory: "Woodfree", unit: "Reams", stock: 420, minLevel: 100, maxLevel: 1500, reorderQty: 200, costPerUnit: 2100, sellingPrice: 2500, lastPurchasePrice: 2050, avgCost: 2075, supplier: "Ballarpur Industries", supplierCode: "BILT-001", hsnCode: "4802", warehouse: "Main Warehouse", zone: "A", rack: "R2", shelf: "S1", bin: "B1", weight: 18, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-4", name: "Art Card 300gsm", sku: "PAP-AC-300", category: "paper", subcategory: "Card Board", unit: "Reams", stock: 85, minLevel: 20, maxLevel: 300, reorderQty: 30, costPerUnit: 8500, sellingPrice: 9500, lastPurchasePrice: 8400, avgCost: 8450, supplier: "ITC", supplierCode: "ITC-001", hsnCode: "4810", warehouse: "Main Warehouse", zone: "A", rack: "R2", shelf: "S2", bin: "B1", weight: 75, movementClass: "slow_moving" }),
    createDefaultItem({ id: "inv-5", name: "CTP Plates 660×820", sku: "PLT-CTP-660", category: "plates", subcategory: "CTP Plates", unit: "Pieces", stock: 200, minLevel: 50, maxLevel: 500, reorderQty: 100, costPerUnit: 600, sellingPrice: 750, lastPurchasePrice: 580, avgCost: 590, supplier: "Kodak", supplierCode: "KDK-001", hsnCode: "3701", warehouse: "Main Warehouse", zone: "B", rack: "R1", shelf: "S1", bin: "B1", weight: 1.5, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-6", name: "CTP Plates 790×1030", sku: "PLT-CTP-790", category: "plates", subcategory: "CTP Plates", unit: "Pieces", stock: 120, minLevel: 30, maxLevel: 300, reorderQty: 60, costPerUnit: 950, sellingPrice: 1100, lastPurchasePrice: 920, avgCost: 935, supplier: "Kodak", supplierCode: "KDK-001", hsnCode: "3701", warehouse: "Main Warehouse", zone: "B", rack: "R1", shelf: "S1", bin: "B2", weight: 2.5, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-7", name: "Gloss Lamination Film", sku: "FIN-GL-LAM", category: "finishing", subcategory: "Lamination Film", unit: "Rolls", stock: 15, minLevel: 5, maxLevel: 50, reorderQty: 10, costPerUnit: 6500, sellingPrice: 7500, lastPurchasePrice: 6400, avgCost: 6450, supplier: "Cosmo Films", supplierCode: "CSM-001", hsnCode: "3920", warehouse: "Main Warehouse", zone: "C", rack: "R1", shelf: "S1", bin: "B1", weight: 35, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-8", name: "Matt Lamination Film", sku: "FIN-MT-LAM", category: "finishing", subcategory: "Lamination Film", unit: "Rolls", stock: 12, minLevel: 5, maxLevel: 50, reorderQty: 10, costPerUnit: 7200, sellingPrice: 8200, lastPurchasePrice: 7100, avgCost: 7150, supplier: "Cosmo Films", supplierCode: "CSM-001", hsnCode: "3920", warehouse: "Main Warehouse", zone: "C", rack: "R1", shelf: "S1", bin: "B2", weight: 35, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-9", name: "PUR Hot Melt Adhesive", sku: "FIN-PUR-HM", category: "finishing", subcategory: "Adhesive", unit: "Kg", stock: 45, minLevel: 10, maxLevel: 100, reorderQty: 20, costPerUnit: 850, sellingPrice: 1000, lastPurchasePrice: 830, avgCost: 840, supplier: "Henkel", supplierCode: "HNK-001", hsnCode: "3506", warehouse: "Main Warehouse", zone: "C", rack: "R2", shelf: "S1", bin: "B1", weight: 1, movementClass: "slow_moving" }),
    createDefaultItem({ id: "inv-10", name: "3-Ply Cartons", sku: "PKG-CTN-3P", category: "packing", subcategory: "Cartons", unit: "Pieces", stock: 500, minLevel: 100, maxLevel: 2000, reorderQty: 200, costPerUnit: 45, sellingPrice: 55, lastPurchasePrice: 43, avgCost: 44, supplier: "Local Supplier", supplierCode: "LOC-001", hsnCode: "4819", warehouse: "Main Warehouse", zone: "D", rack: "R1", shelf: "S1", bin: "B1", weight: 0.5, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-11", name: "5-Ply Cartons", sku: "PKG-CTN-5P", category: "packing", subcategory: "Cartons", unit: "Pieces", stock: 280, minLevel: 50, maxLevel: 1000, reorderQty: 100, costPerUnit: 65, sellingPrice: 80, lastPurchasePrice: 63, avgCost: 64, supplier: "Local Supplier", supplierCode: "LOC-001", hsnCode: "4819", warehouse: "Main Warehouse", zone: "D", rack: "R1", shelf: "S2", bin: "B1", weight: 0.8, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-12", name: "Wooden Pallets (Standard)", sku: "PKG-PLT-STD", category: "packing", subcategory: "Pallets", unit: "Pieces", stock: 30, minLevel: 10, maxLevel: 100, reorderQty: 15, costPerUnit: 1350, sellingPrice: 1500, lastPurchasePrice: 1300, avgCost: 1325, supplier: "Pallet Co", supplierCode: "PLT-001", hsnCode: "4415", warehouse: "Main Warehouse", zone: "D", rack: "R2", shelf: "S1", bin: "B1", weight: 22, movementClass: "slow_moving" }),
    createDefaultItem({ id: "inv-13", name: "Process Black Ink", sku: "INK-PRO-BK", category: "ink", subcategory: "Process Ink", unit: "Kg", stock: 25, minLevel: 10, maxLevel: 100, reorderQty: 20, costPerUnit: 1200, sellingPrice: 1400, lastPurchasePrice: 1180, avgCost: 1190, supplier: "DIC India", supplierCode: "DIC-001", hsnCode: "3215", warehouse: "Main Warehouse", zone: "E", rack: "R1", shelf: "S1", bin: "B1", weight: 1, movementClass: "fast_moving" }),
    createDefaultItem({ id: "inv-14", name: "Process Cyan Ink", sku: "INK-PRO-CY", category: "ink", subcategory: "Process Ink", unit: "Kg", stock: 18, minLevel: 8, maxLevel: 80, reorderQty: 15, costPerUnit: 1400, sellingPrice: 1600, lastPurchasePrice: 1380, avgCost: 1390, supplier: "DIC India", supplierCode: "DIC-001", hsnCode: "3215", warehouse: "Main Warehouse", zone: "E", rack: "R1", shelf: "S1", bin: "B2", weight: 1, movementClass: "fast_moving" }),
];

const INITIAL_MACHINES: MachineDetail[] = [
    {
        id: "mch-1", code: "SM-102", name: "Speedmaster SM 102-4P", type: "offset",
        manufacturer: "Heidelberg", model: "SM 102-4+L", serialNumber: "HD-SM102-2019-0456",
        yearOfManufacture: 2019,
        maxSheetWidth: 40, maxSheetHeight: 28, minSheetWidth: 14, minSheetHeight: 10,
        maxColors: 4, hasAQUnit: true, hasPerfector: true, speedSPH: 13000,
        plateSize: "1030×790", gripperMargin: 10, tailMargin: 10, sideMargin: 5,
        maxPaperWeight: 400, minPaperWeight: 40,
        purchaseCost: 25000000, currentValue: 18000000, depreciationRate: 10,
        makeReadyCost: 1500, makeReadyTime: 0.75, washingCost: 800, ctpRate: 600,
        hourlyRate: 3500, maintenanceCostPerMonth: 45000, inkCostPerHour: 250,
        powerConsumptionKW: 45, electricityCostPerUnit: 9,
        lastMaintenanceDate: "2025-06-15", nextMaintenanceDate: "2025-09-15",
        maintenanceIntervalDays: 90, totalRunningHours: 12500, hoursUntilService: 450,
        maintenanceNotes: "Last PM completed — all rollers checked, blanket replaced",
        isActive: true, operationalStatus: "running", location: "Production Floor — Bay 1",
        operatorName: "Rajesh Kumar", shiftCapacity: 3, avgUptimePercent: 92,
        avgEfficiencyPercent: 87, description: "Primary 4-color press with AQ coating unit",
        insuranceProvider: "ICICI Lombard", insuranceExpiry: "2026-03-31",
        insurancePremium: 180000, warrantyExpiry: "2024-12-31",
    },
    {
        id: "mch-2", code: "CD-102", name: "Speedmaster CD 102-5+L", type: "offset",
        manufacturer: "Heidelberg", model: "CD 102-5+L", serialNumber: "HD-CD102-2020-0789",
        yearOfManufacture: 2020,
        maxSheetWidth: 40, maxSheetHeight: 28, minSheetWidth: 14, minSheetHeight: 10,
        maxColors: 5, hasAQUnit: true, hasPerfector: false, speedSPH: 15000,
        plateSize: "1030×790", gripperMargin: 10, tailMargin: 10, sideMargin: 5,
        maxPaperWeight: 500, minPaperWeight: 40,
        purchaseCost: 35000000, currentValue: 28000000, depreciationRate: 10,
        makeReadyCost: 2000, makeReadyTime: 1, washingCost: 1200, ctpRate: 600,
        hourlyRate: 4500, maintenanceCostPerMonth: 55000, inkCostPerHour: 350,
        powerConsumptionKW: 55, electricityCostPerUnit: 9,
        lastMaintenanceDate: "2025-07-01", nextMaintenanceDate: "2025-10-01",
        maintenanceIntervalDays: 90, totalRunningHours: 8900, hoursUntilService: 600,
        maintenanceNotes: "All units operating normally",
        isActive: true, operationalStatus: "running", location: "Production Floor — Bay 2",
        operatorName: "Suresh Patel", shiftCapacity: 3, avgUptimePercent: 94,
        avgEfficiencyPercent: 89, description: "5-color press for high-quality color work",
        insuranceProvider: "Bajaj Allianz", insuranceExpiry: "2026-06-30",
        insurancePremium: 250000, warrantyExpiry: "2025-12-31",
    },
    {
        id: "mch-3", code: "STAHL-F66", name: "Stahl F66/4 Folder", type: "folding",
        manufacturer: "Stahl", model: "F66/4", serialNumber: "STH-F66-2018-0123",
        yearOfManufacture: 2018,
        maxSheetWidth: 26, maxSheetHeight: 40, minSheetWidth: 6, minSheetHeight: 8,
        maxColors: 0, hasAQUnit: false, hasPerfector: false, speedSPH: 20000,
        plateSize: "", gripperMargin: 0, tailMargin: 0, sideMargin: 0,
        maxPaperWeight: 200, minPaperWeight: 40,
        purchaseCost: 8000000, currentValue: 5000000, depreciationRate: 12,
        makeReadyCost: 500, makeReadyTime: 0.25, washingCost: 0, ctpRate: 0,
        hourlyRate: 1500, maintenanceCostPerMonth: 15000, inkCostPerHour: 0,
        powerConsumptionKW: 18, electricityCostPerUnit: 9,
        lastMaintenanceDate: "2025-05-20", nextMaintenanceDate: "2025-08-20",
        maintenanceIntervalDays: 90, totalRunningHours: 15000, hoursUntilService: 300,
        maintenanceNotes: "Folding blades replaced at 14,000 hours",
        isActive: true, operationalStatus: "running", location: "Finishing Area — Bay 3",
        operatorName: "Mohan Das", shiftCapacity: 2, avgUptimePercent: 90,
        avgEfficiencyPercent: 85, description: "High-speed 4-buckle folder",
        insuranceProvider: "HDFC Ergo", insuranceExpiry: "2026-01-15",
        insurancePremium: 60000, warrantyExpiry: "2023-12-31",
    },
];

// ── Store Interface ──────────────────────────────────────────────────────────
interface InventoryState {
    items: InventoryItem[];
    machines: MachineDetail[];
    nmiRecords: NMIRecord[];
    transfers: InventoryTransfer[];

    // Item actions
    addItem: (item: Omit<InventoryItem, "id" | "lastUpdated">) => void;
    updateItem: (id: string, updates: Partial<InventoryItem>) => void;
    deleteItem: (id: string) => void;
    duplicateItem: (id: string) => void;

    // Machine actions
    addMachine: (machine: Omit<MachineDetail, "id">) => void;
    updateMachine: (id: string, updates: Partial<MachineDetail>) => void;
    deleteMachine: (id: string) => void;
    duplicateMachine: (id: string) => void;

    // NMI actions
    addNMI: (record: Omit<NMIRecord, "id" | "createdAt" | "updatedAt">) => void;
    updateNMI: (id: string, updates: Partial<NMIRecord>) => void;
    deleteNMI: (id: string) => void;

    // Transfer actions
    addTransfer: (transfer: Omit<InventoryTransfer, "id" | "createdAt" | "updatedAt">) => void;
    updateTransfer: (id: string, updates: Partial<InventoryTransfer>) => void;
    deleteTransfer: (id: string) => void;
    completeTransfer: (id: string, receivedBy: string) => void;

    // Selectors
    getLowStockItems: () => InventoryItem[];
    getItemsByCategory: (category: InventoryCategory) => InventoryItem[];
    getItemCostByCategory: (category: InventoryCategory, sku?: string) => number;
    getTotalInventoryValue: () => number;
}

export const useInventoryStore = create<InventoryState>()(
    persist(
        immer((set, get) => ({
            items: INITIAL_ITEMS,
            machines: INITIAL_MACHINES,
            nmiRecords: [],
            transfers: [],

            // ── Item Actions ─────────────────────────────────────────────────────
            addItem: (itemData) => set((state) => {
                const newItem: InventoryItem = {
                    ...createDefaultItem({}),
                    ...itemData,
                    id: generateId(),
                    lastUpdated: new Date().toISOString(),
                };
                state.items.push(newItem);
            }),

            updateItem: (id, updates) => set((state) => {
                const idx = state.items.findIndex((i) => i.id === id);
                if (idx !== -1) {
                    Object.assign(state.items[idx], { ...updates, lastUpdated: new Date().toISOString() });
                }
            }),

            deleteItem: (id) => set((state) => {
                state.items = state.items.filter((i) => i.id !== id);
            }),

            duplicateItem: (id) => set((state) => {
                const item = state.items.find((i) => i.id === id);
                if (item) {
                    const dup: InventoryItem = {
                        ...JSON.parse(JSON.stringify(item)),
                        id: generateId(),
                        name: `${item.name} (Copy)`,
                        sku: `${item.sku}-COPY`,
                        lastUpdated: new Date().toISOString(),
                        status: "draft" as const,
                    };
                    state.items.push(dup);
                }
            }),

            // ── Machine Actions ──────────────────────────────────────────────────
            addMachine: (machineData) => set((state) => {
                const newMachine: MachineDetail = {
                    ...machineData,
                    id: generateId(),
                };
                state.machines.push(newMachine);
            }),

            updateMachine: (id, updates) => set((state) => {
                const idx = state.machines.findIndex((m) => m.id === id);
                if (idx !== -1) {
                    Object.assign(state.machines[idx], updates);
                }
            }),

            deleteMachine: (id) => set((state) => {
                state.machines = state.machines.filter((m) => m.id !== id);
            }),

            duplicateMachine: (id) => set((state) => {
                const machine = state.machines.find((m) => m.id === id);
                if (machine) {
                    const dup: MachineDetail = {
                        ...JSON.parse(JSON.stringify(machine)),
                        id: generateId(),
                        name: `${machine.name} (Copy)`,
                        code: `${machine.code}-COPY`,
                    };
                    state.machines.push(dup);
                }
            }),

            // ── NMI Actions ──────────────────────────────────────────────────────
            addNMI: (recordData) => set((state) => {
                const now = new Date().toISOString();
                const record: NMIRecord = {
                    ...recordData,
                    id: generateId(),
                    createdAt: now,
                    updatedAt: now,
                };
                state.nmiRecords.push(record);
            }),

            updateNMI: (id, updates) => set((state) => {
                const idx = state.nmiRecords.findIndex((r) => r.id === id);
                if (idx !== -1) {
                    Object.assign(state.nmiRecords[idx], { ...updates, updatedAt: new Date().toISOString() });
                }
            }),

            deleteNMI: (id) => set((state) => {
                state.nmiRecords = state.nmiRecords.filter((r) => r.id !== id);
            }),

            // ── Transfer Actions ─────────────────────────────────────────────────
            addTransfer: (transferData) => set((state) => {
                const now = new Date().toISOString();
                const transfer: InventoryTransfer = {
                    ...transferData,
                    id: generateId(),
                    createdAt: now,
                    updatedAt: now,
                };
                state.transfers.push(transfer);
            }),

            updateTransfer: (id, updates) => set((state) => {
                const idx = state.transfers.findIndex((t) => t.id === id);
                if (idx !== -1) {
                    Object.assign(state.transfers[idx], { ...updates, updatedAt: new Date().toISOString() });
                }
            }),

            deleteTransfer: (id) => set((state) => {
                state.transfers = state.transfers.filter((t) => t.id !== id);
            }),

            completeTransfer: (id, receivedBy) => set((state) => {
                const idx = state.transfers.findIndex((t) => t.id === id);
                if (idx !== -1) {
                    state.transfers[idx].status = "received";
                    state.transfers[idx].receivedBy = receivedBy;
                    state.transfers[idx].actualArrivalDate = new Date().toISOString();
                    state.transfers[idx].updatedAt = new Date().toISOString();

                    // Update the inventory item location
                    const transfer = state.transfers[idx];
                    const itemIdx = state.items.findIndex((i) => i.id === transfer.inventoryItemId);
                    if (itemIdx !== -1) {
                        state.items[itemIdx].warehouse = transfer.toWarehouse;
                        state.items[itemIdx].zone = transfer.toZone;
                        state.items[itemIdx].lastMovedDate = new Date().toISOString();
                        state.items[itemIdx].lastUpdated = new Date().toISOString();
                    }
                }
            }),

            // ── Selectors ────────────────────────────────────────────────────────
            getLowStockItems: () => get().items.filter((i) => i.stock <= i.minLevel && i.status === "active"),

            getItemsByCategory: (category) => get().items.filter((i) => i.category === category),

            getItemCostByCategory: (category, sku) => {
                const items = get().items.filter((i) => i.category === category && i.status === "active");
                if (sku) {
                    const item = items.find((i) => i.sku === sku);
                    return item?.costPerUnit ?? 0;
                }
                if (items.length === 0) return 0;
                return items.reduce((sum, i) => sum + i.costPerUnit, 0) / items.length;
            },

            getTotalInventoryValue: () =>
                get().items.reduce((sum, i) => sum + i.stock * i.costPerUnit, 0),
        })),
        {
            name: "print-estimator-inventory-store",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
