import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WizardState, EntityConfig } from "./types";
import { CheckCircle2, Database, Layers, Link2, Pencil, Server, Tag, Copy, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  state: WizardState;
  onEdit: (step: number) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function StepReview({ state, onEdit, onSave, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState<'url' | 'xml' | 'json'>('url');
  const entities = state?.entities || {};
  const enabledEntities = Object.values(entities).filter((e) => e?.enabled);
  const totalFields = enabledEntities.reduce(
    (sum, e) => sum + Object.values((state?.fields || {})[e.originalName] ?? {}).filter((f) => f?.enabled).length,
    0,
  );

  // Heuristic: retrieve saved navigation bindings or reconstruct them on the fly from relationships
  function getEntityBindings(entity: EntityConfig, allEntities: Record<string, EntityConfig>): Array<{ path: string; target: string }> {
    if (!entity) return [];
    if (entity.navigationBindings && entity.navigationBindings.length > 0) {
      return entity.navigationBindings;
    }

    if (!Array.isArray(entity.relationships) || entity.relationships.length === 0) {
      return [];
    }

    const reconstructed: Array<{ path: string; target: string }> = [];
    const allEntityNames = Object.keys(allEntities || {});

    for (const rel of entity.relationships) {
      if (!rel) continue;
      const relWord = rel.replace(/^to_/i, "").toLowerCase();
      
      let bestMatch = "";
      for (const name of allEntityNames) {
        const lowerName = name.toLowerCase();
        if (lowerName === relWord + "s" || lowerName === relWord || lowerName.includes(relWord)) {
          bestMatch = name;
          break;
        }
      }

      if (bestMatch) {
        reconstructed.push({
          path: rel,
          target: bestMatch
        });
      }
    }

    return reconstructed;
  }

  // Helper: Recursive expand path builder with Cycle/Loop Prevention
  function buildExpandString(
    entityName: string, 
    allEntities: Record<string, EntityConfig>,
    visited: Set<string> = new Set()
  ): string {
    const entity = allEntities[entityName];
    if (!entity) return "";

    // Cycle check: if this entity is already in our path, stop recursion to prevent browser crash
    if (visited.has(entityName.toLowerCase())) {
      return "";
    }

    // Add current entity to visited path
    const nextVisited = new Set(visited);
    nextVisited.add(entityName.toLowerCase());

    const bindings = getEntityBindings(entity, allEntities);
    if (bindings.length === 0) return "";

    const subExpands: string[] = [];
    for (const binding of bindings) {
      if (!binding?.target || !binding?.path) continue;
      const targetEntity = Object.values(allEntities).find(
        (e) => e.originalName.toLowerCase() === binding.target.toLowerCase() && e.enabled
      );
      if (targetEntity) {
        // Recursive call with updated visited set path
        const nested = buildExpandString(targetEntity.originalName, allEntities, nextVisited);
        if (nested) {
          subExpands.push(`${binding.path}($expand=${nested})`);
        } else {
          subExpands.push(binding.path);
        }
      }
    }

    return subExpands.join(",");
  }

  // Composes the final OData GET URL dynamically
  const composedGetUrl = (() => {
    const rootEntity = enabledEntities.find((e) => e.isCore) || enabledEntities[0];
    if (!rootEntity) return "";

    const expandStr = buildExpandString(rootEntity.originalName, entities);
    
    // Find the key field of the root entity set safely
    const rootFields = (state?.fields || {})[rootEntity.originalName] || {};
    const keyField = Object.values(rootFields).find((f) => f.isKey && f.enabled) 
      || Object.values(rootFields).find((f) => f.isKey)
      || Object.values(rootFields)[0];
      
    const filterQuery = keyField ? `$filter=${keyField.name} eq '203'` : "";

    let baseUrl = state?.connection?.baseUrl || "";
    baseUrl = baseUrl.replace(/\/\$metadata\/?$/i, "").replace(/\/$/, "");

    const queryParts: string[] = [];
    if (filterQuery) queryParts.push(filterQuery);
    if (expandStr) queryParts.push(`$expand=${expandStr}`);
    queryParts.push("$format=json");

    return `${baseUrl}/${rootEntity.originalName}?${queryParts.join("&")}`;
  })();

  // Composes the Navigation Property Bindings in XML
  const bindingsXML = (() => {
    let xml = "";
    for (const entity of enabledEntities) {
      const bindings = getEntityBindings(entity, state.entities);
      if (bindings.length > 0) {
        xml += `<EntitySet Name="${entity.originalName}">\n`;
        for (const binding of bindings) {
          xml += `    <NavigationPropertyBinding Path="${binding.path}" Target="${binding.target}"/>\n`;
        }
        xml += `</EntitySet>\n`;
      }
    }
    return xml.trim();
  })();

  // Composes the Navigation Property Bindings in JSON
  const bindingsJSON = (() => {
    const result: Record<string, Array<{ path: string; target: string }>> = {};
    for (const entity of enabledEntities) {
      const bindings = getEntityBindings(entity, state.entities);
      if (bindings.length > 0) {
        result[entity.originalName] = bindings;
      }
    }
    return JSON.stringify(result, null, 2);
  })();

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${type} to clipboard!`);
  };

  const downloadTextFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename} successfully`);
  };

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
        <Row label={state.connection.authType === "Basic" ? "Username" : "Client ID"} value={<code className="text-xs font-mono">{state.connection.authType === "Basic" ? state.connection.username : state.connection.clientId}</code>} />
        <Row label={state.connection.authType === "Basic" ? "Password" : "Client Secret"} value={<code className="text-xs font-mono">{state.connection.authType === "Basic" ? "•".repeat(Math.min(state.connection.password.length, 16)) : "•".repeat(Math.min(state.connection.clientSecret.length, 16))}</code>} />
      </SectionCard>

      <SectionCard title="Selected entities & fields" onEdit={() => onEdit(3)} icon={<Link2 className="h-4 w-4" />}>
        {enabledEntities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entities selected.</p>
        ) : (
          <ul className="divide-y -my-1">
            {enabledEntities.map((entity) => {
              const sel = Object.values(state.fields[entity.originalName] ?? {}).filter((f) => f.enabled).length;
              return (
                <li key={entity.originalName} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{entity.label}</div>
                    <code className="text-xs text-muted-foreground font-mono truncate">{entity.originalName}</code>
                  </div>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 shrink-0">
                    {sel} of {entity.fieldCount} fields
                  </Badge>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* OData Composition Card */}
      <section className="rounded-xl border bg-card shadow-sm overflow-hidden animate-fade-in">
        <header className="px-5 py-3.5 border-b bg-muted/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2 font-display text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            OData Endpoint Composition & Bindings
          </h3>
        </header>
        <div className="p-5 space-y-4">
          <div className="flex border-b text-xs font-medium">
            <button
              onClick={() => setActiveTab('url')}
              className={`pb-2 px-4 border-b-2 transition-all ${activeTab === 'url' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              Composed GET URL
            </button>
            <button
              onClick={() => setActiveTab('xml')}
              className={`pb-2 px-4 border-b-2 transition-all ${activeTab === 'xml' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              XML Bindings
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`pb-2 px-4 border-b-2 transition-all ${activeTab === 'json' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              JSON Bindings
            </button>
          </div>

          <div className="relative rounded-lg bg-muted/60 p-4 border font-mono text-xs overflow-x-auto max-h-60">
            {activeTab === 'url' && (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground">Auto-generated GET URL based on selections:</span>
                <code className="text-primary break-all">{composedGetUrl || "(No entities selected)"}</code>
              </div>
            )}
            {activeTab === 'xml' && (
              <pre className="text-foreground whitespace-pre">{bindingsXML || "<!-- No active navigation bindings -->"}</pre>
            )}
            {activeTab === 'json' && (
              <pre className="text-foreground whitespace-pre">{bindingsJSON}</pre>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'url' && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => copyToClipboard(composedGetUrl, "GET URL")}>
                  <Copy className="h-3.5 w-3.5" /> Copy URL
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => downloadTextFile(composedGetUrl, "get-url.txt", "text/plain")}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </>
            )}
            {activeTab === 'xml' && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => copyToClipboard(bindingsXML, "XML Bindings")}>
                  <Copy className="h-3.5 w-3.5" /> Copy XML
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => downloadTextFile(bindingsXML, "navigation-bindings.xml", "text/xml")}>
                  <Download className="h-3.5 w-3.5" /> Download XML
                </Button>
              </>
            )}
            {activeTab === 'json' && (
              <>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => copyToClipboard(bindingsJSON, "JSON Bindings")}>
                  <Copy className="h-3.5 w-3.5" /> Copy JSON
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => downloadTextFile(bindingsJSON, "navigation-bindings.json", "application/json")}>
                  <Download className="h-3.5 w-3.5" /> Download JSON
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

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
