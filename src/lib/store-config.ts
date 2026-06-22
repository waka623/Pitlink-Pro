/** タイヤ館福井文京店 — V2 店舗設定（単一ソース） */

export const STORE = {
  version: "2.0.0",
  shopName: "タイヤ館福井文京店",
  shortName: "文京店",
  productName: "マーケAI",
  tagline: "集客・マーケティングAIエージェント",
  postalCode: "910-0017",
  address: "福井県福井市文京７丁目２−３８",
  fullAddress: "〒910-0017 福井県福井市文京７丁目２−３８",
  tel: "0776-27-3600",
  telLink: "0776273600",
  businessHoursOpen: "9:00",
  businessHoursClose: "18:30",
  businessHoursDisplay: "9:00〜18:30",
  lineId: "@taiyakan_fukui",
  lineAddUrl: "https://line.me/R/ti/p/@taiyakan_fukui",
  bookingBaseUrl: "https://pitlink-pro.vercel.app/booking",
  serviceArea: "福井市文京・中央エリア",
  mapsQuery: "タイヤ館福井文京店",
} as const;

export function storeContactBlock(): string {
  return [
    STORE.shopName,
    STORE.fullAddress,
    `TEL：${STORE.tel}`,
    `営業時間：${STORE.businessHoursDisplay}`,
    `公式LINE：${STORE.lineId}`,
  ].join("\n");
}

export function storeBookingUrl(
  customerId: string,
  params: { weekday?: boolean; discount?: number; newCustomer?: boolean } = {},
): string {
  const base =
    typeof window !== "undefined" ? `${window.location.origin}/booking` : STORE.bookingBaseUrl;
  const url = new URL(base);
  url.searchParams.set("customer", customerId);
  if (params.weekday !== false) url.searchParams.set("weekday", "1");
  if (params.discount != null) url.searchParams.set("discount", String(params.discount));
  if (params.newCustomer) url.searchParams.set("newCustomer", "1");
  return url.toString();
}
