import type { AreaWeather, WeatherData } from "./types";
import { FUKUI_REGION_LABEL } from "./regions";

const SNOW_IDS = new Set([
  600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622,
]);

export function parseOpenWeatherPayload(
  name: string,
  data: {
    main: { temp: number; humidity: number };
    weather: Array<{ id: number; description: string }>;
    snow?: { "1h"?: number };
  },
): AreaWeather {
  const weatherId = data.weather[0]?.id ?? 0;
  const snow1h = data.snow?.["1h"];
  const hasSnowCode = SNOW_IDS.has(weatherId);
  const hasSnow = hasSnowCode || (snow1h != null && snow1h > 0);

  return {
    name,
    temp: Math.round(data.main.temp),
    humidity: data.main.humidity,
    status: data.weather[0]?.description ?? "不明",
    isFreezing: data.main.temp < 2,
    hasSnow,
    snowMm: snow1h != null ? Math.round(snow1h * 10) / 10 : null,
    weatherId,
  };
}

export function buildRegionalWeather(areas: AreaWeather[]): WeatherData {
  const center = areas.find((a) => a.name === "福井市") ?? areas[0];
  const coldest = areas.reduce((min, a) => (a.temp < min.temp ? a : min), areas[0]);
  const snowAreas = areas.filter((a) => a.hasSnow).map((a) => a.name);
  const freezingAreas = areas.filter((a) => a.isFreezing).map((a) => a.name);
  const regionalAlert = areas.some((a) => a.isFreezing || a.hasSnow);

  let overview = `福井市 ${center.temp}℃・${center.status}。`;
  if (snowAreas.length > 0) {
    overview += `降雪: ${snowAreas.join("・")}。`;
  } else if (freezingAreas.length > 0) {
    overview += `凍結注意: ${freezingAreas.join("・")}。`;
  } else {
    overview += `県内最冷 ${coldest.name} ${coldest.temp}℃。`;
  }

  let summary = `現在、${FUKUI_REGION_LABEL}は「${center.status}」、福井市の気温${center.temp}℃`;
  if (snowAreas.length > 0) {
    const snowDetail =
      center.snowMm != null && center.snowMm > 0
        ? `（福井市 降雪量${center.snowMm}mm/h）`
        : "";
    summary += `。${snowAreas.join("・")}で降雪${snowDetail}。積雪・路面滑りに十分ご注意ください。`;
  } else if (regionalAlert || center.isFreezing) {
    summary += `。${freezingAreas.length > 0 ? `${freezingAreas.join("・")}で凍結注意` : "路面凍結の恐れ"}。走行には十分ご注意ください。`;
  } else if (center.temp < 5) {
    summary += "。気温低下に伴い、タイヤ性能が通常より低下しやすい状態です。";
  } else {
    summary += "。今後の気温低下に備えた点検をおすすめします。";
  }

  return {
    fetchedAt: new Date().toISOString(),
    center,
    areas,
    summary,
    overview,
    temp: center.temp,
    humidity: center.humidity,
    status: center.status,
    isFreezing: center.isFreezing,
    hasSnow: center.hasSnow || snowAreas.length > 0,
    snowMm: center.snowMm,
    weatherId: center.weatherId,
    regionalAlert,
    coldestArea: { name: coldest.name, temp: coldest.temp },
    snowAreas,
  };
}

export function formatSnowInfo(weather: Pick<WeatherData, "hasSnow" | "snowMm" | "snowAreas">): {
  label: string;
  detail: string;
} {
  if (weather.snowMm != null && weather.snowMm > 0) {
    return {
      label: `${weather.snowMm} mm/h`,
      detail: `福井市で直近1時間に約${weather.snowMm}mmの降雪が観測されています。`,
    };
  }
  if (weather.snowAreas.length > 0) {
    return {
      label: `${weather.snowAreas.length}地点`,
      detail: `${weather.snowAreas.join("・")}で降雪が観測されています。`,
    };
  }
  if (weather.hasSnow) {
    return {
      label: "降雪中",
      detail: "降雪が観測されています。スタッドレス・残り溝の確認を優先してください。",
    };
  }
  return {
    label: "なし",
    detail: "現在、県内主要エリアで顕著な降雪は観測されていません。",
  };
}

export function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
