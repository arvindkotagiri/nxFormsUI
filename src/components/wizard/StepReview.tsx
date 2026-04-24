import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SAMPLE_ENTITIES } from "@/lib/sample-metadata";
import type { WizardState } from "./types";
import { CheckCircle2, Database, Layers, Link2, Pencil, Server, Tag } from "lucide-react";

interface Props {
  state: WizardState;
  onEdit: (step: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function StepReview({ state, onEdit, onSave, onCancel }: Props) {
  const enabledEntities = SAMPLE_ENTITIES.filter((e) => state.entities[e.name]?.enabled);
  const totalFields = enabledEntities.reduce(
    (sum, e) => sum + Object.values(state.fields[e.name] ?? {}).filter((f) => f.enabled).length,
    0,
  );

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Review & save</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Final check before this API definition is saved to your workspace.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat icon={<Database className="h-4 w-4" />} label="Entity sets" value={enabledEntities.length} />
        <Stat icon={<Layers className="h-4 w-4" />} label="Fields selected" value={totalFields} />
        <Stat icon={<Tag className="h-4 w-4" />} label="Environment" value={state.context.environment.toUpperCase()} />
      </div>

      <SectionCard title="Context" onEdit={() => onEdit(1)}>
        <Row label="Name" value={state.context.name || "—"} />
        <Row label="Description" value={state.context.description || "—"} />
        <Row label="Environment" value={<Badge variant="secondary" className="bg-primary/10 text-primary border-0">{state.context.environment.toUpperCase()}</Badge>} />
      </SectionCard>

      <SectionCard title="Connection" onEdit={() => onEdit(2)} icon={<Server className="h-4 w-4" />}>
        <Row label="Base URL" value={<code className="text-xs font-mono break-all">{state.connection.baseUrl}</code>} />
        <Row label="Token URL" value={<code className="text-xs font-mono break-all">{state.connection.tokenUrl}</code>} />
        <Row label="Client ID" value={<code className="text-xs font-mono">{state.connection.clientId}</code>} />
        <Row label="Client Secret" value={<code className="text-xs font-mono">{"•".repeat(Math.min(state.connection.clientSecret.length, 16))}</code>} />
      </SectionCard>

      <SectionCard title="Selected entities & fields" onEdit={() => onEdit(3)} icon={<Link2 className="h-4 w-4" />}>
        {enabledEntities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entities selected.</p>
        ) : (
          <ul className="divide-y -my-1">
            {enabledEntities.map((entity) => {
              const cfg = state.entities[entity.name];
              const sel = Object.values(state.fields[entity.name] ?? {}).filter((f) => f.enabled).length;
              return (
                <li key={entity.name} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{cfg.label}</div>
                    <code className="text-xs text-muted-foreground font-mono truncate">{entity.name}</code>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 shrink-0">
                    {sel} of {entity.fields.length} fields
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border bg-card p-5 shadow-sm">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <div className="flex flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onEdit(1)}>Edit</Button>
          <Button onClick={onSave} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save API definition
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SectionCard({ title, icon, onEdit, children }: { title: string; icon?: React.ReactNode; onEdit: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <header className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs text-primary hover:text-accent transition-colors font-medium">
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </header>
      <div className="px-5 py-4 space-y-2.5">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
