import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = {
  title: "WhatsApp",
};

export default function WhatsappPage() {
  return <RoutePlaceholder title="WhatsApp" />;
}
