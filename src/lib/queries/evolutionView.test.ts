import { describe, expect, it } from "vitest";
import { canConfirmGuess, normalizeAvailableGuesses } from "@/lib/guess";
import { closedRoundEvolution, finishedEvolution, finishedRoundEvolution, publicEvolution, sessionClosedRoundEvolution, sessionEvolution, sessionFinishedEvolution, sessionFinishedRoundEvolution } from "@/mocks/evolution";
import { publicChallengeBySlug } from "@/mocks/challenges";
import { evolutionPayloadFromFixture, evolutionRounds, leadingTicketKeys, normalizeEvolution, showsGuessTeam } from "@/lib/queries/evolutionView";

describe("quadro de evolução", () => {
  it("lista o ticketGuesses do visitante como os cards dos outros, inclusive na janela aberta", () => {
    const view = normalizeEvolution(evolutionPayloadFromFixture(publicEvolution), { signedIn: false });
    expect(view).not.toBeNull();
    expect(view?.rounds).toHaveLength(38);
    const open = view?.rounds.find((round) => round.status === "OPEN_TO_GUESS");
    expect(open?.owners).toEqual([]);
    expect(open?.others.length).toBeGreaterThan(0);
    expect(view?.rounds.filter((round) => round.sequenceOrder <= 12).every((round) => round.others.length > 0)).toBe(true);
    expect(view?.rounds.find((round) => round.sequenceOrder === 13)?.others).toEqual([]);
    const maria = view?.rounds
      .filter((round) => round.sequenceOrder < 12)
      .map((round) => round.others.find((guess) => guess.ticketCode === "BX-1042")?.teamName);
    expect(new Set(maria).size).toBe(maria?.length);
    expect(open?.others.every((guess) => guess.own === false)).toBe(true);
    const mariaRound1 = view?.rounds.find((round) => round.sequenceOrder === 1)?.others.find((guess) => guess.ticketCode === "BX-1042");
    const mariaRound10 = view?.rounds.find((round) => round.sequenceOrder === 10)?.others.find((guess) => guess.ticketCode === "BX-1042");
    const joaoOut = view?.rounds.find((round) => round.sequenceOrder === 7)?.others.find((guess) => guess.ticketCode === "BX-1088");
    expect(mariaRound1?.points).toBe(3);
    expect(mariaRound1?.pointsAccumulateds).toBe(3);
    expect(mariaRound10?.pointsAccumulateds).toBe(30);
    expect(mariaRound10?.ticketPoints).toBe(33);
    const mariaOpen = open?.others.find((guess) => guess.ticketCode === "BX-1042");
    const anaOpen = open?.others.find((guess) => guess.ticketCode === "BX-1018");
    expect(mariaOpen?.marketValue).toBe(180);
    expect(mariaOpen?.saleAuthorized).toBe(true);
    expect(anaOpen?.marketValue).toBe(95);
    expect(anaOpen?.saleAuthorized).toBe(false);
    expect(anaOpen?.transfers).toEqual([]);
    expect(mariaOpen?.transfers).toEqual([]);
    expect(joaoOut?.points).toBe(0);
    expect(joaoOut?.pointsAccumulateds).toBe(18);
    const openLeaders = leadingTicketKeys(open?.others ?? []);
    expect(open?.others.every((guess) => openLeaders.has(guess.ticketId))).toBe(true);
    const round7 = view?.rounds.find((round) => round.sequenceOrder === 7);
    const round7Leaders = leadingTicketKeys(round7?.others ?? []);
    expect(round7Leaders.has(round7?.others.find((guess) => guess.ticketCode === "BX-1088")?.ticketId ?? "")).toBe(false);
    expect(round7Leaders.size).toBe(6);
    const openWithoutGuess = open?.others.filter((guess) => guess.teamName == null).map((guess) => guess.ticketCode);
    expect(openWithoutGuess).toEqual(expect.arrayContaining(["BX-1018", "BX-1077", "BX-1101"]));
    expect(leadingTicketKeys([{ ticketId: "", ticketCode: "BX-0", pointsAccumulateds: null, ticketPoints: null }]).size).toBe(0);
    expect(showsGuessTeam(false, "OPEN_TO_GUESS")).toBe(false);
    expect(showsGuessTeam(false, "FINISHED")).toBe(true);
  });

  it("separa palpites da conta e dos outros quando há sessão", () => {
    const view = normalizeEvolution(evolutionPayloadFromFixture(sessionEvolution), { signedIn: true });
    const open = view?.rounds.find((round) => round.sequenceOrder === 12);
    const pending = open?.owners.find((guess) => guess.ticketCode === "BX-1101");
    const direct = open?.owners.find((guess) => guess.ticketCode === "BX-1104");
    const past = view?.rounds.find((round) => round.sequenceOrder === 11)?.owners.find((guess) => guess.ticketCode === "BX-1101");
    expect(pending?.own).toBe(true);
    expect(pending?.teamName).toBeNull();
    expect(pending?.transfers.map((item) => [item.status, item.proposerNickName])).toEqual([
      ["REQUESTED", "lia_dx"],
      ["REQUESTED", "bruno_dx"],
    ]);
    expect(direct?.transfers.map((item) => item.status)).toEqual(["PROCESSING"]);
    expect(past?.transfers).toEqual([]);
    const sentRequested = open?.others.find((guess) => guess.ticketCode === "BX-1018");
    const sentProcessing = open?.others.find((guess) => guess.ticketCode === "BX-1042");
    const sentCancelled = open?.others.find((guess) => guess.ticketCode === "BX-1077");
    expect(sentRequested?.transfers.map((item) => item.status)).toEqual(["REQUESTED"]);
    expect(sentProcessing?.transfers.map((item) => [item.status, item.checkoutUrl])).toEqual([
      ["PROCESSING", "https://checkout.infinitepay.io/pay/bx-1042"],
    ]);
    expect(sentCancelled?.transfers).toEqual([]);
    const pastOther = view?.rounds.find((round) => round.sequenceOrder === 11)?.others.find((guess) => guess.ticketCode === "BX-1042");
    expect(pastOther?.transfers).toEqual([]);
    expect(open?.others.length).toBeGreaterThan(0);
    expect(view?.rounds.filter((round) => round.sequenceOrder <= 12).every((round) => round.owners.length + round.others.length > 0)).toBe(true);
    expect(showsGuessTeam(true, "OPEN_TO_GUESS")).toBe(true);
    expect(view?.challenge.myTickets).toEqual({ active: 2, total: 3 });
  });

  it("mostra o palpite sem resultado quando a rodada vigente está fechada para palpites", () => {
    const guest = normalizeEvolution(evolutionPayloadFromFixture(closedRoundEvolution), { signedIn: false });
    const current = guest?.rounds.find((round) => round.status === "CLOSED_TO_GUESS");
    expect(guest?.rounds).toHaveLength(16);
    expect(current?.sequenceOrder).toBe(8);
    expect(guest?.rounds.filter((round) => round.sequenceOrder <= 8).every((round) => round.others.length > 0)).toBe(true);
    expect(guest?.rounds.find((round) => round.sequenceOrder === 9)?.others).toEqual([]);
    expect(current?.others.every((guess) => guess.teamName && guess.guessStatus === "PENDING" && guess.points === 0)).toBe(true);
    expect(showsGuessTeam(false, "CLOSED_TO_GUESS")).toBe(true);

    const session = normalizeEvolution(evolutionPayloadFromFixture(sessionClosedRoundEvolution), { signedIn: true });
    const own = session?.rounds.find((round) => round.sequenceOrder === 8)?.owners.find((guess) => guess.ticketCode === "BX-3101");
    expect(own?.own).toBe(true);
    expect(own?.teamName).toBeTruthy();
    expect(own?.guessStatus).toBe("PENDING");
    expect(session?.rounds.find((round) => round.sequenceOrder === 6)?.owners.some((guess) => guess.ticketCode === "BX-3108")).toBe(true);
    expect(session?.rounds.find((round) => round.sequenceOrder === 7)?.owners.some((guess) => guess.ticketCode === "BX-3108")).toBe(false);
  });

  it("lança resultado de todos os tickets quando a rodada vigente está encerrada", () => {
    const guest = normalizeEvolution(evolutionPayloadFromFixture(finishedRoundEvolution), { signedIn: false });
    const current = guest?.rounds.find((round) => round.sequenceOrder === 6);
    expect(guest?.rounds).toHaveLength(12);
    expect(current?.status).toBe("FINISHED");
    expect(guest?.rounds.filter((round) => round.sequenceOrder <= 6).every((round) => round.others.length > 0)).toBe(true);
    expect(guest?.rounds.find((round) => round.sequenceOrder === 7)?.others).toEqual([]);
    expect(current?.others.every((guess) => guess.teamName && (guess.guessStatus === "CLASSIFIELDED" || guess.guessStatus === "ELIMINATED"))).toBe(true);
    expect(current?.others.find((guess) => guess.ticketCode === "BX-4060")?.guessStatus).toBe("ELIMINATED");
    expect(current?.others.find((guess) => guess.ticketCode === "BX-4010")?.points).toBe(3);

    const session = normalizeEvolution(evolutionPayloadFromFixture(sessionFinishedRoundEvolution), { signedIn: true });
    const own = session?.rounds.find((round) => round.sequenceOrder === 6)?.owners.find((guess) => guess.ticketCode === "BX-4101");
    expect(own?.guessStatus).toBe("CLASSIFIELDED");
    expect(own?.teamName).toBeTruthy();
  });

  it("monta uma coluna por rodada no desafio encerrado e aponta o vencedor", () => {
    const view = normalizeEvolution(evolutionPayloadFromFixture(finishedEvolution), { signedIn: false });
    expect(view?.rounds).toHaveLength(16);
    expect(view?.winners.map((winner) => winner.ticketCode)).toEqual(["BX-2201"]);
    expect(view?.rounds.every((round) => round.others.some((guess) => guess.ticketCode === "BX-2201" && guess.teamName))).toBe(true);
    expect(view?.rounds.find((round) => round.sequenceOrder === 3)?.others.find((guess) => guess.ticketCode === "BX-2219")?.guessStatus).toBe("ELIMINATED");
    expect(view?.rounds.find((round) => round.sequenceOrder === 4)?.others.some((guess) => guess.ticketCode === "BX-2219")).toBe(false);
    const session = normalizeEvolution(evolutionPayloadFromFixture(sessionFinishedEvolution), { signedIn: true });
    expect(session?.rounds.find((round) => round.sequenceOrder === 5)?.owners.find((guess) => guess.ticketCode === "BX-2208")?.guessStatus).toBe("ELIMINATED");
    expect(session?.rounds.find((round) => round.sequenceOrder === 6)?.owners).toEqual([]);
    expect(session?.rounds.find((round) => round.sequenceOrder === 16)?.others.map((guess) => guess.ticketCode)).toEqual(["BX-2201"]);
  });

  it("preenche o kanban de um desafio ainda não iniciado, da primeira à última rodada", () => {
    const challenge = publicChallengeBySlug["copa-sobrevivencia"];
    const rounds = evolutionRounds(challenge);
    expect(rounds.map((round) => round.sequenceOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rounds.every((round) => round.status === "SCHEDULED" && round.owners.length === 0 && round.others.length === 0)).toBe(true);
  });

  it("impede o visitante de confirmar palpite e mantém time usado indisponível", () => {
    expect(canConfirmGuess(false)).toBe(false);
    expect(canConfirmGuess(true)).toBe(true);
    const board = normalizeAvailableGuesses({
      _id: "rodada",
      challenge: { _id: "desafio" },
      ticket: { _id: "ticket" },
      teams: [
        {
          team: "time-b",
          available: false,
          blockReason: "Time já usado",
          match: { slotHome: { team: "time-b", label: "Santos" }, slotAway: { team: "time-c", label: "Flamengo" } },
        },
        {
          team: "time-a",
          available: true,
          lastMatches: ["lose", "draw", "winner"],
          match: { slotHome: { team: "time-a", label: "Palmeiras" }, slotAway: { team: "time-d", label: "Grêmio" } },
        },
      ],
    });
    expect(board.teams.map((team) => team.name)).toEqual(["Palmeiras", "Santos"]);
    expect(board.teams[0]?.results).toEqual(["W", "D", "L"]);
    expect(board.teams[1]?.available).toBe(false);
    expect(board.teams[1]?.blockReason).toBe("Time já usado");
  });
});
