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
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  roleLabel: string;
  roleBadgeColor: string;
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
            return (
              <button
                key={item.label}
                onClick={() => {
                  item.onClick?.();
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-sky-500/10 text-sky-500 dark:text-sky-400 border border-sky-400/20"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent"
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
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
