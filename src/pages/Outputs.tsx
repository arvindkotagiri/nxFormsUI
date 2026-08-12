import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { legacyApiUrl } from "@/lib/legacyApiBase";
import {
  Search,
  Filter,
  RotateCcw,
  GitBranch,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Download,
  Columns3,
  Printer,
  Check,
  Settings,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
const API_URL = import.meta.env.VITE_NODE_API || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}/node` : "http://localhost:4000");

function StatusBadge({ status }: { status: string }) {
  if (status === "Success")
    return <span className="badge-success">● Success</span>;
  if (status === "Failed") return <span className="badge-error">● Failed</span>;
  if (status === "Pending")
    return <span className="badge-warning">◌ Pending</span>;
  return <span className="badge-neutral">{status}</span>;
}

const OUTPUT_TABS = [
  "Overview",
  "Document JSON",
  "Template Mapping",
  "Raw Output",
];

type SortKey =
  | "outputNumber"
  | "evt_no"
  | "formId"
  | "printer"
  | "format"
  | "status";
type SortDir = "asc" | "desc";
type ColumnId =
  | "outputNumber"
  | "evt_no"
  | "formId"
  | "printer"
  | "format"
  | "status"
  | "retries"
  | "duration"
  | "actions";

type TableColumn = {
  id: ColumnId;
  label: string;
  sortKey?: SortKey;
  render: (o: any) => React.ReactNode;
};

function getTableColumns(
  onViewDetail: (o: any) => void,
  onOpenPrintConfig: (o: any) => void
): TableColumn[] {
  return [
    {
      id: "evt_no",
      label: "Event No",
      sortKey: "evt_no",
      render: (o) => (
        <span className="font-mono text-xs text-muted-foreground">
          {o.evt_no}
        </span>
      ),
    },
    {
      id: "outputNumber",
      label: "Output Number",
      sortKey: "outputNumber",
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {o.outputNumber}
        </span>
      ),
    },
    {
      id: "formId",
      label: "Form ID",
      sortKey: "formId",
      render: (o) => (
        <span className="font-mono text-xs text-muted-foreground">
          {o.formId}
        </span>
      ),
    },
    {
      id: "printer",
      label: "Printer",
      sortKey: "printer",
      render: (o) => <span className="text-foreground">{o.printer}</span>,
    },
    {
      id: "format",
      label: "Format",
      sortKey: "format",
      render: (o) => <span className="badge-neutral">{o.format}</span>,
    },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      render: (o) => <StatusBadge status={o.status} />,
    },
    {
      id: "retries",
      label: "Retries",
      render: (o) => (
        <span
          className="text-center text-xs font-semibold"
          style={{
            color:
              o.retries > 0
                ? "hsl(var(--accent))"
                : "hsl(var(--muted-foreground))",
          }}
        >
          {o.retries}
        </span>
      ),
    },
    {
      id: "duration",
      label: "Duration",
      render: (o) => (
        <span className="text-muted-foreground text-xs">{o.duration}</span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (o) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewDetail(o)}
            title="View Output Details"
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => onOpenPrintConfig(o)}
            title="Configure Print & Send Job"
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Printer size={14} />
          </button>
          {o.status === "Failed" && (
            <>
              <button
                className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: "hsl(var(--accent))",
                  color: "hsl(var(--accent-foreground))",
                }}
              >
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
      ),
    },
  ];
}

const ALL_COLUMN_IDS: ColumnId[] = [
  "evt_no",
  "outputNumber",
  "formId",
  "printer",
  "format",
  "status",
  "retries",
  "duration",
  "actions",
];

function parseNumericPart(val: any): number {
  if (val === null || val === undefined) return -Infinity;
  if (typeof val === "number") return val;
  const matches = String(val).match(/\d+/);
  return matches ? parseInt(matches[0], 10) : -Infinity;
}

function compareOutputs(a: any, b: any, key: SortKey, dir: SortDir): number {
  let cmp = 0;

  if (key === "evt_no" || key === "outputNumber") {
    const numA = parseNumericPart(a[key]);
    const numB = parseNumericPart(b[key]);

    if (numA !== numB) {
      cmp = numA - numB;
    } else {
      const secondaryKey = key === "evt_no" ? "outputNumber" : "evt_no";
      const secA = parseNumericPart(a[secondaryKey]);
      const secB = parseNumericPart(b[secondaryKey]);
      cmp = secA - secB;
    }
  } else {
    cmp = String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  return dir === "asc" ? cmp : -cmp;
}

export default function Outputs() {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [detailOutput, setDetailOutput] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [outputs, setOutputs] = useState<any[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("evt_no");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<ColumnId>>(
    () => new Set(ALL_COLUMN_IDS),
  );
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Print Configuration Modal state
  const [printModalOutput, setPrintModalOutput] = useState<any | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [siteId, setSiteId] = useState<string>("DEFAULT_SITE");
  const [copies, setCopies] = useState<number>(1);
  const [printMode, setPrintMode] = useState<"agent" | "direct" | "browser">("agent");
  const [isSubmittingPrint, setIsSubmittingPrint] = useState<boolean>(false);

  const handleViewDetail = async (outputItem: any) => {
    setDetailOutput(outputItem);
    if (!outputItem.renderedOutput && outputItem.id) {
      try {
        const res = await fetch(legacyApiUrl(`/api/outputs/${outputItem.id}`));
        if (res.ok) {
          const fullData = await res.json();
          setDetailOutput(fullData);
        }
      } catch (err) {
        console.error("Error fetching detail output payload:", err);
      }
    }
  };

  const handleOpenPrintConfig = async (outputItem: any) => {
    setPrintModalOutput(outputItem);
    fetch(legacyApiUrl('/api/printers'))
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailablePrinters(data);
          if (data.length > 0) setSelectedPrinterId(data[0].id);
        }
      })
      .catch((err) => console.error("Error fetching printers:", err));

    if (!outputItem.renderedOutput && outputItem.id) {
      try {
        const res = await fetch(legacyApiUrl(`/api/outputs/${outputItem.id}`));
        if (res.ok) {
          const fullData = await res.json();
          setPrintModalOutput(fullData);
        }
      } catch (err) {
        console.error("Error fetching print output payload:", err);
      }
    }
  };

  const handleSendPrintJob = async () => {
    if (!printModalOutput) return;
    setIsSubmittingPrint(true);

    try {
      if (printMode === "browser") {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          toast.error("Please allow popups to print.");
          setIsSubmittingPrint(false);
          return;
        }
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Output_${printModalOutput.outputNumber || printModalOutput.id}</title>
              <style>
                @page { margin: 0; size: auto; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { margin: 0; padding: 0; }
                .main-table th { background-color: #000 !important; color: #fff !important; }
              </style>
            </head>
            <body>
              ${printModalOutput.renderedOutput || ""}
              <script>window.onload = function() { window.print(); };</script>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success("Opened native print dialog!");
        setPrintModalOutput(null);
      } else if (printMode === "direct") {
        const selectedPrinter = availablePrinters.find((p) => p.id === selectedPrinterId);
        const res = await fetch(`${API_URL}/api/direct-print`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ip_address: selectedPrinter?.ip_address || "127.0.0.1",
            payload: printModalOutput.renderedOutput || "",
            port: 9100,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success("Direct socket print command sent!");
          setPrintModalOutput(null);
        } else {
          toast.error(`Direct print failed: ${data.error || "Unknown error"}`);
        }
      } else {
        // Default: Print Agent Queue
        const res = await fetch(`${API_URL}/api/print-job`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            printer_id: selectedPrinterId || null,
            site_id: siteId || "DEFAULT_SITE",
            payload: printModalOutput.renderedOutput || "",
            copies: copies,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Print job queued for agent at site '${siteId}' (Job ID: ${data.job_id || "OK"})`);
          setPrintModalOutput(null);
        } else {
          toast.error(`Failed to queue print job: ${data.error || "Unknown error"}`);
        }
      }
    } catch (err: any) {
      toast.error(`Print error: ${err.message}`);
    } finally {
      setIsSubmittingPrint(false);
    }
  };

  const tableColumns = getTableColumns(handleViewDetail, handleOpenPrintConfig);
  const visibleColumns = tableColumns.filter((c) => visibleColumnIds.has(c.id));
  const allColumnsVisible = visibleColumnIds.size === ALL_COLUMN_IDS.length;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const outputsPerPage = 10;
  const visiblePages = 5;

  const [totalOutputsCount, setTotalOutputsCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOutputs = useCallback(async () => {
    try {
      const url = legacyApiUrl(
        `/api/outputs?paginated=true&page=${currentPage}&limit=${outputsPerPage}&search=${encodeURIComponent(search)}`
      );
      const res = await fetch(url);
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        setOutputs(data.data);
        setTotalOutputsCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(data)) {
        setOutputs(data);
        setTotalOutputsCount(data.length);
        setTotalPages(Math.ceil(data.length / outputsPerPage) || 1);
      }
    } catch (err) {
      console.error("Error fetching outputs:", err);
    }
  }, [currentPage, outputsPerPage, search]);

  useEffect(() => {
    fetchOutputs();
    const interval = setInterval(fetchOutputs, 4000);
    return () => clearInterval(interval);
  }, [fetchOutputs]);

  const filtered = useMemo(
    () =>
      outputs.filter(
        (o) =>
          o.id.toLowerCase().includes(search.toLowerCase()) ||
          o.evt_no.toLowerCase().includes(search.toLowerCase()) ||
          o.formId.toLowerCase().includes(search.toLowerCase()),
      ),
    [outputs, search],
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => compareOutputs(a, b, sortKey, sortDir));
    return list;
  }, [filtered, sortKey, sortDir]);

  const paginatedOutputs = sorted;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    let start = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let end = Math.min(totalPages, start + visiblePages - 1);
    if (end - start < visiblePages - 1) {
      start = Math.max(1, end - visiblePages + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortKey, sortDir]);

  useEffect(() => {
    if (!columnPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        columnPickerRef.current &&
        !columnPickerRef.current.contains(e.target as Node)
      ) {
        setColumnPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [columnPickerOpen]);

  const toggleColumn = (id: ColumnId) => {
    setVisibleColumnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const showAllColumns = () => setVisibleColumnIds(new Set(ALL_COLUMN_IDS));

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const allSelected =
    selected.length === filtered.length && filtered.length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Outputs
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Operations console — all output records
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-body text-muted-foreground hover:text-foreground transition-all">
          <Download size={14} />
          Export
        </button>
      </div>

      {/* Table card */}
      <div className="card-elevated overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/40">
          <div className="relative flex-1 max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
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
          <div className="relative" ref={columnPickerRef}>
            <button
              type="button"
              onClick={() => setColumnPickerOpen((o) => !o)}
              className={cn(
                "pill-filter",
                columnPickerOpen && "ring-2 ring-accent/30",
                !allColumnsVisible && "text-foreground",
              )}
            >
              <Columns3 size={12} />
              Columns
              {!allColumnsVisible && (
                <span className="ml-0.5 text-[10px] font-semibold text-accent">
                  ({visibleColumnIds.size})
                </span>
              )}
              <ChevronDown
                size={12}
                className={cn(
                  "transition-transform",
                  columnPickerOpen && "rotate-180",
                )}
              />
            </button>
            {columnPickerOpen && (
              <div className="absolute left-0 top-full mt-2 z-20 w-56 rounded-xl border border-border bg-card shadow-elevated-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Show columns
                  </span>
                  <button
                    type="button"
                    onClick={showAllColumns}
                    disabled={allColumnsVisible}
                    className="text-xs text-accent hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    Select all
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {tableColumns.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/60 cursor-pointer text-sm font-body"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumnIds.has(col.id)}
                        onChange={() => toggleColumn(col.id)}
                        className="rounded"
                      />
                      <span className="text-foreground">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="ml-auto text-xs text-muted-foreground font-body">
            {filtered.length} records
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead>
              <tr
                className="border-b border-border"
                style={{ background: "hsl(var(--secondary))" }}
              >
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
                {visibleColumns.map(({ id, label, sortKey: key }) =>
                  key ? (
                    <th key={id} className="px-4 py-3 text-left">
                      <button
                        type="button"
                        onClick={() => handleSort(key)}
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors",
                          sortKey === key
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                        {sortKey === key ? (
                          sortDir === "asc" ? (
                            <ChevronUp size={14} className="shrink-0" />
                          ) : (
                            <ChevronDown size={14} className="shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown
                            size={13}
                            className="shrink-0 opacity-40"
                          />
                        )}
                      </button>
                    </th>
                  ) : (
                    <th
                      key={id}
                      className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedOutputs.map((o, i) => (
                <tr
                  key={o.id}
                  className={cn(
                    "border-b border-border table-row-hover transition-colors",
                    i % 2 === 0 ? "bg-card" : "bg-background",
                    selected.includes(o.id) && "bg-accent/5",
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
                  {visibleColumns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      {col.render(o)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground font-body">
            Showing {(currentPage - 1) * outputsPerPage + 1}–
            {Math.min(currentPage * outputsPerPage, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-md border border-border text-xs hover:bg-secondary disabled:opacity-40"
            >
              ‹
            </button>
            {getPageNumbers().map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-7 h-7 rounded-md text-xs",
                  page === currentPage
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded-md border border-border text-xs hover:bg-secondary disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div
          className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 rounded-2xl shadow-elevated-lg w-[calc(100vw-1.5rem)] sm:w-auto max-w-[42rem]"
          style={{
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
          }}
        >
          <span className="text-sm font-body">{selected.length} selected</span>
          <div className="w-px h-4 bg-primary-foreground/20" />
          <button
            className="text-sm font-semibold font-body px-3 py-1 rounded-lg"
            style={{ background: "hsl(var(--accent))", color: "white" }}
          >
            <RotateCcw size={13} className="inline mr-1" /> Retry All
          </button>
          <button className="text-sm font-body opacity-70 hover:opacity-100 transition-opacity">
            Cancel
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detailOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setDetailOutput(null)}
          />
          <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-elevated-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Output - {detailOutput.outputNumber || detailOutput.id}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenPrintConfig(detailOutput)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-all shadow-sm cursor-pointer"
                >
                  <Printer size={13} /> Print Job
                </button>
                <button
                  onClick={() => setDetailOutput(null)}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <XCircle size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-3 sm:px-6 pt-4 overflow-x-auto no-scrollbar">
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

            <div className="p-4 sm:p-6">
              {activeTab === 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ["Output ID", detailOutput.id],
                    ["Event No", detailOutput.evt_no],
                    ["Form ID", detailOutput.formId],
                    ["Printer", detailOutput.printer],
                    ["Format", detailOutput.format],
                    ["Status", detailOutput.status],
                    ["Retries", detailOutput.retries],
                    ["Duration", detailOutput.duration],
                  ].map(([k, v]) => (
                    <div
                      key={String(k)}
                      className="p-3 rounded-xl bg-background"
                    >
                      <div className="text-xs text-muted-foreground font-body mb-1">
                        {k}
                      </div>
                      <div className="text-sm font-semibold text-foreground font-body">
                        {String(v)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 1 && (
                <pre
                  className="p-4 rounded-xl text-xs font-mono overflow-x-auto"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  {JSON.stringify(detailOutput, null, 2)}
                </pre>
              )}
              {activeTab === 2 && (
                <div className="space-y-2">
                  {["header", "footer", "lineItems", "totals", "barcode"].map(
                    (field) => (
                      <div
                        key={field}
                        className="flex items-center justify-between p-3 rounded-xl bg-background text-sm font-body"
                      >
                        <span className="font-mono text-xs text-foreground">
                          {field}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          → template.{field}
                        </span>
                        <span className="badge-success">Mapped</span>
                      </div>
                    ),
                  )}
                </div>
              )}
              {activeTab === 3 && (
                detailOutput.errorMessage ? (
                  <pre
                    className="p-4 rounded-xl text-xs font-mono max-h-[400px] w-full overflow-auto whitespace-pre-wrap break-words"
                    style={{
                      background: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    {detailOutput.errorMessage}
                  </pre>
                ) : (detailOutput.format?.toLowerCase() === "html" || (detailOutput.renderedOutput && detailOutput.renderedOutput.includes("<html"))) ? (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                      <span className="text-xs font-semibold text-muted-foreground font-body">
                        HTML Rendered Preview
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Quick Trigger Print with Site ID */}
                        <div className="flex items-center gap-1 bg-background border border-border p-1 rounded-xl shadow-xs">
                          <span className="text-[10px] font-bold text-muted-foreground px-2 uppercase tracking-wider font-mono">
                            Site ID:
                          </span>
                          <input
                            type="text"
                            value={siteId}
                            onChange={(e) => setSiteId(e.target.value)}
                            placeholder="SITE-01"
                            className="w-28 h-7 text-xs px-2 rounded-lg border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                          <button
                            onClick={async () => {
                              try {
                                const res = await fetch(`${API_URL}/api/print-job`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    printer_id: selectedPrinterId || null,
                                    site_id: siteId || "DEFAULT_SITE",
                                    payload: detailOutput.renderedOutput || "",
                                    copies: copies || 1,
                                  }),
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  toast.success(`Triggered printer! Job queued for Site '${siteId || "DEFAULT_SITE"}' (Job ID: ${data.job_id || "OK"})`);
                                } else {
                                  toast.error(`Print trigger failed: ${data.error || "Unknown error"}`);
                                }
                              } catch (err: any) {
                                toast.error(`Print trigger error: ${err.message}`);
                              }
                            }}
                            className="flex items-center gap-1 px-3 h-7 rounded-lg text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-all shadow-xs cursor-pointer"
                          >
                            <Printer size={13} /> Trigger Printer
                          </button>
                        </div>

                        <button
                          onClick={() => handleOpenPrintConfig(detailOutput)}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all border border-border cursor-pointer"
                          title="Advanced Print Settings"
                        >
                          <Settings size={13} /> Print Configs
                        </button>

                        <button
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) {
                              alert("Please allow popups to download/print PDF.");
                              return;
                            }
                            printWindow.document.write(`
                              <!DOCTYPE html>
                              <html>
                                <head>
                                  <title>Output_${detailOutput.outputNumber || detailOutput.id}</title>
                                  <style>
                                    @page { margin: 0; size: auto; }
                                    * {
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                      color-adjust: exact !important;
                                    }
                                    body { margin: 0; padding: 0; }
                                    .main-table th {
                                      background-color: #000 !important;
                                      color: #fff !important;
                                    }
                                  </style>
                                </head>
                                <body>
                                  ${detailOutput.renderedOutput}
                                  <script>
                                    window.onload = function() {
                                      window.print();
                                    };
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          }}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all border border-border cursor-pointer"
                        >
                          <Download size={13} /> Download PDF
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([detailOutput.renderedOutput], { type: "text/html;charset=utf-8" });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement("a");
                            link.href = url;
                            link.download = `Output_${detailOutput.outputNumber || detailOutput.id}.html`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all border border-border cursor-pointer"
                        >
                          <Download size={13} /> Download HTML
                        </button>
                      </div>
                    </div>
                    <div className="w-full h-[400px] border border-border rounded-xl overflow-hidden bg-white shadow-inner">
                      <iframe
                        srcDoc={detailOutput.renderedOutput}
                        title="HTML Output Preview"
                        className="w-full h-full border-none"
                        sandbox="allow-scripts allow-same-origin"
                      />
                    </div>
                  </div>
                ) : (
                  <pre
                    className="p-4 rounded-xl text-xs font-mono max-h-[400px] w-full overflow-auto whitespace-pre-wrap break-words"
                    style={{
                      background: "hsl(var(--primary))",
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    {detailOutput.renderedOutput}
                  </pre>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Configuration Modal */}
      {printModalOutput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setPrintModalOutput(null)}
          />
          <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-elevated-lg overflow-hidden border border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-accent" />
                <h3 className="font-display text-base font-semibold text-foreground">
                  Print Configuration
                </h3>
              </div>
              <button
                onClick={() => setPrintModalOutput(null)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <XCircle size={16} className="text-muted-foreground" />
              </button>
            </div>

            {/* Content Form */}
            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-background border border-border space-y-1 text-xs">
                <div className="flex justify-between font-body text-muted-foreground">
                  <span>Output Item:</span>
                  <span className="font-mono text-foreground font-semibold">
                    {printModalOutput.outputNumber ? `Output #${printModalOutput.outputNumber}` : printModalOutput.id}
                  </span>
                </div>
                <div className="flex justify-between font-body text-muted-foreground">
                  <span>Event:</span>
                  <span className="font-mono text-foreground">{printModalOutput.evt_no}</span>
                </div>
                <div className="flex justify-between font-body text-muted-foreground">
                  <span>Format:</span>
                  <span className="badge-neutral">{printModalOutput.format}</span>
                </div>
              </div>

              {/* Printer Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-body block">
                  Select Target Printer
                </label>
                {availablePrinters.length > 0 ? (
                  <select
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    className="w-full h-9 text-xs px-3 rounded-lg border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {availablePrinters.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.ip_address || "No IP"}) - {p.type || "Standard"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter Printer Name or ID"
                    value={selectedPrinterId}
                    onChange={(e) => setSelectedPrinterId(e.target.value)}
                    className="w-full h-9 text-xs px-3 rounded-lg border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                )}
              </div>

              {/* Site ID / Agent Identifier */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-body block">
                    Site / Agent ID
                  </label>
                  <input
                    type="text"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    placeholder="e.g. DEFAULT_SITE"
                    className="w-full h-9 text-xs px-3 rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-body block">
                    Copies
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={copies}
                    onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-9 text-xs px-3 rounded-lg border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Print Mode Selection */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-semibold text-foreground font-body block">
                  Print Mode / Agent Pipeline
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintMode("agent")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all",
                      printMode === "agent"
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="text-xs font-body font-semibold">Print Agent</div>
                    <div className="text-[9px] opacity-75 font-body">Queued Agent Job</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintMode("direct")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all",
                      printMode === "direct"
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="text-xs font-body font-semibold">Direct Socket</div>
                    <div className="text-[9px] opacity-75 font-body">Port 9100 Raw IP</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintMode("browser")}
                    className={cn(
                      "p-2.5 rounded-xl border text-left transition-all",
                      printMode === "browser"
                        ? "border-accent bg-accent/10 text-accent font-semibold"
                        : "border-border bg-background text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    <div className="text-xs font-body font-semibold">Browser Print</div>
                    <div className="text-[9px] opacity-75 font-body">Native Dialog</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10">
              <button
                onClick={() => setPrintModalOutput(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendPrintJob}
                disabled={isSubmittingPrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Send size={13} />
                {isSubmittingPrint ? "Sending..." : "Send Print Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
