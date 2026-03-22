import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationPanel from "@/features/admin-dashboard/NotificationPanel";
import { fetchNotifications } from "@/services/adminService";
import {
  Shield,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  children?: NavItem[];
  iconColor?: string;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  roleLabel: string;
  roleBadgeColor: string;
}

type IconPalette = {
  badge: string;
  badgeActive: string;
  icon: string;
  iconActive: string;
  activeNav: string;
};

const ICON_PALETTES: Record<string, IconPalette> = {
  neutral: {
    badge: "border-border bg-accent/70 ring-border/70",
    badgeActive: "border-sky-400/30 bg-sky-500/12 ring-sky-400/15 shadow-sm",
    icon: "text-muted-foreground",
    iconActive: "text-sky-600 dark:text-sky-300",
    activeNav: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  sky: {
    badge: "border-sky-500/20 bg-gradient-to-br from-sky-500/16 via-sky-500/8 to-transparent ring-sky-500/10",
    badgeActive: "border-sky-400/30 bg-gradient-to-br from-sky-500/24 via-sky-500/12 to-transparent ring-sky-300/15 shadow-sm",
    icon: "text-sky-600 dark:text-sky-300",
    iconActive: "text-sky-700 dark:text-sky-100",
    activeNav: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  blue: {
    badge: "border-blue-500/20 bg-gradient-to-br from-blue-500/16 via-blue-500/8 to-transparent ring-blue-500/10",
    badgeActive: "border-blue-400/30 bg-gradient-to-br from-blue-500/24 via-blue-500/12 to-transparent ring-blue-300/15 shadow-sm",
    icon: "text-blue-600 dark:text-blue-300",
    iconActive: "text-blue-700 dark:text-blue-100",
    activeNav: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  indigo: {
    badge: "border-indigo-500/20 bg-gradient-to-br from-indigo-500/16 via-indigo-500/8 to-transparent ring-indigo-500/10",
    badgeActive: "border-indigo-400/30 bg-gradient-to-br from-indigo-500/24 via-indigo-500/12 to-transparent ring-indigo-300/15 shadow-sm",
    icon: "text-indigo-600 dark:text-indigo-300",
    iconActive: "text-indigo-700 dark:text-indigo-100",
    activeNav: "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
  },
  violet: {
    badge: "border-violet-500/20 bg-gradient-to-br from-violet-500/16 via-violet-500/8 to-transparent ring-violet-500/10",
    badgeActive: "border-violet-400/30 bg-gradient-to-br from-violet-500/24 via-violet-500/12 to-transparent ring-violet-300/15 shadow-sm",
    icon: "text-violet-600 dark:text-violet-300",
    iconActive: "text-violet-700 dark:text-violet-100",
    activeNav: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  fuchsia: {
    badge: "border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/16 via-fuchsia-500/8 to-transparent ring-fuchsia-500/10",
    badgeActive: "border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/24 via-fuchsia-500/12 to-transparent ring-fuchsia-300/15 shadow-sm",
    icon: "text-fuchsia-600 dark:text-fuchsia-300",
    iconActive: "text-fuchsia-700 dark:text-fuchsia-100",
    activeNav: "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  },
  pink: {
    badge: "border-pink-500/20 bg-gradient-to-br from-pink-500/16 via-pink-500/8 to-transparent ring-pink-500/10",
    badgeActive: "border-pink-400/30 bg-gradient-to-br from-pink-500/24 via-pink-500/12 to-transparent ring-pink-300/15 shadow-sm",
    icon: "text-pink-600 dark:text-pink-300",
    iconActive: "text-pink-700 dark:text-pink-100",
    activeNav: "border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-300",
  },
  red: {
    badge: "border-red-500/20 bg-gradient-to-br from-red-500/16 via-red-500/8 to-transparent ring-red-500/10",
    badgeActive: "border-red-400/30 bg-gradient-to-br from-red-500/24 via-red-500/12 to-transparent ring-red-300/15 shadow-sm",
    icon: "text-red-600 dark:text-red-300",
    iconActive: "text-red-700 dark:text-red-100",
    activeNav: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300",
  },
  rose: {
    badge: "border-rose-500/20 bg-gradient-to-br from-rose-500/16 via-rose-500/8 to-transparent ring-rose-500/10",
    badgeActive: "border-rose-400/30 bg-gradient-to-br from-rose-500/24 via-rose-500/12 to-transparent ring-rose-300/15 shadow-sm",
    icon: "text-rose-600 dark:text-rose-300",
    iconActive: "text-rose-700 dark:text-rose-100",
    activeNav: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
  orange: {
    badge: "border-orange-500/20 bg-gradient-to-br from-orange-500/16 via-orange-500/8 to-transparent ring-orange-500/10",
    badgeActive: "border-orange-400/30 bg-gradient-to-br from-orange-500/24 via-orange-500/12 to-transparent ring-orange-300/15 shadow-sm",
    icon: "text-orange-600 dark:text-orange-300",
    iconActive: "text-orange-700 dark:text-orange-100",
    activeNav: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  },
  amber: {
    badge: "border-amber-500/20 bg-gradient-to-br from-amber-500/16 via-amber-500/8 to-transparent ring-amber-500/10",
    badgeActive: "border-amber-400/30 bg-gradient-to-br from-amber-500/24 via-amber-500/12 to-transparent ring-amber-300/15 shadow-sm",
    icon: "text-amber-600 dark:text-amber-300",
    iconActive: "text-amber-700 dark:text-amber-100",
    activeNav: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  yellow: {
    badge: "border-yellow-500/20 bg-gradient-to-br from-yellow-500/16 via-yellow-500/8 to-transparent ring-yellow-500/10",
    badgeActive: "border-yellow-400/30 bg-gradient-to-br from-yellow-500/24 via-yellow-500/12 to-transparent ring-yellow-300/15 shadow-sm",
    icon: "text-yellow-600 dark:text-yellow-300",
    iconActive: "text-yellow-700 dark:text-yellow-100",
    activeNav: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-300",
  },
  lime: {
    badge: "border-lime-500/20 bg-gradient-to-br from-lime-500/16 via-lime-500/8 to-transparent ring-lime-500/10",
    badgeActive: "border-lime-400/30 bg-gradient-to-br from-lime-500/24 via-lime-500/12 to-transparent ring-lime-300/15 shadow-sm",
    icon: "text-lime-600 dark:text-lime-300",
    iconActive: "text-lime-700 dark:text-lime-100",
    activeNav: "border-lime-500/20 bg-lime-500/10 text-lime-600 dark:text-lime-300",
  },
  emerald: {
    badge: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/16 via-emerald-500/8 to-transparent ring-emerald-500/10",
    badgeActive: "border-emerald-400/30 bg-gradient-to-br from-emerald-500/24 via-emerald-500/12 to-transparent ring-emerald-300/15 shadow-sm",
    icon: "text-emerald-600 dark:text-emerald-300",
    iconActive: "text-emerald-700 dark:text-emerald-100",
    activeNav: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  green: {
    badge: "border-green-500/20 bg-gradient-to-br from-green-500/16 via-green-500/8 to-transparent ring-green-500/10",
    badgeActive: "border-green-400/30 bg-gradient-to-br from-green-500/24 via-green-500/12 to-transparent ring-green-300/15 shadow-sm",
    icon: "text-green-600 dark:text-green-300",
    iconActive: "text-green-700 dark:text-green-100",
    activeNav: "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-300",
  },
  teal: {
    badge: "border-teal-500/20 bg-gradient-to-br from-teal-500/16 via-teal-500/8 to-transparent ring-teal-500/10",
    badgeActive: "border-teal-400/30 bg-gradient-to-br from-teal-500/24 via-teal-500/12 to-transparent ring-teal-300/15 shadow-sm",
    icon: "text-teal-600 dark:text-teal-300",
    iconActive: "text-teal-700 dark:text-teal-100",
    activeNav: "border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-300",
  },
  cyan: {
    badge: "border-cyan-500/20 bg-gradient-to-br from-cyan-500/16 via-cyan-500/8 to-transparent ring-cyan-500/10",
    badgeActive: "border-cyan-400/30 bg-gradient-to-br from-cyan-500/24 via-cyan-500/12 to-transparent ring-cyan-300/15 shadow-sm",
    icon: "text-cyan-600 dark:text-cyan-300",
    iconActive: "text-cyan-700 dark:text-cyan-100",
    activeNav: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
  },
  slate: {
    badge: "border-slate-500/20 bg-gradient-to-br from-slate-500/16 via-slate-500/8 to-transparent ring-slate-500/10",
    badgeActive: "border-slate-400/30 bg-gradient-to-br from-slate-500/24 via-slate-500/12 to-transparent ring-slate-300/15 shadow-sm",
    icon: "text-slate-600 dark:text-slate-300",
    iconActive: "text-slate-700 dark:text-slate-100",
    activeNav: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
};

function getIconPalette(iconColor?: string) {
  if (!iconColor) return ICON_PALETTES.neutral;

  const color = iconColor.toLowerCase();
  if (color.includes("sky")) return ICON_PALETTES.sky;
  if (color.includes("blue")) return ICON_PALETTES.blue;
  if (color.includes("indigo")) return ICON_PALETTES.indigo;
  if (color.includes("violet")) return ICON_PALETTES.violet;
  if (color.includes("fuchsia")) return ICON_PALETTES.fuchsia;
  if (color.includes("pink")) return ICON_PALETTES.pink;
  if (color.includes("rose")) return ICON_PALETTES.rose;
  if (color.includes("red")) return ICON_PALETTES.red;
  if (color.includes("orange")) return ICON_PALETTES.orange;
  if (color.includes("amber")) return ICON_PALETTES.amber;
  if (color.includes("yellow")) return ICON_PALETTES.yellow;
  if (color.includes("lime")) return ICON_PALETTES.lime;
  if (color.includes("emerald")) return ICON_PALETTES.emerald;
  if (color.includes("green")) return ICON_PALETTES.green;
  if (color.includes("teal")) return ICON_PALETTES.teal;
  if (color.includes("cyan")) return ICON_PALETTES.cyan;
  if (color.includes("slate")) return ICON_PALETTES.slate;

  return ICON_PALETTES.neutral;
}

function getIconBadgeClasses(iconColor?: string, isActive = false, size: "md" | "sm" = "md") {
  const palette = getIconPalette(iconColor);
  const dimensions = size === "sm" ? "h-7 w-7 rounded-lg" : "h-8 w-8 rounded-xl";
  const stateClasses = isActive ? palette.badgeActive : palette.badge;

  return `flex shrink-0 items-center justify-center border ring-1 ring-inset transition-all duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.02] ${dimensions} ${stateClasses}`;
}

function getIconClasses(iconColor?: string, isActive = false) {
  const palette = getIconPalette(iconColor);
  return `transition-transform duration-200 group-hover:scale-105 ${isActive ? palette.iconActive : palette.icon}`;
}

function getNavItemClasses(iconColor?: string, isActive = false) {
  if (!isActive) {
    return "border-transparent text-muted-foreground hover:bg-accent/80 hover:text-foreground";
  }

  return getIconPalette(iconColor).activeNav;
}

export default function DashboardLayout({
  children,
  navItems,
  roleLabel,
  roleBadgeColor,
}: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    // Auto-expand groups that have an active child
    const expanded = new Set<string>();
    navItems.forEach((item) => {
      if (item.children?.some((c) => c.active)) expanded.add(item.label);
    });
    return expanded;
  });

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // Auto-expand groups when a child becomes active
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children?.some((c) => c.active)) {
        setExpandedGroups((prev) => {
          if (prev.has(item.label)) return prev;
          const next = new Set(prev);
          next.add(item.label);
          return next;
        });
      }
    });
  }, [navItems]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchNotifications();
        setUnreadCount(data.unreadCount);
      } catch {
        // silently fail
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate({ to: "/login" });
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card/80 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-400/20">
              <Shield className="h-4 w-4 text-sky-500 dark:text-sky-400" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Sacco<span className="text-sky-500 dark:text-sky-400">FraudGuard</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role badge */}
        <div className="px-5 py-4">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${roleBadgeColor}`}
          >
            {roleLabel}
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            // Collapsible group with children
            if (item.children && item.children.length > 0) {
              const isExpanded = expandedGroups.has(item.label);
              const hasActiveChild = item.children.some((c) => c.active);
              const parentBadgeClasses = getIconBadgeClasses(item.iconColor, hasActiveChild);
              return (
                <div key={item.label} className="space-y-0.5">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      getNavItemClasses(item.iconColor, hasActiveChild)
                    }`}
                  >
                    <span className={parentBadgeClasses}>
                      <Icon className={`h-4.5 w-4.5 ${getIconClasses(item.iconColor, hasActiveChild)}`} />
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`} />
                  </button>
                  {isExpanded && (
                    <div className="ml-4 border-l border-border pl-2 space-y-0.5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childBadgeClasses = getIconBadgeClasses(child.iconColor, !!child.active, "sm");
                        return (
                          <button
                            key={child.label}
                            onClick={() => {
                              child.onClick?.();
                              setSidebarOpen(false);
                            }}
                            className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
                              getNavItemClasses(child.iconColor, !!child.active)
                            }`}
                          >
                            <span className={childBadgeClasses}>
                              <ChildIcon className={`h-4 w-4 ${getIconClasses(child.iconColor, !!child.active)}`} />
                            </span>
                            {child.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular nav item
            const itemBadgeClasses = getIconBadgeClasses(item.iconColor, !!item.active);
            return (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setSidebarOpen(false);
                }}
                className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  getNavItemClasses(item.iconColor, !!item.active)
                }`}
              >
                <span className={itemBadgeClasses}>
                  <Icon className={`h-4.5 w-4.5 ${getIconClasses(item.iconColor, !!item.active)}`} />
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/10 border border-sky-400/20 text-sm font-bold text-sky-500 dark:text-sky-400">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.nationalId}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/50 backdrop-blur-xl px-4 lg:px-6 relative z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground hidden sm:block">
              {greeting}, {user?.firstName} 👋
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationPanel onClose={() => setNotificationsOpen(false)} />
              )}
            </div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl border border-border bg-accent/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-500 dark:text-sky-400">
                  {user?.firstName?.[0]}
                </div>
                <span className="hidden sm:inline">{user?.firstName}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 w-48 rounded-xl border border-border bg-card py-1 shadow-xl">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-sm font-medium text-foreground">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
