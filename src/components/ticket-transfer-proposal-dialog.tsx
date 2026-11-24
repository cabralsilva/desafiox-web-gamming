"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AuthLinks } from "@/components/auth-links";
import { CloseIcon } from "@/components/icons";
import { RulesDialog } from "@/components/rules-dialog";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { accountIdFromToken } from "@/lib/jwt";
import { formatMoneyBR } from "@/lib/money";
import { presentMoney } from "@/lib/queries/sessionBalance";
import { getAuthToken } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  createTicketTransferProposal,
  DIRECT_SALE_CONFIRM_LABEL,
  loadTicketTransferPreview,
  OWNER_DECIDES_SALE,
  PROPOSAL_CONFIRM_LABEL,
  readPhoneVerified,
  transferProposalBlockFromMessage,
  type TicketTransferPreview,
  type TransferPaymentChoice,
  type TransferProposalBlock,
} from "@/lib/ticket-transfer";

const PREVIEW_TEAMS: TicketTransferPreview["availableTeams"] = [
  { id: "palmeiras", name: "Palmeiras", shortName: "PAL", position: 1 },
  { id: "flamengo", name: "Flamengo", shortName: "FLA", position: 3 },
  { id: "gremio", name: "Grêmio", shortName: "GRE", position: 6 },
  { id: "internacional", name: "Internacional", shortName: "INT", position: 8 },
];

