import { useMemo, useState } from "react";
import { Stepper } from "./Stepper";
import { StepContext } from "./StepContext";
import { StepConnection } from "./StepConnection";
import { StepEntities } from "./StepEntities";
import { StepFields } from "./StepFields";
import { StepReview } from "./StepReview";
import type { WizardState, EntityConfig, FieldConfig } from "./types";
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
  return {
    step: 1,
    context: { name: "", description: "", environment: "dev" },
    connection: { baseUrl: "", authType: "OAuth2", tokenUrl: "", clientId: "", clientSecret: "", username: "", password: "" },
    entities: {},
    fields: {},
  };
}

interface ImportWizardProps {
  initialData?: any;
  startStep?: number;
  onSaved?: () => void;
  onCancel?: () => void;
}

export function ImportWizard({ initialData, startStep, onSaved, onCancel }: ImportWizardProps) {
  const [state, setState] = useState<WizardState>(() => {
    const base = buildInitialState();
    if (initialData) {
      // Rehydrate entities and fields from backend format (arrays) to wizard format (Records)
      const entitiesRecord: Record<string, EntityConfig> = {};
      if (Array.isArray(initialData.entities)) {
        initialData.entities.forEach((e: any) => {
          entitiesRecord[e.name] = {
            enabled: true, // If it's in the backend, it's enabled
            label: e.label || e.name,
            description: e.description || "",
            originalName: e.name,
            fieldCount: e.fieldCount || 0,
            keyCount: e.keyCount || 0,
            isCore: e.isCore,
            relationships: e.relationships || []
          };
        });
      }

      const fieldsRecord: Record<string, Record<string, FieldConfig>> = {};
      if (initialData.fields && typeof initialData.fields === 'object') {
        Object.entries(initialData.fields).forEach(([entityName, fields]: [string, any]) => {
          fieldsRecord[entityName] = {};
          if (Array.isArray(fields)) {
            fields.forEach((f: any) => {
              fieldsRecord[entityName][f.name] = {
                enabled: true,
                label: f.label || f.name,
                description: f.description || "",
                originalName: f.name,
                type: f.type || "",
                isKey: !!f.isKey,
                hasValueHelp: f.hasValueHelp,
                sample: f.sample
              };
            });
          }
        });
      }

      return {
        ...base,
        context: { ...base.context, name: initialData.name || "" },
        connection: { 
          ...base.connection, 
          baseUrl: initialData.endpoint || "", 
          authType: initialData.auth_type || "OAuth2",
          clientId: initialData.client_id || "", 
          clientSecret: initialData.client_secret || "",
          username: initialData.username || "",
          password: initialData.password || ""
        },
        entities: entitiesRecord,
        fields: fieldsRecord,
        step: startStep || 1
      };
    }
    return base;
  });

  const [tested, setTested] = useState(!!startStep && startStep > 2);
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

  function handleMetadataLoaded(entities: any[]) {
    setState(s => {
      const newEntities: Record<string, EntityConfig> = { ...s.entities };
      const newFields: Record<string, Record<string, FieldConfig>> = { ...s.fields };

      entities.forEach(e => {
        // Only update if not already existing, or update counts
        if (!newEntities[e.name]) {
          newEntities[e.name] = {
            enabled: false, // Default to disabled, user must pick
            label: e.name,
            description: `Entity Set: ${e.name}`,
            originalName: e.name,
            fieldCount: e.fields.length,
            keyCount: e.fields.filter((f: any) => f.isKey).length,
            isCore: true,
            relationships: e.navigation ? e.navigation.map((n: any) => n.name) : []
          };
        } else {
            // Update counts if entity exists
            newEntities[e.name].fieldCount = e.fields.length;
            newEntities[e.name].keyCount = e.fields.filter((f: any) => f.isKey).length;
        }

        if (!newFields[e.name]) newFields[e.name] = {};
        
        e.fields.forEach((f: any) => {
          if (!newFields[e.name][f.name]) {
            newFields[e.name][f.name] = {
              enabled: true, // Default fields to enabled if entity is picked
              label: f.label || f.name,
              description: `Type: ${f.type}`,
              originalName: f.name,
              type: f.type,
              isKey: !!f.isKey,
              hasValueHelp: false,
              sample: ""
            };
          }
        });
      });

      return {
        ...s,
        entities: newEntities,
        fields: newFields
      };
    });
  }

  async function handleSave() {
    try {
      const flaskAPI = import.meta.env.VITE_FLASK_API;
      const isEdit = !!initialData?.id;
      const url = isEdit 
        ? `${flaskAPI}/api/catalog/${initialData.id}`
        : `${flaskAPI}/api/catalog`;
      
      // Flatten enabled entities and fields to save
      const enabledEntities = Object.entries(state.entities)
        .filter(([_, config]) => config.enabled)
        .map(([name, config]) => ({ name, ...config }));
      
      const enabledFields = Object.entries(state.fields).reduce((acc, [entityName, fields]) => {
        if (state.entities[entityName]?.enabled) {
          acc[entityName] = Object.entries(fields)
            .filter(([_, config]) => config.enabled)
            .map(([name, config]) => ({ name, ...config }));
        }
        return acc;
      }, {} as any);

      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.context.name,
          endpoint: state.connection.baseUrl,
          auth_type: state.connection.authType,
          client_id: state.connection.clientId,
          client_secret: state.connection.clientSecret,
          username: state.connection.username,
          password: state.connection.password,
          entities: enabledEntities,
          fields: enabledFields
        })
      });

      if (!response.ok) throw new Error("Failed to save context");

      setSaved(true);
      toast.success(isEdit ? "Context updated successfully" : "Context definition saved", {
        description: `${state.context.name} is now available in your workspace.`,
      });
      if (onSaved) onSaved();
    } catch (err) {
      toast.error("Error saving context configuration");
    }
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
            onTested={(ok, metadata) => {
              setTested(ok);
              if (ok && metadata) {
                handleMetadataLoaded(metadata);
              }
            }}
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
