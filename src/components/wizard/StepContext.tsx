import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContextConfig } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  value: ContextConfig;
  onChange: (next: ContextConfig) => void;
  errors?: Partial<Record<keyof ContextConfig, string>>;
}

const APPLICATIONS = ["S4Hana", "ECC", "NetSuite"] as const;

const ENVIRONMENTS = [
  "Sandbox",
  "Dev",
  "QA",
  "Pre-Prod",
  "Prod",
  "Other",
] as const;

export function StepContext({ value, onChange, errors }: Props) {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">
          Set up your import context
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Give this integration a recognizable name so your team can find it later.
        </p>
      </header>

      <div className="grid gap-5">

        {/* Row 1: Context Name + Client */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-2">
            <Label htmlFor="ctx-name" className="text-sm font-medium">
              Context name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ctx-name"
              placeholder="e.g. SAP S/4HANA — EMEA Sales"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              className={cn(
                "h-9",
                errors?.name && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {errors?.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : (
              <p className="text-xs text-muted-foreground">A short, descriptive label.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctx-client" className="text-sm font-medium">
              Client <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ctx-client"
              placeholder="100"
              maxLength={3}
              value={value.client}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
                onChange({ ...value, client: digits });
              }}
              className={cn(
                "h-9 w-24 text-center tracking-widest font-mono",
                errors?.client && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {errors?.client ? (
              <p className="text-xs text-destructive">{errors.client}</p>
            ) : (
              <p className="text-xs text-muted-foreground">3-digit code</p>
            )}
          </div>
        </div>

        {/* Row 2: Application + Environment */}
        <div className="grid grid-cols-2 gap-4 items-start">
          <div className="space-y-2">
            <Label htmlFor="ctx-application" className="text-sm font-medium">
              Application <span className="text-destructive">*</span>
            </Label>
            <Select
              value={value.application}
              onValueChange={(v) => onChange({ ...value, application: v })}
            >
              <SelectTrigger
                id="ctx-application"
                className={cn(
                  "h-9",
                  errors?.application && "border-destructive focus-visible:ring-destructive"
                )}
              >
                <SelectValue placeholder="Select application..." />
              </SelectTrigger>
              <SelectContent>
                {APPLICATIONS.map((app) => (
                  <SelectItem key={app} value={app}>{app}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.application && (
              <p className="text-xs text-destructive">{errors.application}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ctx-env" className="text-sm font-medium">
              Environment <span className="text-destructive">*</span>
            </Label>
            <Select
              value={value.environment}
              onValueChange={(v) => onChange({ ...value, environment: v })}
            >
              <SelectTrigger
                id="ctx-env"
                className={cn(
                  "h-9",
                  errors?.environment && "border-destructive focus-visible:ring-destructive"
                )}
              >
                <SelectValue placeholder="Select environment..." />
              </SelectTrigger>
              <SelectContent>
                {ENVIRONMENTS.map((env) => (
                  <SelectItem key={env} value={env}>{env}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.environment && (
              <p className="text-xs text-destructive">{errors.environment}</p>
            )}
          </div>
        </div>

        {/* Row 3: Description — full width, optional so kept last */}
        <div className="space-y-2">
          <Label htmlFor="ctx-desc" className="text-sm font-medium">
            Description
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="ctx-desc"
            rows={2}
            placeholder="What will this integration be used for?"
            value={value.description}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            className="resize-none text-sm"
          />
        </div>

      </div>
    </div>
  );
}