"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BuyTicketsDialog, clearPendingTicketOrder, readPendingTicketOrder } from "@/components/buy-tickets-dialog";
import { ChallengeTypeTag } from "@/components/challenge-type-tag";
import { ChevronLeftIcon, ScrollHintIcon } from "@/components/icons";
import { RulesDialog } from "@/components/rules-dialog";
import { useSession } from "@/components/session-provider";
import { apiRequest } from "@/lib/api";
import { formatDateBR, isCurrentPricingWindow } from "@/lib/dates";
import { formatMoneyBR } from "@/lib/money";
import { evaluateChallengePath } from "@/lib/queries/evaluateChallenge";
import { EvolutionKanban } from "@/components/evolution-kanban";
import { MakeGuessDialog } from "@/components/make-guess-dialog";
import { normalizeEvolution, type EvolutionGuessView, type EvolutionRoundView, type EvolutionView } from "@/lib/queries/evolutionView";
import { cn } from "@/lib/utils";
import type { IPublicChallengeCard } from "@/types/publicChallenge";

const MODALITY_LABEL: Record<string, string> = {
  SOCCER: "Futebol",
  BASKETBALL: "Basquete",
  TENNIS: "Tênis",
  VOLLEYBALL: "Vôlei",
  HANDBALL: "Handebol",
  GOLF: "Golfe",
  BASEBALL: "Beisebol",
  HOCKEY: "Hóquei",
  AMERICAN_FOOTBALL: "Futebol americano",
  RUGBY: "Rúgbi",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  OPEN_TO_BUY_TICKETS: "Não iniciado",
  RUNNING: "Em andamento",
  FINISHED: "Finalizado",
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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [guessTarget, setGuessTarget] = useState<{ guess: EvolutionGuessView; round: EvolutionRoundView } | null>(null);

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
        if (!cancelled && next) setView(next);
      })
      .catch(() => {
        if (!cancelled && sessionFallback) setView(sessionFallback);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, initial, sessionFallback]);

  const { challenge, rounds, winners, winnerTicketIds } = view;
  const showKanban =
    (challenge.status === "OPEN_TO_BUY_TICKETS" || challenge.status === "RUNNING" || challenge.status === "FINISHED") &&
    rounds.length > 0;
  const notStarted = challenge.status === "OPEN_TO_BUY_TICKETS";

  return (
    <div className="space-y-4">
      <header className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="px-4 pb-2 pt-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1">
              <Link
                href="/"
                aria-label="Voltar aos desafios"
                className="inline-flex h-8 shrink-0 items-center gap-0.5 pr-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronLeftIcon className="h-4 w-4" /> Voltar
              </Link>
              <div className="min-w-0">
                <h1 className="truncate text-base font-black leading-tight tracking-tight">{challenge.name}</h1>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                  <ChallengeTypeTag type={challenge.type} />
                  <p className="truncate text-xs leading-tight text-muted-foreground">
                    {MODALITY_LABEL[challenge.championship.modality] ?? challenge.championship.modality} · {challenge.championship.name}
                  </p>
                </div>
              </div>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                challenge.status === "RUNNING" && "border-highlight text-highlight",
                challenge.status === "FINISHED" && "border-border text-muted-foreground",
                notStarted && "border-accent text-accent",
              )}
            >
              {STATUS_LABEL[challenge.status] ?? challenge.status}
            </span>
          </div>
          <PricingTimeline
            windows={challenge.pricing}
            action={
              challenge.status === "OPEN_TO_BUY_TICKETS"
                ? "buy"
                : challenge.status === "RUNNING"
                  ? "market"
                  : challenge.status === "FINISHED"
                    ? "closed"
                    : "none"
            }
            marketHref={`/mercado?q=${encodeURIComponent(challenge.name)}`}
            onBuy={() => setBuyOpen(true)}
          />
          {winners.length > 0 ? (
            <div className="mt-2">
              <p className="text-[11px] font-semibold">Vencedores</p>
              <ul className="mt-1 space-y-1">
                {winners.map((winner) => (
                  <li key={winner.ticketCode} className="rounded-md border border-border px-2.5 py-1 text-xs">
                    <span className="font-semibold">{winner.nickName}</span>
                    <span className="text-muted-foreground"> · {winner.ticketCode}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <footer className="flex border-t border-border">
          <FooterCell>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prêmio</span>
            <span className="text-sm font-bold text-highlight">{formatMoneyBR(challenge.budgetAccumulated)}</span>
          </FooterCell>
          <button type="button" className={footerActionClass} onClick={() => setRulesOpen(true)}>
            Ver regras
          </button>
        </footer>
      </header>

      {showKanban && rounds.length > 0 ? (
        <EvolutionKanban
          rounds={rounds}
          currentRound={challenge.roundCurrentIndex}
          winnerTicketIds={winnerTicketIds}
          running={challenge.status === "RUNNING"}
          signedIn={signedIn}
          rulesHtml={challenge.descriptionLong}
          onMakeGuess={(guess, round) => {
            if (signedIn) setGuessTarget({ guess, round });
          }}
        />
      ) : null}

      {guessTarget ? (
        <MakeGuessDialog
          open
          signedIn={signedIn}
          challengeId={challenge._id}
          challengeName={challenge.name}
          championshipName={challenge.championship.name}
          ticketGuessId={guessTarget.guess.id}
          challengeRoundId={guessTarget.round.id}
          ticketId={guessTarget.guess.ticketId}
          ticketCode={guessTarget.guess.ticketCode}
          roundNumber={guessTarget.round.sequenceOrder}
          onOpenChange={(next) => {
            if (!next) setGuessTarget(null);
          }}
          onConfirmed={() => {
            void apiRequest(evaluateChallengePath(challenge.slug, true), { auth: true })
              .then(async (response) => {
                if (!response.ok) return;
                const next = normalizeEvolution(await response.json(), { signedIn: true });
                if (next) setView(next);
              })
              .catch(() => undefined);
          }}
        />
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
      {rulesOpen ? (
        <RulesDialog
          title={`Regras · ${challenge.name}`}
          html={challenge.descriptionLong}
          onClose={() => setRulesOpen(false)}
        />
      ) : null}
    </div>
  );
}

const footerActionClass =
  "flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-l border-border px-2 py-1.5 text-center text-xs font-semibold first:border-l-0";

function FooterCell({ children }: { children: ReactNode }) {
  return <div className={footerActionClass}>{children}</div>;
}

const timelineActionClass =
  "mt-1 inline-flex h-7 items-center whitespace-nowrap rounded-md bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground";

const timelineInfoClass =
  "mt-1 inline-flex h-7 cursor-default items-center whitespace-nowrap rounded-md bg-muted-foreground px-2.5 text-[11px] font-semibold text-background";

function TimelineNode({
  emphasized,
  connect,
  activeLine,
}: {
  emphasized: boolean;
  connect: boolean;
  activeLine: boolean;
}) {
  return (
    <span className="relative flex h-3 w-full items-center justify-center">
      {connect ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-1/2 top-1/2 w-[calc(100%+1rem)] -translate-y-1/2",
            activeLine ? "h-1 bg-highlight" : "h-px bg-border",
          )}
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "relative h-2.5 w-2.5 rounded-full border-2",
          emphasized ? "border-highlight bg-highlight" : "border-border bg-card",
        )}
      />
    </span>
  );
}

function PricingTimeline({
  windows,
  action,
  marketHref,
  onBuy,
}: {
  windows: IPublicChallengeCard["pricing"];
  action: "buy" | "market" | "closed" | "none";
  marketHref: string;
  onBuy: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLLIElement>(null);
  const leadRef = useRef<HTMLLIElement>(null);
  const tailRef = useRef<HTMLLIElement>(null);
  const dateIndex = windows.findIndex((window) => isCurrentPricingWindow(window, new Date()));
  const hasTrailingStep = action === "market" || action === "closed";
  const focusStepIndex = hasTrailingStep ? windows.length : dateIndex >= 0 ? dateIndex : windows.length - 1;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = focusRef.current;
    const lead = leadRef.current;
    const tail = tailRef.current;
    if (!scroller || !item || !lead || !tail) return;

    const align = () => {
      const pad = Math.max(0, (scroller.clientWidth - item.offsetWidth) / 2);
      lead.style.width = `${pad}px`;
      tail.style.width = `${pad}px`;
      scroller.scrollLeft = item.offsetLeft - pad;
    };

    align();
    const observer = new ResizeObserver(align);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [focusStepIndex, windows.length]);

  if (windows.length === 0) return null;

  const stepCount = windows.length + (hasTrailingStep ? 1 : 0);

  return (
    <div className="relative mt-2 -mx-4 bg-muted/50">
      <div className="pointer-events-none flex flex-col items-center gap-0.5 pt-1.5" aria-hidden="true">
        <span className="text-[10px] font-semibold leading-none text-muted-foreground">Janelas de compra</span>
        <ScrollHintIcon className="h-2 w-7 text-muted-foreground/80" />
      </div>
      <div
        ref={scrollerRef}
        aria-label="Janelas de preço"
        className="overflow-x-auto pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="flex w-max items-stretch">
          <li ref={leadRef} aria-hidden="true" className="shrink-0" />
          {windows.map((window, index) => {
            const past = index < focusStepIndex;
            const centered = index === focusStepIndex;
            const buyHere = action === "buy" && centered;
            return (
              <li
                key={`${window.initDateTime}-${window.endDateTime}-${window.value}`}
                ref={centered ? focusRef : undefined}
                aria-current={centered ? "true" : undefined}
                className={cn("flex w-40 shrink-0 flex-col items-center px-2 text-center", past && "blur-[0.5px]")}
              >
                <span className="mb-1 text-[10px] leading-none text-muted-foreground">Até {formatDateBR(window.endDateTime)}</span>
                <TimelineNode emphasized={index <= focusStepIndex} connect={index < stepCount - 1} activeLine={past} />
                {buyHere ? (
                  <button type="button" className={timelineActionClass} onClick={onBuy}>
                    {formatMoneyBR(window.value)} Comprar
                  </button>
                ) : (
                  <span className={cn("mt-1 text-xs font-semibold leading-none", past && "text-muted-foreground line-through")}>
                    {formatMoneyBR(window.value)}
                  </span>
                )}
              </li>
            );
          })}
          {hasTrailingStep ? (
            <li
              ref={focusRef}
              aria-current="true"
              className="flex w-40 shrink-0 flex-col items-center px-2 text-center"
            >
              <span className="mb-1 h-2.5" aria-hidden="true" />
              <TimelineNode emphasized connect={false} activeLine={false} />
              {action === "market" ? (
                <Link href={marketHref} className={timelineActionClass}>
                  Ir ao mercado
                </Link>
              ) : (
                <span className={timelineInfoClass}>{STATUS_LABEL.FINISHED}</span>
              )}
            </li>
          ) : null}
          <li ref={tailRef} aria-hidden="true" className="shrink-0" />
        </ol>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
    </div>
  );
}

