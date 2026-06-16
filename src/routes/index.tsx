import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRole, ROLE_LABELS, type Role } from "@/lib/role";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PitLink Pro — ログイン" },
      { name: "description", content: "タイヤプロショップ向け予約・CRMインフラ。権限を選んでログイン。" },
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
    perms: ["全顧客情報閲覧", "CSVダウンロード", "ダイナミック価格設定", "POS同期"],
  },
  staff: {
    tag: "現場担当",
    badge: "現場",
    perms: ["顧客情報閲覧", "タイヤ点検入力", "LINE警告送信", "POS同期"],
  },
  parttime: {
    tag: "制限付き",
    badge: "バイト",
    perms: ["氏名マスク表示", "点検入力のみ", "CSV不可", "価格設定不可"],
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
            <div className="text-mono text-[11px] tracking-[0.25em] text-muted-foreground">PITLINK PRO</div>
            <div className="text-sm font-bold">タイヤプロショップ予約・CRMインフラ</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-mono text-[11px] text-muted-foreground">
          <span><span className="text-safe">●</span> システム正常</span>
          <span>福井-01 / v0.9.4</span>
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
              福井専用 · BtoB
            </div>
            <h1 className="mt-6 text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
              ハガキ代と<br/>二重入力を、<br/>
              <span className="text-[var(--signal)]">撲滅する。</span>
            </h1>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed">
              福井のタイヤプロショップに特化した、現場のための予約・CRMインフラ。
              大手POSと共存しながら、雪道リスクの自動判定・LINE個別警告・平日エコ枠の
              ダイナミックプライシングまで、店長と現場の手数を最短化します。
            </p>
            <dl className="mt-10 grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
              <Stat k="平均削減" v="¥184k" sub="/月 ハガキ＋人件費" />
              <Stat k="再来店率" v="+38%" sub="LINE個別警告経由" />
              <Stat k="POS同期" v="ワンクリック" sub="本部マスタ差分のみ" />
            </dl>
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
