"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLinks } from "@/components/auth-links";
import { WalletDialogFrame } from "@/components/wallet-dialog";
import { Button } from "@/components/ui/button";
import {
  COMPANY_PIX_HOLDER,
  COMPANY_PIX_KEY,
  canConfirmWallet,
  createManualDeposit,
  formatCurrencyInput,
  isReceiptFile,
  parseCurrencyInput,
  type WalletFileInput,
  type WalletMovement,
} from "@/lib/wallet";

export function WalletDepositDialog({
  signedIn,
  phoneVerified,
  accountReady,
  onClose,
  onCreated,
}: {
  signedIn: boolean;
  phoneVerified: boolean | null;
  accountReady: boolean;
  onClose: () => void;
  onCreated: (movement: WalletMovement) => void;
}) {
  const [amount, setAmount] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const whatsAppPending = signedIn && phoneVerified === false;
  const canConfirm = canConfirmWallet(signedIn, phoneVerified) && accountReady;

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(COMPANY_PIX_KEY);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar a chave Pix.");
    }
  }

  function chooseFiles(list: FileList | null) {
    const selected = Array.from(list ?? []);
    const allowed = selected.filter((file) => isReceiptFile(file));
    setFiles(allowed);
    if (allowed.length !== selected.length) {
      setError("Use imagem ou PDF de até 4 MB.");
      return;
    }
    setError("");
  }

  async function confirm() {
    const value = parseCurrencyInput(amount);
    if (value <= 0) {
      setError("Informe um valor de depósito válido.");
      return;
    }
    if (files.length === 0) {
      setError("Anexe ao menos um comprovante (imagem ou PDF).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = await readReceipts(files);
      onCreated(await createManualDeposit(value, payload));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar o depósito.");
      setSubmitting(false);
    }
  }

  return (
    <WalletDialogFrame
      title="Depositar"
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
        ) : canConfirm ? (
          <>
            <Button type="button" variant="outline" className="flex-1" disabled={submitting} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="button" variant="accent" className="flex-1" disabled={submitting} onClick={() => void confirm()}>
              {submitting ? "Enviando…" : "Enviar comprovante"}
            </Button>
          </>
        ) : (
          <AuthLinks />
        )
      }
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <p>
            Envie o Pix e anexe o comprovante. A operação da DESAFIOX confere o pagamento e o crédito entra na carteira em até 1 dia útil.
            O comprovante é obrigatório e deve ter como beneficiário <span className="font-semibold text-foreground">{COMPANY_PIX_HOLDER}</span>, CNPJ {COMPANY_PIX_KEY}.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chave Pix</p>
          <div className="flex gap-2">
            <p className="min-w-0 flex-1 truncate rounded-md bg-secondary px-3 py-2 font-mono text-sm">{COMPANY_PIX_KEY}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void copyKey()}>
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
        </div>
        {signedIn ? (
          <>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor do depósito</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
                placeholder="R$ 0,00"
                className="h-12 w-full rounded-md border border-border bg-secondary px-3 text-lg font-bold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprovante</span>
              <span className="block cursor-pointer rounded-lg border-2 border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground hover:border-accent/50">
                Clique para selecionar imagem ou PDF
                <input
                  type="file"
                  className="sr-only"
                  accept="image/*,.pdf,application/pdf"
                  multiple
                  onChange={(event) => chooseFiles(event.target.files)}
                />
              </span>
            </label>
            {files.length > 0 ? (
              <p className="rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">
                {files.length} arquivo(s): {files.map((file) => file.name).join(", ")}
              </p>
            ) : null}
          </>
        ) : null}
        {whatsAppPending ? (
          <p className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2">Confirme o WhatsApp para depositar na DESAFIOX.</p>
        ) : null}
        {error ? <p className="text-sm text-primary">{error}</p> : null}
      </div>
    </WalletDialogFrame>
  );
}

function readReceipts(files: File[]) {
  return Promise.all(files.map((file) => readReceipt(file)));
}

function readReceipt(file: File) {
  return new Promise<WalletFileInput>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.includes(",") ? (dataUrl.split(",")[1] ?? "") : dataUrl;
      if (!base64) {
        reject(new Error("Falha ao ler o comprovante."));
        return;
      }
      resolve({
        description: file.name,
        contentType: file.type || "application/octet-stream",
        fileBase64: base64,
      });
    };
    reader.onerror = () => reject(new Error("Falha ao ler o comprovante."));
    reader.readAsDataURL(file);
  });
}
