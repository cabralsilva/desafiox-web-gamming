import type { IPage, IPaging } from "@/types/paging";

const PAGING_FIELDS = ["total", "page", "limit", "totalPages", "startIndex", "endIndex"] as const;

/** Monta o envelope de paginação que a API devolve em toda pesquisa. */
export function buildPaging(total: number, page: number, limit: number): IPaging {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeLimit = Math.max(1, Math.floor(limit));
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / safeLimit);
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  const safePage = totalPages === 0 ? 1 : Math.min(Math.max(1, requested), totalPages);
  if (safeTotal === 0) {
    return {
      total: 0,
      page: safePage,
      limit: safeLimit,
      totalPages: 0,
      startIndex: 0,
      endIndex: 0,
    };
  }
  return {
    total: safeTotal,
    page: safePage,
    limit: safeLimit,
    totalPages,
    startIndex: (safePage - 1) * safeLimit + 1,
    endIndex: Math.min(safePage * safeLimit, safeTotal),
  };
}

/** Recorta a página usando startIndex e endIndex, ambos inclusivos e começando em 1. */
export function sliceByPaging<T>(items: T[], paging: IPaging): T[] {
  if (paging.startIndex < 1 || paging.endIndex < paging.startIndex) return [];
  return items.slice(paging.startIndex - 1, paging.endIndex);
}

export function readPaging(value: unknown): IPaging | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const paging = {} as IPaging;
  for (const field of PAGING_FIELDS) {
    const number = record[field];
    if (typeof number !== "number" || !Number.isInteger(number)) return null;
    paging[field] = number;
  }
  return paging;
}

/** Lê `{ items, paging }` sem reinterpretar os números da paginação. */
export function readPage<T>(value: unknown, readItem: (item: unknown) => T | null): IPage<T> | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const paging = readPaging(record.paging);
  if (!paging || !Array.isArray(record.items)) return null;
  const items: T[] = [];
  for (const item of record.items) {
    const parsed = readItem(item);
    if (parsed == null) return null;
    items.push(parsed);
  }
  return { items, paging };
}
