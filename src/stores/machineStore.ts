import { create } from 'zustand';
import { enableMapSet, produce } from 'immer';
import {
    Machine, createDefaultMachine, MachineChangeLogEntry
} from '../types/machine.types';
import { MachineType, MachineStatus, SpeedUnit } from '../types/machine.enums';
import { validateMachine } from '../types/machine.validators';
import { recalculateMachineComputedFields } from '../types/machine.computed';

// Immer requires explicit enablement to support ES6 Maps and Sets
enableMapSet();

export interface MachineStoreSnapshot {
    machines: Array<[string, Machine]>;
    machineOrder: string[];
}

export interface MachineFilterCriteria {
    types?: MachineType[];
    statuses?: MachineStatus[];
    tags?: string[];
    minSheetWidth?: number;
    maxSheetWidth?: number;
    minSpeed?: number;
    maxSpeed?: number;
    hasCoating?: boolean;
    canPerfect?: boolean;
    searchQuery?: string;
}

export interface ImportResult {
    success: boolean;
    totalRecords: number;
    imported: number;
    updated: number;
    skipped: number;
    errors: Array<{ row: number; field: string; message: string }>;
    warnings: Array<{ row: number; field: string; message: string }>;
    batchId: string;
}

export interface BulkUpdateResult {
    success: boolean;
    updatedCount: number;
    failedIds: string[];
    errors: Array<{ id: string; message: string }>;
}

export interface MachineStoreState {
    // ─── CANONICAL DATA ───────────────────────────────────────
    machines: Map<string, Machine>;
    machineOrder: string[];

    // ─── INDEXING LAYER ───────────────────────────────────────
    machinesByType: Map<MachineType, string[]>;
    machinesByStatus: Map<MachineStatus, string[]>;
    machinesByTag: Map<string, string[]>;

    // ─── OPERATIONAL STATE ────────────────────────────────────
    selectedMachineId: string | null;
    isLoading: boolean;
    lastSyncTimestamp: string | null;
    isDirty: boolean;

    // ─── UNDO/REDO SYSTEM ────────────────────────────────────
    undoStack: MachineStoreSnapshot[];
    redoStack: MachineStoreSnapshot[];
    maxUndoDepth: number;
}

export interface MachineStoreActions {
    // CRUD
    addMachine: (machine: Partial<Machine>) => Machine;
    updateMachine: (id: string, updates: Partial<Machine>) => Machine;
    updateMachineField: <K extends keyof Machine>(id: string, field: K, value: Machine[K]) => void;
    deleteMachine: (id: string) => void;
    permanentlyDeleteMachine: (id: string, confirmationToken: string) => void;
    duplicateMachine: (id: string, nameOverride?: string) => Machine;
    restoreMachine: (id: string) => void;

    // Bulk
    importMachines: (data: unknown, format: 'JSON' | 'CSV' | 'XLSX', strategy: 'MERGE' | 'REPLACE' | 'APPEND') => ImportResult;
    exportMachines: (ids: string[] | 'ALL', format: 'JSON' | 'CSV' | 'XLSX', includeComputed: boolean) => Blob;
    bulkUpdateMachines: (ids: string[], updates: Partial<Machine>) => BulkUpdateResult;
    bulkDeleteMachines: (ids: string[]) => void;

    // Query
    getMachineById: (id: string) => Machine | undefined;
    getMachinesByType: (type: MachineType) => Machine[];
    getMachinesByStatus: (status: MachineStatus) => Machine[];
    getActiveMachines: () => Machine[];
    searchMachines: (query: string) => Machine[];
    filterMachines: (filters: MachineFilterCriteria) => Machine[];
    sortMachines: (field: keyof Machine, direction: 'ASC' | 'DESC') => void;

