"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { rememberCurrentIntent } from "@/lib/returnIntent";
import { cn } from "@/lib/utils";

export function AuthLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  const signupCurrent = pathname === "/cadastrar" || pathname.startsWith("/cadastrar/");
  const entrarCurrent = pathname === "/entrar" || pathname.startsWith("/entrar/");

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <Button asChild size="sm" variant="default" aria-current={signupCurrent ? "page" : undefined}>
        <Link
          href="/cadastrar"
          onClick={() => rememberCurrentIntent()}
          className={cn(signupCurrent && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
        >
          Signup
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline" aria-current={entrarCurrent ? "page" : undefined}>
        <Link
          href="/entrar"
          onClick={() => rememberCurrentIntent()}
          className={cn(entrarCurrent && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
        >
          Entrar
        </Link>
      </Button>
    </div>
  );
}

export function AccountAccessChoices() {
  return (
    <div className="mt-6 flex flex-col gap-2">
      <Button asChild>
        <Link href="/cadastrar" onClick={() => rememberCurrentIntent()}>
          Criar conta
        </Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/entrar" onClick={() => rememberCurrentIntent()}>
          Entrar
        </Link>
      </Button>
    </div>
  );
}
