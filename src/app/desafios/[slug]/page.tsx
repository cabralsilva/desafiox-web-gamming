import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChallengeEvolution } from "@/components/challenge-evolution";
import { loadPublicEvolution, loadSessionEvolution } from "@/lib/queries/loadEvolution";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const view = await loadPublicEvolution(slug);
  if (!view) return { title: "Desafio" };
  return {
    title: view.challenge.name,
    description: view.challenge.descriptionShort || `Evolução de ${view.challenge.name} na DESAFIOX.`,
  };
}

export default async function DesafioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticketOrderId?: string | string[] }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const ticketOrderId = typeof query.ticketOrderId === "string" ? query.ticketOrderId : "";
  const initial = await loadPublicEvolution(slug);
  if (!initial) notFound();

  return (
    <ChallengeEvolution
      initial={initial}
      sessionFallback={loadSessionEvolution(slug)}
      ticketOrderId={ticketOrderId}
    />
  );
}
