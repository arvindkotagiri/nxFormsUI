import { useState, useEffect } from "react";
import { Plus, Trash2, Table2, ArrowUpDown, Filter, Sigma, Info } from "lucide-react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEntityNames(selectedContext: any): string[] {
  if (!selectedContext) return ["item", "head"];
  const entities = selectedContext?.entities;
  if (Array.isArray(entities) && entities.length > 0) {
    return entities.map((e: any) => typeof e === 'string' ? e : (e?.name || e?.entitySet || e?.label || "")).filter(Boolean);
  }
  if (selectedContext?.fields && typeof selectedContext.fields === 'object' && !Array.isArray(selectedContext.fields)) {
    return Object.keys(selectedContext.fields);
  }
  return ["item", "head"];
}

function getEntityFields(selectedContext: any, entityKey: string): string[] {
  if (!selectedContext || !entityKey) return [];
  const fieldsByEntity = selectedContext?.fields;
  if (fieldsByEntity && typeof fieldsByEntity === "object" && !Array.isArray(fieldsByEntity)) {
    const match = Object.entries(fieldsByEntity).find(
      ([k]) => k.toLowerCase() === entityKey.toLowerCase()
    );
    if (match && Array.isArray(match[1])) {
      return (match[1] as any[]).map((f: any) => typeof f === 'string' ? f : (f?.name || f?.field_name || f?.path || "")).filter(Boolean);
    }
  }
  return ["itemno", "material", "description", "quantity", "netprice", "taxamount", "total"];
}

// ─── Component ────────────────────────────────────────────────────────────────

