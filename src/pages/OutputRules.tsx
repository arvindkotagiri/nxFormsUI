import { useState } from "react";
import { Plus, GitBranch, Edit, Trash2, Play, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const rules = [
  { id: "RUL-001", name: "Invoice → PDF Export", priority: 1, context: "Invoice", condition: "source == 'ERP-SAP' AND amount > 0", action: "Route to PDF-EXPORT", active: true, matches: 4280 },
  { id: "RUL-002", name: "Dispatch → Zebra Label", priority: 2, context: "Dispatch", condition: "warehouseId != null", action: "Route to LBL-PRN-01", active: true, matches: 1840 },
  { id: "RUL-003", name: "Receipt → Thermal", priority: 3, context: "Receipt", condition: "storeId IN ['S001','S002','S003']", action: "Route to POS-THR-01", active: true, matches: 2910 },
  { id: "RUL-004", name: "Statement → Archival", priority: 4, context: "Statement", condition: "period == 'MONTHLY'", action: "Route to PDF-ARCHIVE", active: false, matches: 820 },
  { id: "RUL-005", name: "Fallback PDF", priority: 99, context: "ANY", condition: "true", action: "Route to PDF-EXPORT", active: true, matches: 312 },
];

const TEST_JSON = `{
  "source": "ERP-SAP",
  "context": "Invoice",
  "amount": 1250.00,
  "currency": "USD",
  "customerId": "CUST-4421"
}`;

export default function OutputRules() {
  const [testJson, setTestJson] = useState(TEST_JSON);
  const [testResult, setTestResult] = useState<null | "match" | "no-match">(null);
  const [matchedRule, setMatchedRule] = useState("");

  const runTest = () => {
    setTestResult("match");
    setMatchedRule("RUL-001: Invoice → PDF Export");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Output Rules</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Routing and processing rule definitions
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
          style={{ background: "hsl(var(--accent))", color: "white" }}
        >
          <Plus size={16} />
          New Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Rules Table */}
        <div className="lg:col-span-2 card-elevated overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between" style={{ background: "hsl(var(--secondary))" }}>
            <h2 className="font-display text-sm font-semibold text-foreground">Active Rules</h2>
            <span className="text-xs text-muted-foreground font-body">{rules.length} rules</span>
          </div>
          <div className="divide-y divide-border">
            {rules.map((rule) => (
              <div key={rule.id} className={cn("p-5 transition-colors table-row-hover", !rule.active && "opacity-60")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-display"
                      style={{
                        background: rule.priority === 99 ? "hsl(var(--muted))" : "hsl(var(--accent) / 0.12)",
                        color: rule.priority === 99 ? "hsl(var(--muted-foreground))" : "hsl(var(--accent))",
                      }}
                    >
                      {rule.priority}
                    </div>
                    <div>
                      <div className="font-display text-sm font-semibold text-foreground">{rule.name}</div>
                      <div className="text-xs text-muted-foreground font-body">{rule.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={rule.active ? "badge-success" : "badge-neutral"}>
                      {rule.active ? "Active" : "Disabled"}
                    </span>
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                      <Edit size={13} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="ml-10 space-y-2">
                  <div className="flex items-start gap-2 text-xs font-body">
                    <span className="text-muted-foreground shrink-0">When:</span>
                    <code className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">{rule.condition}</code>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-body">
                    <span className="text-muted-foreground shrink-0">Then:</span>
                    <span className="text-foreground font-medium">{rule.action}</span>
                    <span className="ml-auto text-muted-foreground">{rule.matches.toLocaleString()} matches</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Rule Panel */}
        <div className="space-y-4">
          <div className="card-elevated overflow-hidden">
            <div className="px-4 py-3 border-b border-border" style={{ background: "hsl(var(--secondary))" }}>
              <h3 className="font-display text-sm font-semibold text-foreground">Test Rule Engine</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground font-body block mb-1">
                  Event JSON Payload
                </label>
                <textarea
                  value={testJson}
                  onChange={(e) => setTestJson(e.target.value)}
                  rows={10}
                  className="w-full p-3 text-xs font-mono rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>
              <button
                onClick={runTest}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold font-body transition-all"
                style={{ background: "hsl(var(--accent))", color: "white" }}
              >
                <Play size={14} />
                Evaluate Rules
              </button>

              {testResult && (
                <div
                  className="p-4 rounded-xl space-y-2"
                  style={{
                    background: testResult === "match" ? "hsl(var(--success-bg))" : "hsl(var(--error-bg))",
                  }}
                >
                  <div
                    className="text-xs font-semibold font-display"
                    style={{ color: testResult === "match" ? "hsl(var(--success))" : "hsl(var(--error))" }}
                  >
                    {testResult === "match" ? "✓ Rule Matched" : "✗ No Match"}
                  </div>
                  {matchedRule && (
                    <div className="text-xs text-foreground font-body">{matchedRule}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Priority info */}
          <div className="card-elevated p-4">
            <h4 className="font-display text-sm font-semibold text-foreground mb-3">Evaluation Order</h4>
            <div className="space-y-2">
              {rules.slice(0, 3).map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-xs font-body">
                  <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "hsl(var(--accent) / 0.1)", color: "hsl(var(--accent))" }}>
                    {r.priority}
                  </span>
                  <span className="text-foreground truncate">{r.name}</span>
                </div>
              ))}
              <div className="text-xs text-muted-foreground font-body pl-7">+ 2 more</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
