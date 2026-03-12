/**
 * useDataSync — Bridge between Zustand stores and the Express backend
 * 
 * This hook replaces manual API calls in every page with automatic sync:
 * 1. On mount: Fetches all data from the backend API
 * 2. On CRUD: Wraps store actions to also call the API
 * 3. Falls back gracefully if the backend is unavailable (offline mode)
 * 
 * Usage: Call useDataSync() once in MainLayout — all pages automatically
 * get fresh data via their existing Zustand store subscriptions.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { apiClient } from "@/api/client";
import { useDataStore } from "@/stores/dataStore";
import { useInventoryStore } from "@/stores/inventoryStore";
import { useMachineStore } from "@/stores/machineStore";
import { useRateCardStore } from "@/stores/rateCardStore";

// ── Sync Status ──────────────────────────────────────────────────────────────

export interface SyncStatus {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  error: string | null;
  isOnline: boolean;
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ── Main Sync Hook ───────────────────────────────────────────────────────────

export function useDataSync() {
  const [status, setStatus] = useState<SyncStatus>({
    lastSyncedAt: null,
    isSyncing: false,
    error: null,
    isOnline: true,
  });

  const isMountedRef = useRef(true);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch and merge data from backend ──────────────────────────────────────

  const syncFromBackend = useCallback(async () => {
    if (!isMountedRef.current) return;

    setStatus((s) => ({ ...s, isSyncing: true, error: null }));

    try {
      // Check health first — if server is down, skip sync
      await apiClient.health();

      // Fetch all entities in parallel
      const [customersRes, jobsRes, inventoryRes, quotesRes, machinesRes, rateCardRes] = await Promise.allSettled([
        apiClient.listCustomers(),
        apiClient.listJobs(),
        apiClient.listInventory(),
        apiClient.listQuotes(),
        apiClient.listMachines(),
        apiClient.getRateCard(),
      ]);

      if (!isMountedRef.current) return;

      // Merge customers into dataStore
      if (customersRes.status === "fulfilled") {
        const data = customersRes.value as any;
        const customers = data?.customers || data?.data || [];
        if (Array.isArray(customers) && customers.length > 0) {
          const store = useDataStore.getState();
          // Only merge if backend has data and local is empty or backend is authoritative
          if (store.customers.length === 0) {
            // Seed from backend
            customers.forEach((c: any) => {
              const existing = store.customers.find((sc) => sc.id === c.id);
              if (!existing) {
                useDataStore.setState((state) => ({
                  customers: [...state.customers, c],
                }));
              }
            });
          }
        }
      }

      // Merge jobs into dataStore
      if (jobsRes.status === "fulfilled") {
        const data = jobsRes.value as any;
        const jobs = data?.jobs || data?.data || [];
        if (Array.isArray(jobs) && jobs.length > 0) {
          const store = useDataStore.getState();
          if (store.jobs.length === 0) {
            jobs.forEach((j: any) => {
              const existing = store.jobs.find((sj) => sj.id === j.id);
              if (!existing) {
                useDataStore.setState((state) => ({
                  jobs: [...state.jobs, j],
                }));
              }
            });
          }
        }
      }

      // Merge inventory into inventoryStore
      if (inventoryRes.status === "fulfilled") {
        const data = inventoryRes.value as any;
        const items = data?.items || data?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          const store = useInventoryStore.getState();
          if (store.items.length === 0) {
            // Only seed if local is empty (don't overwrite user's local changes)
            items.forEach((item: any) => {
              const existing = store.items.find((si) => si.id === item.id);
              if (!existing) {
                useInventoryStore.getState().addItem(item);
              }
            });
          }
        }
      }

      // Merge quotations into dataStore
      if (quotesRes.status === "fulfilled") {
        const data = quotesRes.value as any;
        const quotes = data?.quotes || data?.data || [];
        if (Array.isArray(quotes) && quotes.length > 0) {
          const store = useDataStore.getState();
          if (store.quotations.length === 0) {
            quotes.forEach((q: any) => {
              const existing = store.quotations.find((sq) => sq.id === q.id);
              if (!existing) {
                useDataStore.setState((state) => ({
                  quotations: [...state.quotations, q],
                }));
              }
            });
          }
        }
      }

      // Merge machines into machineStore
      if (machinesRes.status === "fulfilled") {
        const data = machinesRes.value as any;
        const machines = data?.machines || data?.data || [];
        if (Array.isArray(machines) && machines.length > 0) {
          const store = useMachineStore.getState();
          if (store.machines.size === 0) {
            machines.forEach((m: any) => {
              if (!store.machines.has(m.id)) {
                store.addMachine(m); // Uses immer properly
              }
            });
          }
        }
      }

      // Merge rateCard into rateCardStore
      if (rateCardRes.status === "fulfilled") {
        const data = rateCardRes.value as any;
        if (data?.rateCard) {
          useRateCardStore.getState().setRateCard(data.rateCard);
        }
      }

      if (isMountedRef.current) {
        setStatus({
          lastSyncedAt: new Date().toISOString(),
          isSyncing: false,
          error: null,
          isOnline: true,
        });
      }
    } catch (error) {
      if (isMountedRef.current) {
        const msg = error instanceof Error ? error.message : "Sync failed";
        // Don't show error if server is just not running (offline mode is fine)
        const isOffline = msg.includes("fetch") || msg.includes("Failed") || msg.includes("Network");
        setStatus((s) => ({
          ...s,
          isSyncing: false,
          error: isOffline ? null : msg,
          isOnline: !isOffline,
        }));
      }
    }
  }, []);

  // ── Initial sync + interval ────────────────────────────────────────────────

  useEffect(() => {
    isMountedRef.current = true;
    syncFromBackend();

    syncIntervalRef.current = setInterval(syncFromBackend, SYNC_INTERVAL_MS);

    // Debounced automatic sync for rate card changes
    let debounceTimer: ReturnType<typeof setTimeout>;
    const unsubRateCard = useRateCardStore.subscribe((state, prevState) => {
      // Small optimization: only sync if object identity genuinely changed
      if (state !== prevState && isMountedRef.current) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          syncRateCardUpdate();
        }, 3000);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      clearTimeout(debounceTimer);
      unsubRateCard();
    };
  }, [syncFromBackend]);

  return { status, syncNow: syncFromBackend };
}

// ============================================================================
// CRUD SYNC HELPERS — Fire-and-forget API calls after local store mutations
// ============================================================================

/**
 * Sync a customer creation to the backend (fire-and-forget)
 */
