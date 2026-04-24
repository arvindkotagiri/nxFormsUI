import { useMemo, useState } from "react";
import { Stepper } from "./Stepper";
import { StepContext } from "./StepContext";
import { StepConnection } from "./StepConnection";
import { StepEntities } from "./StepEntities";
import { StepFields } from "./StepFields";
import { StepReview } from "./StepReview";
import type { WizardState } from "./types";
import { SAMPLE_ENTITIES } from "@/lib/sample-metadata";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Context", subtitle: "Name & environment" },
  { id: 2, title: "Connection", subtitle: "OAuth credentials" },
  { id: 3, title: "Entities", subtitle: "Select objects" },
  { id: 4, title: "Fields", subtitle: "Configure attributes" },
  { id: 5, title: "Review", subtitle: "Save definition" },
];

function buildInitialState(): WizardState {
  const entities: WizardState["entities"] = {};
  const fields: WizardState["fields"] = {};
  SAMPLE_ENTITIES.forEach((e) => {
    entities[e.name] = {
      enabled: e.isCore,
      label: e.label,
      description: e.description,
    };
    fields[e.name] = {};
    e.fields.forEach((f) => {
      fields[e.name][f.name] = {
        enabled: f.isKey || f.recommended,
        label: f.label,
        description: f.description,
      };
    });
  });
  return {
    step: 1,
    context: { name: "", description: "", environment: "dev" },
    connection: { baseUrl: "", tokenUrl: "", clientId: "", clientSecret: "" },
    entities,
    fields,
  };
}

interface ImportWizardProps {
  onSaved?: () => void;
  onCancel?: () => void;
}

export function ImportWizard({ onSaved, onCancel }: ImportWizardProps) {
  const [state, setState] = useState<WizardState>(buildInitialState);
  const [tested, setTested] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const enabledEntityCount = useMemo(
    () => Object.values(state.entities).filter((e) => e.enabled).length,
    [state.entities],
  );

  function setStep(step: number) {
    setState((s) => ({ ...s, step }));
  }

  function next() {
    if (state.step === 1) {
      if (!state.context.name.trim()) {
        setErrors({ name: "Context name is required" });
        return;
      }
    }
    if (state.step === 2 && !tested) {
      toast.error("Please test the connection before continuing.");
      return;
    }
    if (state.step === 3 && enabledEntityCount === 0) {
      toast.error("Select at least one entity set.");
      return;
    }
    setErrors({});
    setStep(Math.min(state.step + 1, STEPS.length));
  }

  function back() {
    setStep(Math.max(state.step - 1, 1));
  }

  function handleSave() {
    setSaved(true);
    toast.success("API definition saved", {
      description: `${state.context.name} is now available in your workspace.`,
    });
    if (onSaved) onSaved();
  }

  function handleReset() {
    setState(buildInitialState());
    setTested(false);
    setSaved(false);
    setErrors({});
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl text-center py-16 animate-in fade-in zoom-in duration-300">
        <div className="mx-auto h-16 w-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-6">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-3xl font-semibold tracking-tight">All set!</h2>
        <p className="mt-3 text-muted-foreground font-body">
          <span className="font-medium text-foreground">{state.context.name}</span> has been saved with{" "}
          {enabledEntityCount} entity sets configured.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="outline" onClick={handleReset}>Create another</Button>
          <Button className="bg-primary hover:bg-primary/90" onClick={onCancel}>Finish</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-2xl border bg-card px-6 py-5 shadow-sm">
        <Stepper steps={STEPS} current={state.step} onStepClick={setStep} />
      </div>

      <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-sm min-h-[480px]">
        {state.step === 1 && (
          <StepContext
            value={state.context}
            onChange={(context) => setState((s) => ({ ...s, context }))}
            errors={errors as { name?: string }}
          />
        )}
        {state.step === 2 && (
          <StepConnection
            value={state.connection}
            onChange={(connection) => { setState((s) => ({ ...s, connection })); setTested(false); }}
            onTested={setTested}
            tested={tested}
          />
        )}
        {state.step === 3 && (
          <StepEntities
            entities={state.entities}
            onChange={(entities) => setState((s) => ({ ...s, entities }))}
          />
        )}
        {state.step === 4 && (
          <StepFields
            entities={state.entities}
            fields={state.fields}
            onChange={(fields) => setState((s) => ({ ...s, fields }))}
          />
        )}
        {state.step === 5 && (
          <StepReview state={state} onEdit={setStep} onSave={handleSave} onCancel={onCancel || handleReset} />
        )}
      </div>

      {state.step < 5 && (
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={back} disabled={state.step === 1}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5 font-body">
              <Sparkles className="h-3 w-3 text-accent" /> Your progress is saved as you go
            </span>
            <Button onClick={next} className="bg-primary hover:bg-primary/90 min-w-[120px]">
              Continue <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
