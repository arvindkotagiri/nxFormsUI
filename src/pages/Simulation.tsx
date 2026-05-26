import { bootstrapTokenIfMissing, getLabels } from "@/lib/api";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_NODE_API;

// ─── Types ────────────────────────────────────────────────────────────────────

type Context = {
  id: string;
  name: string;
  endpoint: string;
};

type LabelRow = {
  id: string;
  name: string;
  context: string;
  field_mapping: Record<string, { path: string; transformations: any[] }>;
};

type FieldValues = Record<string, string>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthHeaders() {
  await bootstrapTokenIfMissing();
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SimulationPage() {
  // Data
  const [contexts, setContexts] = useState<Context[]>([]);
  const [labels, setLabels] = useState<LabelRow[]>([]);

  // Selections
  const [simulationName, setSimulationName] = useState<string>("");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const [fieldValues, setFieldValues] = useState<FieldValues>({});

  // UI state
  const [loadingContexts, setLoadingContexts] = useState(true);
  const [loadingLabels, setLoadingLabels] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<any>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Fetch contexts on mount
  useEffect(() => {
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_URL}/contexts`, { headers });
        const data: Context[] = await res.json();
        setContexts(data);
      } catch (e) {
        console.error("Failed to load contexts", e);
      } finally {
        setLoadingContexts(false);
      }
    })();
  }, []);

  // ── Fetch labels on mount
  useEffect(() => {
    (async () => {
      try {
        const allLabels = await getLabels();
        setLabels(allLabels);
      } catch (e) {
        console.error("Failed to load labels", e);
      } finally {
        setLoadingLabels(false);
      }
    })();
  }, []);

  // ── Derived: labels filtered by selected context
  const filteredLabels = selectedContext
    ? labels.filter(
        (l) => l.context?.toLowerCase() === selectedContext.toLowerCase()
      )
    : [];

  // ── Derived: field keys for the selected label
  const activeLabel = labels.find((l) => l.name === selectedLabel);
  const fieldKeys: string[] = activeLabel?.field_mapping
    ? Object.keys(activeLabel.field_mapping)
    : [];

  // ── When selected label changes, reset field values to empty strings
  useEffect(() => {
    if (fieldKeys.length > 0) {
      const initial: FieldValues = {};
      fieldKeys.forEach((k) => (initial[k] = ""));
      setFieldValues(initial);
    } else {
      setFieldValues({});
    }
    // Only clear banners when the user is actively changing selections,
    // not when label is cleared programmatically after a successful save.
    if (selectedLabel) {
      setSaveResult(null);
      setSaveError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabel]);

  // ── When context changes, clear label selection
  useEffect(() => {
    setSelectedLabel("");
    // Only clear banners when the user is actively changing context,
    // not when context is cleared programmatically after a successful save.
    if (selectedContext) {
      setSaveResult(null);
      setSaveError(null);
    }
  }, [selectedContext]);

  const handleFieldChange = (key: string, val: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
  };

  // ── Reset: clears everything including context and label
  const handleReset = () => {
    setSimulationName("");
    setSelectedContext("");  // triggers useEffect → clears selectedLabel
    setSelectedLabel("");    // triggers useEffect → clears fieldValues
    // Note: saveResult and saveError are intentionally NOT cleared here.
    // They are cleared when the user starts a new selection (see useEffects above).
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    setSaveError(null);
    try {
      const headers = await getAuthHeaders();

      const payload = {
        simulationName,
        context: selectedContext,
        form: selectedLabel,
        inputValues: fieldValues,
      };

      const res = await fetch(`${API_URL}/simulation`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");

      // Set result BEFORE resetting so the useEffects triggered by reset
      // don't race with it — and since selectedLabel/context will be "",
      // the guards in useEffects won't clear these banners.
      setSaveResult(json);
      handleReset();
    } catch (e: any) {
      setSaveError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  // ── canSave: simulation name, context, label, and all fields must be filled
  const allFieldsFilled =
    fieldKeys.length === 0 ||
    fieldKeys.every((k) => fieldValues[k]?.trim() !== "");

  const canSave =
    simulationName.trim() &&
    selectedContext &&
    selectedLabel &&
    allFieldsFilled &&
    !saving;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Simulation
        </h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Simulate incoming payload and test transformation
        </p>
      </div>

      {/* ── Step 1: Simulation Name + Context ────────────────────────────── */}
      <div className="card-elevated p-6 space-y-4">
        <SectionHeader
          step="1"
          title="Simulation Settings"
          subtitle="Name this simulation and select a context"
        />

        {/* Context */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground font-body tracking-wide uppercase">
            Context
          </label>
          {loadingContexts ? (
            <SkeletonSelect />
          ) : (
            <select
              value={selectedContext}
              onChange={(e) => setSelectedContext(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground"
            >
              <option value="">— Select a context —</option>
              {contexts.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Simulation Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground font-body tracking-wide uppercase">
            Simulation Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. AP Check Run - June"
            value={simulationName}
            onChange={(e) => setSimulationName(e.target.value)}
            className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* ── Step 2: Form / Label ──────────────────────────────────────────── */}
      {selectedContext && (
        <div className="card-elevated p-6 space-y-4 animate-fade-in">
          <SectionHeader
            step="2"
            title="Form"
            subtitle="Select the label form for the chosen context"
          />

          {loadingLabels ? (
            <SkeletonSelect />
          ) : filteredLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">
              No forms found for <strong>{selectedContext}</strong>.
            </p>
          ) : (
            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground"
            >
              <option value="">— Select a form —</option>
              {filteredLabels.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ── Step 3: Field inputs ──────────────────────────────────────────── */}
      {selectedLabel && fieldKeys.length > 0 && (
        <div className="card-elevated p-6 space-y-5 animate-fade-in">
          <SectionHeader
            step="3"
            title="Input Values"
            subtitle="Provide values for each field in the selected form"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fieldKeys.map((key) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground font-body tracking-wide uppercase">
                  {key} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder={`Enter ${key}`}
                  value={fieldValues[key] ?? ""}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3 empty state ────────────────────────────────────────────── */}
      {selectedLabel && fieldKeys.length === 0 && (
        <div className="card-elevated p-6 animate-fade-in">
          <p className="text-sm text-muted-foreground font-body">
            No field mappings found for <strong>{selectedLabel}</strong>.
          </p>
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {selectedLabel && (
        <div className="flex gap-3 animate-fade-in">
          <button
            onClick={handleReset}
            className="px-5 py-2 rounded-lg text-sm font-semibold font-body border border-border hover:bg-muted transition-all"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-5 py-2 rounded-lg text-sm font-semibold font-body transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "hsl(var(--accent))", color: "white" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}

      {/* ── Save result ───────────────────────────────────────────────────── */}
      {saveResult && (
        <div className="card-elevated p-6 space-y-3 animate-fade-in">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Saved Successfully
          </h2>
          {/* <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
            {JSON.stringify(saveResult, null, 2)}
          </pre> */}
        </div>
      )}

      {/* ── Save error ────────────────────────────────────────────────────── */}
      {saveError && (
        <div className="card-elevated p-4 border border-red-200 bg-red-50 rounded-lg animate-fade-in">
          <p className="text-sm text-red-600 font-body">{saveError}</p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mt-0.5"
        style={{
          background: "hsl(var(--accent) / 0.12)",
          color: "hsl(var(--accent))",
        }}
      >
        {step}
      </span>
      <div>
        <h2 className="font-display text-sm font-semibold text-foreground leading-none">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground font-body mt-0.5">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function SkeletonSelect() {
  return (
    <div className="w-full h-9 rounded-lg bg-muted animate-pulse mt-1" />
  );
}