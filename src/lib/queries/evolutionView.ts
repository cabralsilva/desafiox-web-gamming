import type { IPublicEvolution } from "@/types/evolution";
import type { IPublicChallengeCard } from "@/types/publicChallenge";

export interface EvolutionGuessView {
  id: string;
  ticketId: string;
  nickName: string;
  ticketCode: string;
  teamName: string | null;
  guessStatus: string;
  ticketStatus: string;
  points: number | null;
  /** Pontuação do ticket acumulada até esta rodada. */
  pointsAccumulateds: number | null;
  ticketPoints: number | null;
  automatic: boolean;
  own: boolean;
}

export interface EvolutionRoundView {
  id: string;
  status: string;
  sequenceOrder: number;
  label: string;
  owners: EvolutionGuessView[];
  others: EvolutionGuessView[];
}

export interface EvolutionView {
  challenge: IPublicChallengeCard;
  rounds: EvolutionRoundView[];
  winnerTicketIds: string[];
  winners: { nickName: string; ticketCode: string }[];
}

const REVEALED_ROUND = new Set(["FINISHED", "IN_HOMOLOGATION", "CLOSED_TO_GUESS"]);

/** Tickets empatados na maior pontuação acumulada. Empate entra; sem pontuação, ninguém. */
export function leadingTicketKeys(
  guesses: Pick<EvolutionGuessView, "ticketId" | "ticketCode" | "pointsAccumulateds" | "ticketPoints">[],
) {
  let best: number | null = null;
  for (const guess of guesses) {
    const score = guess.pointsAccumulateds ?? guess.ticketPoints;
    if (score == null) continue;
    if (best == null || score > best) best = score;
  }
  if (best == null) return new Set<string>();
  const keys = new Set<string>();
  for (const guess of guesses) {
    if ((guess.pointsAccumulateds ?? guess.ticketPoints) !== best) continue;
    const key = guess.ticketId || guess.ticketCode;
    if (key) keys.add(key);
  }
  return keys;
}

/** Time visível no card. Dono sempre vê o próprio; os demais seguem o app em `ticketGuessesOthers`. */
export function showsGuessTeam(own: boolean, roundStatus: string) {
  if (own) return true;
  return REVEALED_ROUND.has(roundStatus);
}

export function evolutionPayloadFromFixture(source: IPublicEvolution) {
  return {
    ...source.challenge,
    ticketsWinners: source.winnerTicketIds ?? [],
    challengeRounds: source.rounds.map((round) => ({
      _id: round._id,
      status: round.status,
      sequenceOrder: round.sequenceOrder,
      label: round.label,
      ticketGuesses: round.others,
      ticketGuessesOwner: round.owners,
      ticketGuessesOthers: round.others,
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

  const rounds = fillRounds(
    list(root.challengeRounds)
      .map((round, index) => normalizeRound(round, index, options.signedIn))
      .filter((round): round is EvolutionRoundView => round != null)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    challenge,
  );
  const winnerTicketIds = idsOf(root.ticketsWinners);

  return {
    challenge,
    rounds,
    winnerTicketIds,
    winners: status === "FINISHED" ? winnersFrom(rounds, winnerTicketIds) : [],
  };
}

function normalizeRound(value: unknown, index: number, signedIn: boolean): EvolutionRoundView | null {
  const round = record(value);
  if (!round) return null;
  const status = text(round.status) || "SCHEDULED";
  const sequenceOrder = numberValue(round.sequenceOrder) || index + 1;
  const owners = signedIn ? mapGuesses(round.ticketGuessesOwner, true) : [];
  const others = signedIn ? mapGuesses(round.ticketGuessesOthers, false) : mapGuesses(round.ticketGuesses, false);

  return {
    id: text(round._id) || `rodada-${sequenceOrder}`,
    status,
    sequenceOrder,
    label: text(round.label) || `Rodada ${sequenceOrder}`,
    owners,
    others,
  };
}

function mapGuesses(value: unknown, own: boolean) {
  return list(value).flatMap((guess) => {
    const view = normalizeGuess(guess, own);
    return view ? [view] : [];
  });
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
    ticketId: text(ticket?._id),
    nickName: text(account?.nickName) || "Jogador",
    ticketCode,
    teamName: text(team?.name) || null,
    guessStatus: text(guess.guessStatus) || "PENDING",
    ticketStatus: text(ticket?.statusInGamming),
    points: optionalNumber(guess.points),
    pointsAccumulateds: optionalNumber(guess.pointsAccumulateds),
    ticketPoints: optionalNumber(ticket?.points),
    automatic: guess.isAutomatic === true,
    own,
  };
}

function fillRounds(rounds: EvolutionRoundView[], challenge: IPublicChallengeCard) {
  const start = challenge.roundStartIndex;
  const end = challenge.roundEndIndex;
  if (!start || !end || end < start || end - start > 64) return rounds;
  const byOrder = new Map(rounds.map((round) => [round.sequenceOrder, round]));
  const filled: EvolutionRoundView[] = [];
  for (let order = start; order <= end; order += 1) {
    filled.push(byOrder.get(order) ?? emptyRound(order, challenge));
  }
  return filled;
}

function emptyRound(order: number, challenge: IPublicChallengeCard): EvolutionRoundView {
  let status = "SCHEDULED";
  if (challenge.roundCurrentIndex && order < challenge.roundCurrentIndex) status = "FINISHED";
  else if (order === challenge.roundCurrentIndex) status = challenge.roundCurrentStatus || "SCHEDULED";
  return {
    id: `rodada-${order}`,
    status,
    sequenceOrder: order,
    label: `Rodada ${order}`,
    owners: [],
    others: [],
  };
}

function winnersFrom(rounds: EvolutionRoundView[], winnerTicketIds: string[]) {
  const marked = new Set(winnerTicketIds);
  const guesses = rounds.flatMap((round) => [...round.owners, ...round.others]);
  const picked = marked.size
    ? guesses.filter((guess) => marked.has(guess.ticketId))
    : (rounds[rounds.length - 1]?.owners ?? []).concat(rounds[rounds.length - 1]?.others ?? []).filter(
        (guess) => guess.guessStatus === "CLASSIFIELDED" || guess.ticketStatus === "SCALLING",
      );
  const seen = new Set<string>();
  return picked.flatMap((guess) => {
    if (seen.has(guess.ticketCode)) return [];
    seen.add(guess.ticketCode);
    return [{ nickName: guess.nickName, ticketCode: guess.ticketCode }];
  });
}

function idsOf(value: unknown) {
  return list(value).flatMap((item) => {
    if (typeof item === "string" && item) return [item];
    const id = text(record(item)?._id);
    return id ? [id] : [];
  });
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

function optionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
