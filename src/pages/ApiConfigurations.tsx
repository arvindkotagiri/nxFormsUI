import { useState } from "react";
import { Plus, Play, Copy, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

const APIS = [
  { id: "API-001", name: "ERP-SAP Inbound", endpoint: "https://api.erp.acme.com/v2/events", authType: "OAuth2", status: "Active", lastTest: "2026-02-19 14:00", latency: "82ms" },
  { id: "API-002", name: "WMS Webhook", endpoint: "https://hooks.wms.internal/nx/events", authType: "JWT Bearer", status: "Active", lastTest: "2026-02-19 13:45", latency: "44ms" },
  { id: "API-003", name: "B2B Portal Feed", endpoint: "https://b2b.portal.com/api/outputs", authType: "API Key", status: "Degraded", lastTest: "2026-02-19 12:20", latency: "1.4s" },
];

const RESPONSE_MOCK = `{
  "status": "ok",
  "message": "Connection established",
  "serverTime": "2026-02-19T14:32:00Z",
  "version": "2.4.1",
  "features": ["events", "outputs", "webhooks"]
}`;

export default function ApiConfigurations() {
  const [selectedApi, setSelectedApi] = useState(APIS[0]);
  const [showSecret, setShowSecret] = useState(false);
  const [testResult, setTestResult] = useState<null | "success" | "error">(null);
  const [circuitBreaker, setCircuitBreaker] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);

  const runTest = () => {
    setTestResult("success");
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">API Configurations</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            External integration endpoints & authentication
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body"
          style={{ background: "hsl(var(--accent))", color: "white" }}
        >
          <Plus size={16} />
          Add API
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* API List */}
        <div className="space-y-3">
          {APIS.map((api) => (
            <div
              key={api.id}
              onClick={() => setSelectedApi(api)}
              className={cn(
                "card-elevated p-4 cursor-pointer transition-all",
                selectedApi.id === api.id && "ring-2"
              )}
              style={selectedApi.id === api.id ? { outline: `2px solid hsl(var(--accent))`, outlineOffset: "-2px", borderRadius: "12px" } : {}}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm font-semibold text-foreground">{api.name}</h3>
                <span className={api.status === "Active" ? "badge-success" : "badge-warning"}>{api.status}</span>
              </div>
              <div className="text-xs font-mono text-muted-foreground truncate mb-2">{api.endpoint}</div>
              <div className="flex items-center justify-between text-xs font-body text-muted-foreground">
                <span>{api.authType}</span>
                <span>{api.latency}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Config Form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card-elevated p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-foreground">Endpoint Details</h2>

            {[
              { label: "API Name", value: selectedApi.name, type: "text" },
              { label: "Base URL", value: selectedApi.endpoint, type: "text" },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs font-semibold text-muted-foreground font-body mb-1">{field.label}</label>
                <input
                  type={field.type}
                  defaultValue={field.value}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            ))}
          </div>

          <div className="card-elevated p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-foreground">Authentication</h2>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground font-body mb-1">Auth Type</label>
              <select className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option>OAuth2</option>
                <option>JWT Bearer</option>
                <option>API Key</option>
                <option>Basic Auth</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground font-body mb-1">Client Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  defaultValue="sk_live_••••••••••••••••"
                  className="w-full px-3 py-2 pr-10 text-sm rounded-xl border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="card-elevated p-5 space-y-4">
            <h2 className="font-display text-base font-semibold text-foreground">Retry & Timeout</h2>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Timeout (ms)", value: "5000" },
                { label: "Max Retries", value: "3" },
                { label: "Retry Interval (ms)", value: "1000" },
                { label: "Backoff Factor", value: "2" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-muted-foreground font-body mb-1">{f.label}</label>
                  <input
                    type="number"
                    defaultValue={f.value}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-semibold text-foreground font-body">Circuit Breaker</div>
                <div className="text-xs text-muted-foreground font-body">Auto-pause on repeated failures</div>
              </div>
              <button onClick={() => setCircuitBreaker(!circuitBreaker)}>
                {circuitBreaker ? (
                  <ToggleRight size={28} style={{ color: "hsl(var(--accent))" }} />
                ) : (
                  <ToggleLeft size={28} className="text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Test API */}
          <div className="card-elevated p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-foreground">Connection Test</h2>
            <button
              onClick={runTest}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-body transition-all"
              style={{ background: "hsl(var(--accent))", color: "white" }}
            >
              <Play size={14} />
              Test API Connection
            </button>

            {testResult && (
              <div className="rounded-xl overflow-hidden">
                <div
                  className="px-4 py-2 flex items-center justify-between"
                  style={{
                    background: testResult === "success" ? "hsl(var(--success-bg))" : "hsl(var(--error-bg))",
                  }}
                >
                  <span
                    className="text-xs font-semibold font-display"
                    style={{ color: testResult === "success" ? "hsl(var(--success))" : "hsl(var(--error))" }}
                  >
                    {testResult === "success" ? "✓ 200 OK — 82ms" : "✗ Connection Failed"}
                  </span>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Copy size={12} />
                  </button>
                </div>
                <pre className="p-4 text-xs font-mono" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>
                  {RESPONSE_MOCK}
                </pre>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded-lg border border-border text-sm font-body text-muted-foreground hover:text-foreground transition-all">
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
