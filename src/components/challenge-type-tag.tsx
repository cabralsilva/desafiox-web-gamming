import { cn } from "@/lib/utils";

const CHALLENGE_TYPE_TAG: Record<string, { label: string; className: string }> = {
  SURVIVAL: {
    label: "Sobrevivência",
    className: "border-primary/40 bg-primary/15 text-primary",
  },
  SCORE_PREDICTOR_POOL: {
    label: "Bolão",
    className: "border-[hsl(207_72%_48%)]/45 bg-[hsl(207_72%_48%)]/15 text-[hsl(207_78%_68%)]",
  },
  ONE_ROUND_WINNERS: {
    label: "Vencedores na rodada",
    className: "border-success/40 bg-success/15 text-success",
  },
};

export function ChallengeTypeTag({ type, className }: { type: string; className?: string }) {
  const known = CHALLENGE_TYPE_TAG[type];
  const label = known?.label ?? type;
  if (!label) return null;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none",
        known?.className ?? "border-border text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
