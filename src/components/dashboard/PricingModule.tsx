import { useState, useEffect, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  loadEcoSlots,
  saveEcoSlots,
  loadDiscount,
  saveDiscount,
  loadNewCustomerMode,
  saveNewCustomerMode,
  effectiveDiscount,
  suggestNewCustomerSlots,
  slotKey,
  NEW_CUSTOMER_EXTRA_DISCOUNT,
} from "@/lib/eco-slots";
import { checkBackendHealth, fetchEcoSlots, optimizeDailyPrices } from "@/api/backend";
import {
  fetchReservationAvailability,
  slotMap,
  type AvailabilityResponse,
} from "@/api/reservations";
import { ReservationCalendar, ReservationLegend } from "@/components/booking/ReservationCalendar";
import { weekdays, timeSlots } from "@/lib/mock-data";

export function PricingModule() {
  const [ecoSlots, setEcoSlots] = useState<Set<string>>(() => loadEcoSlots());
  const [discount, setDiscount] = useState(() => loadDiscount());
  const [newCustomerMode, setNewCustomerMode] = useState(() => loadNewCustomerMode());
  const [previewSlot, setPreviewSlot] = useState<string | null>(() => {
    const slots = loadEcoSlots();
    return slots.size > 0 ? [...slots][0] : null;
  });
  const [backendOnline, setBackendOnline] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);

  const displayDiscount = effectiveDiscount(discount, newCustomerMode);
  const slots = availability ? slotMap(availability.slots) : new Map();

  const refreshAvailability = useCallback(async () => {
    const data = await fetchReservationAvailability();
    setAvailability(data);
  }, []);

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
    void refreshAvailability();
  }, [refreshAvailability]);

  const toggleSlot = (day: number, slot: number) => {
    const key = slotKey(day, slot);
    const info = slots.get(key);
    if (info?.status === "booked") {
      toast.error("予約済みの枠にはエコ割引を設定できません");
      return;
    }
    const next = new Set(ecoSlots);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setEcoSlots(next);
    setPreviewSlot(key);
  };

  const handleSave = () => {
    saveEcoSlots(ecoSlots);
    saveDiscount(discount);
    saveNewCustomerMode(newCustomerMode);
    toast.success("エコ枠を保存しました");
  };

  const openBooking = () => {
    saveEcoSlots(ecoSlots);
    saveDiscount(discount);
    saveNewCustomerMode(newCustomerMode);
  };

  const applyNewCustomerPreset = () => {
    const availKeys = availability?.slots.filter((s) => s.bookable).map((s) => s.key) ?? [];
    const preset = [...suggestNewCustomerSlots()].filter((k) => availKeys.length === 0 || availKeys.includes(k));
    setEcoSlots(new Set(preset));
    setNewCustomerMode(true);
    setPreviewSlot(preset[0] ?? null);
    toast.success("空き枠ベースの平日新規客プリセットを適用しました");
  };

  const handleAiOptimize = async () => {
    setOptimizing(true);
    try {
      if (backendOnline) {
        await optimizeDailyPrices();
        const { slots: aiSlots } = await fetchEcoSlots(displayDiscount, true);
        const availKeys = new Set(availability?.slots.filter((s) => s.bookable).map((s) => s.key) ?? []);
        const next = new Set(aiSlots.map((s) => s.key).filter((k) => availKeys.size === 0 || availKeys.has(k)));
        if (next.size > 0) {
          setEcoSlots(next);
          saveEcoSlots(next);
          setPreviewSlot([...next][0]);
        }
        toast.success("AI最適化完了（空き枠のみエコ設定）");
      } else {
        applyNewCustomerPreset();
        toast.info("オフラインモード", { description: "ローカルプリセットを適用しました" });
      }
    } catch {
      toast.error("最適化に失敗しました");
    } finally {
      setOptimizing(false);
    }
  };

  const ecoOnAvailable = [...ecoSlots].filter((k) => slots.get(k)?.bookable).length;
  const previewDay = previewSlot ? parseInt(previewSlot.split("-")[0]) : null;
  const previewTimeIdx = previewSlot ? parseInt(previewSlot.split("-")[1]) : null;
  const previewBookable = previewSlot ? slots.get(previewSlot)?.bookable : false;

  return (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="section-title">平日ダイナミックプライシング</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              <strong className="text-foreground">{availability?.system_name ?? "店舗予約システム"}</strong>
              と連携。緑=空き枠のみエコ割引を設定でき、予約ページからそのまま入庫予約できます。
              {availability && `（空き${availability.available_count} / 予約済${availability.booked_count}）`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold">基本割引</label>
            <input
              type="number"
              min={5}
              max={40}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-20 border border-border rounded-lg px-3 py-2 text-base bg-background"
            />
            <span className="text-sm">%</span>
          </div>
        </div>

        <label className="mt-4 flex items-center gap-3 cursor-pointer panel p-4 border-accent/30">
          <input
            type="checkbox"
            checked={newCustomerMode}
            onChange={(e) => setNewCustomerMode(e.target.checked)}
            className="size-5 accent-[var(--accent)]"
          />
          <div>
            <div className="font-bold">新規客獲得モード（平日強化）</div>
            <div className="text-sm text-muted-foreground">
              表示割引 {displayDiscount}% · 空き枠のみ対象
            </div>
          </div>
        </label>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <Stat label="空き枠へのECO設定" value={`${ecoOnAvailable}枠`} accent />
          <Stat label="連携状態" value={backendOnline ? "オンライン" : "オフライン"} />
          <Stat label="新規来店見込" value={`+${Math.round(ecoOnAvailable * 1.5)}件/週`} accent />
        </div>

        <div className="mt-8 panel p-6 overflow-x-auto">
          <ReservationLegend />
          <p className="text-sm text-muted-foreground mb-4">
            空き枠（緑）をクリックでエコ ON/OFF。赤=予約済み（既存システム）のため変更不可。
          </p>
          <ReservationCalendar
            slots={slots}
            ecoSlots={ecoSlots}
            discount={displayDiscount}
            picked={previewSlot}
            onPick={setPreviewSlot}
            mode="admin"
            onToggleEco={toggleSlot}
          />
        </div>

        {previewSlot && previewDay != null && previewTimeIdx != null && (
          <div className="mt-6 panel p-5 flex flex-wrap items-center justify-between gap-4 border-accent/40">
            <div>
              <div className="text-xs text-muted-foreground font-bold">選択中の枠</div>
              <div className="text-lg font-bold mt-1">
                {weekdays[previewDay]}曜 {timeSlots[previewTimeIdx]}
                {ecoSlots.has(previewSlot) && previewBookable && (
                  <span className="ml-2 chip" style={{ color: "var(--accent)" }}>
                    ECO {displayDiscount}% OFF
                  </span>
                )}
              </div>
              {!previewBookable && (
                <p className="text-sm text-destructive mt-2">予約済み — 別の空き枠を選んでください</p>
              )}
            </div>
            {previewBookable && (
              <Link
                to="/booking"
                search={{ slot: previewSlot, discount: displayDiscount, newCustomer: newCustomerMode ? 1 : 0 }}
                onClick={openBooking}
                className="btn-primary px-8 py-3"
              >
                この空き枠で予約ページ →
              </Link>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={handleSave} className="btn-primary">
            設定を保存
          </button>
          <button type="button" onClick={() => void refreshAvailability()} className="px-6 py-3 rounded-lg font-bold border border-border hover:bg-muted text-base">
            空き状況を更新
          </button>
          <button type="button" onClick={applyNewCustomerPreset} className="px-6 py-3 rounded-lg font-bold border border-accent/50 text-accent hover:bg-accent/10 text-base">
            空き枠×新規客プリセット
          </button>
          <button type="button" onClick={handleAiOptimize} disabled={optimizing} className="px-6 py-3 rounded-lg font-bold border border-border hover:bg-muted disabled:opacity-50 text-base">
            {optimizing ? "最適化中…" : "AIアイドルタイム最適化"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="panel p-4">
      <div className="text-xs font-bold text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-black text-mono" style={accent ? { color: "var(--accent)" } : undefined}>
        {value}
      </div>
    </div>
  );
}
