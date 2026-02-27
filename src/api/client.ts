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

export const apiClient = {
  register: (payload: JsonBody) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: JsonBody) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  listQuotes: () => request("/quotes"),
  createQuote: (payload: JsonBody) => request("/quotes", { method: "POST", body: JSON.stringify(payload) }),
  updateQuoteStatus: (id: string, status: string) => request(`/quotes/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listRates: () => request("/rates"),
  upsertRate: (payload: JsonBody) => request("/rates", { method: "PUT", body: JSON.stringify(payload) }),
  sendQuoteEmail: (payload: JsonBody) => request("/email/send-quote", { method: "POST", body: JSON.stringify(payload) }),
  createPaymentIntent: (payload: JsonBody) => request("/payments/create-intent", { method: "POST", body: JSON.stringify(payload) }),
};
