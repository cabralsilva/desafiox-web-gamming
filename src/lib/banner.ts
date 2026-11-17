import type { IBannerSlide } from "@/types/banner";

export function orderedBannerSlides(slides: IBannerSlide[]) {
  return slides
    .filter((slide) => slide.imageUrl.trim().length > 0 && slide.alt.trim().length > 0)
    .sort((left, right) => left.order - right.order);
}
