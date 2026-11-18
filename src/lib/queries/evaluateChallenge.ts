/** Consulta do quadro em `/desafios/:slug`. O id aceita `_id` ou slug. */
export const EVALUATE_POPULATE = "championship";

export const EVALUATE_SELECT = [
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
  "challengeRounds._id",
  "challengeRounds.status",
  "challengeRounds.sequenceOrder",
  "challengeRounds.ticketGuesses._id",
  "challengeRounds.ticketGuesses.guessStatus",
  "challengeRounds.ticketGuesses.account.nickName",
  "challengeRounds.ticketGuesses.guess.name",
  "challengeRounds.ticketGuesses.ticket._id",
  "challengeRounds.ticketGuesses.ticket.code",
  "challengeRounds.ticketGuesses.ticket.statusInGamming",
  "challengeRounds.ticketGuessesOwner._id",
  "challengeRounds.ticketGuessesOwner.guessStatus",
  "challengeRounds.ticketGuessesOwner.account.nickName",
  "challengeRounds.ticketGuessesOwner.guess.name",
  "challengeRounds.ticketGuessesOwner.ticket._id",
  "challengeRounds.ticketGuessesOwner.ticket.code",
  "challengeRounds.ticketGuessesOwner.ticket.statusInGamming",
  "challengeRounds.ticketGuessesOthers._id",
  "challengeRounds.ticketGuessesOthers.guessStatus",
  "challengeRounds.ticketGuessesOthers.account.nickName",
  "challengeRounds.ticketGuessesOthers.guess.name",
  "challengeRounds.ticketGuessesOthers.ticket._id",
  "challengeRounds.ticketGuessesOthers.ticket.code",
  "challengeRounds.ticketGuessesOthers.ticket.statusInGamming",
].join(",");

export function evaluateChallengePath(idOrSlug: string, signedIn: boolean) {
  const root = signedIn ? "/challenge" : "/public/challenge";
  const params = new URLSearchParams({
    populate: EVALUATE_POPULATE,
    select: EVALUATE_SELECT,
  });
  return `${root}/${encodeURIComponent(idOrSlug)}/evaluate?${params.toString()}`;
}
