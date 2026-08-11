import { useState, useEffect, useCallback } from "react";
import { apiUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Building,
  KeyRound,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Loader2,
  Sparkles,
  Tag,
  ShieldCheck,
  BadgeAlert,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  first_name?: string;
  last_name?: string;
  organization?: string;
  tenant_id?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role: string;
  created_on: string;
}

interface OrganizationRecord {
  id: number;
  name: string;
  tenant_prefix: string;
  current_counter: number;
  user_count?: number;
}

export default function AdminPanel() {
  const { token, user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"pending" | "users" | "orgs">("pending");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orgs, setOrgs] = useState<OrganizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Approval Form State per User
  const [approvalParams, setApprovalParams] = useState<Record<string, { role: string; customTenantId: string; prefix: string }>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Edit User Modal / Password Reset State
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editTenantId, setEditTenantId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updatingUser, setUpdatingUser] = useState(false);

  // Org Prefix State
  const [editingOrg, setEditingOrg] = useState<{ name: string; prefix: string } | null>(null);

  const fetchAdminData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [usersRes, orgsRes] = await Promise.all([
        fetch(apiUrl("/api/admin/users"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(apiUrl("/api/admin/organizations"), { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (usersRes.ok) {
        const userData: AdminUser[] = await usersRes.json();
        setUsers(userData);

        // Pre-fill tenant ID suggestions for pending users
        const newParams: Record<string, { role: string; customTenantId: string; prefix: string }> = {};
        userData.forEach(u => {
          if (u.status === "PENDING") {
            const org = u.organization || "ORG";
            const words = org.split(/\s+/).filter(Boolean);
            const pfx = words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : org.substring(0, 3).toUpperCase();
            newParams[u.id] = {
              role: u.role || "developer",
              customTenantId: `${pfx}-MYGO-0001`,
              prefix: pfx
            };
          }
        });
        setApprovalParams(newParams);
      }

      if (orgsRes.ok) {
        const orgData = await orgsRes.json();
        setOrgs(orgData);
      }
    } catch (err) {
      toast.error("Failed to load admin panel data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleApproveUser = async (userId: string) => {
    const params = approvalParams[userId] || { role: "developer", customTenantId: "", prefix: "" };
    setApprovingId(userId);

    try {
      const res = await fetch(apiUrl("/api/admin/approve-user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          role: params.role,
          customTenantId: params.customTenantId,
          tenantPrefix: params.prefix
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "User approved successfully!");
        fetchAdminData();
      } else {
        toast.error(data.error || "Failed to approve user.");
      }
    } catch (err) {
      toast.error("Network error approving user.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!confirm("Are you sure you want to reject this signup request?")) return;
    try {
      const res = await fetch(apiUrl("/api/admin/update-user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId, status: "REJECTED" })
      });

      if (res.ok) {
        toast.success("User request rejected.");
        fetchAdminData();
      } else {
        toast.error("Failed to reject user.");
      }
    } catch (err) {
      toast.error("Network error rejecting user.");
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdatingUser(true);

    try {
      const res = await fetch(apiUrl("/api/admin/update-user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: editRole,
          status: editStatus,
          tenantId: editTenantId,
          password: newPassword || undefined
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("User details updated successfully!");
        setSelectedUser(null);
        setNewPassword("");
        fetchAdminData();
      } else {
        toast.error(data.error || "Failed to update user.");
      }
    } catch (err) {
      toast.error("Network error updating user.");
    } finally {
      setUpdatingUser(false);
    }
  };

  const pendingUsers = users.filter(u => u.status === "PENDING");
  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.organization && u.organization.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.tenant_id && u.tenant_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-white">Admin Control Center</h1>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                System Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Approve user signups, assign Organization Tenant IDs (<code className="text-emerald-400 font-mono">WK-MYGO-0001</code>), and manage RBAC roles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchAdminData}
            disabled={loading}
            variant="outline"
            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BadgeAlert className="w-4 h-4 text-amber-500" /> Pending Signups
            {pendingUsers.length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "users"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" /> All Accounts ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("orgs")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "orgs"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building className="w-4 h-4 text-teal-600" /> Organization Prefixes
          </button>
        </div>

        {activeTab === "users" && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search user, org, tenant ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        )}
      </div>

      {/* TAB 1: PENDING SIGNUPS */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No Pending Requests</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                All user registration requests have been reviewed and processed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingUsers.map(user => {
                const params = approvalParams[user.id] || { role: "developer", customTenantId: "", prefix: "" };
                return (
                  <div
                    key={user.id}
                    className="bg-white border border-amber-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-amber-500" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* User Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">
                            {user.first_name || user.name} {user.last_name || ""}
                          </h3>
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                            PENDING APPROVAL
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-600">
                          <span className="font-semibold text-slate-700">{user.email}</span>
                          <span>•</span>
                          <span className="font-bold text-emerald-700 flex items-center gap-1">
                            <Building className="w-3.5 h-3.5" /> {user.organization || "No Org"}
                          </span>
                          <span>•</span>
                          <span className="text-slate-400">
                            Requested: {new Date(user.created_on).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Reject Button */}
                      <Button
                        onClick={() => handleRejectUser(user.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 text-xs shrink-0 self-start md:self-auto"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" /> Reject Request
                      </Button>
                    </div>

                    {/* Approval Controls Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                      {/* Tenant ID Auto-Generator Input */}
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <Tag className="w-3 h-3 text-emerald-600" /> Assigned Tenant ID
                        </label>
                        <input
                          type="text"
                          value={params.customTenantId}
                          onChange={e =>
                            setApprovalParams(prev => ({
                              ...prev,
                              [user.id]: { ...params, customTenantId: e.target.value }
                            }))
                          }
                          placeholder="e.g. WK-MYGO-0001"
                          className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-emerald-800 focus:ring-2 focus:ring-emerald-500/30"
                        />
                      </div>

                      {/* Role Selector */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-indigo-600" /> Assign Role
                        </label>
                        <select
                          value={params.role}
                          onChange={e =>
                            setApprovalParams(prev => ({
                              ...prev,
                              [user.id]: { ...params, role: e.target.value }
                            }))
                          }
                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500/30"
                        >
                          <option value="developer">Developer (Template Creator)</option>
                          <option value="manager">Manager (Team Lead)</option>
                          <option value="admin">Admin (Full Access)</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer (Read-only)</option>
                        </select>
                      </div>

                      {/* Approve Button */}
                      <div>
                        <Button
                          onClick={() => handleApproveUser(user.id)}
                          disabled={approvingId === user.id}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs py-2 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                        >
                          {approvingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4" /> Approve & Assign Tenant ID
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ALL ACCOUNTS */}
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Tenant ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="font-bold text-slate-900">{u.name || `${u.first_name} ${u.last_name}`}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {u.organization || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {u.tenant_id ? (
                        <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {u.tenant_id}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold uppercase text-[10px]">
                      <span className={`px-2 py-0.5 rounded ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'manager' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[10px]">
                      {u.status === 'APPROVED' && (
                        <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          APPROVED
                        </span>
                      )}
                      {u.status === 'PENDING' && (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          PENDING
                        </span>
                      )}
                      {u.status === 'REJECTED' && (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          REJECTED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        onClick={() => {
                          setSelectedUser(u);
                          setEditRole(u.role);
                          setEditStatus(u.status);
                          setEditTenantId(u.tenant_id || "");
                        }}
                        variant="outline"
                        size="sm"
                        className="text-xs bg-slate-50 hover:bg-slate-100 border-slate-200"
                      >
                        Edit User
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORGANIZATION PREFIXES */}
      {activeTab === "orgs" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Organization Tenant Prefixes</h3>
              <p className="text-xs text-slate-500">
                Custom prefixes for tenant ID generation (e.g. Wolters Kluwer → <code className="text-emerald-700 font-mono font-bold">WK</code>).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map(org => (
              <div key={org.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-xs">{org.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Prefix: <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">{org.tenant_prefix}</span>
                    {" • "} Sequence Counter: <span className="font-bold">{org.current_counter}</span>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {org.user_count || 0} users
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Edit User Account</h3>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">User Email</label>
                <input type="text" value={selectedUser.email} disabled className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-bold mt-1" />
              </div>

              <div>
                <label className="font-bold text-slate-700">Role</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold mt-1">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="developer">Developer</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Status</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold mt-1">
                  <option value="APPROVED">APPROVED</option>
                  <option value="PENDING">PENDING</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Tenant ID</label>
                <input type="text" value={editTenantId} onChange={e => setEditTenantId(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono font-bold text-emerald-800 mt-1" />
              </div>

              <div>
                <label className="font-bold text-slate-700">Reset Password (leave empty to keep current)</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" className="w-full px-3 py-1.5 border border-slate-300 rounded-lg mt-1" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setSelectedUser(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={updatingUser} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  {updatingUser ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
