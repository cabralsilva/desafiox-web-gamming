"use client";

import Link from "next/link";
import { useState } from "react";
import { ChallengeCard } from "@/components/challenge-card";
import { type FilterGroupItem } from "@/components/filter-tags";
import { ResourceList } from "@/components/resource-list";
import { RulesDialog } from "@/components/rules-dialog";
import { useSession } from "@/components/session-provider";
import {
  CHALLENGE_SORT_FIELDS,
  challengeHref,
  listChallenges,
  type ChallengeListQuery,
} from "@/lib/queries/challengeList";
import type { IPublicChallengeCard } from "@/types/publicChallenge";

const STATUS_TAGS = [
  { value: "OPEN_TO_BUY_TICKETS", label: "Não iniciado" },
  { value: "RUNNING", label: "Em andamento" },
  { value: "FINISHED", label: "Finalizado" },
] as const;

const TICKET_TAGS = [
  { value: "active" as const, label: "Ativos" },
  { value: "eliminated" as const, label: "Eliminados" },
];

export function ChallengeHome({
  query,
  publicItems,
  sessionItems,
}: {
  query: ChallengeListQuery;
  publicItems: IPublicChallengeCard[];
  sessionItems: IPublicChallengeCard[];
}) {
  const { signedIn } = useSession();
  const source = signedIn ? sessionItems : publicItems;
  const result = listChallenges(source, { ...query, signedIn });
  const [rules, setRules] = useState<IPublicChallengeCard | null>(null);
  const hasFilter = Boolean(query.q || query.status || (signedIn && query.tickets));

  return (
    <>
      <ResourceList
        items={result.items}
        paging={result.paging}
        getKey={(challenge) => challenge._id}
        renderCard={(challenge) => (
          <ChallengeCard challenge={challenge} signedIn={signedIn} onReadRules={() => setRules(challenge)} />
        )}
        sortFields={CHALLENGE_SORT_FIELDS}
        groups={filterGroups(query, signedIn)}
        query={query}
        hrefFor={(patch) => challengeHref(query, patch)}
        searchLabel="Buscar desafio"
        searchPlaceholder="Digite o nome do desafio, campeonato e etc para iniciar a busca"
        empty={
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Nenhum desafio encontrado.</p>
            {hasFilter ? (
              <Link href="/" className="mt-4 inline-flex h-11 items-center text-sm font-semibold text-primary">
                Limpar filtros
              </Link>
            ) : null}
          </div>
        }
      />
      {rules ? (
        <RulesDialog title={`Regras · ${rules.name}`} html={rules.descriptionLong} onClose={() => setRules(null)} />
      ) : null}
    </>
  );
}

function filterGroups(query: ChallengeListQuery, signedIn: boolean): FilterGroupItem[] {
  const groups: FilterGroupItem[] = [
    {
      label: "Status",
      tags: STATUS_TAGS.map((tag) => ({
        id: tag.value,
        label: tag.label,
        pressed: query.status === tag.value,
        href: challengeHref(query, {
          status: query.status === tag.value ? null : tag.value,
          page: 1,
        }),
      })),
    },
  ];
  if (signedIn) {
    groups.push({
      label: "Meus tickets",
      tags: TICKET_TAGS.map((tag) => ({
        id: tag.value,
        label: tag.label,
        pressed: query.tickets === tag.value,
        href: challengeHref(query, {
          tickets: query.tickets === tag.value ? null : tag.value,
          page: 1,
        }),
      })),
    });
  }
  return groups;
}

