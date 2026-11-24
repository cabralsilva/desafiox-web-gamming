"use client";

import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { useSession } from "@/components/session-provider";
import { sessionBalanceText } from "@/lib/queries/sessionBalance";
import { cn } from "@/lib/utils";

/** Valor do saldo global. Topo e carteira compartilham este texto e esta fonte. */
export function SessionBalanceValue({ className }: { className?: string }) {
  const { signedIn, balance, balanceStatus, valuesVisible } = useSession();

  return (
    <span className={cn("text-xl font-black tabular-nums text-highlight", className)}>
      {sessionBalanceText(signedIn, balanceStatus, balance, valuesVisible)}
    </span>
  );
}

export function WalletValuesToggle({ className }: { className?: string }) {
  const { valuesVisible, toggleValuesVisible } = useSession();

  return (
    <button
      type="button"
      className={cn("flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-secondary", className)}
      aria-label={valuesVisible ? "Ocultar valores da carteira" : "Mostrar valores da carteira"}
      aria-pressed={valuesVisible}
      onClick={toggleValuesVisible}
    >
      {valuesVisible ? <EyeIcon /> : <EyeOffIcon />}
    </button>
  );
}
