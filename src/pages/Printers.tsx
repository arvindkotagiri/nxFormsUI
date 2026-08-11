import { useState, useEffect } from "react";
import { Printer, Plus, Play, Settings, RefreshCw, Trash2, X, Loader2, CheckCircle2, XCircle, Wifi, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const API_URL = import.meta.env.VITE_NODE_API || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/node` : "http://localhost:4000");

type PrinterData = {
  id: string;
  name: string;
  ip_address: string;
  site_id: string;
  type: string;
  status: string;
  created_on: string;
};

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
  const [printers, setPrinters] = useState<PrinterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PrinterData | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterData | null>(null);

  // Agent State
  const [agentEnabled, setAgentEnabled] = useState(false);
  const [agentSiteId, setAgentSiteId] = useState("SITE-001");
  const [isSavingAgent, setIsSavingAgent] = useState(false);

  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<PrinterData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [newPrinter, setNewPrinter] = useState({
    name: "",
    ip_address: "",
    site_id: "SITE-001",
    type: "ZEBRA",
  });

  const loadAgentConfigs = async () => {
    try {
      const res = await fetch(`${API_URL}/api/model-configs`);
      if (res.ok) {
        const configs = await res.json();
        setAgentEnabled(configs.agent_enabled === "true");
        setAgentSiteId(configs.agent_site_id || "SITE-001");
      }
    } catch (err) {
      console.error("Error loading agent configs:", err);
    }
  };

  const handleSaveAgentSettings = async (enabled: boolean, siteId: string) => {
    setIsSavingAgent(true);
    try {
      const res = await fetch(`${API_URL}/api/model-configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_enabled: enabled ? "true" : "false",
          agent_site_id: siteId,
        }),
      });
      if (res.ok) {
        toast.success(`Cloud Print Agent updated! (Enabled: ${enabled ? "YES" : "NO"}, Site: ${siteId})`);
        window.dispatchEvent(new Event("storage"));
      } else {
        toast.error("Failed to update Agent settings");
      }
    } catch (err) {
      toast.error("Error saving Agent settings");
    } finally {
      setIsSavingAgent(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      setLoading(true);
      await fetch(`${API_URL}/api/init-db`, { method: "POST" }).catch(() => {});
      const res = await fetch(`${API_URL}/api/printers`);
      if (res.ok) {
        const data = await res.json();
        setPrinters(Array.isArray(data) ? data : []);
      } else {
        toast.error("Failed to fetch printers from backend");
      }
    } catch (err) {
      toast.error("Failed to connect to printer server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
    loadAgentConfigs();
  }, []);

  const openAddModal = () => {
    setEditingPrinter(null);
    setNewPrinter({ name: "", ip_address: "", site_id: agentSiteId || "SITE-001", type: "ZEBRA" });
    setShowAddModal(true);
  };

  const openEditModal = (printer: PrinterData) => {
    setEditingPrinter(printer);
    setNewPrinter({
      name: printer.name,
      ip_address: printer.ip_address,
      site_id: printer.site_id,
      type: printer.type,
    });
    setShowAddModal(true);
  };

  const handleAddOrEditPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPrinter) {
        // UPDATE existing printer
        const res = await fetch(`${API_URL}/api/printers/${editingPrinter.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPrinter),
        });
        if (res.ok) {
          toast.success("Printer updated successfully");
          setShowAddModal(false);
          setEditingPrinter(null);
          fetchPrinters();
        } else {
          toast.error("Failed to update printer");
        }
      } else {
        // CREATE new printer
        const res = await fetch(`${API_URL}/api/printers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPrinter),
        });
        if (res.ok) {
          toast.success("Printer added successfully");
          setShowAddModal(false);
          fetchPrinters();
        } else {
          toast.error("Failed to add printer");
        }
      }
    } catch (err) {
      toast.error(editingPrinter ? "Error updating printer" : "Error adding printer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeletePrinter = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await fetch(`${API_URL}/api/printers/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("Printer deleted");
      fetchPrinters();
      if (selected?.id === deleteTarget.id) setSelected(null);
    } catch (err) {
      toast.error("Error deleting printer");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const testPrint = async (printer: PrinterData) => {
    try {
      const testZpl =
        "^XA" +
        "^FO50,50^A0N,50,50^FDMyFormsAI Test Print^FS" +
        "^FO50,120^ADN,36,20^FDPrinter Name - " + printer.name + "^FS" +
        "^XZ";
      const res = await fetch(`${API_URL}/api/print-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printer_id: printer.id,
          site_id: printer.site_id,
          payload: testZpl,
          copies: 1,
        }),
      });
      if (res.ok) {
        toast.success(`Test print job queued for site '${printer.site_id}'!`);
      } else {
        toast.error("Failed to queue test job");
      }
    } catch (err) {
      toast.error("Failed to queue test job");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in relative min-h-[calc(100vh-120px)] font-body">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Printers</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Managed output destinations & Local Cloud Print Agent
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPrinters}
            className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-all"
          >
            <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body shadow-md"
            style={{ background: "hsl(var(--accent))", color: "white" }}
          >
            <Plus size={16} />
            Add Printer
          </button>
        </div>
      </div>

      {/* Cloud Print Agent Control Banner */}
      <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", agentEnabled ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-400")}>
              <Wifi size={20} className={agentEnabled ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-foreground">Local Cloud Print Agent</h3>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider", agentEnabled ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border border-slate-200")}>
                  {agentEnabled ? "● Agent Active & Polling" : "○ Agent Inactive"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Keep this browser active on your office WiFi to automatically process site print jobs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agentEnabled}
                onChange={(e) => {
                  const val = e.target.checked;
                  setAgentEnabled(val);
                  handleSaveAgentSettings(val, agentSiteId);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
            <span className="text-xs font-bold text-foreground">{agentEnabled ? "Agent ON" : "Agent OFF"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-foreground">Active Site ID:</span>
            <input
              type="text"
              value={agentSiteId}
              onChange={(e) => setAgentSiteId(e.target.value)}
              placeholder="SITE-001"
              className="px-3 py-1.5 text-xs rounded-xl border border-border bg-background text-foreground font-mono font-medium focus:outline-none focus:ring-2 focus:ring-accent/30 w-36"
            />
            <button
              onClick={() => handleSaveAgentSettings(agentEnabled, agentSiteId)}
              disabled={isSavingAgent}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-bold hover:opacity-90 transition-all shadow-xs flex items-center gap-1.5"
            >
              {isSavingAgent ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={14} />}
              Save Site Config
            </button>
          </div>

          <button
            onClick={async () => {
              try {
                const res = await fetch(`${API_URL}/api/print-job`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    site_id: agentSiteId,
                    payload: `TEST_PRINT_JOB_${Date.now()}`,
                    copies: 1,
                  }),
                });
                if (res.ok) {
                  toast.success(`Queued test job for site ${agentSiteId}!`);
                } else {
                  toast.error("Failed to queue test job");
                }
              } catch (err) {
                toast.error("Error queueing test job");
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-all flex items-center gap-1.5"
          >
            <Play size={12} />
            Send Agent Test Job
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 size={40} className="animate-spin mb-4 text-accent" />
          <p className="text-sm font-semibold">Loading printers...</p>
        </div>
      ) : printers.length === 0 ? (
        <div className="card-elevated p-20 text-center">
          <Printer size={48} className="mx-auto text-muted mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">No printers configured</h3>
          <p className="text-sm text-muted-foreground mt-1">Add your first local printer to start cloud printing.</p>
          <button
            onClick={openAddModal}
            className="mt-6 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "hsl(var(--primary))", color: "white" }}
          >
            Connect Printer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {printers.map((p) => (
            <div
              key={p.id}
              className={cn("card-elevated p-5 space-y-4 cursor-pointer transition-all hover:scale-[1.01]")}
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

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">IP Address</span>
                  <span className="font-mono text-foreground font-medium">{p.ip_address}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Site / Agent</span>
                  <span className="badge-neutral">{p.site_id}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-body flex-1 justify-center transition-all shadow-sm"
                  style={{ background: "hsl(var(--accent))", color: "white" }}
                  onClick={(e) => { e.stopPropagation(); testPrint(p); }}
                >
                  <Play size={11} />
                  Test Print
                </button>
                <button
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  onClick={(e) => { e.stopPropagation(); openEditModal(p); }}
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div className="card-elevated p-5 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">{selected.name} — Performance Metrics</h2>
              <p className="text-xs text-muted-foreground">Historical utilization data from {selected.site_id}</p>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">{selected.ip_address}</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={usageData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Manrope", fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted)/0.3)' }} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px", boxShadow: 'var(--shadow-card)' }} />
              <Bar dataKey="jobs" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Jobs Printed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">Delete Printer</h2>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget.name}</span>?
            </p>
            <p className="text-xs text-muted-foreground mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-11 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePrinter}
                disabled={isDeleting}
                className="flex-1 h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-destructive text-white hover:bg-destructive/90 transition-colors"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Printer Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold">
                {editingPrinter ? "Edit Printer" : "Configure Cloud Printer"}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setEditingPrinter(null); }}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddOrEditPrinter} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Printer Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Warehouse A — South Zebra"
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  value={newPrinter.name}
                  onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Local IP Address</label>
                  <input
                    required
                    type="text"
                    placeholder="192.168.1.100"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                    value={newPrinter.ip_address}
                    onChange={(e) => setNewPrinter({ ...newPrinter, ip_address: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Agent Site ID</label>
                  <input
                    required
                    type="text"
                    placeholder="SITE-001"
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                    value={newPrinter.site_id}
                    onChange={(e) => setNewPrinter({ ...newPrinter, site_id: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Printer Type</label>
                <select
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                  value={newPrinter.type}
                  onChange={(e) => setNewPrinter({ ...newPrinter, type: e.target.value })}
                >
                  <option value="ZEBRA">Zebra (ZPL)</option>
                  <option value="EPSON">Epson (ESC/P)</option>
                  <option value="GENERIC_PDF">Generic PDF (CUPS)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingPrinter(null); }}
                  className="flex-1 h-11 rounded-xl border border-border font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmitting}
                  type="submit"
                  className="flex-1 h-11 rounded-xl font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
                  style={{ background: "hsl(var(--accent))", color: "white" }}
                >
                  {isSubmitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editingPrinter ? (
                    "Save Changes"
                  ) : (
                    "Save Printer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}