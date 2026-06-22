import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  getWeatherData,
  pollWeatherData,
  WEATHER_POLL_INTERVAL_MS,
  type WeatherData,
} from "@/api/weather";
import { dispatchIndividualMessages } from "@/api/backend";
import { calcCustomerRisk, type Customer } from "@/lib/mock-data";
import {
  generatePersonalizedMessage,
  shouldAutoDispatch,
  type MessageChannel,
  type GeneratedMessage,
} from "@/lib/message-generator";
import { MessageComposePanel, DispatchProgress } from "@/components/customers/MessagePreviewPanel";
import { WeatherPanel } from "@/components/weather/WeatherPanel";
import { useRole, can } from "@/lib/role";
import { useCustomers } from "@/hooks/use-customers";
import { resolveLineUserId } from "@/lib/line-link";

type Props = {
  preselectedCustomer?: Customer | null;
};

export function WeatherEmailPanel({ preselectedCustomer = null }: Props) {
  const { role } = useRole();
  const customers = useCustomers();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const weatherRef = useRef<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preselectedCustomer);
  const [channel, setChannel] = useState<MessageChannel>("email");
  const [sending, setSending] = useState(false);
  const [dispatchQueue, setDispatchQueue] = useState<
    Array<{ name: string; status: "pending" | "ok" | "fail"; channel: string }>
  >([]);

  useEffect(() => {
    weatherRef.current = weather;
  }, [weather]);

  useEffect(() => {
    let active = true;

    const refresh = async (initial: boolean) => {
      if (initial) {
        const data = await getWeatherData();
        if (active) {
          setWeather(data);
          setLoadingWeather(false);
        }
        return;
      }
      const { data, changed } = await pollWeatherData(weatherRef.current);
      if (active && changed && data) setWeather(data);
    };

    void refresh(true);
    const timer = window.setInterval(() => void refresh(false), WEATHER_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (preselectedCustomer) setSelectedCustomer(preselectedCustomer);
  }, [preselectedCustomer?.id]);

  const autoTargets = useMemo(
    () => customers.filter((c) => shouldAutoDispatch(c, weather)),
    [customers, weather],
  );

  const selectedRisk = selectedCustomer ? calcCustomerRisk(selectedCustomer) : null;
  const recommendedChannel = selectedCustomer
    ? generatePersonalizedMessage(selectedCustomer, weather).recommendedChannel
    : "email";

  useEffect(() => {
    if (selectedCustomer) {
      setChannel(generatePersonalizedMessage(selectedCustomer, weather).recommendedChannel);
    }
  }, [selectedCustomer?.id, weather]);

  const canSend = role && can.sendLINE(role);

  const dispatchOne = async (c: Customer, ch: MessageChannel): Promise<GeneratedMessage> => {
    const msg = generatePersonalizedMessage(c, weather);
    await dispatchIndividualMessages({
      messages: [
        {
          customer_id: c.id,
          customer_name: c.name,
          channel: ch,
          email: c.email,
          line_id: resolveLineUserId(c.id, c.lineId),
          subject: msg.email.subject,
          email_body: msg.email.body,
          line_body: msg.line.body,
        },
      ],
    });
    return msg;
  };

  const handleAutoDispatch = async () => {
    if (!canSend || autoTargets.length === 0) return;
    setSending(true);
    const queue = autoTargets.map((c) => ({
      name: c.name,
      status: "pending" as const,
      channel: "",
    }));
    setDispatchQueue(queue);

    let ok = 0;
    for (let i = 0; i < autoTargets.length; i++) {
      const c = autoTargets[i];
      const ch = generatePersonalizedMessage(c, weather).recommendedChannel;
      try {
        await dispatchOne(c, ch);
        ok++;
        setDispatchQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "ok", channel: ch === "line" ? "LINE" : "メール" } : item,
          ),
        );
      } catch {
        setDispatchQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "fail", channel: ch === "line" ? "LINE" : "メール" } : item,
          ),
        );
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    toast.success(`${ok}/${autoTargets.length}件 — 個別文面を送信しました`);
    setSending(false);
  };

  return (
    <div className="space-y-6">
      <WeatherPanel weather={weather} loading={loadingWeather} />

      {dispatchQueue.length > 0 && <DispatchProgress items={dispatchQueue} />}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="panel p-6 border-danger/20">
          <h2 className="section-title text-danger">配信対象（{autoTargets.length}件）</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            マーケセグメントから自動抽出。1件ずつパーソナライズ配信します。
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {autoTargets.map((c) => {
              const msg = generatePersonalizedMessage(c, weather);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCustomer(c)}
                  className={`w-full text-left p-4 rounded-lg border transition ${
                    selectedCustomer?.id === c.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <div className="font-bold text-base">{c.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {c.car} · {msg.recommendedChannel === "line" ? "LINE推奨" : "メール推奨"}
                    {msg.urgency !== "low" && (
                      <span className="ml-1 text-accent">安全案内</span>
                    )}
                  </div>
                </button>
              );
            })}
            {autoTargets.length === 0 && (
              <p className="text-base text-muted-foreground text-center py-6">対象顧客はいません</p>
            )}
          </div>
          {canSend && autoTargets.length > 0 && (
            <button
              type="button"
              onClick={handleAutoDispatch}
              disabled={sending}
              className="mt-4 w-full btn-line py-4 disabled:opacity-50"
            >
              {sending ? "個別送信中…" : `一括個別送信（${autoTargets.length}件）`}
            </button>
          )}
        </div>

        {selectedCustomer && selectedRisk ? (
          <MessageComposePanel
            customer={selectedCustomer}
            risk={selectedRisk}
            recommendedChannel={recommendedChannel}
            channel={channel}
            onChannelChange={setChannel}
            onSend={async (ch) => {
              const msg = await dispatchOne(selectedCustomer, ch);
              toast.success(`${selectedCustomer.name}様へ送信しました`);
              return msg;
            }}
            canSend={!!canSend}
          />
        ) : (
          <div className="panel h-64 grid place-items-center text-muted-foreground text-base">
            左から顧客を選び、「送信する」で文面を生成してください
          </div>
        )}
      </div>
    </div>
  );
}
