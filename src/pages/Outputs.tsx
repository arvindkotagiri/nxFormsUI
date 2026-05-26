import { useEffect, useState, useMemo, useRef } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
const API_URL = import.meta.env.VITE_NODE_API;

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

function getTableColumns(onViewDetail: (o: any) => void): TableColumn[] {
  return [
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
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <Eye size={14} />
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
  "outputNumber",
  "evt_no",
  "formId",
  "printer",
  "format",
  "status",
  "retries",
  "duration",
  "actions",
];

function compareOutputs(a: any, b: any, key: SortKey, dir: SortDir): number {
  const av = a[key];
  const bv = b[key];
  let cmp = 0;

  if (key === "outputNumber") {
    const an = Number(av);
    const bn = Number(bv);
    cmp =
      !Number.isNaN(an) && !Number.isNaN(bn)
        ? an - bn
        : String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
          numeric: true,
        });
  } else {
    cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
      numeric: true,
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
  const [sortKey, setSortKey] = useState<SortKey>("outputNumber");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<ColumnId>>(
    () => new Set(ALL_COLUMN_IDS),
  );
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  const tableColumns = getTableColumns(setDetailOutput);
  const visibleColumns = tableColumns.filter((c) => visibleColumnIds.has(c.id));
  const allColumnsVisible = visibleColumnIds.size === ALL_COLUMN_IDS.length;

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const outputsPerPage = 10;
  const visiblePages = 5;

  useEffect(() => {
    fetch(`${API_URL}/outputs`)
      .then((res) => res.json())
      .then((data) => setOutputs(data))
      .catch((err) => console.error(err));
  }, []);

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

  const totalPages = Math.ceil(sorted.length / outputsPerPage);

  const paginatedOutputs = sorted.slice(
    (currentPage - 1) * outputsPerPage,
    currentPage * outputsPerPage,
  );

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
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-elevated-lg"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setDetailOutput(null)}
          />
          <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-elevated-lg overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-display text-lg font-semibold text-foreground">
                {detailOutput.id}
              </h3>
              <button
                onClick={() => setDetailOutput(null)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
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
                <pre
                  className="p-4 rounded-xl text-xs font-mono max-h-[400px] w-full overflow-auto whitespace-pre-wrap break-words"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                  }}
                >
                  {detailOutput.errorMessage
                    ? detailOutput.errorMessage
                    : detailOutput.renderedOutput}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
