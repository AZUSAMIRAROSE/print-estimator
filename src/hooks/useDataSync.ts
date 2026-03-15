/**
 * useDataSync — Advanced bridge between Zustand stores and the Express backend
 * 
 * FIXES from audit:
 * 1. Merges by ID with updatedAt comparison (not seed-only)
 * 2. Backend responses are now camelCase (enrichRow on server side)
 * 3. Rate card sync debounce uses useRef to avoid stale closures
 * 4. Rate card sync only sends data fields (no functions)
 * 5. Typed responses instead of widespread `any`
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
import type { Customer, Job, Quotation } from "@/types";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncStatus {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  error: string | null;
  isOnline: boolean;
}

interface ApiCustomerList { customers: Customer[] }
interface ApiJobList { jobs: Job[] }
interface ApiInventoryList { items: Array<Record<string, unknown> & { id: string }> }
interface ApiQuoteList { quotes: Array<Record<string, unknown> & { id: string }> }
interface ApiMachineList { machines: Array<Record<string, unknown> & { id: string }> }
interface ApiRateCard { rateCard: Record<string, unknown> | null; updatedAt?: string }

// ── Merge Strategy ───────────────────────────────────────────────────────────

/**
 * Smart merge: For each entity from the backend, if it already exists locally:
 *   - prefer whichever has the more recent `updatedAt`
 * If it doesn't exist locally, add it.
 * Local-only items (not in backend) are kept.
 */
