"use client";

import { useEffect, useRef, type Ref } from "react";
import { ScrollHintIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { showsGuessTeam, type EvolutionGuessView, type EvolutionRoundView } from "@/lib/queries/evolutionView";
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

export function EvolutionKanban({
  rounds,
  currentRound,
  winnerTicketIds,
  signedIn,
  onMakeGuess,
}: {
  rounds: EvolutionRoundView[];
  currentRound: number;
  winnerTicketIds: string[];
  signedIn: boolean;
  onMakeGuess: (guess: EvolutionGuessView, round: EvolutionRoundView) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLElement>(null);
  const winners = new Set(winnerTicketIds);

  useEffect(() => {
    const pane = scroller.current;
    const column = current.current;
    if (!pane || !column) return;
    pane.scrollLeft = Math.max(0, column.offsetLeft - 16);
  }, [rounds, currentRound]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wider">Palpites por rodada</h2>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ScrollHintIcon className="h-2.5 w-6" />
          Deslize para navegar pelas rodadas
        </span>
      </div>
      <div ref={scroller} className="overflow-x-auto overflow-y-hidden pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max items-stretch gap-3 sm:gap-4">
          {rounds.map((round) => (
            <RoundColumn
              key={round.id}
              round={round}
              current={round.sequenceOrder === currentRound}
              columnRef={round.sequenceOrder === currentRound ? current : undefined}
              winners={winners}
              signedIn={signedIn}
              onMakeGuess={onMakeGuess}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function RoundColumn({
  round,
  current,
  columnRef,
  winners,
  signedIn,
  onMakeGuess,
}: {
  round: EvolutionRoundView;
  current: boolean;
  columnRef?: Ref<HTMLElement>;
  winners: Set<string>;
  signedIn: boolean;
  onMakeGuess: (guess: EvolutionGuessView, round: EvolutionRoundView) => void;
}) {
  const owners = [...round.owners].sort(byPoints);
  const others = [...round.others].sort(byPoints);
  const total = owners.length + others.length;

  return (
    <article
      ref={columnRef}
      className={cn(
        "flex w-[172px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm sm:w-[188px]",
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
            signedIn={signedIn}
            onMakeGuess={() => onMakeGuess(guess, round)}
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
            signedIn={signedIn}
            onMakeGuess={() => onMakeGuess(guess, round)}
          />
        ))}
      </div>
    </article>
  );
}

function GuessCard({
  guess,
  round,
  winner,
  current,
  signedIn,
  onMakeGuess,
}: {
  guess: EvolutionGuessView;
  round: EvolutionRoundView;
  winner: boolean;
  current: boolean;
  signedIn: boolean;
  onMakeGuess: () => void;
}) {
  const pending = guess.own && round.status === "OPEN_TO_GUESS" && !guess.teamName;
  const eliminated = guess.guessStatus === "ELIMINATED";
  const revealed = showsGuessTeam(guess.own, round.status);
  const statusLabel = !guess.teamName && guess.guessStatus === "PENDING" ? "Sem palpite" : (GUESS_LABEL[guess.guessStatus] ?? guess.guessStatus);

  return (
    <div
      className={cn(
        "flex min-h-[62px] flex-col gap-1 rounded-md border px-2.5 py-2",
        pending && "border-dashed",
        winner && "border-highlight/70 bg-highlight/15 ring-2 ring-highlight/45",
        !winner && guess.own && "border-accent/35 bg-accent/5",
        !winner && !guess.own && "border-border bg-background/50",
        eliminated && "opacity-75",
      )}
    >
      <p className={cn("truncate text-[10px] lowercase tracking-wide", guess.own ? "font-bold text-accent" : "font-medium text-muted-foreground")}>
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
            current && "rounded-r-none",
          )}
        >
          <span className="text-[8px] font-semibold uppercase tracking-wider">{statusLabel}</span>
          <span className="text-[10px] uppercase tracking-wide">+ {guess.points ?? "-"} pts</span>
        </div>
        {current ? (
          <div className="flex min-w-0 flex-1 flex-col items-center rounded-r-md bg-accent/10 p-1">
            <span className="text-[8px] font-semibold uppercase tracking-wider">Pontos</span>
            <span className="text-[10px] font-bold uppercase tracking-wide">{guess.ticketPoints ?? "-"}</span>
          </div>
        ) : null}
      </div>
    </div>
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
  return (b.ticketPoints ?? 0) - (a.ticketPoints ?? 0);
}
