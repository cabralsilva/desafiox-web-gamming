"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AuthLinks } from "@/components/auth-links";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { publicChallengePath } from "@/lib/queries/publicChallenges";

const DIALOG_ID = "exemplo";

export function ExampleConfirmation() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const open = params.get("dialog") === DIALOG_ID;
  const { signedIn } = useSession();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function openDialog() {
    const next = new URLSearchParams(params.toString());
    next.set("dialog", DIALOG_ID);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function closeDialog() {
    const next = new URLSearchParams(params.toString());
    next.delete("dialog");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function confirm() {
    if (!signedIn || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await apiRequest(publicChallengePath({ page: 1, limit: 1 }), { auth: true });
      if (response.status === 401) return;
      if (!response.ok) {
        setMessage("Não foi possível confirmar.");
        return;
      }
      setMessage("Confirmação registrada.");
    } catch {
      setMessage("Não foi possível confirmar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={openDialog}>
        Abrir confirmação
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="example-confirmation-title"
        className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-foreground backdrop:bg-black/80"
        onClose={() => {
          if (open) closeDialog();
        }}
      >
        <h2 id="example-confirmation-title" className="text-xl font-black tracking-tight">
          Confirmar ação
        </h2>
        <p id="example-confirmation-hint" className="mt-2 text-sm text-muted-foreground">
          A confirmação exige uma sessão na DESAFIOX.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            disabled={!signedIn || pending}
            aria-describedby="example-confirmation-hint"
            onClick={() => void confirm()}
          >
            {pending ? "Confirmando…" : "Confirmar"}
          </Button>
          {signedIn ? null : <AuthLinks />}
        </div>
        {message ? (
          <p role="status" className="mt-4 text-sm text-foreground">
            {message}
          </p>
        ) : null}
        <button type="button" className="mt-6 text-sm font-semibold text-muted-foreground hover:text-foreground" onClick={closeDialog}>
          Fechar
        </button>
      </dialog>
    </div>
  );
}
