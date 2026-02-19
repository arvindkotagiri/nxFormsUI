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

const kpiCards = [
  {
    label: "Total Outputs Today",
    value: 14872,
    icon: FileOutput,
    trend: "+12.4%",
    up: true,
    color: "hsl(var(--primary))",
    bg: "hsl(var(--secondary))",
  },
  {
    label: "Processed Successfully",
    value: 14209,
    icon: CheckCircle,
    trend: "+8.1%",
    up: true,
    color: "hsl(var(--success))",
    bg: "hsl(var(--success-bg))",
  },
  {
    label: "Failed",
    value: 248,
    icon: XCircle,
    trend: "-3.2%",
    up: false,
    color: "hsl(var(--error))",
    bg: "hsl(var(--error-bg))",
  },
  {
    label: "Pending",
    value: 415,
    icon: Clock,
    trend: "+2.1%",
    up: true,
    color: "hsl(var(--warning))",
    bg: "hsl(var(--warning-bg))",
  },
  {
    label: "Avg Processing Time",
    value: "142ms",
    icon: Timer,
    trend: "-18ms",
    up: false,
    isString: true,
    color: "hsl(var(--info))",
    bg: "hsl(var(--info-bg))",
  },
];

const outputsByContext = [
  { name: "Invoice", outputs: 4200, errors: 120 },
  { name: "Receipt", outputs: 3100, errors: 45 },
  { name: "Label", outputs: 2800, errors: 82 },
  { name: "Report", outputs: 1900, errors: 31 },
  { name: "Statement", outputs: 1400, errors: 18 },
  { name: "Dispatch", outputs: 1100, errors: 22 },
];

const statusDist = [
  { name: "Success", value: 14209, color: "hsl(var(--success))" },
  { name: "Failed", value: 248, color: "hsl(var(--error))" },
  { name: "Pending", value: 415, color: "hsl(var(--warning))" },
];

const timeTrend = [
  { time: "00:00", ms: 165 },
  { time: "04:00", ms: 143 },
  { time: "08:00", ms: 188 },
  { time: "10:00", ms: 212 },
  { time: "12:00", ms: 178 },
  { time: "14:00", ms: 155 },
  { time: "16:00", ms: 162 },
  { time: "18:00", ms: 149 },
  { time: "20:00", ms: 134 },
  { time: "22:00", ms: 128 },
];

const printerUtil = [
  { name: "LBL-PRN-01", util: 88 },
  { name: "PDF-EXPORT", util: 74 },
  { name: "LBL-PRN-02", util: 61 },
  { name: "SHIP-PRN-01", util: 52 },
  { name: "RPT-PRN-01", util: 38 },
];

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

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground hover:border-accent transition-all">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(activeFilter === f ? null : f)}
            className={cn("pill-filter", activeFilter === f && "active")}
          >
            {f}
            <ChevronDown size={12} />
          </button>
        ))}
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
              <span
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
              </span>
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
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={outputsByContext} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
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
              <Bar dataKey="outputs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Outputs" />
              <Bar dataKey="errors" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Errors" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-foreground">
              Status Distribution
            </h2>
          </div>
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
        </div>

        {/* Printer Utilization */}
        <div className="card-elevated p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-foreground">
              Printer Utilization
            </h2>
          </div>
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
        </div>
      </div>
    </div>
  );
}
