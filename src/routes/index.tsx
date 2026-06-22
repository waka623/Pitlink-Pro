import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRole, ROLE_LABELS, type Role } from "@/lib/role";
import { STORE } from "@/lib/store-config";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${STORE.shopName} ${STORE.productName} — ログイン` },
      { name: "description", content: `${STORE.shopName}専用の${STORE.tagline}。権限を選んでログイン。` },
    ],
  }),
  component: Login,
});

const ROLE_BADGE_CLASS: Record<Role, string> = {
  owner:
    "bg-[color-mix(in_oklab,var(--signal)_18%,transparent)] text-[var(--signal)] border border-[var(--signal)]",
  staff:
    "bg-[color-mix(in_oklab,var(--accent)_18%,transparent)] text-[var(--accent)] border border-[var(--accent)]",
  parttime:
    "bg-[color-mix(in_oklab,var(--muted-foreground)_18%,transparent)] text-[var(--muted-foreground)] border border-[var(--muted-foreground)]",
};

const ROLE_DESC: Record<Role, { tag: string; perms: string[]; badge: string }> = {
  owner: {
    tag: "全権限",
    badge: "店長",
    perms: ["マーケAI設計", "キャンペーン承認", "集客プロモ", "効果測定"],
  },
  staff: {
    tag: "現場担当",
    badge: "現場",
    perms: ["キャンペーン配信", "ターゲット確認", "予約導線共有"],
  },
  parttime: {
    tag: "制限付き",
    badge: "バイト",
    perms: ["効果閲覧のみ", "配信不可", "プロモ設定不可"],
  },
};

function Login() {
  const { setRole } = useRole();
  const nav = useNavigate();

  const enter = (r: Role) => {
    setRole(r);
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/70 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo />
          <div className="leading-tight">
            <div className="text-mono text-[11px] tracking-[0.25em] text-muted-foreground">{STORE.productName.toUpperCase()}</div>
            <div className="text-sm font-bold">{STORE.shopName}</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-mono text-[11px] text-muted-foreground">
          <span><span className="text-safe">●</span> システム正常</span>
          <span>{STORE.shortName} / v{STORE.version}</span>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-[1.1fr_1fr]">
        {/* Left brand panel */}
        <section className="relative px-10 py-16 lg:px-20 lg:py-24 border-r border-border/60 overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(60%_50%_at_80%_20%,color-mix(in_oklab,var(--signal)_35%,transparent),transparent),radial-gradient(50%_50%_at_10%_90%,color-mix(in_oklab,var(--accent)_25%,transparent),transparent)]"
          />
          <div className="relative max-w-xl">
            <div className="chip border-[color-mix(in_oklab,var(--signal)_60%,transparent)] text-[var(--signal)]">
              集客 · 売上改善 Specialist
            </div>
            <h1 className="mt-6 text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
              汎用ツールでは、<br/>勝てない。<br/>
              <span className="text-[var(--signal)]">マーケ特化AI。</span>
            </h1>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed">
              {STORE.shopName}専用。CRMもPOSも「便利」だけでは既存ツールに負けます。
              本システムは<strong className="text-foreground">集客・売上改善・マーケティングだけ</strong>
              に特化。福井の天候、顧客セグメント、予約枠から、来店と客単価を伸ばす施策だけを設計します。
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
              <Stat k="新規集客" v="設計" sub="初回来店キャンペーン" />
              <Stat k="売上UP" v="提案" sub="安全メンテ×客単価" />
              <Stat k="ROI" v="可視化" sub="配信→予約→来店" />
            </dl>
            <div className="mt-8 text-sm text-muted-foreground space-y-1 border-t border-border/60 pt-6">
              <p>{STORE.fullAddress}</p>
              <p>
                TEL{" "}
                <a href={`tel:${STORE.telLink}`} className="text-foreground hover:text-primary">
                  {STORE.tel}
                </a>
                {" · "}
                営業 {STORE.businessHoursDisplay}
              </p>
            </div>
          </div>
        </section>

        {/* Right login */}
        <section className="px-8 py-12 lg:px-16 lg:py-20 flex flex-col justify-center">
          <div className="text-mono text-[11px] tracking-[0.25em] text-muted-foreground">ステップ01 · 権限選択</div>
          <h2 className="mt-2 text-2xl font-bold">権限を選択してログイン</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            役割によって閲覧可能な顧客情報と操作が厳格に分離されます。
          </p>

          <div className="mt-8 space-y-3">
            {(Object.keys(ROLE_LABELS) as Role[]).map((r) => {
              const d = ROLE_DESC[r];
              return (
                <button
                  key={r}
                  onClick={() => enter(r)}
                  className="w-full text-left panel p-5 hover:border-primary/70 transition group flex items-start gap-4"
                >
                  <div
                    className={`size-10 rounded-md grid place-items-center font-bold text-mono text-xs ${ROLE_BADGE_CLASS[r]}`}
                  >
                    {d.badge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{ROLE_LABELS[r]}</span>
                      <span className="text-mono text-[10px] tracking-widest text-muted-foreground">{d.tag}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.perms.join(" / ")}
                    </div>
                  </div>
                  <div className="text-muted-foreground group-hover:text-primary transition text-mono text-sm">→</div>
                </button>
              );
            })}
          </div>

          <p className="mt-8 text-[11px] text-mono text-muted-foreground/80">
            * 本画面は権限分離のデモです。本番環境では Supabase 認証と RLS によりサーバー側で権限を強制します。
          </p>
        </section>
      </main>
    </div>
  );
}

function Logo() {
  return (
    <div className="size-9 rounded-md relative grid place-items-center bg-[linear-gradient(135deg,var(--signal),color-mix(in_oklab,var(--signal)_40%,black))]">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="black" strokeWidth="2.5">
        <circle cx="12" cy="12" r="9"/>
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
      </svg>
    </div>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub: string }) {
  return (
    <div className="bg-panel p-4">
      <div className="text-[10px] text-mono tracking-widest text-muted-foreground">{k}</div>
      <div className="mt-1 text-2xl font-black text-mono">{v}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
