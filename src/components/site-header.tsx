"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthLinks } from "@/components/auth-links";
import { HomeBanner } from "@/components/home-banner";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { orderedBannerSlides } from "@/lib/banner";
import { SessionBalanceValue, WalletValuesToggle } from "@/components/session-balance";
import { isSectionShell } from "@/lib/section-shell";
import { cn } from "@/lib/utils";
import { bannerSlides } from "@/mocks/banner";

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
  const slides = orderedBannerSlides(isSectionShell(pathname) ? bannerSlides : []);

  if (slides.length > 0) return <SectionShell slides={slides} />;

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 md:h-16 md:flex-row md:items-center md:gap-6">
        <div className="flex h-14 items-center justify-between gap-3 md:contents">
          <Wordmark />
          <HeaderSession className="md:order-3" />
        </div>
        <MainNav className="md:order-2 md:flex-1" />
      </div>
    </header>
  );
}

function SectionShell({ slides }: { slides: ReturnType<typeof orderedBannerSlides> }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 pt-[max(0.25rem,env(safe-area-inset-top,0px))] backdrop-blur-md">
      <div className="mx-auto flex h-11 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Wordmark />
        <HeaderSession />
      </div>
      <HomeBanner slides={slides} />
      <div className="mx-auto w-full max-w-6xl px-4">
        <MainNav />
      </div>
    </header>
  );
}

function HeaderSession({ className }: { className?: string }) {
  const pathname = usePathname();
  const { signedIn } = useSession();
  const accountCurrent = pathname === "/conta" || pathname.startsWith("/conta/");

  if (!signedIn) return <AuthLinks className={className} />;

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <Link href="/carteira" className="inline-flex items-baseline gap-1.5 whitespace-nowrap hover:underline" title="Ver carteira">
        <span className="text-xs font-medium text-foreground">Saldo</span>
        <SessionBalanceValue />
      </Link>
      <WalletValuesToggle />
      <Button asChild size="sm" variant="outline" aria-current={accountCurrent ? "page" : undefined}>
        <Link href="/conta" className={cn(accountCurrent && "ring-2 ring-ring ring-offset-2 ring-offset-background")}>
          Conta
        </Link>
      </Button>
    </div>
  );
}

function MainNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className={cn("min-w-0", className)}>
      <ul className="flex w-full items-stretch">
        {mainNav.map((item) => {
          const current = item.isCurrent(pathname);
          return (
            <li key={item.href} className="flex min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-11 w-full items-center justify-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold",
                  current ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
