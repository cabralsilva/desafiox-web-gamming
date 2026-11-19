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
      initDateTime: "2026-08-01T03:00:00.000Z",
      endDateTime: "2026-09-01T02:59:59.000Z",
      value: 20,
    },
    {
      initDateTime: "2026-09-01T03:00:00.000Z",
      endDateTime: "2026-10-01T02:59:59.000Z",
      value: 30,
    },
    {
      initDateTime: "2026-10-01T03:00:00.000Z",
      endDateTime: "2026-11-01T02:59:59.000Z",
      value: 40,
    },
    {
      initDateTime: "2026-11-01T03:00:00.000Z",
      endDateTime: "2026-12-01T02:59:59.000Z",
      value: 55,
    },
    {
      initDateTime: "2026-12-01T03:00:00.000Z",
      endDateTime: "2027-01-01T02:59:59.000Z",
      value: 70,
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

const libertadores: IPublicChallengeCard = {
  _id: "665f0a1b2c3d4e5f60718296",
  name: "Libertadores sobrevivência",
  slug: "libertadores-sobrevivencia",
  status: ChallengeStatus.RUNNING,
  type: ChallengeType.SURVIVAL,
  visibility: ChallengeVisibility.PUBLIC,
  budgetAccumulated: 22000,
  descriptionShort: "Palpites fechados. O resultado desta rodada ainda não saiu.",
  descriptionLong: premiacao,
  pricing: [
    {
      initDateTime: "2026-02-01T03:00:00.000Z",
      endDateTime: "2026-02-20T02:59:59.000Z",
      value: 40,
    },
  ],
  roundStartIndex: 1,
  roundCurrentIndex: 8,
  roundEndIndex: 16,
  roundCurrentStatus: ChallengeRoundStatus.CLOSED_TO_GUESS,
  championship: { name: "Libertadores", modality: Modality.SOCCER },
};

const sulAmericana: IPublicChallengeCard = {
  _id: "665f0a1b2c3d4e5f60718297",
  name: "Sul-Americana sobrevivência",
  slug: "sul-americana-sobrevivencia",
  status: ChallengeStatus.RUNNING,
  type: ChallengeType.SURVIVAL,
  visibility: ChallengeVisibility.PUBLIC,
  budgetAccumulated: 28000,
  descriptionShort: "A rodada vigente está encerrada e os resultados já saíram.",
  descriptionLong: premiacao,
  pricing: [
    {
      initDateTime: "2026-03-01T03:00:00.000Z",
      endDateTime: "2026-03-18T02:59:59.000Z",
      value: 35,
    },
  ],
  roundStartIndex: 1,
  roundCurrentIndex: 6,
  roundEndIndex: 12,
  roundCurrentStatus: ChallengeRoundStatus.FINISHED,
  championship: { name: "Sul-Americana", modality: Modality.SOCCER },
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
  items: [copa, brasileirao, libertadores, sulAmericana, encerrado],
  paging: {
    total: 5,
    page: 1,
    limit: 12,
    totalPages: 1,
    startIndex: 1,
    endIndex: 5,
  },
};

/** API-01 + API-03. A mesma lista com ativos/total da sessão. */
export const sessionChallengePage: IPage<IPublicChallengeCard> = {
  items: [
    copa,
    { ...brasileirao, myTickets: { active: 2, total: 3 } },
    { ...libertadores, myTickets: { active: 1, total: 2 } },
    { ...sulAmericana, myTickets: { active: 1, total: 2 } },
    { ...encerrado, myTickets: { active: 0, total: 1 } },
  ],
  paging: publicChallengePage.paging,
};

/** API-02. */
export const publicChallengeBySlug: Record<string, IPublicChallengeCard> = {
  [copa.slug]: copa,
  [brasileirao.slug]: brasileirao,
  [libertadores.slug]: libertadores,
  [sulAmericana.slug]: sulAmericana,
  [encerrado.slug]: encerrado,
};
