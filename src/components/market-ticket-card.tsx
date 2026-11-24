"use client";

import { useEffect, useState } from "react";
import { ClockIcon, HandIcon, HandshakeIcon } from "@/components/icons";
import { MarketTicketEvolutionDialog } from "@/components/market-ticket-evolution-dialog";
import { Button } from "@/components/ui/button";
import { formatMoneyBR } from "@/lib/money";
import { marketTicketAction, type IMarketTicketCard } from "@/types/marketTicket";
import { cn } from "@/lib/utils";

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

const ACTION_BUTTON = {
  buy: { label: "Comprar", variant: "success", disabled: false },
  propose: { label: "Fazer proposta", variant: "accent", disabled: false },
  negotiating: { label: "Em negociação", variant: "highlight", disabled: true },
  own: { label: "Seu ticket", variant: "default", disabled: true },
} as const;

export function MarketTicketCard({
  ticket,
  accountId,
  onBuy,
  onPropose,
  layout = "grid",
}: {
  ticket: IMarketTicketCard;
  accountId: string | null;
  onBuy: () => void;
  onPropose: () => void;
  layout?: "grid" | "list";
}) {
  const action = marketTicketAction(ticket, accountId);
  const negotiating = action === "negotiating";
  const button = ACTION_BUTTON[action];
  const price = ticket.marketValue?.value;
  const parties = negotiating && ticket.proposerNickName ? `@${ticket.account.nickName} ---> @${ticket.proposerNickName}` : "";
  const actionLabel = [price == null ? "" : formatMoneyBR(price), button.label, parties].filter(Boolean).join(" ");
  const modality = MODALITY_LABEL[ticket.challenge.championship.modality] ?? ticket.challenge.championship.modality;
  const roundLabel = roundPair(ticket.challenge.currentRoundIndex, ticket.challenge.roundEndIndex);
  const [evolutionOpen, setEvolutionOpen] = useState(false);

  return (
    <article
      className="relative flex h-full min-w-0 flex-col rounded-[10px] border border-border bg-card text-left shadow-sm"
    >
      <div className="absolute right-1 top-1 z-10">
        <SaleMark authorized={ticket.saleAuthorized} />
      </div>
      <div className="flex flex-col gap-1 px-2.5 pb-1.5 pt-2 pr-7">
        <p className="truncate text-[10px] font-medium lowercase tracking-wide text-muted-foreground">@{ticket.account.nickName}</p>
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/80">{ticket.code}</p>
        <p className="truncate text-[11px] font-bold leading-tight">{ticket.challenge.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {modality ? `${modality} · ` : ""}
          {ticket.challenge.championship.name}
        </p>
      </div>
      <div className="flex border-y border-border">
        <SummaryCell label="Prêmio" value={formatMoneyBR(ticket.challenge.budgetAccumulated)} valueClassName="text-highlight" className="bg-highlight/10" wide={layout !== "list"} />
        <SummaryCell label="Rodada" value={roundLabel} className="bg-foreground/[0.04]" />
        <SummaryCell label="Pontos" value={String(ticket.points)} className="bg-success/10" />
        {/* <SummaryCell label="%Ven" value={ticket.winProbability == null ? "—" : `${ticket.winProbability}%`} className="bg-accent/10" /> */}
      </div>
      <button
        type="button"
        className="my-2 self-center px-2.5 text-center text-[9px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => setEvolutionOpen(true)}
      >
        Ver evolução do desafio
      </button>
      {negotiating && ticket.negotiationExpiresAt ? (
        <div className="mb-1.5 flex justify-center px-2">
          <NegotiationCountdown expiresAt={ticket.negotiationExpiresAt} />
        </div>
      ) : null}
      <div className="relative h-3" aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
        <span className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
        <span className="absolute left-2.5 right-2.5 top-1/2 border-t border-dashed border-current opacity-35" />
      </div>
      <div className="mt-auto flex w-full flex-col gap-1 px-2.5 pb-2 pt-0.5">
        {/* <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Preço/Valor</span> */}
        <Button
          type="button"
          variant={button.variant}
          size="sm"
          className="h-10 w-full min-w-0 flex-col gap-0 overflow-hidden px-1.5 py-1 text-[9px] leading-none disabled:opacity-60"
          disabled={button.disabled}
          aria-label={actionLabel}
          onClick={button.disabled ? undefined : action === "buy" ? onBuy : onPropose}
        >
          <span className="flex w-full min-w-0 items-center justify-center gap-1">
            {price == null ? null : <span className="shrink-0 text-sm font-black tabular-nums leading-none">{formatMoneyBR(price)}</span>}
            <span className="truncate">{button.label}</span>
          </span>
          {negotiating && ticket.proposerNickName ? (
            <span className="max-w-full truncate text-[8px] font-medium leading-none">
              @{ticket.account.nickName}
              <span className="px-0.5">---&gt;</span>
              @{ticket.proposerNickName}
            </span>
          ) : null}
        </Button>
      </div>
      {evolutionOpen ? <MarketTicketEvolutionDialog ticket={ticket} onClose={() => setEvolutionOpen(false)} /> : null}
    </article>
  );
}

function NegotiationCountdown({ expiresAt }: { expiresAt: string }) {
  const [label, setLabel] = useState("cancela em --:--:--");
  useEffect(() => {
    const tick = () => setLabel(formatNegotiationCountdown(expiresAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
      <ClockIcon className="h-3 w-3" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function formatNegotiationCountdown(expiresAt: string, now = Date.now()) {
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) return "cancela em --:--:--";
  const remaining = end - now;
  if (remaining <= 0) return "cancelada";
  const total = Math.floor(remaining / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `cancela em ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function SummaryCell({
  label,
  value,
  valueClassName,
  className,
  wide = false,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 border-l border-border px-1 py-1.5 text-center first:border-l-0",
        wide ? "shrink-0 px-1.5" : "flex-1",
        className,
      )}
      title={`${label}: ${value}`}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className={cn("max-w-full text-[11px] font-bold tabular-nums", wide ? "whitespace-nowrap" : "truncate", valueClassName)}>{value}</span>
    </div>
  );
}

function roundPair(current: number | null, end: number | null) {
  if (current != null && end != null) return `${current}/${end}`;
  if (current != null) return String(current);
  if (end != null) return `/${end}`;
  return "—";
}

function SaleMark({ authorized }: { authorized: boolean }) {
  const label = authorized ? "Ticket liberado para compra" : "Somente proposta liberado";
  return (
    <span title={label} aria-label={label} className={cn("flex h-5 w-5 items-center justify-center rounded-full", authorized ? "text-accent" : "text-muted-foreground")}>
      {authorized ? <HandshakeIcon className="h-3.5 w-3.5" /> : <HandIcon className="h-3.5 w-3.5" />}
    </span>
  );
}
