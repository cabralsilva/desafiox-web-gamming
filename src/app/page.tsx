import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = {
  title: "Desafios",
};

export default function HomePage() {
  return <RoutePlaceholder title="Desafios" />;
}
