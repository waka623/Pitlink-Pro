import type { MarketingGoal } from "./marketing-agent";

const STORAGE_KEY = "pitlink-marketing-kpi";

/** 月次KPI目標（店長が設定） */
export type MonthlyKpiTargets = {
  newCustomerVisits: number;
  reactivations: number;
  bookings: number;
  campaignSends: number;
};

export const DEFAULT_KPI: MonthlyKpiTargets = {
  newCustomerVisits: 8,
  reactivations: 12,
  bookings: 20,
  campaignSends: 80,
};

/** 試作CVR — 実データ連携後に店舗実績で更新 */
const ASSUMPTIONS = {
  sendToBookingRate: 0.06,
  bookingToVisitRate: 0.85,
  avgNewCustomerRevenue: 48000,
  avgReactivationRevenue: 35000,
  workingDaysPerMonth: 22,
  workingDaysPerWeek: 5,
} as const;

export type ActionTask = {
  id: string;
  title: string;
  detail: string;
  tab: "agent" | "campaign" | "promo";
  goal?: MarketingGoal;
  roles: Array<"owner" | "staff">;
  priority: "high" | "normal";
};

export type KpiProgress = {
  label: string;
  target: number;
  current: number;
  unit: string;
  weeklyPace: number;
  dailyPace: number;
  onTrack: boolean;
};

export type ReverseActionPlan = {
  monthLabel: string;
  targets: MonthlyKpiTargets;
  progress: KpiProgress[];
  weeklyPlan: string[];
  todayTasks: ActionTask[];
  staffMessage: string;
};

export type KpiSnapshot = {
  sentThisMonth: number;
  bookingsThisMonth: number;
  newVisitsThisMonth: number;
  reactivationsThisMonth: number;
};

export function demoKpiSnapshot(): KpiSnapshot {
  return {
    sentThisMonth: 24,
    bookingsThisMonth: 5,
    newVisitsThisMonth: 2,
    reactivationsThisMonth: 4,
  };
}

export function loadKpiTargets(): MonthlyKpiTargets {
  if (typeof window === "undefined") return DEFAULT_KPI;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KPI;
    return { ...DEFAULT_KPI, ...JSON.parse(raw) } as MonthlyKpiTargets;
  } catch {
    return DEFAULT_KPI;
  }
}

export function saveKpiTargets(targets: MonthlyKpiTargets) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
  window.dispatchEvent(new CustomEvent("pitlink:kpi-updated"));
}

function daysLeftInMonth(): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, last.getDate() - now.getDate() + 1);
}

function workingDaysLeft(): number {
  const left = daysLeftInMonth();
  return Math.max(1, Math.round(left * (ASSUMPTIONS.workingDaysPerMonth / 30)));
}

