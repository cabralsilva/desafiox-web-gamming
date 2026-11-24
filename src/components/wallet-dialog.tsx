"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "@/components/icons";

export function WalletDialogFrame({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="flex max-h-[min(90dvh,720px)] w-[calc(100vw-1.5rem)] max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card p-0 text-foreground backdrop:bg-black/80"
      onClose={onClose}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
        <h2 id={titleId} className="text-lg font-bold">
          {title}
        </h2>
        <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Fechar" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer ? <div className="flex shrink-0 gap-2 border-t border-border bg-secondary/30 px-5 py-4">{footer}</div> : null}
    </dialog>
  );
}
