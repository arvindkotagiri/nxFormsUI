import { useState, useEffect } from "react";
import { 
  Activity, 
  Coins, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Terminal,
  Cpu
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Trace {
  id: number;
  trace_id: string;
  agent_name: string;
  model_used: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  duration_ms: number;
  status: 'SUCCESS' | 'FAILED';
  prompt: string;
  response: string;
  ts: string;
}

const nodeAPI = import.meta.env.VITE_NODE_API || "http://localhost:4000";

export default function Observability() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchTraces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${nodeAPI}/api/observability/traces`);
      if (res.ok) {
        const data = await res.json();
        setTraces(data);
      } else {
        toast.error("Failed to fetch LLM traces");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading traces");
    } finally {
      setLoading(false);
    }
  };

  const clearTraces = async () => {
    if (!confirm("Are you sure you want to clear all LLM traces?")) return;
    try {
      const res = await fetch(`${nodeAPI}/api/observability/traces`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("Observability traces cleared");
        setTraces([]);
      } else {
        toast.error("Failed to clear traces");
      }
    } catch (err) {
      toast.error("Network error while clearing traces");
    }
  };

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 10000); // Auto refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Compute stats
  const totalCalls = traces.length;
  const successCalls = traces.filter(t => t.status === "SUCCESS").length;
  const successRate = totalCalls > 0 ? Math.round((successCalls / totalCalls) * 100) : 100;
  const totalTokens = traces.reduce((acc, t) => acc + (t.total_tokens || 0), 0);
  const avgLatency = totalCalls > 0 ? Math.round(traces.reduce((acc, t) => acc + t.duration_ms, 0) / totalCalls) : 0;

  // Filter traces
  const filteredTraces = traces.filter(t => {
    const term = searchQuery.toLowerCase();
    return (
      t.agent_name.toLowerCase().includes(term) ||
      t.model_used.toLowerCase().includes(term) ||
      t.trace_id.toLowerCase().includes(term) ||
      t.prompt.toLowerCase().includes(term) ||
      t.response.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-widest mb-1.5">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            Observability Platform
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">AI Agent Tracing & Metrics</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time observability of LangChain models, token usages, and LangGraph traces.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchTraces}
            disabled={loading}
            className="h-9 px-3 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button 
            variant="destructive"
            size="sm"
            onClick={clearTraces}
            disabled={traces.length === 0}
            className="h-9 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Traces
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Calls */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Requests</div>
            <div className="text-2xl font-black text-slate-800">{totalCalls}</div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${successRate > 90 ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Success Rate</div>
            <div className="text-2xl font-black text-slate-800">{successRate}%</div>
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tokens</div>
            <div className="text-2xl font-black text-slate-800">{totalTokens.toLocaleString()}</div>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Latency</div>
            <div className="text-2xl font-black text-slate-800">{(avgLatency / 1000).toFixed(2)}s</div>
          </div>
        </div>
      </div>

      {/* Traces Table Section */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header Filter */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search traces by agent name, model, prompt contents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Showing {filteredTraces.length} of {traces.length} Traces
          </div>
        </div>

        {/* Traces List */}
        {filteredTraces.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredTraces.map((trace) => {
              const isExpanded = expandedId === trace.id;
              return (
                <div 
                  key={trace.id} 
                  className={`transition-all duration-200 ${isExpanded ? 'bg-slate-50/30' : 'hover:bg-slate-50/10'}`}
                >
                  {/* Row Summary */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : trace.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${trace.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate uppercase tracking-wide">{trace.agent_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{trace.trace_id} • {trace.ts}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-[11px] font-semibold text-slate-600">
                      {/* Model Badge */}
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[9px] font-mono whitespace-nowrap">
                        {trace.model_used}
                      </span>

                      {/* Tokens Badge */}
                      <span className="flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-slate-400" />
                        {trace.total_tokens}
                      </span>

                      {/* Latency Badge */}
                      <span className="flex items-center gap-1 w-16 justify-end">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {(trace.duration_ms / 1000).toFixed(2)}s
                      </span>

                      {/* Expand Toggle */}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-1 space-y-4 border-t border-slate-100/50 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Prompt Trace */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                            <Terminal className="w-3 h-3 text-slate-400" />
                            Prompt (Sample Context)
                          </div>
                          <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[11px] font-mono overflow-auto max-h-60 leading-relaxed shadow-inner border border-slate-800">
                            {trace.prompt}
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium">Input Tokens: {trace.prompt_tokens}</div>
                        </div>

                        {/* Response Trace */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            LLM Model Output Response
                          </div>
                          <div className={`p-3.5 rounded-xl text-[11px] font-mono overflow-auto max-h-60 leading-relaxed shadow-inner border ${trace.status === 'SUCCESS' ? 'bg-emerald-950/10 text-emerald-900 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                            {trace.response}
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium">Output Tokens: {trace.completion_tokens}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <Activity className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">No Traces Logged</h4>
              <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
                LLM calls from template uploading, layout analysis, or code generation will be tracked here in real-time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
