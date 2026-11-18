import { describe, expect, it } from "vitest";
import { canConfirmGuess, normalizeAvailableGuesses } from "@/lib/guess";
import { finishedEvolution, publicEvolution, sessionEvolution } from "@/mocks/evolution";
import { evolutionPayloadFromFixture, leadingTicketKeys, normalizeEvolution, showsGuessTeam } from "@/lib/queries/evolutionView";

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
    expect(joaoOut?.points).toBe(0);
    expect(joaoOut?.pointsAccumulateds).toBe(18);
    const openLeaders = leadingTicketKeys(open?.others ?? []);
    expect(open?.others.every((guess) => openLeaders.has(guess.ticketId))).toBe(true);
    const round7 = view?.rounds.find((round) => round.sequenceOrder === 7);
    const round7Leaders = leadingTicketKeys(round7?.others ?? []);
    expect(round7Leaders.has(round7?.others.find((guess) => guess.ticketCode === "BX-1088")?.ticketId ?? "")).toBe(false);
    expect(round7Leaders.size).toBe(5);
    expect(leadingTicketKeys([{ ticketId: "", ticketCode: "BX-0", pointsAccumulateds: null, ticketPoints: null }]).size).toBe(0);
    expect(showsGuessTeam(false, "OPEN_TO_GUESS")).toBe(false);
    expect(showsGuessTeam(false, "FINISHED")).toBe(true);
  });

  it("separa palpites da conta e dos outros quando há sessão", () => {
    const view = normalizeEvolution(evolutionPayloadFromFixture(sessionEvolution), { signedIn: true });
    const open = view?.rounds.find((round) => round.sequenceOrder === 12);
    const pending = open?.owners.find((guess) => guess.ticketCode === "BX-1101");
    expect(pending?.own).toBe(true);
    expect(pending?.teamName).toBeNull();
    expect(open?.others.length).toBeGreaterThan(0);
    expect(view?.rounds.filter((round) => round.sequenceOrder <= 12).every((round) => round.owners.length + round.others.length > 0)).toBe(true);
    expect(showsGuessTeam(true, "OPEN_TO_GUESS")).toBe(true);
  });

  it("monta uma coluna por rodada no desafio encerrado e aponta o vencedor", () => {
    const view = normalizeEvolution(evolutionPayloadFromFixture(finishedEvolution), { signedIn: false });
    expect(view?.rounds).toHaveLength(16);
    expect(view?.winners.map((winner) => winner.ticketCode)).toEqual(["BX-2201"]);
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
          match: { slotHome: { team: "time-a", label: "Palmeiras" }, slotAway: { team: "time-d", label: "Grêmio" } },
        },
      ],
    });
    expect(board.teams.map((team) => team.name)).toEqual(["Palmeiras", "Santos"]);
    expect(board.teams[1]?.available).toBe(false);
    expect(board.teams[1]?.blockReason).toBe("Time já usado");
  });
});
