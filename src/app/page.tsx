import type { Metadata } from "next";
import { Suspense } from "react";
import { ExampleConfirmation } from "@/components/example-confirmation";

export const metadata: Metadata = {
  title: "Desafios",
};

export default function HomePage() {
  return (
    <>
      <h1 className="sr-only">Desafios</h1>
      <Suspense fallback={null}>
        <ExampleConfirmation />
      </Suspense>
    </>
  );
}
