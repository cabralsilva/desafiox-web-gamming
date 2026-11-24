import type { Metadata } from "next";
import { WalletHome } from "@/components/wallet-home";

export const metadata: Metadata = {
  title: "Carteira",
  description: "Saldo, extrato, depósito manual e saque na DESAFIOX.",
  alternates: { canonical: "/carteira" },
};

export default function CarteiraPage() {
  return <WalletHome />;
}
