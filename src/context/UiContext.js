import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiX } from "react-icons/hi";

const THEME_KEY = "jogaar:theme";
const UiContext = createContext(null);

function readTheme() {
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") return t;
  } catch (_) {}
  return "system";
}

function systemPrefersDark() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

const ICONS = { success: HiCheckCircle, error: HiExclamationCircle, info: HiInformationCircle };

export function UiProvider({ children }) {
  /* ------------------------------ theme ------------------------------ */
  const [theme, setThemeState] = useState(readTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemDark(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    return () => mq.removeEventListener && mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolvedTheme === "dark" ? "#0d1512" : "#0b7a55");
  }, [resolvedTheme]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    try {
      if (t === "system") window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, t);
    } catch (_) {}
  }, []);

  const toggleTheme = useCallback(
    () => setTheme(resolvedTheme === "dark" ? "light" : "dark"),
    [resolvedTheme, setTheme]
  );

  /* ------------------------------ toasts ----------------------------- */
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = "success") => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, toast }),
    [theme, resolvedTheme, setTheme, toggleTheme, toast]
  );

  return (
    <UiContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || HiInformationCircle;
          return (
            <div key={t.id} className={`toast toast--${t.type}`} role="status">
              <Icon size={20} />
              <span>{t.message}</span>
              <button aria-label="Dismiss" onClick={() => dismiss(t.id)}>
                <HiX />
              </button>
            </div>
          );
        })}
      </div>
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside <UiProvider>");
  return ctx;
}
