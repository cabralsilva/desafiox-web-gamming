import { ChallengeRoundStatus, TicketGuessStatus, TicketStatusInGamming } from "c2-desafiox";
import type { IEvolutionGuess, IEvolutionRound, IPublicEvolution } from "../types";
import { publicChallengeBySlug } from "./challenges";

const challenge = publicChallengeBySlug["brasileirao-sobrevivencia"];
const finishedChallenge = publicChallengeBySlug["estadual-sobrevivencia"];

const TEAMS = [
  "Flamengo",
  "Palmeiras",
  "Corinthians",
  "Santos",
  "São Paulo",
  "Grêmio",
  "Internacional",
  "Atlético-MG",
  "Cruzeiro",
  "Botafogo",
  "Fluminense",
  "Vasco",
  "Bahia",
  "Fortaleza",
  "Athletico-PR",
  "Bragantino",
];

const CURRENT_ROUND = 12;

type RosterTicket = {
  nickName: string;
  code: string;
  ticketId: string;
  owner: boolean;
  /** Rodada em que o ticket é eliminado. Não aparece nas seguintes. */
  eliminatedOn: number | null;
  /** Na rodada vigente ainda não escolheu time. */
  openWithoutGuess: boolean;
  saleAuthorized?: boolean;
  marketValue?: number;
};

const roster: RosterTicket[] = [
  { nickName: "maria_dx", code: "BX-1042", ticketId: "665f0a1b2c3d4e5f607182b1", owner: false, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: true, marketValue: 180 },
  { nickName: "ana_dx", code: "BX-1018", ticketId: "665f0a1b2c3d4e5f607182b4", owner: false, eliminatedOn: null, openWithoutGuess: false },
  { nickName: "joao_dx", code: "BX-1088", ticketId: "665f0a1b2c3d4e5f607182b2", owner: false, eliminatedOn: 7, openWithoutGuess: false },
  { nickName: "pedro_dx", code: "BX-1133", ticketId: "665f0a1b2c3d4e5f607182b5", owner: false, eliminatedOn: 4, openWithoutGuess: false },
  { nickName: "voce_dx", code: "BX-1101", ticketId: "665f0a1b2c3d4e5f607182b3", owner: true, eliminatedOn: null, openWithoutGuess: true },
  { nickName: "voce_dx", code: "BX-1104", ticketId: "665f0a1b2c3d4e5f607182b6", owner: true, eliminatedOn: null, openWithoutGuess: false },
  { nickName: "voce_dx", code: "BX-1109", ticketId: "665f0a1b2c3d4e5f607182b7", owner: true, eliminatedOn: 9, openWithoutGuess: false },
];

function hexId(seed: string) {
  return `665f0a1b2c3d4e5f${seed}00000000`.slice(0, 24);
}

function historyGuess(ticket: RosterTicket, ticketIndex: number, round: number): IEvolutionGuess | null {
  if (ticket.eliminatedOn != null && round > ticket.eliminatedOn) return null;
  const eliminated = ticket.eliminatedOn === round;
  const open = round === CURRENT_ROUND;
  const withoutGuess = open && ticket.openWithoutGuess;
  const teamIndex = (ticketIndex * 2 + round - 1) % TEAMS.length;
  const survived = eliminated || open ? round - 1 : round;
  const classifiedRounds = ticket.eliminatedOn != null ? ticket.eliminatedOn - 1 : CURRENT_ROUND - 1;

  return {
    _id: hexId(`${ticketIndex.toString(16).padStart(2, "0")}${round.toString(16).padStart(2, "0")}ab`),
    account: { nickName: ticket.nickName },
    ticket: {
      _id: ticket.ticketId,
      code: ticket.code,
      statusInGamming: eliminated ? TicketStatusInGamming.DROPPED : TicketStatusInGamming.SCALLING,
      saleAuthorized: ticket.saleAuthorized ?? false,
      points: classifiedRounds * 3,
      ...(ticket.marketValue != null ? { marketValue: { value: ticket.marketValue } } : {}),
    },
    guess: withoutGuess ? null : { _id: hexId(`73${teamIndex.toString(16).padStart(2, "0")}c0`), name: TEAMS[teamIndex] },
    guessStatus: eliminated ? TicketGuessStatus.ELIMINATED : open ? TicketGuessStatus.PENDING : TicketGuessStatus.CLASSIFIELDED,
    points: eliminated || open ? 0 : 3,
    pointsAccumulateds: survived * 3,
  };
}

