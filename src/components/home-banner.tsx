"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { orderedBannerSlides } from "@/lib/banner";
import { cn } from "@/lib/utils";
import type { IBannerSlide } from "@/types/banner";

const AUTO_PLAY_MS = 8000;

export function HomeBanner({ slides }: { slides: IBannerSlide[] }) {
  const ordered = orderedBannerSlides(slides);
  const count = ordered.length;
  const track = count > 1 ? [...ordered, ordered[0]] : ordered;
  const [index, setIndex] = useState(0);
  const [motion, setMotion] = useState(true);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const indexRef = useRef(0);
  const epochRef = useRef(0);
  const goRef = useRef<(direction: 1 | -1) => void>(() => undefined);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function commit(next: number, animated: boolean) {
    indexRef.current = next;
    setMotion(animated);
    setIndex(next);
  }

  function go(direction: 1 | -1) {
    if (count < 2) return;
    epochRef.current += 1;
    setEpoch(epochRef.current);
    const current = indexRef.current === count ? 0 : indexRef.current;
    const next = current + direction;
    if (reduced) {
      commit((next + count) % count, false);
      return;
    }
    if (next < 0) {
      commit(count, false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => commit(count - 1, true));
      });
      return;
    }
    commit(next, true);
  }

  goRef.current = go;

  useEffect(() => {
    if (count < 2 || paused || reduced) return;
    const timer = window.setInterval(() => goRef.current(1), AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, reduced, epoch]);

  if (count === 0) return null;

  const controlClass =
    "absolute inset-y-0 z-10 flex w-14 items-center justify-center bg-black/45 text-foreground opacity-0 transition-opacity duration-200 pointer-events-none hover:bg-black/60 focus-visible:pointer-events-auto focus-visible:opacity-100";

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="relative border-y border-border bg-card"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative h-[120px] overflow-hidden md:h-[160px]">
        {track.map((item, position) => {
          const frame = (
            <img src={item.imageUrl} alt={item.alt} className="h-full w-full object-cover object-left" />
          );
          return (
            <div
              key={`${item.id}-${position}`}
              aria-hidden={position !== index}
              className={cn("absolute inset-0", motion && "transition-transform duration-500 ease-out")}
              style={{ transform: `translateX(${(position - index) * 100}%)` }}
              onTransitionEnd={(event) => {
                if (event.propertyName !== "transform" || event.target !== event.currentTarget) return;
                if (indexRef.current !== count) return;
                commit(0, false);
              }}
            >
              {item.href ? (
                <Link href={item.href} tabIndex={position === index ? 0 : -1} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  {frame}
                </Link>
              ) : (
                frame
              )}
            </div>
          );
        })}
        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Anterior"
              className={cn(controlClass, "left-0", paused && "pointer-events-auto opacity-100")}
              onClick={() => go(-1)}
            >
              <ChevronLeftIcon className="h-8 w-8" />
            </button>
            <button
              type="button"
              aria-label="Próximo"
              className={cn(controlClass, "right-0", paused && "pointer-events-auto opacity-100")}
              onClick={() => go(1)}
            >
              <ChevronRightIcon className="h-8 w-8" />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
