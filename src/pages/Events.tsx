import { useEffect, useState, useRef, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Eye,
  RotateCcw,
  X,
  Zap,
  Columns3,
} from "lucide-react";
import { cn } from "@/lib/utils";
const API_URL = import.meta.env.VITE_NODE_API;

function StatusBadge({ status }: { status: string }) {
  if (status === "Success") return <span className="badge-success">● Success</span>;
  if (status === "Failed") return <span className="badge-error">● Failed</span>;
  if (status === "Pending") return <span className="badge-warning">◌ Pending</span>;
  return <span className="badge-neutral">{status}</span>;
}

function getEventError(event: Record<string, unknown>): string | null {
  const err =
    event.error ??
    event.error_message ??
    event.event_error ??
    event.errorMessage;
  if (err == null || err === "") return null;
  return String(err);
}

function formatEventPayload(event: Record<string, unknown>): string {
  const raw =
    event.payload ??
    event.document_json ??
    event.data ??
    event.raw_payload ??
    event.request_payload;

  if (raw == null || raw === "") {
    return "—";
  }

  if (typeof raw === "string") {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  return JSON.stringify(raw, null, 2);
}

function formatEvtNo(evtNo: unknown): string {
  if (evtNo == null || evtNo === "") return "—";
  return String(evtNo).replace(/\D/g, "") || String(evtNo);
}

function getEventMetadataRows(event: Record<string, unknown>): [string, string][] {
  const rows: [string, string][] = [
    ["Event No", formatEvtNo(event.evt_no)],
    ["Event ID", String(event.id ?? "—")],
    ["Source", String(event.source ?? "—")],
    ["Context", String(event.context ?? "—")],
  ];

  if (event.form != null && event.form !== "") {
    rows.push(["Form", String(event.form)]);
  }
  if (event.form_id != null && event.form_id !== "") {
    rows.push(["Form ID", String(event.form_id)]);
  }
  if (event.formId != null && event.formId !== "") {
    rows.push(["Form ID", String(event.formId)]);
  }

  rows.push(
    ["Status", String(event.status ?? "—")],
    ["Timestamp", String(event.ts ?? "—")],
    ["Duration", String(event.duration ?? "—")],
    ["Outputs", String(event.outputs ?? "—")],
  );

  if (event.event_type != null && event.event_type !== "") {
    rows.push(["Event Type", String(event.event_type)]);
  }
  if (event.triggered_by != null && event.triggered_by !== "") {
    rows.push(["Triggered By", String(event.triggered_by)]);
  }
  if (event.source_system != null && event.source_system !== "") {
    rows.push(["Source System", String(event.source_system)]);
  }

  return rows;
}

type ColumnId =
  | "evt_no"
  | "id"
  | "source"
  | "context"
  | "status"
  | "created_by"
  | "ts"
  | "duration"
  | "outputs"
  | "actions";

type SortKey = "evt_no" | "id" | "source" | "context" | "status" | "created_by" | "ts";
type SortDir = "asc" | "desc";

type TableColumn = {
  id: ColumnId;
  label: string;
  sortKey?: SortKey;
  render: (e: any) => React.ReactNode;
};

function compareEvents(a: any, b: any, key: SortKey, dir: SortDir): number {
  const av = a[key];
  const bv = b[key];
  let cmp = 0;

  if (key === "evt_no") {
    const an = Number(String(av ?? "").replace(/\D/g, ""));
    const bn = Number(String(bv ?? "").replace(/\D/g, ""));
    cmp =
      !Number.isNaN(an) && !Number.isNaN(bn) && (an !== 0 || bn !== 0)
        ? an - bn
        : String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
  } else {
    cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
  }

  return dir === "asc" ? cmp : -cmp;
}

function getTableColumns(onViewDetail: (e: any) => void): TableColumn[] {
  return [
    {
      id: "evt_no",
      label: "Event No",
      sortKey: "evt_no",
      render: (e) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {e.evt_no?.replace(/\D/g, "") ?? e.evt_no}
        </span>
      ),
    },
    {
      id: "id",
      label: "Event ID",
      sortKey: "id",
      render: (e) => (
        <span className="font-mono text-xs font-semibold text-foreground">{e.id}</span>
      ),
    },
    {
      id: "source",
      label: "Source",
      sortKey: "source",
      render: (e) => <span className="text-foreground">{e.source}</span>,
    },
    {
      id: "context",
      label: "Context",
      sortKey: "context",
      render: (e) => <span className="text-foreground">{e.context}</span>,
    },
    // {
    //   id: "form",
    //   label: "Form",
    //   render: (e) => (
    //     <span className="text-muted-foreground font-mono text-xs">{e.form ?? "—"}</span>
    //   ),
    // },
    {
      id: "status",
      label: "Status",
      sortKey: "status",
      render: (e) => <StatusBadge status={e.status} />,
    },
    {
      id: "created_by",
      label: "Created By",
      sortKey: "created_by",
      render: (e) => <span className="text-muted-foreground text-xs">{e.created_by ?? "—"}</span>
    },
    {
      id: "ts",
      label: "Timestamp",
      sortKey: "ts",
      render: (e) => <span className="text-muted-foreground text-xs">{e.ts}</span>,
    },
    {
      id: "duration",
      label: "Duration",
      render: (e) => <span className="text-muted-foreground text-xs">{e.duration}</span>,
    },
    {
      id: "outputs",
      label: "Outputs",
      render: (e) => (
        <span className="text-center font-semibold text-xs text-foreground">{e.outputs}</span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (e) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onViewDetail(e)}
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
      ),
    },
  ];
}

