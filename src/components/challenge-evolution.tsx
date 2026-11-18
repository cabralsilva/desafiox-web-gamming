"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BuyTicketsDialog, clearPendingTicketOrder, readPendingTicketOrder } from "@/components/buy-tickets-dialog";
import { ChevronLeftIcon } from "@/components/icons";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { formatMoneyBR } from "@/lib/money";
import { evaluateChallengePath } from "@/lib/queries/evaluateChallenge";
import { normalizeEvolution, type EvolutionRoundView, type EvolutionView } from "@/lib/queries/evolutionView";
import { cn } from "@/lib/utils";

const MODALITY_LABEL: Record<string, string> = {
  SOCCER: "Futebol",
  BASKETBALL: "Basquete",
  TENNIS: "Tênis",
  VOLLEYBALL: "Vôlei",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN_TO_BUY_TICKETS: "Não iniciado",
  RUNNING: "Em andamento",
  FINISHED: "Finalizado",
};

const ROUND_LABEL: Record<string, string> = {
  OPEN_TO_GUESS: "Janela aberta",
  FINISHED: "Encerrada",
  SCHEDULED: "Prevista",
  IN_PROGRESS: "Em jogo",
};

const GUESS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CLASSIFIELDED: "Classificado",
  ELIMINATED: "Eliminado",
};

export function ChallengeEvolution({
  initial,
  sessionFallback,
  ticketOrderId,
}: {
  initial: EvolutionView;
  sessionFallback: EvolutionView | null;
  ticketOrderId: string;
}) {
  const { signedIn } = useSession();
  const [view, setView] = useState(initial);
  const [buyOpen, setBuyOpen] = useState(Boolean(ticketOrderId));
  const [pendingOrderId, setPendingOrderId] = useState(ticketOrderId || null);

  useEffect(() => {
    const stored = ticketOrderId || readPendingTicketOrder() || "";
    if (!stored) return;
    setPendingOrderId(stored);
    setBuyOpen(true);
    clearPendingTicketOrder();
  }, [ticketOrderId]);

  useEffect(() => {
    if (!signedIn) {
      setView(initial);
      return;
    }
    let cancelled = false;
    void apiRequest(evaluateChallengePath(initial.challenge.slug, true), { auth: true })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          if (sessionFallback) setView(sessionFallback);
          return;
        }
        const next = normalizeEvolution(await response.json(), { signedIn: true });
        if (!cancelled) setView(next ?? sessionFallback ?? initial);
      })
      .catch(() => {
        if (!cancelled && sessionFallback) setView(sessionFallback);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, initial, sessionFallback]);

  const { challenge, rounds, winners } = view;
  const openToBuy = challenge.status === "OPEN_TO_BUY_TICKETS";
  const guessOpen = challenge.status === "RUNNING" && challenge.roundCurrentStatus === "OPEN_TO_GUESS";

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-border bg-card p-5">
        <p>
          <Link
            href="/"
            aria-label="Voltar aos desafios"
            className="inline-flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronLeftIcon className="h-5 w-5" /> Voltar
          </Link>
        </p>
        <p className={cn("text-xs font-semibold", challenge.status === "RUNNING" ? "text-highlight" : "text-muted-foreground")}>
          {STATUS_LABEL[challenge.status] ?? challenge.status}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">{challenge.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {MODALITY_LABEL[challenge.championship.modality] ?? challenge.championship.modality} · {challenge.championship.name}
        </p>
        {challenge.descriptionShort ? <p className="mt-3 text-sm text-foreground">{challenge.descriptionShort}</p> : null}
        <div className="mt-4 flex flex-wrap gap-6 text-sm">
          <p>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prêmio</span>
            <span className="font-bold text-highlight">{formatMoneyBR(challenge.budgetAccumulated)}</span>
          </p>
          <p>
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Rodadas</span>
            <span className="font-semibold">
              {challenge.roundStartIndex} a {challenge.roundEndIndex}
            </span>
          </p>
        </div>
        {guessOpen ? (
          <p className="mt-4 rounded-md border border-highlight/40 bg-highlight/10 px-3 py-2 text-sm">
            Janela de palpites aberta para a rodada {challenge.roundCurrentIndex}.
            {signedIn ? "" : " Entre na DESAFIOX para registrar o seu."}
          </p>
        ) : null}
        {openToBuy ? (
          <div className="mt-4 flex justify-end">
            <Button type="button" onClick={() => setBuyOpen(true)}>
              Comprar tickets
            </Button>
          </div>
        ) : null}
      </header>

      {winners.length > 0 ? (
        <section>
          <h2 className="text-lg font-black">Vencedores</h2>
          <ul className="mt-3 space-y-2">
            {winners.map((winner) => (
              <li key={winner.ticketCode} className="rounded-md border border-border bg-card px-4 py-3 text-sm">
                <span className="font-semibold">{winner.nickName}</span>
                <span className="text-muted-foreground"> · {winner.ticketCode}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {rounds.length > 0 ? (
        <section>
          <h2 className="text-lg font-black">Rodadas</h2>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rounds.map((round) => (
              <RoundColumn key={round.id} round={round} />
            ))}
          </div>
        </section>
      ) : null}

      <BuyTicketsDialog
        challenge={challenge}
        open={buyOpen}
        pendingOrderId={pendingOrderId}
        onOpenChange={(next) => {
          setBuyOpen(next);
          if (!next) setPendingOrderId(null);
        }}
      />
    </div>
  );
}

function RoundColumn({ round }: { round: EvolutionRoundView }) {
  return (
    <article className="w-64 shrink-0 rounded-lg border border-border bg-card p-4">
      <h3 className="font-bold">{round.label}</h3>
      <p className="text-xs text-muted-foreground">{ROUND_LABEL[round.status] ?? round.status}</p>
      {round.guesses.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {round.status === "OPEN_TO_GUESS" ? "Palpites desta janela ficam só com quem está na conta." : "Sem palpites nesta rodada."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {round.guesses.map((guess) => (
            <li key={guess.id} className="rounded-md border border-border px-3 py-2 text-sm">
              <p className="font-semibold">{guess.own ? "Seu ticket" : guess.nickName}</p>
              <p className="text-muted-foreground">{guess.ticketCode}</p>
              <p>{guess.teamName ?? "Ainda sem palpite"}</p>
              <p className="text-xs text-muted-foreground">{GUESS_LABEL[guess.guessStatus] ?? guess.guessStatus}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
