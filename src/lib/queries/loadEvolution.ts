import { apiRequest } from "@/lib/api";
import { evaluateChallengePath } from "@/lib/queries/evaluateChallenge";
import { evolutionPayloadFromFixture, normalizeEvolution, type EvolutionView } from "@/lib/queries/evolutionView";
import { publicChallengeBySlug, sessionChallengePage } from "@/mocks/challenges";
import { finishedEvolution, publicEvolution, sessionEvolution, sessionFinishedEvolution } from "@/mocks/evolution";

export async function loadPublicEvolution(slug: string): Promise<EvolutionView | null> {
  const live = await loadLiveEvolution(slug, false);
  if (live) return live;
  return fixtureEvolution(slug, false);
}

export function loadSessionEvolution(slug: string): EvolutionView | null {
  return fixtureEvolution(slug, true);
}

async function loadLiveEvolution(slug: string, signedIn: boolean): Promise<EvolutionView | null> {
  if (!process.env.NEXT_PUBLIC_API_URL) return null;
  try {
    const response = await apiRequest(evaluateChallengePath(slug, signedIn), { auth: signedIn });
    if (!response.ok) return null;
    return normalizeEvolution(await response.json(), { signedIn });
  } catch {
    return null;
  }
}

function fixtureEvolution(slug: string, signedIn: boolean): EvolutionView | null {
  const source =
    slug === publicEvolution.challenge.slug
      ? signedIn
        ? sessionEvolution
        : publicEvolution
      : slug === finishedEvolution.challenge.slug
        ? signedIn
          ? sessionFinishedEvolution
          : finishedEvolution
        : null;
  if (source) {
    return normalizeEvolution(evolutionPayloadFromFixture(source), { signedIn });
  }
  const card = signedIn
    ? sessionChallengePage.items.find((item) => item.slug === slug)
    : publicChallengeBySlug[slug];
  if (!card) return null;
  return { challenge: card, rounds: [], winnerTicketIds: [], winners: [] };
}
