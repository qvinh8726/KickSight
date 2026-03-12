import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Platform } from "react-native";

type ThemeMode = "dark" | "light";

const THEME_KEY = "kicksight_theme";

const darkColors = {
  // ── Backgrounds ──────────────────────────────────────────────
  bg:           "#0F1015",   // main bg — near-black with blue tint
  card:         "#181C25",   // card / list surface
  cardHigh:     "#1E2333",   // elevated cards
  cardAccent:   "#152030",   // accent-tinted card
  // ── Borders / Separators ─────────────────────────────────────
  border:       "#232A3E",   // standard border
  borderLight:  "#1A2130",   // subtle dividers
  tabBorder:    "#1A1E2A",
  // ── Text ─────────────────────────────────────────────────────
  text:         "#DDE6F8",   // primary text
  textSecondary:"#7D8BA8",   // secondary
  textMuted:    "#3D4A66",   // muted / placeholder
  // ── Accent (Sofascore blue) ───────────────────────────────────
  accent:       "#0B7FFF",
  accentBg:     "#0B7FFF1A",
  accentBorder: "#0B7FFF30",
  // ── Status colors ────────────────────────────────────────────
  danger:       "#E63946",   // loss / error
  dangerBg:     "#E6394615",
  dangerBorder: "#E6394630",
  live:         "#E63946",   // live indicator
  liveBg:       "#E6394615",
  win:          "#2DC653",   // win / success
  winBg:        "#2DC65315",
  winBorder:    "#2DC65330",
  draw:         "#636B82",
  yellow:       "#F0BF26",
  orange:       "#F07B26",
  blue:         "#0B7FFF",
  blueBg:       "#0B7FFF15",
  purple:       "#9C6FFF",
  purpleBg:     "#9C6FFF15",
  // ── Tab bar ──────────────────────────────────────────────────
  tabBar:       "#0A0C13",
  // ── Misc ─────────────────────────────────────────────────────
  overlay:      "#0F101580",
  inputBg:      "#181C25",
  probDraw:     "#232A3E",
};

const lightColors = {
  bg:           "#F0F4FA",
  card:         "#FFFFFF",
  cardHigh:     "#F8FAFF",
  cardAccent:   "#EBF3FF",
  border:       "#D5DCE8",
  borderLight:  "#E4EAF4",
  tabBorder:    "#D5DCE8",
  text:         "#1A2035",
  textSecondary:"#4E5B78",
  textMuted:    "#8596B0",
  accent:       "#0B7FFF",
  accentBg:     "#0B7FFF15",
  accentBorder: "#0B7FFF30",
  danger:       "#DC2626",
  dangerBg:     "#FEE2E2",
  dangerBorder: "#FECACA",
  live:         "#DC2626",
  liveBg:       "#FEE2E2",
  win:          "#16A34A",
  winBg:        "#DCFCE7",
  winBorder:    "#BBF7D0",
  draw:         "#64748B",
  yellow:       "#CA8A04",
  orange:       "#EA580C",
  blue:         "#0B7FFF",
  blueBg:       "#EBF3FF",
  purple:       "#7C3AED",
  purpleBg:     "#EDE9FE",
  tabBar:       "#FFFFFF",
  overlay:      "#F0F4FA80",
  inputBg:      "#EEF2F8",
  probDraw:     "#D5DCE8",
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
  } else {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      AsyncStorage.setItem(THEME_KEY, mode);
    } catch {}
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
