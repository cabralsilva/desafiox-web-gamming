import type { Metadata } from "next";
import { ChallengeHome } from "@/components/challenge-home";
import { parseChallengeQuery } from "@/lib/queries/challengeList";
import { publicChallengePage, sessionChallengePage } from "@/mocks";

export const metadata: Metadata = {
  title: "Desafios",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = parseChallengeQuery(await searchParams);
  return (
    <>
      <h1 className="sr-only">Desafios</h1>
      <ChallengeHome
        query={query}
        publicItems={publicChallengePage.items}
        sessionItems={sessionChallengePage.items}
      />
    </>
  );
}
