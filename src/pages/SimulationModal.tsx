import { useState } from "react";
import { bootstrapTokenIfMissing } from "@/lib/api";

const API_URL = import.meta.env.VITE_NODE_API;
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 20;

type Props = {
    open: boolean;
    onClose: () => void;
    form: string;
    context: string;
};

const MOCK_OPTIONS: Record<string, { label: string; entityKey: string; data: Record<string, string> }[]> = {
    cheques: [
        {
            label: "Cheque #1042",
            entityKey: "CHQ-1042",
            data: {
                "Amount In Numbers": "500",
                "Check Date": "04/10/2026",
                "Recipient Name": "John Smith",
                "Check Number": "1042",
                "Amount In Words": "Five Hundred Dollars",
                "Vendor Address 1": "123 Main St, Chicago IL",
            },
        },
        {
            label: "Cheque #2087",
            entityKey: "CHQ-2087",
            data: {
                "Amount In Numbers": "1200",
                "Check Date": "04/12/2026",
                "Recipient Name": "Acme Corp",
                "Check Number": "2087",
                "Amount In Words": "One Thousand Two Hundred Dollars",
                "Vendor Address 1": "456 Oak Ave, New York NY",
            },
        },
        {
            label: "Cheque #3310",
            entityKey: "CHQ-3310",
            data: {
                "Amount In Numbers": "75",
                "Check Date": "04/15/2026",
                "Recipient Name": "Sara Lee",
                "Check Number": "3310",
                "Amount In Words": "Seventy Five Dollars",
                "Vendor Address 1": "789 Pine Rd, Austin TX",
            },
        },
    ],
    statements: [
        {
            label: "Statement 10",
            entityKey: "STMT-10",
            data: {
                "Statement Number": "10",
                "Statement Date": "03/31/2026",
                "Account Holder": "Robert Brown",
                "Opening Balance": "2000.00",
                "Closing Balance": "3500.00",
                "Account Number": "ACC-00910",
            },
        },
        {
            label: "Statement 20",
            entityKey: "STMT-20",
            data: {
                "Statement Number": "20",
                "Statement Date": "03/31/2026",
                "Account Holder": "Emily Davis",
                "Opening Balance": "8500.00",
                "Closing Balance": "9200.00",
                "Account Number": "ACC-00920",
            },
        },
        {
            label: "Statement 30",
            entityKey: "STMT-30",
            data: {
                "Statement Number": "30",
                "Statement Date": "03/31/2026",
                "Account Holder": "Michael Chen",
                "Opening Balance": "500.00",
                "Closing Balance": "1100.00",
                "Account Number": "ACC-00930",
            },
        },
    ],
};

const FALLBACK_OPTIONS = [
    { label: "Sample Record 001", entityKey: "REC-001", data: { "Field 1": "Value A", "Field 2": "Value B" } },
    { label: "Sample Record 002", entityKey: "REC-002", data: { "Field 1": "Value C", "Field 2": "Value D" } },
    { label: "Sample Record 003", entityKey: "REC-003", data: { "Field 1": "Value E", "Field 2": "Value F" } },
];

// Update the type
type OutputRecord = {
    output_id: string;
    status: string;
    format: string;
    document_json: Record<string, string> | null;
    rendered_output: string | null;        // ✅ added
    error_message: string | null;
    completed_at: string | null;
};

type PollResult = {
    event_id: string;
    event_status: string;
    event_error: string | null;
    outputs: OutputRecord[];
};

type SimStatus = "idle" | "triggering" | "polling" | "done" | "error";

