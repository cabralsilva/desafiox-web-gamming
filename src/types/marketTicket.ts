import type { ITicket, Modality } from "c2-desafiox";
import type { ApiJson } from "./apiJson";

type TicketJson = ApiJson<ITicket>;

/**
 * Card do mercado. `inNegotiation` não existe no ticket: a API calcula
 * a partir de transferência `REQUESTED` ou `PROCESSING`.
 * Com negociação aberta a leitura pública omite `marketValue`.
 */
export interface IMarketTicketCard {
  _id: TicketJson["_id"];
  code: TicketJson["code"];
  saleAuthorized: TicketJson["saleAuthorized"];
  points: number;
  marketValue?: { value: number };
  inNegotiation: boolean;
  accountId: string;
  account: { nickName: string };
  challenge: {
    name: string;
    descriptionLong: string;
    budgetAccumulated: number;
    currentRoundIndex: number | null;
    roundEndIndex: number | null;
    championship: {
      name: string;
      modality: Modality | "";
    };
  };
}

export const MARKET_TICKET_POPULATE = "challenge.championship,challenge.roundEnd,challenge.currentRound,account";

export const MARKET_CHALLENGE_STATUS = "RUNNING,OPEN_TO_BUY_TICKETS";

/** Campos pedidos na pesquisa pública, mais o id do dono e as regras do diálogo. */
export const MARKET_TICKET_SELECT = [
  "code",
  "saleAuthorized",
  "account.nickName",
  "account._id",
  "points",
  "challenge.name",
  "challenge.descriptionLong",
  "challenge.currentRound",
  "challenge.currentRound.globalRoundIndex",
  "challenge.championship.name",
  "challenge.championship.modality",
  "challenge.roundEnd.globalRoundIndex",
  "marketValue.value",
  "challenge.budgetAccumulated",
].join(",");

export type MarketTicketAction = "buy" | "propose" | "own" | "negotiating";

export function marketTicketAction(ticket: IMarketTicketCard, accountId: string | null): MarketTicketAction {
  if (ticket.inNegotiation) return "negotiating";
  if (accountId && ticket.accountId && ticket.accountId === accountId) return "own";
  return ticket.saleAuthorized ? "buy" : "propose";
}
