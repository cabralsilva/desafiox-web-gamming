import { apiRequest } from "@/lib/api";
import { parseListingControls, sortByField, type ListingControls, type SortField } from "@/lib/listing";
import { buildPaging, readPaging, sliceByPaging } from "@/lib/paging";
import { marketTicketCatalog } from "@/mocks/market";
import {
  MARKET_CHALLENGE_STATUS,
  MARKET_TICKET_POPULATE,
  MARKET_TICKET_SELECT,
  type IMarketTicketCard,
} from "@/types/marketTicket";
import type { IPage } from "@/types/paging";

export const MARKET_PAGE_LIMIT = 20;

export const MARKET_SORT_FIELDS: SortField[] = [
  { value: "_id", label: "Recentes" },
  { value: "code", label: "Código" },
  { value: "marketValue.value", label: "Valor" },
  { value: "points", label: "Pontos" },
  { value: "challenge.budgetAccumulated", label: "Prêmio" },
  { value: "challenge.name", label: "Desafio" },
];

const AVAILABILITY = ["sale", "proposal", "negotiation"] as const;
const OWNERS = ["me", "others"] as const;

export type MarketAvailability = (typeof AVAILABILITY)[number];
export type MarketOwnerFilter = (typeof OWNERS)[number];

export type MarketListQuery = ListingControls & {
  availability: MarketAvailability | null;
  owner: MarketOwnerFilter | null;
  ticketId: string | null;
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseMarketQuery(raw: { [key: string]: string | string[] | undefined }): MarketListQuery {
  const availability = first(raw.availability);
  const owner = first(raw.owner);
  const ticketId = first(raw.ticket).trim();
  return {
    ...parseListingControls(raw, MARKET_SORT_FIELDS),
    availability: AVAILABILITY.find((value) => value === availability) ?? null,
    owner: OWNERS.find((value) => value === owner) ?? null,
    ticketId: ticketId || null,
  };
}

export function marketHref(query: MarketListQuery, patch: Partial<MarketListQuery> = {}) {
  const next = { ...query, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.availability) params.set("availability", next.availability);
  if (next.owner) params.set("owner", next.owner);
  if (next.orderBy && next.orderBy !== MARKET_SORT_FIELDS[0]?.value) params.set("orderBy", next.orderBy);
  if (next.orderSense === "asc") params.set("orderSense", "asc");
  if (next.view === "list") params.set("view", "list");
  if (next.page > 1) params.set("page", String(next.page));
  const search = params.toString();
  return search ? `/mercado?${search}` : "/mercado";
}

export function publicMarketTicketPath(
  input: {
    page?: number;
    limit?: number;
    orderBy?: string;
    orderSense?: "asc" | "desc";
    search?: string;
    availability?: MarketAvailability | null;
    owner?: MarketOwnerFilter | null;
    accountId?: string | null;
  } = {},
) {
  const params = new URLSearchParams({
    populate: MARKET_TICKET_POPULATE,
    select: MARKET_TICKET_SELECT,
    page: String(input.page ?? 1),
    limit: String(input.limit ?? MARKET_PAGE_LIMIT),
    orderBy: input.orderBy ?? "_id",
    orderSense: input.orderSense ?? "desc",
  });
  params.set("challenge.statusIn", MARKET_CHALLENGE_STATUS);
  params.set("statusInGamming", "SCALLING");
  const search = input.search?.trim();
  if (search) params.set("searchText", search);
  if (input.availability === "sale") params.set("saleAuthorized", "true");
  if (input.availability === "proposal") params.set("saleAuthorized", "false");
  if (input.owner === "me" && input.accountId) params.set("account", input.accountId);
  if (input.owner === "others" && input.accountId) params.set("accountNotIn", input.accountId);
  return `/public/ticket?${params.toString()}`;
}

export function listMarketTickets(
  items: IMarketTicketCard[],
  query: MarketListQuery & { signedIn: boolean; accountId: string | null },
): IPage<IMarketTicketCard> {
  const q = query.q.trim().toLocaleLowerCase("pt-BR");
  const filtered = items.filter((item) => {
    if (query.availability === "sale" && !(item.saleAuthorized && !item.inNegotiation)) return false;
    if (query.availability === "proposal" && !(!item.saleAuthorized && !item.inNegotiation)) return false;
    if (query.availability === "negotiation" && !item.inNegotiation) return false;
    if (q) {
      const haystack = [item.code, item.challenge.name, item.challenge.championship.name]
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      if (!haystack.includes(q)) return false;
    }
    if (!query.signedIn || !query.owner || !query.accountId) return true;
    const mine = item.accountId === query.accountId;
    return query.owner === "me" ? mine : !mine;
  });
  const ordered = sortByField(filtered, query.orderBy, query.orderSense);
  const paging = buildPaging(ordered.length, query.page, MARKET_PAGE_LIMIT);
  return { items: sliceByPaging(ordered, paging), paging };
}

export function readMarketTicket(value: unknown): IMarketTicketCard | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = entityId(record._id ?? record.id);
  const code = text(record.code);
  const account = asRecord(record.account);
  const nickName = text(account?.nickName);
  const challenge = asRecord(record.challenge);
  const name = text(challenge?.name);
  if (!id || !code || !nickName || !name) return null;
  const championship = asRecord(challenge?.championship);
  const marketValue = readMarketValue(record.marketValue);
  return {
    _id: id,
    code,
    saleAuthorized: record.saleAuthorized === true,
    points: finiteNumber(record.points) ?? 0,
    marketValue: marketValue == null ? undefined : { value: marketValue },
    inNegotiation: record.inNegotiation === true,
    accountId: entityId(account?._id ?? account?.id),
    account: { nickName },
    challenge: {
      name,
      descriptionLong: text(challenge?.descriptionLong),
      budgetAccumulated: finiteNumber(challenge?.budgetAccumulated) ?? 0,
      currentRoundIndex: roundIndex(challenge?.currentRound),
      roundEndIndex: roundIndex(challenge?.roundEnd),
      championship: {
        name: text(championship?.name),
        modality: text(championship?.modality) as IMarketTicketCard["challenge"]["championship"]["modality"],
      },
    },
  };
}

