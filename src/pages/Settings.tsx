import { useState, useEffect, useCallback } from "react";
import { Save, ToggleLeft, ToggleRight, RefreshCw, BrainCircuit, Cpu, CheckCircle2, XCircle, Loader2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const flaskAPI = import.meta.env.VITE_FLASK_API;

const TABS = [
  "General",
  "Security",
  "Processing Engine",
  "AI Models",
  "Notifications",
  "Data Retention",
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}>
      {value ? (
        <ToggleRight size={28} style={{ color: "hsl(var(--accent))" }} />
      ) : (
        <ToggleLeft size={28} className="text-muted-foreground" />
      )}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card-elevated p-5 space-y-4">
      <h3 className="font-display text-base font-semibold text-foreground border-b border-border pb-3">{title}</h3>
      {children}
    </div>
  );
}

function FormRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground font-body">{label}</div>
        {description && <div className="text-xs text-muted-foreground font-body mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function TextInput({ defaultValue, type = "text" }: { defaultValue: string; type?: string }) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30 w-48"
    />
  );
}

function SelectInput({ options, value, onChange, placeholder }: { options: string[] | {name: string, display_name: string}[], value: string, onChange?: (v: string) => void, placeholder?: string }) {
  const hasOptions = options.length > 0;
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30 w-56"
    >
      {!hasOptions && (
        <option value="" disabled>{placeholder ?? "— No models loaded —"}</option>
      )}
      {hasOptions && !value && (
        <option value="" disabled>{placeholder ?? "Select a model"}</option>
      )}
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.name;
        const display = typeof o === 'string' ? o : o.display_name;
        return <option key={val} value={val}>{display}</option>;
      })}
    </select>
  );
}

const roles = ["Admin", "Operator", "Viewer", "Developer"];
const permissions = ["Dashboard", "Events", "Outputs", "Templates", "Rules", "Printers", "API Config", "Logs", "Settings"];

