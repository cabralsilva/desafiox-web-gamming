"use server";

import { loadPublicEvolution } from "@/lib/queries/loadEvolution";
import { evolutionPayloadFromFixture, normalizeEvolution, type EvolutionView } from "@/lib/queries/evolutionView";
import { closedRoundEvolution, finishedEvolution, finishedRoundEvolution, publicEvolution } from "@/mocks/evolution";

function hasTicket(view: EvolutionView, ticketId: string, ticketCode: string) {
  return view.rounds.some((round) =>
    [...round.owners, ...round.others].some(
      (guess) => (ticketId && guess.ticketId === ticketId) || (ticketCode && guess.ticketCode === ticketCode),
    ),
  );
}

/** Quadro do desafio para o diálogo do mercado. Sem API, procura o ticket nos mocks. */
export async function loadMarketTicketEvolution(input: {
  slug: string;
  ticketId: string;
  ticketCode: string;
}): Promise<EvolutionView | null> {
  const slugView = input.slug ? await loadPublicEvolution(input.slug) : null;
  if (process.env.NEXT_PUBLIC_API_URL) return slugView;
  if (slugView && hasTicket(slugView, input.ticketId, input.ticketCode)) return slugView;

  for (const source of [publicEvolution, closedRoundEvolution, finishedRoundEvolution, finishedEvolution]) {
    const view = normalizeEvolution(evolutionPayloadFromFixture(source), { signedIn: false });
    if (view && hasTicket(view, input.ticketId, input.ticketCode)) return view;
  }
  return slugView;
}
