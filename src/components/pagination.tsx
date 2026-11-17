import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { IPaging } from "@/types/paging";

export function Pagination({
  paging,
  hrefForPage,
}: {
  paging: IPaging;
  hrefForPage: (page: number) => string;
}) {
  if (paging.total <= 0) return null;

  const previous = paging.page > 1 ? paging.page - 1 : null;
  const next = paging.totalPages > paging.page ? paging.page + 1 : null;

  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-col items-end gap-3 sm:flex-row sm:items-center sm:justify-end">
      <p className="text-sm text-muted-foreground">
        <span className="sr-only">
          Página {paging.page} de {Math.max(paging.totalPages, 1)}, {paging.limit} por página.{" "}
        </span>
        {paging.startIndex}–{paging.endIndex} de {paging.total}
      </p>
      <div className="flex items-center gap-2">
        <PageControl href={previous == null ? null : hrefForPage(previous)}>Anterior</PageControl>
        <span className="min-w-14 text-center text-sm font-semibold tabular-nums">
          {paging.page}/{Math.max(paging.totalPages, 1)}
        </span>
        <PageControl href={next == null ? null : hrefForPage(next)}>Próxima</PageControl>
      </div>
    </nav>
  );
}

function PageControl({ href, children }: { href: string | null; children: ReactNode }) {
  const className = "inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold";
  if (!href) {
    return (
      <span aria-disabled="true" className={cn(className, "text-muted-foreground opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(className, "hover:bg-secondary")}>
      {children}
    </Link>
  );
}
