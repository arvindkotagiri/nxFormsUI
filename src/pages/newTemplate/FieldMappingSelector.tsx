import { useState, useEffect, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ArrowLeft, Database, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldMappingSelectorProps {
  value?: string;
  onSelect: (fullMapping: string, fieldName: string) => void;
  selectedContext: any;
  sourceLabel?: string;
  placeholder?: string;
  className?: string;
}

export function FieldMappingSelector({ value, onSelect, selectedContext, sourceLabel, placeholder = "Select field...", className }: FieldMappingSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  const isOData = selectedContext?.isOData;
  const entities = selectedContext?.entities || [];
  const fieldsByEntity = selectedContext?.fields || {};
  const flatFields = Array.isArray(selectedContext?.fields) ? selectedContext.fields : [];
  useEffect(() => {
    if (open && isOData) {
      console.log("[FieldMappingSelector Debug OData]", {
        isOData,
        entitiesCount: entities?.length || 0,
        entities: entities?.map((e: any) => ({ name: e.name, label: e.label })),
      });
    }
  }, [open, isOData, entities]);
  const outputFieldsByEntity = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const outputFields = Array.isArray(selectedContext?.output_fields)
      ? selectedContext.output_fields
      : [];

    for (const field of outputFields) {
      const entityName = field.entity;
      if (!entityName) continue;
      if (!grouped[entityName]) grouped[entityName] = [];
      grouped[entityName].push(field);
    }

    return grouped;
  }, [selectedContext?.output_fields]);

  const normalizeKey = (value: any) => String(value || "").trim().toLowerCase();

  const resolveFieldName = (field: any) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field.name || field.field || field.field_name || field.originalName || field.technicalName || field.key || "";
  };

  const resolveFieldLabel = (field: any) => {
    if (!field) return "";
    if (typeof field === "string") return field;
    return field.label || field.description || field.text || resolveFieldName(field);
  };

  const resolveFieldType = (field: any) => {
    if (!field || typeof field === "string") return "";
    return field.type || field.dataType || field.edmType || "";
  };

  const getEntityFields = (entityName: string | null) => {
    if (!entityName) return [] as any[];

    const keys = new Set<string>();
    keys.add(entityName);

    const entityMeta = Array.isArray(entities)
      ? entities.find((e: any) =>
          normalizeKey(e?.name) === normalizeKey(entityName) ||
          normalizeKey(e?.label) === normalizeKey(entityName) ||
          normalizeKey(e?.entity) === normalizeKey(entityName) ||
          normalizeKey(e?.entitySet) === normalizeKey(entityName)
        )
      : null;

    if (entityMeta) {
      [entityMeta.name, entityMeta.label, entityMeta.entity, entityMeta.entitySet].forEach((k: any) => {
        if (k) keys.add(String(k));
      });
    }

    const keyList = Array.from(keys);
    const normalized = new Set(keyList.map(normalizeKey));

    const findByKeys = (source: Record<string, any[]>) => {
      for (const key of keyList) {
        if (Array.isArray(source?.[key]) && source[key].length > 0) return source[key];
      }

      for (const [k, arr] of Object.entries(source || {})) {
        if (normalized.has(normalizeKey(k)) && Array.isArray(arr) && arr.length > 0) {
          return arr;
        }
      }

      return [] as any[];
    };

    const outputMatches = findByKeys(outputFieldsByEntity);
    if (outputMatches.length > 0) return outputMatches;

    const fieldMatches = findByKeys(fieldsByEntity);
    if (fieldMatches.length > 0) {
      const visible = fieldMatches.filter((f: any) => f?.showInOutputDefinition === true);
      return visible.length > 0 ? visible : fieldMatches;
    }

    if (entityMeta && Array.isArray((entityMeta as any).fields) && (entityMeta as any).fields.length > 0) {
      return (entityMeta as any).fields;
    }

    return [] as any[];
  };

  const selectedEntityFields = useMemo(() => getEntityFields(selectedEntity), [selectedEntity, entities, fieldsByEntity, outputFieldsByEntity]);

  // Reset selected entity when popover closes
  useEffect(() => {
    if (!open) {
      setSelectedEntity(null);
    }
  }, [open]);

  // Extract display name
  // If the value is EntitySet.FieldName, show only FieldName
  const currentField = value?.includes('.') ? value.split('.')[1] : value;
  const displayValue = currentField || value || placeholder;

  const normalizeText = (input: string) =>
    String(input || "")
      .toLowerCase()
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_\-./\\]/g, " ")
      .replace(/\b(field|fields|value|values|label|text|name|id)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const tokenize = (input: string) =>
    normalizeText(input)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token && token.length > 1);

  const diceCoefficient = (left: string, right: string) => {
    const a = normalizeText(left).replace(/\s+/g, "");
    const b = normalizeText(right).replace(/\s+/g, "");
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const grams = (text: string) => {
      const list: string[] = [];
      for (let index = 0; index < text.length - 1; index += 1) {
        list.push(text.slice(index, index + 2));
      }
      return list;
    };

    const leftGrams = grams(a);
    const rightGrams = grams(b);
    const counts = new Map<string, number>();
    for (const gram of leftGrams) counts.set(gram, (counts.get(gram) || 0) + 1);

    let overlap = 0;
    for (const gram of rightGrams) {
      const current = counts.get(gram) || 0;
      if (current > 0) {
        overlap += 1;
        counts.set(gram, current - 1);
      }
    }

    return (2 * overlap) / (leftGrams.length + rightGrams.length);
  };

  const similarityScore = (source: string, fieldName: string, fieldLabel?: string) => {
    const sourceTokens = tokenize(source);
    const nameTokens = tokenize(fieldName);
    const labelTokens = tokenize(fieldLabel || "");

    const exactName = normalizeText(source) === normalizeText(fieldName) ? 100 : 0;
    const exactLabel = fieldLabel && normalizeText(source) === normalizeText(fieldLabel) ? 90 : 0;
    const sourceText = normalizeText(source);
    const nameText = normalizeText(fieldName);
    const labelText = normalizeText(fieldLabel || "");

    const substringBonus = [nameText, labelText].some((candidate) => candidate && sourceText && (candidate.includes(sourceText) || sourceText.includes(candidate))) ? 30 : 0;
    const tokenOverlap = [...new Set(sourceTokens)].reduce((count, token) => {
      if (nameTokens.includes(token) || labelTokens.includes(token)) return count + 1;
      return count;
    }, 0);

    const diceName = diceCoefficient(source, fieldName) * 40;
    const diceLabel = diceCoefficient(source, fieldLabel || "") * 35;

    return exactName + exactLabel + substringBonus + tokenOverlap * 10 + Math.max(diceName, diceLabel);
  };

  const getRecommendations = (fields: any[], entityName?: string) => {
    if (!sourceLabel || !sourceLabel.trim()) return [] as any[];

    const scored = fields
      .map((field: any) => {
        const fieldName = resolveFieldName(field);
        if (!fieldName) return null;
        const fieldLabel = resolveFieldLabel(field);
        const score = similarityScore(sourceLabel, fieldName, fieldLabel);
        return { ...field, _score: score, _entityName: entityName || selectedEntity || "" };
      })
      .filter(Boolean)
      .sort((left: any, right: any) => right._score - left._score) as any[];

    const exactMatches = scored.filter((field: any) => field._score >= 90);
    const closeMatches = scored.filter((field: any) => field._score < 90);

    return [...exactMatches.slice(0, 1), ...closeMatches.slice(0, 3)].slice(0, 4);
  };

  const recommendedFields = useMemo(() => {
    if (isOData) {
      return getRecommendations(selectedEntityFields, selectedEntity || undefined);
    }

    const outputFields = Array.isArray(selectedContext?.output_fields) && selectedContext.output_fields.length > 0
      ? selectedContext.output_fields
      : (() => {
          const visible = flatFields.filter((field: any) => field?.showInOutputDefinition === true);
          return visible.length > 0 ? visible : flatFields;
        })();

    return getRecommendations(outputFields);
  }, [isOData, selectedEntityFields, selectedEntity, selectedContext?.output_fields, flatFields, sourceLabel]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 text-xs font-semibold bg-card", className)}
          disabled={!selectedContext}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 shadow-2xl border-accent/20" align="start">
        <Command className="bg-card">
          {!selectedContext ? (
            <CommandEmpty>
              <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
                <p>No context selected</p>
                <p className="text-[9px]">Please select a Business Context first</p>
              </div>
            </CommandEmpty>
          ) : isOData ? (
            !selectedEntity ? (
              <>
                <div className="px-3 py-2 border-b bg-muted/20">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Entity Set</p>
                </div>
                <CommandInput placeholder="Search entity set..." className="text-xs h-9" />
                <CommandList className="max-h-[300px] custom-scrollbar">
                  {entities.length === 0 ? (
                    <CommandEmpty>
                      <div className="p-4 text-center text-xs text-muted-foreground space-y-2">
                        <p>No entities found</p>
                        <p className="text-[9px]">Check if the API configuration has entities configured</p>
                      </div>
                    </CommandEmpty>
                  ) : (
                    <>
                      <CommandEmpty>No entity set found.</CommandEmpty>
                      <CommandGroup>
                        {entities.map((entity: any) => (
                          <CommandItem
                            key={entity.name}
                            value={entity.name}
                            onSelect={() => setSelectedEntity(entity.name)}
                            className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                          >
                            <Database className="mr-2 h-3.5 w-3.5 text-accent" />
                            <div className="flex flex-col">
                                <span className="font-semibold">{entity.label || entity.name}</span>
                                <span className="text-[9px] text-muted-foreground">{entity.name}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </>
            ) : (
              <>
                <div className="flex items-center border-b px-2 py-1.5 bg-accent/5">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 mr-2 hover:bg-accent/10 text-accent" 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedEntity(null);
                    }}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <div className="flex flex-col min-w-0">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase leading-none">Entity Set</span>
                      <span className="text-xs font-bold text-accent truncate">
                        {selectedEntity}
                      </span>
                  </div>
                </div>
                <CommandInput placeholder="Search field..." className="text-xs h-9" />
                <CommandList className="max-h-[300px] custom-scrollbar">
                  <CommandEmpty>No field found.</CommandEmpty>
                  <CommandGroup>
                    {recommendedFields.length > 0 && (
                      <>
                        <div className="px-3 py-2 border-b bg-muted/20">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recommended</p>
                        </div>
                        {recommendedFields.map((field: any) => {
                          const fieldName = resolveFieldName(field);
                          const fieldLabel = resolveFieldLabel(field);
                          const fieldType = resolveFieldType(field);
                          const entityPrefix = field._entityName || selectedEntity || "";
                          const fullValue = entityPrefix ? `${entityPrefix}.${fieldName}` : fieldName;
                          const isExact = field._score >= 90;

                          return (
                            <CommandItem
                              key={`recommended-${fullValue}`}
                              value={fieldName}
                              onSelect={() => {
                                onSelect(fullValue, fieldName);
                                setOpen(false);
                              }}
                              className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                            >
                              <Database className={`mr-2 h-3.5 w-3.5 ${isExact ? "text-emerald-600" : "text-accent"}`} />
                              <div className="flex flex-col">
                                <span className="font-semibold">{fieldLabel}</span>
                                <span className="text-[9px] text-muted-foreground">
                                  {entityPrefix ? `${entityPrefix}.` : ""}{fieldName}{fieldType ? ` (${fieldType})` : ""}
                                </span>
                              </div>
                              {value === fullValue && <Check className="ml-auto h-3.5 w-3.5 text-accent" />}
                            </CommandItem>
                          );
                        })}
                      </>
                    )}
                    {selectedEntityFields
                      .filter((field: any) => !!resolveFieldName(field))
                      .map((field: any) => {
                        const fieldName = resolveFieldName(field);
                        const fieldLabel = resolveFieldLabel(field);
                        const fieldType = resolveFieldType(field);

                        return (
                      <CommandItem
                        key={fieldName}
                        value={fieldName}
                        onSelect={() => {
                          onSelect(`${selectedEntity}.${fieldName}`, fieldName);
                          setOpen(false);
                        }}
                        className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                      >
                        <Tag className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="font-semibold">{fieldLabel}</span>
                            <span className="text-[9px] text-muted-foreground">{fieldName}{fieldType ? ` (${fieldType})` : ""}</span>
                        </div>
                        {value === `${selectedEntity}.${fieldName}` && (
                          <Check className="ml-auto h-3.5 w-3.5 text-accent" />
                        )}
                      </CommandItem>
                        );
                      })}
                  </CommandGroup>
                </CommandList>
              </>
            )
          ) : (
            <>
              <CommandInput placeholder="Search field..." className="text-xs h-9" />
              <CommandList className="max-h-[300px] custom-scrollbar">
                <CommandEmpty>No field found.</CommandEmpty>
                <CommandGroup>
                  {recommendedFields.length > 0 && (
                    <>
                      <div className="px-3 py-2 border-b bg-muted/20">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recommended</p>
                      </div>
                      {recommendedFields.map((field: any) => {
                        const fieldName = resolveFieldName(field);
                        const fieldLabel = resolveFieldLabel(field);
                        const fieldType = resolveFieldType(field);
                        const fullValue = fieldName;

                        return (
                          <CommandItem
                            key={`recommended-${fullValue}`}
                            value={fieldName}
                            onSelect={() => {
                              onSelect(fullValue, fieldName);
                              setOpen(false);
                            }}
                            className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                          >
                            <Database className="mr-2 h-3.5 w-3.5 text-accent" />
                            <div className="flex flex-col">
                              <span className="font-semibold">{fieldLabel}</span>
                              <span className="text-[9px] text-muted-foreground">
                                {fieldName}{fieldType ? ` (${fieldType})` : ""}
                              </span>
                            </div>
                            {value === fullValue && <Check className="ml-auto h-3.5 w-3.5 text-accent" />}
                          </CommandItem>
                        );
                      })}
                    </>
                  )}
                  {(Array.isArray(selectedContext?.output_fields) && selectedContext.output_fields.length > 0
                    ? selectedContext.output_fields
                    : (() => {
                        const visible = flatFields.filter((field: any) => field?.showInOutputDefinition === true);
                        return visible.length > 0 ? visible : flatFields;
                      })()
                  ).map((field: any) => (
                    <CommandItem
                      key={field.name || field}
                      value={field.name || field}
                      onSelect={() => {
                        onSelect(field.name || field, field.name || field);
                        setOpen(false);
                      }}
                      className="text-xs cursor-pointer hover:bg-accent/5 transition-colors"
                    >
                      <Tag className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold">{field.label || field.name || field}</span>
                      {value === (field.name || field) && (
                        <Check className="ml-auto h-3.5 w-3.5 text-accent" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
