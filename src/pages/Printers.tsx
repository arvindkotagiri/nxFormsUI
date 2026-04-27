import { useState, useEffect } from "react";
import { Printer, Plus, Play, Settings, RefreshCw, Trash2, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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
  
  const [newPrinter, setNewPrinter] = useState({
    name: "",
    ip_address: "",
    site_id: "SITE-001",
    type: "ZEBRA"
  });

  const fetchPrinters = async () => {
    try {
      setLoading(true);
      // Ensure DB tables exist
      await fetch("http://localhost:5050/api/init-db", { method: "POST" });
      
      const res = await fetch("http://localhost:5050/api/printers");
      const data = await res.json();
      setPrinters(data);
    } catch (err) {
      toast.error("Failed to fetch printers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrinters();
  }, []);

  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:5050/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPrinter),
      });
      if (res.ok) {
        toast.success("Printer added successfully");
        setShowAddModal(false);
        fetchPrinters();
      }
    } catch (err) {
      toast.error("Error adding printer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePrinter = async (id: string) => {
    if (!confirm("Are you sure you want to delete this printer?")) return;
    try {
      await fetch(`http://localhost:5050/api/printers/${id}`, { method: "DELETE" });
      toast.success("Printer deleted");
      fetchPrinters();
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      toast.error("Error deleting printer");
    }
  };

  const testPrint = async (printer: PrinterData) => {
    try {
      const testZpl = "^XA^FO50,50^A0N,50,50^FDTest Print^FS^FO50,120^ADN,36,20^FDPrinter: " + printer.name + "^FS^XZ";
      const res = await fetch("http://localhost:5050/api/print-zpl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printer_id: printer.id,
          site_id: printer.site_id,
          payload: testZpl,
          copies: 1
        }),
      });
      if (res.ok) {
        toast.success("Test job queued successfully");
      }
    } catch (err) {
      toast.error("Failed to queue test job");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in relative min-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Printers</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Managed output destinations & Cloud Print status
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
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body shadow-md"
            style={{ background: "hsl(var(--accent))", color: "white" }}
          >
            <Plus size={16} />
            Add Printer
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 size={40} className="animate-spin mb-4" />
          <p>Loading printers...</p>
        </div>
      ) : printers.length === 0 ? (
        <div className="card-elevated p-20 text-center">
          <Printer size={48} className="mx-auto text-muted mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">No printers configured</h3>
          <p className="text-sm text-muted-foreground mt-1">Add your first local printer to start cloud printing.</p>
          <button
            onClick={() => setShowAddModal(true)}
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
                  onClick={(e) => { e.stopPropagation(); deletePrinter(p.id); }}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  onClick={(e) => e.stopPropagation()}
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

      {/* Add Printer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold">Configure Cloud Printer</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPrinter} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                  onClick={() => setShowAddModal(false)}
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
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Save Printer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

