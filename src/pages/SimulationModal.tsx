import { useState } from "react";
import { bootstrapTokenIfMissing } from "@/lib/api";
import { useCustomFonts } from "@/hooks/useCustomFonts";

const API_URL = import.meta.env.VITE_NODE_API;
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 20;

type Props = {
    open: boolean;
    onClose: () => void;
    /** Form / template display name */
    formName: string;
    /** Form / template id when available */
    formId?: string;
    context: string;
};

type SimulationTriggerPayload = {
    form_name: string;
    form_id?: string;
    context: string;
    simulate: true;
    entity_key: string;
    event_type: string;
    triggered_by: string;
    source_system: string;
    print_to_file: string;
};

function buildSimulationTriggerPayload(
    formName: string,
    formId: string | undefined,
    context: string,
    entityKey: string,
): SimulationTriggerPayload {
    return {
        form_name: formName,
        ...(formId ? { form_id: formId } : {}),
        context,
        simulate: true,
        entity_key: entityKey,
        event_type: "Created",
        triggered_by: "sim_user",
        source_system: "S4HANA",
        print_to_file: "true",
    };
}

// Update the type
type OutputRecord = {
    output_id: string;
    status: string;
    format: string;
    document_json: Record<string, string> | null;
    rendered_output: string | null;
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

type SimulationOption = {
    label: string;
    entityKey: string;
    data: Record<string, string>;
};

export default function SimulationModal({ open, onClose, formName, formId, context }: Props) {
    const { cssString } = useCustomFonts();
    const [options, setOptions] = useState<SimulationOption[]>([]);
    const [optionsLoading, setOptionsLoading] = useState(false);
    const [optionsError, setOptionsError] = useState<string | null>(null);

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [simStatus, setSimStatus] = useState<SimStatus>("idle");
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [pollResult, setPollResult] = useState<PollResult | null>(null);

    // Fetch simulation records whenever the modal opens
    const fetchOptions = async () => {
        setOptionsLoading(true);
        setOptionsError(null);
        try {
            await bootstrapTokenIfMissing();
            const token = localStorage.getItem("access_token") ?? "";
            const res = await fetch(`${API_URL}/simulation`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("Failed to fetch simulation records");
            const data: {
                id: string;
                simulationName: string;
                context: string;
                form: string;
                inputValues: Record<string, string>;
            }[] = await res.json();

            const filtered = data
                .filter(
                    (r) =>
                        r.context?.toLowerCase() === context?.toLowerCase() &&
                        r.form?.toLowerCase() === formName?.toLowerCase()
                )
                .map((r) => ({
                    label: r.simulationName,
                    entityKey: r.id,
                    data: r.inputValues ?? {},
                }));

            setOptions(filtered);
        } catch (e) {
            console.error(e);
            setOptionsError("Could not load simulation records.");
        } finally {
            setOptionsLoading(false);
        }
    };

    // Open/close effect — fetch when opening
    const prevOpen = useState(open)[0];
    if (open && open !== prevOpen) {
        // handled below via useEffect equivalent — but since this is a modal
        // we trigger fetch imperatively on first render when open
    }

    // Use a ref-like pattern: fetch on open
    const [hasFetched, setHasFetched] = useState(false);
    if (open && !hasFetched) {
        setHasFetched(true);
        fetchOptions();
    }
    if (!open && hasFetched) {
        setHasFetched(false);
    }

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

            const payload = buildSimulationTriggerPayload(
                formName,
                formId,
                context,
                selectedOption.entityKey,
            );

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
                        onClick={() => { setSelectedIndex(null); reset(); onClose(); }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        Close
                    </button>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg px-4 py-3 space-y-1">
                        <p className="uppercase tracking-wide text-[10px] font-semibold text-muted-foreground">Form</p>
                        <p className="text-foreground font-medium text-sm">{formName}</p>
                        {formId && (
                            <p className="text-[11px] text-muted-foreground font-mono">{formId}</p>
                        )}
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

                    {optionsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2">
                            <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Loading records...</span>
                        </div>
                    ) : optionsError ? (
                        <div className="flex items-center justify-between text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
                            <span>{optionsError}</span>
                            <button
                                onClick={fetchOptions}
                                className="text-xs underline ml-2 hover:no-underline"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
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
                            <option value="">
                                {options.length === 0
                                    ? "— No records found for this context/form —"
                                    : "— Select a record —"}
                            </option>
                            {options.map((opt, i) => (
                                <option key={opt.entityKey} value={i}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Payload preview */}
                {selectedOption && simStatus === "idle" && (
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Payload Preview
                        </label>
                        <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                            {JSON.stringify(
                                buildSimulationTriggerPayload(
                                    formName,
                                    formId,
                                    context,
                                    selectedOption.entityKey,
                                ),
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
                                        {output.format === "HTML" && (
                                            <div className="rounded-lg overflow-hidden border">
                                                <iframe
                                                    srcDoc={(() => {
                                                        const html = output.rendered_output;
                                                        if (!html) return "";
                                                        const styleBlock = `<style>${cssString}</style>`;
                                                        if (html.includes("</head>")) {
                                                            return html.replace("</head>", `${styleBlock}</head>`);
                                                        }
                                                        return styleBlock + html;
                                                    })()}
                                                    className="w-full h-[500px] bg-white"
                                                    sandbox="allow-same-origin"
                                                    title={`Preview ${output.output_id}`}
                                                />
                                            </div>
                                        )}
                                        {output.format === "ZPL" && (
                                            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto whitespace-pre-wrap break-all">
                                                {output.rendered_output}
                                            </pre>
                                        )}
                                    </>
                                )}

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