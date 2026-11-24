"use client";

import { useOpenAuthDialog } from "@/components/auth-dialog-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthLinks({ className }: { className?: string }) {
  const openAuth = useOpenAuthDialog();

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <Button type="button" size="sm" onClick={openAuth}>
        Signup
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={openAuth}>
        Entrar
      </Button>
    </div>
  );
}

export function AccountAccessChoices() {
  const openAuth = useOpenAuthDialog();

  return (
    <div className="mt-6 flex flex-col gap-2">
      <Button type="button" onClick={openAuth}>
        Criar conta
      </Button>
      <Button type="button" variant="outline" onClick={openAuth}>
        Entrar
      </Button>
    </div>
  );
}