function guessesFor(round: number, owner: boolean) {
  return roster.flatMap((ticket, index) => {
    if (ticket.owner !== owner) return [];
    const guess = historyGuess(ticket, index, round);
    return guess ? [guess] : [];
  });
}

function roundId(order: number) {
  return `665f0a1b2c3d4e5f6071${order.toString(16).padStart(4, "0")}`;
}

function span(start: number, end: number, current: number, currentStatus: ChallengeRoundStatus): IEvolutionRound[] {
  const rounds: IEvolutionRound[] = [];
  for (let order = start; order <= end; order += 1) {
    let status: ChallengeRoundStatus = ChallengeRoundStatus.SCHEDULED;
    if (order < current) status = ChallengeRoundStatus.FINISHED;
    else if (order === current) status = currentStatus;
    rounds.push({
      _id: roundId(order),
      status,
      sequenceOrder: order,
      label: `Rodada ${order}`,
      owners: [],
      others: [],
    });
  }
  return rounds;
}

function withCards(rounds: IEvolutionRound[], order: number, cards: Pick<IEvolutionRound, "owners" | "others">) {
  return rounds.map((round) => (round.sequenceOrder === order ? { ...round, ...cards } : round));
}

const runningRounds = span(1, 38, CURRENT_ROUND, ChallengeRoundStatus.OPEN_TO_GUESS).map((round) =>
  round.sequenceOrder <= CURRENT_ROUND
    ? { ...round, owners: [], others: [...guessesFor(round.sequenceOrder, false), ...guessesFor(round.sequenceOrder, true)] }
    : round,
);

const sessionRounds = span(1, 38, CURRENT_ROUND, ChallengeRoundStatus.OPEN_TO_GUESS).map((round) =>
  round.sequenceOrder <= CURRENT_ROUND
    ? {
        ...round,
        owners: guessesFor(round.sequenceOrder, true),
        others: guessesFor(round.sequenceOrder, false),
      }
    : round,
);

/** API-04. Visitante lê `ticketGuesses`, listados como `ticketGuessesOthers`. */
export const publicEvolution: IPublicEvolution = {
  challenge,
  rounds: runningRounds,
};

/** API-04 com sessão. `ticketGuessesOwner` e `ticketGuessesOthers`, como no app. */
export const sessionEvolution: IPublicEvolution = {
  ...publicEvolution,
  challenge: { ...challenge, myTickets: { active: 2, total: 3 } },
  rounds: sessionRounds,
};

const finishedWinner: IEvolutionGuess = {
  _id: "665f0a1b2c3d4e5f607182a6",
  account: { nickName: "maria_dx" },
  ticket: {
    _id: "665f0a1b2c3d4e5f607182c6",
    code: "BX-2201",
    statusInGamming: TicketStatusInGamming.SCALLING,
    saleAuthorized: true,
    points: 22,
  },
  guess: { _id: "665f0a1b2c3d4e5f607182d6", name: "Flamengo" },
  guessStatus: TicketGuessStatus.CLASSIFIELDED,
  points: 3,
  pointsAccumulateds: 22,
};

const finishedOwn: IEvolutionGuess = {
  _id: "665f0a1b2c3d4e5f607182a7",
  account: { nickName: "voce_dx" },
  ticket: {
    _id: "665f0a1b2c3d4e5f607182c7",
    code: "BX-2208",
    statusInGamming: TicketStatusInGamming.DROPPED,
    saleAuthorized: false,
    points: 8,
  },
  guess: { _id: "665f0a1b2c3d4e5f607182d7", name: "Santos" },
  guessStatus: TicketGuessStatus.ELIMINATED,
  points: 0,
  pointsAccumulateds: 8,
};

/** Desafio encerrado: uma coluna por rodada e vencedor na última. */
export const finishedEvolution: IPublicEvolution = {
  challenge: finishedChallenge,
  winnerTicketIds: [finishedWinner.ticket._id],
  rounds: withCards(span(1, 16, 16, ChallengeRoundStatus.FINISHED), 16, {
    owners: [],
    others: [finishedWinner],
  }),
};

export const sessionFinishedEvolution: IPublicEvolution = {
  ...finishedEvolution,
  challenge: { ...finishedChallenge, myTickets: { active: 0, total: 1 } },
  rounds: withCards(finishedEvolution.rounds, 16, {
    owners: [finishedOwn],
    others: [finishedWinner],
  }),
};
