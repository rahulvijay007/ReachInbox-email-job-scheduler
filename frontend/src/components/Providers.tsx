"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider } from "./ui/Toast";
import { UserProvider } from "@/lib/UserContext";
import { EmailsProvider } from "@/lib/EmailsContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <UserProvider>
          <EmailsProvider>{children}</EmailsProvider>
        </UserProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
