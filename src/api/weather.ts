import type { WeatherData } from "@/lib/weather/types";
import { fetchRegionalWeatherFn } from "@/lib/weather/fetch-weather.server";

export type { WeatherData, AreaWeather } from "@/lib/weather/types";
export { formatSnowInfo, formatFetchedAt } from "@/lib/weather/format";
export { FUKUI_REGION_LABEL } from "@/lib/weather/regions";

function weatherSignature(data: WeatherData): string {
  return [
    data.fetchedAt,
    data.temp,
    data.status,
    data.hasSnow,
    data.snowMm,
    data.regionalAlert,
    data.snowAreas.join(","),
    data.areas.map((a) => `${a.name}:${a.temp}:${a.status}:${a.hasSnow}`).join("|"),
  ].join(";");
}

async function fetchFromBackendApi(): Promise<WeatherData | null> {
  try {
    const res = await fetch("/api/weather");
    if (!res.ok) return null;
    return (await res.json()) as WeatherData;
  } catch {
    return null;
  }
}

export const getWeatherData = async (): Promise<WeatherData | null> => {
  try {
    const data = await fetchRegionalWeatherFn();
    if (data) return data;
  } catch (error) {
    console.error("Server weather fetch failed:", error);
  }
  return fetchFromBackendApi();
};

/** 変化があったときだけ state を更新するポーリング用 */
export async function pollWeatherData(
  current: WeatherData | null,
): Promise<{ data: WeatherData | null; changed: boolean }> {
  const data = await getWeatherData();
  if (!data) return { data: current, changed: false };
  if (!current) return { data, changed: true };
  const changed = weatherSignature(current) !== weatherSignature(data);
  return { data: changed ? data : current, changed };
}

export const WEATHER_POLL_INTERVAL_MS = 5 * 60 * 1000;
