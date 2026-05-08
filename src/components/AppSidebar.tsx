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
  ChevronDown,
  PenTool,
  Clock,
  Activity,
  FileSearch,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavLeaf = {
  title: string;
  url: string;
  icon: React.ElementType;
};

type NavGroup = {
  title: string;
  icon: React.ElementType;
  children: NavLeaf[];
};

type NavItem = ({ kind: "link" } & NavLeaf) | ({ kind: "group" } & NavGroup);

const navItems: NavItem[] = [
  { kind: "link", title: "Dashboard", url: "/", icon: LayoutDashboard },
  {
    kind: "group",
    title: "Design Time",
    icon: PenTool,
    children: [
      { title: "API Setup", url: "/api-configurations", icon: Plug },
      { title: "Design Forms", url: "/templates", icon: FileText },
      // { title: "Forms Manager", url: "/output-rules", icon: Layers },
      // { title: "Label Configurator", url: "/labelConfigurator", icon: GitBranch },
    ],
  },
  {
    kind: "group",
    title: "Configuration Time",
    icon: Clock,
    children: [
      { title: "Output Definitions", url: "/outputs", icon: FileOutput },
      { title: "Printer Settings", url: "/printers", icon: Printer },
    ],
  },
  {
    kind: "group",
    title: "Run Time",
    icon: Activity,
    children: [
      { title: "Events", url: "/events", icon: Zap },
      { title: "Output Status", url: "/output-status", icon: FileSearch },
      { title: "Logs & Audit", url: "/logs", icon: ScrollText },
    ],
  },
  { kind: "link", title: "Settings", url: "/settings", icon: Settings },
  { kind: "link", title: "Simulation", url: "/simulation", icon: Zap },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function NavGroupItem({
  group,
  collapsed,
}: {
  group: NavGroup;
  location: ReturnType<typeof useLocation>;
  collapsed: boolean;
}) {
  const location = useLocation();
  const hasActiveChild = group.children.some((c) =>
    location.pathname.startsWith(c.url)
  );
  const [open, setOpen] = useState(hasActiveChild);
  const Icon = group.icon;

  if (collapsed) {
    // In collapsed mode show each child icon as a standalone link
    return (
      <>
        {group.children.map((child) => {
          const isActive = location.pathname.startsWith(child.url);
          return (
            <NavLink
              key={child.url}
              to={child.url}
              className={cn("nav-item group justify-center px-2", isActive && "active")}
              title={child.title}
            >
              <child.icon
                size={16}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive ? "" : "text-muted-foreground group-hover:text-foreground"
                )}
                style={isActive ? { color: "hsl(var(--accent))" } : undefined}
              />
            </NavLink>
          );
        })}
      </>
    );
  }

  return (
    <div>
      {/* Group header button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium",
          "transition-all duration-150",
          hasActiveChild
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
        )}
      >
        <Icon
          size={16}
          className="shrink-0"
          style={hasActiveChild ? { color: "hsl(var(--accent))" } : undefined}
        />
        <span className="flex-1 text-left truncate font-body text-xs uppercase tracking-widest font-semibold">
          {group.title}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>

      {/* Children */}
      {open && (
        <div className="ml-3 pl-3 border-l border-sidebar-border mt-0.5 mb-1 space-y-0.5">
          {group.children.map((child) => {
            const isActive = location.pathname.startsWith(child.url);
            return (
              <NavLink
                key={child.url}
                to={child.url}
                className={cn("nav-item group", isActive && "active")}
              >
                <child.icon
                  size={16}
                  className={cn(
                    "shrink-0 transition-colors",
                    isActive
                      ? ""
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                  style={isActive ? { color: "hsl(var(--accent))" } : undefined}
                />
                <span className="truncate text-sm">{child.title}</span>
                {isActive && (
                  <div
                    className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "hsl(var(--accent))" }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
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
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-sidebar-border shrink-0",
          collapsed && "justify-center"
        )}
      >
        {!collapsed ? (
          <div>
            {/* <div className="font-display font-800 text-xl text-primary tracking-tight leading-tight">
              nx<span style={{ color: "hsl(var(--accent))" }}>Forms</span>
            </div>
            <div className="text-[10px] text-muted-foreground font-body mt-0.5 leading-tight">
              Output Engine
            </div> */}
            <div className="flex items-center justify-start">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-14 w-auto object-contain"
              />
            </div>
          </div>
        ) : (
          <div className="font-display font-bold text-base text-primary">
            My<span style={{ color: "hsl(var(--accent))" }}>F</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.kind === "link") {
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
                      ? ""
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
          }

          // Group
          return (
            <NavGroupItem
              key={item.title}
              group={item}
              location={location}
              collapsed={collapsed}
            />
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

