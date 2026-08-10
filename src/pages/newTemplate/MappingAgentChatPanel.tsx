import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, CheckCircle2, ArrowRight, Bot, User, Table2, Tag, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      text: "Hello! I am your AI Mapping & Table Loop Copilot. I analyze your reference document image and payload schema to automatically suggest field mappings and table loop configurations.",
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

      const response = await fetch('/api/ai/mapping-agent', {
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

      if (resData?.success && resData?.data) {
        const { reply, suggestedActions = [] } = resData.data;

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: reply || "Here are the suggested mappings and configurations:",
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
    <div className="flex flex-col h-[520px] bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-100 tracking-wide">AI Mapping Copilot</h3>
              <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                Gemini Flash
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Suggests fields & loops from desired layout</p>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/50 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleSend("Suggest field mappings and table loop for this template")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-all"
        >
          <Zap className="w-3 h-3 text-indigo-400" /> Auto-Map All
        </button>
        <button
          onClick={() => handleSend("How should I loop the line items table?")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-all"
        >
          <Table2 className="w-3 h-3 text-emerald-400" /> Table Loop
        </button>
        <button
          onClick={() => handleSend("Suggest mapping for the currently selected element")}
          disabled={loading}
          className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-all"
        >
          <Tag className="w-3 h-3 text-amber-400" /> Map Selected
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-body text-xs">
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
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs shadow-sm mt-0.5",
              msg.sender === "user"
                ? "bg-slate-700 text-slate-200"
                : "bg-gradient-to-br from-indigo-600 to-emerald-600 text-white"
            )}>
              {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            {/* Bubble */}
            <div className={cn(
              "max-w-[85%] rounded-2xl p-3 space-y-2 border shadow-sm",
              msg.sender === "user"
                ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-none"
                : "bg-slate-850/90 text-slate-200 border-slate-800/90 rounded-tl-none"
            )}>
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Action Cards */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="pt-2 space-y-2 border-t border-slate-700/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Suggested Actions ({msg.actions.length})
                    </span>
                    {msg.actions.some(a => !a.applied) && (
                      <button
                        onClick={() => handleApplyAll(msg.id, msg.actions!)}
                        className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm transition-all"
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
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                            : "bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-600"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {action.actionType === "MAP_FIELD" ? (
                              <Tag className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <Table2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span className="font-bold text-slate-100">
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
                                ? "bg-emerald-500/20 text-emerald-400 cursor-default border border-emerald-500/30"
                                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
                            )}
                          >
                            {action.applied ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Applied
                              </>
                            ) : (
                              <>
                                Apply <ArrowRight className="w-2.5 h-2.5" />
                              </>
                            )}
                          </button>
                        </div>

                        <p className="text-slate-400 leading-snug">{action.explanation}</p>

                        {action.targetTextSnippet && (
                          <div className="font-mono text-[9px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                            Target: "{action.targetTextSnippet}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[9px] text-slate-400 text-right opacity-80 pt-1">
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-semibold bg-slate-850/80 p-2.5 rounded-xl border border-slate-800 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            Gemini AI Copilot is analyzing payload & design layout...
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
        className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI Copilot for mapping suggestions..."
          disabled={loading}
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-body transition-all"
        />
        <Button
          type="submit"
          disabled={!input.trim() || loading}
          size="sm"
          className="h-8 px-3 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 shadow-md shadow-indigo-600/20 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
}
