import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ContextConfig, Environment } from "./types";
import { cn } from "@/lib/utils";
import { Server, FlaskConical, Rocket } from "lucide-react";

interface Props {
  value: ContextConfig;
  onChange: (next: ContextConfig) => void;
  errors?: Partial<Record<keyof ContextConfig, string>>;
}

const ENVIRONMENTS: { id: Environment; label: string; description: string; icon: typeof Server }[] = [
  { id: "dev", label: "Development", description: "Sandbox & experimentation", icon: FlaskConical },
  { id: "qa", label: "QA", description: "Quality assurance & testing", icon: Server },
  { id: "prod", label: "Production", description: "Live business systems", icon: Rocket },
];

export function StepContext({ value, onChange, errors }: Props) {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Set up your import context</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Give this integration a recognizable name so your team can find it later.
        </p>
      </header>

      <div className="grid gap-6">
        <div className="space-y-2">
          <Label htmlFor="ctx-name" className="text-sm font-medium">
            Context name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="ctx-name"
            placeholder="e.g. SAP S/4HANA — EMEA Sales"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
            className={cn("h-11", errors?.name && "border-destructive focus-visible:ring-destructive")}
          />
          {errors?.name ? (
            <p className="text-xs text-destructive">{errors.name}</p>
          ) : (
            <p className="text-xs text-muted-foreground">A short, descriptive label for this API connection.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctx-desc" className="text-sm font-medium">Description</Label>
          <Textarea
            id="ctx-desc"
            rows={3}
            placeholder="What will this integration be used for? (optional)"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Helpful context for teammates managing the integration.</p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Environment</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ENVIRONMENTS.map((env) => {
              const active = value.environment === env.id;
              const Icon = env.icon;
              return (
                <button
                  key={env.id}
                  type="button"
                  onClick={() => onChange({ ...value, environment: env.id })}
                  className={cn(
                    "group relative rounded-xl border-2 bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md",
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-border",
                  )}
                >
                  <div className={cn(
                    "mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-semibold">{env.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{env.description}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
