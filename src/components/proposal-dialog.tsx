"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatMoneyBR } from "@/lib/money";
import type { EvolutionTransferView } from "@/lib/queries/evolutionView";

export function ProposalDialog({
  proposal,
  ticketCode,
  onClose,
  onAccept,
  onReject,
}: {
  proposal: EvolutionTransferView;
  ticketCode: string;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const requested = proposal.status === "REQUESTED";
  const settlement = walletCredit(proposal.amount);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-foreground backdrop:bg-black/80"
      onClose={onClose}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-lg font-black">
            Proposta de @{proposal.proposerNickName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Ticket {ticketCode}</p>
        </div>
        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Fechar" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <dl className="mt-4 space-y-2 rounded-md border border-border bg-secondary/40 px-3 py-3 text-sm">
        <Row label="Status" value={requested ? "Aguardando sua decisão" : "Processando"} />
        <Row label="Recebida em" value={formatProposalDate(proposal.createdAtDateTime)} />
        <Row label="Valor da proposta" value={formatMoneyBR(proposal.amount)} />
        <Row label="Taxa de administração (10%)" value={formatMoneyBR(settlement.fee)} />
        <Row label="Crédito na carteira" value={formatMoneyBR(settlement.credit)} strong />
      </dl>

      <p className="mt-3 text-sm text-muted-foreground">
        {requested
          ? "Aceitar encerra as outras propostas deste ticket e envia o pagamento ao proponente. Recusar descarta só esta."
          : "O proponente já está pagando. Quando o pagamento for confirmado, o ticket passa para ele e o valor entra na sua carteira."}
      </p>

      {requested ? (
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="success" className="flex-1" onClick={onAccept}>
            Aceitar
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onReject}>
            Recusar
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-medium text-foreground" : "text-muted-foreground"}>{label}</dt>
      <dd className={strong ? "font-black tabular-nums text-highlight" : "font-semibold tabular-nums"}>{value}</dd>
    </div>
  );
}

function walletCredit(amount: number) {
  const value = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const credit = Math.round(value * 0.9 * 100) / 100;
  const fee = Math.round((value - credit) * 100) / 100;
  return { fee, credit };
}

function formatProposalDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
