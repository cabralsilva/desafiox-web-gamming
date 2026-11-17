import type { IChallenge, IChallengePricing, IChampionship } from "c2-desafiox";
import type { ApiJson } from "./apiJson";

/** Ativos / total dos tickets pagos da sessão naquele desafio. Só vem com sessão. */
export interface IMyTicketsSummary {
  active: number;
  total: number;
}

type ChallengeJson = ApiJson<IChallenge>;

/** Campos do card e da vitrine. Projeção pública; não é o documento inteiro. */
export interface IPublicChallengeCard {
  _id: ChallengeJson["_id"];
  name: ChallengeJson["name"];
  slug: ChallengeJson["slug"];
  status: ChallengeJson["status"];
  type: ChallengeJson["type"];
  visibility: ChallengeJson["visibility"];
  budgetAccumulated: ChallengeJson["budgetAccumulated"];
  descriptionShort: ChallengeJson["descriptionShort"];
  descriptionLong: ChallengeJson["descriptionLong"];
  pricing: ApiJson<IChallengePricing>[];
  roundStartIndex: ChallengeJson["roundStartIndex"];
  roundCurrentIndex: ChallengeJson["roundCurrentIndex"];
  roundEndIndex: ChallengeJson["roundEndIndex"];
  roundCurrentStatus: ChallengeJson["roundCurrentStatus"];
  championship: Pick<ApiJson<IChampionship>, "name" | "modality">;
  myTickets?: IMyTicketsSummary;
}

export const PUBLIC_CHALLENGE_POPULATE = "championship";

export const PUBLIC_CHALLENGE_SELECT = [
  "name",
  "slug",
  "status",
  "type",
  "visibility",
  "budgetAccumulated",
  "descriptionShort",
  "descriptionLong",
  "pricing",
  "roundStartIndex",
  "roundCurrentIndex",
  "roundEndIndex",
  "roundCurrentStatus",
  "championship.name",
  "championship.modality",
].join(",");
