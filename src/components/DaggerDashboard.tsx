import { Fragment, useMemo, useRef, useState, useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { buildMonthlyLog, computeStats, DAGGER_VEHICLE, type YearGroup } from "@/lib/dagger-data";
import { tripRowsQueryOptions } from "@/lib/sheet.functions";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { Fuel, Gauge, DollarSign, TrendingUp, Send, Sparkles, MapPin, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export function DaggerDashboard() {
  const { data: rows } = useSuspenseQuery(tripRowsQueryOptions);
  const stats = useMemo(() => computeStats(rows), [rows]);
  const monthlyLog = useMemo(() => buildMonthlyLog(stats), [stats]);

  return (
    <div className="min-h-screen hud-grid">
      <div className="mx-auto max-w-[1600px] px-6 py-6">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/40">
              <span className="font-mono text-lg font-bold text-primary">◆</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {DAGGER_VEHICLE.name} <span className="text-muted-foreground font-normal text-base">— {DAGGER_VEHICLE.year} {DAGGER_VEHICLE.make} {DAGGER_VEHICLE.model}</span>
              </h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            SYSTEM ONLINE
          </div>
        </header>

        {/* Two column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: 2/3 dashboard */}
          <div className="lg:col-span-2 space-y-6">
            <StatGrid stats={stats} />
            <MonthlyChart data={stats.monthly} />
            <MonthlyLog groups={monthlyLog} />
          </div>

          {/* Right: 1/3 chat */}
          <div className="lg:col-span-1">
            <Chatbot />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatGrid({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const items = [
    { label: "Total Miles", value: Math.round(stats.totalMiles).toLocaleString(), sub: `${stats.firstDate} → ${stats.lastDate}`, icon: Gauge },
    { label: "Fill-ups", value: stats.totalFillUps.toString(), sub: `${stats.totalGallons.toFixed(1)} gal purchased`, icon: Fuel },
    { label: "Total Fuel Cost", value: `$${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: `$${stats.avgPricePerGallon.toFixed(2)}/gal avg`, icon: DollarSign },
    { label: "Avg MPG", value: stats.avgMPG.toFixed(1), sub: `$${stats.costPerMile.toFixed(3)}/mile`, icon: TrendingUp },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="panel p-4 relative overflow-hidden">
          <div className="absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rounded-full bg-primary/5" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <it.icon className="h-4 w-4" />
            <span className="font-mono text-[10px] uppercase tracking-widest">{it.label}</span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-primary">{it.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

function MonthlyChart({ data }: { data: ReturnType<typeof computeStats>["monthly"] }) {
  const [tab, setTab] = useState<"miles" | "cost" | "gallons">("miles");
  const config = {
    miles: { key: "miles", color: "oklch(0.78 0.17 65)", label: "Miles driven" },
    cost: { key: "cost", color: "oklch(0.72 0.15 200)", label: "Fuel cost ($)" },
    gallons: { key: "gallons", color: "oklch(0.75 0.15 140)", label: "Gallons" },
  }[tab];
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">By-Month Summary</div>
          <h2 className="text-lg font-semibold">{config.label}</h2>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-background/50 p-1 font-mono text-xs">
          {(["miles", "cost", "gallons"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-2.5 py-1 rounded transition-colors uppercase tracking-wider ${
                tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="oklch(0.30 0.02 250)" vertical={false} />
            <XAxis dataKey="label" stroke="oklch(0.65 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="oklch(0.65 0.02 250)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                background: "oklch(0.20 0.014 250)",
                border: "1px solid oklch(0.30 0.02 250)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              cursor={{ fill: "oklch(0.28 0.02 250 / 0.4)" }}
            />
            <Bar dataKey={config.key} fill={config.color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function MonthlyLog({ groups }: { groups: YearGroup[] }) {
  const cell = "py-2.5 pr-4 font-mono";
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Log</div>
          <h2 className="text-lg font-semibold">Monthly Totals</h2>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Apr 2024 &rarr; Present
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground text-left border-b border-border/60">
              <th className="pb-2 pr-4">Month</th>
              <th className="pb-2 pr-4">Miles</th>
              <th className="pb-2 pr-4">Gal</th>
              <th className="pb-2 pr-4">Fuel Cost</th>
              <th className="pb-2 pr-4">MPG</th>
              <th className="pb-2">Fill-ups</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.year}>
                <tr>
                  <td colSpan={6} className="pt-4 pb-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[11px] font-bold tracking-widest text-primary">{g.year}</span>
                      <span className="h-px flex-1 bg-border/60" />
                    </div>
                  </td>
                </tr>
                {g.months.map((r) => (
                  <tr
                    key={r.month}
                    className={`border-b border-border/30 ${r.fillUps === 0 ? "text-muted-foreground/50" : ""}`}
                  >
                    <td className={`${cell} text-xs text-muted-foreground`}>{r.label}</td>
                    <td className={cell}>{Math.round(r.miles).toLocaleString()}</td>
                    <td className={cell}>{r.gallons.toFixed(1)}</td>
                    <td className={`${cell} ${r.fillUps ? "text-primary" : ""}`}>
                      ${r.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={cell}>{r.mpg ? r.mpg.toFixed(1) : "—"}</td>
                    <td className="py-2.5 font-mono">{r.fillUps || "—"}</td>
                  </tr>
                ))}
                <tr className="border-b-2 border-border/60 bg-primary/5">
                  <td className={`${cell} text-[11px] uppercase tracking-widest text-muted-foreground`}>
                    {g.year} Total
                  </td>
                  <td className={`${cell} font-semibold`}>{Math.round(g.totals.miles).toLocaleString()}</td>
                  <td className={`${cell} font-semibold`}>{g.totals.gallons.toFixed(1)}</td>
                  <td className={`${cell} font-semibold text-primary`}>
                    ${g.totals.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className={`${cell} font-semibold`}>{g.totals.mpg ? g.totals.mpg.toFixed(1) : "—"}</td>
                  <td className="py-2.5 font-mono font-semibold">{g.totals.fillUps || "—"}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chatbot() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `Network error: ${String(e)}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  const suggestions = [
    "What's Dagger's average MPG?",
    "Which month cost the most in fuel?",
    "How far is Denver to Moab, and what would that trip cost?",
    "What's the trend in gas prices this year?",
  ];

  return (
    <div className="panel flex flex-col h-[calc(100vh-8rem)] min-h-[600px] sticky top-6">
      <div className="border-b border-border/60 px-5 py-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Copilot</div>
          <h2 className="font-semibold leading-tight">Ask Dagger</h2>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              I know Dagger's full fuel history and can look up distances via Google Maps. Try:
            </p>
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-left text-sm px-3 py-2 rounded-md border border-border/60 bg-surface-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground"
                  : "max-w-[92%] text-sm text-foreground whitespace-pre-wrap leading-relaxed"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Ask about miles, cost, trips…"
            className="flex-1 resize-none rounded-md border border-border bg-background/50 px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 max-h-32"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-40 hover:brightness-110 transition"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