export default function SimulationModal({ open, onClose, form, context }: Props) {
    const options = MOCK_OPTIONS[context] ?? FALLBACK_OPTIONS;

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [simStatus, setSimStatus] = useState<SimStatus>("idle");
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [pollResult, setPollResult] = useState<PollResult | null>(null);

    if (!open) return null;

    const selectedOption = selectedIndex !== null ? options[selectedIndex] : null;
    const isRunning = simStatus === "triggering" || simStatus === "polling";

    const pollForOutput = async (eventId: string, token: string) => {
        setSimStatus("polling");

        for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
            setStatusMessage(`Waiting for output... (${attempt}/${POLL_MAX_ATTEMPTS})`);

            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

            try {
                const res = await fetch(`${API_URL}/events/${eventId}/output`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) continue;

                const data: PollResult = await res.json();

                // Terminal states
                if (data.event_status === "Failed") {
                    setPollResult(data);
                    setSimStatus("error");
                    setStatusMessage("Event failed.");
                    return;
                }

                if (
                    data.event_status === "Success" &&
                    data.outputs.length > 0 &&
                    data.outputs.every((o) => o.status === "Success" || o.status === "Failed")
                ) {
                    setPollResult(data);
                    setSimStatus("done");
                    setStatusMessage("Simulation complete.");
                    return;
                }
            } catch {
                // transient error, keep polling
            }
        }

        setSimStatus("error");
        setStatusMessage("Timed out waiting for output.");
    };

    const triggerSimulation = async () => {
        if (!selectedOption) return;

        setSimStatus("triggering");
        setStatusMessage("Triggering simulation...");
        setPollResult(null);

        await bootstrapTokenIfMissing();

        try {
            const token = localStorage.getItem("access_token") ?? "";

            const payload = {
                context,
                entity_key: selectedOption.entityKey,
                event_type: "Created",
                triggered_by: "demo_user",
                source_system: "S4HANA",
                print_to_file: 'true',
            };

            const res = await fetch(`${API_URL}/events/trigger`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();

            if (!res.ok || !json.event_id) {
                setSimStatus("error");
                setStatusMessage(json.error ?? "Failed to trigger simulation.");
                return;
            }

            await pollForOutput(json.event_id, token);
        } catch (e) {
            console.error(e);
            setSimStatus("error");
            setStatusMessage("Unexpected error occurred.");
        }
    };

    const reset = () => {
        setSimStatus("idle");
        setStatusMessage("");
        setPollResult(null);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl w-[900px] max-h-[90vh] overflow-auto p-6 space-y-5">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Simulate Template</h2>
                    <button
                        onClick={()=> {setSelectedIndex(null);reset(); onClose();}}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        Close
                    </button>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg px-4 py-3 space-y-1">
                        <p className="uppercase tracking-wide text-[10px] font-semibold text-muted-foreground">Form</p>
                        <p className="text-foreground font-medium text-sm">{form}</p>
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-3 space-y-1">
                        <p className="uppercase tracking-wide text-[10px] font-semibold text-muted-foreground">Context</p>
                        <p className="text-foreground font-medium text-sm">{context}</p>
                    </div>
                </div>

                {/* Record selector */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Select Record
                    </label>
                    <select
                        value={selectedIndex ?? ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            setSelectedIndex(val === "" ? null : Number(val));

                            setSimStatus("idle");
    setStatusMessage("");
    setPollResult(null);

                        }}
                        disabled={isRunning}
                        className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground disabled:opacity-50"
                    >
                        <option value="">— Select a record —</option>
                        {options.map((opt, i) => (
                            <option key={opt.entityKey} value={i}>
                                {opt.label} ({opt.entityKey})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Payload preview */}
                {selectedOption && simStatus === "idle" && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Payload Preview
                        </label>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                            {JSON.stringify(
                                {
                                    context,
                                    entity_key: selectedOption.entityKey,
                                    event_type: "Created",
                                    triggered_by: "demo_user",
                                    source_system: "S4HANA",
                                    Print_to_file: 'true',
                                },
                                null,
                                2,
                            )}
                        </pre>
                    </div>
                )}

                {/* Status indicator */}
                {simStatus !== "idle" && (
                    <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg ${simStatus === "done"
                            ? "bg-green-500/10 text-green-600"
                            : simStatus === "error"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-muted text-muted-foreground"
                        }`}>
                        {isRunning && (
                            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                        )}
                        <span>{statusMessage}</span>
                    </div>
                )}

                {/* Results */}
                {pollResult && simStatus === "done" && (
                    <div className="space-y-4">
                        {pollResult.outputs.map((output) => (
                            <div key={output.output_id} className="space-y-2">

                                {/* Output header */}
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Output — {output.format}
                                    </label>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${output.status === "Success"
                                            ? "bg-green-500/15 text-green-600"
                                            : "bg-red-500/15 text-red-500"
                                        }`}>
                                        {output.status}
                                    </span>
                                </div>

                                {output.status === "Success" && output.rendered_output && (
                                    <>
                                        {/* HTML format — render inline in an iframe */}
                                        {output.format === "HTML" && (
                                            <div className="rounded-lg overflow-hidden border">
                                                <iframe
                                                    srcDoc={output.rendered_output}
                                                    className="w-full h-[500px] bg-white"
                                                    sandbox="allow-same-origin"
                                                    title={`Preview ${output.output_id}`}
                                                />
                                            </div>
                                        )}

                                        {/* ZPL format — show raw code */}
                                        {output.format === "ZPL" && (
                                            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap break-all">
                                                {output.rendered_output}
                                            </pre>
                                        )}
                                    </>
                                )}

                                {/* Fallback: show document_json if rendered_output not available yet */}
                                {output.status === "Success" && !output.rendered_output && output.document_json && (
                                    <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                                        {JSON.stringify(output.document_json, null, 2)}
                                    </pre>
                                )}

                                {output.status === "Failed" && output.error_message && (
                                    <p className="text-xs text-red-500 bg-red-500/10 px-4 py-3 rounded-lg">
                                        {output.error_message}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Event-level error */}
                {pollResult && simStatus === "error" && pollResult.event_error && (
                    <p className="text-xs text-red-500 bg-red-500/10 px-4 py-3 rounded-lg">
                        {pollResult.event_error}
                    </p>
                )}

                {/* Trigger button */}
                <button
                    onClick={triggerSimulation}
                    disabled={isRunning || !selectedOption}
                    className="px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: "hsl(var(--accent))", color: "white" }}
                >
                    {isRunning ? "Running..." : simStatus === "done" ? "Run Again" : "Trigger Simulation"}
                </button>

            </div>
        </div>
    );
}