const roleMatrix: Record<string, Record<string, boolean>> = {
  Admin: Object.fromEntries(permissions.map((p) => [p, true])),
  Operator: Object.fromEntries(permissions.map((p) => [p, !["API Config", "Settings"].includes(p)])),
  Developer: Object.fromEntries(permissions.map((p) => [p, !["Settings"].includes(p)])),
  Viewer: Object.fromEntries(permissions.map((p) => [p, ["Dashboard", "Events", "Outputs", "Logs"].includes(p)])),
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState(0);
  const [oauth, setOauth] = useState(true);
  const [autoProcess, setAutoProcess] = useState(true);
  const [emailFail, setEmailFail] = useState(true);
  const [slack, setSlack] = useState(false);
  const [teams, setTeams] = useState(false);
  const [archive, setArchive] = useState(true);
  const [matrixState, setMatrixState] = useState(roleMatrix);

  // AI Model State
  const [availableModels, setAvailableModels] = useState<{name: string, display_name: string}[]>([]);
  const [modelConfigs, setModelConfigs] = useState<Record<string, string>>({});
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState<string>("");

  // On switching to AI Models tab, load using DB-stored keys (GET)
  useEffect(() => {
    if (activeTab === 3) {
        // Intentionally call without args to use GET (DB-stored keys) on mount
        fetch(`${flaskAPI}/available-models`)
            .then(r => r.json())
            .then(models => setAvailableModels(Array.isArray(models) ? models : []))
            .catch(() => setAvailableModels([]));
        fetch(`${flaskAPI}/model-configs`)
            .then(r => r.json())
            .then(configs => setModelConfigs(configs || {}))
            .catch(() => {});
    }
  }, [activeTab]);

  const fetchModels = useCallback(async (keysToUse?: Record<string, string>) => {
    setIsLoadingModels(true);
    try {
        // Use provided keys (unsaved) or fall back to a plain GET (DB keys)
        const keys = keysToUse ?? modelConfigs;
        const hasAnyKey = keys.api_gemini || keys.api_openai || keys.api_anthropic;

        let models: {name: string, display_name: string}[] = [];
        if (hasAnyKey) {
            // POST with current keys so backend can list models without saving first
            const res = await fetch(`${flaskAPI}/available-models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_gemini: keys.api_gemini || "",
                    api_openai: keys.api_openai || "",
                    api_anthropic: keys.api_anthropic || ""
                })
            });
            models = await res.json();
        } else {
            const res = await fetch(`${flaskAPI}/available-models`);
            models = await res.json();
        }

        const configsRes = await fetch(`${flaskAPI}/model-configs`);
        const configs = await configsRes.json();

        setAvailableModels(Array.isArray(models) ? models : []);
        setModelConfigs(prev => ({ ...prev, ...configs }));
    } catch (err) {
        console.error("Failed to fetch models", err);
        setAvailableModels([]);
    } finally {
        setIsLoadingModels(false);
    }
  }, [modelConfigs]);

  const handleSaveModelConfigs = async () => {
    setSaveStatus('saving');
    setSaveMessage("");
    try {
        const res = await fetch(`${flaskAPI}/model-configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(modelConfigs)
        });
        if (res.ok) {
           setSaveStatus('success');
           setSaveMessage("API keys & model assignments saved!");
           // Refresh model list using now-saved keys
           await fetchModels(modelConfigs);
        } else {
           setSaveStatus('error');
           setSaveMessage("Save failed — check backend logs.");
        }
    } catch (err) {
        setSaveStatus('error');
        setSaveMessage("Network error — could not save.");
    } finally {
        setTimeout(() => { setSaveStatus('idle'); setSaveMessage(""); }, 4000);
    }
  };

  const toggleMatrix = (role: string, perm: string) => {
    setMatrixState((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] },
    }));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Platform configuration & administration
          </p>
        </div>
        <button
          onClick={activeTab === 3 ? handleSaveModelConfigs : () => {}}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
          style={{ background: "hsl(var(--accent))", color: "white" }}
          disabled={activeTab === 3 && saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saveStatus === 'saving' ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted w-fit overflow-x-auto no-scrollbar">
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={cn("tab-pill whitespace-nowrap", activeTab === idx && "active")}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* General */}
      {activeTab === 0 && (
        <div className="space-y-4 animate-fade-in">
          <Section title="General Configuration">
            <FormRow label="Environment Label">
              <SelectInput options={["DEV", "QA", "PROD"]} value="DEV" />
            </FormRow>
            <FormRow label="Timezone">
              <SelectInput options={["UTC", "America/New_York", "Europe/London", "Asia/Singapore"]} value="UTC" />
            </FormRow>
            <FormRow label="Default Printer Fallback">
              <SelectInput options={["PDF-EXPORT", "LBL-PRN-01", "RPT-PRN-01"]} value="PDF-EXPORT" />
            </FormRow>
            <FormRow label="Max Retry Attempts">
              <TextInput defaultValue="3" type="number" />
            </FormRow>
            <FormRow label="Retry Interval (ms)">
              <TextInput defaultValue="1000" type="number" />
            </FormRow>
          </Section>
        </div>
      )}

      {/* Security */}
      {activeTab === 1 && (
        <div className="space-y-4 animate-fade-in">
          <Section title="Authentication & Authorization">
            <FormRow label="OAuth2 Authentication" description="Enable OAuth2 for external API authentication">
              <Toggle value={oauth} onChange={setOauth} />
            </FormRow>
            <FormRow label="JWT Expiry (minutes)">
              <TextInput defaultValue="60" type="number" />
            </FormRow>
          </Section>

          <Section title="Role Management">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-body">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider">Permission</th>
                    {roles.map((role) => (
                      <th key={role} className="text-center px-3 py-2 text-muted-foreground font-semibold uppercase tracking-wider">{role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((perm, i) => (
                    <tr key={perm} className={cn("border-t border-border", i % 2 === 0 ? "bg-card" : "bg-background")}>
                      <td className="px-3 py-2.5 font-medium text-foreground">{perm}</td>
                      {roles.map((role) => (
                        <td key={role} className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={matrixState[role]?.[perm] ?? false}
                            onChange={() => toggleMatrix(role, perm)}
                            className="rounded accent-accent w-4 h-4"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </div>
      )}

      {/* Processing Engine */}
      {activeTab === 2 && (
        <div className="space-y-4 animate-fade-in">
          <Section title="Engine Configuration">
            <FormRow label="Parallel Worker Count">
              <TextInput defaultValue="8" type="number" />
            </FormRow>
            <FormRow label="Queue Strategy">
              <SelectInput options={["FIFO", "Priority", "Round Robin", "Weighted"]} value="Priority" />
            </FormRow>
            <FormRow label="Auto Processing" description="Automatically process queued events">
              <Toggle value={autoProcess} onChange={setAutoProcess} />
            </FormRow>
            <FormRow label="Circuit Breaker Threshold">
              <TextInput defaultValue="5" type="number" />
            </FormRow>
            <FormRow label="Circuit Breaker Reset (s)">
              <TextInput defaultValue="30" type="number" />
            </FormRow>
          </Section>
        </div>
      )}

      {/* AI Models */}
      {activeTab === 3 && (
        <div className="space-y-4 animate-fade-in">
          <Section title="AI Engine API Keys">
            <div className="text-xs text-muted-foreground italic mb-4">Paste your API keys below. They are stored securely in the local database. After entering a key, click <strong>Load Models</strong> to see available models.</div>
            
            {/* Save status toast */}
            {saveMessage && (
              <div className={cn(
                "flex items-center gap-2 text-sm px-4 py-3 rounded-xl font-body mb-2",
                saveStatus === 'success' ? "bg-green-500/10 text-green-600 border border-green-500/30" : "bg-red-500/10 text-red-600 border border-red-500/30"
              )}>
                {saveStatus === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {saveMessage}
              </div>
            )}

            <FormRow label="Google Gemini API Key">
              <div className="flex items-center gap-2">
                <input 
                  type="password"
                  value={modelConfigs.api_gemini || ""}
                  onChange={(e) => setModelConfigs(prev => ({...prev, api_gemini: e.target.value}))}
                  className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30 w-56"
                  placeholder="AIzaSy..."
                />
                <button
                  onClick={() => fetchModels(modelConfigs)}
                  disabled={isLoadingModels}
                  title="Load models using current keys"
                  className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                >
                  {isLoadingModels ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                </button>
              </div>
            </FormRow>
            <FormRow label="OpenAI API Key">
              <div className="flex items-center gap-2">
                <input 
                  type="password"
                  value={modelConfigs.api_openai || ""}
                  onChange={(e) => setModelConfigs(prev => ({...prev, api_openai: e.target.value}))}
                  className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30 w-56"
                  placeholder="sk-..."
                />
                <button
                  onClick={() => fetchModels(modelConfigs)}
                  disabled={isLoadingModels}
                  title="Load models using current keys"
                  className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                >
                  {isLoadingModels ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                </button>
              </div>
            </FormRow>
            <FormRow label="Anthropic API Key">
              <div className="flex items-center gap-2">
                <input 
                  type="password"
                  value={modelConfigs.api_anthropic || ""}
                  onChange={(e) => setModelConfigs(prev => ({...prev, api_anthropic: e.target.value}))}
                  className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30 w-56"
                  placeholder="sk-ant-..."
                />
                <button
                  onClick={() => fetchModels(modelConfigs)}
                  disabled={isLoadingModels}
                  title="Load models using current keys"
                  className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                >
                  {isLoadingModels ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                </button>
              </div>
            </FormRow>
          </Section>

          <Section title="Process Model Assignment">
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-muted-foreground italic">Assign specific AI models to each core process. {availableModels.length === 0 && <span className="text-amber-500 ml-1">⚠ Enter API keys above and click the 🔑 button to load models.</span>}</div>
                <button 
                    onClick={() => fetchModels(modelConfigs)}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5 text-xs"
                    disabled={isLoadingModels}
                >
                    <RefreshCw size={13} className={isLoadingModels ? "animate-spin" : ""} />
                    {isLoadingModels ? "Loading…" : `Refresh (${availableModels.length})`}
                </button>
            </div>
            
            <FormRow label="OCR & Analyze" description="Model used for initial document field extraction">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_analyze || ""} 
                placeholder="— save API key & load models —"
                onChange={(v) => setModelConfigs(prev => ({...prev, model_analyze: v}))}
              />
            </FormRow>
            
            <FormRow label="ZPL Generation" description="Model used for label code creation">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_zpl || ""} 
                placeholder="— save API key & load models —"
                onChange={(v) => setModelConfigs(prev => ({...prev, model_zpl: v}))}
              />
            </FormRow>

            <FormRow label="Invoice/HTML Replication" description="Model used for Tailwind/HTML generation">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_invoice || ""} 
                placeholder="— save API key & load models —"
                onChange={(v) => setModelConfigs(prev => ({...prev, model_invoice: v}))}
              />
            </FormRow>

            <FormRow label="Adobe XDP Generation" description="Model used for XFA/XDP XML structure">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_xdp || ""} 
                placeholder="— save API key & load models —"
                onChange={(v) => setModelConfigs(prev => ({...prev, model_xdp: v}))}
              />
            </FormRow>
          </Section>

          <Section title="AI Engine Settings">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-background border border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <BrainCircuit size={20} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold">Gemini API Status</div>
                        <div className="text-xs text-success">Active & Connected</div>
                    </div>
                </div>
                <div className="p-4 rounded-xl bg-background border border-border flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                        <Cpu size={20} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold">Processing Mode</div>
                        <div className="text-xs text-muted-foreground">Low Latency Flash</div>
                    </div>
                </div>
             </div>
          </Section>
        </div>
      )}

      {/* Notifications */}
      {activeTab === 4 && (
        <div className="space-y-4 animate-fade-in">
          <Section title="Alert Channels">
            <FormRow label="Email on Failure" description="Send email alerts when outputs fail">
              <Toggle value={emailFail} onChange={setEmailFail} />
            </FormRow>
            {emailFail && (
              <FormRow label="Email Address">
                <TextInput defaultValue="ops@nxforms.io" type="email" />
              </FormRow>
            )}
            <FormRow label="Slack Webhook" description="Post alerts to a Slack channel">
              <Toggle value={slack} onChange={setSlack} />
            </FormRow>
            {slack && (
              <FormRow label="Webhook URL">
                <TextInput defaultValue="https://hooks.slack.com/..." />
              </FormRow>
            )}
            <FormRow label="Teams Webhook" description="Post alerts to Microsoft Teams">
              <Toggle value={teams} onChange={setTeams} />
            </FormRow>
          </Section>
        </div>
      )}

      {/* Data Retention */}
      {activeTab === 5 && (
        <div className="space-y-4 animate-fade-in">
          <Section title="Retention Policies">
            <FormRow label="Event Retention (days)">
              <TextInput defaultValue="90" type="number" />
            </FormRow>
            <FormRow label="Output Retention (days)">
              <TextInput defaultValue="180" type="number" />
            </FormRow>
            <FormRow label="Log Retention (days)">
              <TextInput defaultValue="365" type="number" />
            </FormRow>
            <FormRow label="Archive Strategy" description="Auto-archive expired records to cold storage">
              <Toggle value={archive} onChange={setArchive} />
            </FormRow>
            {archive && (
              <FormRow label="Archive Destination">
                <SelectInput options={["S3 Bucket", "Azure Blob", "GCS Bucket", "Local Disk"]} value="S3 Bucket" />
              </FormRow>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
