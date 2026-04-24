import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = { id: number; title: string; subtitle: string };

interface StepperProps {
  steps: Step[];
  current: number;
  onStepClick?: (id: number) => void;
}

export function Stepper({ steps, current, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-start gap-2 sm:gap-4">
        {steps.map((step, idx) => {
          const isComplete = step.id < current;
          const isActive = step.id === current;
          const clickable = step.id < current && !!onStepClick;
          return (
            <li key={step.id} className="flex-1 min-w-0">
              <button
                type="button"
                onClick={() => clickable && onStepClick?.(step.id)}
                disabled={!clickable}
                className={cn(
                  "group w-full text-left",
                  clickable && "cursor-pointer",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                      isComplete && "border-primary bg-primary text-primary-foreground",
                      isActive && "border-accent bg-accent text-accent-foreground shadow-[0_0_0_4px_hsl(var(--accent)/0.15)]",
                      !isComplete && !isActive && "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <div className="min-w-0 hidden sm:block">
                    <div className={cn(
                      "text-sm font-semibold truncate",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{step.subtitle}</div>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className="mt-3 hidden sm:block h-0.5 w-full rounded-full bg-border overflow-hidden">
                    <div
                      className={cn(
                        "h-full bg-primary transition-all duration-500",
                        isComplete ? "w-full" : "w-0",
                      )}
                    />
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
