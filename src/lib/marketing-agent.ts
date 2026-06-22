import type { WeatherData } from "@/api/weather";
import type { Customer } from "./mock-data";
import { calcCustomerRisk } from "./mock-data";
import { daysSince } from "./customer-utils";
import { STORE, storeBookingUrl, storeContactBlock } from "./store-config";

/** 文京店マーケAI — 集客・売上改善に特化したゴール */
export type MarketingGoal =
  | "new_customer"
  | "reactivation"
  | "revenue_up"
  | "weather_trigger";

export const MARKETING_GOALS: Record<
  MarketingGoal,
  { label: string; desc: string; kpi: string }
> = {
  new_customer: {
    label: "新規集客",
    desc: "文京エリアの初回来店・タイヤ点検無料訴求",
    kpi: "新規予約数",
  },
  reactivation: {
    label: "休眠掘り起こし",
    desc: "90日以上未来店の既存客を再来店へ",
    kpi: "再来店率",
  },
  revenue_up: {
    label: "売上・単価UP",
    desc: "点検結果に基づく安全メンテ提案で客単価改善",
    kpi: "客単価・付帯売上",
  },
  weather_trigger: {
    label: "天候トリガー来店",
    desc: "降雪・凍結予報前の来店促進（福井特化）",
    kpi: "悪天候週の来店数",
  },
};

export type CampaignPlan = {
  goal: MarketingGoal;
  title: string;
  segmentLabel: string;
  targetCount: number;
  channel: "email";
  hypothesis: string;
  expectedImpact: string;
  roiNote: string;
  emailSubject: string;
  emailBody: string;
  lineBody: string;
  kpis: string[];
  nextActions: string[];
  targetCustomerIds: string[];
};

function segmentCustomers(goal: MarketingGoal, customers: Customer[]): Customer[] {
  switch (goal) {
    case "new_customer":
      return customers.filter((c) => c.isNewCustomer || daysSince(c.lastVisit) > 180);
    case "reactivation":
      return customers.filter((c) => daysSince(c.lastVisit) > 90);
    case "revenue_up":
      return customers.filter((c) => {
        const risk = calcCustomerRisk(c);
        return risk.level !== "safe" || (c.mileageKm ?? 0) > 80000;
      });
    case "weather_trigger":
      return customers.filter((c) => calcCustomerRisk(c).level !== "safe");
  }
}

function weatherHook(weather: WeatherData | null): string {
  if (!weather) {
    return "福井エリアでは今週、寒波・路面凍結の可能性があります。";
  }
  if (weather.hasSnow || weather.snowAreas.length > 0) {
    return `【${weather.summary}】降雪・路面状況の変化が予想されています。`;
  }
  if (weather.regionalAlert || weather.isFreezing) {
    return `【${weather.summary}】凍結・低温に注意が必要な週です。`;
  }
  return weather.summary;
}

