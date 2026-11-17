"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthLinks } from "@/components/auth-links";
import { HomeBanner } from "@/components/home-banner";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { orderedBannerSlides } from "@/lib/banner";
import { formatMoneyBR } from "@/lib/money";
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
  const slides = orderedBannerSlides(pathname === "/" ? bannerSlides : []);
  const showBanner = slides.length > 0;

  return (
    <header className="safe-area-top sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col px-4",
          !showBanner && "md:h-16 md:flex-row md:items-center md:gap-6",
        )}
      >
        <div className={cn("flex h-14 items-center justify-between gap-3", !showBanner && "md:contents")}>
          <Wordmark />
          <HeaderSession className={cn(!showBanner && "md:order-3")} />
        </div>
        {showBanner ? null : <MainNav className="md:order-2 md:flex-1" />}
      </div>
      {showBanner ? <HomeBanner slides={slides} /> : null}
      {showBanner ? (
        <div className="mx-auto w-full max-w-6xl px-4">
          <MainNav />
        </div>
      ) : null}
    </header>
  );
}

function HeaderSession({ className }: { className?: string }) {
  const pathname = usePathname();
  const { signedIn, balance, balanceStatus } = useSession();
  const accountCurrent = pathname === "/conta" || pathname.startsWith("/conta/");
  const balanceLabel =
    balanceStatus === "loading" ? "Saldo…" : balanceStatus === "ready" && balance != null ? formatMoneyBR(balance) : "Saldo";

  if (!signedIn) return <AuthLinks className={className} />;

  return (
    <div className={cn("flex shrink-0 items-center gap-3", className)}>
      <Link href="/carteira" className="whitespace-nowrap text-sm font-semibold tabular-nums text-highlight hover:underline">
        {balanceLabel}
      </Link>
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
    <nav aria-label="Principal" className={cn("min-w-0 overflow-x-auto", className)}>
      <ul className="flex w-max items-center gap-1">
        {mainNav.map((item) => {
          const current = item.isCurrent(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm font-semibold",
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
