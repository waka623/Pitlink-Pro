import type { Customer, RiskResult } from "./mock-data";
import { daysSince } from "./customer-utils";

export type VehicleAnalysis = {
  modelYear: number;
  vehicleAgeYears: number;
  mileageKm: number | null;
  mileagePerYear: number | null;
  ageBand: "new" | "mid" | "aging" | "old";
  insights: string[];
};

export type AncillaryOffer = {
  id: string;
  product: string;
  reason: string;
  pitch: string;
  estimatedRevenue: number;
  weekdayEcoNote?: string;
};

export function getVehicleAgeYears(customer: Customer, now = new Date()): number {
  return now.getFullYear() - customer.vehicleYear;
}

export function analyzeVehicle(customer: Customer): VehicleAnalysis {
  const vehicleAgeYears = getVehicleAgeYears(customer);
  const mileageKm = customer.mileageKm ?? null;
  const mileagePerYear =
    mileageKm != null && vehicleAgeYears > 0 ? Math.round(mileageKm / vehicleAgeYears) : null;

  const insights: string[] = [];
  if (vehicleAgeYears >= 10) {
    insights.push(`登録から${vehicleAgeYears}年 — バッテリー・足回りの劣化ピーク期`);
  } else if (vehicleAgeYears >= 7) {
    insights.push(`車齢${vehicleAgeYears}年 — 消耗品（オイル・ワイパー・フィルター）の一括点検推奨`);
  } else if (vehicleAgeYears >= 4) {
    insights.push(`車齢${vehicleAgeYears}年 — タイヤ以外の足回り点検で予防整備が効果的`);
  } else {
    insights.push(`比較的新しいお車 — 初回整備でリピート率向上が見込めます`);
  }

  if (mileagePerYear != null && mileagePerYear > 12000) {
    insights.push(`年間走行約${mileagePerYear.toLocaleString()}km — オイル・タイヤ摩耗が早い傾向`);
  }

  const ageBand: VehicleAnalysis["ageBand"] =
    vehicleAgeYears >= 10 ? "old" : vehicleAgeYears >= 7 ? "aging" : vehicleAgeYears >= 4 ? "mid" : "new";

  return {
    modelYear: customer.vehicleYear,
    vehicleAgeYears,
    mileageKm,
    mileagePerYear,
    ageBand,
    insights,
  };
}

/** 副商材提案 — 車体年数・走行・リスク・来店履歴から収益機会を抽出 */
export function suggestAncillaryProducts(
  customer: Customer,
  risk: RiskResult,
  vehicle: VehicleAnalysis,
): AncillaryOffer[] {
  const offers: AncillaryOffer[] = [];
  const visitDays = daysSince(customer.lastVisit);
  const ecoNote = "平日エコ枠ご予約でセット割引がさらに適用";

  if (visitDays > 60 || (vehicle.mileagePerYear != null && vehicle.mileagePerYear > 10000)) {
    offers.push({
      id: "oil",
      product: "エンジンオイル交換＋オイルエレメント",
      reason: visitDays > 90 ? `最終来店から${visitDays}日` : "走行距離からオイル劣化が想定",
      pitch: "タイヤ点検と同日施工で工賃20%OFF。冬場の始動性・燃費改善に直結します。",
      estimatedRevenue: 8800,
      weekdayEcoNote: ecoNote,
    });
  }

  if (vehicle.vehicleAgeYears >= 5 || vehicle.ageBand === "old") {
    offers.push({
      id: "battery",
      product: "バッテリー診断・交換",
      reason: `車齢${vehicle.vehicleAgeYears}年 — 寒波時の始動不良リスク`,
      pitch: "無料診断実施中。交換時は下取り最大¥3,000引き。積雪期の「動かない」を未然に防ぎます。",
      estimatedRevenue: 15000,
      weekdayEcoNote: ecoNote,
    });
  }

  if (risk.level !== "safe" || vehicle.vehicleAgeYears >= 6) {
    offers.push({
      id: "alignment",
      product: "四輪アライメント＋ローテーション",
      reason: risk.level !== "safe" ? "タイヤ偏摩耗・制動不安の予防" : "長年走行による足回りズレ想定",
      pitch: "タイヤ寿命を15〜20%延ばし、偏摩耗による早期交換を防ぎます。",
      estimatedRevenue: 6600,
      weekdayEcoNote: ecoNote,
    });
  }

  offers.push({
    id: "wiper",
    product: "冬用ワイパーブレード交換（2本セット）",
    reason: "福井の降雪・融雪剤で視界リスクが増大",
    pitch: "タイヤ交換・点検と同時施工でセット¥1,980。視界改善は安全運転の最短ルートです。",
    estimatedRevenue: 3980,
    weekdayEcoNote: ecoNote,
  });

  if (vehicle.vehicleAgeYears >= 7) {
    offers.push({
      id: "filter",
      product: "エアコンフィルター・エアクリーナー交換",
      reason: `車齢${vehicle.vehicleAgeYears}年 — 暖房・除霜効率の低下`,
      pitch: "冬場の曇り止め・暖房効率が改善。花粉シーズン前の提案にも転用可能です。",
      estimatedRevenue: 5500,
      weekdayEcoNote: ecoNote,
    });
  }

  if (risk.level === "danger") {
    offers.unshift({
      id: "winter-tire",
      product: "スタッドレスタイヤ4本＋ホイールセット",
      reason: `総合リスク${risk.score} — 冬タイヤ交換が最優先`,
      pitch: "在庫即日対応可能サイズあり。4本セットで工賃無料キャンペーン適用中。",
      estimatedRevenue: 68000,
      weekdayEcoNote: "平日ご来店でホイールバランス無料",
    });
  }

  const seen = new Set<string>();
  return offers
    .filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    })
    .slice(0, 4);
}

export function formatAncillarySection(offers: AncillaryOffer[]): string {
  if (offers.length === 0) return "";
  const lines = offers.map(
    (o, i) =>
      `${i + 1}. ${o.product}\n   └ なぜ今: ${o.reason}\n   └ 安全面: ${o.pitch.replace(/。$/, "")}で、事故リスクを下げられます。`,
  );
  return `▼ 安全のための整備ポイント（任意）
${lines.join("\n")}

※ ご来店時に状態を確認のうえ、必要な項目のみご提案します。無理なおすすめはいたしません。`;
}

export function formatAncillaryLine(offers: AncillaryOffer[]): string {
  return offers
    .slice(0, 2)
    .map((o) => `🛡 ${o.product}\n${o.reason}`)
    .join("\n\n");
}
