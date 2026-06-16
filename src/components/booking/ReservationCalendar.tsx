import { Fragment } from "react";
import { timeSlots, weekdays } from "@/lib/mock-data";
import type { ReservationSlot } from "@/api/reservations";
import { slotKey } from "@/lib/eco-slots";

type Props = {
  slots: Map<string, ReservationSlot>;
  ecoSlots: Set<string>;
  discount: number;
  picked: string | null;
  onPick: (key: string) => void;
  mode?: "admin" | "customer";
  onToggleEco?: (day: number, slot: number) => void;
};

export function ReservationCalendar({
  slots,
  ecoSlots,
  discount,
  picked,
  onPick,
  mode = "customer",
  onToggleEco,
}: Props) {
  return (
    <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-1 text-mono text-sm min-w-[640px]">
      <div />
      {weekdays.map((d, i) => (
        <div
          key={d}
          className={`text-center py-2 font-bold ${i >= 5 ? "text-muted-foreground" : ""}`}
        >
          {d}
        </div>
      ))}
      {timeSlots.map((t, sIdx) => (
        <Fragment key={`row-${sIdx}`}>
          <div className="text-right pr-2 py-2 text-muted-foreground">{t}</div>
          {weekdays.map((_, d) => {
            const key = slotKey(d, sIdx);
            const info = slots.get(key);
            const isEco = ecoSlots.has(key);
            const isWeekend = d >= 5;
            const isBooked = info?.status === "booked";
            const isAvailable = info?.bookable ?? !isWeekend;
            const isPicked = picked === key;
            const canPick = isAvailable && !isWeekend;
            const isAdmin = mode === "admin";

            return (
              <button
                key={key}
                type="button"
                disabled={isWeekend || (!isAdmin && !canPick)}
                onClick={() => {
                  if (isAdmin && onToggleEco && !isWeekend && !isBooked) {
                    onToggleEco(d, sIdx);
                  } else if (canPick) {
                    onPick(key);
                  }
                }}
                className={`h-16 rounded-lg transition flex flex-col items-center justify-center text-xs gap-0.5 ${
                  isWeekend || isBooked
                    ? "cursor-not-allowed opacity-50"
                    : canPick || isAdmin
                      ? "hover:ring-2 hover:ring-primary cursor-pointer"
                      : "cursor-not-allowed"
                } ${isPicked ? "ring-2 ring-primary" : ""}`}
                style={{
                  background: isBooked
                    ? "color-mix(in oklab, var(--destructive) 25%, transparent)"
                    : isEco && isAvailable
                      ? "color-mix(in oklab, var(--accent) 55%, transparent)"
                      : isAvailable
                        ? "color-mix(in oklab, var(--safe) 20%, transparent)"
                        : "color-mix(in oklab, var(--muted) 80%, transparent)",
                  border: isBooked
                    ? "1px solid color-mix(in oklab, var(--destructive) 40%, transparent)"
                    : isEco
                      ? "2px solid var(--accent)"
                      : "1px solid var(--border)",
                }}
              >
                {isBooked && <span className="font-bold text-destructive">予約済</span>}
                {!isBooked && isEco && isAvailable && (
                  <>
                    <span className="font-black">{discount}% OFF</span>
                    <span className="opacity-80">空き·ECO</span>
                  </>
                )}
                {!isBooked && !isEco && isAvailable && <span className="text-safe font-bold">空き</span>}
                {!isBooked && !isAvailable && !isWeekend && <span>—</span>}
                {isWeekend && <span>休</span>}
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}

export function ReservationLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
      <span>
        <span className="inline-block size-3 rounded bg-safe/40 mr-1" />
        空き（予約システム連携）
      </span>
      <span>
        <span className="inline-block size-3 rounded bg-destructive/30 mr-1" />
        予約済
      </span>
      <span>
        <span className="inline-block size-3 rounded bg-accent/50 mr-1" />
        エコ枠（割引適用）
      </span>
    </div>
  );
}