export function buildReverseActionPlan(
  targets: MonthlyKpiTargets,
  snapshot: KpiSnapshot = demoKpiSnapshot(),
): ReverseActionPlan {
  const daysLeft = workingDaysLeft();
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / ASSUMPTIONS.workingDaysPerWeek));

  const progress: KpiProgress[] = [
    {
      label: "キャンペーン配信",
      target: targets.campaignSends,
      current: snapshot.sentThisMonth,
      unit: "件",
      weeklyPace: Math.ceil(Math.max(0, targets.campaignSends - snapshot.sentThisMonth) / weeksLeft),
      dailyPace: Math.ceil(Math.max(0, targets.campaignSends - snapshot.sentThisMonth) / daysLeft),
      onTrack: snapshot.sentThisMonth >= (targets.campaignSends * (30 - daysLeft)) / 30,
    },
    {
      label: "予約獲得",
      target: targets.bookings,
      current: snapshot.bookingsThisMonth,
      unit: "件",
      weeklyPace: Math.ceil(Math.max(0, targets.bookings - snapshot.bookingsThisMonth) / weeksLeft),
      dailyPace: Math.ceil(Math.max(0, targets.bookings - snapshot.bookingsThisMonth) / daysLeft),
      onTrack: snapshot.bookingsThisMonth >= (targets.bookings * (30 - daysLeft)) / 30,
    },
    {
      label: "新規来店",
      target: targets.newCustomerVisits,
      current: snapshot.newVisitsThisMonth,
      unit: "件",
      weeklyPace: Math.ceil(Math.max(0, targets.newCustomerVisits - snapshot.newVisitsThisMonth) / weeksLeft),
      dailyPace: Math.ceil(Math.max(0, targets.newCustomerVisits - snapshot.newVisitsThisMonth) / daysLeft),
      onTrack: snapshot.newVisitsThisMonth >= (targets.newCustomerVisits * (30 - daysLeft)) / 30,
    },
    {
      label: "休眠再来店",
      target: targets.reactivations,
      current: snapshot.reactivationsThisMonth,
      unit: "件",
      weeklyPace: Math.ceil(Math.max(0, targets.reactivations - snapshot.reactivationsThisMonth) / weeksLeft),
      dailyPace: Math.ceil(Math.max(0, targets.reactivations - snapshot.reactivationsThisMonth) / daysLeft),
      onTrack: snapshot.reactivationsThisMonth >= (targets.reactivations * (30 - daysLeft)) / 30,
    },
  ];

  const sendsNeeded = progress[0].target - progress[0].current;
  const dailySends = progress[0].dailyPace;
  const dailyBookings = progress[1].dailyPace;

  const todayTasks: ActionTask[] = [];

  if (dailySends > 0) {
    todayTasks.push({
      id: "send-campaign",
      title: `キャンペーン配信 ${Math.min(dailySends, 5)}件`,
      detail: "キャンペーン配信タブ → 対象顧客を選び「送信する」。文案は自動生成。",
      tab: "campaign",
      roles: ["owner", "staff"],
      priority: "high",
    });
  }

  if (targets.newCustomerVisits > snapshot.newVisitsThisMonth) {
    todayTasks.push({
      id: "plan-new",
      title: "新規集客キャンペーンを設計",
      detail: "マーケAI設計 →「新規集客」を選び、生成案を確認。",
      tab: "agent",
      goal: "new_customer",
      roles: ["owner", "staff"],
      priority: "normal",
    });
  }

  if (targets.reactivations > snapshot.reactivationsThisMonth) {
    todayTasks.push({
      id: "plan-reactivate",
      title: "休眠客リストへ配信",
      detail: "マーケAI設計 →「休眠掘り起こし」→ 配信タブで90日以上未来店へ。",
      tab: "agent",
      goal: "reactivation",
      roles: ["owner", "staff"],
      priority: dailyBookings > 0 ? "normal" : "high",
    });
  }

  todayTasks.push({
    id: "check-promo",
    title: "集客プロモ（エコ枠）を確認",
    detail: "平日の空き枠に初回割引が入っているか確認。未設定ならワンクリック適用。",
    tab: "promo",
    roles: ["owner"],
    priority: "normal",
  });

  todayTasks.push({
    id: "weather-check",
    title: "天候トリガー施策を確認",
    detail: "降雪・凍結予報があれば「天候トリガー来店」キャンペーンを設計・配信。",
    tab: "agent",
    goal: "weather_trigger",
    roles: ["owner", "staff"],
    priority: "normal",
  });

  const weeklyPlan = [
    `配信 ${progress[0].weeklyPace}件 / 週（残り${sendsNeeded}件 → 予約転換目安 ${Math.round(sendsNeeded * ASSUMPTIONS.sendToBookingRate)}件）`,
    `予約 ${progress[1].weeklyPace}件 / 週 を目指す`,
    `新規来店 ${progress[2].weeklyPace}件 / 週 · 休眠再来 ${progress[3].weeklyPace}件 / 週`,
    `集客プロモ：平日エコ枠を維持（担当：店長）`,
  ];

  const estRevenue =
    (targets.newCustomerVisits - snapshot.newVisitsThisMonth) * ASSUMPTIONS.avgNewCustomerRevenue +
    (targets.reactivations - snapshot.reactivationsThisMonth) * ASSUMPTIONS.avgReactivationRevenue;

  const staffMessage =
    sendsNeeded <= 0
      ? "今月の配信目標は達成ペースです。来店フォローとプロモ確認を優先してください。"
      : `あと配信${sendsNeeded}件で月次目標。1日${dailySends}件×自動文案なら、マーケの腕に依存せず実行できます。達成時の売上寄与目安 ¥${Math.max(0, estRevenue).toLocaleString()}`;

  return {
    monthLabel: `${new Date().getMonth() + 1}月`,
    targets,
    progress,
    weeklyPlan,
    todayTasks,
    staffMessage,
  };
}

export function filterTasksForRole(tasks: ActionTask[], role: "owner" | "staff" | "parttime" | null): ActionTask[] {
  if (!role || role === "parttime") {
    return tasks.filter((t) => t.roles.includes("staff") && t.priority === "high").slice(0, 2);
  }
  if (role === "staff") {
    return tasks.filter((t) => t.roles.includes("staff"));
  }
  return tasks;
}
