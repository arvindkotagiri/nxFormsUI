import { useState } from "react";
import { Search, Bell, ChevronDown, Wifi, WifiOff, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  env?: "DEV" | "QA" | "PROD";
}

export function TopBar({ env = "DEV" }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  const envBadgeClass =
    env === "PROD"
      ? "env-badge-prod"
      : env === "QA"
      ? "env-badge-qa"
      : "env-badge-dev";

  return (
    <header
      className="h-16 flex items-center gap-4 px-6 shrink-0 border-b border-border"
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
        {/* WS Status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
          <Wifi size={13} className="text-success" style={{ color: "hsl(var(--success))" }} />
          <span className="hidden sm:inline">Live</span>
        </div>

        {/* Env badge */}
        <span className={envBadgeClass}>{env}</span>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
          <Bell size={16} className="text-muted-foreground" />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "hsl(var(--accent))" }}
          />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-secondary transition-colors">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-semibold"
            style={{
              background: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
            }}
          >
            AD
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-foreground font-body leading-tight">
              Admin User
            </div>
            <div className="text-[10px] text-muted-foreground font-body leading-tight">
              admin@nxforms.io
            </div>
          </div>
          <ChevronDown size={13} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
