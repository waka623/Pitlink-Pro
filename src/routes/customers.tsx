import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { calcCustomerRisk } from "@/lib/mock-data";
import {
  displayCustomerField,
  maskName,
  maskPhone,
  maskEmail,
  RISK_LABELS,
  RISK_TEXT_CLASS,
  customerSummary,
  formatVehicleAge,
} from "@/lib/customer-utils";
import { analyzeVehicle } from "@/lib/customer-analysis";
import { AppShell } from "@/components/layout/AppShell";
import { LineLinkPanel } from "@/components/customers/LineLinkPanel";
import { useCustomers, useLineLinkRefresh } from "@/hooks/use-customers";
import { useRole, can } from "@/lib/role";
import { isLineLinked } from "@/lib/line-link";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "顧客管理 — PitLink Pro" },
      { name: "description", content: "顧客CRM・タイヤリスク管理" },
    ],
  }),
  component: CustomersPage,
});

type RiskFilter = "all" | "danger" | "warn" | "safe";

function CustomersPage() {
  const { role } = useRole();
  const customers = useCustomers();
  const refreshLinks = useLineLinkRefresh();
  const canViewPII = !role || can.viewCustomerPII(role);
  const canManageLine = !role || can.sendLINE(role);

  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(customers[0]?.id ?? null);

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const risk = calcCustomerRisk(c);
      if (riskFilter !== "all" && risk.level !== riskFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.car.toLowerCase().includes(q) ||
        c.plate.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [customers, search, riskFilter]);

  const selected = customers.find((c) => c.id === selectedId) ?? null;
  const selectedRisk = selected ? calcCustomerRisk(selected) : null;
  const vehicleAnalysis = selected ? analyzeVehicle(selected) : null;

  return (
    <AppShell
      title="顧客管理"
      subtitle="顧客情報 · 車体分析 · 公式LINE連携（連絡送信は管理ホームから）"
    >
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="panel overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap gap-3">
            <input
              type="search"
              placeholder="名前・車種・ナンバーで検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[220px] border border-border rounded-lg px-4 py-2.5 text-base bg-background"
            />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
              className="border border-border rounded-lg px-4 py-2.5 text-base bg-background"
            >
              <option value="all">すべてのリスク</option>
              <option value="danger">危険のみ</option>
              <option value="warn">注意のみ</option>
              <option value="safe">安全のみ</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-base">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left p-4 font-bold">顧客</th>
                  <th className="text-left p-4 font-bold">車両</th>
                  <th className="text-left p-4 font-bold">リスク</th>
                  <th className="text-left p-4 font-bold">LINE</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const risk = calcCustomerRisk(c);
                  const isSelected = selectedId === c.id;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`border-t border-border cursor-pointer transition ${
                        isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="p-4">
                        <div className="font-bold">
                          {displayCustomerField(c.name, canViewPII, maskName)}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{c.id}</div>
                      </td>
                      <td className="p-4">
                        <div>{c.car}</div>
                        <div className="text-xs text-muted-foreground">{formatVehicleAge(c)}</div>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${RISK_TEXT_CLASS[risk.level]}`}>
                          {RISK_LABELS[risk.level].label}
                        </span>
                        <span className="text-muted-foreground ml-2">({risk.score})</span>
                      </td>
                      <td className="p-4 text-sm">
                        {isLineLinked(c.id, c.lineId) ? (
                          <span className="text-[#06c755] font-bold">連携済</span>
                        ) : (
                          <span className="text-muted-foreground">未連携</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {selected && selectedRisk && vehicleAnalysis ? (
            <>
              <div className="panel p-6 space-y-4">
                <h2 className="section-title">顧客詳細</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-base">
                  <dt className="text-muted-foreground">氏名</dt>
                  <dd className="font-medium">{displayCustomerField(selected.name, canViewPII, maskName)}</dd>
                  <dt className="text-muted-foreground">電話</dt>
                  <dd>{displayCustomerField(selected.phone, canViewPII, maskPhone)}</dd>
                  <dt className="text-muted-foreground">メール</dt>
                  <dd>{displayCustomerField(selected.email, canViewPII, maskEmail)}</dd>
                  <dt className="text-muted-foreground">車両</dt>
                  <dd>{selected.car}</dd>
                  <dt className="text-muted-foreground">年式</dt>
                  <dd>{formatVehicleAge(selected)}</dd>
                  <dt className="text-muted-foreground">走行</dt>
                  <dd>
                    {selected.mileageKm != null
                      ? `約${selected.mileageKm.toLocaleString()}km`
                      : "—"}
                  </dd>
                  <dt className="text-muted-foreground">タイヤ</dt>
                  <dd>
                    {selected.tire.brand}
                    <br />
                    溝 {selected.tire.grooveMm}mm · 硬度 {selected.tire.hardness} · {selected.tire.manufactureYear}年製
                  </dd>
                </dl>
                <p className="text-sm text-muted-foreground pt-2 border-t border-border">
                  {customerSummary(selected, selectedRisk)}
                </p>
              </div>

              <div className="panel p-6 space-y-3">
                <h2 className="section-title">AI車体分析</h2>
                <ul className="text-sm space-y-2">
                  {vehicleAnalysis.insights.map((i) => (
                    <li key={i} className="text-muted-foreground">· {i}</li>
                  ))}
                  {selectedRisk.reasons.map((r) => (
                    <li key={r} className={RISK_TEXT_CLASS[selectedRisk.level]}>
                      · {r}
                    </li>
                  ))}
                </ul>
              </div>

              <LineLinkPanel customer={selected} canManage={!!canManageLine} onUpdated={refreshLinks} />

              <Link
                to="/dashboard"
                search={{ tab: "contact", customer: selected.id }}
                className="block w-full text-center btn-primary py-4 text-base"
              >
                この顧客に連絡する →
              </Link>
            </>
          ) : (
            <div className="panel h-64 grid place-items-center text-muted-foreground text-base">
              一覧から顧客を選択してください
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
