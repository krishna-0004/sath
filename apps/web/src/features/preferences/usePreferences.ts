import { useState, useEffect } from "react";

export interface PreferencesState {
  theme: "default" | "high-contrast";
  textSize: "normal" | "large";
}

function readPreferencesFromCookie(): PreferencesState {
  if (typeof document === "undefined") {
    return { theme: "default", textSize: "normal" };
  }

  const match = document.cookie.match(/(?:^|; )saath_pref=([^;]*)/);
  if (!match || !match[1]) {
    return { theme: "default", textSize: "normal" };
  }

  const val = decodeURIComponent(match[1]);
  const parts = val.split("&");
  let theme: "default" | "high-contrast" = "default";
  let textSize: "normal" | "large" = "normal";

  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k === "theme" && (v === "high-contrast" || v === "default")) {
      theme = v;
    }
    if (k === "textSize" && (v === "large" || v === "normal")) {
      textSize = v;
    }
  }

  return { theme, textSize };
}

function writePreferencesToCookie(prefs: PreferencesState): void {
  const cookieVal = `theme=${prefs.theme}&textSize=${prefs.textSize}`;
  const maxAge = 365 * 24 * 60 * 60; // 1 year
  document.cookie = `saath_pref=${encodeURIComponent(cookieVal)}; SameSite=Lax; path=/; max-age=${maxAge}`;

  // Apply to document root
  if (prefs.theme === "high-contrast") {
    document.documentElement.setAttribute("data-theme", "high-contrast");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  if (prefs.textSize === "large") {
    document.documentElement.setAttribute("data-text-size", "large");
  } else {
    document.documentElement.removeAttribute("data-text-size");
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<PreferencesState>(readPreferencesFromCookie);

  useEffect(() => {
    writePreferencesToCookie(prefs);
  }, [prefs]);

  const toggleTheme = (): void => {
    setPrefs((prev) => ({
      ...prev,
      theme: prev.theme === "high-contrast" ? "default" : "high-contrast",
    }));
  };

  const toggleTextSize = (): void => {
    setPrefs((prev) => ({
      ...prev,
      textSize: prev.textSize === "large" ? "normal" : "large",
    }));
  };

  return {
    prefs,
    toggleTheme,
    toggleTextSize,
    isHighContrast: prefs.theme === "high-contrast",
    isLargeText: prefs.textSize === "large",
  };
}
