/** 福井市を中心とした北部〜嶺南の主要エリア（OpenWeather lat/lon） */
export const FUKUI_WEATHER_AREAS = [
  { name: "福井市", lat: 36.0652, lon: 136.2219, center: true },
  { name: "鯖江市", lat: 35.9564, lon: 136.1849 },
  { name: "敦賀市", lat: 35.6456, lon: 136.0556 },
  { name: "越前市", lat: 35.9034, lon: 136.1667 },
  { name: "坂井市", lat: 36.1667, lon: 136.2333 },
  { name: "あわら市", lat: 36.2111, lon: 136.2292 },
  { name: "勝山市", lat: 36.0656, lon: 136.4878 },
  { name: "大野市", lat: 35.9814, lon: 136.4878 },
] as const;

export const FUKUI_REGION_LABEL = "福井エリア（福井市中心・県内主要8地点）";