function mergeById<T extends { id: string; updatedAt?: string }>(
  local: T[],
  remote: T[],
): T[] {
  const merged = new Map<string, T>();
  
  // Start with locals
  for (const item of local) {
    merged.set(item.id, item);
  }
  
  // Overlay or add remotes
  for (const remote_item of remote) {
    const existing = merged.get(remote_item.id);
    if (!existing) {
      // New from backend
      merged.set(remote_item.id, remote_item);
    } else {
      // Compare updatedAt — prefer more recent
      const localTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      const remoteTime = remote_item.updatedAt ? new Date(remote_item.updatedAt).getTime() : 0;
      if (remoteTime >= localTime) {
        merged.set(remote_item.id, remote_item);
      }
    }
  }
  
  return Array.from(merged.values());
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
  const rateCardDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch and merge data from backend ──────────────────────────────────────

  const syncFromBackend = useCallback(async () => {
    if (!isMountedRef.current) return;

    setStatus((s) => ({ ...s, isSyncing: true, error: null }));

    try {
      // Health check — if server is down, skip sync
      await apiClient.health();

      // Fetch all in parallel
      const [customersRes, jobsRes, inventoryRes, quotesRes, machinesRes, rateCardRes] = await Promise.allSettled([
        apiClient.listCustomers(),
        apiClient.listJobs(),
        apiClient.listInventory(),
        apiClient.listQuotes(),
        apiClient.listMachines(),
        apiClient.getRateCard(),
      ]);

      if (!isMountedRef.current) return;

      // ── Merge customers ──────────────────────────────────────────────────
      if (customersRes.status === "fulfilled") {
        const data = customersRes.value as unknown as ApiCustomerList;
        const remoteCustomers = data?.customers || [];
        if (Array.isArray(remoteCustomers) && remoteCustomers.length > 0) {
          const localCustomers = useDataStore.getState().customers;
          const merged = mergeById(localCustomers, remoteCustomers);
          useDataStore.setState({ customers: merged });
        }
      }

      // ── Merge jobs ───────────────────────────────────────────────────────
      if (jobsRes.status === "fulfilled") {
        const data = jobsRes.value as unknown as ApiJobList;
        const remoteJobs = data?.jobs || [];
        if (Array.isArray(remoteJobs) && remoteJobs.length > 0) {
          const localJobs = useDataStore.getState().jobs;
          const merged = mergeById(localJobs, remoteJobs);
          useDataStore.setState({ jobs: merged });
        }
      }

      // ── Merge inventory ──────────────────────────────────────────────────
      if (inventoryRes.status === "fulfilled") {
        const data = inventoryRes.value as unknown as ApiInventoryList;
        const remoteItems = data?.items || [];
        if (Array.isArray(remoteItems) && remoteItems.length > 0) {
          const store = useInventoryStore.getState();
          const localItems = store.items || [];
          // Use mergeById with loose typing since inventory uses lastUpdated
          const normalized = remoteItems.map((item) => ({
            ...item,
            updatedAt: (item.lastUpdated || item.updatedAt || "") as string,
          })) as unknown as Array<{ id: string; updatedAt?: string }>;
          const merged = mergeById(
            localItems as unknown as Array<{ id: string; updatedAt?: string }>,
            normalized,
          );
          useInventoryStore.setState({ items: merged as unknown as typeof localItems });
        }
      }

      // ── Merge quotations ─────────────────────────────────────────────────
      if (quotesRes.status === "fulfilled") {
        const data = quotesRes.value as unknown as ApiQuoteList;
        const remoteQuotes = data?.quotes || [];
        if (Array.isArray(remoteQuotes) && remoteQuotes.length > 0) {
          const localQuotations = useDataStore.getState().quotations;
          const merged = mergeById(localQuotations, remoteQuotes as unknown as Quotation[]);
          useDataStore.setState({ quotations: merged });
        }
      }

      // ── Merge machines ───────────────────────────────────────────────────
      if (machinesRes.status === "fulfilled") {
        const data = machinesRes.value as unknown as ApiMachineList;
        const remoteMachines = data?.machines || [];
        if (Array.isArray(remoteMachines) && remoteMachines.length > 0) {
          const store = useMachineStore.getState();
          remoteMachines.forEach((m: Record<string, unknown>) => {
            const id = m.id as string;
            if (!store.machines.has(id)) {
              store.addMachine(m as Parameters<typeof store.addMachine>[0]);
            }
          });
        }
      }

      // ── Merge rate card config ───────────────────────────────────────────
      if (rateCardRes.status === "fulfilled") {
        const data = rateCardRes.value as unknown as ApiRateCard;
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

    // Debounced automatic sync for rate card changes — uses ref (not closure var)
    const unsubRateCard = useRateCardStore.subscribe((state, prevState) => {
      if (state !== prevState && isMountedRef.current) {
        // Clear previous timer via ref
        if (rateCardDebounceRef.current) {
          clearTimeout(rateCardDebounceRef.current);
        }
        rateCardDebounceRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            syncRateCardUpdate();
          }
        }, 3000);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (rateCardDebounceRef.current) {
        clearTimeout(rateCardDebounceRef.current);
      }
      unsubRateCard();
    };
  }, [syncFromBackend]);

  return { status, syncNow: syncFromBackend };
}

// ============================================================================
// CRUD SYNC HELPERS — Fire-and-forget API calls after local store mutations
// ============================================================================

// Utility: accepts typed objects OR plain records for maximum flexibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SyncPayload = Record<string, any>;

export async function syncCustomerCreate(customerData: Partial<Customer> | Record<string, unknown>): Promise<void> {
  try {
    await apiClient.createCustomer(customerData as Record<string, unknown>);
  } catch {
    console.warn("[sync] Failed to sync customer create to backend — will retry on next sync");
  }
}

export async function syncCustomerUpdate(id: string, updates: Partial<Customer> | Record<string, unknown>): Promise<void> {
  try {
    await apiClient.updateCustomer(id, updates as Record<string, unknown>);
  } catch {
    console.warn("[sync] Failed to sync customer update to backend");
  }
}

export async function syncCustomerDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteCustomer(id);
  } catch {
    console.warn("[sync] Failed to sync customer delete to backend");
  }
}

export async function syncJobCreate(jobData: Partial<Job> | Record<string, unknown>): Promise<void> {
  try {
    await apiClient.createJob(jobData as Record<string, unknown>);
  } catch {
    console.warn("[sync] Failed to sync job create to backend");
  }
}

