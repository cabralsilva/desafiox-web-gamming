import { PUBLIC_CHALLENGE_POPULATE, PUBLIC_CHALLENGE_SELECT } from "@/types/publicChallenge";

/**
 * Consulta de exemplo da listagem de desafios.
 * populate: championship
 * select: campos do card em PUBLIC_CHALLENGE_SELECT
 * O token, quando a chamada é autenticada, vai só no header Authorization.
 */
export function publicChallengePath(input: { page?: number; limit?: number } = {}) {
  const params = new URLSearchParams({
    populate: PUBLIC_CHALLENGE_POPULATE,
    select: PUBLIC_CHALLENGE_SELECT,
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 12),
    orderBy: "_id",
    orderSense: "desc",
  });
  return `/challenge?${params.toString()}`;
}
