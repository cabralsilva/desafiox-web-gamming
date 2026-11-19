import { describe, expect, it } from "vitest";
import { checkoutUrlFromTransferPayload, transferPreviewFromPayload, transferProposalBlockFromMessage } from "@/lib/ticket-transfer";

describe("prévia da transferência", () => {
  it("lê código, valor, dono, times e pontuação", () => {
    const preview = transferPreviewFromPayload({
      _id: "ticket-1",
      code: "TKT-1",
      points: 18,
      marketValue: 90,
      ownerNickName: "ana",
      availableTeams: [{ _id: "team-1", name: "Flamengo", shortName: "FLA", position: 1 }],
    });

    expect(preview).toMatchObject({
      id: "ticket-1",
      code: "TKT-1",
      points: 18,
      marketValue: 90,
      ownerNickName: "ana",
    });
    expect(preview.availableTeams).toEqual([{ id: "team-1", name: "Flamengo", shortName: "FLA", position: 1 }]);
    expect(preview.saleAuthorized).toBeUndefined();
  });

  it("lê se o ticket está à venda sem aprovação", () => {
    expect(transferPreviewFromPayload({ saleAuthorized: true }).saleAuthorized).toBe(true);
  });

  it("lê o checkout da InfinitePay no retorno da proposta", () => {
    expect(checkoutUrlFromTransferPayload({ infinitePay: { checkoutUrl: "https://checkout.infinitepay.io/pay/1" } })).toBe("https://checkout.infinitepay.io/pay/1");
    expect(checkoutUrlFromTransferPayload({ ticketTransfer: { checkoutUrl: "https://checkout.infinitepay.io/pay/2" } })).toBe("https://checkout.infinitepay.io/pay/2");
    expect(checkoutUrlFromTransferPayload({ data: { infinitePay: { checkoutUrl: "https://checkout.infinitepay.io/pay/3" } } })).toBe("https://checkout.infinitepay.io/pay/3");
    expect(checkoutUrlFromTransferPayload({ status: "REQUESTED" })).toBe("");
  });

  it("reconhece proposta duplicada e transferência em processamento", () => {
    expect(transferProposalBlockFromMessage("Já existe uma proposta sua para este ticket")).toBe("requested");
    expect(transferProposalBlockFromMessage("Já existe uma transferência em processamento para este ticket")).toBe("processing");
    expect(transferProposalBlockFromMessage("O desafio já foi finalizado")).toBeNull();
  });
});