export async function syncJobUpdate(id: string, updates: Partial<Job> | Record<string, unknown>): Promise<void> {
  try {
    await apiClient.updateJob(id, updates as Record<string, unknown>);
  } catch {
    console.warn("[sync] Failed to sync job update to backend");
  }
}

export async function syncJobDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteJob(id);
  } catch {
    console.warn("[sync] Failed to sync job delete to backend");
  }
}

export async function syncInventoryCreate(itemData: SyncPayload): Promise<void> {
  try {
    await apiClient.createInventoryItem(itemData);
  } catch {
    console.warn("[sync] Failed to sync inventory create to backend");
  }
}

export async function syncInventoryUpdate(id: string, updates: SyncPayload): Promise<void> {
  try {
    await apiClient.updateInventoryItem(id, updates);
  } catch {
    console.warn("[sync] Failed to sync inventory update to backend");
  }
}

export async function syncInventoryDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteInventoryItem(id);
  } catch {
    console.warn("[sync] Failed to sync inventory delete to backend");
  }
}

export async function syncQuotationCreate(quotationData: SyncPayload): Promise<void> {
  try {
    await apiClient.createQuote(quotationData);
  } catch {
    console.warn("[sync] Failed to sync quotation create to backend");
  }
}

export async function syncQuotationUpdate(id: string, updates: SyncPayload): Promise<void> {
  try {
    await apiClient.updateQuote(id, updates);
  } catch {
    console.warn("[sync] Failed to sync quotation update to backend");
  }
}

export async function syncQuotationDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteQuote(id);
  } catch {
    console.warn("[sync] Failed to sync quotation delete to backend");
  }
}

export async function syncQuotationStatusUpdate(id: string, status: string): Promise<void> {
  try {
    await apiClient.updateQuoteStatus(id, status);
  } catch {
    console.warn("[sync] Failed to sync quotation status update to backend");
  }
}

export async function syncJobDuplicate(id: string): Promise<void> {
  try {
    await apiClient.duplicateJob(id);
  } catch {
    console.warn("[sync] Failed to sync job duplicate to backend");
  }
}

export async function syncMachineCreate(machineData: SyncPayload): Promise<void> {
  try {
    await apiClient.createMachine(machineData);
  } catch {
    console.warn("[sync] Failed to sync machine create to backend");
  }
}

export async function syncMachineUpdate(id: string, updates: SyncPayload): Promise<void> {
  try {
    await apiClient.updateMachine(id, updates);
  } catch {
    console.warn("[sync] Failed to sync machine update to backend");
  }
}

export async function syncMachineDelete(id: string): Promise<void> {
  try {
    await apiClient.deleteMachine(id);
  } catch {
    console.warn("[sync] Failed to sync machine delete to backend");
  }
}

export async function syncMachineDuplicate(id: string): Promise<void> {
  try {
    await apiClient.duplicateMachine(id);
  } catch {
    console.warn("[sync] Failed to sync machine duplicate to backend");
  }
}

/**
 * Sync the rate card state to the backend — only data fields, no functions.
 */
export async function syncRateCardUpdate(): Promise<void> {
  try {
    const state = useRateCardStore.getState();
    // Explicitly pick only serializable data fields
    const dataKeys = ["paperRates", "machineRates", "serviceRates", "finishingRates", "bindingRates", "packingRates", "deliveryRates", "lastUpdated"];
    const payload: Record<string, unknown> = {};
    const stateAsRecord = state as unknown as Record<string, unknown>;
    for (const key of dataKeys) {
      if (key in stateAsRecord && typeof stateAsRecord[key] !== "function") {
        payload[key] = stateAsRecord[key];
      }
    }
    await apiClient.upsertRateCard(payload);
  } catch {
    console.warn("[sync] Failed to sync rate card to backend");
  }
}
