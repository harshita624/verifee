"use client";

import { useState, useEffect, useCallback } from "react";

let globalUser = null;
let listeners = [];
let authCheckPromise = null;
let authVersion = 0;

function notify() {
  listeners.forEach((fn) => fn(globalUser));
}

export function clearAuthSession() {
  authVersion += 1;
  authCheckPromise = null;
  if (typeof window !== "undefined") localStorage.removeItem("vf_token");
  globalUser = null;
  notify();
}

export function useAuth() {
  const [user, setUser] = useState(globalUser);
  const [loading, setLoading] = useState(!globalUser);

  useEffect(() => {
    const handler = (u) => setUser(u);
    listeners.push(handler);

    if (!globalUser) {
      const token = typeof window !== "undefined" ? localStorage.getItem("vf_token") : null;
      if (!token) {
        setLoading(false);
        return () => { listeners = listeners.filter((l) => l !== handler); };
      }

      if (!authCheckPromise) {
        const version = authVersion;
        const authUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/auth/me`;
        const request = fetch(authUrl, { headers: { Authorization: `Bearer ${token}` } })
          .then(async (response) => {
            const data = await response.json().catch(() => null);
            if (version !== authVersion || localStorage.getItem("vf_token") !== token) return;
            if (response.status === 401 || response.status === 403) {
              clearAuthSession();
            } else if (response.ok && data?.success) {
              globalUser = data.data.user;
              notify();
            }
          })
          .catch(() => {})
          .finally(() => {
            if (authCheckPromise === request) authCheckPromise = null;
            setLoading(false);
          });
        authCheckPromise = request;
      } else {
        authCheckPromise.finally(() => setLoading(false));
      }
    } else {
      setLoading(false);
    }

    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    window.location.href = "/";
  }, []);

  const setLoggedIn = useCallback((userData) => {
    authVersion += 1;
    authCheckPromise = null;
    globalUser = userData;
    notify();
  }, []);

  return { user, loading, logout, setLoggedIn };
}
