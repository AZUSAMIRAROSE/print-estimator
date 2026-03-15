const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";
const TOKEN_STORAGE_KEY = "print-estimator-api-token";
const REFRESH_TOKEN_KEY = "print-estimator-refresh-token";

let authToken = "";
let refreshToken = "";
let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

if (typeof window !== "undefined") {
  authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonBody = Record<string, any>;

export function setApiToken(token: string, refresh?: string): void {
  authToken = token || "";
  if (refresh !== undefined) refreshToken = refresh || "";
  if (typeof window === "undefined") return;
  if (authToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearApiTokens(): void {
  authToken = "";
  refreshToken = "";
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

// ── Silent token refresh ─────────────────────────────────────────────────────

async function silentRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  if (isRefreshing) {
    // Wait for the existing refresh to complete
    return new Promise((resolve) => {
      refreshQueue.push(() => resolve(!!authToken));
    });
  }

  isRefreshing = true;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      clearApiTokens();
      return false;
    }

    const data = await res.json();
    setApiToken(data.token, data.refreshToken);

    // Resolve all pending requests waiting for refresh
    refreshQueue.forEach((cb) => cb());
    refreshQueue = [];
    return true;
  } catch {
    clearApiTokens();
    return false;
  } finally {
    isRefreshing = false;
  }
}

// ── Request helper with auto-refresh ─────────────────────────────────────────

async function request<T = unknown>(path: string, options: globalThis.RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401
  if (response.status === 401 && refreshToken && !path.includes("/auth/")) {
    const refreshed = await silentRefresh();
    if (refreshed) {
      // Retry with new token
      headers.Authorization = `Bearer ${authToken}`;
      response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      });
    }
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const msg =
      typeof body === "object" && body && "error" in body
        ? String((body as Record<string, unknown>).error)
        : "Request failed";
    throw new Error(msg);
  }

  return body as T;
}

async function downloadFile(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) throw new Error("Download failed");

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const apiClient = {
  // Auth
  register: (payload: JsonBody) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: JsonBody) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  refreshTokens: () => request("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  me: () => request("/auth/me"),

  // Quotes
  listQuotes: () => request<{ quotes: JsonBody[] }>("/quotes"),
  createQuote: (payload: JsonBody) => request("/quotes", { method: "POST", body: JSON.stringify(payload) }),
  updateQuote: (id: string, payload: JsonBody) =>
    request(`/quotes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  updateQuoteStatus: (id: string, status: string) =>
    request(`/quotes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  deleteQuote: (id: string) => request(`/quotes/${id}`, { method: "DELETE" }),

  // Rates
  listRates: () => request("/rates"),
  upsertRate: (payload: JsonBody) => request("/rates", { method: "PUT", body: JSON.stringify(payload) }),

  // Email
  sendQuoteEmail: (payload: JsonBody) => request("/email/send-quote", { method: "POST", body: JSON.stringify(payload) }),

  // Payments
  createPaymentIntent: (payload: JsonBody) =>
    request("/payments/create-intent", { method: "POST", body: JSON.stringify(payload) }),

  // Customers
  listCustomers: () => request<{ customers: JsonBody[] }>("/customers"),
  getCustomer: (id: string) => request(`/customers/${id}`),
  createCustomer: (payload: JsonBody) => request("/customers", { method: "POST", body: JSON.stringify(payload) }),
  updateCustomer: (id: string, payload: JsonBody) =>
    request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCustomer: (id: string) => request(`/customers/${id}`, { method: "DELETE" }),
  exportCustomersCSV: () => downloadFile("/customers/export/csv", "customers.csv"),
  importCustomersCSV: (rows: JsonBody[]) => request("/customers/import/csv", { method: "POST", body: JSON.stringify({ rows }) }),

  // Jobs
  listJobs: () => request<{ jobs: JsonBody[] }>("/jobs"),
  getJob: (id: string) => request(`/jobs/${id}`),
  createJob: (payload: JsonBody) => request("/jobs", { method: "POST", body: JSON.stringify(payload) }),
  updateJob: (id: string, payload: JsonBody) => request(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteJob: (id: string) => request(`/jobs/${id}`, { method: "DELETE" }),
  duplicateJob: (id: string) => request(`/jobs/${id}/duplicate`, { method: "POST" }),

  // Inventory
  listInventory: () => request<{ items: JsonBody[] }>("/inventory"),
  createInventoryItem: (payload: JsonBody) => request("/inventory", { method: "POST", body: JSON.stringify(payload) }),
  updateInventoryItem: (id: string, payload: JsonBody) =>
    request(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteInventoryItem: (id: string) => request(`/inventory/${id}`, { method: "DELETE" }),
  exportInventoryCSV: () => downloadFile("/inventory/export/csv", "inventory.csv"),
  importInventoryCSV: (rows: JsonBody[]) => request("/inventory/import/csv", { method: "POST", body: JSON.stringify({ rows }) }),

  // Machines
  listMachines: () => request<{ machines: JsonBody[] }>("/machines"),
  createMachine: (payload: JsonBody) => request("/machines", { method: "POST", body: JSON.stringify(payload) }),
  updateMachine: (id: string, payload: JsonBody) => request(`/machines/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMachine: (id: string) => request(`/machines/${id}`, { method: "DELETE" }),
  duplicateMachine: (id: string) => request(`/machines/${id}/duplicate`, { method: "POST" }),

  // System
  health: () => request("/system/health"),
  auditLogs: () => request("/system/admin/audit-logs"),

  // Rate card
  getRateCard: () => request<{ rateCard: Record<string, unknown> | null; updatedAt: string }>("/rates"),
  upsertRateCard: (payload: JsonBody) => request("/rates", { method: "PUT", body: JSON.stringify(payload) }),

  // Files
  listFiles: () => request("/files"),
};
