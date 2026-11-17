import { ChallengeRoundStatus, TicketGuessStatus, TicketStatusInGamming } from "c2-desafiox";
import type { IPublicEvolution } from "../types";
import { publicChallengeBySlug } from "./challenges";

const challenge = publicChallengeBySlug["brasileirao-sobrevivencia"];

const closedGuesses: IPublicEvolution["rounds"][number]["guesses"] = [
  {
    _id: "665f0a1b2c3d4e5f607182a1",
    account: { nickName: "maria_dx" },
    ticket: {
      _id: "665f0a1b2c3d4e5f607182b1",
      code: "BX-1042",
      statusInGamming: TicketStatusInGamming.SCALLING,
      saleAuthorized: true,
      marketValue: { value: 180 },
    },
    guess: { _id: "665f0a1b2c3d4e5f607182c1", name: "Flamengo" },
    guessStatus: TicketGuessStatus.CLASSIFIELDED,
  },
  {
    _id: "665f0a1b2c3d4e5f607182a2",
    account: { nickName: "joao_dx" },
    ticket: {
      _id: "665f0a1b2c3d4e5f607182b2",
      code: "BX-1088",
      statusInGamming: TicketStatusInGamming.DROPPED,
      saleAuthorized: false,
    },
    guess: { _id: "665f0a1b2c3d4e5f607182c2", name: "Santos" },
    guessStatus: TicketGuessStatus.ELIMINATED,
  },
];

/** API-04. Visitante: rodada aberta sem palpites alheios. */
export const publicEvolution: IPublicEvolution = {
  challenge,
  rounds: [
    {
      _id: "665f0a1b2c3d4e5f607182d1",
      status: ChallengeRoundStatus.FINISHED,
      sequenceOrder: 11,
      label: "Rodada 11",
      guesses: closedGuesses,
    },
    {
      _id: "665f0a1b2c3d4e5f607182d2",
      status: ChallengeRoundStatus.OPEN_TO_GUESS,
      sequenceOrder: 12,
      label: "Rodada 12",
      guesses: [],
    },
  ],
};

/** API-04 com sessão. A janela aberta traz só o palpite da própria conta. */
export const sessionEvolution: IPublicEvolution = {
  ...publicEvolution,
  challenge: { ...challenge, myTickets: { active: 2, total: 3 } },
  rounds: [
    publicEvolution.rounds[0],
    {
      ...publicEvolution.rounds[1],
      guesses: [
        {
          _id: "665f0a1b2c3d4e5f607182a3",
          account: { nickName: "voce_dx" },
          ticket: {
            _id: "665f0a1b2c3d4e5f607182b3",
            code: "BX-1101",
            statusInGamming: TicketStatusInGamming.READY,
            saleAuthorized: false,
          },
          guess: null,
          guessStatus: TicketGuessStatus.PENDING,
        },
      ],
    },
  ],
};
