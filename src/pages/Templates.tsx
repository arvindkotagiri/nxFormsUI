import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  FileText,
  Trash2,
  Play,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { legacyApiUrl } from "@/lib/legacyApiBase";
import SimulationModal from "./SimulationModal";
import { useCustomFonts } from "@/hooks/useCustomFonts";
import { useWizard } from "@/context/WizardContext";

type LabelTemplate = {
  uuid: string;
  label_id: string;
  label_name: string;
  context: string;
  fields?: any[];
  html_code?: string;
  zpl_code?: string;
  xdp_code?: string;
  output_mode: string;
  version: number;
  page_dimensions: string;
  created_by: string;
  created_on: string;
};

export default function Templates() {
  const navigate = useNavigate();
  const { cssString } = useCustomFonts();
  const { loadSavedTemplate } = useWizard();
  const [view, setView] = useState<"grid" | "editor">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateForm, setSimulateForm] = useState("");
  const [simulateFormId, setSimulateFormId] = useState("");
  const [formContext, setFormContext] = useState("");
  const [contexts, setContexts] = useState<any[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 12;

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const url = legacyApiUrl(
        `/api/labels?summary=true&paginated=true&page=${page}&limit=${limit}&search=${encodeURIComponent(searchQuery)}`
      );
      const res = await fetch(url);
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        setLabelTemplates(data.data);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      } else if (Array.isArray(data)) {
        setLabelTemplates(data);
        setTotalPages(1);
        setTotalCount(data.length);
      } else {
        setLabelTemplates([]);
      }
    } catch (err) {
      console.error("Error fetching labels:", err);
      setLabelTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    fetch(legacyApiUrl("/api/catalog"))
      .then((res) => res.json())
      .then((apis) => {
        if (Array.isArray(apis)) {
          const dynamicContexts = apis.map((api: any) => ({
            id: `api-${api.id}`,
            name: api.name,
            isOData: !!(api.entities && Array.isArray(api.entities) && api.entities.length > 0),
            entities: api.entities || [],
            fields: api.fields || {},
            output_fields: Array.isArray(api.output_fields) ? api.output_fields : [],
          }));
          setContexts(dynamicContexts);
        }
      })
      .catch((err) => {
        console.error("Error fetching contexts:", err);
      });
  }, []);

  const fetchFullTemplate = async (t: LabelTemplate): Promise<LabelTemplate> => {
    if (t.html_code || t.zpl_code || t.xdp_code) return t;
    setFetchingDetail(true);
    try {
      const res = await fetch(legacyApiUrl(`/api/labels/${t.uuid}`));
      if (res.ok) {
        const full = await res.json();
        return full;
      }
    } catch (e) {
      console.error("Error fetching full template detail:", e);
    } finally {
      setFetchingDetail(false);
    }
    return t;
  };

  const handleDelete = async (uuid: string) => {
    if (!window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(legacyApiUrl(`/api/labels/${uuid}`), {
        method: "DELETE",
      });
      if (response.ok) {
        loadTemplates();
        if (selectedTemplate?.uuid === uuid) {
          setSelectedTemplate(null);
          setView("grid");
        }
      } else {
        const text = await response.text();
        let errMsg = "Unknown error";
        try {
          const json = JSON.parse(text);
          errMsg = json.error || json.message || errMsg;
        } catch {
          errMsg = text || errMsg;
        }
        alert(`Failed to delete template: ${errMsg}`);
      }
    } catch (err) {
      console.error("Delete template error:", err);
      alert(`Error deleting template: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  function HtmlPreview({ html }: { html?: string }) {
    const srcDoc = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    ${cssString}
  </style>
  </head>
  <body style="margin:0; transform: scale(1); transform-origin: top left;">
  ${html?.replace(/\\n/g, "") || ""}
  </body>
  </html>
  `;

    return (
      <iframe
        title="preview"
        srcDoc={srcDoc}
        className="w-full h-full border-0"
        style={{ background: "white" }}
      />
    );
  }

  const loadPreview = async (zplCode: string) => {
    if (!zplCode) return;
    try {
      const res = await fetch(
        "https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: zplCode,
        }
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreview(url);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (
      selectedTemplate?.output_mode === "zpl" ||
      selectedTemplate?.output_mode === "both" ||
      selectedTemplate?.output_mode === "all"
    ) {
      loadPreview(selectedTemplate.zpl_code || "");
    }
  }, [selectedTemplate]);

  if (view === "editor" && selectedTemplate) {
    const { output_mode } = selectedTemplate;

    return (
      <div className="space-y-5 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setView("grid");
                setSelectedTemplate(null);
              }}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-sm"
            >
              ← Back
            </button>

            <div>
              <h1 className="text-2xl font-semibold">
                {selectedTemplate.label_name}
              </h1>
              <div className="text-xs text-muted-foreground font-mono">
                {selectedTemplate.label_id} • {selectedTemplate.context}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 p-4 card-elevated text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Context</div>
            <div className="font-semibold">{selectedTemplate.context}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Output Mode</div>
            <div className="font-semibold uppercase">{selectedTemplate.output_mode}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Version</div>
            <div className="font-semibold">v{selectedTemplate.version}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Page Size</div>
            <div className="font-semibold">{selectedTemplate.page_dimensions}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Created By</div>
            <div className="font-semibold">{selectedTemplate.created_by}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Created On</div>
            <div className="font-semibold">
              {new Date(selectedTemplate.created_on).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "gap-4 grid",
            output_mode === "all"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              : output_mode === "both"
              ? "grid-cols-1 sm:grid-cols-2 sm:grid-rows-2"
              : "grid-cols-1 sm:grid-cols-2"
          )}
        >
          {/* HTML CODE */}
          {(output_mode === "html" || output_mode === "both" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden flex flex-col h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground">
                HTML Code
              </div>
              <textarea
                value={selectedTemplate.html_code || ""}
                readOnly
                className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none bg-background text-foreground"
                style={{ lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* HTML PREVIEW */}
          {(output_mode === "html" || output_mode === "both" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground">
                <span>HTML Preview</span>
              </div>
              <div className="p-4 overflow-auto h-full">
                <HtmlPreview html={selectedTemplate.html_code} />
              </div>
            </div>
          )}

          {/* ZPL CODE */}
          {(output_mode === "zpl" || output_mode === "both" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden flex flex-col h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground">
                ZPL Code
              </div>
              <textarea
                value={selectedTemplate.zpl_code || ""}
                readOnly
                className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none bg-background text-foreground"
                style={{ lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* ZPL PREVIEW */}
          {(output_mode === "zpl" || output_mode === "both" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground">
                <span>ZPL Preview</span>
              </div>
              <div className="p-4 overflow-auto h-full">
                {preview ? (
                  <img
                    src={preview}
                    alt="ZPL Preview"
                    className="w-full h-full object-contain border rounded shadow"
                  />
                ) : (
                  <div className="text-muted-foreground text-sm">Preview unavailable</div>
                )}
              </div>
            </div>
          )}

          {/* XDP CODE */}
          {(output_mode === "xdp" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden flex flex-col h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-orange-600 text-white">
                XDP Code
              </div>
              <textarea
                value={selectedTemplate.xdp_code || ""}
                readOnly
                className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none bg-background text-foreground"
                style={{ lineHeight: 1.6 }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Saved Templates
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Output template library ({totalCount} total)
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all bg-primary text-primary-foreground hover:opacity-90"
          onClick={() => navigate("/templates/new")}
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search templates…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
          <Loader2 size={18} className="animate-spin" />
          Loading templates...
        </div>
      ) : labelTemplates.length === 0 ? (
        <div className="card-elevated p-12 text-center text-muted-foreground text-sm">
          No templates found matching your query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {labelTemplates.map((t) => (
            <div key={t.uuid} className="card-elevated p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary"
                    >
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display text-sm font-semibold text-foreground leading-tight">
                        {t.label_name}
                      </h3>
                      <div className="text-xs text-muted-foreground font-body mt-0.5 font-mono">
                        {t.label_id}
                      </div>
                    </div>
                  </div>
                  <div className="status-dot bg-emerald-500" />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="badge-neutral uppercase">{t.output_mode}</span>
                  <span className="badge-info">v{t.version}</span>
                  <span className="badge-neutral">{t.context}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-body text-muted-foreground pt-1">
                  <span>Created {new Date(t.created_on).toLocaleDateString()}</span>
                  <span>{t.page_dimensions || "Standard"}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={async () => {
                    const full = await fetchFullTemplate(t);
                    const matchingContext = contexts.find((c) => c.name === t.context) || {
                      name: t.context,
                      entities: [],
                      fields: {},
                    };
                    loadSavedTemplate(full, matchingContext);
                    navigate("/templates/new");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-body bg-primary text-primary-foreground hover:opacity-90 transition-all"
                >
                  <Edit size={12} />
                  Edit
                </button>

                <button
                  onClick={() => {
                    setSimulateForm(t.label_name);
                    setSimulateFormId(t.label_id);
                    setFormContext(t.context);
                    setSimulateOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs border hover:bg-muted"
                >
                  <Play size={12} />
                  Simulate
                </button>

                <button
                  onClick={async () => {
                    const full = await fetchFullTemplate(t);
                    setSelectedTemplate(full);
                    setView("editor");
                  }}
                  title="View Source Code"
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Eye size={14} />
                </button>
                <button
                  onClick={() => handleDelete(t.uuid)}
                  title="Delete Template"
                  className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-500 hover:text-red-700"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} items)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-muted"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-muted"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <SimulationModal
        open={simulateOpen}
        formName={simulateForm}
        formId={simulateFormId || undefined}
        context={formContext}
        onClose={() => setSimulateOpen(false)}
      />
    </div>
  );
}
