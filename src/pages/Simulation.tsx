import { bootstrapTokenIfMissing } from "@/lib/api";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_NODE_API;

// ─── Types ────────────────────────────────────────────────────────────────────

type Context = {
  id: string;
  name: string;
  endpoint: string;
  entities?: Array<{ name: string; label?: string }>;
  fields?: Record<string, Array<{ name: string; type?: string }>>;
};

type FieldValues = Record<string, string>;
type InputRow = {
  entityName: string;
  fieldName: string;
  value: string;
};

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

  // Selections
  const [simulationName, setSimulationName] = useState<string>("");
  const [selectedContext, setSelectedContext] = useState<string>("");
  const [fieldRows, setFieldRows] = useState<InputRow[]>([
    { entityName: "", fieldName: "", value: "" },
  ]);

  // UI state
  const [loadingContexts, setLoadingContexts] = useState(true);
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

  const selectedContextObj = contexts.find(
    (c) => c.name.toLowerCase() === selectedContext.toLowerCase()
  );
  const fallbackContextPool = contexts.slice(0, 2);
  const entityOptions = Array.from(
    new Set(
      (
        selectedContextObj?.entities?.map((e) => e.name) ??
        fallbackContextPool.flatMap((c) =>
          (c.entities ?? []).map((e: any) => e?.name).filter(Boolean)
        )
      ).filter(Boolean)
    )
  );

  const getFieldsForEntity = (entityName: string) => {
    if (!entityName) return [] as Array<{ name: string; type?: string }>;
    const fromSelectedContext =
      selectedContextObj?.fields?.[entityName]?.filter((f) => !!f?.name) ?? [];
    if (fromSelectedContext.length > 0) return fromSelectedContext;
    for (const context of fallbackContextPool) {
      const candidate = context?.fields?.[entityName]?.filter((f) => !!f?.name);
      if (candidate && candidate.length > 0) return candidate;
    }
    return [] as Array<{ name: string; type?: string }>;
  };

  const getFieldType = (entityName: string, fieldName: string) => {
    if (!entityName || !fieldName) return "";
    const field = getFieldsForEntity(entityName).find((f) => f.name === fieldName);
    return field?.type ?? "";
  };

  // ── When context changes, reset dynamic rows
  useEffect(() => {
    setFieldRows([{ entityName: "", fieldName: "", value: "" }]);
    if (selectedContext) {
      setSaveResult(null);
      setSaveError(null);
    }
  }, [selectedContext]);

  const updateRow = (
    index: number,
    patch: Partial<InputRow> | ((current: InputRow) => InputRow)
  ) => {
    setFieldRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        return typeof patch === "function" ? patch(row) : { ...row, ...patch };
      })
    );
  };

  const addRow = () => {
    setFieldRows((prev) => [...prev, { entityName: "", fieldName: "", value: "" }]);
  };

  const removeRow = (index: number) => {
    setFieldRows((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Reset: clears simulation state and rows
  const handleReset = () => {
    setSimulationName("");
    setSelectedContext("");
    setFieldRows([{ entityName: "", fieldName: "", value: "" }]);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveResult(null);
    setSaveError(null);
    try {
      const headers = await getAuthHeaders();

      const inputValues: FieldValues = {};
      fieldRows.forEach((row) => {
        if (row.entityName && row.fieldName) {
          inputValues[`${row.fieldName}`] = row.value;
        }
      });
      const payload = {
        simulationName,
        context: selectedContext,
        form: "",
        inputValues,
      };

      const res = await fetch(`${API_URL}/simulation`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Save failed");

      setSaveResult(json);
      handleReset();
    } catch (e: any) {
      setSaveError(e?.message ?? "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const allFieldsFilled =
    fieldRows.length > 0 &&
    fieldRows.every(
      (row) =>
        row.entityName.trim() !== "" &&
        row.fieldName.trim() !== "" &&
        row.value.trim() !== ""
    );

  const canSave =
    simulationName.trim() &&
    selectedContext &&
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

      {/* ── Step 2: Field inputs ──────────────────────────────────────────── */}
      {selectedContext && (
        <div className="card-elevated p-6 space-y-4 animate-fade-in">
          <SectionHeader
            step="2"
            title="Input Values"
            subtitle="Select entity, field, and value for each row"
          />
          {entityOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">
              No entities found for <strong>{selectedContext}</strong>.
            </p>
          ) : (
            <div className="space-y-3">
              {fieldRows.map((row, index) => {
                const availableFields = getFieldsForEntity(row.entityName);
                const fieldType = getFieldType(row.entityName, row.fieldName);
                const isBooleanField =
                  fieldType.toLowerCase() === "edm.boolean" ||
                  fieldType.toLowerCase() === "boolean";

                return (
                  <div
                    key={`field-row-${index}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end"
                  >
                    <select
                      value={row.entityName}
                      onChange={(e) =>
                        updateRow(index, {
                          entityName: e.target.value,
                          fieldName: "",
                          value: "",
                        })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground"
                    >
                      <option value="">— Select entity —</option>
                      {entityOptions.map((entityName) => (
                        <option key={entityName} value={entityName}>
                          {entityName}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.fieldName}
                      onChange={(e) =>
                        updateRow(index, { fieldName: e.target.value, value: "" })
                      }
                      disabled={!row.entityName}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground disabled:opacity-50"
                    >
                      <option value="">— Select field —</option>
                      {availableFields.map((field) => (
                        <option key={field.name} value={field.name}>
                          {field.name}
                        </option>
                      ))}
                    </select>

                    {isBooleanField ? (
                      <select
                        value={row.value}
                        onChange={(e) => updateRow(index, { value: e.target.value })}
                        disabled={!row.fieldName}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground disabled:opacity-50"
                      >
                        <option value="">— Select value —</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        placeholder={row.fieldName ? "Enter value" : "Select field first"}
                        value={row.value}
                        onChange={(e) => updateRow(index, { value: e.target.value })}
                        disabled={!row.fieldName}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground placeholder:text-muted-foreground/50 disabled:opacity-50"
                      />
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={addRow}
                        className="h-9 w-9 rounded-lg text-sm font-semibold font-body border border-border hover:bg-muted transition-all"
                        title="Add row"
                      >
                        +
                      </button>
                      {fieldRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="h-9 w-9 rounded-lg text-sm font-semibold font-body border border-border hover:bg-muted transition-all"
                          title="Remove row"
                        >
                          -
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      {selectedContext && (
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