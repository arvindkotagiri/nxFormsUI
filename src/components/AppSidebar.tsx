import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Zap,
  FileOutput,
  FileText,
  GitBranch,
  Printer,
  Plug,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Events", url: "/events", icon: Zap },
  { title: "Outputs", url: "/outputs", icon: FileOutput },
  { title: "Templates", url: "/templates", icon: FileText },
  { title: "Output Rules", url: "/output-rules", icon: GitBranch },
  { title: "Printers", url: "/printers", icon: Printer },
  { title: "API Configurations", url: "/api-configurations", icon: Plug },
  { title: "Logs & Audit", url: "/logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen transition-all duration-300 ease-in-out shrink-0",
        "border-r border-sidebar-border",
        collapsed ? "w-16" : "w-60"
      )}
      style={{ background: "hsl(var(--sidebar-background))" }}
    >
      {/* Logo */}
      <div className={cn("flex items-center h-16 px-4 border-b border-sidebar-border shrink-0", collapsed && "justify-center")}>
        {!collapsed ? (
          <div>
            <div className="font-display font-800 text-xl text-primary tracking-tight leading-tight">
              nx<span style={{ color: "hsl(var(--accent))" }}>Forms</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-body mt-0.5 leading-tight">
              Output Engine
            </div>
          </div>
        ) : (
          <div className="font-display font-bold text-base text-primary">
            nx<span style={{ color: "hsl(var(--accent))" }}>F</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);

          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "nav-item group",
                isActive && "active",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.title : undefined}
            >
              <item.icon
                size={18}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive
                    ? "text-accent"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
                style={isActive ? { color: "hsl(var(--accent))" } : undefined}
              />
              {!collapsed && (
                <span className="truncate text-sm">{item.title}</span>
              )}
              {!collapsed && isActive && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: "hsl(var(--accent))" }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="px-2 pb-4 shrink-0">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center justify-center gap-2 p-2 rounded-lg",
            "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
            "transition-all text-xs font-body"
          )}
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
