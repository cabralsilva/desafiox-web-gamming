"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type FilterGroupItem } from "@/components/filter-tags";
import { MarketTicketCard } from "@/components/market-ticket-card";
import { ResourceList } from "@/components/resource-list";
import { useSession } from "@/components/session-provider";
import { TicketTransferProposalDialog } from "@/components/ticket-transfer-proposal-dialog";
import { accountIdFromToken } from "@/lib/jwt";
import {
  loadMarketForSession,
  MARKET_SORT_FIELDS,
  marketHref,
  type MarketListQuery,
} from "@/lib/queries/marketTickets";
import { getAuthToken } from "@/lib/session";
import { marketTicketAction, type IMarketTicketCard } from "@/types/marketTicket";
import type { IPage } from "@/types/paging";

const AVAILABILITY_TAGS = [
  { value: "sale" as const, label: "Venda liberada" },
  { value: "proposal" as const, label: "Enviar propostas" },
  { value: "negotiation" as const, label: "Em negociação" },
];

const OWNER_TAGS = [
  { value: "me" as const, label: "Eu" },
  { value: "others" as const, label: "Outros" },
];

export function MarketHome({
  query,
  initial,
}: {
  query: MarketListQuery;
  initial: IPage<IMarketTicketCard>;
}) {
  const { signedIn } = useSession();
  const accountId = signedIn ? accountIdFromToken(getAuthToken()) : null;
  const [ownerPage, setOwnerPage] = useState<IPage<IMarketTicketCard> | null>(null);
  const [negotiatingIds, setNegotiatingIds] = useState<ReadonlySet<string>>(new Set());
  const [offer, setOffer] = useState<IMarketTicketCard | null>(null);
  const needsOwner = Boolean(signedIn && query.owner && accountId);
  const source = needsOwner && ownerPage ? ownerPage : initial;
  const items = source.items.map((item) =>
    negotiatingIds.has(item._id) ? { ...item, inNegotiation: true, marketValue: undefined } : item,
  );
  const hasFilter = Boolean(query.q || query.availability || (signedIn && query.owner));

  useEffect(() => {
    if (!query.ticketId) return;
    const ticket = (ownerPage ?? initial).items.find((item) => item._id === query.ticketId);
    if (!ticket) return;
    const action = marketTicketAction(ticket, accountId);
    if (action !== "buy" && action !== "propose") return;
    setOffer((current) => (current?._id === ticket._id ? current : ticket));
  }, [accountId, initial, ownerPage, query.ticketId]);

  useEffect(() => {
    if (!needsOwner || !accountId) {
      setOwnerPage(null);
      return;
    }
    let cancelled = false;
    void loadMarketForSession(query, accountId).then((page) => {
      if (!cancelled) setOwnerPage(page);
    });
    return () => {
      cancelled = true;
    };
  }, [accountId, needsOwner, query]);

  function openOffer(ticket: IMarketTicketCard) {
    const action = marketTicketAction(ticket, accountId);
    if (action !== "buy" && action !== "propose") return;
    const params = new URLSearchParams(window.location.search);
    params.set("ticket", ticket._id);
    const search = params.toString();
    window.history.replaceState(null, "", search ? `/mercado?${search}` : "/mercado");
    setOffer(ticket);
  }

  return (
    <>
      <ResourceList
        items={needsOwner && !ownerPage ? [] : items}
        paging={needsOwner && ownerPage ? ownerPage.paging : source.paging}
        getKey={(ticket) => ticket._id}
        renderCard={(ticket) => (
          <MarketTicketCard
            ticket={ticket}
            accountId={accountId}
            onBuy={() => openOffer(ticket)}
            onPropose={() => openOffer(ticket)}
          />
        )}
        sortFields={MARKET_SORT_FIELDS}
        groups={filterGroups(query, signedIn)}
        query={query}
        hrefFor={(patch) => marketHref(query, patch)}
        searchLabel="Buscar ticket"
        searchPlaceholder="Código do ticket, desafio ou campeonato"
        gridClassName="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5"
        empty={
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              {needsOwner && !ownerPage ? "Carregando seus tickets…" : "Nenhum ticket encontrado."}
            </p>
            {hasFilter && !(needsOwner && !ownerPage) ? (
              <Link href="/mercado" className="mt-4 inline-flex h-11 items-center text-sm font-semibold text-primary">
                Limpar filtros
              </Link>
            ) : null}
          </div>
        }
      />
      {offer ? (
        <TicketTransferProposalDialog
          signedIn={signedIn}
          ticketId={offer._id}
          ticketCode={offer.code}
          ownerNickName={offer.account.nickName}
          points={offer.points}
          marketValue={offer.marketValue?.value ?? null}
          saleAuthorized={offer.saleAuthorized}
          rulesHtml={offer.challenge.descriptionLong}
          onOpenChange={(open) => {
            if (open) return;
            setOffer(null);
            const params = new URLSearchParams(window.location.search);
            if (!params.has("ticket")) return;
            params.delete("ticket");
            const search = params.toString();
            window.history.replaceState(null, "", search ? `/mercado?${search}` : "/mercado");
          }}
          onRecorded={() => {
            const id = offer._id;
            setNegotiatingIds((current) => new Set(current).add(id));
          }}
        />
      ) : null}
    </>
  );
}

function filterGroups(query: MarketListQuery, signedIn: boolean): FilterGroupItem[] {
  const groups: FilterGroupItem[] = [
    {
      label: "Disponibilidade",
      tags: AVAILABILITY_TAGS.map((tag) => ({
        id: tag.value,
        label: tag.label,
        pressed: query.availability === tag.value,
        href: marketHref(query, {
          availability: query.availability === tag.value ? null : tag.value,
          page: 1,
        }),
      })),
    },
  ];
  if (signedIn) {
    groups.push({
      label: "Dono",
      tags: OWNER_TAGS.map((tag) => ({
        id: tag.value,
        label: tag.label,
        pressed: query.owner === tag.value,
        href: marketHref(query, {
          owner: query.owner === tag.value ? null : tag.value,
          page: 1,
        }),
      })),
    });
  }
  return groups;
}