export function readMarketPage(payload: unknown): IPage<IMarketTicketCard> | null {
  const record = pageRecord(payload);
  if (!record || !Array.isArray(record.items)) return null;
  const items = record.items.flatMap((item) => {
    const ticket = readMarketTicket(item);
    return ticket ? [ticket] : [];
  });
  const paging = readPaging(record.paging) ?? buildPaging(items.length, 1, MARKET_PAGE_LIMIT);
  return { items, paging };
}

export async function loadMarketPage(query: MarketListQuery): Promise<IPage<IMarketTicketCard>> {
  const live = await loadLiveMarket(query, null);
  if (live) return refineLivePage(live, query.availability);
  return listMarketTickets(marketTicketCatalog, { ...query, owner: null, signedIn: false, accountId: null });
}

export async function loadMarketForSession(
  query: MarketListQuery,
  accountId: string,
): Promise<IPage<IMarketTicketCard>> {
  const live = await loadLiveMarket(query, accountId);
  if (live) return refineLivePage(live, query.availability);
  return listMarketTickets(marketTicketCatalog, { ...query, signedIn: true, accountId });
}

async function loadLiveMarket(query: MarketListQuery, accountId: string | null): Promise<IPage<IMarketTicketCard> | null> {
  if (!process.env.NEXT_PUBLIC_API_URL) return null;
  try {
    const response = await apiRequest(pathFor(query, accountId));
    if (response.ok) return readMarketPage(await response.json());
    if (!accountId || !query.owner) return null;
    const plain = await apiRequest(pathFor({ ...query, owner: null }, null));
    if (!plain.ok) return null;
    const page = readMarketPage(await plain.json());
    if (!page) return null;
    return listMarketTickets(page.items, { ...query, page: 1, signedIn: true, accountId });
  } catch {
    return null;
  }
}

function pathFor(query: MarketListQuery, accountId: string | null) {
  return publicMarketTicketPath({
    page: query.page,
    limit: MARKET_PAGE_LIMIT,
    orderBy: query.orderBy,
    orderSense: query.orderSense,
    search: query.q,
    availability: query.availability === "negotiation" ? null : query.availability,
    owner: accountId ? query.owner : null,
    accountId,
  });
}

function refineLivePage(page: IPage<IMarketTicketCard>, availability: MarketAvailability | null): IPage<IMarketTicketCard> {
  if (availability === "negotiation") {
    const items = page.items.filter((item) => item.inNegotiation);
    return { items, paging: buildPaging(items.length, 1, page.paging.limit) };
  }
  if (availability === "sale" || availability === "proposal") {
    return { ...page, items: page.items.filter((item) => !item.inNegotiation) };
  }
  return page;
}

function pageRecord(payload: unknown): Record<string, unknown> | null {
  const record = asRecord(payload);
  if (!record) return null;
  if (Array.isArray(record.items)) return record;
  const data = asRecord(record.data);
  if (data && Array.isArray(data.items)) return data;
  return null;
}

function readMarketValue(value: unknown): number | null {
  if (typeof value === "number" || typeof value === "string") return finiteNumber(value);
  const record = asRecord(value);
  if (!record) return null;
  return finiteNumber(record.value);
}

function roundIndex(value: unknown): number | null {
  if (typeof value === "number") return finiteNumber(value);
  const record = asRecord(value);
  if (!record) return null;
  return finiteNumber(record.globalRoundIndex);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function entityId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  const record = asRecord(value);
  if (!record) return "";
  return text(record._id ?? record.id ?? record.$oid);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
