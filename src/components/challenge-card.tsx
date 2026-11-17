import Link from "next/link";
import { Button } from "@/components/ui/button";
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
}: {
  challenge: IPublicChallengeCard;
  signedIn: boolean;
  onReadRules: () => void;
}) {
  const notStarted = challenge.status === "OPEN_TO_BUY_TICKETS";
  const now = new Date();

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
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
      <p className="mt-3 text-sm text-foreground">{challenge.descriptionShort}</p>
      <p className="mt-3 text-sm font-semibold">Prêmio {formatMoneyBR(challenge.budgetAccumulated)}</p>
      {signedIn && challenge.myTickets ? (
        <p className="mt-2 text-sm font-semibold text-highlight">
          {challenge.myTickets.active}/{challenge.myTickets.total} ativos
        </p>
      ) : null}
      {notStarted ? (
        <ul className="mt-4 space-y-2">
          {challenge.pricing.map((window) => {
            const current = isCurrentPricingWindow(window, now);
            return (
              <li
                key={`${window.initDateTime}-${window.endDateTime}-${window.value}`}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  current ? "border-highlight" : "border-border",
                )}
              >
                <span>
                  {formatDateBR(window.initDateTime)} – {formatDateBR(window.endDateTime)}
                </span>
                <span className="mt-1 flex items-center justify-between gap-3 font-semibold">
                  {formatMoneyBR(window.value)}
                  {current ? <span className="text-highlight">Vigente</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="mt-auto flex items-center justify-end gap-2 pt-6">
        <Button type="button" variant="outline" onClick={onReadRules}>
          Ler regras
        </Button>
        <Button asChild>
          <Link href={`/desafios/${challenge.slug}`}>Ver evolução</Link>
        </Button>
      </div>
    </article>
  );
}
