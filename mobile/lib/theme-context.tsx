import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";

type ThemeMode = "dark" | "light";

const THEME_KEY = "kicksight_theme";

const darkColors = {
  bg: "#0B0F1A",
  card: "#131B2E",
  cardAccent: "#0D1A14",
  border: "#1C2540",
  borderAccent: "#00E67630",
  text: "#FFFFFF",
  textSecondary: "#8892A4",
  textMuted: "#4A5568",
  accent: "#00E676",
  accentBg: "#00E67615",
  accentBorder: "#00E67625",
  danger: "#FF5252",
  dangerBg: "#FF525215",
  dangerBorder: "#FF525230",
  blue: "#3B82F6",
  blueBg: "#3B82F615",
  purple: "#A78BFA",
  purpleBg: "#A78BFA15",
  yellow: "#FFD93D",
  orange: "#FFB74D",
  tabBar: "#0F1521",
  tabBorder: "#1C2540",
  overlay: "#0B0F1A80",
  inputBg: "#131B2E",
  probDraw: "#2D3748",
};

const lightColors = {
  bg: "#F5F7FA",
  card: "#FFFFFF",
  cardAccent: "#F0FFF4",
  border: "#E2E8F0",
  borderAccent: "#00E67640",
  text: "#1A202C",
  textSecondary: "#4A5568",
  textMuted: "#718096",
  accent: "#00C853",
  accentBg: "#00C85315",
  accentBorder: "#00C85325",
  danger: "#E53E3E",
  dangerBg: "#FED7D7",
  dangerBorder: "#FEB2B2",
  blue: "#3182CE",
  blueBg: "#EBF8FF",
  purple: "#805AD5",
  purpleBg: "#FAF5FF",
  yellow: "#D69E2E",
  orange: "#DD6B20",
  tabBar: "#FFFFFF",
  tabBorder: "#E2E8F0",
  overlay: "#F5F7FA80",
  inputBg: "#EDF2F7",
  probDraw: "#CBD5E0",
};

export type ThemeColors = typeof darkColors;

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  isDark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState>({
  mode: "dark",
  colors: darkColors,
  isDark: true,
  toggle: () => {},
});

function loadTheme(): ThemeMode {
  if (Platform.OS === "web") {
    try {
      return (localStorage.getItem(THEME_KEY) as ThemeMode) || "dark";
    } catch {
      return "dark";
    }
  }
  return "dark";
}

function saveTheme(mode: ThemeMode) {
  if (Platform.OS === "web") {
    try { localStorage.setItem(THEME_KEY, mode); } catch {}
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(loadTheme);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      saveTheme(next);
      return next;
    });
  }, []);

  const colors = mode === "dark" ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark: mode === "dark", toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
