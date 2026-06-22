import { useMemo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getWeatherData, type WeatherData } from "@/api/weather";
import { useCustomers } from "@/hooks/use-customers";
import {
  MARKETING_GOALS,
  buildCampaignPlan,
  type MarketingGoal,
  type CampaignPlan,
} from "@/lib/marketing-agent";
import { STORE } from "@/lib/store-config";

type Props = {
  onSelectGoal?: (goal: MarketingGoal) => void;
};

export function MarketingAgentPanel({ onSelectGoal }: Props) {
  const customers = useCustomers();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [goal, setGoal] = useState<MarketingGoal>("new_customer");
  const [plan, setPlan] = useState<CampaignPlan | null>(null);

  useEffect(() => {
    void getWeatherData().then(setWeather);
  }, []);

  const goals = useMemo(() => Object.entries(MARKETING_GOALS) as [MarketingGoal, (typeof MARKETING_GOALS)[MarketingGoal]][], []);

  const generate = () => {
    const next = buildCampaignPlan(goal, customers, weather);
    setPlan(next);
    onSelectGoal?.(goal);
    toast.success("キャンペーン案を生成しました");
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6 border-primary/30 bg-primary/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="section-title">{STORE.productName} — 集客・売上特化</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              汎用CRMではなく、<strong className="text-foreground">文京店の集客・売上改善だけ</strong>
              を設計します。ゴールを選ぶと、セグメント・仮説・文案・KPI・次アクションを一括生成します。
            </p>
          </div>
          <span className="chip text-[var(--signal)] border-[var(--signal)]">Marketing Specialist</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {goals.map(([key, meta]) => (
          <button
            key={key}
            type="button"
            onClick={() => setGoal(key)}
            className={`text-left panel p-4 transition ${
              goal === key ? "border-primary bg-primary/10" : "hover:border-primary/40"
            }`}
          >
            <div className="font-bold">{meta.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{meta.desc}</div>
            <div className="text-[10px] text-mono text-accent mt-2">KPI: {meta.kpi}</div>
          </button>
        ))}
      </div>

      <button type="button" onClick={generate} className="btn-primary px-8 py-4 text-base">
        このゴールでキャンペーンを設計する →
      </button>

      {plan && (
        <div className="panel p-6 space-y-5">
          <div>
            <div className="text-xs text-mono text-muted-foreground">生成プラン</div>
            <h3 className="text-xl font-bold mt-1">{plan.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              対象 {plan.targetCount}名 · {plan.segmentLabel} · 推奨 {plan.channel}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <InfoBlock title="マーケ仮説" body={plan.hypothesis} />
            <InfoBlock title="期待インパクト" body={plan.expectedImpact} />
            <InfoBlock title="ROIメモ" body={plan.roiNote} accent />
          </div>

          <div>
            <div className="font-bold text-sm mb-2">配信用文案（メール）</div>
            <div className="text-sm text-muted-foreground mb-1">件名: {plan.emailSubject}</div>
            <textarea
              readOnly
              className="w-full min-h-[200px] p-4 text-sm border border-border rounded-lg bg-background"
              value={plan.emailBody}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-bold mb-2">追うKPI</div>
              <ul className="space-y-1 text-muted-foreground">
                {plan.kpis.map((k) => (
                  <li key={k}>· {k}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-bold mb-2">次のアクション</div>
              <ul className="space-y-1 text-muted-foreground">
                {plan.nextActions.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/dashboard"
              search={{ tab: "campaign" }}
              className="btn-primary px-6 py-3"
            >
              キャンペーン配信へ →
            </Link>
            <Link
              to="/dashboard"
              search={{ tab: "promo" }}
              className="px-6 py-3 rounded-lg border border-border hover:bg-muted"
            >
              集客プロモ設定
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ title, body, accent }: { title: string; body: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${accent ? "bg-accent/10 border border-accent/30" : "bg-muted/40"}`}>
      <div className="font-bold text-xs text-muted-foreground mb-1">{title}</div>
      <p className="leading-relaxed">{body}</p>
    </div>
  );
}