    // Computed Cost
    getFullyLoadedHourlyCost: (id: string) => number;
    getSetupCost: (
        id: string, colors: number, pantoneColors: number, hasCoating: boolean
    ) => { timeMins: number; wastSheets: number; laborCost: number; totalCost: number };
    getRunningCostPerSheet: (
        id: string,
        sheetSize: { width: number; height: number },
        colors: number,
        substrate_gsm: number
    ) => number;

    // History
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    _pushToUndoStack: () => void;

    // Persistence
    hydrate: () => void;
    persist: () => void;
    resetToDefaults: () => void;
}

const STORAGE_KEY = 'pe_machineStore_v1';

function rebuildIndices(machines: Map<string, Machine>) {
    const byType = new Map<MachineType, string[]>();
    const byStatus = new Map<MachineStatus, string[]>();
    const byTag = new Map<string, string[]>();

    machines.forEach((machine, id) => {
        // Type
        if (!byType.has(machine.type)) byType.set(machine.type, []);
        byType.get(machine.type)!.push(id);

        // Status
        if (!byStatus.has(machine.status)) byStatus.set(machine.status, []);
        byStatus.get(machine.status)!.push(id);

        // Tags
        machine.tags.forEach(tag => {
            if (!byTag.has(tag)) byTag.set(tag, []);
            byTag.get(tag)!.push(id);
        });
    });

    return { machinesByType: byType, machinesByStatus: byStatus, machinesByTag: byTag };
}

