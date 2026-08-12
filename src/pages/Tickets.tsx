import { useState, useEffect } from "react";
import { 
  LifeBuoy, 
  Search, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  User,
  Shield,
  FileCode2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface Ticket {
  id: number;
  ticket_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  subcategory: string;
  requestor_email: string;
  requestor_name: string;
  tenant_id: string;
  source: string;
  logs: string;
  created_at: string;
  updated_at: string;
}

import { apiUrl } from "@/lib/api";

export default function Tickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/support/tickets"));
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
      } else {
        toast.error("Failed to fetch tickets from support proxy");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while loading tickets");
    } finally {
      setLoading(false);
    }
  };

  const deleteTicket = async (ticketId: string, id: number) => {
    if (!confirm(`Are you sure you want to delete support ticket ${ticketId}?`)) return;
    try {
      const res = await fetch(apiUrl(`/api/support/tickets/${ticketId}`), {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success(`Support ticket ${ticketId} deleted`);
        setTickets(prev => prev.filter(t => t.id !== id));
      } else {
        toast.error("Failed to delete ticket");
      }
    } catch (err) {
      toast.error("Network error while deleting ticket");
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  // Compute Stats
  const totalCount = tickets.length;
  const openCount = tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed").length;
  const highPriorityCount = tickets.filter(t => t.priority === "High" || t.priority === "Critical").length;

  // Filter
  const filteredTickets = tickets.filter(t => {
    const term = searchQuery.toLowerCase();
    return (
      t.ticket_id.toLowerCase().includes(term) ||
      t.title.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      t.priority.toLowerCase().includes(term) ||
      t.status.toLowerCase().includes(term) ||
      t.requestor_email.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-widest mb-1.5">
            <LifeBuoy className="w-4 h-4 text-emerald-500 animate-pulse" />
            Support ticketing Center
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Open Support Tickets</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time status updates and diagnostics logs for tickets proxied to AWS.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchTickets}
            disabled={loading}
            className="h-9 px-3 rounded-xl hover:bg-slate-50 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh List
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Tickets */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Logged</div>
            <div className="text-2xl font-black text-slate-800">{totalCount}</div>
          </div>
        </div>

        {/* Open Tickets */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active / Open</div>
            <div className="text-2xl font-black text-slate-800">{openCount}</div>
          </div>
        </div>

        {/* High/Critical Priority */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">High / Critical</div>
            <div className="text-2xl font-black text-slate-800">{highPriorityCount}</div>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by ticket ID, title, priority, status..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
            Showing {filteredTickets.length} of {tickets.length} Tickets
          </div>
        </div>

        {/* Tickets Grid/List */}
        {filteredTickets.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((ticket) => {
              const isExpanded = expandedId === ticket.id;
              const priorityCol = 
                ticket.priority === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                ticket.priority === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                'bg-slate-100 text-slate-600 border-slate-200';
              
              const statusCol =
                ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-amber-50 text-amber-700 border-amber-200';

              let logsArray: string[] = [];
              try {
                if (ticket.logs) {
                  const parsed = JSON.parse(ticket.logs);
                  logsArray = Array.isArray(parsed) ? parsed : [];
                }
              } catch (e) {}

              return (
                <div 
                  key={ticket.id}
                  className={`transition-all duration-200 ${isExpanded ? 'bg-slate-50/30' : 'hover:bg-slate-50/10'}`}
                >
                  {/* Summary Bar */}
                  <div 
                    onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-slate-800 text-[10px] font-black tracking-wide">
                        {ticket.ticket_id}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-xs truncate">{ticket.title}</div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                          Created {ticket.created_at} • Source: {ticket.source}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                      {/* Priority Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[9px] border font-bold uppercase tracking-wider ${priorityCol}`}>
                        {ticket.priority}
                      </span>

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[9px] border font-bold uppercase tracking-wider ${statusCol}`}>
                        {ticket.status}
                      </span>

                      {/* Delete */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteTicket(ticket.ticket_id, ticket.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Expand Toggle */}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-2 border-t border-slate-100/50 space-y-4 animate-in slide-in-from-top-1 duration-200 text-xs">
                      <div className="grid grid-cols-3 gap-6 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50">
                        <div>
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" /> Requestor
                          </div>
                          <div className="font-bold text-slate-800">{ticket.requestor_name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{ticket.requestor_email}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-slate-400" /> Routing category
                          </div>
                          <div className="font-bold text-slate-800">{ticket.category}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">{ticket.subcategory}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Shield className="w-3 h-3 text-slate-400" /> Tenant ID
                          </div>
                          <div className="font-bold text-slate-800">{ticket.tenant_id}</div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-1">
                        <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Description Details</div>
                        <div className="text-slate-700 bg-white p-3.5 border border-slate-100 rounded-xl font-medium leading-relaxed max-w-4xl shadow-sm">
                          {ticket.description}
                        </div>
                      </div>

                      {/* Screenshot section */}
                      {ticket.screenshot && (
                        <div className="space-y-1">
                          <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Attached Screenshot</div>
                          <div className="relative w-40 h-28 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 cursor-zoom-in group shadow-sm">
                            <img src={ticket.screenshot} alt="ticket attachment" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div 
                              onClick={() => setSelectedImage(ticket.screenshot)}
                              className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                            >
                              Click to Expand
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Logs section */}
                      {logsArray.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                            <FileCode2 className="w-3.5 h-3.5 text-slate-400" /> Attached Diagnostic Logs
                          </div>
                          <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl text-[10px] font-mono overflow-auto max-h-52 leading-relaxed shadow-inner border border-slate-800">
                            {logsArray.map((line, idx) => (
                              <div key={idx} className={line.includes('[CLIENT]') ? 'text-blue-300' : 'text-rose-300'}>
                                {line}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 space-y-3">
            <LifeBuoy className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">No Tickets Found</h4>
              <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
                Support tickets raised via the Help & Support button in the navbar will appear here with live tracking data.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Screenshot Expand Modal */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-200"
        >
          <img src={selectedImage} alt="screenshot full" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" />
        </div>
      )}
    </div>
  );
}
