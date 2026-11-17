"use client";

import { useState } from "react";
import { GatedDialog, useGatedDialog } from "@/components/gated-dialog";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { publicChallengePath } from "@/lib/queries/publicChallenges";

const DIALOG_ID = "exemplo";

export function ExampleConfirmation() {
  const { openDialog } = useGatedDialog(DIALOG_ID);
  const { signedIn } = useSession();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    <>
      <Button type="button" onClick={openDialog}>
        Abrir confirmação
      </Button>
      <GatedDialog
        dialogId={DIALOG_ID}
        title="Confirmar ação"
        confirm={
          <Button type="button" disabled={pending} onClick={() => void confirm()}>
            {pending ? "Confirmando…" : "Confirmar"}
          </Button>
        }
      >
        <p className="mt-2 text-sm text-muted-foreground">Confirme para seguir com esta ação.</p>
        {message ? (
          <p role="status" className="mt-4 text-sm text-foreground">
            {message}
          </p>
        ) : null}
      </GatedDialog>
    </>
  );
}
