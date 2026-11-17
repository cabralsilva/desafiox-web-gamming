import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Gantari } from "next/font/google";
import { SessionProvider } from "@/components/session-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const gantari = Gantari({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-gantari",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DESAFIOX",
    template: "%s · DESAFIOX",
  },
  description: "Sobreviva. Vença. Leve tudo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className={gantari.variable}>
      <body className="flex min-h-dvh flex-col font-body">
        <SessionProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <SiteFooter />
        </SessionProvider>
      </body>
    </html>
  );
}