const ALL_COLUMN_IDS: ColumnId[] = [
  "evt_no",
  "id",
  "source",
  "context",
  // "form",
  "status",
  "created_by",
  "ts",
  "duration",
  "outputs",
  "actions",
];

export default function Events() {
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumnIds, setVisibleColumnIds] = useState<Set<ColumnId>>(
    () => new Set(ALL_COLUMN_IDS),
  );
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("ts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const eventsPerPage = 10;

  const tableColumns = getTableColumns(setSelectedEvent);
  const visibleColumns = tableColumns.filter((c) => visibleColumnIds.has(c.id));
  const allColumnsVisible = visibleColumnIds.size === ALL_COLUMN_IDS.length;

  useEffect(() => {
    fetch(`${API_URL}/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data))
      .catch((err) => console.error(err));
  }, []);

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          e.id.toLowerCase().includes(search.toLowerCase()) ||
          e.source.toLowerCase().includes(search.toLowerCase()) ||
          e.context.toLowerCase().includes(search.toLowerCase()) ||
          e.evt_no?.toString().toLowerCase().includes(search.toLowerCase()),
      ),
    [events, search],
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => compareEvents(a, b, sortKey, sortDir));
    return list;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / eventsPerPage);

  const paginatedEvents = sorted.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage,
  );

  const visiblePages = 5;

  const getPageNumbers = () => {
    const pages = [];

    let start = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let end = Math.min(totalPages, start + visiblePages - 1);

    if (end - start < visiblePages - 1) {
      start = Math.max(1, end - visiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  useEffect(() => {
    if (!columnPickerOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(e.target as Node)) {
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Events
          </h1>
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
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
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
                className={cn("transition-transform", columnPickerOpen && "rotate-180")}
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
            {filtered.length} events
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
                          <ArrowUpDown size={13} className="shrink-0 opacity-40" />
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
              {paginatedEvents.map((e, i) => (
                <tr
                  key={e.id}
                  className={cn(
                    "border-b border-border table-row-hover transition-colors",
                    i % 2 === 0 ? "bg-card" : "bg-background",
                  )}
                >
                  {visibleColumns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      {col.render(e)}
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
            Showing {(currentPage - 1) * eventsPerPage + 1}–
            {Math.min(currentPage * eventsPerPage, filtered.length)} of{" "}
            {filtered.length}
          </span>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded-md border border-border text-xs hover:bg-secondary disabled:opacity-40"
            >
              ‹
            </button>

            {/* Pages */}
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

            {/* Next */}
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
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {String(selectedEvent.id ?? "Event")}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Meta */}
              <div className="card-elevated p-4 space-y-3">
                <h4 className="font-display text-sm font-semibold text-foreground">
                  Event Metadata
                </h4>
                {getEventMetadataRows(selectedEvent).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between text-sm font-body gap-4"
                  >
                    <span className="text-muted-foreground shrink-0">{k}</span>
                    <span className="font-medium text-foreground text-right break-all">{v}</span>
                  </div>
                ))}
              </div>

              {/* Error */}
              {getEventError(selectedEvent) && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "hsl(var(--error-bg))" }}
                >
                  <div
                    className="text-xs font-semibold font-display mb-1"
                    style={{ color: "hsl(var(--error))" }}
                  >
                    Error
                  </div>
                  <p className="text-xs font-body text-foreground-secondary">
                    {getEventError(selectedEvent)}
                  </p>
                </div>
              )}

              {/* JSON Payload */}
              <div className="card-elevated overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h4 className="font-display text-sm font-semibold text-foreground">
                    Payload
                  </h4>
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
                  {formatEventPayload(selectedEvent)}
                </pre>
              </div>

              {/* Actions */}
              {selectedEvent.status === "Failed" && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