export function buildCampaignPlan(
  goal: MarketingGoal,
  customers: Customer[],
  weather: WeatherData | null = null,
): CampaignPlan {
  const targets = segmentCustomers(goal, customers);
  const bookingSample = storeBookingUrl(targets[0]?.id ?? "guest", {
    weekday: true,
    newCustomer: goal === "new_customer",
  });
  const contact = storeContactBlock();

  const base = {
    goal,
    segmentLabel: "",
    targetCount: targets.length,
    channel: "email" as const,
    targetCustomerIds: targets.map((c) => c.id),
    kpis: [] as string[],
    nextActions: [] as string[],
  };

  switch (goal) {
    case "new_customer":
      return {
        ...base,
        title: "文京店 · 初回来店キャンペーン",
        segmentLabel: "新規・長期未来店見込み",
        hypothesis:
          "文京・中央エリアの競合店は「安さ」訴求が多い。無料安全点検＋平日エコ枠で「安心・予約しやすさ」で差別化。",
        expectedImpact: "新規予約 +15〜25%（デモ試算）",
        roiNote: "1件の新規来店LTV ¥48,000想定 → 配信50件で1件成約でも黒字",
        emailSubject: `【${STORE.shortName}】初回タイヤ安全点検 無料 — 文京エリアの方へ`,
        emailBody: `${STORE.shopName}です。

文京・中央エリアでお車をお乗りの方へ。
初回来店限定で、タイヤ・足回りの安全点検を無料で実施中です。

▼ 文京店の強み
· 福井の雪道に詳しいスタッフが常駐
· 予約制で待ち時間を短縮
· 平日エコ枠でお得にご入庫

▼ ご予約（空き枠から選択）
${bookingSample}

${contact}`,
        lineBody: "",
        kpis: ["新規予約数", "初回来店率", "エコ枠利用率"],
        nextActions: [
          "集客プロモタブで平日エコ枠をON",
          "キャンペーン配信タブでセグメント一括送信",
          "2週間後に予約→来店の転換率を確認",
        ],
      };

    case "reactivation":
      return {
        ...base,
        title: "休眠客 · 再来店キャンペーン",
        segmentLabel: "90日以上未来店",
        hypothesis:
          "「前回点検から◯日」パーソナライズで、罪悪感ではなく「状態変化の確認」として再来店を促す。",
        expectedImpact: "再来店率 +12〜20%（デモ試算）",
        roiNote: "休眠1件の復帰でタイヤ交換+オイルで ¥35,000〜",
        emailSubject: `【${STORE.shopName}】前回点検からお時間が経ちました — 無料状態チェック`,
        emailBody: `${STORE.shopName}です。

季節の変わり目は、タイヤと足回りの状態も変わりやすい時期です。
前回ご来店から時間が経ったお客様向けに、10分の無料チェック枠をご用意しました。

▼ チェック内容
· 残り溝・偏摩耗 · エア圧 · ブレーキ・バッテリー目視

▼ 予約はこちら
${bookingSample}

${contact}`,
        lineBody: "",
        kpis: ["再来店率", "休眠→予約CVR", "平均来店間隔"],
        nextActions: [
          "対象リストを顧客セグメントで確認",
          "件名に「前回から◯日」を個別差し込み配信",
          "来店後7日以内にフォロー案内",
        ],
      };

    case "revenue_up":
      return {
        ...base,
        title: "客単価UP · 安全メンテ提案",
        segmentLabel: "リスク中〜高・走行距離多",
        hypothesis:
          "安全診断結果を根拠に、タイヤ本体だけでなくオイル・バッテリー・ワイパーを「冬の安全セット」として提案。",
        expectedImpact: "客単価 +8〜15%（デモ試算）",
        roiNote: "付帯1件 ¥8,000〜15,000 × 成約率向上で月次売上改善",
        emailSubject: `【${STORE.shopName}】冬の安全セット点検 — 足回りまとめて確認`,
        emailBody: `${STORE.shopName}です。

冬場の走行安全は、タイヤだけでなくバッテリー・ワイパー・オイル状態も左右します。
当店記録では、足回りまとめ点検で「予期せぬ故障」を事前に防いだ事例が増えています。

▼ 今週の提案
· タイヤ溝・硬度チェック（無料）
· 必要に応じてオイル・バッテリー・ワイパーをセット提案

▼ 空き枠から予約
${bookingSample}

${contact}`,
        lineBody: "",
        kpis: ["客単価", "付帯商材提案率", "点検→施工CVR"],
        nextActions: [
          "高リスク顧客から優先配信",
          "来店時チェックリストをスタッフ共有",
          "提案→成約を週次で記録",
        ],
      };

    case "weather_trigger":
      return {
        ...base,
        title: "降雪前 · 来店促進キャンペーン",
        segmentLabel: "冬道リスク注意〜危険",
        hypothesis: weatherHook(weather) + " 天候を「来店理由」に転換し、点検予約を前倒し。",
        expectedImpact: "悪天候週の予約 +20〜30%（デモ試算）",
        roiNote: "タイヤ交換・スタッドレス需要期の取りこぼし防止",
        emailSubject: `【${STORE.shopName}】降雪前のタイヤ安全確認 — ご予約優先枠`,
        emailBody: `${STORE.shopName}です。

${weatherHook(weather)}

走行前の安全確認は、早めの来店がいちばん確実です。
文京店では降雪前後の混雑を避けるため、事前予約をおすすめしています。

▼ 5分セルフチェック + プロ点検
· 残り溝 · エア圧 · 偏摩耗の有無

▼ 予約（空き枠）
${bookingSample}

${contact}`,
        lineBody: "",
        kpis: ["悪天候週の予約数", "点検→交換CVR", "キャンセル率"],
        nextActions: [
          "気象アラート発生48h以内に配信",
          "在庫サイズ別の即日対応可否を店内掲示",
          "予約ページURLを全チャネルで統一",
        ],
      };
  }
}

export type MarketingMetrics = {
  sentThisWeek: number;
  bookingsThisWeek: number;
  newCustomersThisMonth: number;
  estimatedRevenueLift: number;
  topChannel: string;
};

export function demoMarketingMetrics(): MarketingMetrics {
  return {
    sentThisWeek: 24,
    bookingsThisWeek: 7,
    newCustomersThisMonth: 3,
    estimatedRevenueLift: 142000,
    topChannel: "メール（LINE未設定）",
  };
}
