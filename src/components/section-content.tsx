"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { desafiosContentShift } from "@/lib/section-shell";

const DURATION_MS = 400;
const SLIDE = "transform 400ms cubic-bezier(0.22, 1, 0.36, 1)";
const FADE = "opacity 400ms ease";

type Motion = "" | "from-right" | "from-left";

type Pane = {
  id: string;
  node: ReactNode;
  motion: Motion;
};

function motionClass(motion: Motion) {
  if (motion === "from-right") return "dx-from-right";
  if (motion === "from-left") return "dx-from-left";
  return "";
}

function shiftMotion(shift: ReturnType<typeof desafiosContentShift>): Motion {
  if (shift === "forward") return "from-right";
  if (shift === "back") return "from-left";
  return "";
}

function freezePane(pane: HTMLElement) {
  const clone = pane.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  clone.style.transition = "none";
  clone.style.transform = "none";
  clone.style.opacity = "1";
  return clone;
}

export function SectionContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [current, setCurrent] = useState<Pane>({ id: pathname, node: children, motion: "" });
  const [previous, setPrevious] = useState<Pane | null>(null);
  const currentEl = useRef<HTMLDivElement>(null);
  const previousEl = useRef<HTMLDivElement>(null);
  const ghostHost = useRef<HTMLDivElement>(null);
  const ghostNode = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const runRef = useRef(0);
  const pendingPath = useRef<string | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!desafiosContentShift(window.location.pathname, url.pathname)) return;
      const live = currentEl.current;
      if (live) ghostNode.current = freezePane(live);
      pendingPath.current = url.pathname;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (pendingPath.current === pathname) pendingPath.current = null;
  const holding = pendingPath.current !== null || ghostNode.current !== null;

  if (current.id !== pathname) {
    const shift = desafiosContentShift(current.id, pathname);
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPrevious(shift && !reduced ? { id: current.id, node: current.node, motion: "" } : null);
    setCurrent({ id: pathname, node: children, motion: reduced ? "" : shiftMotion(shift) });
    if (!shift || reduced) ghostNode.current = null;
  } else if (!holding && !previous && current.motion === "" && current.node !== children) {
    setCurrent({ id: pathname, node: children, motion: "" });
  }

  useLayoutEffect(() => {
    const host = ghostHost.current;
    const ghost = ghostNode.current;
    if (host && ghost && ghost.parentNode !== host) host.replaceChildren(ghost);
    if (!current.motion) {
      const el = currentEl.current;
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
      return;
    }
    window.scrollTo(0, 0);
  }, [current.id, current.motion]);

  useEffect(() => {
    const motion = current.motion;
    if (!motion) return;
    const token = runRef.current + 1;
    runRef.current = token;
    const frame = window.requestAnimationFrame(() => {
      if (runRef.current !== token) return;
      const el = currentEl.current;
      const prev = ghostHost.current ?? previousEl.current;
      if (!el) return;
      const from = motion === "from-right" ? "translateX(100%)" : "translateX(-100%)";
      el.style.transition = "none";
      el.style.transform = from;
      if (prev) {
        prev.style.transition = "none";
        prev.style.opacity = "1";
      }
      void el.offsetWidth;
      el.style.transition = SLIDE;
      el.style.transform = "translateX(0)";
      if (prev) {
        prev.style.transition = FADE;
        prev.style.opacity = "0";
      }
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        if (runRef.current !== token) return;
        el.style.transition = "";
        ghostNode.current = null;
        if (ghostHost.current) ghostHost.current.replaceChildren();
        setCurrent((pane) => (pane.id === pathname ? { ...pane, motion: "" } : pane));
        setPrevious(null);
      }, DURATION_MS);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [current.id, current.motion, pathname]);

  const showGhost = ghostNode.current !== null;

  return (
    <div className="relative overflow-hidden">
      {showGhost ? (
        <div
          ref={ghostHost}
          inert
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 bg-background"
        />
      ) : previous ? (
        <div
          ref={previousEl}
          key={previous.id}
          inert
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 z-0 bg-background"
        >
          {previous.node}
        </div>
      ) : null}
      <div key={current.id} ref={currentEl} className={`relative z-10 bg-background ${motionClass(current.motion)}`}>
        {current.node}
      </div>
    </div>
  );
}
