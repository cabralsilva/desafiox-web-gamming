import type { IMarketTicketCard, IPage } from "../types";

const baseChallenge = {
  name: "Brasileirão sobrevivência",
  slug: "brasileirao-sobrevivencia",
  budgetAccumulated: 48200,
  roundCurrentIndex: 12,
  roundEndIndex: 38,
  championship: { name: "Brasileirão Série A" },
};

const aVenda: IMarketTicketCard = {
  _id: "665f0a1b2c3d4e5f607182b1",
  code: "BX-1042",
  saleAuthorized: true,
  marketValue: { value: 180 },
  inNegotiation: false,
  account: { nickName: "maria_dx" },
  challenge: baseChallenge,
};

const proposta: IMarketTicketCard = {
  _id: "665f0a1b2c3d4e5f607182b4",
  code: "BX-2210",
  saleAuthorized: false,
  marketValue: { value: 95 },
  inNegotiation: false,
  account: { nickName: "ana_dx" },
  challenge: baseChallenge,
};

/** Em negociação: sem valor de mercado e sem as partes da proposta. */
const negociando: IMarketTicketCard = {
  _id: "665f0a1b2c3d4e5f607182b5",
  code: "BX-3307",
  saleAuthorized: false,
  inNegotiation: true,
  account: { nickName: "pedro_dx" },
  challenge: baseChallenge,
};

/** API-05. */
export const marketTicketPage: IPage<IMarketTicketCard> = {
  items: [aVenda, proposta, negociando],
  paging: {
    total: 3,
    page: 1,
    limit: 12,
    totalPages: 1,
    startIndex: 1,
    endIndex: 3,
  },
};
