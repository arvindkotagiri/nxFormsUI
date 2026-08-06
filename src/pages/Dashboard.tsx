import { useState, useEffect } from "react";
import {
  FileOutput,
  CheckCircle,
  XCircle,
  X,
  Clock,
  Timer,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";
import { normalizeOutputsByContext } from "@/lib/contextDisplay";

const API_URL = import.meta.env.VITE_NODE_API ?? "";

function AnimatedCounter({ target, isString }: { target: number | string; isString?: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (isString) return;
    const num = target as number;
    const duration = 1200;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * num));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, isString]);

  if (isString) return <span>{target}</span>;
  return <span>{value.toLocaleString()}</span>;
}

const filters = ["Date Range", "Context", "Status", "Printer"];
type FilterName = (typeof filters)[number];

const createEmptyFilters = (): Record<FilterName, string> =>
  filters.reduce((acc, name) => {
    acc[name] = "";
    return acc;
  }, {} as Record<FilterName, string>);

const filterQueryKey: Record<string, string> = {
  "Date Range": "date_range",
  Context: "context",
  Status: "status",
  Printer: "printer",
};

const iconMap: Record<string, any> = {
  FileOutput,
  CheckCircle,
  XCircle,
  Clock,
  Timer,
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
      <p>{message}</p>
    </div>
  );
}

function buildDashboardUrl(filtersObj: Record<string, string> | null) {
  const base = API_URL?.trim() || "";
  const pathname = "/dashboard";
  const params = new URLSearchParams();
  if (filtersObj) {
    Object.entries(filtersObj).forEach(([k, v]) => {
      if (!v) return;
      const key = filterQueryKey[k] ?? k.toLowerCase().replace(/\s+/g, "_");
      params.set(key, v);
    });
  }

  const queryString = params.toString();
  const prefix = base.replace(/\/$/, "") || "";
  return `${prefix}${pathname}${queryString ? `?${queryString}` : ""}`;
}

