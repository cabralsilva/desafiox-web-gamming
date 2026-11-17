import Link from "next/link";
import { cn } from "@/lib/utils";

export type FilterTagItem = {
  id: string;
  label: string;
  href: string;
  pressed: boolean;
};

export type FilterGroupItem = {
  label: string;
  tags: FilterTagItem[];
};

export function FilterTags({ groups }: { groups: FilterGroupItem[] }) {
  const visible = groups.filter((group) => group.tags.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-start gap-x-6 gap-y-3">
      {visible.map((group) => (
        <div key={group.label} role="group" aria-label={group.label} className="flex max-w-full flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {group.tags.map((tag) => (
              <Link
                key={tag.id}
                href={tag.href}
                aria-pressed={tag.pressed}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-semibold",
                  tag.pressed
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {tag.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
