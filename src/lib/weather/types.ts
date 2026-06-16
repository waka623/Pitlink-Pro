export type AreaWeather = {
  name: string;
  temp: number;
  humidity: number;
  status: string;
  isFreezing: boolean;
  hasSnow: boolean;
  snowMm: number | null;
  weatherId: number;
};

export type WeatherData = {
  fetchedAt: string;
  /** 福井市（中心） */
  center: AreaWeather;
  /** 福井県北部〜嶺南の主要エリア */
  areas: AreaWeather[];
  /** 連絡文面用の要約 */
  summary: string;
  /** ダッシュボード表示用の概要 */
  overview: string;
  /** 中心地点（後方互換） */
  temp: number;
  humidity: number;
  status: string;
  isFreezing: boolean;
  hasSnow: boolean;
  snowMm: number | null;
  weatherId: number;
  regionalAlert: boolean;
  coldestArea: { name: string; temp: number };
  snowAreas: string[];
};