export const useMachineStore = create<MachineStoreState & MachineStoreActions>((set, get) => ({
    // Initial State
    machines: new Map<string, Machine>(),
    machineOrder: [],
    machinesByType: new Map<MachineType, string[]>(),
    machinesByStatus: new Map<MachineStatus, string[]>(),
    machinesByTag: new Map<string, string[]>(),

    selectedMachineId: null,
    isLoading: false,
    lastSyncTimestamp: null,
    isDirty: false,

    undoStack: [],
    redoStack: [],
    maxUndoDepth: 50,

    // History Helper
    _pushToUndoStack: () => {
        set(produce((state: MachineStoreState) => {
            const snap: MachineStoreSnapshot = {
                machines: Array.from(state.machines.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]),
                machineOrder: [...state.machineOrder]
            };
            state.undoStack.push(snap);
            if (state.undoStack.length > state.maxUndoDepth) {
                state.undoStack.shift();
            }
            state.redoStack = [];
            state.isDirty = true;
        }));
    },

    // CRUD Actions
    addMachine: (machineUpdates) => {
        get()._pushToUndoStack();
        let newMachine = createDefaultMachine(machineUpdates);

        // Add audit log for creation
        const log: MachineChangeLogEntry = {
            timestamp: new Date().toISOString(),
            userId: 'system', // Replace with actual user context if available
            action: 'CREATE',
            fieldChanged: null,
            oldValue: null,
            newValue: null,
            batchId: null
        };
        newMachine.changeLog = [log];
        newMachine = recalculateMachineComputedFields(newMachine);

        const validation = validateMachine(newMachine);
        if (!validation.isValid) {
            const msgs = validation.errors.map(e => e.message).join(', ');
            throw new Error(`Invalid machine: ${msgs}`);
        }

        set(produce((state: MachineStoreState) => {
            state.machines.set(newMachine.id, newMachine);
            state.machineOrder.push(newMachine.id);
            Object.assign(state, rebuildIndices(state.machines));
        }));

        get().persist();
        return newMachine;
    },

    updateMachine: (id, updates) => {
        const existing = get().machines.get(id);
        if (!existing) throw new Error(`Machine [${id}] not found.`);

        get()._pushToUndoStack();

        let updatedMachine = { ...existing, ...updates };

        // Create audit logs for every changed field
        const timestamp = new Date().toISOString();
        const logs: MachineChangeLogEntry[] = Object.keys(updates).map(key => ({
            timestamp,
            userId: 'system',
            action: 'UPDATE',
            fieldChanged: key,
            oldValue: String(existing[key as keyof Machine]),
            newValue: String(updatedMachine[key as keyof Machine]),
            batchId: null
        }));

        updatedMachine.changeLog = [...existing.changeLog, ...logs];
        updatedMachine.updatedAt = timestamp;
        updatedMachine = recalculateMachineComputedFields(updatedMachine);

        const validation = validateMachine(updatedMachine);
        if (!validation.isValid) {
            throw new Error(`Invalid machine update: ${validation.errors[0].message}`);
        }

        set(produce((state: MachineStoreState) => {
            state.machines.set(id, updatedMachine);
            Object.assign(state, rebuildIndices(state.machines));
        }));

        get().persist();
        return updatedMachine;
    },

    updateMachineField: (id, field, value) => {
        get().updateMachine(id, { [field]: value } as Partial<Machine>);
    },

    deleteMachine: (id) => {
        get().updateMachine(id, {
            isArchived: true,
            archivedAt: new Date().toISOString(),
            status: MachineStatus.DECOMMISSIONED
        });
    },

    permanentlyDeleteMachine: (id, confirmationToken) => {
        if (confirmationToken !== 'PURGE-MACHINE') throw new Error("Invalid confirmation token");
        get()._pushToUndoStack();
        set(produce((state: MachineStoreState) => {
            state.machines.delete(id);
            state.machineOrder = state.machineOrder.filter((mid: string) => mid !== id);
            Object.assign(state, rebuildIndices(state.machines));
        }));
        get().persist();
    },

    duplicateMachine: (id, nameOverride) => {
        const existing = get().machines.get(id);
        if (!existing) throw new Error(`Machine [${id}] not found.`);
        const cloneUpdates: Partial<Machine> = {
            ...existing,
            id: undefined, // Let default generator create new UUID
            name: nameOverride || `${existing.name} (Copy)`,
            nickname: nameOverride ? nameOverride : `${existing.nickname} (Copy)`,
            changeLog: [] // Reset audit trail for clone
        };
        return get().addMachine(cloneUpdates);
    },

    restoreMachine: (id) => {
        get().updateMachine(id, {
            isArchived: false,
            archivedAt: null,
            status: MachineStatus.ACTIVE
        });
    },

    // Bulk Operations
    importMachines: (data, format, strategy) => {
        const batchId = "BATCH-" + Date.now();
        const errors: Array<{ row: number; field: string; message: string }> = [];
        const warnings: Array<{ row: number; field: string; message: string }> = [];
        const now = new Date().toISOString();

        const parseBoolean = (value: unknown): boolean => {
            if (typeof value === "boolean") return value;
            if (typeof value === "number") return value !== 0;
            if (typeof value !== "string") return false;
            const normalized = value.trim().toLowerCase();
            return normalized === "true" || normalized === "yes" || normalized === "1";
        };

        const parseNumber = (value: unknown, fallback = 0): number => {
            if (typeof value === "number" && Number.isFinite(value)) return value;
            if (typeof value === "string") {
                const parsed = Number(value.trim());
                if (Number.isFinite(parsed)) return parsed;
            }
            return fallback;
        };

        const parseCsvLine = (line: string): string[] => {
            const cells: string[] = [];
            let current = "";
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === "\"") {
                    if (inQuotes && line[i + 1] === "\"") {
                        current += "\"";
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                    continue;
                }
                if (ch === "," && !inQuotes) {
                    cells.push(current.trim());
                    current = "";
                    continue;
                }
                current += ch;
            }

            cells.push(current.trim());
            return cells;
        };

        const normalizeRecord = (raw: any, row: number): Machine | null => {
            try {
                const fallback = createDefaultMachine({
                    createdAt: now,
                    updatedAt: now,
                    updatedBy: "importer",
                    createdBy: "importer",
                });

                const maxSheetRaw = raw.maxSheet || raw["max_sheet"] || raw["maxSheetSize"] || "";
                let maxSheetWidth = parseNumber(raw.maxSheetWidth_mm, fallback.maxSheetWidth_mm);
                let maxSheetHeight = parseNumber(raw.maxSheetHeight_mm, fallback.maxSheetHeight_mm);

                if ((maxSheetWidth <= 0 || maxSheetHeight <= 0) && typeof maxSheetRaw === "string" && maxSheetRaw.includes("x")) {
                    const [w, h] = maxSheetRaw.toLowerCase().split("x").map(v => parseNumber(v, 0));
                    if (w > 0 && h > 0) {
                        maxSheetWidth = w;
                        maxSheetHeight = h;
                    }
                }

                const candidate: Machine = recalculateMachineComputedFields({
                    ...fallback,
                    ...raw,
                    id: String(raw.id || fallback.id),
                    name: String(raw.name || fallback.name),
                    nickname: String(raw.nickname || raw.name || fallback.nickname),
                    manufacturer: String(raw.manufacturer || fallback.manufacturer),
                    model: String(raw.model || fallback.model),
                    type: raw.type || fallback.type,
                    status: raw.status || fallback.status,
                    maxSheetWidth_mm: maxSheetWidth,
                    maxSheetHeight_mm: maxSheetHeight,
                    maxColorsPerPass: parseNumber(raw.maxColorsPerPass ?? raw.colors, fallback.maxColorsPerPass),
                    hasCoatingUnit: parseBoolean(raw.hasCoatingUnit ?? raw.coating),
                    canPerfect: parseBoolean(raw.canPerfect ?? raw.perfector),
                    effectiveSpeed: parseNumber(raw.effectiveSpeed ?? raw.speed, fallback.effectiveSpeed),
                    fixedSetupCost: parseNumber(raw.fixedSetupCost ?? raw.setupCost, fallback.fixedSetupCost),
                    ctpRate_perPlate: parseNumber(raw.ctpRate_perPlate ?? raw.ctpRate, fallback.ctpRate_perPlate),
                    hourlyRate: parseNumber(raw.hourlyRate, fallback.hourlyRate),
                    tags: Array.isArray(raw.tags) ? raw.tags.map((tag: unknown) => String(tag)) : fallback.tags,
                    updatedAt: now,
                    updatedBy: "importer",
                    changeLog: [
                        ...(Array.isArray(raw.changeLog) ? raw.changeLog : fallback.changeLog),
                        {
                            timestamp: now,
                            userId: "importer",
                            action: "IMPORT",
                            fieldChanged: null,
                            oldValue: null,
                            newValue: null,
                            batchId,
                        },
                    ],
                } as Machine);

                const validation = validateMachine(candidate);
                if (!validation.isValid) {
                    errors.push({
                        row,
                        field: validation.errors[0]?.field || "machine",
                        message: validation.errors[0]?.message || "Validation failed",
                    });
                    return null;
                }

                for (const warning of validation.warnings) {
                    warnings.push({ row, field: warning.field, message: warning.message });
                }

                return candidate;
            } catch (error: any) {
                errors.push({ row, field: "machine", message: error?.message || "Invalid machine record" });
                return null;
            }
        };

        let rawRows: any[] = [];

        if (format === "JSON") {
            if (Array.isArray(data)) {
                rawRows = data;
            } else if (typeof data === "string") {
                try {
                    const parsed = JSON.parse(data);
                    rawRows = Array.isArray(parsed) ? parsed : [];
                } catch {
                    errors.push({ row: 1, field: "json", message: "Invalid JSON payload" });
                }
            } else {
                errors.push({ row: 1, field: "json", message: "Unsupported JSON payload format" });
            }
        } else if (format === "CSV") {
            if (typeof data !== "string") {
                errors.push({ row: 1, field: "csv", message: "CSV import expects text input" });
            } else {
                const rows = data
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    .filter(Boolean)
                    .filter(line => !line.startsWith("==="));

                if (rows.length > 1) {
                    const headers = parseCsvLine(rows[0]).map(header => header.toLowerCase());
                    rawRows = rows.slice(1).map((line) => {
                        const cols = parseCsvLine(line);
                        const row: Record<string, unknown> = {};
                        headers.forEach((header, idx) => {
                            row[header] = cols[idx] ?? "";
                        });

                        return {
                            name: row["name"],
                            nickname: row["nickname"],
                            type: row["type"],
                            maxSheet: row["max sheet"],
                            colors: row["colors"],
                            coating: row["coating"],
                            perfector: row["perfector"],
                            speed: row["speed"],
                            setupCost: row["setup cost"],
                            ctpRate: row["ctp rate"],
                            hourlyRate: row["hourly rate"],
                            status: row["status"],
                            manufacturer: row["manufacturer"],
                            model: row["model"],
                        };
                    });
                }
            }
        } else {
            errors.push({ row: 1, field: "format", message: `Unsupported format: ${format}` });
        }

        const normalized: Machine[] = [];
        rawRows.forEach((row, idx) => {
            const machine = normalizeRecord(row, idx + 2);
            if (machine) normalized.push(machine);
        });

        let imported = 0;
        let updated = 0;
        let skipped = 0;

        get()._pushToUndoStack();

        set(produce((state: MachineStoreState) => {
            const workingMap =
                strategy === "REPLACE"
                    ? new Map<string, Machine>()
                    : new Map<string, Machine>(state.machines);
            const workingOrder = strategy === "REPLACE" ? [] : [...state.machineOrder];

            for (const machine of normalized) {
                const hasExisting = workingMap.has(machine.id);
                let machineToSave = machine;

                if (strategy === "APPEND" && hasExisting) {
                    machineToSave = {
                        ...machine,
                        id: `${machine.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        name: `${machine.name} (Imported)`,
                    } as Machine;
                }

                if (workingMap.has(machineToSave.id)) {
                    if (strategy === "APPEND") {
                        skipped++;
                        continue;
                    }
                    workingMap.set(machineToSave.id, machineToSave);
                    updated++;
                } else {
                    workingMap.set(machineToSave.id, machineToSave);
                    workingOrder.push(machineToSave.id);
                    imported++;
                }
            }

            state.machines = workingMap;
            state.machineOrder = workingOrder;
            Object.assign(state, rebuildIndices(state.machines));
            state.isDirty = true;
        }));

        get().persist();

        return {
            success: errors.length === 0,
            totalRecords: rawRows.length,
            imported,
            updated,
            skipped,
            errors,
            warnings,
            batchId,
        };
    },

    exportMachines: (ids, format, includeComputed) => {
        // Serialize to Blob logic placeholder
        return new Blob(['[]'], { type: 'application/json' });
    },

    bulkUpdateMachines: (ids, updates) => {
        get()._pushToUndoStack();
        let updatedCount = 0;
        const failedIds: string[] = [];
        const errors: Array<{ id: string, message: string }> = [];

        ids.forEach(id => {
            try {
                const existing = get().machines.get(id);
                if (!existing) return;
                let updatedMachine = { ...existing, ...updates };
                updatedMachine = recalculateMachineComputedFields(updatedMachine);
                const val = validateMachine(updatedMachine);
                if (!val.isValid) throw new Error('Validation failed');

                set(produce((state: MachineStoreState) => {
                    state.machines.set(id, updatedMachine);
                }));
                updatedCount++;
            } catch (err: any) {
                failedIds.push(id);
                errors.push({ id, message: err.message });
            }
        });

        set(produce((state: MachineStoreState) => {
            Object.assign(state, rebuildIndices(state.machines));
        }));

        get().persist();
        return { success: failedIds.length === 0, updatedCount, failedIds, errors };
    },

    bulkDeleteMachines: (ids) => {
        get().bulkUpdateMachines(ids, { isArchived: true, status: MachineStatus.DECOMMISSIONED });
    },

    // Queries
    getMachineById: (id) => get().machines.get(id),
    getMachinesByType: (type) => (get().machinesByType.get(type) || []).map(id => get().machines.get(id)!),
    getMachinesByStatus: (status) => (get().machinesByStatus.get(status) || []).map(id => get().machines.get(id)!),
    getActiveMachines: () => Array.from(get().machines.values()).filter(m => !m.isArchived && m.status === MachineStatus.ACTIVE),
    searchMachines: (query) => {
        // Basic fuzz, assumes everything initialized correctly
        const lowerQ = query.toLowerCase();
        return Array.from(get().machines.values()).filter(m =>
            !m.isArchived && (
                m.name?.toLowerCase().includes(lowerQ) ||
                m.nickname?.toLowerCase().includes(lowerQ) ||
                m.manufacturer?.toLowerCase().includes(lowerQ) ||
                m.model?.toLowerCase().includes(lowerQ) ||
                (m.tags && m.tags.some(t => t.toLowerCase().includes(lowerQ)))
            )
        );
    },
    filterMachines: (filters) => {
        return Array.from(get().machines.values()).filter(m => {
            if (m.isArchived) return false;
            if (filters.types && filters.types.length && !filters.types.includes(m.type)) return false;
            if (filters.statuses && filters.statuses.length && !filters.statuses.includes(m.status)) return false;
            if (filters.tags && filters.tags.length && (!m.tags || !m.tags.some(t => filters.tags!.includes(t)))) return false;
            if (filters.minSheetWidth && m.maxSheetWidth_mm && m.maxSheetWidth_mm < filters.minSheetWidth) return false;
            if (filters.maxSheetWidth && m.minSheetWidth_mm && m.minSheetWidth_mm > filters.maxSheetWidth) return false;
            if (filters.hasCoating !== undefined && m.hasCoatingUnit !== filters.hasCoating) return false;
            if (filters.canPerfect !== undefined && m.canPerfect !== filters.canPerfect) return false;
            if (filters.searchQuery) {
                const q = filters.searchQuery.toLowerCase();
                if (!m.name?.toLowerCase().includes(q) && !m.nickname?.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    },
    sortMachines: (field, direction) => {
        set(produce((state: MachineStoreState) => {
            state.machineOrder.sort((a, b) => {
                const ma = state.machines.get(a)!;
                const mb = state.machines.get(b)!;
                const va = ma[field] as any;
                const vb = mb[field] as any;
                if (va < vb) return direction === 'ASC' ? -1 : 1;
                if (va > vb) return direction === 'ASC' ? 1 : -1;
                return 0;
            });
        }));
    },

    // Cost Engines
    getFullyLoadedHourlyCost: (id) => {
        const m = get().machines.get(id);
        if (!m) return 0;
        return m.hourlyRate + m.totalLaborCostPerHour + m.hourlyRentAllocation +
            m.hourlyDepreciation + m.energyCostPerHour + m.consumablesCostPerHour_aggregate;
    },

    getSetupCost: (id, colors, pantoneColors, hasCoating) => {
        const m = get().machines.get(id);
        if (!m) return { timeMins: 0, wastSheets: 0, laborCost: 0, totalCost: 0 };

        // time
        const timeMins = m.setupTimeBase_mins + (m.setupTimePerColor_mins * colors) +
            (m.plateChangeTime_mins * colors * m.platesPerColorPerJob) +
            (m.colorMatchingTime_mins * pantoneColors) + m.registerSetupTime_mins +
            m.paperLoadTime_mins + m.deliverySetupTime_mins;

        const wastSheets = m.setupWasteSheets_base + (m.setupWasteSheets_perColor * colors) +
            (m.setupWasteSheets_perPantone * pantoneColors) +
            (hasCoating ? m.setupWasteSheets_coatingUnit : 0);

        const laborCost = (timeMins / 60) * m.totalLaborCostPerHour;
        const machineCost = (timeMins / 60) * m.hourlyRate;
        const plateCost = colors * m.plateCost_each * m.platesPerColorPerJob;
        const totalCost = laborCost + machineCost + plateCost + m.fixedSetupCost;

        return { timeMins, wastSheets, laborCost, totalCost };
    },

    getRunningCostPerSheet: (id, sheetSize, colors, substrate_gsm) => {
        const m = get().machines.get(id);
        if (!m) return 0;

        let currentSpeed = m.effectiveSpeed;
        if (substrate_gsm > 300) currentSpeed = currentSpeed * ((100 - m.speedReductionThickStock_percent) / 100);
        else if (substrate_gsm < 60) currentSpeed = currentSpeed * ((100 - m.speedReductionThinStock_percent) / 100);

        const timePerSheetHours = currentSpeed > 0 ? 1 / currentSpeed : 0;

        const laborCost = timePerSheetHours * m.totalLaborCostPerHour;
        const machineCost = timePerSheetHours * m.hourlyRate;
        const energyCost = timePerSheetHours * m.energyCostPerHour;
        const consumables = (timePerSheetHours * m.consumablesCostPerHour_aggregate) +
            m.blanketCostPerImpression + m.rollerCostPerImpression;

        const printAreaSqm = (sheetSize.width * sheetSize.height) / 1000000;
        const inkCost = printAreaSqm * m.inkCoverage_gramsPerSqm * m.inkCost_perGram * colors;

        return laborCost + machineCost + energyCost + consumables + inkCost;
    },

    // Undo/Redo
    undo: () => {
        if (!get().canUndo()) return;
        set(produce((state: MachineStoreState) => {
            const snap = state.undoStack.pop()!;
            state.redoStack.push({
                machines: Array.from(state.machines.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]),
                machineOrder: [...state.machineOrder]
            });
            state.machines = new Map(snap.machines);
            state.machineOrder = snap.machineOrder;
            Object.assign(state, rebuildIndices(state.machines));
            state.isDirty = true;
        }));
        get().persist();
    },

    redo: () => {
        if (!get().canRedo()) return;
        set(produce((state: MachineStoreState) => {
            const snap = state.redoStack.pop()!;
            state.undoStack.push({
                machines: Array.from(state.machines.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]),
                machineOrder: [...state.machineOrder]
            });
            state.machines = new Map(snap.machines);
            state.machineOrder = snap.machineOrder;
            Object.assign(state, rebuildIndices(state.machines));
            state.isDirty = true;
        }));
        get().persist();
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    // Persistence
    hydrate: () => {
        try {
            if (typeof window === 'undefined') return;
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                // Init default if none
                return;
            }
            const parsed = JSON.parse(raw);
            set(produce((state: MachineStoreState) => {
                state.machines = new Map(parsed.machines);
                state.machineOrder = parsed.machineOrder || Array.from(state.machines.keys());
                Object.assign(state, rebuildIndices(state.machines));
                state.lastSyncTimestamp = new Date().toISOString();
                state.isDirty = false;
            }));
        } catch (e) {
            console.error("Failed to hydrate machineStore", e);
        }
    },

    persist: () => {
        if (typeof window === 'undefined') return;
        const state = get();
        try {
            const payload = {
                machines: Array.from(state.machines.entries()),
                machineOrder: state.machineOrder
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            set({ isDirty: false, lastSyncTimestamp: new Date().toISOString() });
        } catch (e) {
            console.error("Failed to persist machineStore", e);
        }
    },

    resetToDefaults: () => {
        set(produce((state: MachineStoreState) => {
            state.machines.clear();
            state.machineOrder = [];
            Object.assign(state, rebuildIndices(state.machines));
            state.undoStack = [];
            state.redoStack = [];
        }));
        get().persist();
    }
}));
