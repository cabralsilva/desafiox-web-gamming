"use client";

import { HandIcon, HandshakeIcon } from "@/components/icons";
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

export function MarketTicketCard({
  ticket,
  accountId,
  onBuy,
  onPropose,
}: {
  ticket: IMarketTicketCard;
  accountId: string | null;
  onBuy: () => void;
  onPropose: () => void;
}) {
  const action = marketTicketAction(ticket, accountId);
  const negotiating = action === "negotiating";
  const own = action === "own";
  const price = negotiating ? null : ticket.marketValue?.value;
  const modality = MODALITY_LABEL[ticket.challenge.championship.modality] ?? ticket.challenge.championship.modality;
  const roundLabel = roundText(ticket.challenge.currentRoundIndex, ticket.challenge.roundEndIndex);

  return (
    <article
      className={cn(
        "relative flex h-full min-w-0 flex-col rounded-[10px] border bg-card text-left shadow-sm",
        negotiating ? "border-border opacity-70" : "border-border",
      )}
    >
      {negotiating ? null : (
        <div className="absolute right-1 top-1 z-10">
          <SaleMark authorized={ticket.saleAuthorized} />
        </div>
      )}
      <div className="flex flex-col gap-1 px-2.5 pb-1.5 pt-2 pr-7">
        <p className="truncate text-[10px] font-medium lowercase tracking-wide text-muted-foreground">@{ticket.account.nickName}</p>
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.18em] text-foreground/80">{ticket.code}</p>
        <p className="truncate text-[11px] font-bold leading-tight">{ticket.challenge.name}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {modality ? `${modality} · ` : ""}
          {ticket.challenge.championship.name}
        </p>
        <div className="flex items-end justify-between gap-2 pt-0.5">
          <p className="min-w-0 truncate text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{roundLabel}</p>
          <p className="shrink-0 text-right text-accent">
            <span className="block text-[8px] font-semibold uppercase tracking-wider">Pontos</span>
            <span className="text-[10px] font-bold tabular-nums">{ticket.points}</span>
          </p>
        </div>
      </div>
      <div className="relative h-3" aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
        <span className="absolute right-0 top-1/2 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background" />
        <span className="absolute left-2.5 right-2.5 top-1/2 border-t border-dashed border-current opacity-35" />
      </div>
      <div className="mt-auto flex w-full items-stretch gap-1.5 px-2.5 pb-2 pt-0.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Mercado</span>
          {negotiating ? (
            <p className="flex min-h-7 items-center text-[10px] font-semibold text-muted-foreground">Em negociação</p>
          ) : own ? (
            <p className="flex min-h-7 items-center text-[10px] font-semibold">
              Seu ticket{price == null ? "" : ` · ${formatMoneyBR(price)}`}
            </p>
          ) : (
            <Button
              type="button"
              variant={action === "buy" ? "success" : "secondary"}
              size="sm"
              className="h-auto min-h-7 w-full whitespace-normal px-1 py-1 text-center text-[9px] leading-tight"
              onClick={action === "buy" ? onBuy : onPropose}
            >
              {action === "buy" ? "Comprar" : "Fazer proposta"}
              {price == null ? "" : ` ${formatMoneyBR(price)}`}
            </Button>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-end justify-end border-l border-dashed border-border pl-1.5 text-right">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Prêmio</span>
          <span className="truncate text-[10px] font-bold tabular-nums text-highlight">{formatMoneyBR(ticket.challenge.budgetAccumulated)}</span>
        </div>
      </div>
    </article>
  );
}

function roundText(current: number | null, end: number | null) {
  if (current != null && end != null) return `Rodada ${current} de ${end}`;
  if (current != null) return `Rodada ${current}`;
  if (end != null) return `Até a rodada ${end}`;
  return "Rodada";
}

function SaleMark({ authorized }: { authorized: boolean }) {
  const label = authorized ? "Ticket liberado para compra" : "Somente proposta liberado";
  return (
    <span title={label} aria-label={label} className={cn("flex h-5 w-5 items-center justify-center rounded-full", authorized ? "text-accent" : "text-muted-foreground")}>
      {authorized ? <HandshakeIcon className="h-3.5 w-3.5" /> : <HandIcon className="h-3.5 w-3.5" />}
    </span>
  );
}
