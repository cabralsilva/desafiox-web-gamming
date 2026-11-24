"use client";

import { useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, ClockIcon } from "@/components/icons";
import { useSession } from "@/components/session-provider";
import { WalletDepositDialog } from "@/components/wallet-deposit-dialog";
import { WalletWithdrawDialog } from "@/components/wallet-withdraw-dialog";
import { Button } from "@/components/ui/button";
import { accountIdFromToken } from "@/lib/jwt";
import { formatMoneyBR } from "@/lib/money";
import { getAuthToken } from "@/lib/session";
import { cn } from "@/lib/utils";
import {
  formatMovementDate,
  latestCompletedBalance,
  loadWalletAccount,
  loadWalletStatement,
  movementStatusLabel,
  movementTypeView,
  type WalletMovement,
  type WalletMovementStatus,
} from "@/lib/wallet";
import { walletMockAccount, walletMovementCatalog } from "@/mocks/wallet";

type DialogName = "deposit" | "withdraw";

export function WalletHome() {
  const { signedIn, balance, balanceStatus, reloadBalance } = useSession();
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [statementStatus, setStatementStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [statementError, setStatementError] = useState("");
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState<boolean | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!signedIn) {
      setMovements([]);
      setPixKey(null);
      setPhoneVerified(null);
      setAccountReady(false);
      setStatementStatus("idle");
      setStatementError("");
      setNotice("");
      return;
    }

    let cancelled = false;
    setStatementStatus("loading");
    setAccountReady(false);
    const accountId = accountIdFromToken(getAuthToken());

    if (!process.env.NEXT_PUBLIC_API_URL) {
      setMovements(walletMovementCatalog);
      setPixKey(walletMockAccount.pixKey);
      setPhoneVerified(walletMockAccount.phoneVerified);
      setAccountReady(true);
      setStatementStatus("ready");
      return;
    }

    void loadWalletStatement()
      .then((items) => {
        if (!cancelled) setMovements(items);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setMovements([]);
        setStatementError(reason instanceof Error ? reason.message : "Não foi possível carregar o extrato.");
        setStatementStatus("error");
      })
      .finally(() => {
        if (!cancelled) setStatementStatus((current) => (current === "error" ? current : "ready"));
      });

    if (accountId) {
      void loadWalletAccount(accountId)
        .then((account) => {
          if (cancelled) return;
          setPixKey(account.pixKey);
          setPhoneVerified(account.phoneVerified);
        })
        .catch(() => {
          if (!cancelled) setPixKey(null);
        })
        .finally(() => {
          if (!cancelled) setAccountReady(true);
        });
    } else if (!cancelled) {
      setAccountReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const statementBalance = latestCompletedBalance(movements);
  const shownBalance = !signedIn ? null : balanceStatus === "ready" && balance != null ? balance : statementBalance;
  const balanceLoading = signedIn && shownBalance == null && (balanceStatus === "loading" || statementStatus === "loading");

  function created(movement: WalletMovement, message: string) {
    setMovements((current) => [movement, ...current.filter((item) => item.id !== movement.id)]);
    setNotice(message);
    setDialog(null);
    reloadBalance();
  }

  return (
    <section className="mx-auto w-full max-w-lg space-y-6">
      <h1 className="sr-only">Carteira</h1>
      <article className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo disponível</p>
        <p className="text-3xl font-black tabular-nums text-highlight">
          {!signedIn ? "—" : balanceLoading ? "…" : shownBalance == null ? "Indisponível" : formatMoneyBR(shownBalance)}
        </p>
        {!signedIn ? <p className="text-sm text-muted-foreground">Entre para ver o saldo da sua carteira na DESAFIOX.</p> : null}
        <div className="flex gap-2">
          <Button type="button" variant="accent" size="sm" className="flex-1" onClick={() => setDialog("deposit")}>
            Depositar
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setDialog("withdraw")}>
            Sacar
          </Button>
        </div>
      </article>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider">Extrato</h2>
        <p className="text-xs text-muted-foreground">
          Os movimentos mostram tipo, valor, status e data. Só os concluídos alteram o saldo.
        </p>
        {notice ? (
          <p role="status" className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm">
            {notice}
          </p>
        ) : null}
        {!signedIn ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Entre para ver o seu extrato. Os movimentos de outras contas não aparecem aqui.
          </p>
        ) : statementStatus === "loading" ? (
          <p className="text-sm text-muted-foreground">Carregando extrato…</p>
        ) : statementStatus === "error" ? (
          <p className="text-sm text-primary">{statementError}</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>
        ) : (
          <ul>
            {movements.map((movement) => (
              <MovementRow key={movement.id} movement={movement} />
            ))}
          </ul>
        )}
      </div>

      {dialog === "deposit" ? (
        <WalletDepositDialog
          signedIn={signedIn}
          phoneVerified={phoneVerified}
          accountReady={accountReady}
          onClose={() => setDialog(null)}
          onCreated={(movement) => created(movement, "Solicitação de depósito registrada. A operação confere o comprovante.")}
        />
      ) : null}
      {dialog === "withdraw" ? (
        <WalletWithdrawDialog
          signedIn={signedIn}
          phoneVerified={phoneVerified}
          balance={shownBalance}
          pixKey={pixKey}
          accountReady={accountReady}
          onClose={() => setDialog(null)}
          onPixKeySaved={setPixKey}
          onCreated={(movement) => created(movement, "Solicitação de saque registrada. O valor sai em até 1 dia útil.")}
        />
      ) : null}
    </section>
  );
}

function MovementRow({ movement }: { movement: WalletMovement }) {
  const type = movementTypeView(movement.typeMovement);
  const cancelled = movement.status === "CANCELLED";
  const sign = type.incoming ? "+" : "−";

  return (
    <li className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", type.incoming ? "bg-success/20 text-success" : "bg-primary/20 text-primary")}>
        {type.incoming ? <ArrowDownIcon /> : <ArrowUpIcon />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{movement.description}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <time className="text-xs text-muted-foreground" dateTime={movement.createdAtDateTime ?? undefined}>
            {formatMovementDate(movement.createdAtDateTime)}
          </time>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{type.label}</span>
          <StatusBadge status={movement.status} />
        </div>
      </div>
      <span className={cn("shrink-0 text-sm font-bold tabular-nums", cancelled ? "text-muted-foreground line-through" : type.incoming ? "text-success" : "text-foreground")}>
        {sign}
        {formatMoneyBR(Math.abs(movement.valueMovemented))}
      </span>
    </li>
  );
}

function StatusBadge({ status }: { status: WalletMovementStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        status === "PENDING" && "bg-highlight/15 text-highlight",
        status === "CANCELLED" && "bg-secondary text-muted-foreground",
        status === "COMPLETED" && "bg-success/15 text-success",
      )}
    >
      {status === "PENDING" ? <ClockIcon className="h-3 w-3" /> : null}
      {movementStatusLabel(status)}
    </span>
  );
}
