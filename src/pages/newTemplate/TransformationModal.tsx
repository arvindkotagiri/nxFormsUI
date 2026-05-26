// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
// } from "@/components/ui/dialog";
// import { TRANSFORMATIONS } from "./transformations";

// interface Props {
//     open: boolean;
//     onClose: () => void;
//     onSelect: (type: string) => void;
// }

// export function TransformationModal({ open, onClose, onSelect }: Props) {
//     return (
//         <Dialog open={open} onOpenChange={onClose}>
//             <DialogContent className="max-w-xl">
//                 <DialogHeader>
//                     <DialogTitle>Add Transformation</DialogTitle>
//                 </DialogHeader>

//                 <div className="space-y-6">
//                     {Object.entries(TRANSFORMATIONS).map(([category, list]) => (
//                         <div key={category} className="space-y-2">
//                             <h4 className="text-xs font-bold uppercase text-muted-foreground">
//                                 {category.replace("_", " ")}
//                             </h4>

//                             <div className="flex flex-wrap gap-2">
//                                 {list.map((t) => (
//                                     <button
//                                         key={t}
//                                         onClick={() => onSelect(t)}
//                                         className="px-3 py-1 text-xs border rounded hover:bg-accent"
//                                     >
//                                         {t}
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </DialogContent>
//         </Dialog>
//     );
// }

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown, CheckCircle2, ExternalLink, ArrowLeft, GripVertical } from "lucide-react";
import { IfElseBuilderContent, type IfElseCondition } from "./IfElseBuilder";

const DEFAULT_IF_ELSE_CONDITION: IfElseCondition = {
  field: "",
  operator: "==",
  value: "",
  then: { targetField: "", value: "" },
};

// ─── Transformation registry ───────────────────────────────────────────────

