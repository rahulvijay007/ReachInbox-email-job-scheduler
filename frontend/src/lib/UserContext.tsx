"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { api } from "./api";
import type { User } from "./types";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true, logout: async () => {} });

/**
 * Bridges NextAuth's Google OAuth session to our own backend session.
 *
 * On first login we exchange the fresh Google id_token for a backend-issued
 * httpOnly cookie (POST /api/auth/google). On every later visit we instead
 * check the existing backend cookie first (GET /api/auth/me) and only fall
 * back to a fresh exchange if that cookie is missing/expired. This matters
 * because NextAuth caches the *original* id_token for the life of its own
 * session (days), but a Google id_token itself is only valid for about an
 * hour — re-sending that same stale token to google-auth-library on every
 * page load would get rejected ("Token used too late") long after the user
 * is still validly logged in via our own cookie.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (status === "loading") return;

      if (status === "unauthenticated") {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        // Prefer the existing backend session — cheap and doesn't depend on
        // the (possibly hours-old) Google id_token still being valid.
        const { user: backendUser } = await api.me();
        if (!cancelled) setUser(backendUser);
        return;
      } catch {
        // No valid backend cookie yet — fall through to a fresh exchange
        // below, using the id_token NextAuth is currently holding.
      }

      if (!session?.idToken) {
        if (!cancelled) setUser(null);
        return;
      }

      try {
        const { user: backendUser } = await api.exchangeGoogleSession(session.idToken);
        if (!cancelled) setUser(backendUser);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    sync().finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [status, session?.idToken]);

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    await signOut({ callbackUrl: "/login" });
  };

  return <UserContext.Provider value={{ user, loading, logout }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
