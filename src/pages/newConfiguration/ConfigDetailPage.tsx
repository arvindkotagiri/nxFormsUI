import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  getCustomers,
  getPlants,
  getCompanyCodes,
  getSalesOrgs,
  getWarehouses,
  getShippingPoints,
  getProcessTypes,
  getLabels,
  getPrinters,
} from "../../lib/api";

// ---------- Types ----------
type RefItem = { id: string; name: string };

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
};

type Props = {
  // pass from your auth/context if you have it
  isConfigurator?: boolean;
};

export function ConfigDetailPage({ isConfigurator = true }: Props) {
  const { configId } = useParams();
  const navigate = useNavigate();

  const isEditMode = Boolean(configId);
  const isReadOnly = !isConfigurator;

  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [referenceData, setReferenceData] = useState<{
    customers: RefItem[];
    plants: RefItem[];
    companyCodes: RefItem[];
    salesOrgs: RefItem[];
    warehouses: RefItem[];
    shippingPoints: RefItem[];
    processTypes: RefItem[];
    labels: RefItem[];
    printers: RefItem[];
  }>({
    customers: [],
    plants: [],
    companyCodes: [],
    salesOrgs: [],
    warehouses: [],
    shippingPoints: [],
    processTypes: [],
    labels: [],
    printers: [],
  });

  const [formData, setFormData] = useState<LabelConfigPayload>({
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
  });

  // ---------- Fetch reference data ----------
  const fetchReferenceData = useCallback(async () => {
    try {
      const [
        customers,
        plants,
        companyCodes,
        salesOrgs,
        warehouses,
        shippingPoints,
        processTypes,
        labels,
        printers,
      ] = await Promise.all([
        getCustomers(),
        getPlants(),
        getCompanyCodes(),
        getSalesOrgs(),
        getWarehouses(),
        getShippingPoints(),
        getProcessTypes(),
        getLabels(),
        getPrinters(),
      ]);

      setReferenceData({
        customers,
        plants,
        companyCodes,
        salesOrgs,
        warehouses,
        shippingPoints,
        processTypes,
        labels,
        printers,
      });
    } catch (e: any) {
      // keep non-blocking, but show a banner
      setErrorBanner(e?.message || "Failed to load reference data");
    }
  }, []);

  // ---------- Fetch existing config ----------
  const fetchConfig = useCallback(async () => {
    if (!configId) return;

    try {
      const data = await getLabelConfig(configId);

      setFormData({
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
      });
    } catch (e: any) {
      setErrorBanner(e?.message || "Failed to load configuration");
      navigate("/labelConfigurator");
    } finally {
      setLoading(false);
    }
  }, [configId, navigate]);

  useEffect(() => {
    fetchReferenceData();
    fetchConfig();
  }, [fetchReferenceData, fetchConfig]);

  // ---------- Handlers ----------
  const setField = (key: keyof LabelConfigPayload, value: any) => {
    setFormData((p) => ({ ...p, [key]: value }));
  };

  const handleLabelChange = (labelName: string) => {
    const selected = referenceData.labels.find((l) => l.name === labelName);
    setFormData((p) => ({
      ...p,
      label_name: labelName,
      label_id: selected?.id || "",
    }));
  };

  const requiredError = (msg: string) => {
    setErrorBanner(msg);
    // keep it simple; you can also focus inputs
  };

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
        customer: formData.customer ? formData.customer : null,
        plant: formData.plant ? formData.plant : null,
        company_code: formData.company_code ? formData.company_code : null,
        sales_organization: formData.sales_organization ? formData.sales_organization : null,
        warehouse: formData.warehouse ? formData.warehouse : null,
        shipping_point: formData.shipping_point ? formData.shipping_point : null,
        process_type: formData.process_type ? formData.process_type : null,
        valid_from: formData.valid_from ? formData.valid_from : null,
        valid_to: formData.valid_to ? formData.valid_to : null,
        printer: formData.printer ? formData.printer : null,
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
      <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 py-10">
        <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <Text>Loading configuration...</Text>
        </div>
      </div>
    );
  }

  type RefItem = { id: string; name: string };

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string | null;
  options: RefItem[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground font-body">
        {label}
      </label>

      <select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        <option value="">Any (fallback)</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

  return (
  <div className="space-y-5 animate-fade-in">

    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {isEditMode ? "Edit Rule" : "New Rule"}
        </h1>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Configure label routing conditions
        </p>
      </div>

      <div className="flex items-center gap-2">
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

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

      {/* LEFT COLUMN */}
      <div className="lg:col-span-2 space-y-4">

        {/* General */}
        <div className="card-elevated p-5 space-y-4">
          <h2 className="font-display text-sm font-semibold text-foreground">
            General Information
          </h2>

          <div className="space-y-3">

            <div>
              <label className="text-xs font-semibold text-muted-foreground font-body">
                Label Name
              </label>
              <select
                value={formData.label_name}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                <option value="">Select label</option>
                {referenceData.labels.map((l) => (
                  <option key={l.id} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground font-body">
                Priority
              </label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setField("priority", Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower = higher precedence
              </p>
            </div>

{/* Number of labels */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground font-body">
          Number of Labels
        </label>
        <input
          type="number"
          value={formData.number_of_labels}
          onChange={(e) => setField("number_of_labels", Number(e.target.value))}
          className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground font-body">
                Active
              </label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setField("active", e.target.checked)}
                />
                <span className="text-sm font-body">
                  {formData.active ? "Active" : "Disabled"}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Organizational */}
        <div className="card-elevated p-5 space-y-4">
          <h2 className="font-display text-sm font-semibold text-foreground">
            Organizational Conditions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <SelectField label="Company Code"
        value={formData.company_code}
        options={referenceData.companyCodes}
        onChange={(v) => setField("company_code", v)}
      />

      <SelectField label="Sales Organization"
        value={formData.sales_organization}
        options={referenceData.salesOrgs}
        onChange={(v) => setField("sales_organization", v)}
      />

      <SelectField label="Plant"
        value={formData.plant}
        options={referenceData.plants}
        onChange={(v) => setField("plant", v)}
      />

      <SelectField label="Warehouse"
        value={formData.warehouse}
        options={referenceData.warehouses}
        onChange={(v) => setField("warehouse", v)}
      />

      <SelectField label="Shipping Point"
        value={formData.shipping_point}
        options={referenceData.shippingPoints}
        onChange={(v) => setField("shipping_point", v)}
      />

      {/* <SelectField label="Printer"
        value={formData.printer}
        options={referenceData.printers}
        onChange={(v) => setField("printer", v)}
      /> */}

    </div>
        </div>

<div className="card-elevated p-5 space-y-4">
    <div>
      <h2 className="font-display text-sm font-semibold text-foreground">
        Business Context
      </h2>
      <p className="text-xs text-muted-foreground font-body mt-1">
        Business criteria (leave blank for fallback)
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      <SelectField label="Customer"
        value={formData.customer}
        options={referenceData.customers}
        onChange={(v) => setField("customer", v)}
      />

      <SelectField label="Process Type"
        value={formData.process_type}
        options={referenceData.processTypes}
        onChange={(v) => setField("process_type", v)}
      />

    </div>
  </div>
      </div>

      {/* RIGHT SIDEBAR */}
      <div className="space-y-4">

        <div className="card-elevated p-4 space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">
            Validity Period
          </h3>

          <div>
            <label className="text-xs text-muted-foreground font-body">
              Valid From
            </label>
            <input
              type="date"
              value={formData.valid_from || ""}
              onChange={(e) => setField("valid_from", e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-body">
              Valid To
            </label>
            <input
              type="date"
              value={formData.valid_to || ""}
              onChange={(e) => setField("valid_to", e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
        </div>

          <div className="card-elevated p-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">
              Printer Settings
            </h3>
            <SelectField label="Printer"
              value={formData.printer}
              options={referenceData.printers}
              onChange={(v) => setField("printer", v)}
            />
          </div>

        <div className="card-elevated p-4">
          <h3 className="font-display text-sm font-semibold text-foreground mb-2">
            How Evaluation Works
          </h3>
          <p className="text-xs font-body text-muted-foreground">
            Rules are evaluated by priority (lowest first).
            If all filled fields match, the rule is applied.
          </p>
        </div>

      </div>
    </div>
  </div>
);
}
