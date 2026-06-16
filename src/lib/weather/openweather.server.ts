import { buildRegionalWeather, parseOpenWeatherPayload } from "./format";
import { FUKUI_WEATHER_AREAS } from "./regions";
import type { WeatherData } from "./types";

const CACHE_TTL_MS = 3 * 60 * 1000;

let cache: { expires: number; data: WeatherData } | null = null;

export function getWeatherApiKey(): string | undefined {
  return process.env.WEATHER_API_KEY?.trim() || undefined;
}

async function fetchAreaWeather(
  apiKey: string,
  area: (typeof FUKUI_WEATHER_AREAS)[number],
): Promise<ReturnType<typeof parseOpenWeatherPayload>> {
  const url = new URL("https://api.openweathermap.org/data/2.5/weather");
  url.searchParams.set("lat", String(area.lat));
  url.searchParams.set("lon", String(area.lon));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");
  url.searchParams.set("lang", "ja");

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenWeather API error ${res.status} (${area.name})`);
  }
  const data = (await res.json()) as Parameters<typeof parseOpenWeatherPayload>[1];
  return parseOpenWeatherPayload(area.name, data);
}

export async function fetchFukuiRegionalWeather(): Promise<WeatherData | null> {
  const apiKey = getWeatherApiKey();
  if (!apiKey) {
    console.error("WEATHER_API_KEY が設定されていません（サーバー環境変数）。");
    return null;
  }

  const now = Date.now();
  if (cache && cache.expires > now) {
    return cache.data;
  }

  try {
    const results = await Promise.all(
      FUKUI_WEATHER_AREAS.map((area) => fetchAreaWeather(apiKey, area)),
    );
    const data = buildRegionalWeather(results);
    cache = { data, expires: now + CACHE_TTL_MS };
    return data;
  } catch (error) {
    console.error("気象データ取得エラー:", error);
    return cache?.data ?? null;
  }
}
