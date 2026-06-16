// Mock customer + tire data for prototype
export interface Customer {
  id: string;
  name: string;
  nameKana: string;
  phone: string;
  email: string;
  lineId?: string;
  lineDisplayName?: string;
  lineLinkedAt?: string;
  /** 初度登録年（車体年数分析用） */
  vehicleYear: number;
  /** 走行距離 km */
  mileageKm?: number;
  /** 新規来店未経験（平日獲得キャンペーン対象） */
  isNewCustomer?: boolean;
  car: string;
  plate: string;
  tire: {
    brand: string;
    size: string;
    manufactureYear: number;
    grooveMm: number;
    hardness: number;
  };
  lastVisit: string;
}

export const customers: Customer[] = [
  {
    id: "C-1042",
    name: "山田 太郎",
    nameKana: "ヤマダ タロウ",
    phone: "090-1234-5678",
    email: "yamada@example.com",
    lineId: "U_yamada_line",
    lineDisplayName: "山田太郎",
    vehicleYear: 2016,
    mileageKm: 98000,
    car: "トヨタ プリウス",
    plate: "福井 300 あ 12-34",
    tire: { brand: "BRIDGESTONE BLIZZAK VRX3", size: "195/65R15", manufactureYear: 2019, grooveMm: 3.2, hardness: 72 },
    lastVisit: "2024-11-12",
  },
  {
    id: "C-1108",
    name: "佐藤 美咲",
    nameKana: "サトウ ミサキ",
    phone: "080-9876-5432",
    email: "sato@example.com",
    lineId: "U_sato_line",
    lineDisplayName: "佐藤美咲",
    vehicleYear: 2021,
    mileageKm: 32000,
    car: "ホンダ N-BOX",
    plate: "福井 580 い 56-78",
    tire: { brand: "DUNLOP WINTER MAXX 02", size: "155/65R14", manufactureYear: 2022, grooveMm: 6.5, hardness: 58 },
    lastVisit: "2025-01-08",
  },
  {
    id: "C-1199",
    name: "髙橋 健一",
    nameKana: "タカハシ ケンイチ",
    phone: "070-1111-2222",
    email: "takahashi@example.com",
    lineId: "U_takahashi_line",
    lineDisplayName: "髙橋健一",
    vehicleYear: 2014,
    mileageKm: 142000,
    car: "スバル フォレスター",
    plate: "福井 330 う 90-12",
    tire: { brand: "YOKOHAMA iceGUARD 6", size: "225/55R18", manufactureYear: 2018, grooveMm: 2.8, hardness: 78 },
    lastVisit: "2024-10-30",
  },
  {
    id: "C-1245",
    name: "中村 由香",
    nameKana: "ナカムラ ユカ",
    phone: "090-3333-4444",
    email: "nakamura@example.com",
    vehicleYear: 2019,
    mileageKm: 54000,
    isNewCustomer: true,
    car: "ダイハツ タント",
    plate: "福井 580 え 34-56",
    tire: { brand: "TOYO OBSERVE GIZ2", size: "165/55R15", manufactureYear: 2021, grooveMm: 4.8, hardness: 64 },
    lastVisit: "2024-12-20",
  },
];

export const fukuiSnowRisk = 0.92;

export interface RiskResult {
  level: "safe" | "warn" | "danger";
  score: number;
  reasons: string[];
}

export function calcRisk(
  tire: Customer["tire"],
  opts?: { vehicleYear?: number; snowRisk?: number },
): RiskResult {
  const snowRisk = opts?.snowRisk ?? fukuiSnowRisk;
  const tireAge = new Date().getFullYear() - tire.manufactureYear;
  const vehicleAge = opts?.vehicleYear ? new Date().getFullYear() - opts.vehicleYear : 0;

  const grooveScore = Math.max(0, Math.min(100, (5 - tire.grooveMm) * 22));
  const hardScore = Math.max(0, Math.min(100, (tire.hardness - 50) * 2.4));
  const tireAgeScore = Math.min(100, tireAge * 14);
  const vehicleAgeScore =
    vehicleAge >= 12 ? 35 : vehicleAge >= 9 ? 25 : vehicleAge >= 6 ? 15 : vehicleAge >= 4 ? 8 : 0;

  const base =
    grooveScore * 0.32 +
    hardScore * 0.32 +
    tireAgeScore * 0.16 +
    vehicleAgeScore * 0.2;
  const score = Math.round(base * (0.6 + snowRisk * 0.4));

  const reasons: string[] = [];
  if (tire.grooveMm < 4) reasons.push(`残り溝 ${tire.grooveMm}mm（プラットフォーム接近）`);
  if (tire.hardness > 65) reasons.push(`硬度 ${tire.hardness}（基準60超過）`);
  if (tireAge >= 5) reasons.push(`タイヤ製造から${tireAge}年経過`);
  if (vehicleAge >= 8) reasons.push(`車体${vehicleAge}年 — 足回り・始動系劣化リスク`);
  else if (vehicleAge >= 5) reasons.push(`車体${vehicleAge}年 — 消耗品交換期`);

  let level: RiskResult["level"] = "safe";
  if (score >= 65) level = "danger";
  else if (score >= 40) level = "warn";

  return { level, score, reasons };
}

export function calcCustomerRisk(customer: Customer, snowRisk = fukuiSnowRisk): RiskResult {
  return calcRisk(customer.tire, { vehicleYear: customer.vehicleYear, snowRisk });
}

export const timeSlots = ["10:00", "12:00", "14:00", "16:00", "18:00"];
export const weekdays = ["月", "火", "水", "木", "金", "土", "日"];

export interface EcoSlot {
  day: number;
  slot: number;
}

export const posSyncLog = [
  { time: "08:12", action: "本部マスタ取得", count: 1284 },
  { time: "08:12", action: "新規顧客レコード差分", count: 7 },
  { time: "08:13", action: "在庫タイヤSKU更新", count: 42 },
  { time: "08:13", action: "予約データ書き戻し", count: 11 },
];
