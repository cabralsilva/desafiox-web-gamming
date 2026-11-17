"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChallengeCard } from "@/components/challenge-card";
import { Pagination } from "@/components/pagination";
import { RulesDialog } from "@/components/rules-dialog";
import { useSession } from "@/components/session-provider";
import { challengeHref, listChallenges, type ChallengeListQuery } from "@/lib/queries/challengeList";
import { cn } from "@/lib/utils";
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
    <div>
      <ChallengeSearch query={query} />
      <div className="mt-4 space-y-3">
        <FilterGroup label="Status">
          {STATUS_TAGS.map((tag) => (
            <FilterTag
              key={tag.value}
              href={challengeHref(query, {
                status: query.status === tag.value ? null : tag.value,
                page: 1,
              })}
              pressed={query.status === tag.value}
            >
              {tag.label}
            </FilterTag>
          ))}
        </FilterGroup>
        {signedIn ? (
          <FilterGroup label="Meus tickets">
            {TICKET_TAGS.map((tag) => (
              <FilterTag
                key={tag.value}
                href={challengeHref(query, {
                  tickets: query.tickets === tag.value ? null : tag.value,
                  page: 1,
                })}
                pressed={query.tickets === tag.value}
              >
                {tag.label}
              </FilterTag>
            ))}
          </FilterGroup>
        ) : null}
      </div>
      {result.items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">Nenhum desafio encontrado.</p>
          {hasFilter ? (
            <Link href="/" className="mt-4 inline-flex h-11 items-center text-sm font-semibold text-primary">
              Limpar filtros
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((challenge) => (
            <li key={challenge._id}>
              <ChallengeCard challenge={challenge} signedIn={signedIn} onReadRules={() => setRules(challenge)} />
            </li>
          ))}
        </ul>
      )}
      <Pagination paging={result.paging} hrefForPage={(page) => challengeHref(query, { page })} />
      {rules ? (
        <RulesDialog title={`Regras · ${rules.name}`} html={rules.descriptionLong} onClose={() => setRules(null)} />
      ) : null}
    </div>
  );
}

function ChallengeSearch({ query }: { query: ChallengeListQuery }) {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState(query.q);

  useEffect(() => {
    setValue(query.q);
  }, [query.q]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === query.q) return;
    const delay = trimmed === "" ? 0 : 300;
    const timeout = window.setTimeout(() => {
      router.replace(challengeHref(query, { q: trimmed, page: 1 }), { scroll: false });
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [query, router, value]);

  return (
    <div>
      <label htmlFor={inputId} className="text-sm font-semibold">
        Buscar desafio
      </label>
      <input
        id={inputId}
        type="search"
        value={value}
        placeholder="Nome do desafio"
        onChange={(event) => setValue(event.target.value)}
        className="mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="-mx-4 mt-2 overflow-x-auto px-4">
        <div role="group" aria-label={label} className="flex w-max items-center gap-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function FilterTag({
  href,
  pressed,
  children,
}: {
  href: string;
  pressed: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
