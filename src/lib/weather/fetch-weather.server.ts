import { createServerFn } from "@tanstack/react-start";

import { fetchFukuiRegionalWeather } from "./openweather.server";
import type { WeatherData } from "./types";

export const fetchRegionalWeatherFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<WeatherData | null> => {
    return fetchFukuiRegionalWeather();
  },
);
