import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiX } from "react-icons/hi";
import { ERROR_BN, STRINGS } from "../i18n/strings";
import { setLocale } from "../utils/format";

const THEME_KEY = "jogaar:theme";
const LANG_KEY = "jogaar:lang";

function readLang() {
  try {
    const l = window.localStorage.getItem(LANG_KEY);
    if (l === "en" || l === "bn") return l;
  } catch (_) {}
  return "en";
}
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

  /* ----------------------------- language ---------------------------- */
  const [lang, setLangState] = useState(() => {
    const l = readLang();
    setLocale(l);
    return l;
  });

  const setLang = useCallback((l) => {
    setLocale(l);
    setLangState(l);
    try {
      window.localStorage.setItem(LANG_KEY, l);
    } catch (_) {}
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang === "bn" ? "bn" : "en");
  }, [lang]);

  /** Translates a key, filling {placeholders} from vars. */
  const t = useCallback(
    (key, vars) => {
      let text = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.en[key] || key;
      if (vars) {
        text = text.replace(/\{(\w+)\}/g, (m, name) => (vars[name] !== undefined ? String(vars[name]) : m));
      }
      return text;
    },
    [lang]
  );

  /** Translates a message coming from the data layer or server. */
  const tErr = useCallback(
    (message) => (lang === "bn" && ERROR_BN[message]) || message || t("common.generic"),
    [lang, t]
  );

  /* ------------------------------ toasts ----------------------------- */
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = "success") => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme, toast, lang, setLang, t, tErr }),
    [theme, resolvedTheme, setTheme, toggleTheme, toast, lang, setLang, t, tErr]
  );

  return (
    <UiContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((item) => {
          const Icon = ICONS[item.type] || HiInformationCircle;
          return (
            <div key={item.id} className={`toast toast--${item.type}`} role="status">
              <Icon size={20} />
              <span>{item.message}</span>
              <button aria-label={t("common.dismiss")} onClick={() => dismiss(item.id)}>
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
