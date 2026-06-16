export type SlotStatus = "available" | "booked" | "closed";

export type ReservationSlot = {
  key: string;
  day: number;
  slot: number;
  hour: number;
  time_label: string;
  weekday_label: string;
  datetime: string;
  status: SlotStatus;
  bookable: boolean;
};

export type AvailabilityResponse = {
  system_name: string;
  connected: boolean;
  external_api: boolean;
  week_start: string;
  slots: ReservationSlot[];
  available_count: number;
  booked_count: number;
};

export type BookingResponse = {
  success: boolean;
  reservation_id?: number;
  key?: string;
  datetime?: string;
  weekday_label?: string;
  time_label?: string;
  external_synced?: boolean;
  message?: string;
  error?: string;
};

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export async function fetchReservationAvailability(): Promise<AvailabilityResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/reservations/availability`);
    if (!res.ok) return null;
    return (await res.json()) as AvailabilityResponse;
  } catch {
    return null;
  }
}

export async function bookReservationSlot(payload: {
  day: number;
  slot: number;
  customer_external_id?: string;
  customer_name?: string;
  discount_percent?: number;
  notes?: string;
}): Promise<BookingResponse> {
  try {
    const res = await fetch(`${API_BASE}/reservations/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as BookingResponse;
  } catch {
    return { success: false, error: "network_error" };
  }
}

export function slotMap(slots: ReservationSlot[]): Map<string, ReservationSlot> {
  return new Map(slots.map((s) => [s.key, s]));
}
