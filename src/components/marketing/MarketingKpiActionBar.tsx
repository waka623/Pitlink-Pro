import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  buildReverseActionPlan,
  loadKpiTargets,
  saveKpiTargets,
  filterTasksForRole,
  DEFAULT_KPI,
  type MonthlyKpiTargets,
} from "@/lib/marketing-kpi";
import { useRole } from "@/lib/role";
import { STORE } from "@/lib/store-config";

type Props = {
  onNavigateTab?: (tab: string) => void;
};

export function MarketingKpiActionBar({ onNavigateTab }: Props) {
  const { role } = useRole();
  const [targets, setTargets] = useState<MonthlyKpiTargets>(DEFAULT_KPI);
  const [editing, setEditing] = useState(false);
  const plan = buildReverseActionPlan(targets);
  const tasks = filterTasksForRole(plan.todayTasks, role);
  const canEdit = !role || role === "owner";

  useEffect(() => {
    setTargets(loadKpiTargets());
    const refresh = () => setTargets(loadKpiTargets());
    window.addEventListener("pitlink:kpi-updated", refresh);
    return () => window.removeEventListener("pitlink:kpi-updated", refresh);
  }, []);

  const handleSave = () => {
    saveKpiTargets(targets);
    setEditing(false);
    toast.success("月次KPIを保存しました");
  };

  return (
    <div className="space-y-4 mb-6">
      <div className="panel p-6 border-[var(--signal)]/30 bg-[color-mix(in_oklab,var(--signal)_8%,transparent)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-muted-foreground">{plan.monthLabel} KPI逆算プラン</div>
            <h2 className="section-title mt-1">今日やること — マーケの腕に依存しない</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{plan.staffMessage}</p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted"
            >
              {editing ? "閉じる" : "KPI目標を編集"}
            </button>
          )}
        </div>

        {editing && canEdit && (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-lg bg-background/60 border border-border">
            <KpiInput label="月間配信数" value={targets.campaignSends} onChange={(v) => setTargets({ ...targets, campaignSends: v })} />
            <KpiInput label="月間予約" value={targets.bookings} onChange={(v) => setTargets({ ...targets, bookings: v })} />
            <KpiInput label="新規来店" value={targets.newCustomerVisits} onChange={(v) => setTargets({ ...targets, newCustomerVisits: v })} />
            <KpiInput label="休眠再来" value={targets.reactivations} onChange={(v) => setTargets({ ...targets, reactivations: v })} />
            <button type="button" onClick={handleSave} className="sm:col-span-2 lg:col-span-4 btn-primary py-2">
              目標を保存して逆算を更新
            </button>
          </div>
        )}

        <dl className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {plan.progress.map((p) => (
            <div key={p.label} className={`rounded-lg p-3 ${p.onTrack ? "bg-safe/10 border border-safe/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
              <dt className="text-xs text-muted-foreground">{p.label}</dt>
              <dd className="text-lg font-black mt-0.5">
                {p.current}/{p.target}
                {p.unit}
              </dd>
              <dd className="text-[11px] text-muted-foreground mt-1">
                今日の目安 {p.dailyPace}{p.unit} · 今週 {p.weeklyPace}{p.unit}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel p-6">
        <h3 className="font-bold text-base">今日のアクション（{tasks.length}件）</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {role === "owner" ? "店長" : role === "staff" ? "スタッフ" : "バイト"}向けに表示を絞り込み中
        </p>
        <ol className="mt-4 space-y-3">
          {tasks.map((task, i) => (
            <li key={task.id} className="flex gap-3 items-start">
              <span className="size-7 shrink-0 rounded-full bg-primary/20 text-primary font-bold text-sm grid place-items-center">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm flex items-center gap-2">
                  {task.title}
                  {task.priority === "high" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive">優先</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{task.detail}</p>
                <Link
                  to="/dashboard"
                  search={{ tab: task.tab, ...(task.goal ? {} : {}) }}
                  onClick={() => onNavigateTab?.(task.tab)}
                  className="text-xs text-primary hover:underline mt-1 inline-block"
                >
                  → {tabLabel(task.tab)} を開く
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function tabLabel(tab: string): string {
  switch (tab) {
    case "agent":
      return "マーケAI設計";
    case "campaign":
      return "キャンペーン配信";
    case "promo":
      return "集客プロモ";
    default:
      return tab;
  }
}

function KpiInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-sm block">
      <span className="font-bold text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full border border-border rounded-lg px-3 py-2 bg-background"
      />
    </label>
  );
}

/** 機能一覧（店長・スタッフ向け説明） */
export function SystemCapabilityGuide() {
  const items = [
    {
      title: "KPI逆算プラン",
      desc: "月次目標から「今日・今週やること」を自動算出。誰が操作しても同じ手順。",
    },
    {
      title: "マーケAI設計",
      desc: "新規集客・休眠・売上UP・天候の4ゴールから、文案・セグメント・KPIを設計。",
    },
    {
      title: "キャンペーン配信",
      desc: "顧客ごとに文案を自動生成してメール配信（試作はDRY-RUN）。",
    },
    {
      title: "集客プロモ",
      desc: "平日エコ枠・初回割引を設定し、予約ページへ導線。",
    },
    {
      title: "ターゲット顧客",
      desc: "リスク・車齢・来店間隔でセグメント確認。",
    },
    {
      title: "予約導線",
      desc: "お客様が空き枠から直接予約（キャンペーンURLと連動）。",
    },
  ];

  return (
    <div className="panel p-6 space-y-4">
      <div>
        <h2 className="section-title">{STORE.shopName} マーケAI — できること</h2>
        <p className="text-sm text-muted-foreground mt-2">
          POS・汎用CRMではなく、<strong className="text-foreground">集客と売上改善だけ</strong>に特化した試作システムです。
        </p>
      </div>
      <ul className="grid sm:grid-cols-2 gap-3 text-sm">
        {items.map((item) => (
          <li key={item.title} className="rounded-lg bg-muted/40 p-4">
            <div className="font-bold">{item.title}</div>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{item.desc}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        ※ 数値は試作デモです。本番では店舗の実績CVR・売上データでKPI逆算精度を上げます。
      </p>
    </div>
  );
}
