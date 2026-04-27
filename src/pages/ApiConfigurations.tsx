import { useState, useEffect } from "react";
import { Plus, Eye, Trash2, ArrowLeft, Globe, Shield, Activity, Search, Edit3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImportWizard } from "@/components/wizard/ImportWizard";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ApiDefinition {
  id: number;
  name: string;
  endpoint: string;
  auth_type: string;
  client_id?: string;
  client_secret?: string;
  status: string;
  created_at: string;
}

export default function ApiConfigurations() {
  const [showWizard, setShowWizard] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiDefinition | null>(null);
  const [apis, setApis] = useState<ApiDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApi, setSelectedApi] = useState<ApiDefinition | null>(null);

  const fetchApis = async () => {
    try {
      setLoading(true);
      await fetch("http://localhost:5050/api/catalog-init", { method: "POST" });
      const res = await fetch("http://localhost:5050/api/catalog");
      const data = await res.json();
      setApis(data);
    } catch (err) {
      toast.error("Failed to load API catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApis();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this API configuration?")) return;
    try {
      const res = await fetch(`http://localhost:5050/api/catalog/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("API deleted successfully");
        fetchApis();
      }
    } catch (err) {
      toast.error("Failed to delete API");
    }
  };

  if (showWizard) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <button 
              onClick={() => { setShowWizard(false); setEditingApi(null); }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Catalog
            </button>
            <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">
                {editingApi ? `Edit Mapping: ${editingApi.name}` : "API Wizard"}
            </h1>
          </div>
        </div>
        <div className="max-w-5xl mx-auto">
          <ImportWizard 
            initialData={editingApi}
            startStep={editingApi ? 3 : 1}
            onSaved={() => {
              setShowWizard(false);
              setEditingApi(null);
              fetchApis();
            }} 
            onCancel={() => {
                setShowWizard(false);
                setEditingApi(null);
            }} 
          />
        </div>
      </div>
    );
  }

  const filteredApis = apis.filter(api => 
    api.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    api.endpoint.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/50 p-6 rounded-3xl border border-border shadow-sm backdrop-blur-xl">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-semibold text-foreground tracking-tight">Integration Hub</h1>
          <p className="text-sm text-muted-foreground font-body">Manage your service mesh and external API endpoints.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Search APIs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-xs font-body focus:ring-2 focus:ring-accent/20 outline-none w-[200px] md:w-[260px] transition-all"
            />
          </div>
          <Button onClick={() => setShowWizard(true)} className="bg-accent text-white hover:bg-accent/90 rounded-xl px-5 shadow-lg shadow-accent/20">
            <Plus size={16} className="mr-2" /> Add API
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">API Connection</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Protocol / Auth</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 font-body">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[1, 2, 3, 4].map(c => <td key={c} className="px-6 py-6"><div className="h-4 bg-muted rounded w-3/4"></div></td>)}
                  </tr>
                ))
              ) : filteredApis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground opacity-50">
                    <Globe size={48} className="mx-auto mb-4" />
                    <p className="text-sm font-semibold">No APIs found</p>
                  </td>
                </tr>
              ) : (
                filteredApis.map((api) => (
                  <tr key={api.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                          <Globe size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground tracking-tight">{api.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px] mt-0.5">{api.endpoint}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                        <Shield size={12} className="text-blue-500" /> {api.auth_type}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[11px] font-bold uppercase tracking-tighter">Active</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => { setEditingApi(api); setShowWizard(true); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 transition-all"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => setSelectedApi(api)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent/10 text-muted-foreground hover:text-accent transition-all"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(api.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedApi && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white"><Globe size={20} /></div>
                <div>
                  <h2 className="text-base font-semibold leading-none">{selectedApi.name}</h2>
                  <p className="text-[11px] text-muted-foreground mt-1.5 font-mono">{selectedApi.endpoint}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2"><Activity size={14} className="text-green-500" /><span className="text-sm font-semibold">Healthy</span></div>
                </div>
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Created</p>
                  <p className="text-sm font-semibold">{new Date(selectedApi.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-muted/30 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedApi(null)} className="rounded-xl">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
