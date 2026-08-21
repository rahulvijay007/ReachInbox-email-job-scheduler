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
 * Once NextAuth has a Google id_token, we exchange it once for a
 * backend-issued httpOnly cookie (POST /api/auth/google) and keep the
 * canonical user profile (name/email/avatar) from the backend response.
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      if (status === "loading") return;

      if (status === "unauthenticated" || !session?.idToken) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { user: backendUser } = await api.exchangeGoogleSession(session.idToken);
        if (!cancelled) setUser(backendUser);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    sync();
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
