import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { EntityConfig } from "./types";
import { Info, KeyRound, Link2, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  entities: Record<string, EntityConfig>;
  onChange: (next: Record<string, EntityConfig>) => void;
}

export function StepEntities({ entities, onChange }: Props) {
  const enabledCount = Object.values(entities).filter((e) => e.enabled).length;

  function update(name: string, patch: Partial<EntityConfig>) {
    onChange({ ...entities, [name]: { ...entities[name], ...patch } });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Choose entity sets to import</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Toggle on the business objects you want available. You can rename them to match your team's vocabulary.
            </p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 self-start sm:self-auto">
            <Database className="h-3 w-3 mr-1" />
            {enabledCount} of {Object.keys(entities).length} selected
          </Badge>
        </header>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b bg-muted/40 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div className="col-span-1">Include</div>
            <div className="col-span-3">Entity Set</div>
            <div className="col-span-3">Business Name</div>
            <div className="col-span-4">Description</div>
            <div className="col-span-1 text-right">Info</div>
          </div>
          <ul className="divide-y">
            {Object.values(entities).map((cfg) => {
              return (
                <li
                  key={cfg.originalName}
                  className={cn(
                    "grid grid-cols-12 gap-4 px-5 py-4 items-center transition-colors hover:bg-muted/30",
                    cfg.enabled && "bg-primary/5",
                  )}
                >
                  <div className="col-span-1">
                    <Switch
                      checked={cfg.enabled}
                      onCheckedChange={(v) => update(cfg.originalName, { enabled: v })}
                      aria-label={`Toggle ${cfg.label}`}
                    />
                  </div>
                  <div className="col-span-3 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-medium truncate">{cfg.originalName}</code>
                      {cfg.isCore && (
                        <Badge variant="secondary" className="bg-accent/15 text-accent border-0 text-[10px] px-1.5 py-0 h-4">CORE</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {cfg.fieldCount} fields · {cfg.keyCount} keys
                    </div>
                  </div>
                  <div className="col-span-3">
                    <Input
                      value={cfg.label}
                      onChange={(e) => update(cfg.originalName, { label: e.target.value })}
                      className="h-9 bg-background"
                      disabled={!cfg.enabled}
                    />
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={cfg.description}
                      onChange={(e) => update(cfg.originalName, { description: e.target.value })}
                      className="h-9 bg-background"
                      disabled={!cfg.enabled}
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Entity details"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        <div className="space-y-2">
                          <div className="text-xs">
                            <span className="font-semibold">Entity type:</span> {cfg.isCore ? "Core" : "Extension"}
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold flex items-center gap-1"><KeyRound className="h-3 w-3" /> Keys:</span>
                            {cfg.keyCount} keys
                          </div>
                          {cfg.relationships && cfg.relationships.length > 0 && (
                            <div className="text-xs">
                              <span className="font-semibold flex items-center gap-1"><Link2 className="h-3 w-3" /> Relations:</span>
                              {cfg.relationships.join(", ")}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </TooltipProvider>
  );
}
