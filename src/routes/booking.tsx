import { createFileRoute, Link } from "@tanstack/react-router";
import { weekdays } from "@/lib/mock-data";
import {
  loadEcoSlots,
  loadDiscount,
  loadNewCustomerMode,
  effectiveDiscount,
} from "@/lib/eco-slots";
import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { toast } from "sonner";
import {
  bookReservationSlot,
  fetchReservationAvailability,
  slotMap,
  type AvailabilityResponse,
} from "@/api/reservations";
import { ReservationCalendar, ReservationLegend } from "@/components/booking/ReservationCalendar";
import { STORE } from "@/lib/store-config";

type BookingSearch = {
  slot?: string;
  discount?: number;
  newCustomer?: number;
  customer?: string;
};

export const Route = createFileRoute("/booking")({
  validateSearch: (search: Record<string, unknown>): BookingSearch => ({
    slot: typeof search.slot === "string" ? search.slot : undefined,
    discount: search.discount != null ? Number(search.discount) : undefined,
    newCustomer: search.newCustomer != null ? Number(search.newCustomer) : undefined,
    customer: typeof search.customer === "string" ? search.customer : undefined,
  }),
  head: () => ({ meta: [{ title: `ご予約 — ${STORE.shopName}` }] }),
  component: Booking,
});

function Booking() {
  const { slot: slotParam, discount: discountParam, newCustomer: newCustomerParam, customer: customerId } =
    Route.useSearch();
  const [ecoSlots, setEcoSlots] = useState<Set<string>>(() => loadEcoSlots());
  const [baseDiscount, setBaseDiscount] = useState(() => discountParam ?? loadDiscount());
  const [newCustomerMode, setNewCustomerMode] = useState(
    () => newCustomerParam === 1 || (newCustomerParam == null && loadNewCustomerMode()),
  );
  const [picked, setPicked] = useState<string | null>(() => slotParam ?? null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [booking, setBooking] = useState(false);

  const discount = effectiveDiscount(baseDiscount, newCustomerMode, newCustomerParam === 1);
  const slots = availability ? slotMap(availability.slots) : new Map();

  const refreshAvailability = useCallback(async () => {
    const data = await fetchReservationAvailability();
    setAvailability(data);
  }, []);

  useEffect(() => {
    void refreshAvailability();
    const timer = window.setInterval(() => void refreshAvailability(), 60_000);
    return () => window.clearInterval(timer);
  }, [refreshAvailability]);

  useEffect(() => {
    const refresh = () => {
      setEcoSlots(loadEcoSlots());
      if (discountParam == null) setBaseDiscount(loadDiscount());
      if (newCustomerParam == null) setNewCustomerMode(loadNewCustomerMode());
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [discountParam, newCustomerParam]);

  useEffect(() => {
    if (slotParam) setPicked(slotParam);
    if (discountParam != null) setBaseDiscount(discountParam);
    if (newCustomerParam != null) setNewCustomerMode(newCustomerParam === 1);
  }, [slotParam, discountParam, newCustomerParam]);

  const pickedInfo = picked ? slots.get(picked) : null;
  const canBook = pickedInfo?.bookable ?? false;
  const isWeekdayEco = picked != null && ecoSlots.has(picked) && pickedInfo?.bookable;

  const handleBook = async () => {
    if (!picked || !pickedInfo?.bookable) {
      toast.error("この枠は予約できません");
      return;
    }
    setBooking(true);
    const result = await bookReservationSlot({
      day: pickedInfo.day,
      slot: pickedInfo.slot,
      customer_external_id: customerId,
      customer_name: "お客様",
      discount_percent: isWeekdayEco ? discount : 0,
      notes: newCustomerMode ? "新規客キャンペーン" : "",
    });
    setBooking(false);
    if (result.success) {
      toast.success(result.message ?? "予約が確定しました");
      await refreshAvailability();
    } else {
      toast.error(
        result.error === "slot_unavailable"
          ? "直前に埋まりました。別の枠をお選びください"
          : "予約に失敗しました",
      );
      await refreshAvailability();
    }
  };

  return (
    <AppShell
      title="ご予約"
      subtitle={
        availability
          ? `${availability.system_name}連携 · 空き${availability.available_count}枠 / 予約済${availability.booked_count}枠`
          : "予約システムに接続中…"
      }
    >
      <div className="space-y-6">
        {availability && (
          <div className="panel p-4 border-safe/30 bg-safe/5 text-sm">
            表示中の空き状況は<strong className="mx-1">店舗の既存予約システム</strong>
            とリアルタイム連携しています。空き枠のみ予約できます。
            {availability.external_api && " · 外部API同期ON"}
          </div>
        )}

        {newCustomerMode && (
          <div className="panel p-5 border-accent/50 bg-accent/10">
            <h2 className="font-bold text-lg">平日限定 · 初回来店キャンペーン</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              安全点検付き。空いている平日枠ならそのままご予約いただけます。
            </p>
          </div>
        )}

        <div className="panel p-6 overflow-x-auto">
          <ReservationLegend />
          <ReservationCalendar
            slots={slots}
            ecoSlots={ecoSlots}
            discount={discount}
            picked={picked}
            onPick={setPicked}
            mode="customer"
          />
        </div>

        {picked && pickedInfo && (
          <div className="panel p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-muted-foreground">選択中</div>
              <div className="mt-1 text-xl font-bold">
                {weekdays[pickedInfo.day]}曜日 {pickedInfo.time_label}
              </div>
              {!canBook && (
                <p className="mt-2 text-sm text-destructive font-bold">この枠は既に予約済みです</p>
              )}
              {isWeekdayEco && canBook && (
                <div className="mt-2 text-base">
                  オイル交換{" "}
                  <span className="line-through text-muted-foreground">¥4,400</span>
                  <span className="ml-2 font-black text-lg text-accent">
                    ¥{Math.round(4400 * (1 - discount / 100)).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              disabled={!canBook || booking}
              onClick={handleBook}
              className="btn-primary px-8 py-4 text-base disabled:opacity-50"
            >
              {booking ? "予約確定中…" : "この空き枠で予約する →"}
            </button>
          </div>
        )}

        <Link to="/dashboard" search={{ tab: "pricing" }} className="text-sm text-primary hover:underline inline-block">
          ← プライシング設定に戻る
        </Link>
      </div>
    </AppShell>
  );
}
