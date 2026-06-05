/** Human-readable label for event/output context values from the API. */
export function formatContextDisplayName(raw: string | null | undefined): string {
  if (!raw?.trim()) return "Unknown";

  const normalized = raw.trim().replace(/_/g, " ").replace(/-/g, " ");

  // Split camelCase: EWMOBDelivery -> EWM OB Delivery (best-effort)
  const spaced = normalized.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");

  return spaced
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export type OutputsByContextRow = {
  name: string;
  outputs: number;
  errors: number;
};

export function normalizeOutputsByContext(rows: OutputsByContextRow[]): OutputsByContextRow[] {
  const merged = new Map<string, OutputsByContextRow>();

  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    const displayName = formatContextDisplayName(row.name);
    const existing = merged.get(key);

    if (existing) {
      existing.outputs += row.outputs;
      existing.errors += row.errors;
    } else {
      merged.set(key, {
        name: displayName,
        outputs: row.outputs,
        errors: row.errors,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => b.outputs - a.outputs);
}
