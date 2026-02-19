import { useState } from "react";
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
import { cn } from "@/lib/utils";

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

export default function Templates() {
  const [view, setView] = useState<"grid" | "editor">("grid");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof templates[0] | null>(null);

  if (view === "editor" && selectedTemplate) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setView("grid"); setSelectedTemplate(null); }}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            >
              ← Back
            </button>
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">{selectedTemplate.name}</h1>
              <p className="text-sm text-muted-foreground font-body">v{selectedTemplate.version} · {selectedTemplate.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg border border-border text-sm font-body text-muted-foreground hover:text-foreground transition-all">
              Save Draft
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
              style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
            >
              Activate Version
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 h-[calc(100vh-220px)]">
          {/* Editor */}
          <div className="card-elevated overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2" style={{ background: "hsl(var(--primary))" }}>
              <span className="text-xs font-semibold font-body" style={{ color: "hsl(var(--primary-foreground))" }}>Template Editor</span>
              <span className="ml-auto text-xs font-mono" style={{ color: "hsl(var(--primary-foreground)/0.6)" }}>{selectedTemplate.type}</span>
            </div>
            <textarea
              defaultValue={EDITOR_SAMPLE}
              className="flex-1 p-4 text-xs font-mono resize-none focus:outline-none"
              style={{
                background: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                lineHeight: 1.7,
              }}
            />
          </div>

          {/* Right panel */}
          <div className="space-y-4 flex flex-col">
            {/* Sample JSON */}
            <div className="card-elevated overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h4 className="font-display text-sm font-semibold text-foreground">Sample JSON Input</h4>
              </div>
              <pre className="p-4 text-xs font-mono overflow-x-auto max-h-44 overflow-y-auto" style={{ background: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>
                {SAMPLE_JSON}
              </pre>
            </div>

            {/* Preview */}
            <div className="card-elevated flex-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h4 className="font-display text-sm font-semibold text-foreground">Live Preview</h4>
                <span className="badge-success">Valid</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="p-3 rounded-lg" style={{ background: "hsl(var(--background-secondary))" }}>
                  <div className="font-display text-lg font-bold text-primary">Acme Corp</div>
                  <div className="text-sm font-semibold" style={{ color: "hsl(var(--accent))" }}>Invoice #INV-98421</div>
                  <div className="text-xs text-muted-foreground font-body">Date: 2026-02-19</div>
                </div>
                <table className="w-full text-xs font-body">
                  <thead>
                    <tr style={{ background: "hsl(var(--secondary))" }}>
                      {["Item", "Qty", "Price", "Total"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-foreground font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-2 py-1.5 text-foreground">Widget Pro X</td>
                      <td className="px-2 py-1.5 text-muted-foreground">10</td>
                      <td className="px-2 py-1.5 text-muted-foreground">$24.99</td>
                      <td className="px-2 py-1.5 font-semibold text-foreground">$249.90</td>
                    </tr>
                  </tbody>
                </table>
                <div className="font-display text-base font-bold text-foreground">Total: $249.90</div>
              </div>
            </div>

            {/* Validation */}
            <div className="card-elevated p-4">
              <h4 className="font-display text-sm font-semibold text-foreground mb-2">Validation</h4>
              <div className="space-y-1">
                {["Syntax: OK", "All variables resolved", "No missing partials"].map((v) => (
                  <div key={v} className="flex items-center gap-2 text-xs font-body" style={{ color: "hsl(var(--success))" }}>
                    <span>✓</span> {v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Templates</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">Output template library</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
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
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t) => (
          <div key={t.id} className="card-elevated p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "hsl(var(--secondary))" }}
                >
                  <FileText size={18} style={{ color: "hsl(var(--primary))" }} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground leading-tight">{t.name}</h3>
                  <div className="text-xs text-muted-foreground font-body mt-0.5">{t.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="status-dot"
                  style={{
                    background: t.active ? "hsl(var(--success))" : "hsl(var(--muted-foreground))",
                    boxShadow: t.active ? "0 0 0 3px hsl(var(--success) / 0.2)" : "none",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge-neutral">{t.type}</span>
              <span className="badge-info">v{t.version}</span>
              {t.contexts.map((c) => (
                <span key={c} className="badge-neutral">{c}</span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-body text-muted-foreground">
              <span>Updated {t.updated}</span>
              <span className="font-semibold text-foreground">{t.uses.toLocaleString()} uses</span>
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
    </div>
  );
}
