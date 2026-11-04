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
  const [ready, setReady] = useState(!readToken());

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
      .catch(() => {
        if (cancelled) return;
        writeToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
    // Only on first mount; later changes go through login/logout below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = useCallback(({ token: t, user: u }) => {
    writeToken(t);
    setToken(t);
    setUser(u);
    return u;
  }, []);

  const login = useCallback(
    async (credentials) => startSession(await api.login(credentials)),
    [startSession]
  );

  const register = useCallback(
    async (details) => startSession(await api.register(details)),
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout(token);
    } finally {
      writeToken(null);
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const updateProfile = useCallback(
    async (changes) => {
      const u = await api.updateProfile(token, changes);
      setUser(u);
      return u;
    },
    [token]
  );

  const value = useMemo(
    () => ({ user, token, ready, login, register, logout, updateProfile }),
    [user, token, ready, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
