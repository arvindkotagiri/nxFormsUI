import { bootstrapTokenIfMissing } from "@/lib/api";
import { useState } from "react";
const API_URL = import.meta.env.VITE_NODE_API;

type Row = {
    id: string;
    key: string;
    value: string;
};

export function SimulationPage() {
    const [rows, setRows] = useState<Row[]>([
        { id: crypto.randomUUID(), key: "", value: "" },
    ]);

    const [formName, setFormName] = useState("");
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const addRow = () => {
        setRows((r) => [...r, { id: crypto.randomUUID(), key: "", value: "" }]);
    };

    const deleteRow = (id: string) => {
        setRows((r) => r.filter((x) => x.id !== id));
    };

    const updateRow = (id: string, field: "key" | "value", val: string) => {
        setRows((r) =>
            r.map((row) => (row.id === id ? { ...row, [field]: val } : row)),
        );
    };

    const buildJson = () => {
        const obj: Record<string, string> = {};

        rows.forEach((r) => {
            if (r.key.trim()) {
                obj[r.key] = r.value;
            }
        });

        return obj;
    };

    const triggerSimulation = async () => {
        setLoading(true);
        await bootstrapTokenIfMissing();
        try {
            const token = localStorage.getItem("access_token");
            const payload = {
                context: "Cheques",
                entity_key: "INV-2001",
                event_type: "Created",
                triggered_by: "demo_user",
                source_system: "S4HANA",
                form: formName,
                data: buildJson(),
            };

            //   const res = await fetch("http://localhost:4000/api/events/trigger", {
            const res = await fetch(`${API_URL}/events/trigger`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            setResult(json);
        } catch (e) {
            console.error(e);
        }

        setLoading(false);
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl font-semibold text-foreground">
                    Simulation
                </h1>
                <p className="text-sm text-muted-foreground font-body mt-1">
                    Simulate incoming payload and test transformation
                </p>
            </div>

            <div className="card-elevated p-6 space-y-4">
                <h2 className="font-display text-sm font-semibold text-foreground">
                    Simulation Settings
                </h2>

                <div>
                    <label className="text-xs font-semibold text-muted-foreground font-body">
                        Form
                    </label>

                    <input
                        placeholder="Enter form name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                </div>
            </div>
            {/* Card */}
            <div className="card-elevated p-6 space-y-4">
                <h2 className="font-display text-sm font-semibold text-foreground">
                    Input Values
                </h2>

                <div className="space-y-3">
                    {rows.map((row, index) => (
                        <div key={row.id} className="grid grid-cols-5 gap-3">
                            {/* Key */}
                            <input
                                placeholder="Input Field"
                                value={row.key}
                                onChange={(e) => updateRow(row.id, "key", e.target.value)}
                                className="col-span-2 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />

                            {/* Value */}
                            <input
                                placeholder="Input Value"
                                value={row.value}
                                onChange={(e) => updateRow(row.id, "value", e.target.value)}
                                className="col-span-2 px-3 py-2 text-sm rounded-lg border border-border bg-card font-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />

                            {/* Delete */}
                            {index !== 0 && (
                                <button
                                    onClick={() => deleteRow(row.id)}
                                    className="text-xs text-red-500 hover:text-red-700"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Row */}
                <button
                    onClick={addRow}
                    className="px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition"
                >
                    + Add Row
                </button>
            </div>

            {/* JSON Preview */}
            <div className="card-elevated p-6 space-y-3">
                <h2 className="font-display text-sm font-semibold text-foreground">
                    Generated JSON
                </h2>

                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                    {JSON.stringify(buildJson(), null, 2)}
                </pre>
            </div>

            {/* Trigger */}
            <div className="flex gap-3">
                <button
                    onClick={triggerSimulation}
                    disabled={loading}
                    className="px-5 py-2 rounded-lg text-sm font-semibold font-body transition-all"
                    style={{ background: "hsl(var(--accent))", color: "white" }}
                >
                    {loading ? "Triggering..." : "Trigger Event"}
                </button>
            </div>

            {/* Result */}
            {result && (
                <div className="card-elevated p-6 space-y-3">
                    <h2 className="font-display text-sm font-semibold text-foreground">
                        API Response
                    </h2>

                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
