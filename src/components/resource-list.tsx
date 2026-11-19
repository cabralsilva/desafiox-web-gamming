"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FilterTags, type FilterGroupItem } from "@/components/filter-tags";
import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from "@/components/icons";
import { Pagination } from "@/components/pagination";
import type { ListingControls, SortField } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { IPaging } from "@/types/paging";

const SEARCH_DEBOUNCE_MS = 1500;

export function ResourceList<T, Query extends ListingControls>({
  items,
  paging,
  getKey,
  renderCard,
  sortFields,
  groups,
  query,
  hrefFor,
  searchLabel,
  searchPlaceholder,
  gridClassName = "md:grid md:grid-cols-2 md:gap-4 xl:grid-cols-3",
  empty,
}: {
  items: T[];
  paging: IPaging;
  getKey: (item: T) => string;
  renderCard: (item: T) => ReactNode;
  sortFields: SortField[];
  groups: FilterGroupItem[];
  query: Query;
  hrefFor: (patch: Partial<Query>) => string;
  searchLabel: string;
  searchPlaceholder: string;
  gridClassName?: string;
  empty?: ReactNode;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <ListingSearch query={query} hrefFor={hrefFor} label={searchLabel} placeholder={searchPlaceholder} />
        <ViewToggle query={query} hrefFor={hrefFor} />
        <SortControls query={query} hrefFor={hrefFor} sortFields={sortFields} />
      </div>
      <FilterTags groups={groups} />
      {items.length === 0 ? (
        empty ?? <p className="mt-8 text-sm text-muted-foreground">Nenhum resultado.</p>
      ) : (
        <ul
          className={cn(
            "mt-6 flex flex-col gap-3",
            query.view === "grid" && gridClassName,
          )}
        >
          {items.map((item) => (
            <li key={getKey(item)} className="min-w-0">{renderCard(item)}</li>
          ))}
        </ul>
      )}
      <Pagination paging={paging} hrefForPage={(page) => hrefFor({ page } as Partial<Query>)} />
    </div>
  );
}

function ListingSearch<Query extends ListingControls>({
  query,
  hrefFor,
  label,
  placeholder,
}: {
  query: Query;
  hrefFor: (patch: Partial<Query>) => string;
  label: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(query.q);

  useEffect(() => {
    setValue(query.q);
  }, [query.q]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed === query.q) return;
    const timeout = window.setTimeout(() => {
      router.replace(hrefFor({ q: trimmed, page: 1 } as Partial<Query>), { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [hrefFor, query, router, value]);

  return (
    <div className="relative min-w-0 flex-1 basis-48">
      <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <SearchIcon className="h-3.5 w-3.5" />
      </span>
      <input
        type="search"
        value={value}
        aria-label={label}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="h-11 w-full rounded-md border border-input bg-card py-0 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-decoration]:hidden"
      />
    </div>
  );
}

function ViewToggle<Query extends ListingControls>({
  query,
  hrefFor,
}: {
  query: Query;
  hrefFor: (patch: Partial<Query>) => string;
}) {
  return (
    <div role="group" aria-label="Tipo de exibição" className="hidden shrink-0 overflow-hidden rounded-md border border-border md:flex">
      <ViewLink href={hrefFor({ view: "grid" } as Partial<Query>)} pressed={query.view === "grid"}>
        Grade
      </ViewLink>
      <ViewLink href={hrefFor({ view: "list" } as Partial<Query>)} pressed={query.view === "list"}>
        Lista
      </ViewLink>
    </div>
  );
}

function ViewLink({ href, pressed, children }: { href: string; pressed: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-pressed={pressed}
      className={cn(
        "inline-flex h-11 items-center border-r border-border px-3 text-xs font-semibold last:border-r-0",
        pressed ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function SortControls<Query extends ListingControls>({
  query,
  hrefFor,
  sortFields,
}: {
  query: Query;
  hrefFor: (patch: Partial<Query>) => string;
  sortFields: SortField[];
}) {
  const router = useRouter();
  if (sortFields.length === 0) return null;

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5 md:w-auto md:shrink-0 md:gap-2">
      <div className="flex h-11 shrink-0 items-center rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring">
        <span aria-hidden="true" className="shrink-0 pl-3 text-xs font-semibold text-muted-foreground">
          Ordem:
        </span>
        <select
          aria-label="Ordenar por"
          value={query.orderBy}
          onChange={(event) => {
            router.replace(hrefFor({ orderBy: event.target.value, page: 1 } as Partial<Query>), { scroll: false });
          }}
          className="h-full w-auto cursor-pointer bg-transparent pl-1.5 pr-2 text-xs font-semibold text-foreground outline-none"
        >
          {sortFields.map((field) => (
            <option key={field.value} value={field.value}>
              {field.label}
            </option>
          ))}
        </select>
      </div>
      <div role="group" aria-label="Sentido da ordenação" className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-border md:flex-none">
        <SortSenseLink href={hrefFor({ orderSense: "asc", page: 1 } as Partial<Query>)} pressed={query.orderSense === "asc"} label="Crescente">
          <ArrowUpIcon />
        </SortSenseLink>
        <SortSenseLink href={hrefFor({ orderSense: "desc", page: 1 } as Partial<Query>)} pressed={query.orderSense === "desc"} label="Decrescente">
          <ArrowDownIcon />
        </SortSenseLink>
      </div>
    </div>
  );
}

function SortSenseLink({
  href,
  pressed,
  label,
  children,
}: {
  href: string;
  pressed: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1 border-r border-border px-1.5 text-xs font-semibold last:border-r-0 md:flex-none md:gap-1.5 md:px-3",
        pressed ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
