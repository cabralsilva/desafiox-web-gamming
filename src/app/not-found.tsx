import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="text-2xl font-black tracking-tight">Página não encontrada</h1>
      <p className="mt-2 text-muted-foreground">Esse endereço não existe na DESAFIOX.</p>
      <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-accent hover:underline">
        Voltar aos desafios
      </Link>
    </div>
  );
}
