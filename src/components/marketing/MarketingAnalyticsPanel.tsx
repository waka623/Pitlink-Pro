import { demoMarketingMetrics } from "@/lib/marketing-agent";
import { STORE } from "@/lib/store-config";

export function MarketingAnalyticsPanel() {
  const m = demoMarketingMetrics();

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <h2 className="section-title">売上・集客インパクト（デモ）</h2>
        <p className="text-sm text-muted-foreground mt-2">
          {STORE.shopName}のマーケ施策効果を、送信→予約→来店の流れで可視化します（試作数値）。
        </p>
      </div>

      <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="今週の配信" value={`${m.sentThisWeek}件`} sub="キャンペーン配信" />
        <MetricCard label="予約獲得" value={`${m.bookingsThisWeek}件`} sub="今週" accent />
        <MetricCard label="新規来店" value={`${m.newCustomersThisMonth}件`} sub="今月" />
        <MetricCard
          label="推定売上寄与"
          value={`¥${m.estimatedRevenueLift.toLocaleString()}`}
          sub="付帯含む試算"
          accent
        />
      </dl>

      <div className="panel p-6 text-sm space-y-3">
        <div className="font-bold">チャネル内訳</div>
        <p className="text-muted-foreground">主力: {m.topChannel}</p>
        <p className="text-muted-foreground">
          マーケAIは「便利ツール」ではなく、
          <strong className="text-foreground"> 集客・売上のゴールから逆算 </strong>
          した施策だけを提案します。POS連携や汎用CRM機能は意図的に後回しにしています。
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
    <div className={`panel p-5 ${accent ? "border-accent/40 bg-accent/5" : ""}`}>
      <dt className="text-xs text-muted-foreground font-mono">{label}</dt>
      <dd className="text-2xl font-black mt-1">{value}</dd>
      <dd className="text-xs text-muted-foreground mt-1">{sub}</dd>
    </div>
  );
}
