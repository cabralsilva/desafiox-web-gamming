"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { readBalanceAfter, sessionBalancePath } from "@/lib/queries/sessionBalance";
import { consumeReturnIntent } from "@/lib/returnIntent";
import { getAuthToken, subscribeSession } from "@/lib/session";
import { latestCompletedBalance } from "@/lib/wallet";
import { walletMovementCatalog } from "@/mocks/wallet";

const VALUES_VISIBLE_KEY = "desafiox_wallet_values_visible";

type SessionContextValue = {
  signedIn: boolean;
  balance: number | null;
  balanceStatus: "idle" | "loading" | "ready" | "unavailable";
  reloadBalance: () => void;
  valuesVisible: boolean;
  toggleValuesVisible: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<SessionContextValue["balanceStatus"]>("idle");
  const [balanceTick, setBalanceTick] = useState(0);
  const [valuesVisible, setValuesVisible] = useState(true);
  const reloadBalance = useCallback(() => setBalanceTick((value) => value + 1), []);
  const toggleValuesVisible = useCallback(() => {
    setValuesVisible((current) => {
      const next = !current;
      window.localStorage.setItem(VALUES_VISIBLE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  useEffect(() => {
    setValuesVisible(window.localStorage.getItem(VALUES_VISIBLE_KEY) !== "0");
  }, []);

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
      setBalance(latestCompletedBalance(walletMovementCatalog));
      setBalanceStatus("ready");
      return;
    }

    let cancelled = false;
    setBalanceStatus((current) => (current === "ready" ? current : "loading"));
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
  }, [token, balanceTick]);

  const value = useMemo<SessionContextValue>(
    () => ({
      signedIn: Boolean(token),
      balance,
      balanceStatus,
      reloadBalance,
      valuesVisible,
      toggleValuesVisible,
    }),
    [token, balance, balanceStatus, reloadBalance, valuesVisible, toggleValuesVisible],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession precisa do SessionProvider.");
  return value;
}
