import type { Customer, RiskResult } from "./mock-data";
import { analyzeVehicle, getVehicleAgeYears } from "./customer-analysis";

export function daysSince(dateStr: string): number {
  const last = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

export function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0) + "＊＊";
  return parts[0] + " " + parts[1].charAt(0) + "＊";
}

export function maskPhone(phone: string): string {
  return phone.replace(/\d{4}$/, "＊＊＊＊");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "＊＊＊";
  return local.charAt(0) + "＊＊＊@" + domain;
}

export function displayCustomerField(
  value: string,
  canViewPII: boolean,
  maskFn: (v: string) => string = (v) => v,
): string {
  return canViewPII ? value : maskFn(value);
}

export const RISK_LABELS: Record<RiskResult["level"], { label: string; color: string }> = {
  danger: { label: "危険", color: "var(--destructive, #dc2626)" },
  warn: { label: "注意", color: "#f59e0b" },
  safe: { label: "安全", color: "var(--safe, #22c55e)" },
};

export const RISK_TEXT_CLASS: Record<RiskResult["level"], string> = {
  danger: "text-destructive",
  warn: "text-amber-500",
  safe: "text-safe",
};

export function customerSummary(c: Customer, risk: RiskResult): string {
  const days = daysSince(c.lastVisit);
  const vehicleAge = getVehicleAgeYears(c);
  const vehicle = analyzeVehicle(c);
  return `${c.car}（${vehicleAge}年式） · リスク${RISK_LABELS[risk.level].label} · 最終来店${days}日前 · ${vehicle.insights[0] ?? ""}`;
}

export function formatVehicleAge(c: Customer): string {
  return `${c.vehicleYear}年式（車齢${getVehicleAgeYears(c)}年）`;
}
