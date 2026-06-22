import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeatherEmailPanel } from "@/components/dashboard/WeatherEmailPanel";
import { PricingModule } from "@/components/dashboard/PricingModule";
import { PosSyncPanel } from "@/components/dashboard/PosSyncPanel";
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

function Dashboard() {
  const { role } = useRole();
  const { tab, customer: customerId } = Route.useSearch();
  const showPricing = !role || can.managePricing(role);
  const showPos = !role || can.syncPOS(role);

  const defaultTab =
    tab === "pricing" && showPricing
      ? "pricing"
      : tab === "pos" && showPos
        ? "pos"
        : "contact";

  const [activeTab, setActiveTab] = useState(defaultTab);
  const preselectedCustomer = useCustomerById(customerId ?? null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <AppShell
      title="マーケホーム"
      subtitle="気象連動キャンペーン · 集客価格 · 予約導線"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 p-1 bg-muted/50">
          <TabsTrigger value="contact" className="text-sm px-4 py-2">
            気象 × 連絡
          </TabsTrigger>
          {showPricing && (
            <TabsTrigger value="pricing" className="text-sm px-4 py-2">
              ダイナミックプライシング
            </TabsTrigger>
          )}
          {showPos && (
            <TabsTrigger value="pos" className="text-sm px-4 py-2">
              POS同期
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="contact">
          <WeatherEmailPanel preselectedCustomer={preselectedCustomer} />
        </TabsContent>

        {showPricing && (
          <TabsContent value="pricing">
            <PricingModule />
          </TabsContent>
        )}

        {showPos && (
          <TabsContent value="pos">
            <PosSyncPanel />
          </TabsContent>
        )}
      </Tabs>
    </AppShell>
  );
}
