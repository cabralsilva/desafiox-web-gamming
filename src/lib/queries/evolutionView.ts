import type { IPublicEvolution } from "@/types/evolution";
import type { IPublicChallengeCard } from "@/types/publicChallenge";

export interface EvolutionGuessView {
  id: string;
  nickName: string;
  ticketCode: string;
  teamName: string | null;
  guessStatus: string;
  ticketStatus: string;
  own: boolean;
}

export interface EvolutionRoundView {
  id: string;
  status: string;
  sequenceOrder: number;
  label: string;
  guesses: EvolutionGuessView[];
}

export interface EvolutionView {
  challenge: IPublicChallengeCard;
  rounds: EvolutionRoundView[];
  winners: { nickName: string; ticketCode: string }[];
}

export function evolutionPayloadFromFixture(source: IPublicEvolution, owner: boolean) {
  return {
    ...source.challenge,
    challengeRounds: source.rounds.map((round) => ({
      _id: round._id,
      status: round.status,
      sequenceOrder: round.sequenceOrder,
      label: round.label,
      ...(owner
        ? { ticketGuessesOwner: round.guesses, ticketGuessesOthers: [] }
        : { ticketGuesses: round.guesses }),
    })),
  };
}

export function normalizeEvolution(payload: unknown, options: { signedIn: boolean }): EvolutionView | null {
  const root = unwrap(payload);
  if (!root) return null;
  const name = text(root.name);
  const slug = text(root.slug);
  const status = text(root.status);
  if (!name || !slug || !status) return null;

  const championship = record(root.championship);
  const rounds = list(root.challengeRounds)
    .map((round, index) => normalizeRound(round, index, options.signedIn))
    .filter((round): round is EvolutionRoundView => round != null)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  const challenge: IPublicChallengeCard = {
    _id: text(root._id) || slug,
    name,
    slug,
    status: status as IPublicChallengeCard["status"],
    type: (text(root.type) || "SURVIVAL") as IPublicChallengeCard["type"],
    visibility: (text(root.visibility) || "PUBLIC") as IPublicChallengeCard["visibility"],
    budgetAccumulated: numberValue(root.budgetAccumulated),
    descriptionShort: text(root.descriptionShort),
    descriptionLong: text(root.descriptionLong),
    pricing: list(root.pricing).flatMap((item) => {
      const price = record(item);
      if (!price) return [];
      const initDateTime = text(price.initDateTime);
      const endDateTime = text(price.endDateTime);
      if (!initDateTime || !endDateTime) return [];
      return [{ initDateTime, endDateTime, value: numberValue(price.value) }];
    }),
    roundStartIndex: numberValue(root.roundStartIndex),
    roundCurrentIndex: numberValue(root.roundCurrentIndex),
    roundEndIndex: numberValue(root.roundEndIndex),
    roundCurrentStatus: (text(root.roundCurrentStatus) || "SCHEDULED") as IPublicChallengeCard["roundCurrentStatus"],
    championship: {
      name: text(championship?.name),
      modality: (text(championship?.modality) || "SOCCER") as IPublicChallengeCard["championship"]["modality"],
    },
  };

  return {
    challenge,
    rounds,
    winners: status === "FINISHED" ? winnersFrom(rounds) : [],
  };
}

function normalizeRound(value: unknown, index: number, signedIn: boolean): EvolutionRoundView | null {
  const round = record(value);
  if (!round) return null;
  const status = text(round.status) || "SCHEDULED";
  const open = status === "OPEN_TO_GUESS";
  const sequenceOrder = numberValue(round.sequenceOrder) || index + 1;
  const owners = signedIn
    ? list(round.ticketGuessesOwner).flatMap((guess) => {
        const view = normalizeGuess(guess, true);
        return view ? [view] : [];
      })
    : [];
  const others = open
    ? []
    : list(round.ticketGuessesOthers).flatMap((guess) => {
        const view = normalizeGuess(guess, false);
        return view ? [view] : [];
      });
  const publicGuesses = open
    ? []
    : list(round.ticketGuesses).flatMap((guess) => {
        const view = normalizeGuess(guess, false);
        return view ? [view] : [];
      });
  const guesses = signedIn && round.ticketGuessesOwner != null ? [...owners, ...others] : publicGuesses;

  return {
    id: text(round._id) || `rodada-${sequenceOrder}`,
    status,
    sequenceOrder,
    label: text(round.label) || `Rodada ${sequenceOrder}`,
    guesses,
  };
}

function normalizeGuess(value: unknown, own: boolean): EvolutionGuessView | null {
  const guess = record(value);
  if (!guess) return null;
  const ticket = record(guess.ticket);
  const team = record(guess.guess);
  const account = record(guess.account);
  const ticketCode = text(ticket?.code);
  if (!ticketCode) return null;
  return {
    id: text(guess._id) || ticketCode,
    nickName: text(account?.nickName) || "Jogador",
    ticketCode,
    teamName: text(team?.name) || null,
    guessStatus: text(guess.guessStatus) || "PENDING",
    ticketStatus: text(ticket?.statusInGamming),
    own,
  };
}

function winnersFrom(rounds: EvolutionRoundView[]) {
  const last = rounds[rounds.length - 1];
  if (!last) return [];
  return last.guesses
    .filter((guess) => guess.guessStatus === "CLASSIFIELDED" || guess.ticketStatus === "SCALLING")
    .map((guess) => ({ nickName: guess.nickName, ticketCode: guess.ticketCode }));
}

function unwrap(payload: unknown): Record<string, unknown> | null {
  const root = record(payload);
  if (!root) return null;
  if (root._id != null || root.slug != null) return root;
  for (const key of ["data", "challenge", "result", "payload"]) {
    const nested = record(root[key]);
    if (nested && (nested._id != null || nested.slug != null)) return nested;
  }
  const items = list(root.items);
  return record(items[0]);
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

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