export default function Dashboard() {
  const [kpiCards, setKpiCards] = useState<any[]>([]);
  const [outputsByContext, setOutputsByContext] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [timeTrend, setTimeTrend] = useState<any[]>([]);
  const [printerUtil, setPrinterUtil] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Applied filters drive API query params.
  const [selectedFilters, setSelectedFilters] = useState<Partial<Record<FilterName, string>>>({});
  // Draft filters are edited in UI and applied explicitly.
  const [draftFilters, setDraftFilters] = useState<Record<FilterName, string>>(createEmptyFilters());

  useEffect(() => {
    const fetchDashboard = async () => {
      setFetchError(null);
      setIsLoading(true);
      try {
        const res = await fetch(buildDashboardUrl(Object.keys(selectedFilters).length ? selectedFilters : null));
        const data = await res.json();

        const mappedCards = (data.kpiCards ?? []).map((card: any) => ({
          ...card,
          icon: iconMap[card.icon],
          color: "hsl(var(--primary))",
          bg: "hsl(var(--secondary))",
        }));

        setKpiCards(mappedCards);
        setOutputsByContext(normalizeOutputsByContext(data.outputsByContext ?? []));
        setStatusDist(data.statusDist ?? []);
        setTimeTrend(data.timeTrend ?? []);
        setPrinterUtil(data.printerUtil ?? []);
      } catch (error) {
        console.error(error);
        setFetchError("Unable to load dashboard data. Please try again.");
        setKpiCards([]);
        setOutputsByContext([]);
        setStatusDist([]);
        setTimeTrend([]);
        setPrinterUtil([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedFilters]);

  const setDraftValue = (filterName: FilterName, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const applyFilters = () => {
    const normalized = Object.entries(draftFilters).reduce((acc, [key, value]) => {
      const trimmed = value.trim();
      if (!trimmed) return acc;
      return {
        ...acc,
        [key]: trimmed,
      };
    }, {} as Partial<Record<FilterName, string>>);

    setSelectedFilters(normalized);
  };

  const clearAllFilters = () => {
    setDraftFilters(createEmptyFilters());
    setSelectedFilters({});
  };

  const clearSingleFilter = (filterName: FilterName) => {
    setDraftFilters((prev) => ({ ...prev, [filterName]: "" }));
    setSelectedFilters((prev) => {
      const next = { ...prev };
      delete next[filterName];
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Real-time output processing overview — today
          </p>
        </div>
        <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground hover:border-accent transition-all" onClick={() => { window.location.reload() }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/20 p-2.5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-1 rounded-md bg-secondary text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Filters
            </span>

            <select
              className="h-8 min-w-[122px] rounded-lg border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              value={draftFilters["Date Range"]}
              onChange={(e) => setDraftValue("Date Range", e.target.value)}
              aria-label="Date range filter"
            >
              <option value="">Date: All</option>
              <option value="today">Date: Today</option>
              <option value="last_24h">Date: Last 24h</option>
              <option value="last_7d">Date: Last 7d</option>
            </select>

            <select
              className="h-8 min-w-[140px] rounded-lg border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              value={draftFilters.Context}
              onChange={(e) => setDraftValue("Context", e.target.value)}
              aria-label="Context filter"
            >
              <option value="">Context: All</option>
              {outputsByContext.map((o) => (
                <option key={o.name} value={o.name}>{o.name}</option>
              ))}
            </select>

            <select
              className="h-8 min-w-[120px] rounded-lg border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              value={draftFilters.Status}
              onChange={(e) => setDraftValue("Status", e.target.value)}
              aria-label="Status filter"
            >
              <option value="">Status: All</option>
              {statusDist.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            <select
              className="h-8 min-w-[130px] rounded-lg border border-border/70 bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
              value={draftFilters.Printer}
              onChange={(e) => setDraftValue("Printer", e.target.value)}
              aria-label="Printer filter"
            >
              <option value="">Printer: All</option>
              {printerUtil.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>

            <button
              className="h-8 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              onClick={applyFilters}
              disabled={isLoading}
            >
              Apply
            </button>

            <button
              className="h-8 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
              onClick={clearAllFilters}
              disabled={isLoading}
            >
              Reset
            </button>

            {isLoading ? <span className="text-[11px] text-muted-foreground">Updating...</span> : null}
          </div>

          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {Object.entries(selectedFilters).length > 0 ? (
              Object.entries(selectedFilters).map(([name, value]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => clearSingleFilter(name as FilterName)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-foreground hover:bg-secondary transition-colors"
                  title={`Clear ${name} filter`}
                >
                  <span className="font-medium">{name}:</span>
                  <span>{value}</span>
                  <X size={12} className="opacity-70" />
                </button>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No filters applied</span>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {Object.keys(selectedFilters).length > 0 ? (
            <span>Showing dashboard data using the selected filters.</span>
          ) : (
            <span>Showing all dashboard data for today.</span>
          )}
        </div>
        {fetchError ? (
          <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {fetchError}
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpiCards.map((card, i) => (
          <div
            key={card.label}
            className="card-elevated p-5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: card.bg }}
              >
                <card.icon size={18} style={{ color: card.color }} />
              </div>
              {/* Trend feature - disabled */}
              {/* <span
                className={cn(
                  "text-xs font-medium font-body flex items-center gap-0.5",
                  card.up
                    ? "text-success"
                    : !card.label.includes("Failed") && !card.label.includes("Avg")
                    ? "text-success"
                    : "text-error"
                )}
                style={
                  card.label === "Failed"
                    ? { color: "hsl(var(--success))" }
                    : card.label === "Avg Processing Time"
                    ? { color: "hsl(var(--success))" }
                    : {}
                }
              >
                {card.label === "Failed" ? (
                  <TrendingDown size={12} />
                ) : (
                  <TrendingUp size={12} />
                )}
                {card.trend}
              </span> */}
            </div>
            <div className="font-display text-2xl font-semibold text-foreground mb-1">
              <AnimatedCounter target={card.value} isString={card.isString} />
            </div>
            <div className="text-xs text-muted-foreground font-body leading-tight">
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Outputs by Context */}
        <div className="card-elevated p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-foreground">
              Outputs by Context
            </h2>
            <span className="text-xs text-muted-foreground font-body">Last 24h</span>
          </div>
          {outputsByContext.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(220, outputsByContext.length * 36)}
            >
              <BarChart
                data={outputsByContext}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  interval={0}
                  tick={{ fontSize: 12, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontFamily: "Manrope",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="outputs" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Outputs" barSize={14} />
                <Bar dataKey="errors" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} name="Errors" barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No context output data is available for today." />
          )}
        </div>

        {/* Status Distribution */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-foreground">
              Status Distribution
            </h2>
          </div>
          {statusDist.length > 0 && statusDist.some((entry) => entry?.value > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={index} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontFamily: "Manrope",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {statusDist.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs font-body">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </div>
                    <span className="font-semibold text-foreground">{s.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState message="No status distribution data is available for today." />
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Processing Time Trend */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-foreground">
              Processing Time Trend
            </h2>
            <span className="text-xs text-muted-foreground font-body">ms</span>
          </div>
          {timeTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={timeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontFamily: "Manrope",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ms"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--accent))" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No processing time trend data is available for today." />
          )}
        </div>

        {/* Printer Utilization */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-foreground">
              Printer Utilization
            </h2>
          </div>
          {printerUtil.length > 0 ? (
            <div className="space-y-3">
              {printerUtil.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-body">
                    <span className="text-foreground font-medium">{p.name}</span>
                    <span
                      className="font-semibold"
                      style={{ color: p.util > 80 ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
                    >
                      {p.util}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${p.util}%`,
                        background:
                          p.util > 80
                            ? "hsl(var(--accent))"
                            : "hsl(var(--primary))",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No printer utilization data is available for today." />
          )}
        </div>
      </div>
    </div>
  );
}
