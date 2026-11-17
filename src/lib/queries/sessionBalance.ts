/** Saldo da sessão: última movimentação COMPLETED. Não há relação para populate. */
export const SESSION_BALANCE_SELECT = "balanceAfter";

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
