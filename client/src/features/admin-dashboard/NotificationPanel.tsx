import { useState, useEffect, useRef } from "react";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/adminService";
import { Bell, Check, CheckCheck, Info, AlertTriangle, XCircle, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle,
};

const typeColors: Record<string, string> = {
  info: "text-sky-500 dark:text-sky-400 bg-sky-500/10",
  warning: "text-amber-500 dark:text-amber-400 bg-amber-500/10",
  error: "text-red-500 dark:text-red-400 bg-red-500/10",
  success: "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10",
};

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchNotifications();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 max-h-[70vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-sky-500 dark:text-sky-400" />
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1 text-xs text-sky-500 dark:text-sky-400 hover:underline"
          >
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="overflow-y-auto max-h-[calc(70vh-48px)]">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-center">
            <Bell className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3 border-b border-border transition-colors hover:bg-accent/50 ${
                  !n.read ? "bg-sky-500/[0.03]" : ""
                }`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${typeColors[n.type] || typeColors.info}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-medium ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground hover:text-sky-500 transition-colors"
                    title="Mark as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
