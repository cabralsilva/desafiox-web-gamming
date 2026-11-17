import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = {
  title: "Conta",
};

export default function ContaPage() {
  return <RoutePlaceholder title="Conta" />;
}
