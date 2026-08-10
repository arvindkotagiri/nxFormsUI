import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, CheckCircle2, ArrowRight, Bot, User, Table2, Tag, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";
import { toast } from "sonner";
import { TableLoopConfig } from "./TableLoopConfigPanel";

export interface SuggestedAction {
  id: string;
  actionType: "MAP_FIELD" | "CONFIGURE_TABLE_LOOP";
  targetSelector?: string;
  targetTextSnippet?: string;
  fieldPath?: string;
  displayLabel?: string;
  tableConfig?: TableLoopConfig;
  explanation: string;
  applied?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  actions?: SuggestedAction[];
  timestamp: string;
}

interface MappingAgentChatPanelProps {
  selectedContext: any;
  htmlContent: string;
  selectedElement: HTMLElement | null;
  referenceImageUrl?: string;
  onApplyMapping: (action: SuggestedAction) => void;
  onApplyTableLoop: (tableConfig: TableLoopConfig) => void;
  onApplyAllActions: (actions: SuggestedAction[]) => void;
}

export function MappingAgentChatPanel({
  selectedContext,
  htmlContent,
  selectedElement,
  referenceImageUrl,
  onApplyMapping,
  onApplyTableLoop,
  onApplyAllActions
}: MappingAgentChatPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-welcome",
      sender: "assistant",
      text: "Hello! I am your AI Mapping & Table Loop Copilot (powered by Gemini 3.5 Flash). I analyze your reference document image and payload schema to automatically suggest field mappings and table loop configurations.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const promptText = (customPrompt || input).trim();
    if (!promptText || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const selectedElementInfo = selectedElement ? {
        tagName: selectedElement.tagName,
        id: selectedElement.id,
        className: selectedElement.className,
        text: selectedElement.innerText || selectedElement.textContent,
        mapping: selectedElement.getAttribute('data-sap-mapping'),
        tableConfig: selectedElement.getAttribute('data-table-config')
      } : null;

      const chatHistory = messages.map(m => ({
        role: m.sender,
        content: m.text
      }));

      const response = await fetch(apiUrl('/api/ai/mapping-agent'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: promptText,
          payloadSchema: selectedContext,
          htmlContent,
          selectedElementInfo,
          imageData: referenceImageUrl,
          chatHistory
        })
      });

      const resData = await response.json();

      if (resData?.success) {
        // resData.data can be an object OR a JSON string (when LLM wraps its response)
        let agentData = resData.data;
        if (typeof agentData === 'string') {
          try { agentData = JSON.parse(agentData); } catch { /* leave as string */ }
        }

        // Extract reply and suggestedActions safely
        let reply: string = "Here are the suggested mappings and configurations:";
        let suggestedActions: any[] = [];

        if (agentData && typeof agentData === 'object') {
          // Standard case: { reply, suggestedActions }
          reply = agentData.reply || reply;
          suggestedActions = Array.isArray(agentData.suggestedActions) ? agentData.suggestedActions : [];
        } else if (typeof agentData === 'string') {
          reply = agentData;
        }

        // Guard: if reply is still a JSON-looking string, parse it one more level
        if (reply && reply.trim().startsWith('{')) {
          try {
            const inner = JSON.parse(reply);
            if (inner?.reply) {
              reply = inner.reply;
              if (Array.isArray(inner.suggestedActions) && inner.suggestedActions.length > 0) {
                suggestedActions = inner.suggestedActions;
              }
            }
          } catch { /* not JSON, keep as-is */ }
        }

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: reply,
          actions: suggestedActions.map((act: any, idx: number) => ({ ...act, id: act.id || `act-${idx}-${Date.now()}`, applied: false })),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, assistantMsg]);
      } else {
        toast.error("Failed to get AI suggestions");
      }
    } catch (err: any) {
      console.error("[MappingAgentChatPanel] AI Agent call error:", err);
      toast.error(err?.response?.data?.error || "Error connecting to AI Copilot");
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: "assistant",
          text: "Sorry, I encountered an error analyzing your request. Make sure your Gemini API key is configured.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAction = (msgId: string, actionId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.actions) return m;
      const updatedActions = m.actions.map(act => {
        if (act.id === actionId) {
          if (act.actionType === "MAP_FIELD") {
            onApplyMapping(act);
          } else if (act.actionType === "CONFIGURE_TABLE_LOOP" && act.tableConfig) {
            onApplyTableLoop(act.tableConfig);
          }
          return { ...act, applied: true };
        }
        return act;
      });
      return { ...m, actions: updatedActions };
    }));
  };

  const handleApplyAll = (msgId: string, actions: SuggestedAction[]) => {
    onApplyAllActions(actions);
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.actions) return m;
      return {
        ...m,
        actions: m.actions.map(act => ({ ...act, applied: true }))
      };
    }));
    toast.success("Applied all AI suggested mappings!");
  };

  return (
    <div className="flex flex-col h-[520px] bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-indigo-50/40 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm text-white">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 tracking-wide">AI Mapping Copilot</h3>
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Gemini 3.5 Flash
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Suggests fields & loops from desired layout</p>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50/80 border-b border-slate-200/80 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleSend("Suggest field mappings and table loop for this template")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-2xs"
        >
          <Zap className="w-3 h-3 text-emerald-600" /> Auto-Map All
        </button>
        <button
          onClick={() => handleSend("How should I loop the line items table?")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-indigo-700 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-2xs"
        >
          <Table2 className="w-3 h-3 text-indigo-600" /> Table Loop
        </button>
        <button
          onClick={() => handleSend("Suggest mapping for the currently selected element")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 text-amber-700 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all shadow-2xs"
        >
          <Tag className="w-3 h-3 text-amber-600" /> Map Selected
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-body text-xs bg-slate-50/50">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2 text-[11px] leading-relaxed",
              msg.sender === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs shadow-xs mt-0.5 font-bold",
              msg.sender === "user"
                ? "bg-slate-700 text-white"
                : "bg-gradient-to-br from-emerald-600 to-teal-700 text-white"
            )}>
              {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              "max-w-[85%] rounded-2xl p-3 space-y-2 border shadow-2xs",
              msg.sender === "user"
                ? "bg-emerald-600 text-white border-emerald-500 rounded-tr-none"
                : "bg-white text-slate-800 border-slate-200/90 rounded-tl-none"
            )}>
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Action Cards */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="pt-2 space-y-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Suggested Actions ({msg.actions.length})
                    </span>
                    {msg.actions.some(a => !a.applied) && (
                      <button
                        onClick={() => handleApplyAll(msg.id, msg.actions!)}
                        className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs transition-all"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Apply All
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {msg.actions.map(action => (
                      <div
                        key={action.id}
                        className={cn(
                          "p-2.5 rounded-xl border text-[10px] space-y-1.5 transition-all",
                          action.applied
                            ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {action.actionType === "MAP_FIELD" ? (
                              <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Table2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            )}
                            <span className="font-bold text-slate-800">
                              {action.actionType === "MAP_FIELD"
                                ? `Map to ${action.fieldPath}`
                                : `Loop table over '${action.tableConfig?.entitySetKey}'`}
                            </span>
                          </div>

                          <button
                            onClick={() => handleApplyAction(msg.id, action.id)}
                            disabled={action.applied}
                            className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shrink-0",
                              action.applied
                                ? "bg-emerald-100 text-emerald-800 cursor-default border border-emerald-300 font-extrabold"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                            )}
                          >
                            {action.applied ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Applied
                              </>
                            ) : (
                              <>
                                Apply <ArrowRight className="w-2.5 h-2.5" />
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-slate-600 leading-snug">{action.explanation}</p>

                        {action.targetTextSnippet && (
                          <div className="font-mono text-[9px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                            Target: "{action.targetTextSnippet}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={cn(
                "text-[9px] text-right opacity-80 pt-1 font-medium",
                msg.sender === "user" ? "text-emerald-100" : "text-slate-400"
              )}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-emerald-700 text-[10px] font-bold bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            Gemini 3.5 Flash AI Copilot is analyzing payload & design layout...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini AI Copilot for mapping suggestions..."
          disabled={loading}
          className="flex-1 bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-[11px] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-body transition-all"
        />
        <Button
          type="submit"
          disabled={!input.trim() || loading}
          size="sm"
          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-2xs disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
}
