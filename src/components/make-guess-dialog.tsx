"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AccountAccessChoices } from "@/components/auth-links";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  canConfirmGuess,
  confirmGuess,
  loadAvailableGuesses,
  type GuessFormResult,
  type GuessTeamOption,
} from "@/lib/guess";
import { cn } from "@/lib/utils";

type Step = "choose" | "confirm" | "receipt";

type Receipt = {
  challengeName: string;
  championshipName: string;
  ticketCode: string;
  roundNumber: number;
  teamName: string;
  opponentName: string;
  venue: GuessTeamOption["venue"];
  confirmedAt: Date;
};

export function MakeGuessDialog({
  open,
  signedIn,
  challengeId,
  challengeName,
  championshipName,
  ticketGuessId,
  challengeRoundId,
  ticketId,
  ticketCode,
  roundNumber,
  onOpenChange,
  onConfirmed,
}: {
  open: boolean;
  signedIn: boolean;
  challengeId: string;
  challengeName: string;
  championshipName: string;
  ticketGuessId: string;
  challengeRoundId: string;
  ticketId: string;
  ticketCode: string;
  roundNumber: number;
  onOpenChange: (open: boolean) => void;
  onConfirmed: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [teams, setTeams] = useState<GuessTeamOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("choose");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [board, setBoard] = useState({
    challengeId,
    challengeName,
    challengeRoundId,
    sequenceOrder: roundNumber,
    ticketId,
    ticketCode,
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setReceipt(null);
      setSelectedId("");
      setError("");
      setBusy(false);
      return;
    }
    if (!signedIn || !ticketGuessId || !challengeRoundId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelectedId("");
    setStep("choose");
    void loadAvailableGuesses(ticketGuessId, challengeRoundId)
      .then((next) => {
        if (cancelled) return;
        setTeams(next.teams);
        setBoard({
          challengeId: next.challengeId || challengeId,
          challengeName: next.challengeName || challengeName,
          challengeRoundId: next.challengeRoundId || challengeRoundId,
          sequenceOrder: next.sequenceOrder || roundNumber,
          ticketId: next.ticketId || ticketId,
          ticketCode: next.ticketCode || ticketCode,
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Não foi possível carregar os times.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, ticketGuessId, challengeRoundId, challengeId, challengeName, ticketId, ticketCode, roundNumber]);

  const selected = teams.find((team) => team.id === selectedId && team.available) ?? null;
  const availableCount = teams.filter((team) => team.available).length;
  const shownRound = board.sequenceOrder || roundNumber;

  async function confirm() {
    if (!canConfirmGuess(signedIn) || !selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await confirmGuess({
        signedIn,
        ticketGuessId,
        challengeId: board.challengeId,
        challengeRoundId: board.challengeRoundId,
        ticketId: board.ticketId,
        teamId: selected.id,
      });
      setReceipt({
        challengeName: board.challengeName || challengeName,
        championshipName,
        ticketCode: board.ticketCode || ticketCode,
        roundNumber: shownRound,
        teamName: selected.name,
        opponentName: selected.opponent,
        venue: selected.venue,
        confirmedAt: new Date(),
      });
      setStep("receipt");
      onConfirmed();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar o palpite.");
      setStep("confirm");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    onOpenChange(false);
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        "flex max-h-[min(90dvh,720px)] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-lg border bg-card p-0 text-foreground backdrop:bg-black/80",
        step === "confirm" ? "border-2 border-accent shadow-2xl ring-4 ring-accent/30" : "border-border",
      )}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
    >
      {signedIn ? (
        step === "receipt" && receipt ? (
          <ReceiptStep titleId={titleId} receipt={receipt} onClose={close} />
        ) : step === "confirm" && selected ? (
          <ConfirmStep
            titleId={titleId}
            team={selected}
            ticketCode={board.ticketCode || ticketCode}
            roundNumber={shownRound}
            busy={busy}
            error={error}
            onBack={() => setStep("choose")}
            onConfirm={() => void confirm()}
            onClose={close}
          />
        ) : (
          <ChooseStep
            titleId={titleId}
            roundNumber={shownRound}
            ticketCode={board.ticketCode || ticketCode}
            challengeName={board.challengeName || challengeName}
            teams={teams}
            selectedId={selectedId}
            loading={loading}
            error={error}
            availableCount={availableCount}
            onSelect={setSelectedId}
            onContinue={() => selected && setStep("confirm")}
            onClose={close}
          />
        )
      ) : (
        <div className="p-6">
          <DialogHeading titleId={titleId} title="Fazer palpite" description="Entre na DESAFIOX para registrar o palpite." onClose={close} />
          <AccountAccessChoices />
        </div>
      )}
    </dialog>
  );
}

function ChooseStep({
  titleId,
  roundNumber,
  ticketCode,
  challengeName,
  teams,
  selectedId,
  loading,
  error,
  availableCount,
  onSelect,
  onContinue,
  onClose,
}: {
  titleId: string;
  roundNumber: number;
  ticketCode: string;
  challengeName: string;
  teams: GuessTeamOption[];
  selectedId: string;
  loading: boolean;
  error: string;
  availableCount: number;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-border px-5 py-4">
        <DialogHeading
          titleId={titleId}
          title="Fazer palpite"
          description={`Escolha o time vencedor na rodada ${roundNumber}.`}
          onClose={onClose}
        />
      </div>
      <div className="shrink-0 space-y-2 border-b border-border bg-secondary/20 px-5 py-3 text-sm">
        <Meta label="Ticket" value={ticketCode} mono />
        <Meta label="Desafio" value={challengeName} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {loading ? (
          <p className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-12 text-center text-sm text-muted-foreground">
            Carregando times disponíveis…
          </p>
        ) : error ? (
          <p className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">{error}</p>
        ) : availableCount === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum time disponível para palpite nesta rodada.
          </p>
        ) : (
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Times disponíveis">
            {teams.map((team) => (
              <TeamOption key={team.id} team={team} selected={selectedId === team.id} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-secondary/30 px-5 py-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" variant="accent" disabled={!selectedId || loading || Boolean(error)} onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </>
  );
}

function ConfirmStep({
  titleId,
  team,
  ticketCode,
  roundNumber,
  busy,
  error,
  onBack,
  onConfirm,
  onClose,
}: {
  titleId: string;
  team: GuessTeamOption;
  ticketCode: string;
  roundNumber: number;
  busy: boolean;
  error: string;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="border-b-2 border-accent/40 bg-gradient-to-br from-accent/25 via-accent/10 to-card px-5 py-4">
        <span className="inline-flex rounded-full border border-accent/50 bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
          Revisão final
        </span>
        <DialogHeading
          titleId={titleId}
          title="Confirmar palpite"
          description="Esta ação é definitiva. Confira o time antes de registrar."
          onClose={onClose}
        />
      </div>
      <div className="space-y-4 bg-accent/[0.04] px-5 py-4 text-sm">
        <div className="rounded-xl border-2 border-accent/45 bg-accent/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Time escolhido</p>
          <p className="mt-1 text-2xl font-black">{team.name}</p>
          <p className="mt-1 text-xs font-medium text-foreground/70">
            vs {team.opponent} · {venueLabel(team.venue)}
          </p>
        </div>
        <div className="space-y-2 rounded-lg border border-border/80 bg-card/80 p-3">
          <Meta label="Ticket" value={ticketCode} mono />
          <Meta label="Rodada" value={String(roundNumber)} />
        </div>
        <p className="rounded-lg border-2 border-primary/35 bg-primary/10 px-3 py-3 text-xs font-medium leading-relaxed">
          Após confirmar, <span className="font-bold">não será possível alterar</span> este palpite.
        </p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="flex justify-end gap-2 border-t-2 border-accent/30 bg-accent/10 px-5 py-4">
        <Button type="button" variant="outline" disabled={busy} onClick={onBack}>
          Voltar
        </Button>
        <Button type="button" variant="accent" disabled={busy} onClick={onConfirm}>
          {busy ? "Registrando…" : "Confirmar palpite"}
        </Button>
      </div>
    </>
  );
}

function ReceiptStep({ titleId, receipt, onClose }: { titleId: string; receipt: Receipt; onClose: () => void }) {
  const text = receiptText(receipt);
  return (
    <>
      <div className="shrink-0 border-b border-border px-5 py-4">
        <DialogHeading
          titleId={titleId}
          title="Palpite registrado"
          description="Guarde o comprovante abaixo. O palpite não pode mais ser alterado."
          onClose={onClose}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Comprovante de palpite</p>
          <p className="font-mono text-sm font-bold">{receipt.ticketCode}</p>
        </div>
        <dl className="mt-4 space-y-2.5 text-sm">
          <Meta label="Desafio" value={receipt.challengeName} />
          <Meta label="Rodada" value={String(receipt.roundNumber)} />
          <div className="border-t border-border pt-2.5">
            <Meta label="Time" value={receipt.teamName} strong />
          </div>
          <Meta label="Confronto" value={`${receipt.teamName} x ${receipt.opponentName}`} />
          <Meta label="Mando" value={venueLabel(receipt.venue)} />
          <Meta label="Registrado em" value={receipt.confirmedAt.toLocaleString("pt-BR")} />
        </dl>
      </div>
      <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-secondary/30 px-5 py-4">
        <Button type="button" variant="outline" className="w-full" onClick={() => shareWhatsApp(text)}>
          Compartilhar no WhatsApp
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={() => void shareReceipt(text)}>
          Compartilhar comprovante
        </Button>
        <Button type="button" variant="accent" className="w-full" onClick={onClose}>
          Concluir
        </Button>
      </div>
    </>
  );
}

function TeamOption({
  team,
  selected,
  onSelect,
}: {
  team: GuessTeamOption;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3 py-3",
        !team.available && "cursor-not-allowed border-border/60 bg-secondary/20 opacity-60",
        team.available && selected && "border-accent bg-accent/10",
        team.available && !selected && "cursor-pointer border-border bg-card hover:border-accent/40 hover:bg-secondary/40",
      )}
    >
      <input
        type="radio"
        name="guess-team"
        value={team.id}
        className="mt-1"
        disabled={!team.available}
        checked={selected}
        onChange={() => onSelect(team.id)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0 leading-tight">
            <span className="text-sm font-semibold">{team.name}</span>
            {team.available ? (
              <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                vs {team.opponent} · {venueLabel(team.venue)}
              </span>
            ) : null}
          </span>
          {team.available ? <FormDots results={team.results} /> : null}
        </span>
        {team.available ? (
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {venueLabel(team.venue)}
          </span>
        ) : (
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {team.blockReason || "Indisponível nesta rodada"}
          </span>
        )}
      </span>
    </label>
  );
}

function FormDots({ results }: { results: GuessFormResult[] }) {
  if (results.length === 0) return null;
  return (
    <span className="flex items-center gap-1" aria-label="Últimos 5 resultados">
      {results.map((result, index) => (
        <span
          key={`${result}-${index}`}
          title={result === "W" ? "Vitória" : result === "D" ? "Empate" : "Derrota"}
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            result === "W" && "bg-success",
            result === "D" && "bg-muted-foreground/50",
            result === "L" && "bg-primary/70",
          )}
        />
      ))}
    </span>
  );
}

function DialogHeading({
  titleId,
  title,
  description,
  onClose,
}: {
  titleId: string;
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 id={titleId} className={cn("font-black", title === "Confirmar palpite" ? "text-xl" : "text-lg")}>
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Fechar" onClick={onClose}>
        <CloseIcon />
      </button>
    </div>
  );
}

function Meta({ label, value, mono = false, strong = false }: { label: string; value: string; mono?: boolean; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("max-w-[58%] truncate text-right", mono && "font-mono font-semibold", strong ? "font-bold" : "font-medium")}>
        {value}
      </span>
    </div>
  );
}

function venueLabel(venue: GuessTeamOption["venue"]) {
  return venue === "casa" ? "Casa" : "Visitante";
}

function receiptText(receipt: Receipt) {
  return [
    "Comprovante de palpite — DESAFIOX",
    "",
    `Desafio: ${receipt.challengeName}`,
    `Campeonato: ${receipt.championshipName}`,
    `Ticket: ${receipt.ticketCode}`,
    `Rodada: ${receipt.roundNumber}`,
    "",
    `Time escolhido: ${receipt.teamName}`,
    `Confronto: ${receipt.teamName} x ${receipt.opponentName}`,
    `Mando: ${venueLabel(receipt.venue)}`,
    "",
    "Após confirmado, o palpite não pode ser alterado.",
    "",
    `Registrado em: ${receipt.confirmedAt.toLocaleString("pt-BR")}`,
  ].join("\n");
}

function shareWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

async function shareReceipt(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: "Comprovante de palpite — DESAFIOX", text });
      return;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
  }
  shareWhatsApp(text);
}
