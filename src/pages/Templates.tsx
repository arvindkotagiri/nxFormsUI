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


const templates = [
  { id: "TPL-001", name: "Standard Invoice", type: "PDF/HTML", version: "3.2", active: true, updated: "2026-02-18", contexts: ["Invoice"], uses: 4280 },
  { id: "TPL-002", name: "Dispatch Label A6", type: "ZPL", version: "2.0", active: true, updated: "2026-02-15", contexts: ["Dispatch", "Label"], uses: 3120 },
  { id: "TPL-003", name: "Receipt Thermal", type: "ESC/POS", version: "1.4", active: true, updated: "2026-02-10", contexts: ["Receipt"], uses: 2900 },
  { id: "TPL-004", name: "Monthly Statement", type: "PDF/HTML", version: "1.1", active: false, updated: "2026-01-30", contexts: ["Statement"], uses: 820 },
  { id: "TPL-005", name: "Warehouse Pick List", type: "ZPL", version: "1.8", active: true, updated: "2026-02-12", contexts: ["Label"], uses: 1640 },
  { id: "TPL-006", name: "Annual Report Template", type: "PDF/HTML", version: "2.3", active: false, updated: "2026-01-15", contexts: ["Report"], uses: 340 },
];

const EDITOR_SAMPLE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Manrope', sans-serif; color: #034354; }
    .header { background: #F2F8F8; padding: 24px; }
    .logo { font-size: 24px; font-weight: 700; }
    .invoice-num { color: #FF682C; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #E4F1F1; padding: 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #E4F1F1; }
    .total { font-size: 18px; font-weight: 700; color: #034354; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Acme Corp</div>
    <div class="invoice-num">Invoice #{{invoiceNumber}}</div>
    <div>Date: {{invoiceDate}}</div>
  </div>
  <table>
    <thead>
      <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
    </thead>
    <tbody>
      {{#each lineItems}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}</td>
        <td>{{lineTotal}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <div class="total">Total: {{grandTotal}}</div>
</body>
</html>`;

const SAMPLE_JSON = `{
  "invoiceNumber": "INV-98421",
  "invoiceDate": "2026-02-19",
  "customer": {
    "name": "Acme Corp",
    "address": "500 Commerce Blvd"
  },
  "lineItems": [
    {
      "description": "Widget Pro X",
      "quantity": 10,
      "unitPrice": "$24.99",
      "lineTotal": "$249.90"
    }
  ],
  "grandTotal": "$249.90"
}`;

type LabelTemplate = {
  uuid: string;
  label_id: string;
  label_name: string;
  context: string;
  fields: any[];
  html_code: string;
  zpl_code?: string;
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
  const [labelTemplates, setLabelTemplates] =
    useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    // fetch("http://localhost:5050/labels")
    fetch(`${flaskAPI}/labels`)
      .then((res) => res.json())
      .then((data) => {
        const cleanHtml = data[1].html_code.replace(/\\n/g, "").replace(/\\"/g, '"');
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
          background: "white"
        }}
      />
    );
  }

  // if (view === "editor" && selectedTemplate) {
  //   return (
  //     <div className="space-y-5 animate-fade-in">
  //       <div className="flex items-center justify-between">
  //         <div className="flex items-center gap-3">
  //           <button
  //             onClick={() => { setView("grid"); setSelectedTemplate(null); }}
  //             className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
  //           >
  //             ← Back
  //           </button>
  //           <div>
  //             <h1 className="font-display text-2xl font-semibold text-foreground">{selectedTemplate.label_name}</h1>
  //             <p className="text-sm text-muted-foreground font-body">v{selectedTemplate.version} · {selectedTemplate.output_mode}</p>
  //           </div>
  //         </div>
  //         <div className="flex items-center gap-2">
  //           <button className="px-4 py-2 rounded-lg border border-border text-sm font-body text-muted-foreground hover:text-foreground transition-all">
  //             Save Draft
  //           </button>
  //           <button
  //             className="px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
  //             style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
  //           >
  //             Activate Version
  //           </button>
  //         </div>
  //       </div>

  //       <div className="grid grid-cols-2 gap-4 h-[calc(100vh-220px)]">
  //         {/* Editor */}
  //         <div className="card-elevated overflow-hidden flex flex-col">
  //           <div className="px-4 py-3 border-b border-border flex items-center gap-2" style={{ background: "hsl(var(--primary))" }}>
  //             <span className="text-xs font-semibold font-body" style={{ color: "hsl(var(--primary-foreground))" }}>Template Editor</span>
  //             <span className="ml-auto text-xs font-mono" style={{ color: "hsl(var(--primary-foreground)/0.6)" }}>{selectedTemplate.output_mode}</span>
  //           </div>
  //           <textarea
  //             defaultValue={EDITOR_SAMPLE}
  //             className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none"
  //             style={{
  //               background: "hsl(var(--primary))",
  //               color: "hsl(var(--primary-foreground))",
  //               lineHeight: 1.7,
  //             }}
  //           />
  //         </div>

  //         {/* Right panel */}
  //         <div className="space-y-4 flex flex-col">
  //           {/* Sample JSON */}
  //           <div className="card-elevated overflow-hidden">
  //             <div className="px-4 py-3 border-b border-border">
  //               <h4 className="font-display text-sm font-semibold text-foreground">Sample JSON Input</h4>
  //             </div>
  //             <pre className="p-4 text-xs font-mono overflow-x-auto max-h-44 overflow-y-auto" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
  //               {SAMPLE_JSON}
  //             </pre>
  //           </div>

  //           {/* Preview */}
  //           <div className="card-elevated flex-1 overflow-hidden">
  //             <div className="px-4 py-3 border-b border-border flex items-center justify-between">
  //               <h4 className="font-display text-sm font-semibold text-foreground">Live Preview</h4>
  //               <span className="badge-success">Valid</span>
  //             </div>
  //             <div className="p-4 space-y-3">
  //               <div className="p-3 rounded-lg" style={{ background: "hsl(var(--background-secondary))" }}>
  //                 <div className="font-display text-lg font-bold text-primary">Acme Corp</div>
  //                 <div className="text-sm font-semibold" style={{ color: "hsl(var(--accent))" }}>Invoice #INV-98421</div>
  //                 <div className="text-xs text-muted-foreground font-body">Date: 2026-02-19</div>
  //               </div>
  //               <table className="w-full text-xs font-body">
  //                 <thead>
  //                   <tr style={{ background: "hsl(var(--secondary))" }}>
  //                     {["Item", "Qty", "Price", "Total"].map((h) => (
  //                       <th key={h} className="px-2 py-1.5 text-left text-foreground font-semibold">{h}</th>
  //                     ))}
  //                   </tr>
  //                 </thead>
  //                 <tbody>
  //                   <tr className="border-b border-border">
  //                     <td className="px-2 py-1.5 text-foreground">Widget Pro X</td>
  //                     <td className="px-2 py-1.5 text-muted-foreground">10</td>
  //                     <td className="px-2 py-1.5 text-muted-foreground">$24.99</td>
  //                     <td className="px-2 py-1.5 font-semibold text-foreground">$249.90</td>
  //                   </tr>
  //                 </tbody>
  //               </table>
  //               <div className="font-display text-base font-bold text-foreground">Total: $249.90</div>
  //             </div>
  //           </div>

  //           {/* Validation */}
  //           <div className="card-elevated p-4">
  //             <h4 className="font-display text-sm font-semibold text-foreground mb-2">Validation</h4>
  //             <div className="space-y-1">
  //               {["Syntax: OK", "All variables resolved", "No missing partials"].map((v) => (
  //                 <div key={v} className="flex items-center gap-2 text-xs font-body" style={{ color: "hsl(var(--success))" }}>
  //                   <span>✓</span> {v}
  //                 </div>
  //               ))}
  //             </div>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  const loadPreview = async (zplCode: string) => {
    try {
      const res = await fetch(
        "https://api.labelary.com/v1/printers/8dpmm/labels/4x6/0/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: zplCode
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
    if (selectedTemplate?.output_mode === "zpl" || selectedTemplate?.output_mode === "both") {
      loadPreview(selectedTemplate.zpl_code || "");
    }
  }, [selectedTemplate]);
  if (view === "editor" && selectedTemplate) {
    const { output_mode } = selectedTemplate;

    const showHtml = output_mode === "html" || output_mode === "both";
    const showZpl = output_mode === "zpl" || output_mode === "both";

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
            "gap-4",
            output_mode === "both"
              ? "grid grid-cols-2"
              : "grid grid-cols-2"
          )}
        >
          {/* ---------- LEFT SIDE ---------- */}
          <div className="card-elevated overflow-hidden flex flex-col h-[70vh]">
            <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground">
              {showHtml ? "HTML Code" : "ZPL Code"}
            </div>

            <textarea
              value={
                showHtml
                  ? selectedTemplate.html_code || ""
                  : selectedTemplate.zpl_code || ""
              }
              readOnly
              className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none"
              style={{
                background: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                lineHeight: 1.6,
              }}
            />
          </div>

          {/* ---------- RIGHT SIDE PREVIEW ---------- */}
          <div className="card-elevated overflow-hidden h-[70vh]">
            <div className="px-4 py-2 border-b font-semibold text-xs bg-primary text-primary-foreground flex justify-between">
              <span>Live Preview</span>
              <span>{output_mode.toUpperCase()}</span>
            </div>

            <div className="p-4 overflow-auto h-full">
              {output_mode === "html" && (
                <HtmlPreview html={selectedTemplate.html_code} />
              )}

              {output_mode === "zpl" && (
                preview ? (
                  <img
                    src={preview}
                    alt="ZPL Preview"
                    className="w-full h-full object-contain border rounded shadow"
                  />
                ) : (
                  <div className="text-muted-foreground text-sm">
                    Preview unavailable
                  </div>
                )
              )}

              {output_mode === "both" && (
                <div className="space-y-4 h-full">
                  <HtmlPreview html={selectedTemplate.html_code} />

                  <div className="border-t pt-4">
                    <h4 className="text-xs font-semibold mb-2">ZPL Code</h4>
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {selectedTemplate.zpl_code}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredTemplates = labelTemplates.filter((t) =>
    t.label_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.label_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.context.toLowerCase().includes(searchQuery.toLowerCase())
  );
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Templates</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Output template library</p>
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
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
        <div className="text-muted-foreground text-sm">Loading templates...</div>
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
                    <FileText size={18} style={{ color: "hsl(var(--primary))" }} />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground leading-tight">{t.label_name}</h3>
                    <div className="text-xs text-muted-foreground font-body mt-0.5">{t.label_id}</div>
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
                      background: "hsl(var(--success))"
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
                  onClick={() => { setSelectedTemplate(t); setView("editor"); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold font-body transition-all"
                  style={{ background: "hsl(var(--accent))", color: "white" }}
                >
                  <Edit size={12} />
                  Edit
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
    </div>
  );
}
