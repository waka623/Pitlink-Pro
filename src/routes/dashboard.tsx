import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherEmailPanel } from "@/components/dashboard/WeatherEmailPanel";
import { PricingModule } from "@/components/dashboard/PricingModule";
import { MarketingAgentPanel } from "@/components/marketing/MarketingAgentPanel";
import { MarketingAnalyticsPanel } from "@/components/marketing/MarketingAnalyticsPanel";
import { AppShell } from "@/components/layout/AppShell";
import { useRole, can } from "@/lib/role";
import { useCustomerById } from "@/hooks/use-customers";
import { useEffect, useState } from "react";

type DashboardSearch = {
  tab?: string;
  customer?: string;
};

export const Route = createFileRoute("/dashboard")({
  validateSearch: (search: Record<string, unknown>): DashboardSearch => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
    customer: typeof search.customer === "string" ? search.customer : undefined,
  }),
  component: Dashboard,
});

function normalizeTab(tab: string | undefined, showPromo: boolean): string {
  if (tab === "contact") return "campaign";
  if (tab === "pricing") return "promo";
  if (tab === "agent" || tab === "campaign" || tab === "roi") return tab;
  if (tab === "promo" && showPromo) return "promo";
  return "agent";
}

function Dashboard() {
  const { role } = useRole();
  const { tab, customer: customerId } = Route.useSearch();
  const showPromo = !role || can.managePricing(role);

  const defaultTab = normalizeTab(tab, showPromo);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const preselectedCustomer = useCustomerById(customerId ?? null);

  useEffect(() => {
    setActiveTab(normalizeTab(tab, showPromo));
  }, [tab, showPromo]);

  return (
    <AppShell
      title="マーケAIホーム"
      subtitle="集客 · 売上改善 · キャンペーン配信 — 文京店専用"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 p-1 bg-muted/50">
          <TabsTrigger value="agent" className="text-sm px-4 py-2">
            マーケAI設計
          </TabsTrigger>
          <TabsTrigger value="campaign" className="text-sm px-4 py-2">
            キャンペーン配信
          </TabsTrigger>
          {showPromo && (
            <TabsTrigger value="promo" className="text-sm px-4 py-2">
              集客プロモ
            </TabsTrigger>
          )}
          <TabsTrigger value="roi" className="text-sm px-4 py-2">
            効果測定
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agent">
          <MarketingAgentPanel />
        </TabsContent>

        <TabsContent value="campaign">
          <WeatherEmailPanel preselectedCustomer={preselectedCustomer} />
        </TabsContent>

        {showPromo && (
          <TabsContent value="promo">
            <PricingModule />
          </TabsContent>
        )}

        <TabsContent value="roi">
          <MarketingAnalyticsPanel />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
