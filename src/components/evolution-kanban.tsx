"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CrownIcon, HandIcon, HandshakeIcon, ScrollHintIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatMoneyBR } from "@/lib/money";
import { ProposalDialog } from "@/components/proposal-dialog";
import { SentProposalDialog } from "@/components/sent-proposal-dialog";
import { TicketTransferProposalDialog } from "@/components/ticket-transfer-proposal-dialog";
import { leadingTicketKeys, showsGuessTeam, type EvolutionGuessView, type EvolutionRoundView, type EvolutionTransferView } from "@/lib/queries/evolutionView";
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

export function EvolutionKanban(props: EvolutionBoardProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider">Palpites por rodada</h2>
      <EvolutionBoard {...props} />
    </section>
  );
}

export function EvolutionBoard({
  rounds,
  currentRound,
  winnerTicketIds,
  running,
  signedIn,
  rulesHtml,
  onMakeGuess,
  highlightTicketId = null,
  highlightTicketCode = null,
}: EvolutionBoardProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const recallRef = useRef<HTMLButtonElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const leadRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);
  const alignRef = useRef<(behavior?: ScrollBehavior) => void>(() => undefined);
  const [recall, setRecall] = useState<"left" | "right" | null>(null);
  const pinnedTrail = trailKeyFor(rounds, highlightTicketId, highlightTicketCode);
  const [trailId, setTrailId] = useState<string | null>(pinnedTrail);
  const winners = new Set(winnerTicketIds);
  const focusIndex = Math.max(
    0,
    rounds.findIndex((round) => round.sequenceOrder === currentRound),
  );

  useEffect(() => {
    setTrailId(pinnedTrail);
  }, [pinnedTrail]);

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

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const button = recallRef.current;
    if (!recall || !stage || !button) return;

    const place = () => {
      const current = recallRef.current;
      const host = stageRef.current;
      if (!current || !host) return;
      placeRecall(current, host);
    };

    place();
    document.addEventListener("scroll", place, { passive: true, capture: true });
    window.addEventListener("resize", place);
    const observer = new ResizeObserver(place);
    observer.observe(stage);
    return () => {
      document.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      observer.disconnect();
    };
  }, [recall]);

  return (
      <div ref={stageRef} className="relative">
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
                past={index < focusIndex}
                distance={index > focusIndex ? index - focusIndex : 0}
                bridge={index + 1 === focusIndex ? "into-current" : index === focusIndex ? "out-of-current" : "even"}
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
                rulesHtml={rulesHtml}
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
            ref={recallRef}
            type="button"
            aria-label={`Centralizar a rodada ${currentRound}`}
            className={cn(
              "absolute z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm",
              recall === "left" ? "left-2" : "right-2",
            )}
            onClick={() => alignRef.current("smooth")}
          >
            {recall === "left" ? <ChevronLeftIcon className="h-5 w-5" /> : <ChevronRightIcon className="h-5 w-5" />}
          </button>
        ) : null}
      </div>
  );
}

type EvolutionBoardProps = {
  rounds: EvolutionRoundView[];
  currentRound: number;
  winnerTicketIds: string[];
  running: boolean;
  signedIn: boolean;
  rulesHtml: string;
  onMakeGuess: (guess: EvolutionGuessView, round: EvolutionRoundView) => void;
  highlightTicketId?: string | null;
  highlightTicketCode?: string | null;
};

function placeRecall(button: HTMLButtonElement, stage: HTMLElement) {
  const stageBox = stage.getBoundingClientRect();
  const sticky = document.querySelector("header.sticky");
  const coveredTop = sticky ? Math.max(0, sticky.getBoundingClientRect().bottom) : 0;
  const bandTop = Math.max(stageBox.top, coveredTop);
  const bandBottom = Math.min(stageBox.bottom, window.innerHeight);
  const height = button.offsetHeight || 44;
  if (bandBottom - bandTop < 8) {
    button.style.visibility = "hidden";
    return;
  }
  button.style.visibility = "";
  const minCenter = bandTop + height / 2;
  const maxCenter = bandBottom - height / 2;
  let center = (bandTop + bandBottom) / 2;
  if (maxCenter >= minCenter) center = Math.min(Math.max(center, minCenter), maxCenter);
  button.style.top = `${center - stageBox.top}px`;
}

