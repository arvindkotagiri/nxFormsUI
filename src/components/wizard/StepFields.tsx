import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SAMPLE_ENTITIES, buildPreviewRows, type ODataEntity } from "@/lib/sample-metadata";
import type { EntityConfig, FieldConfig } from "./types";
import { Search, KeyRound, ChevronDown, Eye, Sparkles, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  entities: Record<string, EntityConfig>;
  fields: Record<string, Record<string, FieldConfig>>;
  onChange: (next: Record<string, Record<string, FieldConfig>>) => void;
}

type FilterMode = "all" | "selected" | "keys";

export function StepFields({ entities, fields, onChange }: Props) {
  const enabledEntities = useMemo(
    () => SAMPLE_ENTITIES.filter((e) => entities[e.name]?.enabled),
    [entities],
  );
  const [activeName, setActiveName] = useState(enabledEntities[0]?.name ?? "");
  const active = enabledEntities.find((e) => e.name === activeName) ?? enabledEntities[0];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!active) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center">
        <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-3" />
        <h3 className="font-semibold">No entity sets selected</h3>
        <p className="text-sm text-muted-foreground mt-1">Go back to step 3 and enable at least one entity.</p>
      </div>
    );
  }

  const activeFields = fields[active.name] ?? {};
  const types = Array.from(new Set(active.fields.map((f) => f.type)));

  const visibleFields = active.fields.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.label.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filter === "selected" && !activeFields[f.name]?.enabled) return false;
    if (filter === "keys" && !f.isKey) return false;
    if (typeFilter !== "all" && f.type !== typeFilter) return false;
    return true;
  });

  const enabledCount = Object.values(activeFields).filter((f) => f.enabled).length;

  function updateField(entityName: string, fieldName: string, patch: Partial<FieldConfig>) {
    const entFields = { ...(fields[entityName] ?? {}) };
    entFields[fieldName] = { ...entFields[fieldName], ...patch };
    onChange({ ...fields, [entityName]: entFields });
  }

  function bulk(entity: ODataEntity, mode: "recommended" | "keys" | "clear") {
    const entFields: Record<string, FieldConfig> = {};
    entity.fields.forEach((f) => {
      const current = fields[entity.name]?.[f.name];
      const enabled =
        f.isKey ? true :
        mode === "recommended" ? f.recommended :
        mode === "keys" ? false :
        false;
      entFields[f.name] = {
        enabled,
        label: current?.label ?? f.label,
        description: current?.description ?? f.description,
      };
    });
    onChange({ ...fields, [entity.name]: entFields });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-semibold tracking-tight">Configure fields per entity</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Pick which fields appear in your imported dataset. Key fields are always included.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Left panel: entity list */}
          <aside className="rounded-xl border bg-card overflow-hidden shadow-sm h-fit">
            <div className="px-4 py-3 border-b bg-muted/40">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity Sets</div>
            </div>
            <ul className="max-h-[520px] overflow-y-auto">
              {enabledEntities.map((entity) => {
                const cfg = entities[entity.name];
                const sel = Object.values(fields[entity.name] ?? {}).filter((f) => f.enabled).length;
                const total = entity.fields.length;
                const isActive = entity.name === active.name;
                return (
                  <li key={entity.name}>
                    <button
                      type="button"
                      onClick={() => setActiveName(entity.name)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-l-2 transition-colors",
                        isActive
                          ? "border-accent bg-primary/5"
                          : "border-transparent hover:bg-muted/40",
                      )}
                    >
                      <div className="font-medium text-sm truncate">{cfg.label}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate mt-0.5">{entity.name}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 rounded-full bg-border overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(sel / total) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{sel}/{total}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Right panel: fields */}
          <div className="rounded-xl border bg-card shadow-sm min-w-0">
            <div className="px-5 py-4 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{entities[active.name]?.label}</h3>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                      {enabledCount}/{active.fields.length} fields
                    </Badge>
                  </div>
                  <code className="text-xs text-muted-foreground font-mono">{active.name}</code>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview data
                </Button>
              </div>

              <div className="mt-4 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search fields..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  <SegmentBtn active={filter === "all"} onClick={() => setFilter("all")}>All</SegmentBtn>
                  <SegmentBtn active={filter === "selected"} onClick={() => setFilter("selected")}>Selected</SegmentBtn>
                  <SegmentBtn active={filter === "keys"} onClick={() => setFilter("keys")}>
                    <KeyRound className="h-3 w-3 mr-1" /> Keys
                  </SegmentBtn>
                </div>
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 pr-8 text-sm appearance-none"
                  >
                    <option value="all">All types</option>
                    {types.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => bulk(active, "recommended")} className="bg-accent/10 text-accent hover:bg-accent/20 border-0">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Select recommended
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulk(active, "keys")}>
                  <KeyRound className="h-3.5 w-3.5 mr-1" />
                  Keys only
                </Button>
                <Button size="sm" variant="ghost" onClick={() => bulk(active, "clear")}>
                  Clear all
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="text-left font-medium px-4 py-2.5 w-16">On</th>
                    <th className="text-left font-medium px-4 py-2.5">Field</th>
                    <th className="text-left font-medium px-4 py-2.5">Business Label</th>
                    <th className="text-left font-medium px-4 py-2.5">Type</th>
                    <th className="text-left font-medium px-4 py-2.5">Description</th>
                    <th className="text-left font-medium px-4 py-2.5">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFields.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No fields match your filters.
                      </td>
                    </tr>
                  )}
                  {visibleFields.map((f) => {
                    const cfg = activeFields[f.name];
                    const locked = f.isKey;
                    return (
                      <tr key={f.name} className={cn("border-b last:border-0 hover:bg-muted/30 transition-colors", cfg?.enabled && "bg-primary/5")}>
                        <td className="px-4 py-2.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Switch
                                  checked={cfg?.enabled ?? false}
                                  onCheckedChange={(v) => !locked && updateField(active.name, f.name, { enabled: v })}
                                  disabled={locked}
                                  aria-label={`Toggle ${f.name}`}
                                />
                              </span>
                            </TooltipTrigger>
                            {locked && (
                              <TooltipContent>Key fields are required and always included.</TooltipContent>
                            )}
                          </Tooltip>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono text-xs">{f.name}</code>
                            {f.isKey && (
                              <Badge variant="secondary" className="bg-accent/15 text-accent border-0 text-[10px] h-4 px-1.5">
                                <KeyRound className="h-2.5 w-2.5 mr-0.5" /> KEY
                              </Badge>
                            )}
                            {f.hasValueHelp && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <ChevronDown className="h-3 w-3 text-primary" />
                                </TooltipTrigger>
                                <TooltipContent>Predefined values available</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 min-w-[180px]">
                          <Input
                            value={cfg?.label ?? f.label}
                            onChange={(e) => updateField(active.name, f.name, { label: e.target.value })}
                            className="h-8 bg-background"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                            {f.type.replace("Edm.", "")}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 min-w-[220px]">
                          <Input
                            value={cfg?.description ?? f.description}
                            onChange={(e) => updateField(active.name, f.name, { description: e.target.value })}
                            className="h-8 bg-background"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {String(f.sample)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} entity={active} />
      </div>
    </TooltipProvider>
  );
}

function SegmentBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-3 h-9 text-xs font-medium transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function PreviewDialog({ open, onOpenChange, entity }: { open: boolean; onOpenChange: (v: boolean) => void; entity: ODataEntity }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Record<string, string | number>[]>([]);

  async function load() {
    setLoading(true);
    setRows([]);
    await new Promise((r) => setTimeout(r, 700));
    setRows(buildPreviewRows(entity, 5));
    setLoading(false);
  }

  // Auto-load when opened
  if (open && rows.length === 0 && !loading) {
    load();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setRows([]); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Sample data — {entity.label}
            <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 font-mono text-[11px]">
              GET {entity.name}?$top=5
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Fetching sample records…
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {entity.fields.slice(0, 6).map((f) => (
                      <th key={f.name} className="text-left px-3 py-2 font-medium text-xs text-muted-foreground whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      {entity.fields.slice(0, 6).map((f) => (
                        <td key={f.name} className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                          {String(r[f.name])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
