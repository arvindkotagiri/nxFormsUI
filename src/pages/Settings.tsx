import { useState, useEffect } from "react";
import { Save, ToggleLeft, ToggleRight, Plus, Trash2, Cpu, BrainCircuit, RefreshCw } from "lucide-react";
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

function SelectInput({ options, value, onChange }: { options: string[] | {name: string, display_name: string}[], value: string, onChange?: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30 w-48"
    >
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.name;
        const display = typeof o === 'string' ? o : o.display_name;
        return <option key={val} value={val}>{display}</option>
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

  useEffect(() => {
    if (activeTab === 3) {
        fetchModels();
    }
  }, [activeTab]);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
        const [modelsRes, configsRes] = await Promise.all([
            fetch(`${flaskAPI}/available-models`),
            fetch(`${flaskAPI}/model-configs`)
        ]);
        const models = await modelsRes.json();
        const configs = await configsRes.json();
        setAvailableModels(Array.isArray(models) ? models : []);
        setModelConfigs(configs || {});
    } catch (err) {
        console.error("Failed to fetch models", err);
        setAvailableModels([]);
    } finally {
        setIsLoadingModels(false);
    }
  };

  const handleSaveModelConfigs = async () => {
    try {
        const res = await fetch(`${flaskAPI}/model-configs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(modelConfigs)
        });
        if (res.ok) alert("AI Model configurations saved successfully!");
    } catch (err) {
        alert("Failed to save model configs");
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
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body"
          style={{ background: "hsl(var(--accent))", color: "white" }}
        >
          <Save size={14} />
          Save Changes
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
          <Section title="Process Model Assignment">
            <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-muted-foreground italic"> Assign specific Gemini models to each core process. </div>
                <button 
                    onClick={fetchModels}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                    disabled={isLoadingModels}
                >
                    <RefreshCw size={14} className={isLoadingModels ? "animate-spin" : ""} />
                </button>
            </div>
            
            <FormRow label="OCR & Analyze" description="Model used for initial document field extraction">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_analyze || ""} 
                onChange={(v) => setModelConfigs(prev => ({...prev, model_analyze: v}))}
              />
            </FormRow>
            
            <FormRow label="ZPL Generation" description="Model used for label code creation">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_zpl || ""} 
                onChange={(v) => setModelConfigs(prev => ({...prev, model_zpl: v}))}
              />
            </FormRow>

            <FormRow label="Invoice/HTML Replication" description="Model used for Tailwind/HTML generation">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_invoice || ""} 
                onChange={(v) => setModelConfigs(prev => ({...prev, model_invoice: v}))}
              />
            </FormRow>

            <FormRow label="Adobe XDP Generation" description="Model used for XFA/XDP XML structure">
              <SelectInput 
                options={availableModels} 
                value={modelConfigs.model_xdp || ""} 
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
