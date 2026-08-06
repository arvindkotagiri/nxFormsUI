import { useState, useEffect } from "react";
import { Plus, Trash2, Table2, ArrowUpDown, Filter, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SortCriterion {
  field: string;
  direction: "ASC" | "DESC";
}

export interface WhereCondition {
  field: string;
  operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "startsWith";
  value: string;
}

export interface TableLoopConfig {
  /** The key in the payload array to loop over — outer group (e.g. "groups") */
  entitySetKey: string;
  /** For nested loops: inner items key within each group (e.g. "items") */
  innerEntitySetKey?: string;
  /** Sort criteria (applied before filters) */
  sortCriteria: SortCriterion[];
  /** "Already Sorted" flag — skips sort step when true */
  alreadySorted: boolean;
  /** WHERE conditions — AND logic — all must pass for a row to render */
  filters: WhereCondition[];
  /** Field names that should be auto-summed in the subtotal row */
  subtotalFields: string[];
}

interface TableLoopConfigPanelProps {
  initialConfig: TableLoopConfig | null;
  selectedContext: any;
  onApply: (config: TableLoopConfig) => void;
}

const OPERATORS = ["==", "!=", ">", "<", ">=", "<=", "contains", "startsWith"] as const;

const defaultConfig = (): TableLoopConfig => ({
  entitySetKey: "",
  innerEntitySetKey: "",
  sortCriteria: [],
  alreadySorted: false,
  filters: [],
  subtotalFields: [],
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEntityNames(selectedContext: any): string[] {
  if (!selectedContext) return [];
  const entities = selectedContext?.entities || [];
  if (Array.isArray(entities)) {
    return entities.map((e: any) => e?.name || e?.entitySet || e?.label || e).filter(Boolean);
  }
  return [];
}

function getEntityFields(selectedContext: any, entityKey: string): string[] {
  if (!selectedContext || !entityKey) return [];
  const fieldsByEntity = selectedContext?.fields || {};
  if (typeof fieldsByEntity === "object" && !Array.isArray(fieldsByEntity)) {
    const match = Object.entries(fieldsByEntity).find(
      ([k]) => k.toLowerCase() === entityKey.toLowerCase()
    );
    if (match && Array.isArray(match[1])) {
      return (match[1] as any[]).map((f: any) => f?.name || f?.field_name || f || "").filter(Boolean);
    }
  }
  return [];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TableLoopConfigPanel({ initialConfig, selectedContext, onApply }: TableLoopConfigPanelProps) {
  const [config, setConfig] = useState<TableLoopConfig>(initialConfig ?? defaultConfig());
  const [activeTab, setActiveTab] = useState<"entity" | "sort" | "filter" | "subtotal">("entity");

  useEffect(() => {
    setConfig(initialConfig ?? defaultConfig());
  }, [initialConfig]);

  const entityNames = getEntityNames(selectedContext);
  const outerFields = getEntityFields(selectedContext, config.entitySetKey);
  const innerFields = getEntityFields(selectedContext, config.innerEntitySetKey || "");

  // Merge outer + inner fields for conditions
  const allAvailableFields = Array.from(new Set([...outerFields, ...innerFields]));

  // ── Sort Criteria ─────────────────────────────────────────────────────────

  const addSort = () => {
    setConfig(c => ({
      ...c,
      sortCriteria: [...c.sortCriteria, { field: "", direction: "ASC" }],
    }));
  };

  const removeSort = (i: number) => {
    setConfig(c => ({ ...c, sortCriteria: c.sortCriteria.filter((_, idx) => idx !== i) }));
  };

  const updateSort = (i: number, patch: Partial<SortCriterion>) => {
    setConfig(c => {
      const updated = [...c.sortCriteria];
      updated[i] = { ...updated[i], ...patch };
      return { ...c, sortCriteria: updated };
    });
  };

  // ── WHERE Conditions ──────────────────────────────────────────────────────

  const addFilter = () => {
    setConfig(c => ({
      ...c,
      filters: [...c.filters, { field: "", operator: "!=", value: "" }],
    }));
  };

  const removeFilter = (i: number) => {
    setConfig(c => ({ ...c, filters: c.filters.filter((_, idx) => idx !== i) }));
  };

  const updateFilter = (i: number, patch: Partial<WhereCondition>) => {
    setConfig(c => {
      const updated = [...c.filters];
      updated[i] = { ...updated[i], ...patch };
      return { ...c, filters: updated };
    });
  };

  // ── Subtotal ──────────────────────────────────────────────────────────────

  const toggleSubtotalField = (field: string) => {
    setConfig(c => ({
      ...c,
      subtotalFields: c.subtotalFields.includes(field)
        ? c.subtotalFields.filter(f => f !== field)
        : [...c.subtotalFields, field],
    }));
  };

  // ── Shared select style ────────────────────────────────────────────────────

  const selectCls = "w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-body focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm font-medium text-slate-700";
  const inputCls = "px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-body focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-sm font-medium text-slate-700 w-full";

  const tabs = [
    { key: "entity" as const, label: "Entity", icon: Table2 },
    { key: "sort" as const, label: "Sort", icon: ArrowUpDown },
    { key: "filter" as const, label: "Filter", icon: Filter },
    { key: "subtotal" as const, label: "Totals", icon: Sigma },
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-100 p-5 bg-gradient-to-b from-emerald-50/20 to-white shadow-sm animate-in slide-in-from-right duration-300">
      {/* Panel Header */}
      <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-[10px] uppercase tracking-widest border-b border-emerald-100/50 pb-2">
        <Table2 className="w-3.5 h-3.5 text-emerald-500" />
        Table / Entity Set Loop
      </div>

      {/* Tab Bar */}
      <div className="flex gap-0.5 bg-slate-100 rounded-xl p-0.5 border border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-bold tracking-wider rounded-lg transition-all uppercase",
              activeTab === tab.key
                ? "bg-white shadow-sm text-emerald-700"
                : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Entity Set ───────────────────────────────────────────────────── */}
      {activeTab === "entity" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-500 block">Outer Entity Set (Groups)</label>
            {entityNames.length > 0 ? (
              <select
                value={config.entitySetKey}
                onChange={e => setConfig(c => ({ ...c, entitySetKey: e.target.value }))}
                className={selectCls}
              >
                <option value="">— Select entity set —</option>
                {entityNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <input
                type="text"
                className={inputCls}
                value={config.entitySetKey}
                onChange={e => setConfig(c => ({ ...c, entitySetKey: e.target.value }))}
                placeholder="e.g. groups"
              />
            )}
            <p className="text-[9px] text-slate-400 leading-normal">
              The top-level array key in the payload to loop over. Each object in this array becomes a group section.
            </p>
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100">
            <label className="text-[10px] font-bold uppercase text-slate-500 block">Inner Entity Set (Line Items)</label>
            <input
              type="text"
              className={inputCls}
              value={config.innerEntitySetKey ?? ""}
              onChange={e => setConfig(c => ({ ...c, innerEntitySetKey: e.target.value }))}
              placeholder="e.g. items (leave blank for flat loop)"
            />
            <p className="text-[9px] text-slate-400 leading-normal">
              If your table has nested groups, enter the key inside each group that contains the row items. Leave blank for a flat single-level loop.
            </p>
          </div>

          {/* Summary badges */}
          {(config.entitySetKey || config.innerEntitySetKey) && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[9px] font-mono text-emerald-800 space-y-1">
              <div>Outer loop: <strong>{"{{#each " + (config.entitySetKey || "???") + "}}"}</strong></div>
              {config.innerEntitySetKey && (
                <div className="pl-3">Inner loop: <strong>{"{{#each this." + config.innerEntitySetKey + "}}"}</strong></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Sort Criteria ────────────────────────────────────────────────── */}
      {activeTab === "sort" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={config.alreadySorted}
                onChange={e => setConfig(c => ({ ...c, alreadySorted: e.target.checked }))}
                className="rounded"
              />
              Already Sorted (skip sort step)
            </label>
          </div>

          {!config.alreadySorted && (
            <div className="space-y-2">
              {config.sortCriteria.map((sort, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-2">
                  <select
                    value={sort.field}
                    onChange={e => updateSort(i, { field: e.target.value })}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                  >
                    <option value="">— Field —</option>
                    {allAvailableFields.map(f => <option key={f} value={f}>{f}</option>)}
                    {allAvailableFields.length === 0 && (
                      <option value={sort.field} disabled>{sort.field || "Enter below"}</option>
                    )}
                  </select>
                  {allAvailableFields.length === 0 && (
                    <input
                      type="text"
                      value={sort.field}
                      onChange={e => updateSort(i, { field: e.target.value })}
                      placeholder="field name"
                      className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-medium focus:outline-none"
                    />
                  )}
                  <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateSort(i, { direction: "ASC" })}
                      className={cn("px-2 py-1 text-[9px] font-bold transition-all", sort.direction === "ASC" ? "bg-emerald-500 text-white" : "bg-white text-slate-400 hover:bg-slate-50")}
                    >ASC</button>
                    <button
                      onClick={() => updateSort(i, { direction: "DESC" })}
                      className={cn("px-2 py-1 text-[9px] font-bold transition-all", sort.direction === "DESC" ? "bg-emerald-500 text-white" : "bg-white text-slate-400 hover:bg-slate-50")}
                    >DESC</button>
                  </div>
                  <button onClick={() => removeSort(i)} className="w-6 h-6 rounded-md hover:bg-red-50 text-red-400 flex items-center justify-center">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addSort}
                className="w-full h-7 text-[10px] font-bold border-dashed border-2 hover:border-emerald-400 hover:bg-emerald-50/10"
              >
                <Plus className="w-3 h-3 mr-1" /> Add Sort Field
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: WHERE Conditions ─────────────────────────────────────────────── */}
      {activeTab === "filter" && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <p className="text-[9px] text-slate-400 leading-relaxed">
            All conditions must pass (AND logic). Rows that fail any condition are excluded from the output.
          </p>
          {config.filters.map((filter, i) => (
            <div key={i} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-2">
              {/* Field */}
              {allAvailableFields.length > 0 ? (
                <select
                  value={filter.field}
                  onChange={e => updateFilter(i, { field: e.target.value })}
                  className="flex-[2] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-400/30"
                >
                  <option value="">— Field —</option>
                  {allAvailableFields.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  value={filter.field}
                  onChange={e => updateFilter(i, { field: e.target.value })}
                  placeholder="field"
                  className="flex-[2] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-medium focus:outline-none"
                />
              )}
              {/* Operator */}
              <select
                value={filter.operator}
                onChange={e => updateFilter(i, { operator: e.target.value as any })}
                className="flex-1 px-1.5 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-medium focus:outline-none"
              >
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
              {/* Value */}
              <input
                type="text"
                value={filter.value}
                onChange={e => updateFilter(i, { value: e.target.value })}
                placeholder="value"
                className="flex-[2] px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-medium focus:outline-none"
              />
              <button onClick={() => removeFilter(i)} className="w-6 h-6 rounded-md hover:bg-red-50 text-red-400 flex items-center justify-center">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addFilter}
            className="w-full h-7 text-[10px] font-bold border-dashed border-2 hover:border-emerald-400 hover:bg-emerald-50/10"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Condition
          </Button>
        </div>
      )}

      {/* ── Tab: Subtotal Fields ──────────────────────────────────────────────── */}
      {activeTab === "subtotal" && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <p className="text-[9px] text-slate-400 leading-relaxed">
            Select the numeric columns to auto-sum into a subtotal row after each group completes. The values will be injected as <code className="text-[9px] bg-slate-100 px-1 rounded">subtotal_[fieldName]</code> in the Handlebars context.
          </p>
          {allAvailableFields.length > 0 ? (
            <div className="space-y-1">
              {allAvailableFields.map(field => (
                <label
                  key={field}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-[11px] font-medium transition-all",
                    config.subtotalFields.includes(field)
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={config.subtotalFields.includes(field)}
                    onChange={() => toggleSubtotalField(field)}
                    className="rounded border-slate-300 accent-emerald-600"
                  />
                  {field}
                  {config.subtotalFields.includes(field) && (
                    <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">∑</span>
                  )}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 text-center py-4 italic">
              No fields found. Set an Entity Set in the Entity tab first, or type field names manually.
            </p>
          )}
        </div>
      )}

      {/* Apply Button */}
      <div className="pt-2 border-t border-slate-100">
        <Button
          onClick={() => onApply(config)}
          disabled={!config.entitySetKey.trim()}
          className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-40"
        >
          Apply Loop Configuration
        </Button>
        {!config.entitySetKey.trim() && (
          <p className="text-[9px] text-amber-500 text-center mt-1 font-medium">Set an Entity Set key to enable</p>
        )}
      </div>
    </div>
  );
}
