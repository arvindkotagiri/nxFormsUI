import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useEffect } from "react";

interface Props {
    open: boolean;
    onClose: () => void;
    contextFields: any[];
    targetFields: any[];
    existingConditions?: any[] | null;
    onSave: (data: any) => void;
}

export function IfElseBuilder({
    open,
    onClose,
    contextFields,
    targetFields,
    existingConditions,
    onSave,
}: Props) {
    const [activeIndex, setActiveIndex] = useState(0);

    // const [conditions, setConditions] = useState<any[]>([
    //     {
    //         field: "",
    //         operator: "==",
    //         value: "",
    //         then: {
    //             targetField: "",
    //             value: "",
    //         },
    //     },
    // ]);

    const [codeMode, setCodeMode] = useState(false);
    const [code, setCode] = useState("");
    const [conditions, setConditions] = useState<any[]>([]);

    useEffect(() => {
        if (existingConditions && existingConditions.length) {
            setConditions(existingConditions);
        } else {
            setConditions([
                {
                    field: "",
                    operator: "==",
                    value: "",
                    then: { targetField: "", value: "" },
                },
            ]);
        }
    }, [existingConditions]);

    /* ----------------------- CODE GENERATOR ----------------------- */

    const generateCode = (conditions: any[]) => {
        return conditions
            .map((c, index) => {
                const keyword = index === 0 ? "if" : "else if";

                return `${keyword} (${c.field} ${c.operator} "${c.value}") {
  ${c.then.targetField} = "${c.then.value}"
}`;
            })
            .join("\n\n");
    };

    const parseCode = (code: string) => {
        const regex =
            /(if|else if)\s*\((.*?)\s*(==|!=|>|<)\s*"(.*?)"\)\s*{\s*(.*?)\s*=\s*"(.*?)"/g;

        const newConditions: any[] = [];
        let match;

        while ((match = regex.exec(code))) {
            newConditions.push({
                field: match[2].trim(),
                operator: match[3],
                value: match[4],
                then: {
                    targetField: match[5].trim(),
                    value: match[6],
                },
            });
        }

        if (newConditions.length) setConditions(newConditions);
    };

    /* ----------------------- HELPERS ----------------------- */

    const updateCondition = (index: number, key: string, value: any) => {
        const updated = [...conditions];
        updated[index] = { ...updated[index], [key]: value };
        setConditions(updated);
    };

    const updateThen = (index: number, key: string, value: any) => {
        const updated = [...conditions];
        updated[index] = {
            ...updated[index],
            then: { ...updated[index].then, [key]: value },
        };
        setConditions(updated);
    };

    const addCondition = () => {
        setConditions([
            ...conditions,
            {
                field: "",
                operator: "==",
                value: "",
                then: {
                    targetField: "",
                    value: "",
                },
            },
        ]);
    };

    const removeCondition = (index: number) => {
        const updated = conditions.filter((_, i) => i !== index);
        setConditions(updated);
        if (activeIndex >= updated.length && updated.length > 0)
            setActiveIndex(updated.length - 1);
    };

    const toggleMode = () => {
        if (!codeMode) setCode(generateCode(conditions));
        else parseCode(code);
        setCodeMode(!codeMode);
    };

    const handleClose = () => {
        setConditions([
            {
                field: "",
                operator: "==",
                value: "",
                then: {
                    targetField: "",
                    value: "",
                },
            },
        ]);
        setCode("");
        setCodeMode(false);
        setActiveIndex(0);
        onClose();
    };

    /* ----------------------- UI ----------------------- */

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-7xl h-[90vh] flex flex-col gap-4 p-6">
                {/* HEADER */}
                <div className="flex items-center justify-between border-b pb-3 pr-10">
                    <div className="text-sm font-semibold tracking-wide">
                        IF ELSE Builder
                    </div>

                    <Button variant="outline" size="sm" onClick={toggleMode}>
                        {codeMode ? "Build Mode" : "Code Mode"}
                    </Button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-hidden">
                    {codeMode ? (
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full h-full rounded-md border bg-background p-4 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Write your if-else conditions here..."
                        />
                    ) : (
                        <div className="grid h-full grid-cols-[220px_minmax(0,1fr)_220px] gap-4">
                            {/* LEFT PANEL */}
                            <div className="border rounded-md bg-muted p-3 overflow-y-auto">
                                <p className="text-xs font-semibold text-muted-foreground mb-3 sticky top-0 bg-muted">
                                    Context Fields
                                </p>

                                <div className="space-y-1">
                                    {contextFields.map((field) => (
                                        <button
                                            key={field.path}
                                            onClick={() =>
                                                updateCondition(activeIndex, "field", field.name)
                                            }
                                            className="w-full text-left text-xs px-3 py-2 rounded hover:bg-accent"
                                        >
                                            {field.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* CENTER PANEL */}
                            <div className="overflow-y-auto space-y-4 pr-1">
                                {conditions.map((cond, index) => (
                                    <div
                                        key={index}
                                        onClick={() => setActiveIndex(index)}
                                        className={`border rounded-md p-4 space-y-4 transition-all cursor-pointer ${activeIndex === index
                                                ? "ring-primary border-primary"
                                                : "bg-background"
                                            }`}
                                    >
                                        {/* CARD HEADER */}
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-muted-foreground">
                                                {index === 0 ? "IF" : "ELSE IF"}
                                            </span>

                                            {conditions.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeCondition(index);
                                                    }}
                                                    className="text-xs text-destructive hover:underline"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>

                                        {/* CONDITION */}
                                        <div className="space-y-2">
                                            <label className="text-xs text-muted-foreground">
                                                Condition
                                            </label>

                                            <div className="grid grid-cols-[1fr_90px_1fr] gap-2">
                                                <input
                                                    value={cond.field}
                                                    placeholder="context field"
                                                    onChange={(e) =>
                                                        updateCondition(index, "field", e.target.value)
                                                    }
                                                    className="border rounded-md px-3 py-2 text-xs"
                                                />

                                                <select
                                                    value={cond.operator}
                                                    onChange={(e) =>
                                                        updateCondition(index, "operator", e.target.value)
                                                    }
                                                    className="border rounded-md px-2 py-2 text-xs"
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
                                                    className="border rounded-md px-3 py-2 text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* THEN */}
                                        <div className="space-y-2 border-t pt-3">
                                            <label className="text-xs text-muted-foreground">
                                                Then
                                            </label>

                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={cond.then?.targetField ?? ""}
                                                    placeholder="target field"
                                                    onChange={(e) =>
                                                        updateThen(index, "targetField", e.target.value)
                                                    }
                                                    className="border rounded-md px-3 py-2 text-xs"
                                                />

                                                <input
                                                    value={cond.then?.value ?? ""}
                                                    placeholder="value"
                                                    onChange={(e) =>
                                                        updateThen(index, "value", e.target.value)
                                                    }
                                                    className="border rounded-md px-3 py-2 text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    onClick={addCondition}
                                    className="w-full text-xs"
                                >
                                    + Add Condition
                                </Button>
                            </div>

                            {/* RIGHT PANEL */}
                            <div className="border rounded-md bg-muted p-3 overflow-y-auto">
                                <p className="text-xs font-semibold text-muted-foreground mb-3 sticky top-0 bg-muted">
                                    Target Fields
                                </p>

                                <div className="space-y-1">
                                    {targetFields.map((field) => (
                                        <button
                                            key={field.path}
                                            onClick={() =>
                                                updateThen(activeIndex, "targetField", field.name)
                                            }
                                            className="w-full text-left text-xs px-3 py-2 rounded hover:bg-accent"
                                        >
                                            {field.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" onClick={handleClose}>
                        Cancel
                    </Button>

                    <Button
                        onClick={() => {
                            onSave({
                                type: "IF_ELSE",
                                conditions,
                            });
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