export const TRANSFORMATIONS: Record<string, string[]> = {
  STRING: ["TRIM", "UPPER", "LOWER", "CONCAT", "TRUNCATE", "DEFAULT_VALUE", "REPLACE", "REGEX_EXTRACT"],
  CONDITIONAL: ["IF_ELSE", "SWITCH_CASE", "COALESCE"],
  MATH: ["ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "ROUND", "EXPRESSION"],
  NUMBER_FORMATTING: ["FORMAT_NUMBER", "FORMAT_CURRENCY", "FORMAT_COMPACT", "FORMAT_SCIENTIFIC"],
  DATE: ["DATE_FORMAT", "DATE_DIFF", "DATE_NOW", "DATE_TRUNCATE", "DATE_ADD"],
};

// ─── Help content per transformation ───────────────────────────────────────

const HELP: Record<string, { description: string; params: string[]; example?: { input: string; extra?: string; output: string } }> = {
  TRIM:         { description: "Removes leading and trailing whitespace from a text value.", params: ["No additional parameters required."], example: { input: "  Hello World  ", output: "Hello World" } },
  UPPER:        { description: "Converts all characters in a text value to uppercase.", params: ["No additional parameters required."], example: { input: "hello world", output: "HELLO WORLD" } },
  LOWER:        { description: "Converts all characters in a text value to lowercase.", params: ["No additional parameters required."], example: { input: "Hello World", output: "hello world" } },
  CONCAT:       { description: "Concatenates the field value with another string.", params: ["Prefix (Optional): The string to prepend.", "Suffix: The string to append."], example: { input: "John", extra: "Suffix: Doe", output: "JohnDoe" } },
  TRUNCATE:     { description: "Shortens a text value to a specified maximum length.", params: ["Max Length: The maximum number of characters to keep."], example: { input: "Hello World", extra: "Max Length: 5", output: "Hello" } },
  DEFAULT_VALUE:{ description: "Returns a fallback value when the field is empty or null.", params: ["Default: The value to use when the field is empty."], example: { input: "(empty)", extra: "Default: N/A", output: "N/A" } },
  REPLACE:      { description: "Replaces occurrences of a search string with a replacement.", params: ["Search: The string to find.", "Replace: The string to substitute."], example: { input: "Hello World", extra: "Search: World → Replace: SAP", output: "Hello SAP" } },
  REGEX_EXTRACT:{ description: "Extracts a specific part of a text value that matches a regular expression. Multiple capture groups are supported.", params: ["Regular Expression: The regex pattern to match.", "Capture Group (Optional): The number of the group to extract."], example: { input: "Contact: John Doe | ID: 12345", extra: "REGEX: ID:\\s*(\\d+)", output: "12345" } },
  IF_ELSE:      { description: "Applies conditional logic — evaluate a condition and return different values for true/false outcomes.", params: ["Field: The context field to evaluate.", "Operator: Comparison operator (==, !=, >, <).", "Value: The value to compare against.", "Then / Else: The output for each branch."] },
  SWITCH_CASE:  { description: "Maps input values to specific output values, like a lookup table.", params: ["Cases: A list of input=output pairs, one per line.", "Default (Optional): Fallback when no case matches."], example: { input: "USD", extra: "USD=Dollar, EUR=Euro", output: "Dollar" } },
  COALESCE:     { description: "Returns the first non-empty value from a list of fields.", params: ["Fields: Comma-separated list of field paths to evaluate in order."] },
  ADD:          { description: "Adds a numeric value to the field.", params: ["Operand: The number to add."], example: { input: "100", extra: "Operand: 50", output: "150" } },
  SUBTRACT:     { description: "Subtracts a numeric value from the field.", params: ["Operand: The number to subtract."], example: { input: "100", extra: "Operand: 25", output: "75" } },
  MULTIPLY:     { description: "Multiplies the field by a numeric value.", params: ["Factor: The multiplier."], example: { input: "20", extra: "Factor: 5", output: "100" } },
  DIVIDE:       { description: "Divides the field by a numeric value.", params: ["Divisor: The number to divide by."], example: { input: "100", extra: "Divisor: 4", output: "25" } },
  ROUND:        { description: "Rounds a numeric value to a given number of decimal places.", params: ["Decimal Places: Defaults to 0."], example: { input: "3.14159", extra: "Places: 2", output: "3.14" } },
  EXPRESSION:   { description: "Evaluates a mathematical expression using the field as a variable `x`.", params: ["Expression: A formula using x as the field variable."], example: { input: "5", extra: "Expression: x * 2 + 10", output: "20" } },
  FORMAT_NUMBER:    { description: "Formats a number with locale-aware separators and decimals.", params: ["Locale (Optional): e.g. en-US, de-DE.", "Decimal Places (Optional): Fixed decimal precision."], example: { input: "1234567.89", output: "1,234,567.89" } },
  FORMAT_CURRENCY:  { description: "Formats a number as a currency string.", params: ["Currency Code: e.g. USD, EUR, GBP.", "Locale (Optional): e.g. en-US."], example: { input: "9999.5", extra: "Currency: USD", output: "$9,999.50" } },
  FORMAT_COMPACT:   { description: "Formats large numbers compactly.", params: ["No additional parameters required."], example: { input: "1500000", output: "1.5M" } },
  FORMAT_SCIENTIFIC:{ description: "Formats a number in scientific notation.", params: ["Decimal Places (Optional)."], example: { input: "123456", output: "1.23e+5" } },
  DATE_FORMAT:   { description: "Formats a date value using a pattern string.", params: ["Pattern: e.g. DD/MM/YYYY, YYYY-MM-DD."], example: { input: "2024-01-15", extra: "Pattern: DD/MM/YYYY", output: "15/01/2024" } },
  DATE_DIFF:     { description: "Calculates the difference between a date field and a reference date.", params: ["Reference Date: Target date or field path.", "Unit: days, months, or years."], example: { input: "2024-01-01", extra: "Ref: 2024-12-31, Unit: days", output: "365" } },
  DATE_NOW:      { description: "Replaces the field value with the current date/time.", params: ["Format (Optional): Output pattern."] },
  DATE_TRUNCATE: { description: "Truncates a date to the start of a given period.", params: ["Unit: day, month, or year."], example: { input: "2024-07-15", extra: "Unit: month", output: "2024-07-01" } },
  DATE_ADD:      { description: "Adds or subtracts a duration from a date.", params: ["Amount: Number of units (negative to subtract).", "Unit: days, months, or years."], example: { input: "2024-01-01", extra: "Amount: 30, Unit: days", output: "2024-01-31" } },
};

// ─── Field config per transformation ───────────────────────────────────────

interface FieldDef { label: string; placeholder: string; type?: "text" | "select"; options?: string[] }

const FIELDS: Record<string, FieldDef[]> = {
  CONCAT:          [{ label: "Prefix", placeholder: "e.g. Invoice #" }, { label: "Suffix", placeholder: "e.g. (Copy)" }],
  TRUNCATE:        [{ label: "Max Length", placeholder: "e.g. 50" }],
  DEFAULT_VALUE:   [{ label: "Default Value", placeholder: "e.g. N/A" }],
  REPLACE:         [{ label: "Search", placeholder: "Text to find" }, { label: "Replace", placeholder: "Replacement text" }],
  REGEX_EXTRACT:   [{ label: "Regular Expression", placeholder: "e.g. ID:\\s*(\\d+)" }, { label: "Global Match", placeholder: "true", type: "select", options: ["", "true", "false"] }],
  ADD:             [{ label: "Operand", placeholder: "e.g. 100" }],
  SUBTRACT:        [{ label: "Operand", placeholder: "e.g. 25" }],
  MULTIPLY:        [{ label: "Factor", placeholder: "e.g. 1.1" }],
  DIVIDE:          [{ label: "Divisor", placeholder: "e.g. 100" }],
  ROUND:           [{ label: "Decimal Places", placeholder: "e.g. 2" }],
  EXPRESSION:      [{ label: "Expression", placeholder: "e.g. x * 1.19" }],
  FORMAT_NUMBER:   [{ label: "Locale", placeholder: "e.g. en-US" }, { label: "Decimal Places", placeholder: "e.g. 2" }],
  FORMAT_CURRENCY: [{ label: "Currency Code", placeholder: "e.g. USD" }, { label: "Locale", placeholder: "e.g. en-US" }],
  DATE_FORMAT:     [{ label: "Pattern", placeholder: "e.g. DD/MM/YYYY" }],
  DATE_DIFF:       [{ label: "Reference Date / Field", placeholder: "e.g. 2024-12-31" }, { label: "Unit", placeholder: "days", type: "select", options: ["days", "months", "years"] }],
  DATE_NOW:        [{ label: "Format (Optional)", placeholder: "e.g. YYYY-MM-DD" }],
  DATE_TRUNCATE:   [{ label: "Unit", placeholder: "month", type: "select", options: ["day", "month", "year"] }],
  DATE_ADD:        [{ label: "Amount", placeholder: "e.g. 30 or -7" }, { label: "Unit", placeholder: "days", type: "select", options: ["days", "months", "years"] }],
  SWITCH_CASE:     [{ label: "Cases (input=output, one per line)", placeholder: "USD=Dollar\nEUR=Euro" }],
  COALESCE:        [{ label: "Field Paths (comma-separated)", placeholder: "entity.field1, entity.field2" }],
};

// ─── Payload & props ───────────────────────────────────────────────────────

export type TransformationPayload = {
  type: string;
  value?: string;
  values?: Record<string, string>;
  conditions?: IfElseCondition[];
};

const ALL_TYPES = Object.values(TRANSFORMATIONS).flat();

/** Parameterless transformations — enabled/disabled via toggle, not on select */
const TOGGLE_TYPES = new Set(
  ALL_TYPES.filter((t) => !(FIELDS[t]?.length) && t !== "IF_ELSE"),
);

const isToggleType = (type: string) => TOGGLE_TYPES.has(type);

const hasFieldValues = (values: Record<string, string>) =>
  Object.values(values).some((v) => v.trim() !== "");

function buildPayload(
  type: string,
  allValues: Record<string, Record<string, string>>,
  ifElseConditions: IfElseCondition[],
): TransformationPayload | null {
  if (type === "IF_ELSE") {
    return { type, conditions: ifElseConditions };
  }
  const defs = FIELDS[type] ?? [];
  const values = allValues[type];
  if (defs.length > 0) {
    if (!values || !hasFieldValues(values)) return null;
    const keys = Object.keys(values);
    const value = keys.length === 1 ? values[keys[0]] : undefined;
    return { type, value, values: keys.length > 1 ? values : undefined };
  }
  return { type };
}

function getTransformationSummary(
  type: string,
  allValues: Record<string, Record<string, string>>,
  ifElseConditions: IfElseCondition[],
): string {
  if (type === "IF_ELSE") {
    return `${ifElseConditions.length} condition${ifElseConditions.length !== 1 ? "s" : ""}`;
  }
  if (isToggleType(type)) return "Enabled";
  const values = allValues[type];
  if (!values) return "";
  const parts = Object.entries(values)
    .filter(([, v]) => v.trim() !== "")
    .map(([k, v]) => `${k}: ${v}`);
  return parts.join(", ");
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with all configured transformations when user clicks Apply */
  onApply: (transformations: TransformationPayload[]) => void;
  /** Already-saved transformations — used to pre-populate fields on re-open */
  existingTransformations?: Array<{
    type: string;
    value?: string;
    values?: Record<string, string>;
    conditions?: IfElseCondition[];
  }>;
  contextFields?: { name: string; path?: string }[];
  targetFields?: { name: string; path?: string }[];
}

// ─── Component ─────────────────────────────────────────────────────────────

export function TransformationModal({
  open,
  onClose,
  onApply,
  existingTransformations = [],
  contextFields = [],
  targetFields = [],
}: Props) {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [helpPanel, setHelpPanel] = useState(true);
  // Values stored per-type: switching transformations never clears other types' data
  const [allValues, setAllValues] = useState<Record<string, Record<string, string>>>({});
  const [noConfigSelected, setNoConfigSelected] = useState<Set<string>>(new Set());
  const [configuredOrder, setConfiguredOrder] = useState<string[]>([]);
  const [ifElseConditions, setIfElseConditions] = useState<IfElseCondition[]>([DEFAULT_IF_ELSE_CONDITION]);
  const [ifElseDraft, setIfElseDraft] = useState<IfElseCondition[]>([DEFAULT_IF_ELSE_CONDITION]);
  const [showIfElseBuilder, setShowIfElseBuilder] = useState(false);
  const [ifElseConfigured, setIfElseConfigured] = useState(false);

  const markConfigured = (type: string) => {
    setConfiguredOrder((prev) => (prev.includes(type) ? prev : [...prev, type]));
  };

  const unmarkConfigured = (type: string) => {
    setConfiguredOrder((prev) => prev.filter((t) => t !== type));
  };

  const toggleNoConfig = (type: string, enabled: boolean) => {
    setNoConfigSelected((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(type);
      else next.delete(type);
      return next;
    });
    if (enabled) markConfigured(type);
    else unmarkConfigured(type);
  };

  const isTypeConfigured = (type: string): boolean => {
    if (type === "IF_ELSE") return ifElseConfigured;
    if (isToggleType(type)) return noConfigSelected.has(type);
    const defs = FIELDS[type] ?? [];
    if (defs.length > 0) {
      const values = allValues[type];
      return !!values && hasFieldValues(values);
    }
    return false;
  };

  const appliedTypes = useMemo(
    () => configuredOrder.filter((type) => isTypeConfigured(type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [configuredOrder, allValues, noConfigSelected, ifElseConfigured, ifElseConditions],
  );

  const pendingTransformations = useMemo(() => {
    const payloads: TransformationPayload[] = [];
    for (const type of appliedTypes) {
      if (type === "IF_ELSE") {
        payloads.push({ type, conditions: ifElseConditions });
        continue;
      }
      if (isToggleType(type)) {
        payloads.push({ type });
        continue;
      }
      const payload = buildPayload(type, allValues, ifElseConditions);
      if (payload) payloads.push(payload);
    }
    return payloads;
  }, [appliedTypes, allValues, ifElseConditions]);

  // Seed from existingTransformations every time the modal opens
  useEffect(() => {
    if (!open) return;
    const seeded: Record<string, Record<string, string>> = {};
    for (const t of existingTransformations) {
      if (!t.type) continue;
      const defs = FIELDS[t.type] ?? [];
      if (defs.length === 0) continue;
      if (t.values) {
        // Multi-field: stored as a values map
        seeded[t.type] = t.values;
      } else if (defs.length === 1 && t.value !== undefined) {
        // Single-field: stored as t.value
        seeded[t.type] = { [defs[0].label]: t.value };
      }
    }
    setAllValues(seeded);

    const seededNoConfig = new Set<string>();
    const order: string[] = [];
    for (const t of existingTransformations) {
      if (!t.type || !ALL_TYPES.includes(t.type)) continue;
      order.push(t.type);
      if (isToggleType(t.type)) {
        seededNoConfig.add(t.type);
      }
    }
    setNoConfigSelected(seededNoConfig);
    setConfiguredOrder(order);

    const existingIfElse = existingTransformations.find((t) => t.type === "IF_ELSE");
    const seededConditions = existingIfElse?.conditions?.length
      ? existingIfElse.conditions
      : [{ ...DEFAULT_IF_ELSE_CONDITION }];
    setIfElseConditions(seededConditions);
    setIfElseDraft(seededConditions);
    setIfElseConfigured(!!existingIfElse?.conditions?.length);
    setShowIfElseBuilder(false);
    setExpandedCategory(null);

    // Pre-select first existing transformation if any
    if (existingTransformations.length > 0 && existingTransformations[0].type) {
      setSelected(existingTransformations[0].type);
    } else {
      setSelected(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return TRANSFORMATIONS;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [cat, list] of Object.entries(TRANSFORMATIONS)) {
      const hits = list.filter((t) => t.toLowerCase().includes(q));
      if (hits.length) result[cat] = hits;
    }
    return result;
  }, [search]);

  const fieldDefs   = selected ? (FIELDS[selected] ?? []) : [];
  const helpData    = selected ? HELP[selected] : null;
  const isToggleSelected = selected ? isToggleType(selected) : false;
  // Values for the currently selected type (falls back to {})
  const fieldValues: Record<string, string> = selected ? (allValues[selected] ?? {}) : {};

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleCategory = (cat: string) => {
    setExpandedCategory((current) => (current === cat ? null : cat));
  };

  const isCategoryExpanded = (cat: string) => {
    if (search.trim()) return !!filtered[cat];
    return expandedCategory === cat;
  };

  const reorderApplied = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const next = [...appliedTypes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setConfiguredOrder(next);
  };

  const handleSelect = (type: string) => {
    setSelected(type);
    setShowIfElseBuilder(false);
    if (type === "IF_ELSE") setHelpPanel(false);
    // Toggle types are enabled/disabled via switch — selecting only opens the editor
  };

  const openIfElseBuilder = () => {
    setIfElseDraft(ifElseConditions);
    setShowIfElseBuilder(true);
  };

  const handleIfElseSave = () => {
    setIfElseConditions(ifElseDraft);
    setIfElseConfigured(true);
    markConfigured("IF_ELSE");
    setShowIfElseBuilder(false);
  };

  const handleIfElseBuilderCancel = () => {
    setIfElseDraft(ifElseConditions);
    setShowIfElseBuilder(false);
  };

  const setFieldValue = (label: string, value: string) => {
    if (!selected) return;
    const updated = { ...(allValues[selected] ?? {}), [label]: value };
    setAllValues((prev) => ({ ...prev, [selected]: updated }));
    if (hasFieldValues(updated)) markConfigured(selected);
  };

  const handleApply = () => {
    if (pendingTransformations.length === 0) return;
    onApply(pendingTransformations);
    onClose();
  };

  const handleClose = () => {
    setSelected(null);
    setSearch("");
    setShowIfElseBuilder(false);
    setIfElseConfigured(false);
    setNoConfigSelected(new Set());
    setConfiguredOrder([]);
    setExpandedCategory(null);
    setDragIndex(null);
    onClose();
  };

  const renderAppliedList = (className?: string) => (
    <div className={cn("flex flex-col min-h-0", className)}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground shrink-0 mb-2">
        Applied Transformations ({appliedTypes.length})
      </p>
      {appliedTypes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No transformations applied yet. Configure transformations and they will appear here.
        </p>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1">
          {appliedTypes.map((type, index) => (
            <li
              key={type}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragIndex !== null) reorderApplied(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              onClick={() => handleSelect(type)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs cursor-grab active:cursor-grabbing transition-colors",
                selected === type
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/40",
                dragIndex === index && "opacity-50",
              )}
            >
              <GripVertical size={14} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{type}</p>
                {getTransformationSummary(type, allValues, ifElseConditions) && (
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {getTransformationSummary(type, allValues, ifElseConditions)}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground shrink-0">{index + 1}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderHelpContent = () => {
    if (!helpData || !selected) return null;
    return (
      <div className="flex flex-col min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        <p className="text-[9px] font-bold uppercase tracking-widest text-accent shrink-0 mb-2">
          ✱ Help & Examples ({selected})
        </p>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-xs">
          <div>
            <p className="font-bold mb-1">Description:</p>
            <p className="text-muted-foreground leading-relaxed">{helpData.description}</p>
          </div>
          <div>
            <p className="font-bold mb-1">Parameters:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              {helpData.params.map((p) => (
                <li key={p} className="flex gap-1.5">
                  <span className="mt-1 w-1 h-1 rounded-full bg-accent shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          {helpData.example && (
            <div>
              <p className="font-bold mb-1">Example:</p>
              <div className="space-y-1 font-mono text-[11px] bg-muted/40 p-2 rounded-lg">
                <div>
                  <span className="font-sans font-bold text-foreground">INPUT: </span>
                  <span className="text-muted-foreground">{helpData.example.input}</span>
                </div>
                {helpData.example.extra && (
                  <div>
                    <span className="font-sans font-bold text-foreground">PARAM: </span>
                    <span className="text-muted-foreground">{helpData.example.extra}</span>
                  </div>
                )}
                <div>
                  <span className="font-sans font-bold text-foreground">OUTPUT: </span>
                  <span className="text-accent font-bold">{helpData.example.output}</span>
                </div>
              </div>
            </div>
          )}
          <a href="#" className="inline-flex items-center gap-1 text-accent text-[11px] hover:underline">
            Full Documentation <ExternalLink size={10} />
          </a>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl">

        {/* Title */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          {showIfElseBuilder ? (
            <button
              type="button"
              onClick={handleIfElseBuilderCancel}
              className="flex items-center gap-2 text-sm font-bold tracking-wide hover:text-accent transition-colors"
            >
              <ArrowLeft size={16} />
              IF ELSE Builder
            </button>
          ) : (
            <h2 className="text-sm font-bold tracking-wide">Add Transformation</h2>
          )}
        </div>

        {showIfElseBuilder ? (
          <>
            <div className="flex-1 min-h-0 overflow-hidden p-5">
              <IfElseBuilderContent
                contextFields={contextFields}
                targetFields={targetFields}
                conditions={ifElseDraft}
                onConditionsChange={setIfElseDraft}
                className="flex flex-col h-full min-h-0 gap-3"
              />
            </div>
            <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-end gap-2 bg-muted/10">
              <Button variant="outline" size="sm" onClick={handleIfElseBuilderCancel} className="text-xs h-8">
                Cancel
              </Button>
              <Button size="sm" onClick={handleIfElseSave} className="text-xs h-8 bg-accent text-accent-foreground px-5 font-bold">
                Save
              </Button>
            </div>
          </>
        ) : (
        <>
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — transformation list */}
          <div className="w-64 shrink-0 border-r border-border flex flex-col bg-muted/20">
            <div className="p-3 border-b border-border">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-widest">
                Available Transformations
              </p>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search transformations..."
                  className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {Object.entries(filtered).map(([cat, list]) => (
                <div key={cat}>
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="flex items-center gap-1.5 w-full mb-1.5 group"
                  >
                    <ChevronDown
                      size={11}
                      className={cn(
                        "text-muted-foreground transition-transform",
                        !isCategoryExpanded(cat) && "-rotate-90",
                      )}
                    />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                      {cat.replace("_", " ")}
                    </span>
                  </button>

                  {isCategoryExpanded(cat) && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {list.map((t) => (
                        <button
                          key={t}
                          onClick={() => handleSelect(t)}
                          className={cn(
                            "px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-all",
                            selected === t
                              ? "bg-accent text-accent-foreground border-accent shadow-sm"
                              : isTypeConfigured(t)
                                ? "border-accent/60 bg-accent/10 text-foreground"
                                : "border-border bg-card hover:border-accent/50 hover:bg-accent/5 text-foreground",
                          )}
                        >
                          {t}
                          {isTypeConfigured(t) && (
                            <span className="ml-1 inline-block w-1 h-1 rounded-full bg-accent align-middle" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor header */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0 bg-muted/10">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                Transformation Editor
              </p>
              <button
                type="button"
                onClick={() => setHelpPanel((p) => !p)}
                className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                Help Panel
                <span
                  className={cn(
                    "inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-bold transition-colors",
                    helpPanel ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {helpPanel ? "ON" : "OFF"}
                </span>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Config pane */}
              <div className="w-1/2 flex flex-col min-h-0 p-5 space-y-4 overflow-y-auto custom-scrollbar border-r border-border">
                {!selected ? (
                  <div className="flex-1 flex items-center justify-center text-center">
                    <div>
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3 opacity-40">
                        <Search size={20} className="text-muted-foreground" />
                      </div>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                        Select a transformation to configure
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-base font-semibold shrink-0">
                      Configure <span className="text-accent">[{selected}]</span>
                    </h3>

                    {selected === "IF_ELSE" ? (
                      <div className="flex flex-col items-start gap-4">
                        <p className="text-sm text-muted-foreground">Configure If Else</p>
                        {ifElseConfigured && (
                          <p className="text-xs text-green-600 font-semibold">
                            {ifElseConditions.length} condition{ifElseConditions.length !== 1 ? "s" : ""} configured
                          </p>
                        )}
                        <Button
                          size="sm"
                          onClick={openIfElseBuilder}
                          className="text-xs h-8 bg-accent text-accent-foreground font-bold"
                        >
                          {ifElseConfigured ? "Edit Configuration" : "Configure"}
                        </Button>
                      </div>
                    ) : isToggleSelected ? (
                      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-muted/30">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Enable transformation</p>
                          <p className="text-xs text-muted-foreground">
                            Turn on to include <span className="font-semibold text-foreground">{selected}</span> when you apply.
                            Turn off to remove it from this label.
                          </p>
                        </div>
                        <Switch
                          checked={noConfigSelected.has(selected)}
                          onCheckedChange={(checked) => toggleNoConfig(selected, checked)}
                        />
                      </div>
                    ) : (
                      fieldDefs.map((f) => (
                        <div key={f.label} className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            {f.label}
                          </label>
                          {f.type === "select" ? (
                            <select
                              value={fieldValues[f.label] ?? ""}
                              onChange={(e) => setFieldValue(f.label, e.target.value)}
                              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/30"
                            >
                              {f.options!.map((o) => (
                                <option key={o} value={o}>{o || "— select —"}</option>
                              ))}
                            </select>
                          ) : f.placeholder.includes("\n") ? (
                            <textarea
                              rows={4}
                              value={fieldValues[f.label] ?? ""}
                              placeholder={f.placeholder}
                              onChange={(e) => setFieldValue(f.label, e.target.value)}
                              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none font-mono"
                            />
                          ) : (
                            <input
                              value={fieldValues[f.label] ?? ""}
                              placeholder={f.placeholder}
                              onChange={(e) => setFieldValue(f.label, e.target.value)}
                              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          )}
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>

              {/* Applied list + optional help */}
              <div className="w-1/2 flex flex-col min-h-0 p-5 bg-muted/10 gap-0">
                {helpPanel && selected && helpData ? (
                  <>
                    <div className="flex-1 min-h-0 pb-3 border-b border-border mb-3">
                      {renderAppliedList("h-full")}
                    </div>
                    {renderHelpContent()}
                  </>
                ) : (
                  renderAppliedList("h-full")
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center justify-between bg-muted/10">
          <div className="flex items-center gap-1.5 text-[11px] text-green-600 font-semibold">
            <CheckCircle2 size={13} />
            Live Syntax Check: <span className="text-green-600">Pass</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={pendingTransformations.length === 0}
              className="text-xs h-8 bg-accent text-accent-foreground px-5 font-bold"
            >
              {pendingTransformations.length > 1
                ? `Apply ${pendingTransformations.length} Transformations`
                : "Apply Transformation"}
            </Button>
          </div>
        </div>
        </>
        )}

      </DialogContent>
    </Dialog>
  );
}