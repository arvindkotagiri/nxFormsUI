import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const DEFAULT_CONDITION = {
    field: "",
    operator: "==",
    value: "",
    then: { targetField: "", value: "" },
};

export interface IfElseCondition {
    field: string;
    operator: string;
    value: string;
    then: { targetField: string; value: string };
}

interface ContentProps {
    contextFields: { name: string; path?: string }[];
    targetFields: { name: string; path?: string }[];
    conditions: IfElseCondition[];
    onConditionsChange: (conditions: IfElseCondition[]) => void;
    className?: string;
}

export function IfElseBuilderContent({
    contextFields,
    targetFields,
    conditions,
    onConditionsChange,
    className,
}: ContentProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [codeMode, setCodeMode] = useState(false);
    const [code, setCode] = useState("");

    const generateCode = (conds: IfElseCondition[]) =>
        conds
            .map((c, index) => {
                const keyword = index === 0 ? "if" : "else if";
                return `${keyword} (${c.field} ${c.operator} "${c.value}") {
  ${c.then.targetField} = "${c.then.value}"
}`;
            })
            .join("\n\n");

    const parseCode = (raw: string) => {
        const regex =
            /(if|else if)\s*\((.*?)\s*(==|!=|>|<)\s*"(.*?)"\)\s*{\s*(.*?)\s*=\s*"(.*?)"/g;
        const newConditions: IfElseCondition[] = [];
        let match;
        while ((match = regex.exec(raw))) {
            newConditions.push({
                field: match[2].trim(),
                operator: match[3],
                value: match[4],
                then: { targetField: match[5].trim(), value: match[6] },
            });
        }
        if (newConditions.length) onConditionsChange(newConditions);
    };

    const updateCondition = (index: number, key: string, value: string) => {
        const updated = [...conditions];
        updated[index] = { ...updated[index], [key]: value };
        onConditionsChange(updated);
    };

    const updateThen = (index: number, key: string, value: string) => {
        const updated = [...conditions];
        updated[index] = {
            ...updated[index],
            then: { ...updated[index].then, [key]: value },
        };
        onConditionsChange(updated);
    };

    const addCondition = () => {
        onConditionsChange([...conditions, { ...DEFAULT_CONDITION }]);
    };

    const removeCondition = (index: number) => {
        const updated = conditions.filter((_, i) => i !== index);
        onConditionsChange(updated);
        if (activeIndex >= updated.length && updated.length > 0)
            setActiveIndex(updated.length - 1);
    };

    const toggleMode = () => {
        if (!codeMode) setCode(generateCode(conditions));
        else parseCode(code);
        setCodeMode(!codeMode);
    };

    return (
        <div className={className ?? "flex flex-col flex-1 min-h-0 gap-3"}>
            <div className="flex items-center justify-end shrink-0">
                <Button variant="outline" size="sm" onClick={toggleMode} className="text-xs h-7">
                    {codeMode ? "Build Mode" : "Code Mode"}
                </Button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
                {codeMode ? (
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full h-full rounded-lg border border-border bg-card p-4 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-accent/30"
                        placeholder="Write your if-else conditions here..."
                    />
                ) : (
                    <div className="grid h-full grid-cols-[180px_minmax(0,1fr)_180px] gap-3 min-h-[280px]">
                        <div className="border border-border rounded-lg bg-muted/30 p-2 overflow-y-auto custom-scrollbar">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 sticky top-0 bg-muted/30">
                                Context Fields
                            </p>
                            <div className="space-y-0.5">
                                {contextFields.map((field, index) => (
                                    <button
                                        key={field.path ?? `${field.name}-${index}`}
                                        type="button"
                                        onClick={() =>
                                            updateCondition(activeIndex, "field", field.name)
                                        }
                                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent/10"
                                    >
                                        {field.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                            {conditions.map((cond, index) => (
                                <div
                                    key={index}
                                    onClick={() => setActiveIndex(index)}
                                    className={`border rounded-lg p-3 space-y-3 transition-all cursor-pointer ${
                                        activeIndex === index
                                            ? "ring-2 ring-accent border-accent"
                                            : "border-border bg-card"
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold uppercase text-muted-foreground">
                                            {index === 0 ? "IF" : "ELSE IF"}
                                        </span>
                                        {conditions.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeCondition(index);
                                                }}
                                                className="text-[10px] text-destructive hover:underline"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                            Condition
                                        </label>
                                        <div className="grid grid-cols-[1fr_72px_1fr] gap-2">
                                            <input
                                                value={cond.field}
                                                placeholder="context field"
                                                onChange={(e) =>
                                                    updateCondition(index, "field", e.target.value)
                                                }
                                                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-card"
                                            />
                                            <select
                                                value={cond.operator}
                                                onChange={(e) =>
                                                    updateCondition(index, "operator", e.target.value)
                                                }
                                                className="border border-border rounded-lg px-1 py-1.5 text-xs bg-card"
                                            >
                                                <option value="==">==</option>
                                                <option value="!=">!=</option>
                                                <option value=">">{">"}</option>
                                                <option value="<">{"<"}</option>
                                            </select>
                                            <input
                                                value={cond.value}
                                                placeholder="value"
                                                onChange={(e) =>
                                                    updateCondition(index, "value", e.target.value)
                                                }
                                                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-card"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 border-t border-border pt-2">
                                        <label className="text-[10px] font-bold uppercase text-muted-foreground">
                                            Then
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                value={cond.then?.targetField ?? ""}
                                                placeholder="target field"
                                                onChange={(e) =>
                                                    updateThen(index, "targetField", e.target.value)
                                                }
                                                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-card"
                                            />
                                            <input
                                                value={cond.then?.value ?? ""}
                                                placeholder="value"
                                                onChange={(e) =>
                                                    updateThen(index, "value", e.target.value)
                                                }
                                                className="border border-border rounded-lg px-2 py-1.5 text-xs bg-card"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <Button
                                variant="outline"
                                onClick={addCondition}
                                className="w-full text-xs h-8"
                            >
                                + Add Condition
                            </Button>
                        </div>

                        <div className="border border-border rounded-lg bg-muted/30 p-2 overflow-y-auto custom-scrollbar">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 sticky top-0 bg-muted/30">
                                Target Fields
                            </p>
                            <div className="space-y-0.5">
                                {targetFields.map((field, index) => (
                                    <button
                                        key={field.path ?? `${field.name}-${index}`}
                                        type="button"
                                        onClick={() =>
                                            updateThen(activeIndex, "targetField", field.name)
                                        }
                                        className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent/10"
                                    >
                                        {field.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface DialogProps {
    open: boolean;
    onClose: () => void;
    contextFields: { name: string; path?: string }[];
    targetFields: { name: string; path?: string }[];
    existingConditions?: IfElseCondition[] | null;
    onSave: (data: { type: string; conditions: IfElseCondition[] }) => void;
}

export function IfElseBuilder({
    open,
    onClose,
    contextFields,
    targetFields,
    existingConditions,
    onSave,
}: DialogProps) {
    const [conditions, setConditions] = useState<IfElseCondition[]>([DEFAULT_CONDITION]);

    useEffect(() => {
        if (!open) return;
        if (existingConditions?.length) {
            setConditions(existingConditions);
        } else {
            setConditions([{ ...DEFAULT_CONDITION }]);
        }
    }, [open, existingConditions]);

    const handleClose = () => {
        setConditions([{ ...DEFAULT_CONDITION }]);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between border-b pb-3 pr-10 shrink-0">
                    <div className="text-sm font-semibold tracking-wide">IF ELSE Builder</div>
                </div>

                <IfElseBuilderContent
                    contextFields={contextFields}
                    targetFields={targetFields}
                    conditions={conditions}
                    onConditionsChange={setConditions}
                    className="flex flex-col flex-1 min-h-0 gap-3"
                />

                <div className="flex justify-end gap-2 border-t pt-4 shrink-0">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onSave({ type: "IF_ELSE", conditions });
                            handleClose();
                        }}
                    >
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
