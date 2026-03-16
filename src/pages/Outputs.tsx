import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  RotateCcw,
  GitBranch,
  XCircle,
  Eye,
  ChevronDown,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
const API_URL = import.meta.env.VITE_NODE_API;

// const outputs = [
//   { id: "OUT-00891", eventId: "EVT-00421", formId: "INV-001", printer: "PDF-EXPORT", format: "PDF", status: "Success", retries: 0, duration: "92ms" },
//   { id: "OUT-00890", eventId: "EVT-00420", formId: "DSP-200", printer: "DSP-PRN-01", format: "ZPL", status: "Failed", retries: 2, duration: "412ms" },
//   { id: "OUT-00889", eventId: "EVT-00418", formId: "LBL-300", printer: "LBL-PRN-01", format: "ZPL", status: "Success", retries: 0, duration: "88ms" },
//   { id: "OUT-00888", eventId: "EVT-00417", formId: "STM-010", printer: "PDF-EXPORT", format: "PDF", status: "Success", retries: 0, duration: "205ms" },
//   { id: "OUT-00887", eventId: "EVT-00416", formId: "LBL-310", printer: "LBL-PRN-02", format: "ZPL", status: "Failed", retries: 3, duration: "1.2s" },
//   { id: "OUT-00886", eventId: "EVT-00415", formId: "INV-002", printer: "PDF-EXPORT", format: "PDF", status: "Success", retries: 0, duration: "144ms" },
//   { id: "OUT-00885", eventId: "EVT-00414", formId: "RPT-100", printer: "RPT-PRN-01", format: "PDF", status: "Success", retries: 0, duration: "318ms" },
//   { id: "OUT-00884", eventId: "EVT-00413", formId: "INV-003", printer: "PDF-EXPORT", format: "PDF", status: "Pending", retries: 0, duration: "–" },
// ];

function StatusBadge({ status }: { status: string }) {
  if (status === "Success") return <span className="badge-success">● Success</span>;
  if (status === "Failed") return <span className="badge-error">● Failed</span>;
  if (status === "Pending") return <span className="badge-warning">◌ Pending</span>;
  return <span className="badge-neutral">{status}</span>;
}

const OUTPUT_TABS = ["Overview", "Document JSON", "Template Mapping", "Raw Output"];

export default function Outputs() {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [detailOutput, setDetailOutput] = useState<typeof outputs[0] | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [outputs, setOutputs] = useState<any[]>([]);

  const filtered = outputs.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.eventId.toLowerCase().includes(search.toLowerCase()) ||
      o.formId.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const allSelected = selected.length === filtered.length && filtered.length > 0;

  useEffect(() => {
    fetch(`${API_URL}/outputs`)
      .then((res) => res.json())
      .then((data) => setOutputs(data))
      .catch((err) => console.error(err));
  }, []);
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Outputs</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Operations console — all output records
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground transition-all">
          <Download size={14} />
          Export
        </button>
      </div>

      <div className="card-elevated overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/40">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search outputs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-card font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <button className="pill-filter">
            <Filter size={12} /> Status <ChevronDown size={12} />
          </button>
          <button className="pill-filter">
            <Filter size={12} /> Printer <ChevronDown size={12} />
          </button>
          <div className="ml-auto text-xs text-muted-foreground font-body">{filtered.length} records</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr className="border-b border-border" style={{ background: "hsl(var(--secondary))" }}>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? [] : filtered.map((o) => o.id))
                    }
                    className="rounded"
                  />
                </th>
                {["Output ID", "Event ID", "Form ID", "Printer", "Format", "Status", "Retries", "Duration", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o, i) => (
                <tr
                  key={o.id}
                  className={cn(
                    "border-b border-border table-row-hover transition-colors",
                    i % 2 === 0 ? "bg-card" : "bg-background",
                    selected.includes(o.id) && "bg-accent/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(o.id)}
                      onChange={() => toggleSelect(o.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{o.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.eventId}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.formId}</td>
                  <td className="px-4 py-3 text-foreground">{o.printer}</td>
                  <td className="px-4 py-3">
                    <span className="badge-neutral">{o.format}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-center text-xs font-semibold" style={{ color: o.retries > 0 ? "hsl(var(--accent))" : "hsl(var(--muted-foreground))" }}>
                    {o.retries}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{o.duration}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDetailOutput(o)}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      {o.status === "Failed" && (
                        <>
                          <button className="px-2 py-1 rounded-lg text-xs font-semibold transition-all" style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>
                            Retry
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <GitBranch size={14} />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-elevated-lg"
          style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
        >
          <span className="text-sm font-body">{selected.length} selected</span>
          <div className="w-px h-4 bg-primary-foreground/20" />
          <button className="text-sm font-semibold font-body px-3 py-1 rounded-lg" style={{ background: "hsl(var(--accent))", color: "white" }}>
            <RotateCcw size={13} className="inline mr-1" />
            Retry All
          </button>
          <button className="text-sm font-body opacity-70 hover:opacity-100 transition-opacity">Cancel</button>
        </div>
      )}

      {/* Output Detail Modal */}
      {detailOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setDetailOutput(null)} />
          <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-elevated-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-display text-lg font-semibold text-foreground">{detailOutput.id}</h3>
              <button onClick={() => setDetailOutput(null)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <XCircle size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-6 pt-4">
              {OUTPUT_TABS.map((tab, idx) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(idx)}
                  className={cn("tab-pill", activeTab === idx && "active")}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Output ID", detailOutput.id],
                    ["Event ID", detailOutput.eventId],
                    ["Form ID", detailOutput.formId],
                    ["Printer", detailOutput.printer],
                    ["Format", detailOutput.format],
                    ["Status", detailOutput.status],
                    ["Retries", detailOutput.retries],
                    ["Duration", detailOutput.duration],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="p-3 rounded-xl bg-background">
                      <div className="text-xs text-muted-foreground font-body mb-1">{k}</div>
                      <div className="text-sm font-semibold text-foreground font-body">{String(v)}</div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 1 && (
                <pre className="p-4 rounded-xl text-xs font-mono overflow-x-auto" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  {`{
  "outputId": "${detailOutput.id}",
  "formId": "${detailOutput.formId}",
  "format": "${detailOutput.format}",
  "generatedAt": "2026-02-19T14:32:11Z",
  "pages": 1,
  "size": "24.8 KB"
}`}
                </pre>
              )}
              {activeTab === 2 && (
                <div className="space-y-2">
                  {["header", "footer", "lineItems", "totals", "barcode"].map((field) => (
                    <div key={field} className="flex items-center justify-between p-3 rounded-xl bg-background text-sm font-body">
                      <span className="font-mono text-xs text-foreground">{field}</span>
                      <span className="text-muted-foreground text-xs">→ template.{field}</span>
                      <span className="badge-success">Mapped</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 3 && (
                <pre className="p-4 rounded-xl text-xs font-mono overflow-x-auto" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  {`^XA^FO50,50^A0N,32,32^FDOrder: ORD-98421^FS^XZ`}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
