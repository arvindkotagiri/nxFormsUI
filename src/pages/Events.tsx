import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  Eye,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
const API_URL = import.meta.env.VITE_NODE_API;

// const events = [
//   { id: "EVT-00421", source: "ERP-SAP", context: "Invoice", form: "INV-001", status: "Success", ts: "2026-02-19 14:32:11", duration: "138ms", outputs: 3 },
//   { id: "EVT-00420", source: "WMS-Core", context: "Dispatch", form: "DSP-200", status: "Failed", ts: "2026-02-19 14:31:58", duration: "412ms", outputs: 1 },
//   { id: "EVT-00419", source: "POS-System", context: "Receipt", form: "RCT-050", status: "Pending", ts: "2026-02-19 14:31:44", duration: "–", outputs: 2 },
//   { id: "EVT-00418", source: "ERP-SAP", context: "Label", form: "LBL-300", status: "Success", ts: "2026-02-19 14:30:22", duration: "92ms", outputs: 5 },
//   { id: "EVT-00417", source: "CRM-SF", context: "Statement", form: "STM-010", status: "Success", ts: "2026-02-19 14:29:48", duration: "205ms", outputs: 1 },
//   { id: "EVT-00416", source: "WMS-Core", context: "Label", form: "LBL-310", status: "Failed", ts: "2026-02-19 14:28:32", duration: "1.2s", outputs: 0 },
//   { id: "EVT-00415", source: "ERP-SAP", context: "Invoice", form: "INV-002", status: "Success", ts: "2026-02-19 14:27:19", duration: "144ms", outputs: 2 },
//   { id: "EVT-00414", source: "B2B-Portal", context: "Report", form: "RPT-100", status: "Success", ts: "2026-02-19 14:26:05", duration: "318ms", outputs: 1 },
//   { id: "EVT-00413", source: "ERP-SAP", context: "Invoice", form: "INV-003", status: "Pending", ts: "2026-02-19 14:24:50", duration: "–", outputs: 1 },
//   { id: "EVT-00412", source: "POS-System", context: "Receipt", form: "RCT-051", status: "Success", ts: "2026-02-19 14:23:38", duration: "88ms", outputs: 1 },
// ];

function StatusBadge({ status }: { status: string }) {
  if (status === "Success") return <span className="badge-success">● Success</span>;
  if (status === "Failed") return <span className="badge-error">● Failed</span>;
  if (status === "Pending") return <span className="badge-warning">◌ Pending</span>;
  return <span className="badge-neutral">{status}</span>;
}

const EVENT_MOCK = {
  id: "EVT-00420",
  source: "WMS-Core",
  context: "Dispatch",
  form: "DSP-200",
  status: "Failed",
  ts: "2026-02-19 14:31:58",
  error: "PRINTER_UNAVAILABLE: Target printer DSP-PRN-01 returned connection timeout after 5000ms",
  payload: `{
  "eventId": "EVT-00420",
  "source": "WMS-Core",
  "context": "Dispatch",
  "formId": "DSP-200",
  "data": {
    "orderId": "ORD-98421",
    "warehouseId": "WH-02",
    "carrier": "FedEx",
    "trackingRef": "FX2024021900420",
    "packages": 3,
    "destination": {
      "name": "Acme Corp",
      "address": "500 Commerce Blvd",
      "city": "Denver",
      "state": "CO",
      "zip": "80201"
    }
  }
}`,
};

export default function Events() {
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<typeof EVENT_MOCK | null>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error(err));
  }, []);

  const filtered = events.filter(
    (e) =>
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.source.toLowerCase().includes(search.toLowerCase()) ||
      e.context.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Events</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Incoming trigger events from all sources
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground transition-all">
          <RefreshCw size={14} />
          Auto-refresh: ON
        </button>
      </div>

      {/* Table card */}
      <div className="card-elevated overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/40">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-card font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button className="pill-filter">
            <Filter size={12} /> Filters <ChevronDown size={12} />
          </button>
          <div className="ml-auto text-xs text-muted-foreground font-body">
            {filtered.length} events
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border" style={{ background: "hsl(var(--secondary))" }}>
                {["Event ID", "Source", "Context", "Form", "Status", "Timestamp", "Duration", "Outputs", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => (
                <tr
                  key={e.id}
                  className={cn("border-b border-border table-row-hover transition-colors", i % 2 === 0 ? "bg-card" : "bg-background")}
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{e.id}</td>
                  <td className="px-4 py-3 text-foreground">{e.source}</td>
                  <td className="px-4 py-3 text-foreground">{e.context}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{e.form}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{e.ts}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{e.duration}</td>
                  <td className="px-4 py-3 text-center font-semibold text-xs text-foreground">{e.outputs}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedEvent(EVENT_MOCK)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="View Detail"
                      >
                        <Eye size={14} />
                      </button>
                      {e.status === "Failed" && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                          style={{ color: "hsl(var(--accent))" }}
                          title="Retry"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-body">Showing 1–{filtered.length} of 14,872</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, "...", 89].map((p, i) => (
              <button
                key={i}
                className={cn(
                  "w-7 h-7 rounded-md text-xs font-body transition-colors",
                  p === 1
                    ? "text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
                style={p === 1 ? { background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" } : {}}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          />
          <div className="w-[480px] h-full bg-card shadow-elevated-lg flex flex-col animate-slide-in-right overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Zap size={16} style={{ color: "hsl(var(--accent))" }} />
                <h3 className="font-display text-lg font-semibold text-foreground">{selectedEvent.id}</h3>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Meta */}
              <div className="card-elevated p-4 space-y-3">
                <h4 className="font-display text-sm font-semibold text-foreground">Event Metadata</h4>
                {[
                  ["Source", selectedEvent.source],
                  ["Context", selectedEvent.context],
                  ["Form", selectedEvent.form],
                  ["Status", selectedEvent.status],
                  ["Timestamp", selectedEvent.ts],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between text-sm font-body">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium text-foreground">{v}</span>
                  </div>
                ))}
              </div>

              {/* Error */}
              {selectedEvent.error && (
                <div className="p-4 rounded-xl" style={{ background: "hsl(var(--error-bg))" }}>
                  <div className="text-xs font-semibold font-display mb-1" style={{ color: "hsl(var(--error))" }}>
                    Error
                  </div>
                  <p className="text-xs font-body text-foreground-secondary">{selectedEvent.error}</p>
                </div>
              )}

              {/* JSON Payload */}
              <div className="card-elevated overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold text-foreground">Payload</h4>
                </div>
                <pre
                  className="p-4 text-xs overflow-x-auto font-mono"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    borderRadius: "0 0 12px 12px",
                    lineHeight: 1.6,
                  }}
                >
                  {selectedEvent.payload}
                </pre>
              </div>

              {/* Actions */}
              <button
                className="w-full py-2.5 rounded-lg text-sm font-semibold font-body transition-all"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                }}
              >
                <RotateCcw size={14} className="inline mr-2" />
                Retry Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
