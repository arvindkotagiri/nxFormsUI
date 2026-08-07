import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Text } from "@ui5/webcomponents-react";

import "@ui5/webcomponents-icons/dist/nav-back.js";
import "@ui5/webcomponents-icons/dist/save.js";
import "@ui5/webcomponents-icons/dist/add.js";
import "@ui5/webcomponents-icons/dist/decline.js";
import "@ui5/webcomponents-icons/dist/hint.js";
import "@ui5/webcomponents-icons/dist/information.js";

import {
  getLabelConfig,
  createLabelConfig,
  updateLabelConfig,
  getLabels,
  getCatalog,
  getPrinters,
} from "../../lib/api";
import {
  flattenActiveOutputFields,
  matchOrgConditionKey,
  ORG_CONDITION_DEFS,
  type ActiveOutputField,
} from "../../lib/outputDefinitionFields";
import { fetchLegacyApi } from "../../lib/legacyApiBase";

// ---------- Types ----------
type RefItem = { id: string; name: string };
type LabelRefItem = RefItem & { context?: string | number | null };

type LabelConfigPayload = {
  label_name: string;
  label_id: string;
  customer?: string | null;
  plant?: string | null;
  company_code?: string | null;
  sales_organization?: string | null;
  warehouse?: string | null;
  shipping_point?: string | null;
  process_type?: string | null;
  number_of_labels: number;
  priority: number;
  active: boolean;
  valid_from?: string | null; // yyyy-mm-dd
  valid_to?: string | null;   // yyyy-mm-dd
  printer?: string | null;
  custom_fields?: Record<string, string> | null;
  output_conditions?: Record<string, string>;
};

type Props = {
  // pass from your auth/context if you have it
  isConfigurator?: boolean;
};

type LabelConfigRecord = LabelConfigPayload & {
  config_id?: string;
  output_conditions?: Record<string, string>;
};

function mapConfigToFormData(data: Partial<LabelConfigRecord>): LabelConfigPayload {
  return {
    label_name: data.label_name || "",
    label_id: data.label_id || "",
    customer: data.customer || "",
    plant: data.plant || "",
    company_code: data.company_code || "",
    sales_organization: data.sales_organization || "",
    warehouse: data.warehouse || "",
    shipping_point: data.shipping_point || "",
    process_type: data.process_type || "",
    number_of_labels: data.number_of_labels ?? 1,
    priority: data.priority ?? 10,
    active: data.active ?? true,
    valid_from: data.valid_from || "",
    valid_to: data.valid_to || "",
    printer: data.printer || "",
    custom_fields: data.custom_fields || {},
  };
}

function collectConditions(data: Partial<LabelConfigRecord>): Record<string, string> {
  const merged: Record<string, string> = {};

  const add = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value != null && String(value).trim() !== "") {
        merged[key] = String(value);
      }
    }
  };

  add(data.output_conditions);
  add(data.custom_fields);
  return merged;
}

function hydrateConfigRecord(data: Partial<LabelConfigRecord>): {
  formData: LabelConfigPayload;
  outputConditions: Record<string, string>;
} {
  const conditions = collectConditions(data);
  const formData = mapConfigToFormData(data);

  for (const [fieldKey, value] of Object.entries(conditions)) {
    const fieldName = fieldKey.includes(".") ? fieldKey.split(".").pop()! : fieldKey;
    const orgKey = matchOrgConditionKey({ name: fieldName, label: fieldName });
    if (orgKey) {
      const current = formData[orgKey as keyof LabelConfigPayload];
      if (!current) {
        (formData as Record<string, string>)[orgKey] = value;
      }
    }
  }

  for (const def of ORG_CONDITION_DEFS) {
    const conditionValue = conditions[def.formKey];
    if (conditionValue && !formData[def.formKey as keyof LabelConfigPayload]) {
      (formData as Record<string, string>)[def.formKey] = conditionValue;
    }
  }

  if (!formData.customer && conditions.customer) formData.customer = conditions.customer;
  if (!formData.process_type && conditions.process_type) formData.process_type = conditions.process_type;

  const customFields = { ...(formData.custom_fields || {}) };
  for (const [fieldKey, value] of Object.entries(conditions)) {
    const fieldName = fieldKey.includes(".") ? fieldKey.split(".").pop()! : fieldKey;
    if (!matchOrgConditionKey({ name: fieldName, label: fieldName }) && !ORG_CONDITION_DEFS.some((def) => def.formKey === fieldKey)) {
      customFields[fieldName] = value;
    }
  }
  formData.custom_fields = customFields;

  return { formData, outputConditions: conditions };
}

