import type { IChallenge, IChampionship, ITicket } from "c2-desafiox";
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
  marketValue?: { value: number };
  inNegotiation: boolean;
  account: { nickName: string };
  challenge: Pick<
    ApiJson<IChallenge>,
    "name" | "slug" | "budgetAccumulated" | "roundCurrentIndex" | "roundEndIndex"
  > & {
    championship: Pick<ApiJson<IChampionship>, "name">;
  };
}

export const MARKET_TICKET_POPULATE = "account,challenge,challenge.championship";

export const MARKET_TICKET_SELECT = [
  "code",
  "saleAuthorized",
  "marketValue.value",
  "account.nickName",
  "challenge.name",
  "challenge.slug",
  "challenge.budgetAccumulated",
  "challenge.roundCurrentIndex",
  "challenge.roundEndIndex",
  "challenge.championship.name",
  "inNegotiation",
].join(",");
