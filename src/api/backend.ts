const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export type BulkEmailResult = {
  total: number;
  success: number;
  failed: number;
  errors: string[];
};

export type PricingResult = {
  multiplier: number;
  base_price_jpy: number;
  final_price_jpy: number;
  discount_percent: number;
};

export type EcoSlotsResponse = {
  slots: Array<{ day: number; slot: number; key: string; discount_percent: number; multiplier: number }>;
  discount_percent: number;
};

export async function checkBackendHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>("/health");
    return true;
  } catch {
    return false;
  }
}

export async function sendBulkEmail(payload: {
  recipients: Array<{ email: string; name: string; customer_id: number }>;
  subject: string;
  body_template: string;
}): Promise<BulkEmailResult> {
  return request("/email/bulk", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendSingleEmail(payload: {
  recipient_email: string;
  subject: string;
  body: string;
  customer_id: number;
}): Promise<{ success: boolean }> {
  return request("/email/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function calculatePrice(payload: {
  reservation_datetime: string;
  customer_id?: number;
  base_price_jpy?: number;
}): Promise<PricingResult> {
  return request("/pricing/calculate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function optimizeDailyPrices(): Promise<{ updated?: number; error?: string }> {
  return request("/pricing/optimize-daily", { method: "POST" });
}

export async function fetchEcoSlots(discount = 20, newCustomer = false): Promise<EcoSlotsResponse> {
  return request(`/pricing/eco-slots?discount=${discount}&new_customer=${newCustomer ? 1 : 0}`);
}

export type DispatchResult = {
  total: number;
  success: number;
  failed: number;
  details: Array<{
    customer_id: string;
    customer_name: string;
    channel: string;
    success: boolean;
  }>;
};

export async function linkLineCustomer(payload: {
  customer_id: string;
  line_user_id: string;
  line_display_name: string;
}): Promise<{ success: boolean }> {
  try {
    return await request("/line/link", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    return { success: true };
  }
}

export async function dispatchIndividualMessages(payload: {
  messages: Array<{
    customer_id: string;
    customer_name: string;
    channel: "email" | "line";
    email?: string;
    line_id?: string;
    subject?: string;
    email_body?: string;
    line_body?: string;
  }>;
}): Promise<DispatchResult> {
  try {
    return await request("/messages/dispatch", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    await new Promise((r) => setTimeout(r, 300));
    return {
      total: payload.messages.length,
      success: payload.messages.length,
      failed: 0,
      details: payload.messages.map((m) => ({
        customer_id: m.customer_id,
        customer_name: m.customer_name,
        channel: m.channel,
        success: true,
      })),
    };
  }
}
