import { useState } from "react";
import { Printer, Plus, Play, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const printers = [
  {
    id: "LBL-PRN-01",
    name: "Label Printer Alpha",
    type: "Zebra ZT410",
    location: "Warehouse A",
    status: "Online",
    utilization: 88,
    jobsToday: 3120,
    errorRate: "0.8%",
    lastJob: "14:32:11",
    ip: "192.168.10.41",
    format: ["ZPL", "EPL"],
  },
  {
    id: "PDF-EXPORT",
    name: "PDF Export Engine",
    type: "Virtual / Cloud",
    location: "Cloud",
    status: "Online",
    utilization: 74,
    jobsToday: 5840,
    errorRate: "0.2%",
    lastJob: "14:32:09",
    ip: "internal",
    format: ["PDF", "HTML"],
  },
  {
    id: "LBL-PRN-02",
    name: "Label Printer Beta",
    type: "Zebra ZT230",
    location: "Warehouse B",
    status: "Online",
    utilization: 61,
    jobsToday: 1640,
    errorRate: "1.4%",
    lastJob: "14:29:48",
    ip: "192.168.10.42",
    format: ["ZPL"],
  },
  {
    id: "DSP-PRN-01",
    name: "Dispatch Printer",
    type: "Zebra ZT620",
    location: "Dispatch Bay",
    status: "Offline",
    utilization: 0,
    jobsToday: 0,
    errorRate: "–",
    lastJob: "11:14:22",
    ip: "192.168.10.43",
    format: ["ZPL", "PDF"],
  },
  {
    id: "RPT-PRN-01",
    name: "Report Printer",
    type: "HP LaserJet M404",
    location: "Office",
    status: "Online",
    utilization: 38,
    jobsToday: 340,
    errorRate: "0.0%",
    lastJob: "14:26:05",
    ip: "192.168.1.101",
    format: ["PDF"],
  },
];

const usageData = [
  { hour: "08", jobs: 420 },
  { hour: "09", jobs: 680 },
  { hour: "10", jobs: 910 },
  { hour: "11", jobs: 780 },
  { hour: "12", jobs: 540 },
  { hour: "13", jobs: 620 },
  { hour: "14", jobs: 850 },
];

export default function Printers() {
  const [selected, setSelected] = useState<typeof printers[0] | null>(null);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Printers</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Managed output destinations
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body"
          style={{ background: "hsl(var(--accent))", color: "white" }}
        >
          <Plus size={16} />
          Add Printer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {printers.map((p) => (
          <div
            key={p.id}
            className={cn("card-elevated p-5 space-y-4 cursor-pointer transition-all")}
            onClick={() => setSelected(selected?.id === p.id ? null : p)}
            style={selected?.id === p.id ? { outline: `2px solid hsl(var(--accent))`, outlineOffset: "-2px" } : {}}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: p.status === "Online" ? "hsl(var(--success-bg))" : "hsl(var(--error-bg))" }}
                >
                  <Printer size={18} style={{ color: p.status === "Online" ? "hsl(var(--success))" : "hsl(var(--error))" }} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{p.name}</h3>
                  <div className="text-xs text-muted-foreground font-body">{p.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn("status-dot", p.status === "Online" ? "online" : "offline")} />
                <span className="text-xs font-body font-medium" style={{ color: p.status === "Online" ? "hsl(var(--success))" : "hsl(var(--error))" }}>
                  {p.status}
                </span>
              </div>
            </div>

            {/* Utilization bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-body">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-semibold" style={{ color: p.utilization > 80 ? "hsl(var(--accent))" : "hsl(var(--primary))" }}>
                  {p.utilization}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${p.utilization}%`,
                    background: p.utilization > 80 ? "hsl(var(--accent))" : "hsl(var(--primary))",
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs font-body">
              <div className="text-center">
                <div className="font-semibold text-foreground">{p.jobsToday.toLocaleString()}</div>
                <div className="text-muted-foreground">Jobs today</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground">{p.errorRate}</div>
                <div className="text-muted-foreground">Error rate</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-foreground font-mono text-[11px]">{p.lastJob}</div>
                <div className="text-muted-foreground">Last job</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {p.format.map((f) => (
                  <span key={f} className="badge-neutral">{f}</span>
                ))}
              </div>
              {p.status === "Online" && (
                <button
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-all"
                  style={{ background: "hsl(var(--accent))", color: "white" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Play size={11} />
                  Test
                </button>
              )}
              <button
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="card-elevated p-5 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground">{selected.name} — Usage Today</h2>
            <span className="text-xs text-muted-foreground font-body">{selected.ip}</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={usageData} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontFamily: "Manrope", fontSize: 12 }} />
              <Bar dataKey="jobs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Jobs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
