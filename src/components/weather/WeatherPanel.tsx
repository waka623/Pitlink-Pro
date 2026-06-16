import type { WeatherData } from "@/api/weather";
import { formatFetchedAt, formatSnowInfo, FUKUI_REGION_LABEL } from "@/api/weather";

type Props = {
  weather: WeatherData | null;
  loading?: boolean;
};

export function WeatherPanel({ weather, loading }: Props) {
  if (loading) {
    return (
      <div className="panel p-5">
        <p className="text-base text-muted-foreground">気象データを取得中…</p>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="panel p-5 border-warn/40">
        <h2 className="section-title">気象情報（{FUKUI_REGION_LABEL}）</h2>
        <p className="text-base text-muted-foreground mt-2">
          気象APIに接続できません — テンプレートベースで文面を生成します
        </p>
      </div>
    );
  }

  const snow = formatSnowInfo(weather);
  const alert = weather.regionalAlert || weather.isFreezing || weather.hasSnow;

  return (
    <div className={`panel p-5 ${alert ? "border-danger/50 bg-danger/5" : "border-accent/30"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="section-title">気象情報（{FUKUI_REGION_LABEL}）</h2>
        <p className="text-xs text-muted-foreground">更新: {formatFetchedAt(weather.fetchedAt)}</p>
      </div>

      <p className="mt-3 text-base text-foreground leading-relaxed">{weather.overview}</p>

      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <WeatherStat label="福井市・天気" value={weather.status} />
        <WeatherStat label="福井市・気温" value={`${weather.temp}℃`} highlight={weather.isFreezing} />
        <WeatherStat label="福井市・湿度" value={`${weather.humidity}%`} />
        <WeatherStat label="県内降雪" value={snow.label} highlight={weather.hasSnow} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
          エリア別（8地点）
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {weather.areas.map((area) => (
            <div
              key={area.name}
              className={`rounded-md px-3 py-2 text-sm border ${
                area.hasSnow || area.isFreezing
                  ? "border-danger/40 bg-danger/5"
                  : "border-border bg-background/50"
              }`}
            >
              <div className="font-bold">{area.name}</div>
              <div className="text-muted-foreground mt-0.5">
                {area.temp}℃ · {area.status}
                {area.hasSnow ? " · 降雪" : ""}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          県内最冷: {weather.coldestArea.name} {weather.coldestArea.temp}℃
        </p>
      </div>

      {alert && (
        <div className="mt-4 rounded-lg bg-danger/10 border border-danger/30 px-4 py-3 text-base font-bold text-danger">
          {weather.snowAreas.length > 0
            ? `❄️ 降雪エリア: ${weather.snowAreas.join("・")} — `
            : weather.isFreezing
              ? "🧊 凍結注意 — "
              : ""}
          {weather.isFreezing || weather.regionalAlert
            ? "路面凍結・積雪に注意。タイヤ点検・連絡の優先度を上げてください。"
            : snow.detail}
        </div>
      )}
      {!alert && <p className="mt-3 text-sm text-muted-foreground">{snow.detail}</p>}
    </div>
  );
}

function WeatherStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-background/50 border border-border px-4 py-3">
      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`mt-1 text-lg font-black ${highlight ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}