export function TicketTransferProposalDialog({
  signedIn,
  ticketId,
  ticketCode,
  ownerNickName,
  points,
  marketValue,
  saleAuthorized: saleAuthorizedProp,
  rulesHtml,
  onOpenChange,
  onRecorded,
}: {
  signedIn: boolean;
  ticketId: string;
  ticketCode: string;
  ownerNickName: string;
  points: number;
  marketValue: number | null;
  saleAuthorized: boolean;
  rulesHtml: string;
  onOpenChange: (open: boolean) => void;
  onRecorded: (outcome: TransferProposalBlock, checkoutUrl: string) => void;
}) {
  const { balance, balanceStatus, valuesVisible } = useSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submittingRef = useRef(false);
  const titleId = useId();
  const checkboxId = useId();
  const [preview, setPreview] = useState<TicketTransferPreview | null>(null);
  const [loading, setLoading] = useState(signedIn);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<TransferPaymentChoice>("checkout");
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);

  const rules = rulesHtml.trim();
  const saleAuthorized = preview?.saleAuthorized ?? saleAuthorizedProp;
  const price = preview?.marketValue ?? marketValue;
  const insufficient = saleAuthorized && method === "credits" && balanceStatus === "ready" && balance != null && price != null && price > balance;
  const whatsAppPending = phoneVerified === false;
  const canConfirm = Boolean(
    preview && preview.marketValue != null && rules && acceptedRules && !loadError && !insufficient && !whatsAppPending,
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  useEffect(() => {
    if (!signedIn || !ticketId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    setPreview(null);
    void loadTicketTransferPreview(ticketId, {
      id: ticketId,
      code: ticketCode,
      points,
      marketValue,
      ownerNickName,
      saleAuthorized: saleAuthorizedProp,
      availableTeams: PREVIEW_TEAMS,
    })
      .then((next) => {
        if (!cancelled) setPreview(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "Falha ao carregar a proposta.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, ticketId, ticketCode, ownerNickName, points, marketValue, saleAuthorizedProp]);

  useEffect(() => {
    if (!signedIn) {
      setPhoneVerified(null);
      return;
    }
    const accountId = accountIdFromToken(getAuthToken());
    if (!accountId || !process.env.NEXT_PUBLIC_API_URL) return;
    let cancelled = false;
    void apiRequest(`/account/${encodeURIComponent(accountId)}?select=phoneVerified`, { auth: true })
      .then(async (response) => {
        if (!response.ok || cancelled) return;
        const value = readPhoneVerified(await response.json());
        if (!cancelled && value != null) setPhoneVerified(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  function close() {
    if (submittingRef.current) return;
    onOpenChange(false);
  }

  async function confirm() {
    if (!ticketId || !canConfirm || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await createTicketTransferProposal(ticketId, saleAuthorized ? method : undefined);
      if (saleAuthorized) {
        if (method === "credits") {
          if (!result.offline && result.checkoutUrl.trim()) {
            setSubmitError("O saldo não concluiu este pagamento. Use o checkout.");
            return;
          }
          onRecorded("processing", "");
          onOpenChange(false);
          return;
        }
        const checkoutUrl = result.checkoutUrl.trim();
        if (!checkoutUrl && !result.offline) {
          setSubmitError("Não foi possível iniciar o pagamento. Tente novamente.");
          onRecorded("processing", "");
          return;
        }
        onRecorded("processing", checkoutUrl);
        onOpenChange(false);
        if (checkoutUrl) window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        return;
      }
      onRecorded("requested", "");
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : saleAuthorized
          ? "Falha ao confirmar a compra."
          : "Falha ao enviar a proposta.";
      const block = transferProposalBlockFromMessage(message);
      if (block) onRecorded(block, "");
      setSubmitError(message);
      if (block) onOpenChange(false);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const code = preview?.code || ticketCode || "—";
  const owner = preview?.ownerNickName || "—";
  const score = preview ? String(preview.points) : "—";
  const marketLabel = preview?.marketValue == null ? "Indisponível" : formatMoneyBR(preview.marketValue);

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="flex max-h-[min(90dvh,720px)] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card p-0 text-foreground backdrop:bg-black/80"
        onClose={() => {
          if (submittingRef.current) {
            dialogRef.current?.showModal();
            return;
          }
          onOpenChange(false);
        }}
      >
        {signedIn ? (
          <>
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0 space-y-2">
                <h2 id={titleId} className="text-lg font-bold">Comprar ticket</h2>
                {saleAuthorized ? (
                  <p className="sr-only">Ao confirmar, você será direcionado ao pagamento do ticket.</p>
                ) : (
                  <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">{OWNER_DECIDES_SALE}</p>
                )}
              </div>
              <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Fechar" onClick={close}>
                <CloseIcon />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
                  <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  {saleAuthorized ? "Carregando compra…" : "Carregando proposta…"}
                </div>
              ) : loadError ? (
                <p className="rounded-lg border border-dashed border-border bg-secondary/30 px-4 py-8 text-center text-sm text-muted-foreground">{loadError}</p>
              ) : (
                <div className="space-y-4">
                  {rules ? (
                    <div className="flex gap-3 rounded-md border border-border bg-secondary/40 px-3 py-3">
                      <input
                        id={checkboxId}
                        type="checkbox"
                        checked={acceptedRules}
                        disabled={submitting}
                        onChange={(event) => setAcceptedRules(event.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                      />
                      <p className="text-sm leading-snug text-foreground">
                        <label htmlFor={checkboxId} className="cursor-pointer">Li, entendi e aceito as </label>
                        <button type="button" className="font-semibold text-accent underline underline-offset-2 hover:text-accent/90" onClick={() => setShowRules(true)}>
                          regras desse desafio
                        </button>
                        <label htmlFor={checkboxId} className="cursor-pointer">.</label>
                      </p>
                    </div>
                  ) : (
                    <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">Este desafio não tem regras para aceite.</p>
                  )}
                  <dl className="space-y-2 text-sm">
                    <Row label="Código" value={code} mono />
                    <Row label="Valor de mercado" value={marketLabel} strong />
                    <Row label="Proprietário" value={owner} />
                    <Row label="Pontuação" value={score} />
                  </dl>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Times disponíveis</p>
                    {preview && preview.availableTeams.length > 0 ? (
                      <ul className="space-y-1">
                        {preview.availableTeams.map((team) => (
                          <li key={team.id} className="flex items-center justify-between gap-2 rounded-md bg-secondary/50 px-3 py-2 text-sm">
                            <span className="min-w-0 truncate font-medium text-foreground">
                              {team.name}
                              {team.shortName && team.shortName !== team.name ? (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">{team.shortName}</span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{team.position}º</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">Nenhum time disponível.</p>
                    )}
                  </div>
                  {saleAuthorized ? (
                    <div className="space-y-2" role="radiogroup" aria-label="Forma de pagamento">
                      <PaymentOption
                        title="Checkout seguro"
                        detail="Pix sem taxas. Cartão pode ter taxas."
                        selected={method === "checkout"}
                        onSelect={() => setMethod("checkout")}
                      />
                      <PaymentOption
                        title="Saldo da carteira"
                        detail={balanceStatus === "ready" && balance != null ? presentMoney(formatMoneyBR(balance), valuesVisible) : "Saldo da sessão"}
                        selected={method === "credits"}
                        onSelect={() => setMethod("credits")}
                      />
                      <Link href="/carteira" className="inline-flex text-xs font-semibold text-accent hover:underline">
                        Ir para a carteira
                      </Link>
                      {insufficient ? (
                        <p className="text-sm text-destructive">Saldo insuficiente. O checkout continua disponível.</p>
                      ) : null}
                    </div>
                  ) : null}
                  {whatsAppPending ? (
                    <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
                      Confirme o WhatsApp para comprar ou propor na DESAFIOX.
                    </p>
                  ) : null}
                  {submitError ? <p className="text-sm text-primary">{submitError}</p> : null}
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border bg-secondary/30 px-5 py-4">
              <Button type="button" variant="outline" className="flex-1" onClick={close}>Cancelar</Button>
              {whatsAppPending ? (
                <Button asChild variant="success" className="flex-1">
                  <Link href="/conta/whatsapp">Confirmar WhatsApp</Link>
                </Button>
              ) : (
                <Button type="button" variant="success" className="flex-1" disabled={!canConfirm || submitting} onClick={() => void confirm()}>
                  {submitting ? "Enviando…" : saleAuthorized ? DIRECT_SALE_CONFIRM_LABEL : PROPOSAL_CONFIRM_LABEL}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={titleId} className="text-lg font-bold">Comprar ticket</h2>
                <p className="mt-1 text-sm text-muted-foreground">Entre na DESAFIOX para comprar ou fazer uma proposta.</p>
              </div>
              <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Fechar" onClick={close}>
                <CloseIcon />
              </button>
            </div>
            <AuthLinks className="mt-6" />
          </div>
        )}
      </dialog>
      {showRules ? <RulesDialog title="Regras do desafio" html={rules} onClose={() => setShowRules(false)} /> : null}
    </div>
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
      className={cn("w-full rounded-md px-3 py-3 text-left", selected ? "border-2 border-accent bg-accent/10" : "border border-border")}
    >
      <span className="block text-sm font-bold">{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{detail}</span>
    </button>
  );
}

function Row({ label, value, strong = false, mono = false }: { label: string; value: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-black tabular-nums text-highlight" : mono ? "max-w-[60%] truncate font-mono font-semibold" : "max-w-[60%] truncate font-medium"}>{value}</dd>
    </div>
  );
}
