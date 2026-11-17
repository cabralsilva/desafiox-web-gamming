"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { readBalanceAfter, sessionBalancePath } from "@/lib/queries/sessionBalance";
import { consumeReturnIntent } from "@/lib/returnIntent";
import { getAuthToken, subscribeSession } from "@/lib/session";

type SessionContextValue = {
  signedIn: boolean;
  balance: number | null;
  balanceStatus: "idle" | "loading" | "ready" | "unavailable";
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<SessionContextValue["balanceStatus"]>("idle");

  useEffect(() => {
    setToken(getAuthToken());
    setReady(true);
    return subscribeSession(() => setToken(getAuthToken()));
  }, []);

  useEffect(() => {
    if (!ready || !token) return;
    const intent = consumeReturnIntent();
    if (!intent) return;
    const target = `${intent.pathname}${intent.search}`;
    const here = `${window.location.pathname}${window.location.search}`;
    if (here !== target) router.replace(target);
  }, [ready, token, router]);

  useEffect(() => {
    if (!token) {
      setBalance(null);
      setBalanceStatus("idle");
      return;
    }
    if (!process.env.NEXT_PUBLIC_API_URL) {
      setBalance(null);
      setBalanceStatus("unavailable");
      return;
    }

    let cancelled = false;
    setBalanceStatus("loading");
    void apiRequest(sessionBalancePath(), { auth: true })
      .then(async (response) => {
        if (cancelled || response.status === 401) return;
        if (!response.ok) {
          setBalanceStatus("unavailable");
          return;
        }
        const value = readBalanceAfter(await response.json());
        setBalance(value);
        setBalanceStatus(value == null ? "unavailable" : "ready");
      })
      .catch(() => {
        if (!cancelled) setBalanceStatus("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo<SessionContextValue>(
    () => ({
      signedIn: Boolean(token),
      balance,
      balanceStatus,
    }),
    [token, balance, balanceStatus],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession precisa do SessionProvider.");
  return value;
}
