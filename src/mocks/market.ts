import type { Modality } from "c2-desafiox";
import { buildPaging } from "../lib/paging";
import type { IMarketTicketCard, IPage } from "../types";

const rules = "<p>Regras do desafio na DESAFIOX.</p>";

function ticket(
  input: Pick<IMarketTicketCard, "_id" | "code" | "saleAuthorized" | "points" | "accountId" | "inNegotiation"> & {
    nickName: string;
    proposerNickName?: string;
    negotiationExpiresAt?: string;
    marketValue?: number;
    challengeName: string;
    challengeSlug: string;
    championship: string;
    modality: IMarketTicketCard["challenge"]["championship"]["modality"];
    prize: number;
    currentRound: number;
    roundEnd: number;
  },
): IMarketTicketCard {
  return {
    _id: input._id,
    code: input.code,
    saleAuthorized: input.saleAuthorized,
    points: input.points,
    marketValue: input.marketValue == null ? undefined : { value: input.marketValue },
    inNegotiation: input.inNegotiation,
    proposerNickName: input.inNegotiation ? input.proposerNickName ?? null : null,
    negotiationExpiresAt: input.inNegotiation ? input.negotiationExpiresAt ?? null : null,
    winProbability: Math.max(3, Math.round(input.points * 0.67)),
    accountId: input.accountId,
    account: { nickName: input.nickName },
    challenge: {
      name: input.challengeName,
      slug: input.challengeSlug,
      descriptionLong: rules,
      budgetAccumulated: input.prize,
      currentRoundIndex: input.currentRound,
      roundEndIndex: input.roundEnd,
      championship: { name: input.championship, modality: input.modality },
    },
  };
}

const brasileirao = {
  challengeName: "Brasileirão sobrevivência",
  challengeSlug: "brasileirao-sobrevivencia",
  championship: "Brasileirão Série A",
  modality: "SOCCER" as Modality,
  prize: 48200,
  currentRound: 12,
  roundEnd: 38,
};

const libertadores = {
  challengeName: "Libertadores mata-mata",
  challengeSlug: "libertadores-sobrevivencia",
  championship: "Copa Libertadores",
  modality: "SOCCER" as Modality,
  prize: 91000,
  currentRound: 4,
  roundEnd: 13,
};

/** Catálogo local enquanto a pesquisa pública não responde. */
export const marketTicketCatalog: IMarketTicketCard[] = [
  ticket({
    _id: "665f0a1b2c3d4e5f607182b1",
    code: "BX-1042",
    saleAuthorized: true,
    points: 33,
    marketValue: 180,
    inNegotiation: false,
    accountId: "acct-maria",
    nickName: "maria_dx",
    ...brasileirao,
  }),
  ticket({
    _id: "665f0a1b2c3d4e5f607182b4",
    code: "BX-2210",
    saleAuthorized: false,
    points: 21,
    marketValue: 95,
    inNegotiation: false,
    accountId: "acct-ana",
    nickName: "ana_dx",
    ...brasileirao,
  }),
  ticket({
    _id: "665f0a1b2c3d4e5f607182b5",
    code: "BX-3307",
    saleAuthorized: false,
    points: 18,
    marketValue: 125,
    inNegotiation: true,
    proposerNickName: "lia_dx",
    negotiationExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    accountId: "acct-pedro",
    nickName: "pedro_dx",
    ...brasileirao,
  }),
  ticket({
    _id: "665f0a1b2c3d4e5f607182b8",
    code: "BX-1077",
    saleAuthorized: true,
    points: 27,
    marketValue: 140,
    inNegotiation: false,
    accountId: "acct-carla",
    nickName: "carla_dx",
    ...brasileirao,
  }),
  ticket({
    _id: "665f0a1b2c3d4e5f607182c1",
    code: "BX-4410",
    saleAuthorized: false,
    points: 9,
    marketValue: 70,
    inNegotiation: false,
    accountId: "acct-lucas",
    nickName: "lucas_dx",
    ...libertadores,
  }),
  ticket({
    _id: "665f0a1b2c3d4e5f607182c2",
    code: "BX-4418",
    saleAuthorized: true,
    points: 15,
    marketValue: 210,
    inNegotiation: false,
    accountId: "acct-bia",
    nickName: "bia_dx",
    ...libertadores,
  }),
  ticket({
    _id: "665f0a1b2c3d4e5f607182c3",
    code: "BX-4422",
    saleAuthorized: true,
    points: 12,
    marketValue: 160,
    inNegotiation: false,
    accountId: "acct-rafa",
    nickName: "rafa_dx",
    ...libertadores,
  }),
  ticket({
    _id: "665f0a1b2c3d4e5f607182c4",
    code: "BX-4501",
    saleAuthorized: false,
    points: 6,
    marketValue: 90,
    inNegotiation: true,
    proposerNickName: "caio_dx",
    negotiationExpiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    accountId: "acct-nanda",
    nickName: "nanda_dx",
    ...libertadores,
  }),
];

/** API-05. Página pública inicial, sem filtro de dono. */
export const marketTicketPage: IPage<IMarketTicketCard> = {
  items: marketTicketCatalog,
  paging: buildPaging(marketTicketCatalog.length, 1, 20),
};
