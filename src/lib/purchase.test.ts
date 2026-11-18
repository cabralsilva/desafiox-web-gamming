import { describe, expect, it } from "vitest";
import { accountIdFromToken } from "@/lib/jwt";
import { evaluateChallengePath } from "@/lib/queries/evaluateChallenge";
import { normalizeEvolution } from "@/lib/queries/evolutionView";
import {
  buildTicketOrderBody,
  canConfirmPurchase,
  createSubmitGuard,
  readCheckoutUrl,
  submitTicketOrder,
} from "@/lib/queries/ticketOrder";

describe("evolução", () => {
  it("consulta a rota pública sem sessão e a privada com sessão", () => {
    const guest = evaluateChallengePath("copa-sobrevivencia", false);
    const member = evaluateChallengePath("665f0a1b2c3d4e5f60718293", true);
    expect(guest.startsWith("/public/challenge/copa-sobrevivencia/evaluate?")).toBe(true);
    expect(member.startsWith("/challenge/665f0a1b2c3d4e5f60718293/evaluate?")).toBe(true);
    expect(guest.includes("token=")).toBe(false);
    expect(member.includes("token=")).toBe(false);
    expect(new URL(`http://api.test${guest}`).searchParams.get("populate")).toBe("championship");
  });

  it("esconde palpites da janela aberta para o visitante e mantém o da conta", () => {
    const payload = {
      _id: "1",
      name: "Brasileirão sobrevivência",
      slug: "brasileirao-sobrevivencia",
      status: "RUNNING",
      championship: { name: "Brasileirão Série A", modality: "SOCCER" },
      challengeRounds: [
        {
          _id: "r1",
          status: "FINISHED",
          sequenceOrder: 11,
          ticketGuesses: [
            {
              _id: "g1",
              account: { nickName: "maria_dx" },
              ticket: { code: "BX-1042", statusInGamming: "SCALLING" },
              guess: { name: "Flamengo" },
              guessStatus: "CLASSIFIELDED",
            },
          ],
        },
        {
          _id: "r2",
          status: "OPEN_TO_GUESS",
          sequenceOrder: 12,
          ticketGuesses: [
            {
              _id: "g2",
              account: { nickName: "outro" },
              ticket: { code: "BX-9", statusInGamming: "READY" },
              guessStatus: "PENDING",
            },
          ],
          ticketGuessesOwner: [
            {
              _id: "g3",
              account: { nickName: "voce_dx" },
              ticket: { code: "BX-1101", statusInGamming: "READY" },
              guessStatus: "PENDING",
            },
          ],
        },
      ],
    };
    const guest = normalizeEvolution(payload, { signedIn: false });
    const member = normalizeEvolution(payload, { signedIn: true });
    const guestOpen = guest?.rounds.find((round) => round.status === "OPEN_TO_GUESS");
    const memberOpen = member?.rounds.find((round) => round.status === "OPEN_TO_GUESS");
    expect(guestOpen?.guesses).toEqual([]);
    expect(memberOpen?.guesses.map((guess) => guess.ticketCode)).toEqual(["BX-1101"]);
    expect(guest?.rounds[0]?.guesses).toHaveLength(1);
  });
});

describe("compra de inscrição", () => {
  it("não envia pedido para visitante nem no segundo clique", async () => {
    let calls = 0;
    const request = () => {
      calls += 1;
      return new Promise<Response>((resolve) => {
        setTimeout(() => resolve(new Response(JSON.stringify({ _id: "pedido-1", checkoutUrl: "https://checkout.test/1" }), { status: 201 })), 20);
      });
    };
    const input = {
      signedIn: false,
      accountId: "conta",
      challengeId: "desafio",
      amount: 1,
      unitValue: 55,
      paymentMethod: "checkout" as const,
      acceptedAt: "2026-11-18T00:00:00.000Z",
    };
    const guard = createSubmitGuard();
    const guest = await submitTicketOrder(guard, input, request);
    expect(guest).toEqual({ ok: false, reason: "guest" });
    expect(calls).toBe(0);
    expect(canConfirmPurchase(false)).toBe(false);

    const first = submitTicketOrder(guard, { ...input, signedIn: true }, request);
    const second = await submitTicketOrder(guard, { ...input, signedIn: true }, request);
    expect(second).toEqual({ ok: false, reason: "busy" });
    expect(await first).toMatchObject({ ok: true, orderId: "pedido-1", checkoutUrl: "https://checkout.test/1" });
    expect(calls).toBe(1);
  });

  it("monta o corpo do pedido sem colocar segredo", () => {
    const body = buildTicketOrderBody({
      signedIn: true,
      accountId: "conta-1",
      challengeId: "desafio-1",
      amount: 2,
      unitValue: 55,
      paymentMethod: "credits",
      acceptedAt: "2026-11-18T00:00:00.000Z",
    });
    expect(body.paymentMethod).toBe("WALLET");
    expect(body.account).toBe("conta-1");
    expect(JSON.stringify(body).includes("token")).toBe(false);
    expect(readCheckoutUrl({ infinitePay: { checkoutUrl: "https://checkout.test/2" } })).toBe("https://checkout.test/2");
  });

  it("lê a conta no JWT", () => {
    const body = Buffer.from(JSON.stringify({ account: "conta-jwt" })).toString("base64url");
    expect(accountIdFromToken(`aaa.${body}.assinatura`)).toBe("conta-jwt");
    expect(accountIdFromToken(null)).toBeNull();
  });
});
