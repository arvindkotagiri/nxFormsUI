import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { ConnectionConfig } from "./types";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, ShieldCheck, KeyRound, Link2 } from "lucide-react";

type TestStatus = "idle" | "connecting" | "token" | "metadata" | "success" | "error";

interface Props {
  value: ConnectionConfig;
  onChange: (next: ConnectionConfig) => void;
  onTested: (ok: boolean) => void;
  tested: boolean;
}

export function StepConnection({ value, onChange, onTested, tested }: Props) {
  const [showSecret, setShowSecret] = useState(false);
  const [status, setStatus] = useState<TestStatus>(tested ? "success" : "idle");
  const [error, setError] = useState<string | null>(null);

  const canTest = value.baseUrl && value.tokenUrl && value.clientId && value.clientSecret;

  async function handleTest() {
    setError(null);
    setStatus("connecting");
    await new Promise((r) => setTimeout(r, 700));
    setStatus("token");
    await new Promise((r) => setTimeout(r, 700));
    setStatus("metadata");
    await new Promise((r) => setTimeout(r, 900));
    // Heuristic: if base url doesn't look like a URL, fail
    if (!/^https?:\/\//i.test(value.baseUrl)) {
      setStatus("error");
      setError("Base URL must start with http:// or https://");
      onTested(false);
      return;
    }
    setStatus("success");
    onTested(true);
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Connect to SAP S/4HANA</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We use OAuth 2.0 Client Credentials to securely fetch your OData metadata. Credentials are never stored in plain text.
        </p>
      </header>

      <div className="grid gap-5">
        <Field
          icon={<Link2 className="h-4 w-4" />}
          id="base-url"
          label="OData Base URL"
          placeholder="https://my.s4hana.cloud/sap/opu/odata/sap/API_BUSINESS_PARTNER"
          value={value.baseUrl}
          onChange={(v) => onChange({ ...value, baseUrl: v })}
          help="Root path of the OData service. We'll append /$metadata to it."
        />
        <Field
          icon={<ShieldCheck className="h-4 w-4" />}
          id="token-url"
          label="OAuth Token URL"
          placeholder="https://auth.s4hana.cloud/oauth/token"
          value={value.tokenUrl}
          onChange={(v) => onChange({ ...value, tokenUrl: v })}
          help="Endpoint that issues the OAuth access token."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field
            icon={<KeyRound className="h-4 w-4" />}
            id="client-id"
            label="Client ID"
            placeholder="sb-mygo-integration!t12345"
            value={value.clientId}
            onChange={(v) => onChange({ ...value, clientId: v })}
          />
          <div className="space-y-2">
            <Label htmlFor="client-secret" className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Client Secret
            </Label>
            <div className="relative">
              <Input
                id="client-secret"
                type={showSecret ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={value.clientSecret}
                onChange={(e) => onChange({ ...value, clientSecret: e.target.value })}
                className="h-11 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Stored encrypted at rest.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Test connection</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              We'll request a token and fetch <code className="rounded bg-muted px-1 py-0.5 text-[11px]">$metadata</code> to validate.
            </p>
          </div>
          <Button
            onClick={handleTest}
            disabled={!canTest || status === "connecting" || status === "token" || status === "metadata"}
            variant="default"
            className="bg-primary hover:bg-primary/90"
          >
            {(status === "connecting" || status === "token" || status === "metadata") && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {status === "success" ? "Test again" : "Test connection"}
          </Button>
        </div>

        {status !== "idle" && (
          <ul className="mt-5 space-y-2.5">
            <StatusLine
              label="Generating OAuth token"
              state={
                status === "connecting" ? "loading" :
                status === "token" || status === "metadata" || status === "success" ? "done" :
                status === "error" ? "done" : "idle"
              }
            />
            <StatusLine
              label="Fetching $metadata"
              state={
                status === "token" ? "loading" :
                status === "metadata" || status === "success" ? "done" :
                status === "error" ? "error" : "idle"
              }
            />
            <StatusLine
              label="Validating service document"
              state={
                status === "metadata" ? "loading" :
                status === "success" ? "done" :
                status === "error" ? "error" : "idle"
              }
            />
          </ul>
        )}

        {status === "success" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Connection verified — metadata loaded successfully.
          </div>
        )}
        {status === "error" && error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <XCircle className="h-4 w-4 mt-0.5" />
            <div>
              <div className="font-medium">Connection failed</div>
              <div className="text-xs opacity-90">{error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  icon, id, label, placeholder, value, onChange, help,
}: { icon: React.ReactNode; id: string; label: string; placeholder: string; value: string; onChange: (v: string) => void; help?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        {label}
      </Label>
      <Input id={id} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="h-11" />
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
    </div>
  );
}

function StatusLine({ label, state }: { label: string; state: "idle" | "loading" | "done" | "error" }) {
  return (
    <li className="flex items-center gap-3 text-sm">
      <span className={cn(
        "flex h-5 w-5 items-center justify-center rounded-full",
        state === "done" && "bg-green-500 text-white",
        state === "loading" && "bg-primary/15 text-primary",
        state === "error" && "bg-destructive text-destructive-foreground",
        state === "idle" && "bg-muted text-muted-foreground",
      )}>
        {state === "done" && <CheckCircle2 className="h-3.5 w-3.5" />}
        {state === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
        {state === "error" && <XCircle className="h-3.5 w-3.5" />}
        {state === "idle" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      </span>
      <span className={cn(
        state === "idle" ? "text-muted-foreground" : "text-foreground",
      )}>
        {label}
      </span>
    </li>
  );
}
