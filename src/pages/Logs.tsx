import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Clock,
  ChevronDown,
  X,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const logs = [
  { id: "LOG-08821", level: "ERROR", service: "OutputEngine", message: "Printer DSP-PRN-01 connection timeout", ts: "2026-02-19 14:31:58", user: "system", traceId: "abc-123" },
  { id: "LOG-08820", level: "INFO", service: "RuleEngine", message: "Rule RUL-001 matched for EVT-00421", ts: "2026-02-19 14:31:55", user: "system", traceId: "abc-122" },
  { id: "LOG-08819", level: "INFO", service: "EventIngestor", message: "Event EVT-00421 received from ERP-SAP", ts: "2026-02-19 14:31:52", user: "system", traceId: "abc-121" },
  { id: "LOG-08818", level: "WARN", service: "APIGateway", message: "B2B Portal API latency > 1000ms", ts: "2026-02-19 14:30:40", user: "system", traceId: "def-100" },
  { id: "LOG-08817", level: "INFO", service: "Auth", message: "Admin user login from 10.0.1.42", ts: "2026-02-19 14:28:11", user: "admin@nxforms.io", traceId: "ghi-200" },
  { id: "LOG-08816", level: "INFO", service: "TemplateEngine", message: "Template TPL-001 v3.2 rendered successfully", ts: "2026-02-19 14:27:58", user: "system", traceId: "jkl-300" },
  { id: "LOG-08815", level: "ERROR", service: "Printer", message: "ZPL parse error in job DSP-PRN-01#0082", ts: "2026-02-19 14:26:30", user: "system", traceId: "mno-400" },
  { id: "LOG-08814", level: "INFO", service: "OutputEngine", message: "Output OUT-00886 delivered to PDF-EXPORT", ts: "2026-02-19 14:25:10", user: "system", traceId: "pqr-500" },
];

function LevelBadge({ level }: { level: string }) {
  if (level === "ERROR") return <span className="badge-error">ERROR</span>;
  if (level === "WARN") return <span className="badge-warning">WARN</span>;
  if (level === "INFO") return <span className="badge-info">INFO</span>;
  return <span className="badge-neutral">{level}</span>;
}

const LOG_PAYLOAD = `{
  "logId": "LOG-08821",
  "level": "ERROR",
  "service": "OutputEngine",
  "message": "Printer DSP-PRN-01 connection timeout",
  "timestamp": "2026-02-19T14:31:58Z",
  "traceId": "abc-123",
  "metadata": {
    "printerId": "DSP-PRN-01",
    "jobId": "JOB-00420",
    "timeoutMs": 5000,
    "attempt": 3
  }
}`;

export default function Logs() {
  const [selectedLog, setSelectedLog] = useState<typeof logs[0] | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  const filtered = logs.filter((l) => !levelFilter || l.level === levelFilter);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Logs & Audit</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            System event log and audit trail
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground transition-all">
          <Download size={14} />
          Export Logs
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs…"
            className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-card font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 w-56"
          />
        </div>
        {["ERROR", "WARN", "INFO"].map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevelFilter(levelFilter === lvl ? null : lvl)}
            className={cn("pill-filter", levelFilter === lvl && "active")}
          >
            {lvl}
          </button>
        ))}
        <button className="pill-filter">
          <Clock size={12} /> Time Range <ChevronDown size={12} />
        </button>
        <button className="pill-filter">
          <Filter size={12} /> Service <ChevronDown size={12} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Log table */}
        <div className={cn("card-elevated overflow-hidden", selectedLog ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border" style={{ background: "hsl(var(--secondary))" }}>
                  {["Level", "Timestamp", "Service", "Message", "User", "Trace ID"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    className={cn(
                      "border-b border-border table-row-hover cursor-pointer transition-colors",
                      i % 2 === 0 ? "bg-card" : "bg-background",
                      selectedLog?.id === log.id && "bg-accent/5"
                    )}
                  >
                    <td className="px-4 py-3">
                      <LevelBadge level={log.level} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{log.ts}</td>
                    <td className="px-4 py-3 text-foreground font-medium text-xs">{log.service}</td>
                    <td className="px-4 py-3 text-foreground text-xs max-w-xs truncate">{log.message}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.user}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.traceId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Detail */}
        {selectedLog && (
          <div className="card-elevated overflow-hidden animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ScrollText size={14} style={{ color: "hsl(var(--accent))" }} />
                <h3 className="font-display text-sm font-semibold text-foreground">{selectedLog.id}</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 rounded hover:bg-secondary transition-colors">
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="space-y-2">
                {[
                  ["Level", selectedLog.level],
                  ["Service", selectedLog.service],
                  ["Timestamp", selectedLog.ts],
                  ["User", selectedLog.user],
                  ["Trace ID", selectedLog.traceId],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-start justify-between gap-2 text-xs font-body">
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium text-foreground text-right font-mono">{v}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl" style={{ background: "hsl(var(--background-secondary))" }}>
                <div className="text-xs font-semibold text-foreground font-display mb-1">Message</div>
                <p className="text-xs text-foreground font-body">{selectedLog.message}</p>
              </div>

              <div>
                <div className="text-xs font-semibold text-foreground font-display mb-1">Payload</div>
                <pre
                  className="text-xs font-mono p-3 rounded-xl overflow-x-auto"
                  style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", lineHeight: 1.6 }}
                >
                  {LOG_PAYLOAD}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
