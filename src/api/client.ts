const API_BASE = import.meta.env.VITE_API_URL || "/api/v1";

let authToken = "";

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
type JsonBody = Record<string, JsonValue>;

export function setApiToken(token: string): void {
  authToken = token || "";
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const msg = typeof body === "object" && body && "error" in body ? String((body as Record<string, unknown>).error) : "Request failed";
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
  // ── Auth ──
  register: (payload: JsonBody) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: JsonBody) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),

  // ── Quotes ──
  listQuotes: () => request("/quotes"),
  createQuote: (payload: JsonBody) => request("/quotes", { method: "POST", body: JSON.stringify(payload) }),
  updateQuoteStatus: (id: string, status: string) => request(`/quotes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // ── Rates ──
  listRates: () => request("/rates"),
  upsertRate: (payload: JsonBody) => request("/rates", { method: "PUT", body: JSON.stringify(payload) }),

  // ── Email ──
  sendQuoteEmail: (payload: JsonBody) => request("/email/send-quote", { method: "POST", body: JSON.stringify(payload) }),

  // ── Payments ──
  createPaymentIntent: (payload: JsonBody) => request("/payments/create-intent", { method: "POST", body: JSON.stringify(payload) }),

  // ── Customers ──
  listCustomers: () => request<{ customers: JsonBody[] }>("/customers"),
  getCustomer: (id: string) => request(`/customers/${id}`),
  createCustomer: (payload: JsonBody) => request("/customers", { method: "POST", body: JSON.stringify(payload) }),
  updateCustomer: (id: string, payload: JsonBody) => request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteCustomer: (id: string) => request(`/customers/${id}`, { method: "DELETE" }),
  exportCustomersCSV: () => downloadFile("/customers/export/csv", "customers.csv"),
  importCustomersCSV: (rows: JsonBody[]) => request("/customers/import/csv", { method: "POST", body: JSON.stringify({ rows }) }),

  // ── Jobs ──
  listJobs: () => request<{ jobs: JsonBody[] }>("/jobs"),
  getJob: (id: string) => request(`/jobs/${id}`),
  createJob: (payload: JsonBody) => request("/jobs", { method: "POST", body: JSON.stringify(payload) }),
  updateJob: (id: string, payload: JsonBody) => request(`/jobs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteJob: (id: string) => request(`/jobs/${id}`, { method: "DELETE" }),
  duplicateJob: (id: string) => request(`/jobs/${id}/duplicate`, { method: "POST" }),

  // ── Inventory ──
  listInventory: () => request<{ items: JsonBody[] }>("/inventory"),
  createInventoryItem: (payload: JsonBody) => request("/inventory", { method: "POST", body: JSON.stringify(payload) }),
  updateInventoryItem: (id: string, payload: JsonBody) => request(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteInventoryItem: (id: string) => request(`/inventory/${id}`, { method: "DELETE" }),
  exportInventoryCSV: () => downloadFile("/inventory/export/csv", "inventory.csv"),
  importInventoryCSV: (rows: JsonBody[]) => request("/inventory/import/csv", { method: "POST", body: JSON.stringify({ rows }) }),

  // ── System ──
  health: () => request("/system/health"),
  auditLogs: () => request("/system/admin/audit-logs"),

  // ── Files ──
  listFiles: () => request("/files"),
};
