"use client";

import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface EmailsContextValue {
  /** Bumped whenever a batch is scheduled, so tables/counts elsewhere refetch. */
  version: number;
  notifyChanged: () => void;
}

const EmailsContext = createContext<EmailsContextValue>({ version: 0, notifyChanged: () => {} });

export function EmailsProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const notifyChanged = useCallback(() => setVersion((v) => v + 1), []);
  return <EmailsContext.Provider value={{ version, notifyChanged }}>{children}</EmailsContext.Provider>;
}

export function useEmailsVersion() {
  return useContext(EmailsContext);
}
