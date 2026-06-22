import { useState } from "react";
import { toast } from "sonner";
import type { Customer } from "@/lib/mock-data";
import {
  getOfficialLineAccount,
  getLineLink,
  linkCustomerLine,
  unlinkCustomerLine,
} from "@/lib/line-link";
import { STORE } from "@/lib/store-config";
import { linkLineCustomer, checkBackendHealth } from "@/api/backend";
import { useEffect } from "react";

type Props = {
  customer: Customer;
  canManage: boolean;
  onUpdated?: () => void;
};

export function LineLinkPanel({ customer, canManage, onUpdated }: Props) {
  const official = getOfficialLineAccount();
  const existing = getLineLink(customer.id);
  const linked = existing ?? (customer.lineId ? {
    customerId: customer.id,
    lineUserId: customer.lineId,
    lineDisplayName: customer.lineDisplayName ?? customer.name,
    linkedAt: customer.lineLinkedAt ?? "",
  } : null);
  const [busy, setBusy] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    checkBackendHealth().then(setBackendOnline);
  }, []);

  const handleLink = async () => {
    if (!canManage) return;
    setBusy(true);
    try {
      const record = linkCustomerLine(customer.id, customer.name);
      if (backendOnline) {
        await linkLineCustomer({
          customer_id: customer.id,
          line_user_id: record.lineUserId,
          line_display_name: record.lineDisplayName,
        });
      }
      toast.success(`${customer.name}様を公式LINEと連携しました`);
      onUpdated?.();
    } catch {
      toast.error("LINE連携に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!canManage) return;
    setBusy(true);
    try {
      unlinkCustomerLine(customer.id);
      toast.success("LINE連携を解除しました");
      onUpdated?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel p-6 space-y-4 border-[#06c755]/30">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-lg grid place-items-center bg-[#06c755] text-white font-black text-lg">
          L
        </div>
        <div>
          <h2 className="section-title">公式LINE連携</h2>
          <p className="text-sm text-muted-foreground">{official.shopName} · {official.accountId}</p>
        </div>
      </div>

      {linked ? (
        <div className="rounded-lg bg-[#06c755]/10 border border-[#06c755]/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-[#06c755] font-bold">
            <span>✓ 連携済み</span>
            {backendOnline && <span className="text-xs font-normal text-muted-foreground">API同期OK</span>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">表示名</dt>
            <dd>{linked.lineDisplayName}</dd>
            <dt className="text-muted-foreground">User ID</dt>
            <dd className="font-mono text-xs break-all">{linked.lineUserId}</dd>
          </dl>
          <p className="text-xs text-muted-foreground">
            自動送信は公式LINE Messaging API経由で配信されます（未設定時はDRY-RUN）。
          </p>
          {canManage && (
            <button
              type="button"
              onClick={handleUnlink}
              disabled={busy}
              className="text-sm text-muted-foreground hover:text-destructive underline"
            >
              連携を解除
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            顧客が公式LINEを友だち追加後、{STORE.productName}で紐付けると
            <strong className="text-foreground"> 自動分析メッセージをLINEでスムーズに送信 </strong>
            できます。
          </p>
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>お客様に公式LINE（{official.accountId}）を友だち追加してもらう</li>
            <li>下のボタンでCRM顧客とLINE User IDを紐付け</li>
            <li>マーケホーム「気象×連絡」から自動送信</li>
          </ol>
          <a
            href={official.addFriendUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex btn-line px-4 py-2 text-sm"
          >
            公式LINE友だち追加ページを開く
          </a>
          {canManage ? (
            <button
              type="button"
              onClick={handleLink}
              disabled={busy}
              className="block w-full btn-line py-3 disabled:opacity-50"
            >
              {busy ? "連携中…" : "この顧客を公式LINEと紐付け"}
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">連携操作にはスタッフ以上の権限が必要です</p>
          )}
        </div>
      )}
    </div>
  );
}
