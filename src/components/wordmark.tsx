import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="DESAFIOX"
      className={cn(
        "shrink-0 text-lg font-black leading-none tracking-tight text-foreground",
        className,
      )}
    >
      DESAFIO<span className="text-primary">X</span>
    </Link>
  );
}
