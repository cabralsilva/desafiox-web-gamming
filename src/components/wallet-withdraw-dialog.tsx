"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLinks } from "@/components/auth-links";
import { useSession } from "@/components/session-provider";
import { WalletDialogFrame } from "@/components/wallet-dialog";
import { Button } from "@/components/ui/button";
import { accountIdFromToken } from "@/lib/jwt";
import { getAuthToken } from "@/lib/session";
import { formatMoneyBR } from "@/lib/money";
import { presentMoney } from "@/lib/queries/sessionBalance";
import {
  canConfirmWallet,
  createWithdraw,
  formatCurrencyInput,
  parseCurrencyInput,
  savePixKey,
  type WalletMovement,
} from "@/lib/wallet";

export function WalletWithdrawDialog({
  signedIn,
  phoneVerified,
  balance,
  pixKey,
  accountReady,
  onClose,
  onPixKeySaved,
  onCreated,
}: {
  signedIn: boolean;
  phoneVerified: boolean | null;
  balance: number | null;
  pixKey: string | null;
  accountReady: boolean;
  onClose: () => void;
  onPixKeySaved: (pixKey: string) => void;
  onCreated: (movement: WalletMovement) => void;
}) {
  const { valuesVisible } = useSession();
  const [amount, setAmount] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const whatsAppPending = signedIn && phoneVerified === false;
  const canConfirm = canConfirmWallet(signedIn, phoneVerified) && accountReady;
  const value = parseCurrencyInput(amount);
  const overBalance = balance != null && value > balance;

  async function confirm() {
    if (!pixKey) return;
    if (value <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    if (balance == null) {
      setError("O saldo ainda não está disponível.");
      return;
    }
    if (value > balance) return;
    setSubmitting(true);
    setError("");
    try {
      onCreated(await createWithdraw(value, pixKey));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível solicitar o saque.");
      setSubmitting(false);
    }
  }

  async function saveKey() {
    const accountId = accountIdFromToken(getAuthToken());
    if (!accountId) {
      setError("Entre novamente para cadastrar a chave Pix.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const saved = await savePixKey(accountId, draftKey);
      onPixKeySaved(saved);
      setRegistering(false);
      setDraftKey("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar a chave Pix.");
    } finally {
      setSubmitting(false);
    }
  }

  const title = registering ? "Cadastrar chave Pix" : "Solicitar saque";

  return (
    <WalletDialogFrame
      title={title}
      onClose={onClose}
      footer={
        whatsAppPending ? (
          <Button asChild variant="accent" className="w-full">
            <Link href="/conta/whatsapp">Confirmar WhatsApp</Link>
          </Button>
        ) : signedIn && !accountReady ? (
          <Button type="button" variant="accent" className="w-full" disabled>
            Carregando…
          </Button>
        ) : !canConfirm ? (
          <AuthLinks />
        ) : registering ? (
          <>
            <Button type="button" variant="outline" className="flex-1" disabled={submitting} onClick={() => setRegistering(false)}>
              Voltar
            </Button>
            <Button type="button" variant="accent" className="flex-1" disabled={submitting || !draftKey.trim()} onClick={() => void saveKey()}>
              {submitting ? "Salvando…" : "Salvar chave"}
            </Button>
          </>
        ) : pixKey ? (
          <>
            <Button type="button" variant="outline" className="flex-1" disabled={submitting} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" variant="accent" className="flex-1" disabled={submitting || !accountReady} onClick={() => void confirm()}>
              {submitting ? "Enviando…" : "Solicitar saque"}
            </Button>
          </>
        ) : null
      }
    >
      {registering ? (
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">A chave Pix é o destino do saque. Ela fica salva na conta.</p>
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chave Pix</span>
            <input
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
              autoComplete="off"
              className="h-11 w-full rounded-md border border-border bg-secondary px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {error ? <p className="text-sm text-primary">{error}</p> : null}
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            <ul className="list-disc space-y-1 pl-4">
              <li>O valor cai na conta da chave Pix em até 1 dia útil.</li>
              <li>O saque fica pendente até a operação da DESAFIOX concluir.</li>
              <li>O valor não pode passar do saldo disponível{balance != null ? ` (${presentMoney(formatMoneyBR(balance), valuesVisible)})` : ""}.</li>
            </ul>
          </div>
          {signedIn && !accountReady ? <p className="text-muted-foreground">Carregando chave Pix…</p> : null}
          {signedIn && accountReady && !pixKey ? (
            <div className="space-y-3">
              <p>Esta conta não tem chave Pix. Cadastre a chave para solicitar o saque.</p>
              <Button type="button" variant="accent" onClick={() => setRegistering(true)}>
                Cadastrar chave Pix
              </Button>
            </div>
          ) : null}
          {signedIn && pixKey ? (
            <>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chave Pix para recebimento</span>
                <input readOnly value={pixKey} className="h-11 w-full rounded-md border border-border bg-secondary px-3 text-foreground" />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor do saque</span>
                <input
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
                  placeholder="R$ 0,00"
                  className="h-12 w-full rounded-md border border-border bg-secondary px-3 text-lg font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
              {overBalance ? <p className="text-sm text-primary">O valor passa do saldo disponível.</p> : null}
            </>
          ) : null}
          {whatsAppPending ? (
            <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2">Confirme o WhatsApp para sacar na DESAFIOX.</p>
          ) : null}
          {error && !registering ? <p className="text-sm text-primary">{error}</p> : null}
        </div>
      )}
    </WalletDialogFrame>
  );
}
