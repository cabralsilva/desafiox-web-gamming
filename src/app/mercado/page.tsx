import type { Metadata } from "next";
import { MarketHome } from "@/components/market-home";
import { loadMarketPage, parseMarketQuery } from "@/lib/queries/marketTickets";

export const metadata: Metadata = {
  title: "Mercado",
  description: "Tickets à venda e abertos a proposta na DESAFIOX.",
  alternates: { canonical: "/mercado" },
};

export default async function MercadoPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = parseMarketQuery(await searchParams);
  const initial = await loadMarketPage(query);

  return (
    <>
      <h1 className="sr-only">Mercado</h1>
      <MarketHome query={query} initial={initial} />
    </>
  );
}
