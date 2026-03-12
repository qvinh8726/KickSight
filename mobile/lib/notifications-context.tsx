import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";

export interface AppNotification {
  id: string;
  type: "match" | "result" | "value_bet" | "system";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

interface NotifState {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "wc2026_notifications";
const CLEARED_KEY = "wc2026_notifications_cleared";

const NotifContext = createContext<NotifState>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearAll: () => {},
});

function loadNotifications(): AppNotification[] {
  if (Platform.OS === "web") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function saveNotifications(notifs: AppNotification[]) {
  if (Platform.OS === "web") {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50))); } catch {}
  }
}

const DEMO_NOTIFICATIONS: Omit<AppNotification, "id" | "timestamp" | "read">[] = [
  { type: "match", title: "Match Coming Up!", message: "Brazil vs Germany kicks off in 2 hours" },
  { type: "value_bet", title: "New Value Bet", message: "High-edge opportunity found: Argentina vs France - Home Win" },
  { type: "result", title: "Match Result", message: "Spain 2 - 1 England. Your prediction was correct!" },
  { type: "system", title: "AI Model Updated", message: "Poisson AI v2 model has been recalibrated with latest data" },
];

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = loadNotifications();
    if (saved.length > 0) return saved;
    if (Platform.OS === "web") {
      try {
        if (localStorage.getItem(CLEARED_KEY) === "true") return [];
      } catch {}
    }
    return DEMO_NOTIFICATIONS.map((n, i) => ({
      ...n,
      id: `demo_${i}`,
      timestamp: Date.now() - i * 3600000,
      read: i > 1,
    }));
  });

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    const interval = setInterval(() => {
      const matchMessages = [
        { title: "Match Alert", message: "USA vs Mexico starts in 30 minutes!" },
        { title: "Live Update", message: "Japan vs South Korea - Halftime: 1-1" },
        { title: "Goal!", message: "France scores! France 1 - 0 Portugal" },
        { title: "New Value Bet", message: "Edge detected: Netherlands vs Italy - Draw" },
      ];
      const random = matchMessages[Math.floor(Math.random() * matchMessages.length)];
      addNotification({
        type: random.title.includes("Value") ? "value_bet" : "match",
        title: random.title,
        message: random.message,
      });
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const addNotification = useCallback((n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const newNotif: AppNotification = {
      ...n,
      id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
    if (Platform.OS === "web") {
      try { localStorage.removeItem(CLEARED_KEY); } catch {}
    }
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    if (Platform.OS === "web") {
      try { localStorage.setItem(CLEARED_KEY, "true"); } catch {}
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
