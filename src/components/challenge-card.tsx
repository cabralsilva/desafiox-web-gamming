"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { ChevronsRightIcon, ScrollHintIcon } from "@/components/icons";
import { formatDateBR, isCurrentPricingWindow } from "@/lib/dates";
import { formatMoneyBR } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { IPublicChallengeCard } from "@/types/publicChallenge";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  OPEN_TO_BUY_TICKETS: "Não iniciado",
  RUNNING: "Em andamento",
  FINISHED: "Finalizado",
};

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

export function ChallengeCard({
  challenge,
  signedIn,
  onReadRules,
  onBuy,
}: {
  challenge: IPublicChallengeCard;
  signedIn: boolean;
  onReadRules: () => void;
  onBuy: () => void;
}) {
  const notStarted = challenge.status === "OPEN_TO_BUY_TICKETS";

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-1 flex-col px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-black tracking-tight">{challenge.name}</h2>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
              challenge.status === "RUNNING" && "border-highlight text-highlight",
              challenge.status === "FINISHED" && "border-border text-muted-foreground",
              notStarted && "border-accent text-accent",
            )}
          >
            {STATUS_LABEL[challenge.status] ?? challenge.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {MODALITY_LABEL[challenge.championship.modality] ?? challenge.championship.modality} · {challenge.championship.name}
        </p>
        <PricingTimeline
          windows={challenge.pricing}
          action={
            challenge.status === "OPEN_TO_BUY_TICKETS"
              ? "buy"
              : challenge.status === "RUNNING"
                ? "market"
                : challenge.status === "FINISHED"
                  ? "closed"
                  : "none"
          }
          marketHref={`/mercado?q=${encodeURIComponent(challenge.name)}`}
          onBuy={onBuy}
        />
        {signedIn && challenge.myTickets ? (
          <p className="mt-2 text-xs font-semibold">
            Você tem{" "}
            <span className="text-highlight">
              {challenge.myTickets.active}/{challenge.myTickets.total} tickets
            </span>{" "}
            sobreviventes
          </p>
        ) : null}
      </div>
      <footer className="mt-auto flex border-t border-border">
        <FooterCell>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Prêmio</span>
          <span className="text-sm font-bold text-highlight">{formatMoneyBR(challenge.budgetAccumulated)}</span>
        </FooterCell>
        <button type="button" className={footerActionClass} onClick={onReadRules}>
          Ver regras
        </button>
        <Link
          href={`/desafios/${challenge.slug}`}
          className={cn(
            footerActionClass,
            "flex-row bg-[hsl(2_68%_32%)] text-primary-foreground hover:bg-[hsl(2_68%_38%)]",
          )}
        >
          Ver evolução
          <ChevronsRightIcon className="h-4 w-5" />
        </Link>
      </footer>
    </article>
  );
}

const footerActionClass =
  "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 border-l border-border px-2 py-2 text-center text-xs font-semibold first:border-l-0";

function FooterCell({ children }: { children: ReactNode }) {
  return <div className={footerActionClass}>{children}</div>;
}

const timelineActionClass =
  "mt-2 inline-flex h-8 items-center whitespace-nowrap rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground";

const timelineInfoClass =
  "mt-2 inline-flex h-8 cursor-default items-center whitespace-nowrap rounded-md bg-muted-foreground px-3 text-xs font-semibold text-background";

function TimelineNode({
  emphasized,
  connect,
  activeLine,
}: {
  emphasized: boolean;
  connect: boolean;
  activeLine: boolean;
}) {
  return (
    <span className="relative flex h-4 w-full items-center justify-center">
      {connect ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-1/2 top-1/2 w-[calc(100%+1rem)] -translate-y-1/2",
            activeLine ? "h-1 bg-highlight" : "h-px bg-border",
          )}
        />
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "relative h-2.5 w-2.5 rounded-full border-2",
          emphasized ? "border-highlight bg-highlight" : "border-border bg-card",
        )}
      />
    </span>
  );
}

function PricingTimeline({
  windows,
  action,
  marketHref,
  onBuy,
}: {
  windows: IPublicChallengeCard["pricing"];
  action: "buy" | "market" | "closed" | "none";
  marketHref: string;
  onBuy: () => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLLIElement>(null);
  const leadRef = useRef<HTMLLIElement>(null);
  const tailRef = useRef<HTMLLIElement>(null);
  const dateIndex = windows.findIndex((window) => isCurrentPricingWindow(window, new Date()));
  const hasTrailingStep = action === "market" || action === "closed";
  const focusStepIndex = hasTrailingStep ? windows.length : dateIndex >= 0 ? dateIndex : windows.length - 1;

  useEffect(() => {
    const scroller = scrollerRef.current;
    const item = focusRef.current;
    const lead = leadRef.current;
    const tail = tailRef.current;
    if (!scroller || !item || !lead || !tail) return;

    const align = () => {
      const pad = Math.max(0, (scroller.clientWidth - item.offsetWidth) / 2);
      lead.style.width = `${pad}px`;
      tail.style.width = `${pad}px`;
      scroller.scrollLeft = item.offsetLeft - pad;
    };

    align();
    const observer = new ResizeObserver(align);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [focusStepIndex, windows.length]);

  if (windows.length === 0) return null;

  const stepCount = windows.length + (hasTrailingStep ? 1 : 0);

  return (
    <div className="relative mt-4 -mx-5 bg-muted/50">
      <div className="pointer-events-none flex justify-center pt-2" aria-hidden="true">
        <ScrollHintIcon className="h-1.5 w-4 text-muted-foreground/80" />
      </div>
      <div
        ref={scrollerRef}
        aria-label="Janelas de preço"
        className="overflow-x-auto pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ol className="flex w-max items-stretch">
          <li ref={leadRef} aria-hidden="true" className="shrink-0" />
          {windows.map((window, index) => {
            const past = index < focusStepIndex;
            const centered = index === focusStepIndex;
            const buyHere = action === "buy" && centered;
            return (
              <li
                key={`${window.initDateTime}-${window.endDateTime}-${window.value}`}
                ref={centered ? focusRef : undefined}
                aria-current={centered ? "true" : undefined}
                className={cn("flex w-40 shrink-0 flex-col items-center px-2 text-center", past && "blur-[0.5px]")}
              >
                <span className="mb-2 min-h-4 text-[11px] text-muted-foreground">Até {formatDateBR(window.endDateTime)}</span>
                <TimelineNode emphasized={index <= focusStepIndex} connect={index < stepCount - 1} activeLine={past} />
                {buyHere ? (
                  <button type="button" className={timelineActionClass} onClick={onBuy}>
                    {formatMoneyBR(window.value)} Comprar
                  </button>
                ) : (
                  <span className={cn("mt-2 text-sm font-semibold", past && "text-muted-foreground line-through")}>
                    {formatMoneyBR(window.value)}
                  </span>
                )}
              </li>
            );
          })}
          {hasTrailingStep ? (
            <li
              ref={focusRef}
              aria-current="true"
              className="flex w-40 shrink-0 flex-col items-center px-2 text-center"
            >
              <span className="mb-2 min-h-4" aria-hidden="true" />
              <TimelineNode emphasized connect={false} activeLine={false} />
              {action === "market" ? (
                <Link href={marketHref} className={timelineActionClass}>
                  Ir ao mercado
                </Link>
              ) : (
                <span className={timelineInfoClass}>{STATUS_LABEL.FINISHED}</span>
              )}
            </li>
          ) : null}
          <li ref={tailRef} aria-hidden="true" className="shrink-0" />
        </ol>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-card to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-card to-transparent" />
    </div>
  );
}
