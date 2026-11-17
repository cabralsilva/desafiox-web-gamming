"use client";

import { useEffect, useId, useRef } from "react";
import { sanitizeRulesHtml } from "@/lib/sanitize-html";

export function RulesDialog({
  title,
  html,
  onClose,
}: {
  title: string | null;
  html: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const open = title != null;
  const safeHtml = sanitizeRulesHtml(html).trim();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-full max-w-lg rounded-lg border border-border bg-card p-6 text-foreground backdrop:bg-black/80 max-md:fixed max-md:inset-0 max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:max-w-none max-md:rounded-none"
      onClose={() => {
        if (open) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-xl font-black tracking-tight">
          {title ?? "Regras"}
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onClose}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4">
            <path
              d="M3.2 3.2 12.8 12.8M12.8 3.2 3.2 12.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      {safeHtml ? (
        <div
          className="mt-4 max-h-[70vh] overflow-y-auto text-sm leading-relaxed text-foreground [&_a]:text-primary [&_p+p]:mt-3 max-md:max-h-none"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">As regras deste desafio ainda não foram publicadas.</p>
      )}
    </dialog>
  );
}
