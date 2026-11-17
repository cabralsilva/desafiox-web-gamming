"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccountAccessChoices } from "@/components/auth-links";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";

const GUEST_DESCRIPTION = "Entre na DESAFIOX para confirmar esta ação.";

export function useGatedDialog(dialogId: string) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get("dialog") === dialogId;

  function openDialog() {
    const next = new URLSearchParams(params.toString());
    next.set("dialog", dialogId);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function closeDialog() {
    const next = new URLSearchParams(params.toString());
    if (next.get("dialog") !== dialogId) return;
    next.delete("dialog");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return { open, openDialog, closeDialog };
}

export function GatedDialog({
  dialogId,
  title,
  confirm,
  children,
}: {
  dialogId: string;
  title: string;
  confirm?: ReactNode;
  children: ReactNode;
}) {
  const { open, closeDialog } = useGatedDialog(dialogId);
  const { signedIn } = useSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [accessOpen, setAccessOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || signedIn) setAccessOpen(false);
  }, [open, signedIn]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeDialog();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeDialog]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-foreground backdrop:bg-black/80"
      onClose={() => {
        if (open) closeDialog();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-xl font-black tracking-tight">
          {accessOpen ? "Entrar ou criar conta" : title}
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground bg-muted hover:bg-primary/10 hover:outline-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={closeDialog}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
            <path
              d="M3.2 3.2 12.8 12.8M12.8 3.2 3.2 12.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {accessOpen ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">Escolha como continuar na DESAFIOX.</p>
          <AccountAccessChoices />
          <button
            type="button"
            className="mt-6 text-sm font-semibold text-muted-foreground hover:text-foreground"
            onClick={() => setAccessOpen(false)}
          >
            Voltar
          </button>
        </>
      ) : signedIn ? (
        children
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{GUEST_DESCRIPTION}</p>
        </>
      )}
      {accessOpen ? null : (
        <div className="mt-6 flex justify-end">
          {signedIn ? (
            confirm
          ) : (
            <Button type="button" onClick={() => setAccessOpen(true)}>
              Logar/Criar conta
            </Button>
          )}
        </div>
      )}
    </dialog>
  );
}
