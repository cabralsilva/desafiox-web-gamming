"use client";

import { useEffect, useId, useRef, useState } from "react";
import { EvolutionBoard } from "@/components/evolution-kanban";
import { CloseIcon } from "@/components/icons";
import { useSession } from "@/components/session-provider";
import { loadMarketTicketEvolution } from "@/lib/actions/marketEvolution";
import type { EvolutionView } from "@/lib/queries/evolutionView";
import type { IMarketTicketCard } from "@/types/marketTicket";

function ticketOnBoard(view: EvolutionView, ticket: IMarketTicketCard) {
  return view.rounds.some((round) =>
    [...round.owners, ...round.others].some((guess) => guess.ticketId === ticket._id || guess.ticketCode === ticket.code),
  );
}

export function MarketTicketEvolutionDialog({
  ticket,
  onClose,
}: {
  ticket: IMarketTicketCard;
  onClose: () => void;
}) {
  const { signedIn } = useSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [view, setView] = useState<EvolutionView | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "empty">("loading");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog?.open) dialog?.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    void loadMarketTicketEvolution({
      slug: ticket.challenge.slug,
      ticketId: ticket._id,
      ticketCode: ticket.code,
    })
      .then((next) => {
        if (cancelled) return;
        setView(next);
        setPhase(next && next.rounds.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (!cancelled) setPhase("empty");
      });
    return () => {
      cancelled = true;
    };
  }, [ticket._id, ticket.code, ticket.challenge.slug]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(1100px,calc(100vw-1.5rem))] max-w-none rounded-lg border border-border bg-background p-4 text-foreground backdrop:bg-black/80 max-md:fixed max-md:inset-0 max-md:m-0 max-md:h-dvh max-md:w-full max-md:max-w-none max-md:rounded-none"
      onClose={onClose}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={titleId} className="truncate text-base font-black tracking-tight">
            Evolução · {ticket.challenge.name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {ticket.code} · @{ticket.account.nickName}
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
      {phase === "loading" ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando evolução…</p> : null}
      {phase === "empty" ? <p className="py-8 text-center text-sm text-muted-foreground">Este desafio ainda não tem rodadas.</p> : null}
      {phase === "ready" && view && !ticketOnBoard(view, ticket) ? (
        <p className="mb-2 text-xs text-muted-foreground">O histórico deste ticket não aparece neste quadro.</p>
      ) : null}
      {phase === "ready" && view ? (
        <div className="max-h-[min(70vh,720px)] overflow-hidden max-md:max-h-none">
          <EvolutionBoard
            rounds={view.rounds}
            currentRound={view.challenge.roundCurrentIndex}
            winnerTicketIds={view.winnerTicketIds}
            running={view.challenge.status === "RUNNING"}
            signedIn={signedIn}
            rulesHtml={view.challenge.descriptionLong}
            highlightTicketId={ticket._id}
            highlightTicketCode={ticket.code}
            onMakeGuess={() => undefined}
          />
        </div>
      ) : null}
    </dialog>
  );
}
