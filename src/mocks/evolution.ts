import { ChallengeRoundStatus, TicketGuessStatus, TicketStatusInGamming } from "c2-desafiox";
import type { IEvolutionGuess, IEvolutionRound, IPublicEvolution } from "../types";
import { publicChallengeBySlug } from "./challenges";

const challenge = publicChallengeBySlug["brasileirao-sobrevivencia"];
const finishedChallenge = publicChallengeBySlug["estadual-sobrevivencia"];

const flamengo: IEvolutionGuess = {
  _id: "665f0a1b2c3d4e5f607182a1",
  account: { nickName: "maria_dx" },
  ticket: {
    _id: "665f0a1b2c3d4e5f607182b1",
    code: "BX-1042",
    statusInGamming: TicketStatusInGamming.SCALLING,
    saleAuthorized: true,
    points: 22,
    marketValue: { value: 180 },
  },
  guess: { _id: "665f0a1b2c3d4e5f607182c1", name: "Flamengo" },
  guessStatus: TicketGuessStatus.CLASSIFIELDED,
  points: 3,
};

const santos: IEvolutionGuess = {
  _id: "665f0a1b2c3d4e5f607182a2",
  account: { nickName: "joao_dx" },
  ticket: {
    _id: "665f0a1b2c3d4e5f607182b2",
    code: "BX-1088",
    statusInGamming: TicketStatusInGamming.DROPPED,
    saleAuthorized: false,
    points: 8,
  },
  guess: { _id: "665f0a1b2c3d4e5f607182c2", name: "Santos" },
  guessStatus: TicketGuessStatus.ELIMINATED,
  points: 0,
};

const openOthers: IEvolutionGuess[] = [
  {
    ...flamengo,
    _id: "665f0a1b2c3d4e5f607182a4",
    guess: { _id: "665f0a1b2c3d4e5f607182c4", name: "Palmeiras" },
    guessStatus: TicketGuessStatus.PENDING,
    points: 0,
  },
  {
    ...santos,
    _id: "665f0a1b2c3d4e5f607182a5",
    ticket: { ...santos.ticket, statusInGamming: TicketStatusInGamming.SCALLING },
    guess: { _id: "665f0a1b2c3d4e5f607182c5", name: "Corinthians" },
    guessStatus: TicketGuessStatus.PENDING,
    points: 0,
  },
];

const ownPending: IEvolutionGuess = {
  _id: "665f0a1b2c3d4e5f607182a3",
  account: { nickName: "voce_dx" },
  ticket: {
    _id: "665f0a1b2c3d4e5f607182b3",
    code: "BX-1101",
    statusInGamming: TicketStatusInGamming.READY,
    saleAuthorized: false,
    points: 11,
  },
  guess: null,
  guessStatus: TicketGuessStatus.PENDING,
  points: 0,
};

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

const runningRounds = withCards(
  withCards(span(1, 38, 12, ChallengeRoundStatus.OPEN_TO_GUESS), 11, {
    owners: [],
    others: [flamengo, santos],
  }),
  12,
  { owners: [], others: openOthers },
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
  rounds: withCards(runningRounds, 12, { owners: [ownPending], others: openOthers }),
};

const finishedWinner: IEvolutionGuess = {
  ...flamengo,
  _id: "665f0a1b2c3d4e5f607182a6",
  ticket: { ...flamengo.ticket, _id: "665f0a1b2c3d4e5f607182b6", code: "BX-2201" },
  guessStatus: TicketGuessStatus.CLASSIFIELDED,
};

const finishedOwn: IEvolutionGuess = {
  ...santos,
  _id: "665f0a1b2c3d4e5f607182a7",
  account: { nickName: "voce_dx" },
  ticket: { ...santos.ticket, _id: "665f0a1b2c3d4e5f607182b7", code: "BX-2208" },
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
