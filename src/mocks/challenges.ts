import {
  ChallengeRoundStatus,
  ChallengeStatus,
  ChallengeType,
  ChallengeVisibility,
  Modality,
} from "c2-desafiox";
import type { IPage, IPublicChallengeCard } from "../types";

const premiacao = "<p>O prêmio acumulado é dividido entre os tickets que chegarem mais longe.</p>";

const copa: IPublicChallengeCard = {
  _id: "665f0a1b2c3d4e5f60718293",
  name: "Copa sobrevivência",
  slug: "copa-sobrevivencia",
  status: ChallengeStatus.OPEN_TO_BUY_TICKETS,
  type: ChallengeType.SURVIVAL,
  visibility: ChallengeVisibility.PUBLIC,
  budgetAccumulated: 15000,
  descriptionShort: "Escolha um time por rodada. Quem errar, sai.",
  descriptionLong: premiacao,
  pricing: [
    {
      initDateTime: "2026-06-01T03:00:00.000Z",
      endDateTime: "2026-06-10T02:59:59.000Z",
      value: 25,
    },
    {
      initDateTime: "2026-06-10T03:00:00.000Z",
      endDateTime: "2026-06-20T02:59:59.000Z",
      value: 40,
    },
  ],
  roundStartIndex: 1,
  roundCurrentIndex: 1,
  roundEndIndex: 8,
  roundCurrentStatus: ChallengeRoundStatus.SCHEDULED,
  championship: { name: "Copa do Mundo", modality: Modality.SOCCER },
};

const brasileirao: IPublicChallengeCard = {
  _id: "665f0a1b2c3d4e5f60718294",
  name: "Brasileirão sobrevivência",
  slug: "brasileirao-sobrevivencia",
  status: ChallengeStatus.RUNNING,
  type: ChallengeType.SURVIVAL,
  visibility: ChallengeVisibility.PUBLIC,
  budgetAccumulated: 48200,
  descriptionShort: "Uma escolha por rodada, sem repetir time.",
  descriptionLong: premiacao,
  pricing: [
    {
      initDateTime: "2026-04-01T03:00:00.000Z",
      endDateTime: "2026-04-12T02:59:59.000Z",
      value: 30,
    },
  ],
  roundStartIndex: 1,
  roundCurrentIndex: 12,
  roundEndIndex: 38,
  roundCurrentStatus: ChallengeRoundStatus.OPEN_TO_GUESS,
  championship: { name: "Brasileirão Série A", modality: Modality.SOCCER },
};

const encerrado: IPublicChallengeCard = {
  _id: "665f0a1b2c3d4e5f60718295",
  name: "Estadual sobrevivência",
  slug: "estadual-sobrevivencia",
  status: ChallengeStatus.FINISHED,
  type: ChallengeType.SURVIVAL,
  visibility: ChallengeVisibility.PUBLIC,
  budgetAccumulated: 9100,
  descriptionShort: "Desafio encerrado.",
  descriptionLong: premiacao,
  pricing: [
    {
      initDateTime: "2026-01-05T03:00:00.000Z",
      endDateTime: "2026-01-20T02:59:59.000Z",
      value: 20,
    },
  ],
  roundStartIndex: 1,
  roundCurrentIndex: 16,
  roundEndIndex: 16,
  roundCurrentStatus: ChallengeRoundStatus.FINISHED,
  championship: { name: "Campeonato Paulista", modality: Modality.SOCCER },
};

/** API-01. Lista pública, sem contagem de tickets da sessão. */
export const publicChallengePage: IPage<IPublicChallengeCard> = {
  items: [copa, brasileirao, encerrado],
  paging: {
    total: 3,
    page: 1,
    limit: 12,
    totalPages: 1,
    startIndex: 1,
    endIndex: 3,
  },
};

/** API-01 + API-03. A mesma lista com ativos/total da sessão. */
export const sessionChallengePage: IPage<IPublicChallengeCard> = {
  items: [
    copa,
    { ...brasileirao, myTickets: { active: 2, total: 3 } },
    { ...encerrado, myTickets: { active: 0, total: 1 } },
  ],
  paging: publicChallengePage.paging,
};

/** API-02. */
export const publicChallengeBySlug: Record<string, IPublicChallengeCard> = {
  [copa.slug]: copa,
  [brasileirao.slug]: brasileirao,
  [encerrado.slug]: encerrado,
};
