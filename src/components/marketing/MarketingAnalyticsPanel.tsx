import { useEffect, useState } from "react";
import {
  buildReverseActionPlan,
  loadKpiTargets,
  demoKpiSnapshot,
  DEFAULT_KPI,
  type MonthlyKpiTargets,
} from "@/lib/marketing-kpi";
import { STORE } from "@/lib/store-config";

export function MarketingAnalyticsPanel() {
  const [targets, setTargets] = useState<MonthlyKpiTargets>(DEFAULT_KPI);

  useEffect(() => {
    setTargets(loadKpiTargets());
    const refresh = () => setTargets(loadKpiTargets());
    window.addEventListener("pitlink:kpi-updated", refresh);
    return () => window.removeEventListener("pitlink:kpi-updated", refresh);
  }, []);

  const plan = buildReverseActionPlan(targets, demoKpiSnapshot());

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="section-title">{plan.monthLabel} 効果測定 · KPI進捗</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {STORE.shopName}の施策を、配信→予約→来店のKPIで追跡します（試作数値）。
        </p>
      </div>

      <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plan.progress.map((p) => (
          <MetricCard
            key={p.label}
            label={p.label}
            value={`${p.current}/${p.target}${p.unit}`}
            sub={p.onTrack ? "ペース良好" : "要フォロー"}
            accent={!p.onTrack}
          />
        ))}
      </dl>

      <div className="panel p-6">
        <h3 className="font-bold">今週の逆算プラン</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {plan.weeklyPlan.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      </div>

      <div className="panel p-6 text-sm space-y-3">
        <div className="font-bold">なぜKPI逆算か</div>
        <p className="text-muted-foreground leading-relaxed">
          店長・スタッフの「マーケセンス」に依存すると成果にバラつきが出ます。
          {STORE.productName}は<strong className="text-foreground"> 月次目標 → 週次 → 今日のToDo </strong>
          に分解し、画面のボタン操作だけで同じ品質の施策を回せるように設計しています。
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className={`panel p-5 ${accent ? "border-amber-500/40 bg-amber-500/5" : "border-safe/30 bg-safe/5"}`}>
      <dt className="text-xs text-muted-foreground font-mono">{label}</dt>
      <dd className="text-2xl font-black mt-1">{value}</dd>
      <dd className="text-xs text-muted-foreground mt-1">{sub}</dd>
    </div>
  );
}
