"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { orderedBannerSlides } from "@/lib/banner";
import type { IBannerSlide } from "@/types/banner";

const AUTO_PLAY_MS = 8000;

export function HomeBanner({ slides }: { slides: IBannerSlide[] }) {
  const ordered = orderedBannerSlides(slides);
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = ordered.length;
  const slide = ordered[index] ?? ordered[0];

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (count < 2 || hovered || reduced) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, hovered, reduced]);

  if (!slide) return null;

  const image = (
    <img src={slide.imageUrl} alt={slide.alt} className="h-[120px] w-full object-cover object-left md:h-[160px]" />
  );

  const controlClass =
    "absolute bottom-2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-foreground";

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="relative border-y border-border bg-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {slide.href ? (
        <Link href={slide.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          {image}
        </Link>
      ) : (
        image
      )}
      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Anterior"
            className={`${controlClass} left-2`}
            onClick={() => setIndex((current) => (current - 1 + count) % count)}
          >
            <BannerChevron direction="prev" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            className={`${controlClass} right-2`}
            onClick={() => setIndex((current) => (current + 1) % count)}
          >
            <BannerChevron direction="next" />
          </button>
        </>
      ) : null}
    </section>
  );
}

function BannerChevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-5 w-5">
      <path
        d={direction === "prev" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
