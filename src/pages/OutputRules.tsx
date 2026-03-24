import { useEffect, useState } from "react";
import { Plus, GitBranch, Edit, Trash2, Play, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { deleteLabelConfig, getLabelConfigs } from "../lib/api";
import LoadingModule from "@/components/LoadingModule";

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
  const navigate = useNavigate();
  const [testJson, setTestJson] = useState(TEST_JSON);
  const [testResult, setTestResult] = useState<null | "match" | "no-match">(null);
  const [matchedRule, setMatchedRule] = useState("");
  const [selectedRule, setSelectedRule] = useState<any | null>(null);
  const [matchedRulesList, setMatchedRulesList] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rulesPerPage = 5;

  function buildSamplePayload(rule: any) {
    const sample: any = {};

    if (rule.company_code) {
      sample.company_code = rule.company_code;
    }

    if (rule.sales_organization) {
      sample.sales_organization = rule.sales_organization;
    }

    if (rule.plant) {
      sample.plant = rule.plant;
    }

    if (rule.warehouse) {
      sample.warehouse = rule.warehouse;
    }

    if (rule.customer) {
      sample.customerId = rule.customer;
    }

    if (rule.process_type) {
      sample.process_type = rule.process_type;
    }

    // 🔥 If no conditions → return empty object
    return JSON.stringify(sample, null, 2);
  }

  function evaluateRule(rule: any, payload: any) {
    if (!rule.active) return false;

    if (rule.company_code && payload.company_code !== rule.company_code)
      return false;

    if (rule.sales_organization && payload.sales_organization !== rule.sales_organization)
      return false;

    if (rule.plant && payload.plant !== rule.plant)
      return false;

    if (rule.warehouse && payload.warehouse !== rule.warehouse)
      return false;

    if (rule.customer && payload.customerId !== rule.customer)
      return false;

    if (rule.process_type && payload.process_type !== rule.process_type)
      return false;

    return true;
  }

  const runTest = () => {
    try {
      const payload = JSON.parse(testJson);
      setMatchedRulesList([]);

      const matched = ouputRules
        .filter((rule) => evaluateRule(rule, payload))
        .sort((a, b) => a.priority - b.priority); // ascending priority

      if (matched.length > 0) {
        setTestResult("match");
      } else {
        setTestResult("no-match");
      }

      setMatchedRulesList(matched);
      console.log("here 1", matchedRulesList)
    } catch (err) {
      setTestResult("no-match");
      setMatchedRulesList([]);
    }
  };
  const [ouputRules, setouputRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getLabelConfigs();
        setouputRules(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  function buildCondition(rule: any) {
    const conditions = [];

    if (rule.company_code) conditions.push(`company_code == '${rule.company_code}'`);
    if (rule.sales_organization) conditions.push(`sales_org == '${rule.sales_organization}'`);
    if (rule.plant) conditions.push(`plant == '${rule.plant}'`);
    if (rule.warehouse) conditions.push(`warehouse == '${rule.warehouse}'`);
    if (rule.customer) conditions.push(`customer == '${rule.customer}'`);
    if (rule.process_type) conditions.push(`process_type == '${rule.process_type}'`);

    return conditions.length ? conditions.join(" AND ") : "true";
  }

  const totalPages = Math.ceil(ouputRules.length / rulesPerPage);

  const paginatedRules = ouputRules
    .sort((a, b) => a.priority - b.priority)
    .slice(
      (currentPage - 1) * rulesPerPage,
      currentPage * rulesPerPage
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

  const emptyRows = rulesPerPage - paginatedRules.length;

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
          onClick={() => navigate("/config/new")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
          style={{ background: "hsl(var(--accent))", color: "white" }}
        >
          <Plus size={16} />
          New Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Rules Table */}
        <div className="lg:col-span-2 card-elevated overflow-hidden flex flex-col min-h-[520px]">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between" style={{ background: "hsl(var(--secondary))" }}>
            <h2 className="font-display text-sm font-semibold text-foreground">Active Rules</h2>
            <span className="text-xs text-muted-foreground font-body">{ouputRules.length} rules</span>
          </div>
          <div className="divide-y divide-border flex-1">
            {loading ? (
              <LoadingModule message="Please wait loading rules..." />
            ) : (
              <>
                {/* {ouputRules
                  .sort((a, b) => a.priority - b.priority)
                  .map((rule, index) => ( */}
                {paginatedRules.map((rule, index) => (
                  <div
                    key={rule.config_id}
                    onClick={() => {
                      setSelectedRule(rule);
                      setTestJson(buildSamplePayload(rule));
                      setTestResult(null);
                      setMatchedRule("");
                    }}
                    className={cn(
                      "p-5 transition-colors table-row-hover cursor-pointer",
                      selectedRule?.config_id === rule.config_id && "bg-accent/10",
                      !rule.active && "opacity-60"
                    )}
                  >
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
                          <div className="font-display text-sm font-semibold text-foreground">{rule.label_name}</div>
                          <div className="text-xs text-muted-foreground font-body">{rule.label_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={rule.active ? "badge-success" : "badge-neutral"}>
                          {rule.active ? "Active" : "Disabled"}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/config/${rule.config_id}`); // or your edit logic
                          }}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Edit size={13} />
                        </button>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();

                            try {
                              await deleteLabelConfig(rule.config_id);

                              // remove from UI instantly
                              setouputRules((prev) =>
                                prev.filter((r) => r.config_id !== rule.config_id)
                              );

                            } catch (err) {
                              console.error(err);
                              alert("Failed to delete configuration");
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="ml-10 space-y-2">
                      <div className="flex items-start gap-2 text-xs font-body">
                        <span className="text-muted-foreground shrink-0">When:</span>
                        <code className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">{buildCondition(rule)}</code>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-body">
                        <span className="text-muted-foreground shrink-0">Then:</span>
                        <pre>Route to {rule.printer || rule.label_id}</pre>
                        <span className="text-foreground font-medium">{rule.printer || rule.label_id}</span>
                        {/* <span className="ml-auto text-muted-foreground">{rule.matches.toLocaleString()} matches</span> */}
                      </div>
                    </div>
                  </div>
                ))}
                {emptyRows > 0 &&
                  Array.from({ length: emptyRows }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="p-5 border-t border-border opacity-30 pointer-events-none"
                    >
                      <div className="flex items-center gap-3 ml-10">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-4 w-16 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                {/* <div className="flex items-center justify-between p-4">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs rounded border border-border disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-xs text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs rounded border border-border disabled:opacity-40"
                  >
                    Next
                  </button>
                </div> */}
                <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-background shrink-0">

                  {/* Left side */}
                  <div className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * rulesPerPage + 1}–
                    {Math.min(currentPage * rulesPerPage, ouputRules.length)} of {ouputRules.length}
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-1">

                    {/* Previous */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-2 py-1 rounded-md border border-border text-xs hover:bg-muted disabled:opacity-40"
                    >
                      ‹
                    </button>

                    {/* Page numbers */}
                    {getPageNumbers().map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "px-3 py-1 text-xs rounded-md border transition",
                          page === currentPage
                            ? "border-accent bg-accent text-white"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        {page}
                      </button>
                    ))}

                    {/* Next */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-2 py-1 rounded-md border border-border text-xs hover:bg-muted disabled:opacity-40"
                    >
                      ›
                    </button>

                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Test Rule Panel */}
        <div className="space-y-4">
          <div className="card-elevated overflow-hidden">
            <div className="px-4 py-3 border-b border-border" style={{ background: "hsl(var(--secondary))" }}>
              <h3 className="font-display text-sm font-semibold text-foreground">Test Rule Engine</h3>
              {selectedRule && (
                <div className="text-xs text-muted-foreground mt-1">
                  Testing: {selectedRule.label_name}
                </div>
              )}
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
                disabled={!selectedRule}
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
          {/* <div className="card-elevated p-4">
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
          </div> */}

          {/* Priority info */}
          <div className="card-elevated p-4 space-y-4">

            {/* ⭐ MATCH RESULT BOX */}
            {matchedRulesList.length > 0 && (
              <div className="border border-border rounded-xl p-3 space-y-2 bg-muted/30">
                <h5 className="text-xs font-semibold font-display">
                  {matchedRulesList.length} Matching Labels
                </h5>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {matchedRulesList.map((rule: any) => (
                    <div
                      key={rule.config_id}
                      className="p-3 rounded-lg border border-border bg-background text-xs space-y-1"
                    >
                      <div className="font-semibold">{rule.label_name}</div>
                      <div className="text-muted-foreground">{rule.label_id}</div>

                      <div className="flex gap-2 mt-1 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-accent/10">
                          Priority {rule.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}