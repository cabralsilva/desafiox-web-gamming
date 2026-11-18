"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AccountAccessChoices } from "@/components/auth-links";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { canConfirmGuess, confirmGuess, loadAvailableGuesses, type GuessTeamOption } from "@/lib/guess";
import { cn } from "@/lib/utils";

export function MakeGuessDialog({
  open,
  signedIn,
  challengeId,
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
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [board, setBoard] = useState({ challengeId, challengeRoundId, ticketId });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !signedIn || !ticketGuessId || !challengeRoundId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setSelected("");
    void loadAvailableGuesses(ticketGuessId, challengeRoundId)
      .then((next) => {
        if (cancelled) return;
        setTeams(next.teams);
        setBoard({
          challengeId: next.challengeId || challengeId,
          challengeRoundId: next.challengeRoundId || challengeRoundId,
          ticketId: next.ticketId || ticketId,
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
  }, [open, signedIn, ticketGuessId, challengeRoundId, challengeId, ticketId]);

  async function submit() {
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
        teamId: selected,
      });
      onConfirmed();
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar o palpite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-foreground backdrop:bg-black/80"
      onClose={() => {
        if (open) onOpenChange(false);
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-lg font-black">
            Fazer palpite
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rodada {roundNumber} · {ticketCode}. Escolha um time ainda não usado.
          </p>
        </div>
        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Fechar" onClick={() => onOpenChange(false)}>
          <CloseIcon />
        </button>
      </div>

      {signedIn ? (
        <div className="mt-4 space-y-2">
          {loading ? <p className="text-sm text-muted-foreground">Carregando times…</p> : null}
          {teams.map((team) => (
            <label
              key={team.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-3",
                !team.available && "cursor-not-allowed opacity-60",
                team.available && selected === team.id && "border-accent bg-accent/10",
                team.available && selected !== team.id && "border-border",
              )}
            >
              <input
                type="radio"
                name="guess-team"
                value={team.id}
                className="mt-1"
                disabled={!team.available || busy}
                checked={selected === team.id}
                onChange={() => setSelected(team.id)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{team.name}</span>
                {team.available ? (
                  <span className="block text-[11px] text-muted-foreground">
                    vs {team.opponent} · {team.venue}
                  </span>
                ) : (
                  <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{team.blockReason}</span>
                )}
              </span>
            </label>
          ))}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end pt-2">
            <Button type="button" variant="accent" disabled={!selected || busy || loading} onClick={() => void submit()}>
              {busy ? "Registrando…" : "Confirmar palpite"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm">Entre na DESAFIOX para registrar o palpite.</p>
          <AccountAccessChoices />
        </div>
      )}
    </dialog>
  );
}
