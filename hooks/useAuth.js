"use client";

import { useState, useEffect, useCallback } from "react";

let globalUser = null;
let listeners = [];

function notify() {
  listeners.forEach((fn) => fn(globalUser));
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

      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            globalUser = data.data.user;
            notify();
          } else {
            localStorage.removeItem("vf_token");
          }
        })
        .catch(() => localStorage.removeItem("vf_token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("vf_token");
    globalUser = null;
    notify();
    window.location.href = "/";
  }, []);

  const setLoggedIn = useCallback((userData) => {
    globalUser = userData;
    notify();
  }, []);

  return { user, loading, logout, setLoggedIn };
}