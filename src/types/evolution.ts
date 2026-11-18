import type { IChallengeRound, ITeam, ITicket, ITicketGuess } from "c2-desafiox";
import type { ApiJson } from "./apiJson";
import type { IPublicChallengeCard } from "./publicChallenge";

type GuessJson = ApiJson<ITicketGuess>;

/** Card de palpite no kanban. Visitante lista todos como `ticketGuessesOthers`. */
export interface IEvolutionGuess {
  _id: GuessJson["_id"];
  account: { nickName: string };
  ticket: Pick<ApiJson<ITicket>, "_id" | "code" | "statusInGamming" | "saleAuthorized"> & {
    marketValue?: { value: number };
    points?: number;
  };
  guess: Pick<ApiJson<ITeam>, "_id" | "name"> | null;
  guessStatus: GuessJson["guessStatus"];
  points?: number;
  isAutomatic?: boolean;
}

export interface IEvolutionRound {
  _id: ApiJson<IChallengeRound>["_id"];
  status: IChallengeRound["status"];
  sequenceOrder: number;
  label: string;
  /** Palpites da conta, campo `ticketGuessesOwner`. */
  owners: IEvolutionGuess[];
  /** Demais palpites. No anônimo, `ticketGuesses` inteiro entra aqui. */
  others: IEvolutionGuess[];
}

/** Quadro de `/desafios/:slug` quando o desafio já começou. API-04. */
export interface IPublicEvolution {
  challenge: IPublicChallengeCard;
  rounds: IEvolutionRound[];
  winnerTicketIds?: string[];
}
