import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = {
  title: "Desafio",
};

export default function DesafioPage() {
  return <RoutePlaceholder title="Desafio" />;
}
