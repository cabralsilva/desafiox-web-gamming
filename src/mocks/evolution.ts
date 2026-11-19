import { ChallengeRoundStatus, TicketGuessStatus, TicketStatusInGamming } from "c2-desafiox";
import type { IEvolutionGuess, IEvolutionRound, IEvolutionTransfer, IPublicEvolution } from "../types";
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
  /** Propostas recebidas. Entram só no card da rodada vigente. */
  transfers?: IEvolutionTransfer[];
};

const roster: RosterTicket[] = [
  { nickName: "maria_dx", code: "BX-1042", ticketId: "665f0a1b2c3d4e5f607182b1", owner: false, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: true, marketValue: 180 },
  { nickName: "ana_dx", code: "BX-1018", ticketId: "665f0a1b2c3d4e5f607182b4", owner: false, eliminatedOn: null, openWithoutGuess: true, saleAuthorized: false, marketValue: 95 },
  { nickName: "carla_dx", code: "BX-1077", ticketId: "665f0a1b2c3d4e5f607182b8", owner: false, eliminatedOn: null, openWithoutGuess: true, saleAuthorized: true, marketValue: 140 },
  { nickName: "joao_dx", code: "BX-1088", ticketId: "665f0a1b2c3d4e5f607182b2", owner: false, eliminatedOn: 7, openWithoutGuess: false },
  { nickName: "pedro_dx", code: "BX-1133", ticketId: "665f0a1b2c3d4e5f607182b5", owner: false, eliminatedOn: 4, openWithoutGuess: false },
  {
    nickName: "voce_dx",
    code: "BX-1101",
    ticketId: "665f0a1b2c3d4e5f607182b3",
    owner: true,
    eliminatedOn: null,
    openWithoutGuess: true,
    saleAuthorized: false,
    marketValue: 210,
    transfers: [
      { _id: "665f0a1b2c3d4e5f607182e1", status: "REQUESTED", amount: 175, createdAtDateTime: "2026-11-18T18:30:00.000Z", accountDestination: { nickName: "lia_dx" } },
      { _id: "665f0a1b2c3d4e5f607182e2", status: "REQUESTED", amount: 200, createdAtDateTime: "2026-11-19T12:10:00.000Z", accountDestination: { nickName: "bruno_dx" } },
    ],
  },
  {
    nickName: "voce_dx",
    code: "BX-1104",
    ticketId: "665f0a1b2c3d4e5f607182b6",
    owner: true,
    eliminatedOn: null,
    openWithoutGuess: false,
    saleAuthorized: true,
    marketValue: 160,
    transfers: [
      { _id: "665f0a1b2c3d4e5f607182e3", status: "PROCESSING", amount: 160, createdAtDateTime: "2026-11-17T21:40:00.000Z", accountDestination: { nickName: "caio_dx" } },
    ],
  },
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
      ...(open && ticket.transfers?.length ? { ticketTransfers: ticket.transfers } : {}),
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

const runningRounds = span(1, 38, CURRENT_ROUND, ChallengeRoundStatus.OPEN_TO_GUESS).map((round) =>
  round.sequenceOrder <= CURRENT_ROUND
    ? { ...round, owners: [], others: [...guessesFor(round.sequenceOrder, false), ...guessesFor(round.sequenceOrder, true)] }
    : round,
);

/** Propostas que a conta logada enviou. Só entram na sessão, na rodada vigente. */
const viewerProposals: Record<string, IEvolutionTransfer[]> = {
  "BX-1018": [
    {
      _id: "665f0a1b2c3d4e5f607182e4",
      status: "REQUESTED",
      amount: 95,
      createdAtDateTime: "2026-11-19T13:05:00.000Z",
      accountDestination: { nickName: "voce_dx" },
    },
  ],
  "BX-1042": [
    {
      _id: "665f0a1b2c3d4e5f607182e5",
      status: "PROCESSING",
      amount: 180,
      createdAtDateTime: "2026-11-19T11:15:00.000Z",
      accountDestination: { nickName: "voce_dx" },
      infinitePay: { checkoutUrl: "https://checkout.infinitepay.io/pay/bx-1042" },
    },
  ],
  "BX-1077": [
    {
      _id: "665f0a1b2c3d4e5f607182e6",
      status: "CANCELLED",
      amount: 140,
      createdAtDateTime: "2026-11-16T16:00:00.000Z",
      accountDestination: { nickName: "voce_dx" },
    },
  ],
};

function withViewerProposals(guesses: IEvolutionGuess[], round: number) {
  if (round !== CURRENT_ROUND) return guesses;
  return guesses.map((guess) => {
    const extra = viewerProposals[guess.ticket.code];
    if (!extra) return guess;
    return {
      ...guess,
      ticket: { ...guess.ticket, ticketTransfers: [...(guess.ticket.ticketTransfers ?? []), ...extra] },
    };
  });
}

const sessionRounds = span(1, 38, CURRENT_ROUND, ChallengeRoundStatus.OPEN_TO_GUESS).map((round) =>
  round.sequenceOrder <= CURRENT_ROUND
    ? {
        ...round,
        owners: guessesFor(round.sequenceOrder, true),
        others: withViewerProposals(guessesFor(round.sequenceOrder, false), round.sequenceOrder),
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

const libertadoresChallenge = publicChallengeBySlug["libertadores-sobrevivencia"];

const LIBERTADORES_TEAMS = [
  "Flamengo",
  "Palmeiras",
  "River Plate",
  "Boca Juniors",
  "Fluminense",
  "Internacional",
  "São Paulo",
  "Atlético-MG",
  "Nacional",
  "Peñarol",
  "Olimpia",
  "Cerro Porteño",
];

const LIBERTADORES_CURRENT = 8;

const libertadoresRoster: RosterTicket[] = [
  { nickName: "rafa_dx", code: "BX-3010", ticketId: "665f0a1b2c3d4e5f60718301", owner: false, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: true, marketValue: 220 },
  { nickName: "bia_dx", code: "BX-3018", ticketId: "665f0a1b2c3d4e5f60718302", owner: false, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: false, marketValue: 130 },
  { nickName: "caio_dx", code: "BX-3044", ticketId: "665f0a1b2c3d4e5f60718303", owner: false, eliminatedOn: 5, openWithoutGuess: false },
  { nickName: "nanda_dx", code: "BX-3060", ticketId: "665f0a1b2c3d4e5f60718304", owner: false, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: true, marketValue: 175 },
  { nickName: "voce_dx", code: "BX-3101", ticketId: "665f0a1b2c3d4e5f60718305", owner: true, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: false, marketValue: 260 },
  { nickName: "voce_dx", code: "BX-3108", ticketId: "665f0a1b2c3d4e5f60718306", owner: true, eliminatedOn: 6, openWithoutGuess: false },
];

function campaignGuess(ticket: RosterTicket, ticketIndex: number, round: number, teams: string[], currentRound: number, currentScored: boolean, salt: string): IEvolutionGuess | null {
  if (ticket.eliminatedOn != null && round > ticket.eliminatedOn) return null;
  const eliminated = ticket.eliminatedOn === round;
  const awaitingResult = round === currentRound && !currentScored;
  const withoutGuess = awaitingResult && ticket.openWithoutGuess;
  const teamIndex = (ticketIndex * 2 + round - 1) % teams.length;
  const survived = eliminated || awaitingResult ? round - 1 : round;
  const classifiedRounds = ticket.eliminatedOn != null ? ticket.eliminatedOn - 1 : currentScored ? currentRound : currentRound - 1;

  return {
    _id: hexId(`${salt}${ticketIndex.toString(16)}${round.toString(16)}`),
    account: { nickName: ticket.nickName },
    ticket: {
      _id: ticket.ticketId,
      code: ticket.code,
      statusInGamming: eliminated ? TicketStatusInGamming.DROPPED : TicketStatusInGamming.SCALLING,
      saleAuthorized: ticket.saleAuthorized ?? false,
      points: classifiedRounds * 3,
      ...(ticket.marketValue != null ? { marketValue: { value: ticket.marketValue } } : {}),
    },
    guess: withoutGuess ? null : { _id: hexId(`${salt}t${teamIndex.toString(16)}`), name: teams[teamIndex] },
    guessStatus: eliminated ? TicketGuessStatus.ELIMINATED : awaitingResult ? TicketGuessStatus.PENDING : TicketGuessStatus.CLASSIFIELDED,
    points: eliminated || awaitingResult ? 0 : 3,
    pointsAccumulateds: survived * 3,
  };
}

function campaignRounds(roster: RosterTicket[], teams: string[], currentRound: number, currentStatus: ChallengeRoundStatus, end: number, splitOwners: boolean, salt: string) {
  const currentScored = currentStatus === ChallengeRoundStatus.FINISHED;
  return span(1, end, currentRound, currentStatus).map((round) => {
    if (round.sequenceOrder > currentRound) return round;
    const guessesFor = (owner: boolean) =>
      roster.flatMap((ticket, index) => {
        if (ticket.owner !== owner) return [];
        const guess = campaignGuess(ticket, index, round.sequenceOrder, teams, currentRound, currentScored, salt);
        return guess ? [guess] : [];
      });
    return splitOwners
      ? { ...round, owners: guessesFor(true), others: guessesFor(false) }
      : { ...round, owners: [], others: [...guessesFor(false), ...guessesFor(true)] };
  });
}

const sulAmericanaChallenge = publicChallengeBySlug["sul-americana-sobrevivencia"];

const SUL_AMERICANA_TEAMS = [
  "Racing",
  "Estudiantes",
  "LDU",
  "Bolívar",
  "Independiente",
  "Fortaleza",
  "Botafogo",
  "Cruzeiro",
  "Grêmio",
  "Santos",
  "Bahia",
  "Vasco",
];

const SUL_AMERICANA_CURRENT = 6;

const sulAmericanaRoster: RosterTicket[] = [
  { nickName: "diego_dx", code: "BX-4010", ticketId: "665f0a1b2c3d4e5f60718401", owner: false, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: true, marketValue: 200 },
  { nickName: "lara_dx", code: "BX-4018", ticketId: "665f0a1b2c3d4e5f60718402", owner: false, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: false, marketValue: 110 },
  { nickName: "tiago_dx", code: "BX-4044", ticketId: "665f0a1b2c3d4e5f60718403", owner: false, eliminatedOn: 3, openWithoutGuess: false },
  { nickName: "mel_dx", code: "BX-4060", ticketId: "665f0a1b2c3d4e5f60718404", owner: false, eliminatedOn: 6, openWithoutGuess: false, saleAuthorized: true, marketValue: 90 },
  { nickName: "voce_dx", code: "BX-4101", ticketId: "665f0a1b2c3d4e5f60718405", owner: true, eliminatedOn: null, openWithoutGuess: false, saleAuthorized: true, marketValue: 240 },
  { nickName: "voce_dx", code: "BX-4108", ticketId: "665f0a1b2c3d4e5f60718406", owner: true, eliminatedOn: 4, openWithoutGuess: false },
];

/** Desafio em andamento com a rodada vigente encerrada e resultados lançados. */
export const finishedRoundEvolution: IPublicEvolution = {
  challenge: sulAmericanaChallenge,
  rounds: campaignRounds(sulAmericanaRoster, SUL_AMERICANA_TEAMS, SUL_AMERICANA_CURRENT, ChallengeRoundStatus.FINISHED, 12, false, "s"),
};

export const sessionFinishedRoundEvolution: IPublicEvolution = {
  ...finishedRoundEvolution,
  challenge: { ...sulAmericanaChallenge, myTickets: { active: 1, total: 2 } },
  rounds: campaignRounds(sulAmericanaRoster, SUL_AMERICANA_TEAMS, SUL_AMERICANA_CURRENT, ChallengeRoundStatus.FINISHED, 12, true, "s"),
};

/** Desafio em andamento com a rodada vigente fechada para palpites. */
export const closedRoundEvolution: IPublicEvolution = {
  challenge: libertadoresChallenge,
  rounds: campaignRounds(libertadoresRoster, LIBERTADORES_TEAMS, LIBERTADORES_CURRENT, ChallengeRoundStatus.CLOSED_TO_GUESS, 16, false, "c"),
};

export const sessionClosedRoundEvolution: IPublicEvolution = {
  ...closedRoundEvolution,
  challenge: { ...libertadoresChallenge, myTickets: { active: 1, total: 2 } },
  rounds: campaignRounds(libertadoresRoster, LIBERTADORES_TEAMS, LIBERTADORES_CURRENT, ChallengeRoundStatus.CLOSED_TO_GUESS, 16, true, "c"),
};

const PAULISTA_TEAMS = [
  "Palmeiras",
  "Corinthians",
  "São Paulo",
  "Santos",
  "Bragantino",
  "Novorizontino",
  "Mirassol",
  "Ponte Preta",
  "Portuguesa",
  "Guarani",
  "Botafogo-SP",
  "Ituano",
  "Santo André",
  "São Bernardo",
  "Água Santa",
  "Inter de Limeira",
];

const ESTADUAL_END = 16;

const estadualRoster: RosterTicket[] = [
  { nickName: "maria_dx", code: "BX-2201", ticketId: "665f0a1b2c3d4e5f607182c6", owner: false, eliminatedOn: null, openWithoutGuess: false },
  { nickName: "lucas_dx", code: "BX-2210", ticketId: "665f0a1b2c3d4e5f607182c8", owner: false, eliminatedOn: 12, openWithoutGuess: false },
  { nickName: "bia_dx", code: "BX-2214", ticketId: "665f0a1b2c3d4e5f607182c9", owner: false, eliminatedOn: 8, openWithoutGuess: false },
  { nickName: "pedro_dx", code: "BX-2219", ticketId: "665f0a1b2c3d4e5f607182ca", owner: false, eliminatedOn: 3, openWithoutGuess: false },
  { nickName: "voce_dx", code: "BX-2208", ticketId: "665f0a1b2c3d4e5f607182c7", owner: true, eliminatedOn: 5, openWithoutGuess: false },
];

/** Desafio encerrado: histórico de palpites em todas as rodadas e vencedor na última. */
export const finishedEvolution: IPublicEvolution = {
  challenge: finishedChallenge,
  winnerTicketIds: ["665f0a1b2c3d4e5f607182c6"],
  rounds: campaignRounds(estadualRoster, PAULISTA_TEAMS, ESTADUAL_END, ChallengeRoundStatus.FINISHED, ESTADUAL_END, false, "e"),
};

export const sessionFinishedEvolution: IPublicEvolution = {
  ...finishedEvolution,
  challenge: { ...finishedChallenge, myTickets: { active: 0, total: 1 } },
  rounds: campaignRounds(estadualRoster, PAULISTA_TEAMS, ESTADUAL_END, ChallengeRoundStatus.FINISHED, ESTADUAL_END, true, "e"),
};
