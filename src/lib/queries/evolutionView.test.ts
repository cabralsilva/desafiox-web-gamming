import { describe, expect, it } from "vitest";
import { canConfirmGuess, normalizeAvailableGuesses } from "@/lib/guess";
import { finishedEvolution, publicEvolution, sessionEvolution } from "@/mocks/evolution";
import { evolutionPayloadFromFixture, normalizeEvolution, showsGuessTeam } from "@/lib/queries/evolutionView";

describe("quadro de evolução", () => {
  it("lista o ticketGuesses do visitante como os cards dos outros, inclusive na janela aberta", () => {
    const view = normalizeEvolution(evolutionPayloadFromFixture(publicEvolution), { signedIn: false });
    expect(view).not.toBeNull();
    expect(view?.rounds).toHaveLength(38);
    const open = view?.rounds.find((round) => round.status === "OPEN_TO_GUESS");
    expect(open?.owners).toEqual([]);
    expect(open?.others.length).toBeGreaterThan(0);
    expect(open?.others.every((guess) => guess.own === false)).toBe(true);
    expect(showsGuessTeam(false, "OPEN_TO_GUESS")).toBe(false);
    expect(showsGuessTeam(false, "FINISHED")).toBe(true);
  });

  it("separa palpites da conta e dos outros quando há sessão", () => {
    const view = normalizeEvolution(evolutionPayloadFromFixture(sessionEvolution), { signedIn: true });
    const open = view?.rounds.find((round) => round.sequenceOrder === 12);
    expect(open?.owners).toHaveLength(1);
    expect(open?.owners[0]?.own).toBe(true);
    expect(open?.owners[0]?.teamName).toBeNull();
    expect(open?.others.length).toBeGreaterThan(0);
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
