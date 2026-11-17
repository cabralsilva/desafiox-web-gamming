import { buildPaging, sliceByPaging } from "@/lib/paging";
import type { IPage } from "@/types/paging";
import type { IPublicChallengeCard } from "@/types/publicChallenge";

export const CHALLENGE_PAGE_LIMIT = 12;

const STATUS_FILTERS = ["OPEN_TO_BUY_TICKETS", "RUNNING", "FINISHED"] as const;

export type ChallengeStatusFilter = (typeof STATUS_FILTERS)[number];
export type ChallengeTicketFilter = "active" | "eliminated";

export type ChallengeListQuery = {
  q: string;
  status: ChallengeStatusFilter | null;
  tickets: ChallengeTicketFilter | null;
  page: number;
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseChallengeQuery(raw: {
  [key: string]: string | string[] | undefined;
}): ChallengeListQuery {
  const statusValue = first(raw.status);
  const ticketsValue = first(raw.tickets);
  const pageNumber = Number(first(raw.page));
  return {
    q: first(raw.q).trim().slice(0, 80),
    status: STATUS_FILTERS.find((status) => status === statusValue) ?? null,
    tickets: ticketsValue === "active" || ticketsValue === "eliminated" ? ticketsValue : null,
    page: Number.isInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1,
  };
}

export function challengeHref(query: ChallengeListQuery, patch: Partial<ChallengeListQuery> = {}) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.tickets) params.set("tickets", next.tickets);
  if (next.page > 1) params.set("page", String(next.page));
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export function listChallenges(
  items: IPublicChallengeCard[],
  query: ChallengeListQuery & { signedIn: boolean },
): IPage<IPublicChallengeCard> {
  const q = query.q.trim().toLocaleLowerCase("pt-BR");
  const filtered = items.filter((item) => {
    if (item.status === "DRAFT") return false;
    if (query.status && item.status !== query.status) return false;
    if (q && !item.name.toLocaleLowerCase("pt-BR").includes(q)) return false;
    if (!query.signedIn || !query.tickets) return true;
    const summary = item.myTickets;
    if (query.tickets === "active") return (summary?.active ?? 0) > 0;
    return Boolean(summary && summary.total > 0 && summary.active === 0);
  });
  const paging = buildPaging(filtered.length, query.page, CHALLENGE_PAGE_LIMIT);
  return { items: sliceByPaging(filtered, paging), paging };
}
