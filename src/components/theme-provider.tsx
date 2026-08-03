"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "auto";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "auto",
  theme: "light",
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [theme, setTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Helper to calculate theme based on mode or time of day
  const resolveTheme = (m: ThemeMode): ResolvedTheme => {
    if (m === "light") return "light";
    if (m === "dark") return "dark";
    // "auto" mode: 18:00 to 06:00 is dark mode, 06:00 to 18:00 is light mode
    const hour = new Date().getHours();
    return hour >= 18 || hour < 6 ? "dark" : "light";
  };

  useEffect(() => {
    setMounted(true);
    const savedMode = (localStorage.getItem("app-theme-mode") as ThemeMode) || "auto";
    setModeState(savedMode);
    const resolved = resolveTheme(savedMode);
    setTheme(resolved);

    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const applyMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("app-theme-mode", newMode);
    const resolved = resolveTheme(newMode);
    setTheme(resolved);

    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = theme === "light" ? "dark" : "light";
    applyMode(nextMode);
  };

  // Periodic check for auto mode time change
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      if (mode === "auto") {
        const resolved = resolveTheme("auto");
        setTheme(resolved);
        if (resolved === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [mode, mounted]);

  return (
    <ThemeContext.Provider value={{ mode, theme, setMode: applyMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
