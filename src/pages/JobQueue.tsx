import { useEffect, useState, useMemo } from "react";
import {
  Search,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Eye,
  ListOrdered,
  Printer,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_NODE_API || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/node` : "http://localhost:4000");

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED" || s === "SUCCESS")
    return <span className="badge-success">● Completed</span>;
  if (s === "FAILED")
    return <span className="badge-error">● Failed</span>;
  if (s === "PROCESSING")
    return <span className="badge-warning animate-pulse">◌ Processing</span>;
  return <span className="badge-neutral">● Pending</span>;
}

export default function JobQueue() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [detailJob, setDetailJob] = useState<any | null>(null);

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/print-jobs`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setJobs(data);
      }
    } catch (err: any) {
      console.error("Error fetching job queue:", err);
      toast.error(`Failed to load job queue: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 8000); // Auto refresh every 8s
    return () => clearInterval(interval);
  }, []);

  const handleRetryJob = async (jobId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/print-jobs/${jobId}/retry`, {
        method: "POST"
      });
      if (res.ok) {
        toast.success(`Re-queued job ${jobId.substring(0, 8)}`);
        fetchJobs();
      } else {
        toast.error("Failed to retry job");
      }
    } catch (err: any) {
      toast.error(`Retry error: ${err.message}`);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/print-jobs/${jobId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success(`Deleted job ${jobId.substring(0, 8)}`);
        fetchJobs();
        if (detailJob?.id === jobId) setDetailJob(null);
      } else {
        toast.error("Failed to delete job");
      }
    } catch (err: any) {
      toast.error(`Delete error: ${err.message}`);
    }
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      const matchSearch =
        (j.id || "").toLowerCase().includes(search.toLowerCase()) ||
        (j.site_id || "").toLowerCase().includes(search.toLowerCase()) ||
        (j.printer_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (j.error_msg || "").toLowerCase().includes(search.toLowerCase());
      
      const s = (j.status || "").toUpperCase();
      let matchStatus = true;
      if (statusFilter === "PENDING") matchStatus = s === "PENDING";
      else if (statusFilter === "PROCESSING") matchStatus = s === "PROCESSING";
      else if (statusFilter === "COMPLETED") matchStatus = s === "COMPLETED" || s === "SUCCESS";
      else if (statusFilter === "FAILED") matchStatus = s === "FAILED";

      return matchSearch && matchStatus;
    });
  }, [jobs, search, statusFilter]);

  const stats = useMemo(() => {
    let pending = 0, processing = 0, completed = 0, failed = 0;
    jobs.forEach((j) => {
      const s = (j.status || "").toUpperCase();
      if (s === "PENDING") pending++;
      else if (s === "PROCESSING") processing++;
      else if (s === "COMPLETED" || s === "SUCCESS") completed++;
      else if (s === "FAILED") failed++;
    });
    return { total: jobs.length, pending, processing, completed, failed };
  }, [jobs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-accent" /> Job Queue
          </h1>
          <p className="text-sm font-body text-muted-foreground mt-0.5">
            Operations console — real-time print agent job queue & status monitoring
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border transition-all cursor-pointer"
        >
          <RefreshCw size={13} className={cn(isLoading && "animate-spin")} /> Refresh Queue
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-body">Total Jobs</span>
          <div className="text-xl font-bold font-mono text-foreground">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-body">Pending</span>
          <div className="text-xl font-bold font-mono text-amber-500">{stats.pending}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-body">Processing</span>
          <div className="text-xl font-bold font-mono text-blue-500">{stats.processing}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-body">Completed</span>
          <div className="text-xl font-bold font-mono text-emerald-500">{stats.completed}</div>
        </div>
        <div className="p-4 rounded-2xl bg-card border border-border space-y-1">
          <span className="text-xs text-muted-foreground font-body">Failed</span>
          <div className="text-xl font-bold font-mono text-rose-500">{stats.failed}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-card rounded-2xl border border-border shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Job ID, Site ID, Printer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
          {["ALL", "PENDING", "PROCESSING", "COMPLETED", "FAILED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                statusFilter === st
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Data Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Job ID</th>
                <th className="px-4 py-3">Site ID</th>
                <th className="px-4 py-3">Target Printer</th>
                <th className="px-4 py-3">Copies</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created On</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground font-body">
                    {isLoading ? (
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-accent" /> Loading queued jobs...
                      </div>
                    ) : (
                      "No print jobs found in queue."
                    )}
                  </td>
                </tr>
              ) : (
                filteredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-foreground">
                      {j.id ? j.id.substring(0, 13) : "—"}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-secondary text-secondary-foreground border border-border">
                        {j.site_id || "DEFAULT_SITE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground font-body">
                      {j.printer_name ? `${j.printer_name} (${j.printer_ip})` : j.printer_id || "Default Agent Printer"}
                    </td>
                    <td className="px-4 py-3 font-mono text-center">{j.copies || 1}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={j.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                      {j.created_on ? new Date(j.created_on).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailJob(j)}
                          title="View Job Details"
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleRetryJob(j.id)}
                          title="Re-queue Job"
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(j.id)}
                          title="Delete Job"
                          className="p-1.5 rounded-lg hover:bg-secondary text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Detail Modal */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setDetailJob(null)} />
          <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-elevated-lg overflow-hidden border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                <Printer className="w-4 h-4 text-accent" /> Job Details: <span className="font-mono">{detailJob.id}</span>
              </h3>
              <button onClick={() => setDetailJob(null)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                <XCircle size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                  <span className="text-muted-foreground font-body">Site ID</span>
                  <div className="font-mono font-semibold text-foreground">{detailJob.site_id || "DEFAULT_SITE"}</div>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                  <span className="text-muted-foreground font-body">Status</span>
                  <div><StatusBadge status={detailJob.status} /></div>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                  <span className="text-muted-foreground font-body">Copies</span>
                  <div className="font-mono text-foreground">{detailJob.copies || 1}</div>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                  <span className="text-muted-foreground font-body">Created At</span>
                  <div className="font-mono text-foreground">{detailJob.created_on ? new Date(detailJob.created_on).toLocaleString() : "—"}</div>
                </div>
              </div>

              {detailJob.error_msg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1 text-xs">
                  <span className="font-semibold text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={13} /> Error Trace:
                  </span>
                  <p className="font-mono text-rose-600 dark:text-rose-400 whitespace-pre-wrap">{detailJob.error_msg}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-foreground font-body">Payload Content</span>
                <pre className="p-4 rounded-xl text-xs font-mono bg-primary text-primary-foreground max-h-64 overflow-auto whitespace-pre-wrap">
                  {detailJob.payload}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
              <button
                onClick={() => handleDeleteJob(detailJob.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
              >
                Delete Job
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { handleRetryJob(detailJob.id); setDetailJob(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-all shadow-xs"
                >
                  Re-queue Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
