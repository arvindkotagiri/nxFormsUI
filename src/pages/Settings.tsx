import { useState } from "react";
import { Save, ToggleLeft, ToggleRight, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  "General",
  "Security",
  "Processing Engine",
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

function SelectInput({ options, defaultValue }: { options: string[]; defaultValue: string }) {
  return (
    <select
      defaultValue={defaultValue}
      className="px-3 py-2 text-sm rounded-xl border border-border bg-background text-foreground font-body focus:outline-none focus:ring-2 focus:ring-accent/30 w-48"
    >
      {options.map((o) => <option key={o}>{o}</option>)}
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
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body"
          style={{ background: "hsl(var(--accent))", color: "white" }}
        >
          <Save size={14} />
          Save Changes
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted w-fit">
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={cn("tab-pill", activeTab === idx && "active")}
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
              <SelectInput options={["DEV", "QA", "PROD"]} defaultValue="DEV" />
            </FormRow>
            <FormRow label="Timezone">
              <SelectInput options={["UTC", "America/New_York", "Europe/London", "Asia/Singapore"]} defaultValue="UTC" />
            </FormRow>
            <FormRow label="Default Printer Fallback">
              <SelectInput options={["PDF-EXPORT", "LBL-PRN-01", "RPT-PRN-01"]} defaultValue="PDF-EXPORT" />
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
              <SelectInput options={["FIFO", "Priority", "Round Robin", "Weighted"]} defaultValue="Priority" />
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

      {/* Notifications */}
      {activeTab === 3 && (
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

          <Section title="Escalation Rules">
            <div className="space-y-2">
              {[
                { condition: "Error rate > 5%", action: "Email + Slack" },
                { condition: "Queue depth > 500", action: "Email" },
              ].map((rule, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-background">
                  <div className="flex-1 space-y-1 text-xs font-body">
                    <div className="font-semibold text-foreground">If: {rule.condition}</div>
                    <div className="text-muted-foreground">Then: {rule.action}</div>
                  </div>
                  <button className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button className="flex items-center gap-2 text-xs font-semibold font-body transition-colors" style={{ color: "hsl(var(--accent))" }}>
                <Plus size={13} /> Add Escalation Rule
              </button>
            </div>
          </Section>
        </div>
      )}

      {/* Data Retention */}
      {activeTab === 4 && (
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
                <SelectInput options={["S3 Bucket", "Azure Blob", "GCS Bucket", "Local Disk"]} defaultValue="S3 Bucket" />
              </FormRow>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}
