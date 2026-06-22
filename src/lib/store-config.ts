/** タイヤ館福井文京店 — V2 店舗設定（単一ソース） */

export const STORE = {
  version: "2.0.0",
  shopName: "タイヤ館福井文京店",
  shortName: "文京店",
  productName: "マーケAI",
  tagline: "集客・マーケティングAIエージェント",
  address: "福井県福井市文京",
  tel: "0778-XX-XXXX",
  lineId: "@taiyakan_fukui",
  lineAddUrl: "https://line.me/R/ti/p/@taiyakan_fukui",
  bookingBaseUrl: "https://pitlink-pro.vercel.app/booking",
  serviceArea: "福井市文京・中央エリア",
} as const;

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