export function ConfigDetailPage({ isConfigurator = true }: Props) {
  const { configId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledRule = (location.state as { rule?: LabelConfigRecord } | null)?.rule;

  const isEditMode = Boolean(configId && configId !== "new");
  const isReadOnly = !isConfigurator;

  const [loading, setLoading] = useState<boolean>(isEditMode && !prefilledRule);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [referenceData, setReferenceData] = useState<{
    labels: LabelRefItem[];
    contexts: any[];
    printers: RefItem[];
  }>({
    labels: [],
    contexts: [],
    printers: [],
  });

  const normalizeContextValue = (value: string | number | null | undefined): string =>
    String(value ?? "").trim().toLowerCase();

  const [outputFields, setOutputFields] = useState<ActiveOutputField[]>([]);
  const [outputFieldsError, setOutputFieldsError] = useState<string | null>(null);

  const doesFieldMatchLabelContext = (field: ActiveOutputField, labelContext: string): boolean => {
    const normalizedLabelContext = normalizeContextValue(labelContext);
    if (!normalizedLabelContext) return false;

    return (
      normalizeContextValue(field.apiName) === normalizedLabelContext ||
      normalizeContextValue(field.apiId) === normalizedLabelContext
    );
  };

  const [formData, setFormData] = useState<LabelConfigPayload>(() =>
    prefilledRule ? hydrateConfigRecord(prefilledRule).formData : {
      label_name: "",
      label_id: "",
      customer: "",
      plant: "",
      company_code: "",
      sales_organization: "",
      warehouse: "",
      shipping_point: "",
      process_type: "",
      number_of_labels: 1,
      priority: 10,
      active: true,
      valid_from: "",
      valid_to: "",
      printer: "",
      custom_fields: {},
    },
  );

  const [outputConditions, setOutputConditions] = useState<Record<string, string>>(() =>
    prefilledRule ? hydrateConfigRecord(prefilledRule).outputConditions : {},
  );

  const applyConfigRecord = useCallback((record: Partial<LabelConfigRecord>) => {
    const hydrated = hydrateConfigRecord(record);
    setFormData(hydrated.formData);
    setOutputConditions(hydrated.outputConditions);
  }, []);

  // ---------- Fetch reference data ----------
  const fetchReferenceData = useCallback(async () => {
    try {
      const [labels, contexts, printers] = await Promise.all([
        getLabels(),
        getCatalog(),
        getPrinters(),
      ]);

      setReferenceData({
        labels,
        contexts,
        printers,
      });
    } catch (e: any) {
      // keep non-blocking, but show a banner
      setErrorBanner(e?.message || "Failed to load reference data");
    }
  }, []);

  const fetchOutputFields = useCallback(async () => {
    try {
      setOutputFieldsError(null);
      const data = await fetchLegacyApi<{ status: string; records: any[] }>(
        "/api/output-definition-fields/active",
      );
      setOutputFields(flattenActiveOutputFields(data.records || []));
    } catch (e: any) {
      setOutputFields([]);
      setOutputFieldsError(e?.message || "Failed to load output definition fields");
    }
  }, []);

  // ---------- Fetch existing config ----------
  const fetchConfig = useCallback(async () => {
    if (!isEditMode || !configId) {
      setLoading(false);
      return;
    }

    if (prefilledRule) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorBanner(null);

    try {
      const data = await getLabelConfig(configId);
      applyConfigRecord(data);
    } catch (e: any) {
      if (prefilledRule) {
        applyConfigRecord(prefilledRule);
        setErrorBanner(
          (e?.message || "Failed to refresh configuration") +
            ". Showing data from the rules list.",
        );
      } else {
        setErrorBanner(e?.message || "Failed to load configuration");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [configId, isEditMode, prefilledRule, applyConfigRecord]);

  useEffect(() => {
    fetchReferenceData();
    fetchOutputFields();
  }, [fetchReferenceData, fetchOutputFields]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const setOutputCondition = (fieldKey: string, value: string) => {
    setOutputConditions((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const selectedLabel = useMemo(() => {
    return (
      referenceData.labels.find((l) => l.id === formData.label_id) ||
      referenceData.labels.find((l) => l.name === formData.label_name) ||
      null
    );
  }, [referenceData.labels, formData.label_id, formData.label_name]);

  const selectedLabelContext = normalizeContextValue(selectedLabel?.context);

  const organizationalFields = useMemo(() => {
    if (!selectedLabelContext) return [];
    return outputFields.filter((field) => doesFieldMatchLabelContext(field, selectedLabelContext));
  }, [outputFields, selectedLabelContext]);

  const getOutputFieldValue = (field: ActiveOutputField, orgKey: string | null) => {
    const fieldKey = `${field.entity}.${field.name}`;
    const outputValue = outputConditions[fieldKey];
    if (outputValue !== undefined) {
      return outputValue;
    }
    if (orgKey) {
      return (formData[orgKey as keyof LabelConfigPayload] as string) || "";
    }
    return "";
  };

  const setOutputFieldValue = (field: ActiveOutputField, orgKey: string | null, value: string) => {
    const fieldKey = `${field.entity}.${field.name}`;
    setOutputCondition(fieldKey, value);
    if (orgKey) {
      // Keep legacy org columns empty so values persist in output_conditions.
      setField(orgKey as keyof LabelConfigPayload, "");
    }
  };

  // ---------- Handlers ----------
  const setField = (key: keyof LabelConfigPayload, value: any) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const handleLabelChange = (labelName: string) => {
    const selected = referenceData.labels.find((l) => l.name === labelName);
    const nextLabelId = selected?.id || "";
    const didLabelChange =
      formData.label_name !== labelName ||
      formData.label_id !== nextLabelId;

    if (didLabelChange) {
      setFormData((p) => ({
        ...p,
        label_name: labelName,
        label_id: nextLabelId,
        company_code: "",
        sales_organization: "",
        plant: "",
        warehouse: "",
        shipping_point: "",
        custom_fields: {},
      }));
      setOutputConditions({});
      return;
    }

    setFormData((p) => ({
      ...p,
      label_name: labelName,
      label_id: nextLabelId,
    }));
  };

  const requiredError = (msg: string) => {
    setErrorBanner(msg);
    // keep it simple; you can also focus inputs
  };

  const selectedContextDef = useMemo(() => {
    if (!selectedLabelContext) return null;

    return (
      referenceData.contexts.find(
        (c) =>
          normalizeContextValue(c?.name) === selectedLabelContext ||
          normalizeContextValue(c?.id) === selectedLabelContext,
      ) || null
    );
  }, [selectedLabelContext, referenceData.contexts]);

  const customOrganizationalFields = useMemo(() => {
    if (!selectedContextDef?.fields) return [];

    const fieldsList: Array<{ name: string; label: string; conditionHint: string; fieldKey: string }> = [];
    Object.entries(selectedContextDef.fields).forEach(([entityName, entityFields]: [string, any]) => {
      if (!Array.isArray(entityFields)) return;

      entityFields.forEach((f: any) => {
        if (!f.outputDetermination) return;

        const name = f.name || f.originalName;
        if (!name) return;

        fieldsList.push({
          name,
          label: f.label || name,
          conditionHint: `${selectedContextDef.name} · ${entityName}.${name}`,
          fieldKey: `${entityName}.${name}`,
        });
      });
    });

    return fieldsList;
  }, [selectedContextDef]);

  const handleSave = async () => {
    setErrorBanner(null);

    if (isReadOnly) {
      return requiredError("You do not have permission to save configurations.");
    }

    if (!formData.label_name || !formData.label_id) {
      return requiredError("Label Name is required.");
    }

    if (!formData.priority || formData.priority < 1) {
      return requiredError("Priority must be a positive number.");
    }

    setSaving(true);

    try {
      const payload: LabelConfigPayload = {
        ...formData,
        customer: null,
        plant: null,
        company_code: null,
        sales_organization: null,
        warehouse: null,
        shipping_point: null,
        process_type: null,
        valid_from: formData.valid_from ? formData.valid_from : null,
        valid_to: formData.valid_to ? formData.valid_to : null,
        printer: formData.printer ? formData.printer : null,
        custom_fields: null,
        output_conditions: outputConditions,
      };

      if (isEditMode && configId) {
        await updateLabelConfig(configId, payload);
      } else {
        await createLabelConfig(payload);
      }

      navigate("/outputs");
    } catch (e: any) {
      setErrorBanner(e?.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-10">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <Text>Loading configuration...</Text>
        </div>
      </div>
    );
  }

  const inputClassName =
    "w-full min-w-0 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30";

  return (
    <div className="w-full space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-foreground">
            {isEditMode ? "Edit Rule" : "New Rule"}
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Configure label routing conditions
            {refreshing && (
              <span className="ml-2 text-xs">Refreshing...</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate("/outputs")}
            className="px-4 py-2 rounded-lg border border-border text-sm font-body text-muted-foreground hover:text-foreground transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || isReadOnly}
            className="px-4 py-2 rounded-lg text-sm font-semibold font-body transition-all"
            style={{ background: "hsl(var(--accent))", color: "white" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="p-4 rounded-xl bg-error-bg text-error text-sm font-body">
          {errorBanner}
        </div>
      )}

      {/* General Information */}
      <div className="card-elevated p-4 sm:p-5">
        <h2 className="font-display text-sm font-semibold text-foreground mb-4">
          General Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-5">
            <label className="text-xs font-semibold text-muted-foreground font-body">
              Label Name
            </label>
            <select
              value={formData.label_name}
              onChange={(e) => handleLabelChange(e.target.value)}
              className={`${inputClassName} mt-1`}
            >
              <option value="">Select label</option>
              {referenceData.labels.map((l) => (
                <option key={l.id} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground font-body">
              Priority
            </label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setField("priority", Number(e.target.value))}
              className={`${inputClassName} mt-1`}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground font-body">
              Number of Labels
            </label>
            <input
              type="number"
              value={formData.number_of_labels}
              onChange={(e) => setField("number_of_labels", Number(e.target.value))}
              className={`${inputClassName} mt-1`}
            />
          </div>

          <div className="lg:col-span-3">
            <label className="text-xs font-semibold text-muted-foreground font-body">
              Active
            </label>
            <div className="flex h-[42px] items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setField("active", e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm font-body whitespace-nowrap">
                {formData.active ? "Active" : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Organizational Conditions */}
      <div className="card-elevated p-4 sm:p-5 space-y-5">
        <div>
          <h2 className="font-display text-sm font-semibold text-foreground">
            Organizational Conditions
          </h2>
          {selectedContextDef && (
            <p className="text-xs text-muted-foreground font-body mt-1">
              Routing criteria for context &quot;{selectedContextDef.name}&quot;
            </p>
          )}
        </div>

        {!formData.label_id ? (
          <p className="text-xs text-muted-foreground font-body">
            Select a label to load organizational conditions for its context.
          </p>
        ) : outputFieldsError ? (
          <p className="text-xs text-destructive font-body">{outputFieldsError}</p>
        ) : organizationalFields.length === 0 && customOrganizationalFields.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">
            No organizational conditions configured for this label context. In API Setup, mark fields as &quot;Show in Output&quot; or &quot;Output Determination&quot; and save the API definition.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {organizationalFields.map((field) => {
              const orgKey = matchOrgConditionKey(field);
              const fieldKey = `${field.entity}.${field.name}`;

              return (
                <div key={fieldKey}>
                  <label className="text-xs font-semibold text-muted-foreground font-body">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={getOutputFieldValue(field, orgKey)}
                    onChange={(e) => setOutputFieldValue(field, orgKey, e.target.value)}
                    placeholder="Any (fallback)"
                    className={`${inputClassName} mt-1`}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1 font-body">
                    {field.apiName} · {field.entity}.{field.name}
                  </p>
                </div>
              );
            })}

            {customOrganizationalFields
              .filter(
                (field) =>
                  !organizationalFields.some(
                    (outputField) =>
                      outputField.name === field.name ||
                      `${outputField.entity}.${outputField.name}` === field.conditionHint.split(" · ")[1],
                  ),
              )
              .map((field) => (
                <div key={field.name}>
                  <label className="text-xs font-semibold text-muted-foreground font-body">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={outputConditions[field.fieldKey] || formData.custom_fields?.[field.name] || ""}
                    onChange={(e) => setOutputCondition(field.fieldKey, e.target.value)}
                    placeholder="Any (fallback)"
                    className={`${inputClassName} mt-1`}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1 font-body">
                    {field.conditionHint}
                  </p>
                </div>
              ))}
          </div>
        )}

        <div className="border-t border-border pt-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">
            Validity Period
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground font-body">
                Valid From
              </label>
              <input
                type="date"
                value={formData.valid_from || ""}
                onChange={(e) => setField("valid_from", e.target.value)}
                className={`${inputClassName} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground font-body">
                Valid To
              </label>
              <input
                type="date"
                value={formData.valid_to || ""}
                onChange={(e) => setField("valid_to", e.target.value)}
                className={`${inputClassName} mt-1`}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">
            Printer Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground font-body">
                Printer
              </label>
              <select
                value={formData.printer || ""}
                onChange={(e) => setField("printer", e.target.value)}
                className={`${inputClassName} mt-1`}
              >
                <option value="">Select printer (optional)</option>
                {formData.printer &&
                  !referenceData.printers.some((p) => p.id === formData.printer) && (
                    <option value={formData.printer}>
                      {formData.printer}
                    </option>
                  )}
                {referenceData.printers.map((printer) => (
                  <option key={printer.id} value={printer.id}>
                    {printer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
