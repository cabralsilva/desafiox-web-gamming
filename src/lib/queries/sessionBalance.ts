import { formatMoneyBR } from "@/lib/money";

/** Saldo da sessão: última movimentação COMPLETED. Não há relação para populate. */
export const SESSION_BALANCE_SELECT = "balanceAfter";

export const CONCEALED_MONEY = "R$ •••••";

export type SessionBalanceStatus = "idle" | "loading" | "ready" | "unavailable";

/** Texto único do saldo global. O topo e a carteira usam este valor. */
export function sessionBalanceText(signedIn: boolean, status: SessionBalanceStatus, balance: number | null, visible = true) {
  if (!signedIn) return "—";
  if (status === "idle" || status === "loading") return "…";
  if (!visible) return CONCEALED_MONEY;
  if (balance == null) return "—";
  return formatMoneyBR(balance);
}

export function presentMoney(formatted: string, visible: boolean) {
  return visible ? formatted : CONCEALED_MONEY;
}

export function sessionBalancePath() {
  const params = new URLSearchParams({
    orderBy: "confirmDateTime",
    orderSense: "desc",
    status: "COMPLETED",
    limit: "1",
    select: SESSION_BALANCE_SELECT,
  });
  return `/wallet-moviment?${params.toString()}`;
}

export function readBalanceAfter(payload: unknown): number | null {
  const record = firstRecord(payload);
  if (!record) return null;
  const value = record.balanceAfter;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function firstRecord(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) return firstRecord(payload[0]);
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if ("balanceAfter" in record) return record;
  for (const key of ["items", "docs", "data", "results"]) {
    if (key in record) {
      const found = firstRecord(record[key]);
      if (found) return found;
    }
  }
  return null;
}
