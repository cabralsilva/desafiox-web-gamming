"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOpenAuthDialog } from "@/components/auth-dialog-context";
import { CloseIcon } from "@/components/icons";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { isAuthRoute } from "@/lib/auth";

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
  const openAuth = useOpenAuthDialog();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const current = new URL(window.location.href);
      if (current.searchParams.get("acesso") === "1" || isAuthRoute(current.pathname)) return;
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
          {title}
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          className="-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground bg-muted hover:bg-primary/10 hover:outline-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={closeDialog}
        >
          <CloseIcon />
        </button>
      </div>
      {signedIn ? children : <p className="mt-2 text-sm text-muted-foreground">{GUEST_DESCRIPTION}</p>}
      <div className="mt-6 flex justify-end">
        {signedIn ? (
          confirm
        ) : (
          <Button type="button" onClick={openAuth}>
            Logar/Criar conta
          </Button>
        )}
      </div>
    </dialog>
  );
}
