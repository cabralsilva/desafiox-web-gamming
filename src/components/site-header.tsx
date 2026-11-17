"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";

const mainNav = [
  {
    href: "/",
    label: "Desafios",
    isCurrent: (pathname: string) => pathname === "/" || pathname.startsWith("/desafios/"),
  },
  {
    href: "/mercado",
    label: "Mercado",
    isCurrent: (pathname: string) => pathname === "/mercado" || pathname.startsWith("/mercado/"),
  },
  {
    href: "/carteira",
    label: "Carteira",
    isCurrent: (pathname: string) => pathname === "/carteira" || pathname.startsWith("/carteira/"),
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const signupCurrent = pathname === "/cadastrar" || pathname.startsWith("/cadastrar/");
  const entrarCurrent = pathname === "/entrar" || pathname.startsWith("/entrar/");

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 md:h-16 md:flex-row md:items-center md:gap-6">
        <div className="flex h-14 items-center justify-between gap-3 md:contents">
          <Wordmark />
          <div className="flex shrink-0 items-center gap-2 md:order-3">
            <Button asChild size="sm" variant="default" aria-current={signupCurrent ? "page" : undefined}>
              <Link
                href="/cadastrar"
                className={cn(signupCurrent && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
              >
                Signup
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" aria-current={entrarCurrent ? "page" : undefined}>
              <Link
                href="/entrar"
                className={cn(entrarCurrent && "ring-2 ring-ring ring-offset-2 ring-offset-background")}
              >
                Entrar
              </Link>
            </Button>
          </div>
        </div>
        <nav aria-label="Principal" className="min-w-0 overflow-x-auto md:order-2 md:flex-1">
          <ul className="flex w-max items-center gap-1">
            {mainNav.map((item) => {
              const current = item.isCurrent(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "inline-flex h-10 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold",
                      current
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
