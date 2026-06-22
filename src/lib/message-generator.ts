import type { WeatherData } from "@/api/weather";
import type { Customer, RiskResult } from "./mock-data";
import { calcCustomerRisk } from "./mock-data";
import { daysSince } from "./customer-utils";
import {
  analyzeVehicle,
  formatAncillaryLine,
  formatAncillarySection,
  suggestAncillaryProducts,
} from "./customer-analysis";
import { isLineLinked } from "./line-link";
import { STORE, storeBookingUrl, storeContactBlock } from "./store-config";

export type MessageChannel = "email" | "line";

export type GeneratedMessage = {
  customerId: string;
  urgency: "high" | "medium" | "low";
  recommendedChannel: MessageChannel;
  email: { subject: string; body: string };
  line: { body: string };
  rationale: string[];
  ancillaryRevenueEstimate: number;
};

function weatherContext(weather: WeatherData | null): {
  alert: string;
  freezing: boolean;
  cold: boolean;
  snowing: boolean;
} {
  if (!weather) {
    return {
      alert: "福井エリアでは寒波・降雪の可能性があります。走行前のセルフチェックをおすすめします。",
      freezing: true,
      cold: true,
      snowing: true,
    };
  }
  const freezing = weather.regionalAlert || weather.isFreezing;
  const cold = weather.temp < 5 || weather.coldestArea.temp < 5;
  const snowing = weather.hasSnow || weather.snowAreas.length > 0;
  return { alert: weather.summary, freezing, cold, snowing };
}

function pickSubject(c: Customer, risk: RiskResult, snowing: boolean): string {
  if (snowing && risk.level !== "safe") {
    return `【安全のお知らせ】${c.name}様 — 降雪前のタイヤセルフチェック（${STORE.shopName}）`;
  }
  if (risk.level === "danger") {
    return `【安全確認】${c.name}様 — 冬道走行のリスクについて（${STORE.shopName}）`;
  }
  if (risk.level === "warn") {
    return `【ご案内】${c.name}様 — 足元の安全を守る無料点検のご案内`;
  }
  return `【${STORE.shopName}】${c.name}様 — 安全運転のための季節点検`;
}

function buildSelfCheckList(
  customer: Customer,
  risk: RiskResult,
  vehicle: ReturnType<typeof analyzeVehicle>,
  snowing: boolean,
): string[] {
  const tips: string[] = [
    "出発前：タイヤの空気圧（特に寒暖差で下がりやすい）をご確認ください",
    `残り溝：${customer.tire.grooveMm}mm — 雪道は3.2mm未満で制動距離が大きく延びます`,
  ];
  if (snowing) {
    tips.push("降雪時：急加速・急ブレーキを避け、車間距離を通常の1.5倍以上に");
    tips.push("視界：ワイパー・除霜の状態を走行前にチェック");
  }
  if (vehicle.vehicleAgeYears >= 7) {
    tips.push(`車齢${vehicle.vehicleAgeYears}年：バッテリー上がりに注意（朝の始動が重い場合は早めにご相談を）`);
  }
  if (risk.level !== "safe") {
    tips.push("週1回：タイヤの偏摩耗・キズ・エア漏れの有無を10秒チェック");
  }
  return tips;
}

function buildAnalysisLines(
  customer: Customer,
  risk: RiskResult,
  vehicle: ReturnType<typeof analyzeVehicle>,
): string[] {
  const lines: string[] = [
    `総合リスク：${risk.score}/100（${risk.level === "danger" ? "要確認" : risk.level === "warn" ? "注意" : "良好"}）`,
    `${vehicle.modelYear}年式 · 車齢${vehicle.vehicleAgeYears}年`,
  ];
  if (vehicle.mileageKm != null) {
    lines.push(`走行約${vehicle.mileageKm.toLocaleString()}km`);
  }
  lines.push(`残り溝${customer.tire.grooveMm}mm · 硬度${customer.tire.hardness}`);
  risk.reasons.slice(0, 3).forEach((r) => lines.push(r));
  return lines;
}

function visitContext(c: Customer): string | null {
  const days = daysSince(c.lastVisit);
  if (days > 90) {
    return `前回の点検から${days}日経過しています。状態が変わっている可能性があるため、無料確認をおすすめします。`;
  }
  if (days > 60) {
    return `シーズン中の中間チェック時期です（前回から${days}日）。`;
  }
  return null;
}

