import { useState } from "react";
import { LifeBuoy, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { getConsoleLogs } from "@/utils/logger";
import { toast } from "sonner";

import { apiUrl } from "@/lib/api";

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportTicketModal({ isOpen, onClose }: SupportTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successTicket, setSuccessTicket] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Limit file size to 3MB for database stability
      if (file.size > 3 * 1024 * 1024) {
        toast.error("Screenshot size exceeds 3MB limit.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setScreenshot(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Raising support ticket...");

    const capturedLogs = getConsoleLogs();

    const payload = {
      title,
      description,
      priority,
      tenantId: "tenant-admin-001",
      logs: capturedLogs,
      requestorEmail: "admin@nxforms.io",
      requestorName: "Admin User",
      screenshot
    };

    try {
      const response = await fetch(apiUrl("/api/support/tickets"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Failed to submit support ticket");
      }

      const newTicket = await response.json();
      setSuccessTicket(newTicket);
      toast.success(`Support ticket ${newTicket.ticket_id || newTicket.id} raised successfully!`, { id: toastId });
      
      // Clear form
      setTitle("");
      setDescription("");
      setPriority("Medium");
      setScreenshot(null);
    } catch (err: any) {
      toast.error(err.message || "Error submitting ticket", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Submit Support Ticket</h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mygo Tickets Integration</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-slate-200/50 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {successTicket ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-800">Support Ticket Raised!</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Your ticket has been sent to Mygo Ticketing Platform.
                </p>
              </div>

              {/* Ticket Summary Card */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 max-w-sm mx-auto text-left space-y-2.5 font-sans">
                <div className="flex justify-between items-center text-xs border-b border-slate-200/40 pb-2">
                  <span className="font-bold text-slate-800">Ticket ID</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-emerald-600 font-black">
                    {successTicket.ticket_id || successTicket.id}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-600 font-medium">
                  <div><span className="text-slate-400">Title:</span> {successTicket.title}</div>
                  <div><span className="text-slate-400">Team:</span> {successTicket.assignedTeam || 'IT Support'}</div>
                  <div><span className="text-slate-400">SLA:</span> {successTicket.sla || '2h Response'}</div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => {
                    setSuccessTicket(null);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Requestor Info Banner */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-3.5 flex items-center justify-between text-xs font-medium text-slate-600">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Requestor</div>
                  <div className="font-bold text-slate-800">Admin User</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tenant</div>
                  <div className="font-bold text-slate-800">tenant-admin-001</div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Issue Title <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="E.g., Cannot upload PDF files in Image Library"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 bg-white"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description <span className="text-red-500">*</span></label>
                <textarea 
                  rows={4}
                  placeholder="Provide details about what you were doing when the issue occurred..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 bg-white resize-none"
                  required
                />
              </div>

              {/* Screenshot Upload with Preview */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Attach Screenshot (Optional)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none"
                  />
                  {screenshot && (
                    <div className="relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-100">
                      <img src={screenshot} alt="preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => setScreenshot(null)}
                        className="absolute inset-0 bg-slate-950/40 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority & Warning block */}
              <div className="grid grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Priority</label>
                  <select 
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div className="text-[10px] text-amber-600 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold leading-relaxed">
                    Auto-attaching error logs for troubleshooting.
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 bg-slate-50/20 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Submitting...
                    </>
                  ) : 'Submit Ticket'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
