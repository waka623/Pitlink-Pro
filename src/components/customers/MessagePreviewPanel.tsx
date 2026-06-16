import { useEffect, useState } from "react";
import type { Customer, RiskResult } from "@/lib/mock-data";
import type { GeneratedMessage, MessageChannel } from "@/lib/message-generator";
import { RISK_LABELS } from "@/lib/customer-utils";
import { isLineLinked } from "@/lib/line-link";

type Props = {
  customer: Customer;
  risk: RiskResult;
  recommendedChannel: MessageChannel;
  channel: MessageChannel;
  onChannelChange: (c: MessageChannel) => void;
  onSend: (channel: MessageChannel) => Promise<GeneratedMessage>;
  canSend: boolean;
};

export function MessageComposePanel({
  customer,
  risk,
  recommendedChannel,
  channel,
  onChannelChange,
  onSend,
  canSend,
}: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<GeneratedMessage | null>(null);

  useEffect(() => {
    setSent(null);
  }, [customer.id]);

  const handleSend = async () => {
    setSending(true);
    try {
      const msg = await onSend(channel);
      setSent(msg);
    } finally {
      setSending(false);
    }
  };

  const displayText = sent
    ? channel === "email"
      ? sent.email.body
      : sent.line.body
    : null;
  const displaySubject = sent && channel === "email" ? sent.email.subject : null;

  return (
    <div className="panel p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="section-title">{customer.name} 様への連絡</h3>
          <p className="text-sm text-muted-foreground mt-1">
            推奨：
            <span className="font-bold text-accent">
              {recommendedChannel === "line" ? "公式LINE" : "メール"}
            </span>
          </p>
        </div>
        <span
          className="chip"
          style={{ color: RISK_LABELS[risk.level].color, borderColor: RISK_LABELS[risk.level].color }}
        >
          リスク {RISK_LABELS[risk.level].label}
        </span>
      </div>

      <div className="flex gap-2">
        <ChannelButton active={channel === "email"} onClick={() => onChannelChange("email")} label="メール" />
        <ChannelButton
          active={channel === "line"}
          onClick={() => onChannelChange("line")}
          label="公式LINE"
          disabled={!isLineLinked(customer.id, customer.lineId)}
          line
        />
        {!isLineLinked(customer.id, customer.lineId) && (
          <span className="text-xs text-muted-foreground self-center">LINE未連携</span>
        )}
      </div>

      {!sent ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-background/40 px-6 py-12 text-center">
          <p className="text-base text-muted-foreground leading-relaxed">
            「送信する」を押すと、
            <br />
            気象・タイヤ状態・来店履歴に合わせた文面を
            <strong className="text-foreground"> 自動生成して送信 </strong>
            します。
          </p>
          {canSend ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className={`mt-6 min-w-[200px] disabled:opacity-50 ${channel === "line" ? "btn-line" : "btn-primary"}`}
            >
              {sending ? "生成・送信中…" : "送信する（文面自動生成）"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">送信にはスタッフ以上の権限が必要です</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-safe/10 border border-safe/30 px-4 py-3 text-base font-bold text-safe">
            ✓ 送信完了 — 以下の文面を{channel === "line" ? "公式LINE" : "メール"}で送りました
          </div>

          {sent.rationale.length > 0 && (
            <div className="text-sm bg-muted/40 rounded-lg p-4 space-y-1">
              <div className="font-bold text-muted-foreground">生成理由</div>
              {sent.rationale.map((r) => (
                <div key={r}>· {r}</div>
              ))}
            </div>
          )}

          {displaySubject && (
            <div className="text-base">
              <span className="text-muted-foreground font-bold">件名：</span>
              <span>{displaySubject}</span>
            </div>
          )}

          <textarea
            className="w-full min-h-[280px] p-4 text-base leading-relaxed border border-border rounded-lg bg-background font-sans"
            value={displayText ?? ""}
            readOnly
          />

          <button
            type="button"
            onClick={() => setSent(null)}
            className="text-sm text-primary hover:underline"
          >
            別のチャネルで再送信
          </button>
        </div>
      )}
    </div>
  );
}

function ChannelButton({
  active,
  onClick,
  label,
  disabled,
  line,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  line?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40 ${
        active
          ? line
            ? "bg-[#06c755] text-white"
            : "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

export function DispatchProgress({
  items,
}: {
  items: Array<{ name: string; status: "pending" | "ok" | "fail"; channel: string }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="panel overflow-hidden text-sm">
      <div className="bg-muted px-4 py-3 font-bold text-base">個別送信キュー</div>
      <ul className="divide-y divide-border max-h-48 overflow-y-auto">
        {items.map((item) => (
          <li key={item.name} className="px-4 py-3 flex justify-between">
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">
              {item.channel} · {item.status === "pending" ? "待機" : item.status === "ok" ? "完了" : "失敗"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
