"use client";

import { createContext, useContext, type ReactNode } from "react";

const AuthDialogContext = createContext<(() => void) | null>(null);

export function AuthDialogProvider({ openAuth, children }: { openAuth: () => void; children: ReactNode }) {
  return <AuthDialogContext.Provider value={openAuth}>{children}</AuthDialogContext.Provider>;
}

export function useOpenAuthDialog() {
  const openAuth = useContext(AuthDialogContext);
  if (!openAuth) throw new Error("useOpenAuthDialog precisa do diálogo de acesso.");
  return openAuth;
}
