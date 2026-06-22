import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useRole, ROLE_LABELS, ROLE_BADGE } from "@/lib/role";
import { STORE } from "@/lib/store-config";

const NAV = [
  { to: "/dashboard", label: "マーケホーム", desc: "気象×キャンペーン" },
  { to: "/customers", label: "顧客管理", desc: "セグメント・配信" },
  { to: "/booking", label: "予約ページ", desc: "お客様向け" },
] as const;

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: Props) {
  const { role } = useRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-panel">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-lg grid place-items-center font-black text-sm"
              style={{ background: "var(--signal)", color: "black" }}
            >
              文
            </div>
            <div>
              <div className="font-bold text-base leading-tight">{STORE.shortName} {STORE.productName}</div>
              <div className="text-xs text-muted-foreground">{STORE.shopName}</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block rounded-lg px-4 py-3 transition ${
                  active
                    ? "bg-primary/15 border border-primary/40 text-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="font-bold text-sm">{item.label}</div>
                <div className="text-xs mt-0.5 opacity-80">{item.desc}</div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-border hidden lg:block">
          {role && (
            <p className="text-xs text-muted-foreground mb-2">
              {ROLE_BADGE[role]} · {ROLE_LABELS[role]}
            </p>
          )}
          <Link to="/" className="text-sm text-primary hover:underline">
            ← ログイン画面
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border bg-panel/80 backdrop-blur px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </header>
        <main className="flex-1 p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
