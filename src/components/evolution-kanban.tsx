"use client";

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CrownIcon, ScrollHintIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { leadingTicketKeys, showsGuessTeam, type EvolutionGuessView, type EvolutionRoundView } from "@/lib/queries/evolutionView";
import { cn } from "@/lib/utils";

const ROUND_LABEL: Record<string, string> = {
  OPEN_TO_GUESS: "Palpites abertos",
  CLOSED_TO_GUESS: "Palpites fechados",
  IN_PROGRESS: "Em jogo",
  IN_HOMOLOGATION: "Homologação",
  FINISHED: "Encerrada",
  CANCELLED: "Cancelada",
  SCHEDULED: "Aguardando",
};

const GUESS_LABEL: Record<string, string> = {
  ELIMINATED: "Eliminado",
  CLASSIFIELDED: "Classificado",
  PENDING: "Selecionado",
};

const LEADER_HINT = "Dada a pontuação, este ticket seria vencedor até o momento.";

export function EvolutionKanban({
  rounds,
  currentRound,
  winnerTicketIds,
  running,
  signedIn,
  onMakeGuess,
}: {
  rounds: EvolutionRoundView[];
  currentRound: number;
  winnerTicketIds: string[];
  running: boolean;
  signedIn: boolean;
  onMakeGuess: (guess: EvolutionGuessView, round: EvolutionRoundView) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<(behavior?: ScrollBehavior) => void>(() => undefined);
  const [recall, setRecall] = useState<"left" | "right" | null>(null);
  const [trailId, setTrailId] = useState<string | null>(null);
  const winners = new Set(winnerTicketIds);
  const focusIndex = Math.max(
    0,
    rounds.findIndex((round) => round.sequenceOrder === currentRound),
  );

  useLayoutEffect(() => {
    const pane = scroller.current;
    const item = focusRef.current;
    const lead = leadRef.current;
    const tail = tailRef.current;
    if (!pane || !item || !lead || !tail) return;

    const align = (behavior: ScrollBehavior = "auto") => {
      const pad = Math.max(0, (pane.clientWidth - item.offsetWidth) / 2);
      lead.style.width = `${pad}px`;
      tail.style.width = `${pad}px`;
      pane.scrollTo({ left: item.offsetLeft - pad, behavior });
    };

    alignRef.current = align;
    align();
    const observer = new ResizeObserver(() => align());
    observer.observe(pane);
    return () => observer.disconnect();
  }, [focusIndex, rounds.length]);

  useEffect(() => {
    const pane = scroller.current;
    const item = focusRef.current;
    if (!pane || !item) return;

    const update = () => {
      const view = pane.getBoundingClientRect();
      const stage = item.getBoundingClientRect();
      if (stage.right <= view.left + 8) setRecall("left");
      else if (stage.left >= view.right - 8) setRecall("right");
      else setRecall(null);
    };

    update();
    pane.addEventListener("scroll", update, { passive: true });
    return () => pane.removeEventListener("scroll", update);
  }, [focusIndex, rounds.length]);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider">Palpites por rodada</h2>
      <div className="relative">
        <div className="pointer-events-none flex justify-center pb-1" aria-hidden="true">
          <ScrollHintIcon className="h-1.5 w-4 text-muted-foreground/80" />
        </div>
        <div
          ref={scroller}
          className="overflow-x-auto overflow-y-hidden pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex w-max items-stretch">
            <div ref={leadRef} aria-hidden="true" className="shrink-0" />
            {rounds.map((round, index) => (
              <RoundColumn
                key={round.id}
                round={round}
                current={index === focusIndex}
                distance={index > focusIndex ? index - focusIndex : 0}
                connect={index < rounds.length - 1}
                reached={index <= focusIndex}
                trail={roundHasTicket(round, trailId)}
                trailContinues={roundHasTicket(rounds[index + 1], trailId)}
                trailId={trailId}
                onToggleTrail={(ticketId) => setTrailId((current) => (current === ticketId ? null : ticketId))}
                columnRef={index === focusIndex ? focusRef : undefined}
                winners={winners}
                running={running}
                signedIn={signedIn}
                onMakeGuess={onMakeGuess}
              />
            ))}
            <div ref={tailRef} aria-hidden="true" className="shrink-0" />
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-background to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
        {recall ? (
          <button
            type="button"
            aria-label={`Centralizar a rodada ${currentRound}`}
            className={cn(
              "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm",
              recall === "left" ? "left-2" : "right-2",
            )}
            onClick={() => alignRef.current("smooth")}
          >
            {recall === "left" ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ticketKey(guess: EvolutionGuessView) {
  return guess.ticketId || guess.ticketCode;
}

function roundHasTicket(round: EvolutionRoundView | undefined, ticketId: string | null) {
  if (!round || !ticketId) return false;
  return [...round.owners, ...round.others].some((guess) => ticketKey(guess) === ticketId);
}

function distanceBlur(distance: number) {
  if (distance <= 0) return undefined;
  return `blur(${Math.min(1.25, distance * 0.4)}px)`;
}

function RoundColumn({
  round,
  current,
  distance,
  connect,
  reached,
  trail,
  trailContinues,
  trailId,
  onToggleTrail,
  columnRef,
  winners,
  running,
  signedIn,
  onMakeGuess,
}: {
  round: EvolutionRoundView;
  current: boolean;
  distance: number;
  connect: boolean;
  reached: boolean;
  trail: boolean;
  trailContinues: boolean;
  trailId: string | null;
  onToggleTrail: (ticketId: string) => void;
  columnRef?: Ref<HTMLDivElement>;
  winners: Set<string>;
  running: boolean;
  signedIn: boolean;
  onMakeGuess: (guess: EvolutionGuessView, round: EvolutionRoundView) => void;
}) {
  const owners = [...round.owners].sort(byPoints);
  const others = [...round.others].sort(byPoints);
  const total = owners.length + others.length;
  const leaders = current && running ? leadingTicketKeys([...owners, ...others]) : new Set<string>();

  return (
    <div
      ref={columnRef}
      aria-current={current ? "step" : undefined}
      className="flex w-[172px] shrink-0 flex-col sm:w-[188px]"
      style={{ filter: distanceBlur(distance) }}
    >
      <TimelineNode
        emphasized={reached}
        connect={connect}
        activeLine={!current && reached}
        trail={trail}
        trailLine={trailContinues}
      />
      <article
        className={cn(
          "mx-1.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm",
          current ? "border-accent/45 ring-1 ring-accent/25" : "border-border",
        )}
      >
      <header className={cn("border-b px-3 py-3 text-center", current ? "border-accent/20 bg-accent/10" : "border-border bg-secondary/40")}>
        <p className="text-[10px] font-bold uppercase tracking-widest">Rodada {round.sequenceOrder}</p>
        <span
          className={cn(
            "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            round.status === "OPEN_TO_GUESS" ? "bg-success/20 text-success" : "bg-secondary text-muted-foreground",
          )}
        >
          {ROUND_LABEL[round.status] ?? "Aguardando"}
        </span>
        <p className="mt-1 text-[8px] tabular-nums text-muted-foreground">
          Total tickets: {total} · Meus tickets: {owners.length}
        </p>
      </header>
      <div className="flex min-h-72 flex-1 flex-col gap-1.5 bg-background/30 p-2">
        {total === 0 ? (
          <div className="flex min-h-[62px] items-center justify-center rounded-md border border-dashed border-border/50 px-2 text-center">
            <p className="text-[10px] text-muted-foreground">{round.status === "SCHEDULED" ? "Em breve" : "Sem tickets"}</p>
          </div>
        ) : null}
        {owners.length > 0 ? <Divider label={`Meus tickets (${owners.length})`} /> : null}
        {owners.map((guess) => (
          <GuessCard
            key={guess.id}
            guess={guess}
            round={round}
            winner={winners.has(guess.ticketId)}
            current={current}
            leading={leaders.has(ticketKey(guess))}
            onTrail={trailId != null && ticketKey(guess) === trailId}
            dimmed={trailId != null && ticketKey(guess) !== trailId}
            signedIn={signedIn}
            onMakeGuess={() => onMakeGuess(guess, round)}
            onToggleTrail={() => onToggleTrail(ticketKey(guess))}
          />
        ))}
        {others.length > 0 ? <Divider label={`Outros (${others.length})`} /> : null}
        {others.map((guess) => (
          <GuessCard
            key={guess.id}
            guess={guess}
            round={round}
            winner={winners.has(guess.ticketId)}
            current={current}
            leading={leaders.has(ticketKey(guess))}
            onTrail={trailId != null && ticketKey(guess) === trailId}
            dimmed={trailId != null && ticketKey(guess) !== trailId}
            signedIn={signedIn}
            onMakeGuess={() => onMakeGuess(guess, round)}
            onToggleTrail={() => onToggleTrail(ticketKey(guess))}
          />
        ))}
      </div>
      </article>
    </div>
  );
}

function TimelineNode({
  emphasized,
  connect,
  activeLine,
  trail,
  trailLine,
}: {
  emphasized: boolean;
  connect: boolean;
  activeLine: boolean;
  trail: boolean;
  trailLine: boolean;
}) {
  return (
    <span className="relative mb-2 flex h-4 w-full items-center justify-center">
      {connect ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-1/2 top-1/2 w-full -translate-y-1/2",
            trailLine || activeLine ? "h-1" : "h-px bg-border",
            trailLine && "bg-sky-400",
            !trailLine && activeLine && "bg-highlight",
          )}
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "relative h-2.5 w-2.5 rounded-full border-2",
          trail ? "border-sky-400 bg-sky-400" : emphasized ? "border-highlight bg-highlight" : "border-border bg-card",
        )}
      />
    </span>
  );
}

function GuessCard({
  guess,
  round,
  winner,
  current,
  leading,
  onTrail,
  dimmed,
  signedIn,
  onMakeGuess,
  onToggleTrail,
}: {
  guess: EvolutionGuessView;
  round: EvolutionRoundView;
  winner: boolean;
  current: boolean;
  leading: boolean;
  onTrail: boolean;
  dimmed: boolean;
  signedIn: boolean;
  onMakeGuess: () => void;
  onToggleTrail: () => void;
}) {
  const pending = guess.own && round.status === "OPEN_TO_GUESS" && !guess.teamName;
  const eliminated = guess.guessStatus === "ELIMINATED";
  const revealed = showsGuessTeam(guess.own, round.status);
  const statusLabel = !guess.teamName && guess.guessStatus === "PENDING" ? "Sem palpite" : (GUESS_LABEL[guess.guessStatus] ?? guess.guessStatus);
  const accumulated = guess.pointsAccumulateds ?? (current ? guess.ticketPoints : null);
  const showAccumulated = accumulated != null;

  return (
    <div
      data-trail={onTrail ? "on" : undefined}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a")) return;
        onToggleTrail();
      }}
      className={cn(
        "relative flex min-h-[62px] cursor-pointer flex-col gap-1 rounded-md border px-2.5 py-2 text-left",
        pending && "border-dashed",
        onTrail && "border-sky-400 bg-sky-400/15 ring-2 ring-sky-400 shadow-md shadow-sky-400/25",
        !onTrail && winner && "border-highlight/70 bg-highlight/15 ring-2 ring-highlight/45",
        !onTrail && !winner && guess.own && "border-accent/35 bg-accent/5",
        !onTrail && !winner && !guess.own && "border-border bg-background/50",
        eliminated && !dimmed && "opacity-75",
        dimmed && "opacity-40",
      )}
    >
      {leading ? <LeaderMark /> : null}
      <p className={cn("truncate text-[10px] lowercase tracking-wide", leading && "pr-4", guess.own ? "font-bold text-accent" : "font-medium text-muted-foreground")}>
        @{guess.nickName} · <span className="text-[8px] uppercase tracking-wide">{guess.ticketCode}</span>
      </p>
      {pending && signedIn ? (
        <Button type="button" variant="accent" size="sm" className="h-8 w-full text-[11px]" onClick={onMakeGuess}>
          Fazer palpite
        </Button>
      ) : null}
      {revealed ? (
        <p className={cn("truncate text-xs", guess.own && "font-bold")}>
          {guess.teamName ?? ""}
          {guess.automatic ? <span className="text-[8px] text-muted-foreground"> (automático)</span> : null}
        </p>
      ) : (
        <span className="mx-auto mt-0.5 block h-3.5 w-[72%] rounded-sm bg-foreground/15" title="Palpite oculto" />
      )}
      {winner ? (
        <span className="inline-flex w-fit rounded bg-highlight/25 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-highlight">
          Vencedor do desafio
        </span>
      ) : null}
      <div className="flex w-full">
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center rounded-md p-1",
            eliminated && "bg-primary/10 text-primary",
            guess.guessStatus === "CLASSIFIELDED" && "bg-success/10 text-success",
            guess.guessStatus !== "ELIMINATED" && guess.guessStatus !== "CLASSIFIELDED" && "bg-secondary text-muted-foreground",
            showAccumulated && "rounded-r-none",
          )}
        >
          <span className="text-[8px] font-semibold uppercase tracking-wider">{statusLabel}</span>
          <span className="text-[10px] uppercase tracking-wide">+ {guess.points ?? "-"} pts</span>
        </div>
        {showAccumulated ? (
          <div className="flex min-w-0 flex-1 flex-col items-center rounded-r-md bg-accent/10 p-1">
            <span className="text-[8px] font-semibold uppercase tracking-wider">Pontos</span>
            <span className="text-[10px] font-bold uppercase tracking-wide">{accumulated}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LeaderMark() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);

  const show = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 176;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    setTip({ top: rect.bottom + 6, left });
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={LEADER_HINT}
        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-highlight"
        onMouseEnter={show}
        onMouseLeave={() => setTip(null)}
        onFocus={show}
        onBlur={() => setTip(null)}
      >
        <CrownIcon className="h-3.5 w-3.5" />
      </button>
      {tip ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-50 w-44 rounded-md border border-border bg-popover px-2 py-1.5 text-[10px] font-medium normal-case leading-snug tracking-normal text-popover-foreground shadow-md"
          style={{ top: tip.top, left: tip.left }}
        >
          {LEADER_HINT}
        </span>
      ) : null}
    </>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex w-full items-center gap-2 py-0.5">
      <div className="h-px flex-1 bg-border" />
      <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function byPoints(a: EvolutionGuessView, b: EvolutionGuessView) {
  return (b.pointsAccumulateds ?? b.ticketPoints ?? 0) - (a.pointsAccumulateds ?? a.ticketPoints ?? 0);
}
