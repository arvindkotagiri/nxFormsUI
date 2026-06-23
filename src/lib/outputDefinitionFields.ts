export type CatalogOutputField = {
  name: string;
  label: string;
  entity: string;
};

export type OrgConditionDef = {
  formKey: string;
  label: string;
  matchNames: string[];
};

export const ORG_CONDITION_DEFS: OrgConditionDef[] = [
  { formKey: "company_code", label: "Company Code", matchNames: ["companycode", "company"] },
  { formKey: "sales_organization", label: "Sales Organization", matchNames: ["salesorganization", "salesorg"] },
  { formKey: "plant", label: "Plant", matchNames: ["plant", "deliveringplant"] },
  { formKey: "warehouse", label: "Warehouse", matchNames: ["warehouse", "warehousenumber"] },
  { formKey: "shipping_point", label: "Shipping Point", matchNames: ["shippingpoint"] },
];

export function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function extractShowInOutputFields(catalogEntries: any[]): CatalogOutputField[] {
  const seen = new Set<string>();
  const fields: CatalogOutputField[] = [];

  for (const entry of catalogEntries) {
    const entityFields = entry?.fields;
    if (!entityFields || typeof entityFields !== "object") continue;

    for (const [entityName, entityFieldList] of Object.entries(entityFields)) {
      const list = Array.isArray(entityFieldList) ? entityFieldList : [];
      for (const field of list) {
        if (!field?.showInOutputDefinition) continue;
        const name = field.name || field.originalName;
        if (!name || seen.has(name)) continue;
        seen.add(name);
        fields.push({
          name,
          label: field.label || name,
          entity: entityName,
        });
      }
    }
  }

  return fields;
}

export function getEnabledOrgConditionKeys(catalogEntries: any[]): Set<string> {
  const enabled = new Set<string>();
  const outputFields = extractShowInOutputFields(catalogEntries);

  for (const field of outputFields) {
    const normalizedName = normalizeFieldName(field.name);
    const normalizedLabel = normalizeFieldName(field.label);
    for (const def of ORG_CONDITION_DEFS) {
      if (
        def.matchNames.some(
          (m) =>
            normalizedName === m ||
            normalizedName.includes(m) ||
            normalizedLabel === m ||
            normalizedLabel.includes(m),
        )
      ) {
        enabled.add(def.formKey);
      }
    }
  }

  return enabled;
}

export function getUnmappedOutputFields(fields: CatalogOutputField[]): CatalogOutputField[] {
  return fields.filter((field) => !matchOrgConditionKey(field));
}

export function matchOrgConditionKey(field: { name: string; label: string }): string | null {
  const normalizedName = normalizeFieldName(field.name);
  const normalizedLabel = normalizeFieldName(field.label);

  for (const def of ORG_CONDITION_DEFS) {
    if (
      def.matchNames.some(
        (m) =>
          normalizedName === m ||
          normalizedName.includes(m) ||
          normalizedLabel === m ||
          normalizedLabel.includes(m),
      )
    ) {
      return def.formKey;
    }
  }

  return null;
}

export type ActiveOutputField = CatalogOutputField & {
  apiId: number;
  apiName: string;
  endpoint: string;
};

export function flattenActiveOutputFields(records: any[]): ActiveOutputField[] {
  const seen = new Set<string>();
  const fields: ActiveOutputField[] = [];

  for (const record of records) {
    const list = Array.isArray(record?.output_fields) ? record.output_fields : [];
    for (const field of list) {
      const name = field?.name;
      if (!name) continue;
      const key = `${record.id}:${field.entity || ""}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fields.push({
        apiId: record.context_id ?? record.id,
        apiName: record.name,
        endpoint: record.endpoint,
        entity: field.entity || "",
        name,
        label: field.label || name,
      });
    }
  }

  return fields;
}
