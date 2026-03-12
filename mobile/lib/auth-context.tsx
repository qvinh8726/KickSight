import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import { API_URL, setAuthToken } from "./query-client";

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (accessToken: string, userInfo: any) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  loginWithGoogle: async () => {},
  register: async () => {},
  logout: () => {},
});

const STORAGE_KEY = "kicksight_auth_token";
const USER_KEY = "kicksight_auth_user";

async function saveToStorage(key: string, value: string) {
  if (Platform.OS === "web") {
    try { localStorage.setItem(key, value); } catch {}
  } else {
    try {
      const SecureStore = require("expo-secure-store");
      await SecureStore.setItemAsync(key, value);
    } catch {}
  }
}

async function getFromStorage(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try { return localStorage.getItem(key); } catch { return null; }
  } else {
    try {
      const SecureStore = require("expo-secure-store");
      return await SecureStore.getItemAsync(key);
    } catch { return null; }
  }
}

async function removeFromStorage(key: string) {
  if (Platform.OS === "web") {
    try { localStorage.removeItem(key); } catch {}
  } else {
    try {
      const SecureStore = require("expo-secure-store");
      await SecureStore.deleteItemAsync(key);
    } catch {}
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await getFromStorage(STORAGE_KEY);
        if (savedToken) {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setToken(savedToken);
            setAuthToken(savedToken);
            setUser(data.user);
          } else {
            await removeFromStorage(STORAGE_KEY);
            await removeFromStorage(USER_KEY);
          }
        }
      } catch {
        await removeFromStorage(STORAGE_KEY);
        await removeFromStorage(USER_KEY);
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setToken(data.token);
    setAuthToken(data.token);
    setUser(data.user);
    await saveToStorage(STORAGE_KEY, data.token);
    await saveToStorage(USER_KEY, JSON.stringify(data.user));
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string, userInfo: any) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, userInfo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Google login failed");
    setToken(data.token);
    setAuthToken(data.token);
    setUser(data.user);
    await saveToStorage(STORAGE_KEY, data.token);
    await saveToStorage(USER_KEY, JSON.stringify(data.user));
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setToken(data.token);
    setAuthToken(data.token);
    setUser(data.user);
    await saveToStorage(STORAGE_KEY, data.token);
    await saveToStorage(USER_KEY, JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAuthToken(null);
    setUser(null);
    removeFromStorage(STORAGE_KEY);
    removeFromStorage(USER_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!token, login, loginWithGoogle, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
