import type { IChallengeRound, ITeam, ITicket, ITicketGuess } from "c2-desafiox";
import type { ApiJson } from "./apiJson";
import type { IPublicChallengeCard } from "./publicChallenge";

type GuessJson = ApiJson<ITicketGuess>;

/** Palpite visível. Janela aberta só devolve o palpite da própria conta. */
export interface IEvolutionGuess {
  _id: GuessJson["_id"];
  account: { nickName: string };
  ticket: Pick<ApiJson<ITicket>, "_id" | "code" | "statusInGamming" | "saleAuthorized"> & {
    marketValue?: { value: number };
  };
  guess: Pick<ApiJson<ITeam>, "_id" | "name"> | null;
  guessStatus: GuessJson["guessStatus"];
}

export interface IEvolutionRound {
  _id: ApiJson<IChallengeRound>["_id"];
  status: IChallengeRound["status"];
  sequenceOrder: number;
  label: string;
  guesses: IEvolutionGuess[];
}

/** Quadro de `/desafios/:slug` quando o desafio já começou. API-04. */
export interface IPublicEvolution {
  challenge: IPublicChallengeCard;
  rounds: IEvolutionRound[];
}
