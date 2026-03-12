import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Platform, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
  expoPushToken: string | null;
  addNotification: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = "kicksight_notifications";
const CLEARED_KEY = "kicksight_notifications_cleared";

const NotifContext = createContext<NotifState>({
  notifications: [],
  unreadCount: 0,
  expoPushToken: null,
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
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    saveNotifications(notifications);
  }, [notifications]);

  // Register push notifications on native platforms
  useEffect(() => {
    if (Platform.OS === "web") return;

    async function registerForPushNotifications() {
      if (!Device.isDevice) {
        console.log("[PUSH] Must use physical device for push notifications");
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("[PUSH] Permission not granted");
        return;
      }

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
        setExpoPushToken(tokenData.data);
        console.log("[PUSH] Token:", tokenData.data);
      } catch (err) {
        console.log("[PUSH] Token error:", err);
      }

      if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
          name: "Default",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#00E676",
        });
      }
    }

    registerForPushNotifications();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      addNotification({
        type: (data?.type as any) || "system",
        title: title || "KickSight",
        message: body || "",
        data,
      });
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      console.log("[PUSH] Tapped notification:", data);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
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

  const unreadCount = React.useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, expoPushToken, addNotification, markAsRead, markAllAsRead, clearAll }}>
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotifContext);
}