function ticketKey(guess: EvolutionGuessView) {
  return guess.ticketId || guess.ticketCode;
}

function trailKeyFor(rounds: EvolutionRoundView[], ticketId: string | null, ticketCode: string | null) {
  if (!ticketId && !ticketCode) return null;
  for (const round of rounds) {
    const guess = [...round.owners, ...round.others].find(
      (item) => (ticketId != null && item.ticketId === ticketId) || (ticketCode != null && item.ticketCode === ticketCode),
    );
    if (guess) return ticketKey(guess);
  }
  return null;
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
  past,
  distance,
  connect,
  bridge,
  reached,
  trail,
  trailContinues,
  trailId,
  onToggleTrail,
  columnRef,
  winners,
  running,
  signedIn,
  rulesHtml,
  onMakeGuess,
}: {
  round: EvolutionRoundView;
  current: boolean;
  past: boolean;
  distance: number;
  connect: boolean;
  bridge: "even" | "into-current" | "out-of-current";
  reached: boolean;
  trail: boolean;
  trailContinues: boolean;
  trailId: string | null;
  onToggleTrail: (ticketId: string) => void;
  columnRef?: Ref<HTMLDivElement>;
  winners: Set<string>;
  running: boolean;
  signedIn: boolean;
  rulesHtml: string;
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
      className={cn("flex shrink-0 flex-col", current ? "w-[248px] sm:w-[272px]" : "w-[172px] sm:w-[188px]")}
      style={{ filter: distanceBlur(distance) }}
    >
      <TimelineNode
        emphasized={reached}
        connect={connect}
        bridge={bridge}
        activeLine={!current && reached}
        trail={trail}
        trailLine={trailContinues}
      />
      <article
        className={cn(
          "mx-1.5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm",
          current ? "border-accent/45 ring-1 ring-accent/25" : "border-border",
          past && "saturate-[0.35]",
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
        <div className="flex min-h-72 flex-1 flex-col gap-2 bg-background p-2">
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
              rulesHtml={rulesHtml}
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
              rulesHtml={rulesHtml}
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
  bridge,
  activeLine,
  trail,
  trailLine,
}: {
  emphasized: boolean;
  connect: boolean;
  bridge: "even" | "into-current" | "out-of-current";
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
            "absolute left-1/2 top-1/2 -translate-y-1/2",
            bridge === "even" ? "w-full" : "w-[210px] sm:w-[230px]",
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
  rulesHtml,
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
  rulesHtml: string;
  onMakeGuess: () => void;
  onToggleTrail: () => void;
}) {
  const pending = guess.own && round.status === "OPEN_TO_GUESS" && !guess.teamName;
  const ownOnCurrent = guess.own && current;
  const eliminated = guess.guessStatus === "ELIMINATED";
  const revealed = showsGuessTeam(guess.own, round.status);
  const hasResult = round.status === "FINISHED";
  const [forSale, setForSale] = useState(guess.saleAuthorized);
  const [proposals, setProposals] = useState(guess.transfers);
  const [openProposal, setOpenProposal] = useState<EvolutionTransferView | null>(null);
  const [sentOpen, setSentOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    setProposals(guess.transfers);
    setOpenProposal(null);
    setSentOpen(false);
  }, [guess.id, guess.transfers]);
  const showMarket =
    current &&
    guess.marketValue != null &&
    guess.ticketStatus === "SCALLING" &&
    guess.guessStatus !== "ELIMINATED";
  const showSaleToggle = showMarket && guess.own;
  const showProposals = current && guess.own && !eliminated && proposals.length > 0;
  const sentProposal =
    signedIn && current && !guess.own && !eliminated
      ? (proposals.find((item) => item.status === "PROCESSING") ?? proposals.find((item) => item.status === "REQUESTED") ?? null)
      : null;
  const showSaleMark = current && !eliminated;
  const cornerMarks = Number(showSaleMark) + Number(leading);
  const showTeamBelow = !current && revealed && Boolean(guess.teamName);
  const otherGuessBelow = current && !guess.own && (revealed ? Boolean(guess.teamName) : true);
  const teamOnly = current && !hasResult && Boolean(guess.teamName) && (guess.own || revealed);
  const showResultBelow = Boolean(guess.teamName) && (showTeamBelow || (current && hasResult && (guess.own || revealed)));
  const statusLabel = !guess.teamName && guess.guessStatus === "PENDING" ? "Sem palpite" : (GUESS_LABEL[guess.guessStatus] ?? guess.guessStatus);
  const accumulated = guess.pointsAccumulateds ?? (current ? guess.ticketPoints : null);
  const showAccumulated = accumulated != null;
  const notch = onTrail
    ? "border-sky-400"
    : winner
      ? "border-highlight/70"
      : guess.own
        ? "border-accent/45"
        : "border-border";

  return (
    <div
      data-trail={onTrail ? "on" : undefined}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, a")) return;
        onToggleTrail();
      }}
      className={cn(
        "relative flex min-h-[78px] cursor-pointer flex-col rounded-[10px] border text-left shadow-sm",
        pending && "border-dashed",
        onTrail && "border-sky-400 bg-sky-400/15 ring-2 ring-sky-400 shadow-sky-400/25",
        !onTrail && winner && "border-highlight/70 bg-highlight/15 ring-2 ring-highlight/40",
        !onTrail && !winner && guess.own && "border-accent/45 bg-accent/10",
        !onTrail && !winner && !guess.own && "border-border bg-card",
        eliminated && !dimmed && "opacity-75",
        dimmed && "opacity-40",
      )}
    >
      {showSaleMark || leading ? (
        <div className="absolute right-1 top-1 z-10 flex items-center">
          {showSaleMark ? <SaleMark authorized={forSale} owner={guess.own} /> : null}
          {leading ? <LeaderMark /> : null}
        </div>
      ) : null}
      <div className="flex flex-col gap-1 px-2.5 pb-1.5 pt-2">
        <div className={cn("flex flex-col gap-1", cornerMarks === 2 && "pr-8", cornerMarks === 1 && "pr-4")}>
          <p className={cn("truncate text-[10px] lowercase tracking-wide", guess.own ? "font-bold text-accent" : "font-medium text-muted-foreground")}>
            @{guess.nickName}
          </p>
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/80">{guess.ticketCode}</p>
          {!ownOnCurrent && !showTeamBelow && !otherGuessBelow && revealed && guess.teamName ? (
            <p className={cn("truncate text-xs", guess.own && "font-bold")}>
              {guess.teamName ?? ""}
              {guess.automatic ? <span className="text-[8px] text-muted-foreground"> (automático)</span> : null}
            </p>
          ) : null}
          {!ownOnCurrent && !otherGuessBelow && !revealed ? (
            <span className="mt-0.5 block h-3.5 w-[72%] rounded-sm bg-foreground/15" title="Palpite oculto" />
          ) : null}
          {winner ? (
            <span className="inline-flex w-fit rounded bg-highlight/25 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-highlight">
              Vencedor do desafio
            </span>
          ) : null}
        </div>
        {current ? (
          <div
            className={cn(
              "flex",
              eliminated && "text-primary",
              guess.guessStatus === "CLASSIFIELDED" && "text-success",
              guess.guessStatus !== "ELIMINATED" && guess.guessStatus !== "CLASSIFIELDED" && "text-muted-foreground",
            )}
          >
            <div className="flex min-w-0 flex-[3] items-center justify-center px-1">
              {pending && signedIn ? (
                <Button type="button" variant="accent" size="sm" className="h-7 w-full whitespace-normal px-1 text-center text-[10px] leading-tight" onClick={onMakeGuess}>
                  Fazer palpite
                </Button>
              ) : teamOnly ? (
                <GuessTag text={teamLabel(guess.teamName, guess.automatic)} tone="chosen" />
              ) : !guess.own && !guess.teamName ? (
                <GuessTag text="PALPITE PENDENTE" />
              ) : !guess.own && !revealed ? (
                <HiddenGuess />
              ) : showResultBelow ? (
                <span className="flex w-full min-w-0 flex-col items-center gap-0.5 text-center">
                  <GuessTag text={teamLabel(guess.teamName, guess.automatic)} tone="chosen" />
                  <FittedLine text={`${statusLabel} · + ${guess.points ?? "-"} pts`} />
                </span>
              ) : (
                <span className="flex flex-col items-center">
                  <span className="text-[8px] font-semibold uppercase tracking-wider">{statusLabel}</span>
                  <span className="text-[10px] uppercase tracking-wide">+ {guess.points ?? "-"} pts</span>
                </span>
              )}
            </div>
            {showAccumulated ? <PointsTotal value={accumulated} /> : null}
          </div>
        ) : null}
        {openProposal ? (
          <ProposalDialog
            proposal={openProposal}
            ticketCode={guess.ticketCode}
            onClose={() => setOpenProposal(null)}
            onAccept={() => {
              const accepted = { ...openProposal, status: "PROCESSING" as const };
              setProposals((current) => current.flatMap((item) => (item.id === accepted.id ? [accepted] : item.status === "REQUESTED" ? [] : [item])));
              setOpenProposal(accepted);
            }}
            onReject={() => {
              setProposals((current) => current.filter((item) => item.id !== openProposal.id));
              setOpenProposal(null);
            }}
          />
        ) : null}
        {offerOpen ? (
          <TicketTransferProposalDialog
            signedIn={signedIn}
            ticketId={guess.ticketId}
            ticketCode={guess.ticketCode}
            ownerNickName={guess.nickName}
            points={guess.ticketPoints ?? guess.pointsAccumulateds ?? 0}
            marketValue={guess.marketValue}
            saleAuthorized={forSale}
            rulesHtml={rulesHtml}
            onOpenChange={setOfferOpen}
            onRecorded={(outcome, checkoutUrl) => {
              setProposals((current) => [
                ...current.filter((item) => item.status !== "REQUESTED" && item.status !== "PROCESSING"),
                {
                  id: `local-${guess.ticketId || guess.ticketCode}`,
                  status: outcome === "processing" ? "PROCESSING" : "REQUESTED",
                  amount: guess.marketValue ?? 0,
                  createdAtDateTime: new Date().toISOString(),
                  proposerNickName: "voce_dx",
                  checkoutUrl,
                },
              ]);
            }}
          />
        ) : null}
        {sentOpen && sentProposal ? (
          <SentProposalDialog
            proposal={sentProposal}
            ticketCode={guess.ticketCode}
            ownerNickName={guess.nickName}
            onClose={() => setSentOpen(false)}
            onCancel={() => {
              setProposals((current) => current.filter((item) => item.id !== sentProposal.id));
              setSentOpen(false);
            }}
          />
        ) : null}
      </div>
      <div className="relative h-3" aria-hidden="true">
        <span className={cn("absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border bg-background", notch)} />
        <span className={cn("absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full border bg-background", notch)} />
        <span className="absolute left-2.5 right-2.5 top-1/2 border-t border-dashed border-current opacity-35" />
      </div>
      {!current ? (
        <div
          className={cn(
            "mt-auto flex px-1.5 pb-2 saturate-[2.85]",
            eliminated && "text-primary",
            guess.guessStatus === "CLASSIFIELDED" && "text-success",
            guess.guessStatus !== "ELIMINATED" && guess.guessStatus !== "CLASSIFIELDED" && "text-muted-foreground",
          )}
        >
          <div className="flex min-w-0 flex-[3] flex-col items-center justify-center gap-0.5 px-1 text-center">
            {revealed && guess.teamName ? (
              <>
                <span className="max-w-full truncate text-[11px] font-semibold">
                  {guess.teamName}
                  {guess.automatic ? <span className="text-[8px] font-normal"> (automático)</span> : null}
                </span>
                <FittedLine text={`${statusLabel} · + ${guess.points ?? "-"} pts`} />
              </>
            ) : (
              <span className="flex flex-col items-center">
                <span className="text-[8px] font-semibold uppercase tracking-wider">{statusLabel}</span>
                <span className="text-[10px] uppercase tracking-wide">+ {guess.points ?? "-"} pts</span>
              </span>
            )}
          </div>
          {showAccumulated ? <PointsTotal value={accumulated} /> : null}
        </div>
      ) : null}
      {showMarket || showProposals || sentProposal ? (
        <div className="mt-auto flex w-full flex-col gap-1 px-2.5 pb-2 pt-0.5">
          {showMarket ? (
            <div className="flex w-full items-stretch">
              <div className="flex min-w-0 flex-1 basis-0 flex-col gap-0.5">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Mercado</span>
                {guess.own ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-disabled="true"
                    tabIndex={-1}
                    className="h-auto min-h-7 w-full cursor-default whitespace-normal px-1 py-1 text-center text-[9px] font-black tabular-nums leading-tight opacity-80 hover:bg-secondary"
                  >
                    {formatMoneyBR(guess.marketValue ?? 0)}
                  </Button>
                ) : sentProposal ? null : (
                  <Button
                    type="button"
                    variant={forSale ? "success" : "secondary"}
                    size="sm"
                    className="h-auto min-h-7 w-full whitespace-normal px-1 py-1 text-center text-[9px] leading-tight"
                    onClick={() => setOfferOpen(true)}
                  >
                    {forSale ? "Comprar" : "Fazer proposta"} {formatMoneyBR(guess.marketValue ?? 0)}
                  </Button>
                )}
              </div>
              {showSaleToggle ? (
                <>
                  <span aria-hidden="true" className="mx-1.5 box-content w-0 shrink-0 self-stretch border-l border-dashed border-border" />
                  <div className="flex min-w-0 flex-1 basis-0 flex-col justify-end">
                    <Button
                      type="button"
                      variant={forSale ? "secondary" : "accent"}
                      size="sm"
                      className="h-auto min-h-7 w-full whitespace-normal px-1 py-1 text-center text-[9px] leading-tight"
                      aria-pressed={forSale}
                      onClick={() => setForSale((current) => !current)}
                    >
                      {forSale ? "Liberar propostas" : "Liberar venda"}
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
          {showProposals
            ? proposals.map((proposal) => (
              <Button
                key={proposal.id}
                type="button"
                variant="outline"
                size="sm"
                className="h-auto min-h-7 w-full whitespace-normal px-2 py-1 text-center text-[10px] leading-tight"
                onClick={() => setOpenProposal(proposal)}
              >
                {proposal.status === "PROCESSING"
                  ? `Proposta @${proposal.proposerNickName} - Processando ${formatMoneyBR(proposal.amount)}`
                  : `Proposta @${proposal.proposerNickName} ${formatMoneyBR(proposal.amount)}`}
              </Button>
            ))
            : null}
          {sentProposal ? (
            <Button
              type="button"
              variant={sentProposal.status === "PROCESSING" ? "accent" : "outline"}
              size="sm"
              className="h-auto min-h-7 w-full whitespace-normal px-2 py-1 text-center text-[10px] leading-tight"
              onClick={() => setSentOpen(true)}
            >
              {sentProposal.status === "PROCESSING"
                ? `Proposta aguardando pagamento ${formatMoneyBR(sentProposal.amount)}`
                : `Proposta enviada ${formatMoneyBR(sentProposal.amount)}`}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function teamLabel(name: string | null, automatic: boolean) {
  if (!name) return "";
  return automatic ? `${name} (automático)` : name;
}

type GuessTagTone = "chosen" | "neutral";

const GUESS_TAG_TONE: Record<GuessTagTone, { body: string; point: string }> = {
  chosen: { body: "bg-[hsl(207_72%_48%)]", point: "border-r-[hsl(207_72%_48%)]" },
  neutral: { body: "bg-[hsl(220_5%_46%)]", point: "border-r-[hsl(220_5%_46%)]" },
};

function GuessTag({ text = "", tone = "neutral", concealed = false }: { text?: string; tone?: GuessTagTone; concealed?: boolean }) {
  const colors = GUESS_TAG_TONE[tone];
  return (
    <span className="block w-full min-w-0 pl-[7px]">
      <span
        className={cn("relative flex h-[18px] w-full min-w-0 items-center rounded-r-[3px] pl-2.5 pr-1.5 text-white", colors.body)}
        title={concealed ? "Palpite oculto" : undefined}
      >
        <span aria-hidden className={cn("absolute -left-[7px] top-0 border-y-[9px] border-r-[7px] border-y-transparent", colors.point)} />
        <span aria-hidden className="absolute left-0.5 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-background" />
        {concealed ? (
          <span aria-hidden className="block h-2 w-full overflow-hidden">
            <span className="mx-auto block h-full w-[calc(100%-8px)] rounded-sm bg-white blur-[2px]" />
          </span>
        ) : (
          <FittedLine text={text} size={9} />
        )}
      </span>
    </span>
  );
}

function PointsTotal({ value }: { value: number | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center border-l border-dashed border-current/30 px-1 text-accent">
      <span className="text-[8px] font-semibold uppercase tracking-wider">Pontos</span>
      <span className="text-[10px] font-bold uppercase tracking-wide">{value}</span>
    </div>
  );
}

function HiddenGuess() {
  return <GuessTag concealed tone="chosen" />;
}

function FittedLine({ text, size = 8 }: { text: string; size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const line = ref.current;
    const box = line?.parentElement;
    if (!line || !box) return;

    const fit = () => {
      const boxStyle = getComputedStyle(box);
      const available = box.clientWidth - parseFloat(boxStyle.paddingLeft) - parseFloat(boxStyle.paddingRight);
      if (available <= 0) return;
      let next = size;
      line.style.fontSize = `${next}px`;
      while (next > 1 && line.scrollWidth > available + 0.5) {
        next = Math.round((next - 0.25) * 100) / 100;
        line.style.fontSize = `${next}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [size, text]);

  return (
    <span ref={ref} style={{ fontSize: size }} className="block max-w-full whitespace-nowrap text-center font-semibold uppercase leading-none">
      {text}
    </span>
  );
}

function LeaderMark() {
  return (
    <CornerButton label={LEADER_HINT} className="text-highlight">
      <CrownIcon className="h-3.5 w-3.5" />
    </CornerButton>
  );
}

function SaleMark({ authorized, owner = false }: { authorized: boolean; owner?: boolean }) {

  if (owner) {
    return (
      <CornerButton label={authorized ? "Você nao precisará aprovar propostas, a venda será imediata" : "Você precisará aprovar propostas para a venda ocorrer"} className={authorized ? "text-accent" : "text-muted-foreground"}>
        {authorized ? <HandshakeIcon className="h-3.5 w-3.5" /> : <HandIcon className="h-3.5 w-3.5" />}
      </CornerButton>
    );
  }
  return (
    <CornerButton label={authorized ? "Ticket liberado para compra" : "Somente proposta liberado"} className={authorized ? "text-accent" : "text-muted-foreground"}>
      {authorized ? <HandshakeIcon className="h-3.5 w-3.5" /> : <HandIcon className="h-3.5 w-3.5" />}
    </CornerButton>
  );
}

function CornerButton({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
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
        aria-label={label}
        className={cn("flex h-5 w-5 items-center justify-center rounded-full", className)}
        onMouseEnter={show}
        onMouseLeave={() => setTip(null)}
        onFocus={show}
        onBlur={() => setTip(null)}
      >
        {children}
      </button>
      {tip ? (
        <span
          role="tooltip"
          className="pointer-events-none fixed z-50 w-44 rounded-md border border-border bg-popover px-2 py-1.5 text-[10px] font-medium normal-case leading-snug tracking-normal text-popover-foreground shadow-md"
          style={{ top: tip.top, left: tip.left }}
        >
          {label}
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