function TableLoopConfigPanelInner({ initialConfig, selectedContext, onApply }: TableLoopConfigPanelProps) {
  const getSafeConfig = (cfg: TableLoopConfig | null): TableLoopConfig => ({
    entitySetKey: cfg?.entitySetKey || "item",
    innerEntitySetKey: cfg?.innerEntitySetKey || "",
    sortCriteria: Array.isArray(cfg?.sortCriteria) ? cfg.sortCriteria : [],
    alreadySorted: !!cfg?.alreadySorted,
    filters: Array.isArray(cfg?.filters) ? cfg.filters : [],
    subtotalFields: Array.isArray(cfg?.subtotalFields) ? cfg.subtotalFields : [],
  });

  const [config, setConfig] = useState<TableLoopConfig>(defaultConfig());

  const [activeTab, setActiveTab] = useState<"entity" | "sort" | "filter" | "subtotal">("entity");

  useEffect(() => {
    setConfig(getSafeConfig(initialConfig));
  }, [initialConfig]);

  const entityNames = getEntityNames(selectedContext);
  const outerFields = getEntityFields(selectedContext, config.entitySetKey);
  const innerFields = getEntityFields(selectedContext, config.innerEntitySetKey || "");

  // Merge outer + inner fields for conditions
  const allAvailableFields = Array.from(new Set([...outerFields, ...innerFields]));

  const safeSortCriteria = Array.isArray(config.sortCriteria) ? config.sortCriteria : [];
  const safeFilters = Array.isArray(config.filters) ? config.filters : [];
  const safeSubtotalFields = Array.isArray(config.subtotalFields) ? config.subtotalFields : [];

  // ── Sort Criteria ─────────────────────────────────────────────────────────

  const addSort = () => {
    setConfig(c => ({
      ...c,
      sortCriteria: [...safeSortCriteria, { field: "", direction: "ASC" }],
    }));
  };

  const removeSort = (i: number) => {
    setConfig(c => ({ ...c, sortCriteria: safeSortCriteria.filter((_, idx) => idx !== i) }));
  };

  const updateSort = (i: number, patch: Partial<SortCriterion>) => {
    setConfig(c => {
      const updated = [...safeSortCriteria];
      updated[i] = { ...updated[i], ...patch };
      return { ...c, sortCriteria: updated };
    });
  };

  // ── WHERE Conditions ──────────────────────────────────────────────────────

  const addFilter = () => {
    setConfig(c => ({
      ...c,
      filters: [...safeFilters, { field: "", operator: "!=", value: "" }],
    }));
  };

  const removeFilter = (i: number) => {
    setConfig(c => ({ ...c, filters: safeFilters.filter((_, idx) => idx !== i) }));
  };

  const updateFilter = (i: number, patch: Partial<WhereCondition>) => {
    setConfig(c => {
      const updated = [...safeFilters];
      updated[i] = { ...updated[i], ...patch };
      return { ...c, filters: updated };
    });
  };

  // ── Subtotal ──────────────────────────────────────────────────────────────

  const toggleSubtotalField = (field: string) => {
    setConfig(c => ({
      ...c,
      subtotalFields: safeSubtotalFields.includes(field)
        ? safeSubtotalFields.filter(f => f !== field)
        : [...safeSubtotalFields, field],
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
              {safeSortCriteria.map((sort, i) => (
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
          {safeFilters.map((filter, i) => (
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
        <div className="space-y-3 animate-in fade-in duration-200">
          <p className="text-[9px] text-slate-400 leading-relaxed">
            Select numeric fields to sum automatically in a subtotal row at the bottom of each group table.
          </p>
          {allAvailableFields.length > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {allAvailableFields.map(field => (
                <label
                  key={field}
                  className={cn(
                    config.subtotalFields.includes(field)
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={safeSubtotalFields.includes(field)}
                    onChange={() => toggleSubtotalField(field)}
                    className="rounded border-slate-300 accent-emerald-600"
                  />
                  {field}
                  {safeSubtotalFields.includes(field) && (
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
          className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider disabled:opacity-40 shadow-sm"
        >
          Apply Loop Configuration
        </Button>
        {!config.entitySetKey.trim() && (
          <p className="text-[9px] text-amber-500 text-center mt-1 font-medium">Set an Entity Set key to enable</p>
        )}
      </div>

      {/* Interactive Table Loop Architecture & Explanation Guide */}
      <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-200 text-[11px] font-body space-y-3 border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-800 pb-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          Table Loop Architecture Guide
        </div>

        <div className="space-y-2 text-[10px] leading-relaxed text-slate-300">
          <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-tight shrink-0 mt-0.5">1. Array Binding</span>
            <p>
              The <strong>Entity Set Key</strong> (e.g. <code className="text-amber-300 bg-slate-950 px-1 py-0.5 rounded font-mono">item</code>) binds your table to line items array in SAP payload.
            </p>
          </div>

          <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
            <span className="bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-tight shrink-0 mt-0.5">2. Row Duplication</span>
            <p>
              Detail rows (<code className="text-emerald-300 bg-slate-950 px-1 py-0.5 rounded font-mono">&lt;td&gt;</code>) repeat dynamically for each line item in payload while headers (<code className="text-slate-400 bg-slate-950 px-1 py-0.5 rounded font-mono">&lt;th&gt;</code>) stay fixed.
            </p>
          </div>

          <div className="flex items-start gap-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
            <span className="bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase tracking-tight shrink-0 mt-0.5">3. Field Mapping</span>
            <p>
              Map cells using <code className="text-rose-300 bg-slate-950 px-1 py-0.5 rounded font-mono">&#123;&#123;item.material&#125;&#125;</code>, <code className="text-rose-300 bg-slate-950 px-1 py-0.5 rounded font-mono">&#123;&#123;item.quantity&#125;&#125;</code>, or <code className="text-rose-300 bg-slate-950 px-1 py-0.5 rounded font-mono">&#123;&#123;item.netprice&#125;&#125;</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from "react";

class TableLoopConfigPanelBoundary extends React.Component<TableLoopConfigPanelProps, { hasError: boolean }> {
  constructor(props: TableLoopConfigPanelProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("[TableLoopConfigPanel] Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
            <Info className="w-4 h-4 text-rose-400" />
            Table Loop Config (Reset)
          </div>
          <p className="text-[10px] text-slate-400">
            An error occurred loading the configuration. Click below to re-initialize with default item settings.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onApply(defaultConfig());
            }}
            className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase"
          >
            Reset Table Loop Config
          </Button>
        </div>
      );
    }
    return <TableLoopConfigPanelInner {...this.props} />;
  }
}

export { TableLoopConfigPanelBoundary as TableLoopConfigPanel };
