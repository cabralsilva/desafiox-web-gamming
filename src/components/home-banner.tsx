"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { orderedBannerSlides } from "@/lib/banner";
import type { IBannerSlide } from "@/types/banner";

const AUTO_PLAY_MS = 8000;

export function HomeBanner({ slides }: { slides: IBannerSlide[] }) {
  const ordered = orderedBannerSlides(slides);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
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
    if (count < 2 || paused || hovered || reduced) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTO_PLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, hovered, paused, reduced]);

  if (!slide) return null;

  const image = (
    <img src={slide.imageUrl} alt={slide.alt} className="h-[120px] w-full object-cover object-left md:h-[160px]" />
  );

  const controlClass =
    "inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-foreground disabled:opacity-40";

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
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-2">
          <button type="button" className={controlClass} disabled={index === 0} onClick={() => setIndex((current) => Math.max(0, current - 1))}>
            Anterior
          </button>
          <div className="flex items-center gap-2">
            {ordered.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Mostrar destaque ${itemIndex + 1}`}
                aria-current={itemIndex === index ? "true" : undefined}
                className="inline-flex h-11 w-8 items-center justify-center"
                onClick={() => setIndex(itemIndex)}
              >
                <span
                  className={itemIndex === index ? "h-2.5 w-6 rounded-full bg-primary" : "h-2.5 w-2.5 rounded-full bg-foreground/60"}
                />
              </button>
            ))}
            <button type="button" className={controlClass} onClick={() => setPaused((current) => !current)}>
              {paused || reduced ? "Retomar" : "Pausar"}
            </button>
          </div>
          <button
            type="button"
            className={controlClass}
            disabled={index === count - 1}
            onClick={() => setIndex((current) => Math.min(count - 1, current + 1))}
          >
            Próximo
          </button>
        </div>
      ) : null}
    </section>
  );
}
