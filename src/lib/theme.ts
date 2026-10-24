import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "contrast" | "system";
export type TextSize = "normal" | "large";

export const THEME_KEY = "mc-theme";
export const TEXT_SIZE_KEY = "mc-text-size";

const VALID_THEMES: ThemeMode[] = ["light", "dark", "contrast", "system"];

/** Resolves "system" using the device's color-scheme and contrast preferences. */
export function systemTheme(): "light" | "dark" | "contrast" {
  if (typeof window === "undefined") return "light";
  if (window.matchMedia("(prefers-contrast: more)").matches) return "contrast";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" | "contrast" {
  return mode === "system" ? systemTheme() : mode;
}

function readMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored && (VALID_THEMES as string[]).includes(stored) ? (stored as ThemeMode) : "system";
}

function readTextSize(): TextSize {
  if (typeof window === "undefined") return "normal";
  return window.localStorage.getItem(TEXT_SIZE_KEY) === "large" ? "large" : "normal";
}

/** Applies the resolved theme class and text size to <html>. */
export function applyTheme(mode: ThemeMode, size: TextSize) {
  const root = document.documentElement;
  const resolved = resolveTheme(mode);
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("contrast", resolved === "contrast");
  root.dataset["textSize"] = size;
  root.style.colorScheme = resolved === "dark" ? "dark" : "light";
}

const listeners = new Set<() => void>();
function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setThemeMode(mode: ThemeMode) {
  window.localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode, readTextSize());
  emit();
}

export function setTextSize(size: TextSize) {
  window.localStorage.setItem(TEXT_SIZE_KEY, size);
  applyTheme(readMode(), size);
  emit();
}

/** Re-applies stored preferences and follows device changes while on "system". */
export function initTheme() {
  const apply = () => applyTheme(readMode(), readTextSize());
  apply();
  const onSystemChange = () => {
    if (readMode() === "system") apply();
  };
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const contrastQuery = window.matchMedia("(prefers-contrast: more)");
  darkQuery.addEventListener("change", onSystemChange);
  contrastQuery.addEventListener("change", onSystemChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY || event.key === TEXT_SIZE_KEY) {
      apply();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    darkQuery.removeEventListener("change", onSystemChange);
    contrastQuery.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Subscribes a component to the stored theme mode and text size. */
export function useTheme() {
  const mode = useSyncExternalStore(subscribe, readMode, () => "system" as ThemeMode);
  const textSize = useSyncExternalStore(subscribe, readTextSize, () => "normal" as TextSize);
  return { mode, textSize };
}

/** Runs before first paint to avoid a theme flash. Keep in sync with applyTheme. */
export const THEME_INIT_SCRIPT = `(function(){try{var m=localStorage.getItem("${THEME_KEY}")||"system";var s=localStorage.getItem("${TEXT_SIZE_KEY}")||"normal";var r=m;if(m==="system"){r=window.matchMedia("(prefers-contrast: more)").matches?"contrast":window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}var d=document.documentElement;d.classList.toggle("dark",r==="dark");d.classList.toggle("contrast",r==="contrast");d.dataset.textSize=s;d.style.colorScheme=r==="dark"?"dark":"light";}catch(e){}})();`;
