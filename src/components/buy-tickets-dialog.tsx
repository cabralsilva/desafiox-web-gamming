"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AccountAccessChoices } from "@/components/auth-links";
import { CloseIcon } from "@/components/icons";
import { RulesDialog } from "@/components/rules-dialog";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { isCurrentPricingWindow } from "@/lib/dates";
import { accountIdFromToken } from "@/lib/jwt";
import { formatMoneyBR } from "@/lib/money";
import { presentMoney, readBalanceAfter, sessionBalancePath } from "@/lib/queries/sessionBalance";
import {
  canConfirmPurchase,
  createSubmitGuard,
  readOrderStatus,
  submitTicketOrder,
  ticketOrderByIdPath,
  type TicketPaymentMethod,
} from "@/lib/queries/ticketOrder";
import { getAuthToken } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { IPublicChallengeCard } from "@/types/publicChallenge";

const PENDING_ORDER_KEY = "desafiox.pendingTicketOrderId";

export function BuyTicketsDialog({
  challenge,
  open,
  onOpenChange,
  pendingOrderId = null,
}: {
  challenge: IPublicChallengeCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingOrderId?: string | null;
}) {
  const { signedIn, balance, balanceStatus, valuesVisible } = useSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const guardRef = useRef(createSubmitGuard());
  const titleId = useId();
  const [count, setCount] = useState(1);
  const [accepted, setAccepted] = useState(false);
  const [method, setMethod] = useState<TicketPaymentMethod>("checkout");
  const [accessOpen, setAccessOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<"form" | "processing" | "success">("form");
  const [walletBalance, setWalletBalance] = useState<number | null>(balance);

  const unit = currentUnitPrice(challenge?.pricing ?? []);
  const total = (unit ?? 0) * count;
  const insufficient = method === "credits" && walletBalance != null && total > walletBalance;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) return;
    setCount(1);
    setAccepted(false);
    setMethod("checkout");
    setAccessOpen(false);
    setMessage(null);
    setPhase("form");
    setSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open || !signedIn) return;
    if (balanceStatus === "ready") {
      setWalletBalance(balance);
      return;
    }
    let cancelled = false;
    void apiRequest(sessionBalancePath(), { auth: true })
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const value = readBalanceAfter(await response.json());
        if (!cancelled) setWalletBalance(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, signedIn, balance, balanceStatus]);

  useEffect(() => {
    if (!open || !pendingOrderId || !signedIn) return;
    const orderId = pendingOrderId;
    let cancelled = false;
    const started = Date.now();
    setPhase("processing");
    setMessage("Estamos confirmando seu pagamento. Isso pode levar alguns segundos.");

    async function poll() {
      if (cancelled) return;
      if (Date.now() - started > 90_000) {
        setMessage("Ainda estamos processando o pagamento. Confira seus tickets em instantes.");
        return;
      }
      try {
        const response = await apiRequest(ticketOrderByIdPath(orderId), { auth: true });
        const data = await response.json().catch(() => ({}));
        const status = readOrderStatus(data);
        if (cancelled) return;
        if (status === "PAID") {
          setPhase("success");
          setMessage("Pagamento confirmado. Seus tickets já estão na conta.");
          return;
        }
        if (status === "CANCELLED") {
          setPhase("form");
          setMessage("Pedido cancelado.");
          return;
        }
      } catch {
        if (!cancelled) setMessage("Não foi possível consultar o pagamento agora.");
      }
      if (!cancelled) window.setTimeout(poll, 2500);
    }

    void poll();
    return () => {
      cancelled = true;
    };
  }, [open, pendingOrderId, signedIn]);

  async function confirm() {
    if (!challenge || !canConfirmPurchase(signedIn) || unit == null || !accepted || insufficient) return;
    const accountId = accountIdFromToken(getAuthToken());
    if (!accountId) {
      setMessage("Sessão inválida. Entre novamente na DESAFIOX.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const result = await submitTicketOrder(
      guardRef.current,
      {
        signedIn,
        accountId,
        challengeId: challenge._id,
        amount: count,
        unitValue: unit,
        paymentMethod: method,
        acceptedAt: new Date().toISOString(),
      },
      (path, body) => apiRequest(path, { method: "POST", auth: true, body }),
    );
    setSubmitting(false);
    if (!result.ok) {
      if (result.reason === "busy") return;
      setMessage(result.message ?? "Não foi possível concluir a compra.");
      return;
    }
    if (method === "checkout") {
      if (result.orderId) {
        try {
          sessionStorage.setItem(PENDING_ORDER_KEY, result.orderId);
        } catch {
          /* o retorno ainda pode vir na query */
        }
      }
      if (result.checkoutUrl) window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
      setMessage("Abrimos o checkout. Quando o pagamento voltar, esta página confirma o pedido.");
      return;
    }
    setPhase("success");
    setMessage("Pagamento confirmado com o saldo da carteira.");
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-foreground backdrop:bg-black/80 max-md:fixed max-md:inset-0 max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:max-w-none max-md:rounded-none"
        onClose={() => {
          if (open) onOpenChange(false);
        }}
        onCancel={(event) => {
          event.preventDefault();
          onOpenChange(false);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-black tracking-tight">
            {accessOpen ? "Entrar ou criar conta" : "Comprar tickets"}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => onOpenChange(false)}
          >
            <CloseIcon />
          </button>
        </div>

        {accessOpen ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Escolha como continuar na DESAFIOX.</p>
            <AccountAccessChoices />
            <button type="button" className="mt-6 text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={() => setAccessOpen(false)}>
              Voltar
            </button>
          </>
        ) : phase === "processing" || phase === "success" ? (
          <p className="mt-4 text-sm text-foreground">{message}</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-md border border-border px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Desafio</p>
              <p className="font-bold">{challenge?.name}</p>
              <p className="text-sm text-muted-foreground">{challenge?.championship.name}</p>
              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Valor de cada ticket</p>
              <p className="text-lg font-black text-highlight">{unit == null ? "Sem faixa vigente" : formatMoneyBR(unit)}</p>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button type="button" className="h-11 w-11 rounded-md border border-border text-lg" onClick={() => setCount((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade">
                −
              </button>
              <span className="min-w-12 text-center text-3xl font-black tabular-nums">{count}</span>
              <button type="button" className="h-11 w-11 rounded-md border border-border text-lg" onClick={() => setCount((value) => Math.min(99, value + 1))} aria-label="Aumentar quantidade">
                +
              </button>
            </div>

            <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-xl font-black text-highlight">{formatMoneyBR(total)}</span>
            </div>

            <div className="space-y-2" role="radiogroup" aria-label="Forma de pagamento">
              <PaymentOption
                title="Checkout seguro"
                detail="Pix sem taxas. Cartão pode ter taxas."
                selected={method === "checkout"}
                onSelect={() => setMethod("checkout")}
              />
              <PaymentOption
                title="Saldo da carteira"
                detail={walletBalance == null ? "Saldo da sessão" : presentMoney(formatMoneyBR(walletBalance), valuesVisible)}
                selected={method === "credits"}
                onSelect={() => setMethod("credits")}
              />
              <Link href="/carteira" className="inline-flex text-xs font-semibold text-accent hover:underline">
                Ir para a carteira
              </Link>
            </div>

            {insufficient ? (
              <p className="text-sm text-destructive">Saldo insuficiente para esta quantidade. O checkout continua disponível.</p>
            ) : null}

            <label className="flex items-start gap-3 rounded-md border border-border px-3 py-3 text-sm">
              <input type="checkbox" className="mt-1" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
              <span>
                Li e aceito as{" "}
                <button
                  type="button"
                  className="font-semibold text-accent underline"
                  onClick={(event) => {
                    event.preventDefault();
                    setRulesOpen(true);
                  }}
                >
                  regras desse desafio
                </button>
                .
              </span>
            </label>

            {message ? <p className="text-sm text-foreground">{message}</p> : null}

            <div className="flex justify-end">
              {signedIn ? (
                <Button type="button" disabled={!accepted || unit == null || insufficient || submitting} aria-busy={submitting} onClick={() => void confirm()}>
                  {submitting ? "Enviando…" : "Confirmar compra"}
                </Button>
              ) : (
                <Button type="button" onClick={() => setAccessOpen(true)}>
                  Logar/Criar conta
                </Button>
              )}
            </div>
          </div>
        )}
      </dialog>
      {rulesOpen && challenge ? (
        <RulesDialog title={`Regras · ${challenge.name}`} html={challenge.descriptionLong} onClose={() => setRulesOpen(false)} />
      ) : null}
    </>
  );
}

function PaymentOption({
  title,
  detail,
  selected,
  onSelect,
}: {
  title: string;
  detail: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "w-full rounded-md px-3 py-3 text-left",
        selected ? "border-2 border-accent bg-accent/10" : "border border-border",
      )}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
    </button>
  );
}

export function readPendingTicketOrder() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(PENDING_ORDER_KEY);
  } catch {
    return null;
  }
}

export function clearPendingTicketOrder() {
  try {
    sessionStorage.removeItem(PENDING_ORDER_KEY);
  } catch {
    /* storage indisponível */
  }
}

function currentUnitPrice(pricing: IPublicChallengeCard["pricing"]) {
  const now = new Date();
  return pricing.find((window) => isCurrentPricingWindow(window, now))?.value ?? null;
}
