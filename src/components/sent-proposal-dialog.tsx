"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { formatMoneyBR } from "@/lib/money";
import type { EvolutionTransferView } from "@/lib/queries/evolutionView";

export function SentProposalDialog({
  proposal,
  ticketCode,
  ownerNickName,
  onClose,
  onCancel,
}: {
  proposal: EvolutionTransferView;
  ticketCode: string;
  ownerNickName: string;
  onClose: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const awaitingPayment = proposal.status === "PROCESSING";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function pay() {
    const url = proposal.checkoutUrl.trim();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

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
            {awaitingPayment ? "Pagamento pendente" : "Proposta enviada"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {awaitingPayment ? "Conclua o pagamento para receber o ticket." : "O dono do ticket ainda não decidiu."}
          </p>
        </div>
        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Fechar" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <dl className="mt-4 space-y-2 rounded-md border border-border bg-secondary/40 px-3 py-3 text-sm">
        <Row label="Código" value={ticketCode} mono />
        <Row label="Proprietário" value={`@${ownerNickName.replace(/^@/, "")}`} />
        <Row label="Recebida em" value={formatProposalDate(proposal.createdAtDateTime)} />
        <Row label="Valor" value={formatMoneyBR(proposal.amount)} strong />
      </dl>

      {awaitingPayment ? (
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancelar proposta
          </Button>
          <Button type="button" variant="success" className="flex-1" disabled={!proposal.checkoutUrl.trim()} onClick={pay}>
            Pagar ticket
          </Button>
        </div>
      ) : null}
    </dialog>
  );
}

function Row({ label, value, strong = false, mono = false }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-black tabular-nums text-highlight" : mono ? "font-mono font-semibold" : "font-semibold"}>{value}</dd>
    </div>
  );
}

function formatProposalDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
