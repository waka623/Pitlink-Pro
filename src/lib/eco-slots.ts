const STORAGE_KEY = "pitlink-eco-slots";
const DISCOUNT_KEY = "pitlink-eco-discount";
const NEW_CUSTOMER_MODE_KEY = "pitlink-new-customer-mode";

/** 平日新規客獲得向けデフォルト（月〜木 10:00/12:00/14:00） */
export const DEFAULT_ECO_SLOTS = ["0-0", "0-1", "1-0", "1-1", "2-0", "2-2", "3-1"];
export const DEFAULT_DISCOUNT = 25;
export const NEW_CUSTOMER_EXTRA_DISCOUNT = 10;

export function loadEcoSlots(): Set<string> {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved) as string[]);
  } catch {
    // Ignore storage errors and fall back to defaults.
  }
  return new Set(DEFAULT_ECO_SLOTS);
}

export function saveEcoSlots(slots: Set<string>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...slots]));
}

export function loadDiscount(): number {
  try {
    const saved = window.localStorage.getItem(DISCOUNT_KEY);
    if (saved) return Number(saved) || DEFAULT_DISCOUNT;
  } catch {
    // Ignore storage errors and fall back to defaults.
  }
  return DEFAULT_DISCOUNT;
}

export function saveDiscount(percent: number) {
  window.localStorage.setItem(DISCOUNT_KEY, String(percent));
}

export function loadNewCustomerMode(): boolean {
  try {
    return window.localStorage.getItem(NEW_CUSTOMER_MODE_KEY) === "1";
  } catch {
    return true;
  }
}

export function saveNewCustomerMode(enabled: boolean) {
  window.localStorage.setItem(NEW_CUSTOMER_MODE_KEY, enabled ? "1" : "0");
}

export function effectiveDiscount(base: number, newCustomerMode: boolean, isNewCustomer = false): number {
  let d = base;
  if (newCustomerMode) d += NEW_CUSTOMER_EXTRA_DISCOUNT;
  if (isNewCustomer) d += 5;
  return Math.min(50, d);
}

export function slotKey(day: number, slot: number) {
  return `${day}-${slot}`;
}

export function isWeekdayEcoSlot(key: string): boolean {
  const day = parseInt(key.split("-")[0], 10);
  return day >= 0 && day <= 4;
}

export function suggestNewCustomerSlots(): Set<string> {
  return new Set(["0-0", "0-1", "1-0", "1-2", "2-0", "2-1", "3-0", "3-2"]);
}
