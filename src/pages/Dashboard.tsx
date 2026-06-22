import { useState, useEffect } from "react";
import {
  FileOutput,
  CheckCircle,
  XCircle,
  Clock,
  Timer,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  ChevronDown,
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
  Legend,
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

const filters = ["Date Range", "Context", "Source", "Status", "Printer"];

const filterQueryKey: Record<string, string> = {
  "Date Range": "date_range",
  Context: "context",
  Source: "source",
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
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [kpiCards, setKpiCards] = useState<any[]>([]);
  const [outputsByContext, setOutputsByContext] = useState<any[]>([]);
  const [statusDist, setStatusDist] = useState<any[]>([]);
  const [timeTrend, setTimeTrend] = useState<any[]>([]);
  const [printerUtil, setPrinterUtil] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected filters that drive API query params
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  // Temporary value while a filter panel is open
  const [tempFilterValue, setTempFilterValue] = useState<string>("");

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Real-time output processing overview — today
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground hover:border-accent transition-all" onClick={() => { window.location.reload() }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <div key={f} className="relative">
              <button
                onClick={() => {
                  if (activeFilter === f) return setActiveFilter(null);
                  setActiveFilter(f);
                  setTempFilterValue(selectedFilters[f] ?? "");
                }}
                className={cn("pill-filter", activeFilter === f && "active", selectedFilters[f] && "applied")}
              >
                {f}
                <ChevronDown size={12} />
              </button>

              {activeFilter === f && (
                <div className="absolute left-0 top-full mt-2 w-64 card-elevated p-3 z-40">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {f === "Date Range" && (
                        <>
                          <button className={cn("pill-filter", tempFilterValue === "today" && "active")} onClick={() => setTempFilterValue("today")}>Today</button>
                          <button className={cn("pill-filter", tempFilterValue === "last_24h" && "active")} onClick={() => setTempFilterValue("last_24h")}>Last 24h</button>
                          <button className={cn("pill-filter", tempFilterValue === "last_7d" && "active")} onClick={() => setTempFilterValue("last_7d")}>Last 7d</button>
                        </>
                      )}

                      {f === "Context" && (
                        <select value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} className="select w-full">
                          <option value="">Select context</option>
                          {outputsByContext.map((o) => (
                            <option key={o.name} value={o.name}>{o.name}</option>
                          ))}
                        </select>
                      )}

                      {f === "Status" && (
                        <select value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} className="select w-full">
                          <option value="">Select status</option>
                          {statusDist.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      )}

                      {f === "Printer" && (
                        <select value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} className="select w-full">
                          <option value="">Select printer</option>
                          {printerUtil.map((p) => (
                            <option key={p.name} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      )}

                      {f === "Source" && (
                        <input className="input w-full" placeholder="Enter source" value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="pill-filter"
                        onClick={() => {
                          setSelectedFilters((p) => ({ ...p, [f]: tempFilterValue }));
                          setActiveFilter(null);
                        }}
                      >
                        Apply
                      </button>
                      <button
                        className="pill-filter bg-slate-100 text-slate-700"
                        onClick={() => {
                          setTempFilterValue("");
                          setSelectedFilters((p) => {
                            const copy = { ...p };
                            delete copy[f];
                            return copy;
                          });
                          setActiveFilter(null);
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {activeFilter ? (
            <button
              onClick={() => setActiveFilter(null)}
              className="pill-filter bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              Clear filter
            </button>
          ) : null}
        </div>
        <div className="text-sm text-muted-foreground">
          {activeFilter ? (
            <span>Showing dashboard data filtered by <strong>{activeFilter}</strong>.</span>
          ) : (
            <span>Showing all dashboard data for today.</span>
          )}
        </div>
        {fetchError ? (
          <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {fetchError}
          </div>
        ) : null}
        {activeFilter ? (
          <div className="card-elevated p-4 mt-2">
            <div className="flex items-center gap-4 flex-wrap">
              {activeFilter === "Date Range" && (
                <div className="flex items-center gap-2">
                  <button className={cn("pill-filter", tempFilterValue === "today" && "active")} onClick={() => setTempFilterValue("today")}>Today</button>
                  <button className={cn("pill-filter", tempFilterValue === "last_24h" && "active")} onClick={() => setTempFilterValue("last_24h")}>Last 24h</button>
                  <button className={cn("pill-filter", tempFilterValue === "last_7d" && "active")} onClick={() => setTempFilterValue("last_7d")}>Last 7d</button>
                </div>
              )}

              {activeFilter === "Context" && (
                <select value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} className="select">
                  <option value="">Select context</option>
                  {outputsByContext.map((o) => (
                    <option key={o.name} value={o.name}>{o.name}</option>
                  ))}
                </select>
              )}

              {activeFilter === "Status" && (
                <select value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} className="select">
                  <option value="">Select status</option>
                  {statusDist.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}

              {activeFilter === "Printer" && (
                <select value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} className="select">
                  <option value="">Select printer</option>
                  {printerUtil.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              )}

              {activeFilter === "Source" && (
                <input className="input" placeholder="Enter source" value={tempFilterValue} onChange={(e) => setTempFilterValue(e.target.value)} />
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <button
                className="pill-filter"
                onClick={() => {
                  if (!activeFilter) return;
                  setSelectedFilters((p) => ({ ...p, [activeFilter]: tempFilterValue }));
                  setActiveFilter(null);
                }}
              >
                Apply
              </button>
              <button
                className="pill-filter bg-slate-100 text-slate-700"
                onClick={() => {
                  if (!activeFilter) return;
                  setTempFilterValue("");
                  setSelectedFilters((p) => {
                    const copy = { ...p };
                    delete copy[activeFilter];
                    return copy;
                  });
                  setActiveFilter(null);
                }}
              >
                Clear
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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
