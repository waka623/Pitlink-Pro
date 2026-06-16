import { useState } from "react";
import { toast } from "sonner";
import { posSyncLog as initialLog } from "@/lib/mock-data";

type SyncEntry = { time: string; action: string; count: number };

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function PosSyncPanel() {
  const [log, setLog] = useState<SyncEntry[]>(initialLog);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("08:13");

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1500));
    const t = nowTime();
    const newEntries: SyncEntry[] = [
      { time: t, action: "本部マスタ取得", count: 1284 },
      { time: t, action: "新規顧客レコード差分", count: Math.floor(Math.random() * 5) + 3 },
      { time: t, action: "在庫タイヤSKU更新", count: Math.floor(Math.random() * 20) + 30 },
      { time: t, action: "予約データ書き戻し", count: Math.floor(Math.random() * 8) + 5 },
    ];
    setLog((prev) => [...newEntries, ...prev].slice(0, 12));
    setLastSync(t);
    toast.success("POS同期完了", { description: "本部マスタ差分を反映しました" });
    setSyncing(false);
  };

  return (
    <div className="panel p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="section-title">既存POSとの同期</h2>
          <p className="text-sm text-muted-foreground mt-2">
            大手POSの本部マスタと差分同期。二重入力を排除します。
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-muted-foreground">最終同期</div>
          <div className="text-2xl font-black text-mono">{lastSync}</div>
          <div className="text-sm text-safe mt-1">● 接続正常</div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="btn-primary px-8 py-4 text-base disabled:opacity-50"
      >
        {syncing ? "同期中…" : "ワンクリック POS同期"}
      </button>

      <div>
        <h3 className="font-bold text-base mb-3">同期ログ</h3>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-base">
            <thead className="bg-muted/60">
              <tr>
                <th className="text-left p-4 font-bold">時刻</th>
                <th className="text-left p-4 font-bold">アクション</th>
                <th className="text-right p-4 font-bold">件数</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry, i) => (
                <tr key={`${entry.time}-${entry.action}-${i}`} className="border-t border-border">
                  <td className="p-4 text-mono text-muted-foreground">{entry.time}</td>
                  <td className="p-4">{entry.action}</td>
                  <td className="p-4 text-right font-mono">{entry.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
