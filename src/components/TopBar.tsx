import { useState } from "react";
import { Search, Bell, ChevronDown, Wifi, LifeBuoy, LogOut, ShieldCheck, Tag, Building } from "lucide-react";
import { cn } from "@/lib/utils";
import { SupportTicketModal } from "./SupportTicketModal";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

interface TopBarProps {
  env?: "DEV" | "QA" | "PROD";
}

export function TopBar({ env = "DEV" }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const envBadgeClass =
    env === "PROD"
      ? "env-badge-prod"
      : env === "QA"
      ? "env-badge-qa"
      : "env-badge-dev";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)
    : "AD";

  return (
    <header
      className="h-16 flex items-center gap-4 px-6 shrink-0 border-b border-border relative z-20"
      style={{ background: "hsl(var(--background))" }}
    >
      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search events, outputs, templates… (Ctrl+K)"
            className={cn(
              "w-full pl-9 pr-4 py-2 rounded-lg text-sm font-body",
              "bg-secondary border border-border",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent",
              "transition-all"
            )}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Organization / Tenant ID Badge */}
        {user?.tenant_id && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold">
            <Tag size={12} className="text-emerald-600" />
            <span>{user.tenant_id}</span>
          </div>
        )}

        {/* Env badge */}
        <span className={envBadgeClass}>{env}</span>

        {/* Support Ticket Modal Toggle */}
        <button 
          onClick={() => setSupportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-xs font-semibold text-muted-foreground hover:text-foreground transition-all shrink-0"
        >
          <LifeBuoy size={14} className="text-emerald-500" />
          <span className="hidden md:inline">Help & Support</span>
        </button>

        <SupportTicketModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />

        {/* User Profile & Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-secondary transition-colors text-left"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-display font-bold shadow-sm"
              style={{
                background: isAdmin ? "hsl(var(--accent))" : "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-foreground font-body leading-tight flex items-center gap-1">
                {user?.name || "User"}
                {isAdmin && <ShieldCheck size={12} className="text-emerald-500" />}
              </div>
              <div className="text-[10px] text-muted-foreground font-body leading-tight">
                {user?.email || "user@nxforms.io"}
              </div>
            </div>
            <ChevronDown size={14} className="text-muted-foreground ml-1" />
          </button>

          {/* User Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl p-2 z-50 animate-fade-in space-y-1">
              <div className="px-3 py-2 border-b border-slate-100 space-y-1">
                <div className="text-xs font-bold text-slate-800">{user?.name}</div>
                <div className="text-[10px] text-slate-500">{user?.email}</div>
                {user?.organization && (
                  <div className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1 pt-1">
                    <Building size={10} /> {user.organization}
                  </div>
                )}
                {user?.tenant_id && (
                  <div className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
                    Tenant: {user.tenant_id}
                  </div>
                )}
              </div>

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <ShieldCheck size={14} /> Admin Control Center
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