function recommendChannel(c: Customer, risk: RiskResult): MessageChannel {
  if (!STORE.lineId) return "email";
  const linked = isLineLinked(c.id, c.lineId);
  if (linked && risk.level !== "safe") return "line";
  return linked ? "line" : "email";
}

function urgencyLevel(risk: RiskResult, freezing: boolean): GeneratedMessage["urgency"] {
  if (risk.level === "danger" && freezing) return "high";
  if (risk.level === "danger" || risk.level === "warn") return "medium";
  return "low";
}

function buildVisitInvite(c: Customer, risk: RiskResult): string {
  const base = "当店では無料でタイヤ・足回りの安全点検を実施しています。";
  if (risk.level === "danger") {
    return `${base}ご不安な点があれば、空いている枠からご予約ください。正確な状態を一緒に確認しましょう。`;
  }
  if (risk.level === "warn") {
    return `${base}10分程度のチェックで、冬道の安心材料が増えます。`;
  }
  return `${base}お近くの際に、お気軽にお立ち寄りください。`;
}

export function generatePersonalizedMessage(
  customer: Customer,
  weather: WeatherData | null,
  risk: RiskResult = calcCustomerRisk(customer),
): GeneratedMessage {
  const { alert, freezing, snowing } = weatherContext(weather);
  const vehicle = analyzeVehicle(customer);
  const selfChecks = buildSelfCheckList(customer, risk, vehicle, snowing);
  const analysisLines = buildAnalysisLines(customer, risk, vehicle);
  const visitNote = visitContext(customer);
  const ancillary = suggestAncillaryProducts(customer, risk, vehicle);
  const safetyMaintenance = formatAncillarySection(ancillary);
  const safetyLine = formatAncillaryLine(ancillary);
  const visitInvite = buildVisitInvite(customer, risk);
  const bookingUrl = storeBookingUrl(customer.id, { weekday: true });

  const rationale: string[] = ["安全管理・セルフチェック重視の文面"];
  if (snowing) rationale.push("降雪 — 走行前チェックリストを付与");
  if (freezing) rationale.push("凍結警戒 — 安全運転Tips");
  rationale.push(`車体${vehicle.vehicleAgeYears}年を分析反映`);
  if (risk.level !== "safe") rationale.push(`リスク${risk.score} — 無料点検を案内`);
  if (isLineLinked(customer.id, customer.lineId)) rationale.push("LINE連携済み");

  const subject = pickSubject(customer, risk, snowing);

  const emailBody = `${customer.name}様

いつも${STORE.shopName}をご利用いただき、ありがとうございます。

${alert}

大切なのは「早めの気づき」です。以下をご自宅でご確認いただき、不安な点があれば当店までご相談ください。

ご愛車：${customer.car}（${customer.plate}）

▼ 今週のセルフチェック（5分）
${selfChecks.map((t) => `· ${t}`).join("\n")}

▼ 当店の記録に基づく状態メモ
${analysisLines.map((l) => `· ${l}`).join("\n")}
${visitNote ? `\n· ${visitNote}` : ""}

${safetyMaintenance}

▼ 当店からのお願い
${visitInvite}

空いている時間帯は予約システムからそのままご入庫いただけます：
${bookingUrl}

安全な冬道を、一緒に整えていきましょう。

${storeContactBlock()}`;

  const lineBody = `【${STORE.shopName}｜安全のお知らせ】
${customer.name} 様

${alert}

✅ 今週のセルフチェック
${selfChecks.slice(0, 3).map((t) => `· ${t}`).join("\n")}

📋 状態メモ（リスク ${risk.score}/100）
${analysisLines.slice(0, 2).join(" / ")}

${safetyLine}

${visitInvite}

▶ 空き枠から予約
${bookingUrl}

📍 ${STORE.fullAddress}
TEL ${STORE.tel} · ${STORE.businessHoursDisplay}`;

  return {
    customerId: customer.id,
    urgency: urgencyLevel(risk, freezing),
    recommendedChannel: recommendChannel(customer, risk),
    email: { subject, body: emailBody },
    line: { body: lineBody },
    rationale,
    ancillaryRevenueEstimate: ancillary.reduce((s, o) => s + o.estimatedRevenue, 0),
  };
}

export function shouldAutoDispatch(
  customer: Customer,
  weather: WeatherData | null,
  risk: RiskResult = calcCustomerRisk(customer),
): boolean {
  if (risk.level === "danger") return true;
  if (risk.level === "warn" && weather?.hasSnow) return true;
  if (risk.level === "warn" && daysSince(customer.lastVisit) > 90) return true;
  return false;
}