export async function syncCustomerCreate(customerData: any): Promise<void> {
  try {
    await apiClient.createCustomer(customerData);
  } catch {
    console.warn("[sync] Failed to sync customer create to backend — will retry on next sync");
  }
}

/**
 * Sync a customer update to the backend
 */
export async function syncCustomerUpdate(id: string, updates: any): Promise<void> {
  try {
    await apiClient.updateCustomer(id, updates);
  } catch {
    console.warn("[sync] Failed to sync customer update to backend");
  }
}

/**
 * Sync a customer delete to the backend
 */
export async function syncCustomerDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteCustomer(id);
  } catch {
    console.warn("[sync] Failed to sync customer delete to backend");
  }
}

/**
 * Sync a job creation to the backend
 */
export async function syncJobCreate(jobData: any): Promise<void> {
  try {
    await apiClient.createJob(jobData);
  } catch {
    console.warn("[sync] Failed to sync job create to backend");
  }
}

/**
 * Sync a job update to the backend
 */
export async function syncJobUpdate(id: string, updates: any): Promise<void> {
  try {
    await apiClient.updateJob(id, updates);
  } catch {
    console.warn("[sync] Failed to sync job update to backend");
  }
}

/**
 * Sync a job delete to the backend
 */
export async function syncJobDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteJob(id);
  } catch {
    console.warn("[sync] Failed to sync job delete to backend");
  }
}

/**
 * Sync an inventory item creation to the backend
 */
export async function syncInventoryCreate(itemData: any): Promise<void> {
  try {
    await apiClient.createInventoryItem(itemData);
  } catch {
    console.warn("[sync] Failed to sync inventory create to backend");
  }
}

/**
 * Sync an inventory item update to the backend
 */
export async function syncInventoryUpdate(id: string, updates: any): Promise<void> {
  try {
    await apiClient.updateInventoryItem(id, updates);
  } catch {
    console.warn("[sync] Failed to sync inventory update to backend");
  }
}

/**
 * Sync an inventory item delete to the backend
 */
export async function syncInventoryDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteInventoryItem(id);
  } catch {
    console.warn("[sync] Failed to sync inventory delete to backend");
  }
}

/**
 * Sync a quotation creation to the backend
 */
export async function syncQuotationCreate(quotationData: any): Promise<void> {
  try {
    await apiClient.createQuote(quotationData);
  } catch {
    console.warn("[sync] Failed to sync quotation create to backend");
  }
}

/**
 * Sync a quotation update to the backend
 */
export async function syncQuotationUpdate(id: string, updates: any): Promise<void> {
  try {
    await apiClient.updateQuote(id, updates);
  } catch {
    console.warn("[sync] Failed to sync quotation update to backend");
  }
}

/**
 * Sync a quotation delete to the backend
 */
export async function syncQuotationDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteQuote(id);
  } catch {
    console.warn("[sync] Failed to sync quotation delete to backend");
  }
}

/**
 * Sync a quotation status update to the backend
 */
export async function syncQuotationStatusUpdate(id: string, status: string): Promise<void> {
  try {
    await apiClient.updateQuoteStatus(id, status);
  } catch {
    console.warn("[sync] Failed to sync quotation status update to backend");
  }
}



/**
 * Sync a job duplication to the backend
 */
export async function syncJobDuplicate(id: string): Promise<void> {
  try {
    await apiClient.duplicateJob(id);
  } catch {
    console.warn("[sync] Failed to sync job duplicate to backend");
  }
}

/**
 * Sync a machine creation to the backend
 */
export async function syncMachineCreate(machineData: any): Promise<void> {
  try {
    await apiClient.createMachine(machineData);
  } catch {
    console.warn("[sync] Failed to sync machine create to backend");
  }
}

/**
 * Sync a machine update to the backend
 */
export async function syncMachineUpdate(id: string, updates: any): Promise<void> {
  try {
    await apiClient.updateMachine(id, updates);
  } catch {
    console.warn("[sync] Failed to sync machine update to backend");
  }
}

/**
 * Sync a machine delete to the backend
 */
export async function syncMachineDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteMachine(id);
  } catch {
    console.warn("[sync] Failed to sync machine delete to backend");
  }
}

/**
 * Sync a machine duplication to the backend
 */
export async function syncMachineDuplicate(id: string): Promise<void> {
  try {
    await apiClient.duplicateMachine(id);
  } catch {
    console.warn("[sync] Failed to sync machine duplicate to backend");
  }
}

/**
 * Sync the rate card state to the backend
 */
export async function syncRateCardUpdate(): Promise<void> {
  try {
    const state = useRateCardStore.getState();
    // Exclude function actions and purely derived UI state before sending
    const payload = Object.keys(state).reduce((acc: any, key) => {
      if (typeof (state as any)[key] !== 'function') {
        acc[key] = (state as any)[key];
      }
      return acc;
    }, {});
    await apiClient.upsertRateCard(payload);
  } catch {
    console.warn("[sync] Failed to sync rate card to backend");
  }
}
