import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as api from "../api/client";

const TOKEN_KEY = "jogaar:token";
const AuthContext = createContext(null);

function readToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch (_) {
    return null;
  }
}

function writeToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch (_) {}
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken);
  const [user, setUser] = useState(null);
  const [savedIds, setSavedIds] = useState([]);
  const [ready, setReady] = useState(!readToken());

  const clearSession = useCallback(() => {
    writeToken(null);
    setToken(null);
    setUser(null);
    setSavedIds([]);
  }, []);

  // Restore the session on load.
  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setReady(true);
      return undefined;
    }
    api
      .getCurrentUser(token)
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && clearSession())
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
    // Only on first mount; later changes go through login/logout below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the user's saved campaigns whenever they sign in.
  useEffect(() => {
    let cancelled = false;
    if (!token || !user) return undefined;
    api
      .getSavedIds(token)
      .then((ids) => !cancelled && setSavedIds(ids))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const startSession = useCallback(({ token: t, user: u }) => {
    writeToken(t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async (credentials) => startSession(await api.login(credentials)), [startSession]);
  const register = useCallback(async (details) => startSession(await api.register(details)), [startSession]);

  const logout = useCallback(async () => {
    try {
      await api.logout(token);
    } finally {
      clearSession();
    }
  }, [token, clearSession]);

  const updateProfile = useCallback(
    async (changes) => {
      const u = await api.updateProfile(token, changes);
      setUser(u);
      return u;
    },
    [token]
  );

  const toggleSaved = useCallback(
    async (campaignId) => {
      const ids = await api.toggleSaved(token, campaignId);
      setSavedIds(ids);
      return ids.includes(campaignId);
    },
    [token]
  );

  const value = useMemo(
    () => ({ user, token, ready, savedIds, login, register, logout, updateProfile, toggleSaved }),
    [user, token, ready, savedIds, login, register, logout, updateProfile, toggleSaved]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
