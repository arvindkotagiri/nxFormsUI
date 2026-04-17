import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Copy,
  Layers,
  FileText,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
const flaskAPI = import.meta.env.VITE_FLASK_API;
import SimulationModal from "./SimulationModal";
import { Play } from "lucide-react";

type LabelTemplate = {
  uuid: string;
  label_id: string;
  label_name: string;
  context: string;
  fields: any[];
  html_code: string;
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
  const [view, setView] = useState<"grid" | "editor">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<LabelTemplate | null>(null);
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [simulateForm, setSimulateForm] = useState("");
  const [formContext, setFormContext] = useState("");

  useEffect(() => {
    // fetch("http://localhost:5050/labels")
    fetch(`${flaskAPI}/labels`)
      .then((res) => res.json())
      .then((data) => {
        const cleanHtml = data[1].html_code
          .replace(/\\n/g, "")
          .replace(/\\"/g, '"');
        setLabelTemplates(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching labels:", err);
        setLoading(false);
      });
  }, []);

  function HtmlPreview({ html }: { html: string }) {
    const srcDoc = `
  <html>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
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
        style={{
          background: "white",
        }}
      />
    );
  }

  const loadPreview = async (zplCode: string) => {
    try {
      const res = await fetch(
        "https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: zplCode,
        },
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

    const showHtml = output_mode === "html" || output_mode === "both" || output_mode === "all";
    const showZpl = output_mode === "zpl" || output_mode === "both" || output_mode === "all";

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
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              ← Back
            </button>

            <div>
              <h1 className="text-2xl font-semibold">
                {selectedTemplate.label_name}
              </h1>
              <p className="text-sm text-muted-foreground">
                v{selectedTemplate.version} · {selectedTemplate.output_mode}
              </p>
            </div>
          </div>
        </div>

        {/* ================= MAIN EDITOR AREA ================= */}
        {/* Template Metadata */}
        <div className="card-elevated p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Label ID</div>
            <div className="font-semibold">{selectedTemplate.label_id}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Label Name</div>
            <div className="font-semibold">{selectedTemplate.label_name}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Context</div>
            <div className="font-semibold">{selectedTemplate.context}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Output Mode</div>
            <div className="font-semibold uppercase">
              {selectedTemplate.output_mode}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Version</div>
            <div className="font-semibold">v{selectedTemplate.version}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Page Size</div>
            <div className="font-semibold">
              {selectedTemplate.page_dimensions}
            </div>
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
            (output_mode === "all")
              ? "grid-cols-2 lg:grid-cols-3"
              : (output_mode === "both" ? "grid-cols-2 grid-rows-2" : "grid-cols-2")
          )}
        >
          {/* ---------- LEFT SIDE HTML CODE ---------- */}
          {(output_mode === "html" || output_mode === "both" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden flex flex-col h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground">
                HTML Code
              </div>

              <textarea
                value={selectedTemplate.html_code || ""}
                readOnly
                className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none"
                style={{
                  background: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}

          {/* ---------- RIGHT SIDE HTML PREVIEW ---------- */}
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

          {/* ---------- LEFT SIDE ZPL CODE ---------- */}
          {(output_mode === "zpl" || output_mode === "both" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden flex flex-col h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground">
                ZPL Code
              </div>

              <textarea
                value={selectedTemplate.zpl_code || ""}
                readOnly
                className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none"
                style={{
                  background: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}

          {/* ---------- RIGHT SIDE ZPL PREVIEW ---------- */}
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
                  <div className="text-muted-foreground text-sm">
                    Preview unavailable
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------- XDP CODE ---------- */}
          {(output_mode === "xdp" || output_mode === "all") && (
            <div className="card-elevated overflow-hidden flex flex-col h-[70vh]">
              <div className="px-4 py-2 border-b font-semibold text-xs bg-orange-600 text-white">
                XDP Code
              </div>

              <textarea
                value={selectedTemplate.xdp_code || ""}
                readOnly
                className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none"
                style={{
                  background: "hsl(var(--background))",
                  color: "hsl(var(--foreground))",
                  lineHeight: 1.6,
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  const filteredTemplates = labelTemplates.filter(
    (t) =>
      t.label_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.label_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.context.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            Templates
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Output template library
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
          onClick={() => navigate("/templates/new")}
          style={{ background: "hsl(var(--accent))", color: "white" }}
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Search templates…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-muted-foreground text-sm">
          Loading templates...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* {templates.map((t) => ( */}
          {filteredTemplates.map((t) => (
            <div key={t.uuid} className="card-elevated p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "hsl(var(--secondary))" }}
                  >
                    <FileText
                      size={18}
                      style={{ color: "hsl(var(--primary))" }}
                    />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground leading-tight">
                      {t.label_name}
                    </h3>
                    <div className="text-xs text-muted-foreground font-body mt-0.5">
                      {t.label_id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* <div
                  className="status-dot"
                  style={{
                    background: t.active ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
                    boxShadow: t.active ? "0 0 0 3px hsl(var(--success) / 0.2)" : "none",
                  }}
                /> */}
                  <div
                    className="status-dot"
                    style={{
                      background: "hsl(var(--success))",
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge-neutral">{t.output_mode}</span>
                <span className="badge-info">v{t.version}</span>
                {/* {t.contexts.map((c) => (
                <span key={c} className="badge-neutral">{c}</span>
              ))} */}
                <span className="badge-neutral">{t.context}</span>
              </div>

              <div className="flex items-center justify-between text-xs font-body text-muted-foreground">
                {/* <span>Updated {t.updated}</span> */}
                {/* <span className="font-semibold text-foreground">{t.uses.toLocaleString()} uses</span> */}
                <span>
                  Created {new Date(t.created_on).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <button
                  onClick={() => {
                    setSelectedTemplate(t);
                    setView("editor");
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-body transition-all"
                  style={{ background: "hsl(var(--accent))", color: "white" }}
                >
                  <Edit size={12} />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setSimulateForm(t.label_name);
                    setFormContext(t.context);
                    setSimulateOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs border hover:bg-muted"
                >
                  <Play size={12} />
                  Simulate
                </button>

                <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                  <Eye size={14} />
                </button>
                <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                  <Copy size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <SimulationModal
        open={simulateOpen}
        form={simulateForm}
        context={formContext}
        onClose={() => setSimulateOpen(false)}
      />
    </div>
  );
}
