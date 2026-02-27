export interface ApiAuthUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export interface ApiQuote {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string | null;
  payload: Record<string, unknown>;
  total_amount: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  created_by: string;
  created_at: string;
  updated_at: string;
}
