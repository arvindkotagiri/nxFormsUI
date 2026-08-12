import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Sparkles,
  Zap,
  FileOutput,
  Printer,
  RefreshCw,
  Cpu,
  Activity,
  Layers,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from "recharts";
import { cn } from "@/lib/utils";
import { legacyApiUrl } from "@/lib/legacyApiBase";

interface DashboardData {
  summary: {
    totalTemplates: number;
    totalLlmCalls: number;
    totalEvents: number;
    totalOutputs: number;
    successOutputs: number;
    failedOutputs: number;
    pendingOutputs: number;
    totalPrinters: number;
    totalTokensUsed: number;
    avgLlmLatencyMs: number;
    avgOutputDurationMs: number;
  };
  templateModes: Array<{ name: string; value: number; color: string }>;
  recentTraces: Array<{
    id: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    duration_ms: number;
    status: string;
    timestamp: string;
  }>;
  recentEvents: Array<{
    event_id: string;
    event_type: string;
    source: string;
    context: string;
    timestamp: string;
  }>;
  recentOutputs: Array<{
    output_id: string;
    label_id: string;
    context: string;
    status: string;
    printer: string;
    created_on: string;
    duration: number;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(legacyApiUrl("/api/dashboard"));
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Auto refresh every 30 seconds
    const timer = setInterval(fetchDashboard, 30000);
    return () => clearInterval(timer);
  }, [fetchDashboard]);

  const summary = data?.summary || {
    totalTemplates: 0,
    totalLlmCalls: 0,
    totalEvents: 0,
    totalOutputs: 0,
    successOutputs: 0,
    failedOutputs: 0,
    pendingOutputs: 0,
    totalPrinters: 0,
    totalTokensUsed: 0,
    avgLlmLatencyMs: 0,
    avgOutputDurationMs: 0,
  };

  const statusPieData = [
    { name: "Success", value: summary.successOutputs || 0, color: "#10b981" },
    { name: "Failed", value: summary.failedOutputs || 0, color: "#ef4444" },
    { name: "Pending", value: summary.pendingOutputs || 0, color: "#f59e0b" },
  ];

  const templateModes = data?.templateModes && data.templateModes.length > 0 
    ? data.templateModes 
    : [
        { name: "ZPL Labels", value: summary.totalTemplates, color: "#3b82f6" },
        { name: "HTML / Doc", value: 0, color: "#10b981" },
        { name: "Adobe XDP", value: 0, color: "#8b5cf6" },
      ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Platform Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Real-time operational metrics across templates, AI observability, events, and print outputs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchDashboard}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold font-body transition-all shadow-xs"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin text-accent")} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Saved Templates */}
        <div className="card-elevated p-5 space-y-3 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Saved Templates
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-display tracking-tight text-foreground">
              {loading ? "…" : summary.totalTemplates}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-body">
              <span>Active templates in database</span>
            </div>
          </div>
        </div>

        {/* AI LLM Calls */}
        <div className="card-elevated p-5 space-y-3 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              AI LLM Calls
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-display tracking-tight text-foreground">
              {loading ? "…" : summary.totalLlmCalls}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-body">
              <span>{(summary.totalTokensUsed / 1000).toFixed(1)}k tokens used</span>
            </div>
          </div>
        </div>

        {/* Events Processed */}
        <div className="card-elevated p-5 space-y-3 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Events Received
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Zap size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-display tracking-tight text-foreground">
              {loading ? "…" : summary.totalEvents}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-body">
              <span>Webhook payload triggers</span>
            </div>
          </div>
        </div>

        {/* Total Outputs Rendered */}
        <div className="card-elevated p-5 space-y-3 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Output Jobs
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <FileOutput size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-display tracking-tight text-foreground">
              {loading ? "…" : summary.totalOutputs}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-body">
              <span className="text-emerald-600 font-semibold">{summary.successOutputs} Success</span>
              <span>•</span>
              <span className="text-rose-500 font-semibold">{summary.failedOutputs} Fail</span>
            </div>
          </div>
        </div>

        {/* Active Printers */}
        <div className="card-elevated p-5 space-y-3 relative overflow-hidden group hover:border-accent/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Registered Printers
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Printer size={18} />
            </div>
          </div>
          <div>
            <div className="text-3xl font-bold font-display tracking-tight text-foreground">
              {loading ? "…" : summary.totalPrinters}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-body">
              <span>Active printing endpoints</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Format Distribution */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                <Layers size={16} className="text-primary" />
                Template Format Distribution
              </h3>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                Breakdown of saved templates by output format (ZPL, HTML, XDP)
              </p>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center">
            {summary.totalTemplates === 0 ? (
              <div className="text-center text-xs text-muted-foreground italic">No saved templates recorded yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={templateModes}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {templateModes.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
            {templateModes.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                <div className="truncate">
                  <div className="text-xs font-semibold text-foreground">{item.value}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output Execution Status */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" />
                Output Execution Health
              </h3>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                Rendering success vs failure distribution
              </p>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center">
            {summary.totalOutputs === 0 ? (
              <div className="text-center text-xs text-muted-foreground italic">No output execution logs found.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusPieData}>
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-center">
            <div>
              <div className="text-xs text-muted-foreground font-body">Success Rate</div>
              <div className="text-sm font-bold text-emerald-600">
                {summary.totalOutputs > 0 ? Math.round((summary.successOutputs / summary.totalOutputs) * 100) : 100}%
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-body">Avg AI Latency</div>
              <div className="text-sm font-bold text-purple-600">{summary.avgLlmLatencyMs}ms</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-body">Avg Output Time</div>
              <div className="text-sm font-bold text-blue-600">{summary.avgOutputDurationMs}ms</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Feeds Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent AI Observability Traces */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <Cpu size={16} className="text-purple-500" />
              Latest AI Traces (Observability)
            </h3>
            <span className="text-xs text-muted-foreground font-mono">{data?.recentTraces?.length || 0} recent</span>
          </div>

          <div className="space-y-3">
            {(!data?.recentTraces || data.recentTraces.length === 0) ? (
              <div className="text-center text-xs text-muted-foreground py-6 italic">No AI traces logged yet.</div>
            ) : (
              data.recentTraces.map((t) => (
                <div key={t.id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-foreground truncate flex items-center gap-2">
                      <span>{t.model}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-mono">
                        {t.duration_ms}ms
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px] font-mono">
                      {t.prompt_tokens} in / {t.completion_tokens} out ({t.total_tokens} total)
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      {t.status || "200 OK"}
                    </span>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Events & Webhooks */}
        <div className="card-elevated p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              Latest System Events & Webhooks
            </h3>
            <span className="text-xs text-muted-foreground font-mono">{data?.recentEvents?.length || 0} recent</span>
          </div>

          <div className="space-y-3">
            {(!data?.recentEvents || data.recentEvents.length === 0) ? (
              <div className="text-center text-xs text-muted-foreground py-6 italic">No event payloads received yet.</div>
            ) : (
              data.recentEvents.map((ev) => (
                <div key={ev.event_id} className="p-3 rounded-xl border border-border bg-background flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-foreground truncate flex items-center gap-2">
                      <span>{ev.event_type || ev.event_id}</span>
                      {ev.context && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 font-mono">
                          {ev.context}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-[11px] font-mono truncate">
                      Source: {ev.source || "External Webhook"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
