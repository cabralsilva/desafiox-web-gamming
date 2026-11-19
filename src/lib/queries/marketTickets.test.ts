import { describe, expect, it } from "vitest";
import { readPhoneVerified, transferProposalBody } from "@/lib/ticket-transfer";
import { marketTicketCatalog } from "@/mocks/market";
import { marketTicketAction } from "@/types/marketTicket";
import {
  listMarketTickets,
  MARKET_PAGE_LIMIT,
  parseMarketQuery,
  publicMarketTicketPath,
  readMarketPage,
  readMarketTicket,
} from "@/lib/queries/marketTickets";
import { MARKET_CHALLENGE_STATUS, MARKET_TICKET_POPULATE, MARKET_TICKET_SELECT } from "@/types/marketTicket";

const guest = {
  q: "",
  page: 1,
  orderBy: "_id",
  orderSense: "desc" as const,
  view: "grid" as const,
  availability: null,
  owner: null,
  ticketId: null,
  signedIn: false,
  accountId: null,
};

describe("pesquisa pública do mercado", () => {
  it("usa a consulta de tickets em jogo, com campeonato, rodadas e dono", () => {
    const params = new URL(`http://api.test${publicMarketTicketPath()}`).searchParams;
    expect(params.get("populate")).toBe(MARKET_TICKET_POPULATE);
    expect(params.get("select")).toBe(MARKET_TICKET_SELECT);
    expect(params.get("challenge.statusIn")).toBe(MARKET_CHALLENGE_STATUS);
    expect(params.get("statusInGamming")).toBe("SCALLING");
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe(String(MARKET_PAGE_LIMIT));
    expect(params.getAll("challenge.currentRound")).toEqual([]);
    for (const field of [
      "code",
      "saleAuthorized",
      "account.nickName",
      "points",
      "challenge.name",
      "challenge.currentRound",
      "challenge.championship.name",
      "challenge.championship.modality",
      "challenge.roundEnd.globalRoundIndex",
      "marketValue.value",
      "challenge.budgetAccumulated",
    ]) {
      expect(params.get("select")).toContain(field);
    }
  });

  it("manda venda liberada e o dono da sessão na query", () => {
    const params = new URL(`http://api.test${publicMarketTicketPath({
      search: "BX-1042",
      availability: "sale",
      owner: "me",
      accountId: "conta-1",
      orderBy: "points",
      orderSense: "asc",
    })}`).searchParams;
    expect(params.get("searchText")).toBe("BX-1042");
    expect(params.get("saleAuthorized")).toBe("true");
    expect(params.get("account")).toBe("conta-1");
    expect(params.get("orderBy")).toBe("points");
    expect(params.get("orderSense")).toBe("asc");
  });
});

describe("lista do mercado", () => {
  it("lê o card com rodada atual, última, prêmio e valor", () => {
    const ticket = readMarketTicket({
      _id: "t1",
      code: "BX-9",
      saleAuthorized: true,
      points: 14,
      marketValue: { value: 80 },
      account: { _id: "acc-1", nickName: "maria_dx" },
      challenge: {
        name: "Copa",
        descriptionLong: "<p>Regras</p>",
        budgetAccumulated: 1000,
        currentRound: { globalRoundIndex: 4 },
        roundEnd: { globalRoundIndex: 13 },
        championship: { name: "Libertadores", modality: "SOCCER" },
      },
    });
    expect(ticket).toMatchObject({
      code: "BX-9",
      points: 14,
      accountId: "acc-1",
      marketValue: { value: 80 },
      challenge: {
        name: "Copa",
        currentRoundIndex: 4,
        roundEndIndex: 13,
        budgetAccumulated: 1000,
        championship: { name: "Libertadores", modality: "SOCCER" },
      },
    });
    expect(readMarketPage({
      items: [ticket],
      paging: { total: 1, page: 1, limit: 20, totalPages: 1, startIndex: 1, endIndex: 1 },
    })?.items).toHaveLength(1);
  });

  it("trata negociação sem valor e impede comprar o próprio ticket", () => {
    const negotiating = marketTicketCatalog.find((item) => item.code === "BX-3307");
    const own = marketTicketCatalog[0];
    expect(negotiating?.marketValue).toBeUndefined();
    expect(negotiating ? marketTicketAction(negotiating, null) : null).toBe("negotiating");
    expect(marketTicketAction(own, own.accountId)).toBe("own");
    expect(marketTicketAction(own, "outra-conta")).toBe("buy");
    expect(marketTicketAction(marketTicketCatalog[1], null)).toBe("propose");
  });

  it("filtra disponibilidade para todos e dono só com sessão", () => {
    const sale = listMarketTickets(marketTicketCatalog, { ...guest, availability: "sale" });
    const proposal = listMarketTickets(marketTicketCatalog, { ...guest, availability: "proposal" });
    const negotiation = listMarketTickets(marketTicketCatalog, { ...guest, availability: "negotiation" });
    expect(sale.items.every((item) => item.saleAuthorized && !item.inNegotiation)).toBe(true);
    expect(proposal.items.every((item) => !item.saleAuthorized && !item.inNegotiation)).toBe(true);
    expect(negotiation.items.every((item) => item.inNegotiation && item.marketValue == null)).toBe(true);

    const guestOwner = listMarketTickets(marketTicketCatalog, {
      ...guest,
      owner: "me",
      accountId: marketTicketCatalog[0].accountId,
    });
    expect(guestOwner.items).toHaveLength(marketTicketCatalog.length);

    const mine = listMarketTickets(marketTicketCatalog, {
      ...guest,
      signedIn: true,
      owner: "me",
      accountId: "acct-maria",
    });
    expect(mine.items.map((item) => item.code)).toEqual(["BX-1042"]);

    const others = listMarketTickets(marketTicketCatalog, {
      ...guest,
      signedIn: true,
      owner: "others",
      accountId: "acct-maria",
    });
    expect(others.items.some((item) => item.accountId === "acct-maria")).toBe(false);
  });

  it("busca por código, desafio ou campeonato", () => {
    const byCode = listMarketTickets(marketTicketCatalog, { ...guest, q: "bx-4418" });
    const byCup = listMarketTickets(marketTicketCatalog, { ...guest, q: "libertadores" });
    expect(byCode.items.map((item) => item.code)).toEqual(["BX-4418"]);
    expect(byCup.items.every((item) => item.challenge.championship.name === "Copa Libertadores")).toBe(true);
    expect(parseMarketQuery({ availability: "sale", owner: "eu", ticket: "abc" }).ticketId).toBe("abc");
    expect(parseMarketQuery({ owner: "eu" }).owner).toBeNull();
  });
});

describe("confirmação da proposta", () => {
  it("envia saldo ou checkout e lê o WhatsApp verificado", () => {
    expect(transferProposalBody("2026-11-19T00:00:00.000Z")).toEqual({
      acceptTermsOfChallenge: {
        accepted: true,
        acceptedAtDateTime: "2026-11-19T00:00:00.000Z",
        acceptedAppVersion: "web-1.0.0",
      },
    });
    expect(transferProposalBody("2026-11-19T00:00:00.000Z", "credits").paymentMethod).toBe("WALLET");
    expect(transferProposalBody("2026-11-19T00:00:00.000Z", "checkout").paymentMethod).toBe("CHECKOUT");
    expect(readPhoneVerified({ phoneVerified: false })).toBe(false);
    expect(readPhoneVerified({ data: { phoneVerified: true } })).toBe(true);
    expect(readPhoneVerified({})).toBeNull();
  });
});
