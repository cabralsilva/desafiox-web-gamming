import { apiRequest } from "@/lib/api";

export type GuessFormResult = "W" | "D" | "L";

export interface GuessTeamOption {
  id: string;
  name: string;
  opponent: string;
  venue: "casa" | "fora";
  available: boolean;
  blockReason: string;
  /** Últimos resultados, do mais antigo ao mais recente. */
  results: GuessFormResult[];
}

export interface AvailableGuessBoard {
  challengeId: string;
  challengeName: string;
  challengeRoundId: string;
  sequenceOrder: number;
  ticketId: string;
  ticketCode: string;
  teams: GuessTeamOption[];
}

export function canConfirmGuess(signedIn: boolean) {
  return signedIn;
}

export async function loadAvailableGuesses(ticketGuessId: string, challengeRoundId: string): Promise<AvailableGuessBoard> {
  try {
    const response = await apiRequest(
      `/ticket-guess/${encodeURIComponent(ticketGuessId)}/available-guesses/${encodeURIComponent(challengeRoundId)}`,
      { auth: true },
    );
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      throw new Error(typeof payload.message === "string" ? payload.message : "Não foi possível carregar os times.");
    }
    return normalizeAvailableGuesses(payload);
  } catch (error) {
    if (!missingApi(error)) throw error;
    return previewAvailableGuesses(challengeRoundId);
  }
}

export async function confirmGuess(input: {
  signedIn: boolean;
  ticketGuessId: string;
  challengeId: string;
  challengeRoundId: string;
  ticketId: string;
  teamId: string;
}) {
  if (!canConfirmGuess(input.signedIn)) {
    throw new Error("Entre na DESAFIOX para registrar o palpite.");
  }
  if (!process.env.NEXT_PUBLIC_API_URL) return;
  const response = await apiRequest(`/ticket-guess/${encodeURIComponent(input.ticketGuessId)}`, {
    method: "PATCH",
    auth: true,
    body: {
      challenge: input.challengeId,
      challengeRound: input.challengeRoundId,
      ticket: input.ticketId,
      guess: input.teamId,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(typeof payload.message === "string" ? payload.message : "Não foi possível registrar o palpite.");
  }
}

export function normalizeAvailableGuesses(payload: unknown): AvailableGuessBoard {
  const root = record(payload);
  const challenge = record(root?.challenge);
  const ticket = record(root?.ticket);
  const teams = list(root?.teams).flatMap((item) => {
    const team = record(item);
    if (!team) return [];
    const id = text(team.team);
    const match = record(team.match);
    const home = record(match?.slotHome);
    const away = record(match?.slotAway);
    if (!id || !home || !away) return [];
    const homeId = text(home.team);
    const isHome = homeId === id;
    return [
      {
        id,
        name: text(isHome ? home.label : away.label) || "Time",
        opponent: text(isHome ? away.label : home.label) || "Adversário",
        venue: isHome ? ("casa" as const) : ("fora" as const),
        available: team.available !== false,
        blockReason: text(team.blockReason) || "Indisponível nesta rodada",
        results: formResults(team.lastMatches),
      },
    ];
  });
  teams.sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.name.localeCompare(b.name, "pt-BR");
  });
  return {
    challengeId: text(challenge?._id),
    challengeName: text(challenge?.name),
    challengeRoundId: text(root?._id),
    sequenceOrder: typeof root?.sequenceOrder === "number" ? root.sequenceOrder : 0,
    ticketId: text(ticket?._id),
    ticketCode: text(ticket?.code),
    teams,
  };
}

function formResults(value: unknown): GuessFormResult[] {
  return list(value)
    .flatMap((item) => {
      if (item === "winner") return ["W" as const];
      if (item === "draw") return ["D" as const];
      if (item === "lose") return ["L" as const];
      return [];
    })
    .reverse();
}

function missingApi(error: unknown) {
  return error instanceof Error && error.message.includes("NEXT_PUBLIC_API_URL");
}

function previewAvailableGuesses(challengeRoundId: string): AvailableGuessBoard {
  return {
    challengeId: "",
    challengeName: "",
    challengeRoundId,
    sequenceOrder: 0,
    ticketId: "",
    ticketCode: "",
    teams: [
      { id: "palmeiras", name: "Palmeiras", opponent: "Santos", venue: "casa", available: true, blockReason: "", results: ["W", "D", "W", "L", "W"] },
      { id: "flamengo", name: "Flamengo", opponent: "Botafogo", venue: "fora", available: true, blockReason: "", results: ["L", "W", "W", "D", "W"] },
      { id: "gremio", name: "Grêmio", opponent: "Internacional", venue: "casa", available: true, blockReason: "", results: ["D", "D", "L", "W", "D"] },
      { id: "santos", name: "Santos", opponent: "Palmeiras", venue: "fora", available: false, blockReason: "Time já usado", results: [] },
    ],
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
