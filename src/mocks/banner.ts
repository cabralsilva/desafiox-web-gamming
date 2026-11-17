import type { IBannerSlide } from "../types";

/** API-09 ainda sem coleção. A home usa esta lista até o endpoint existir. */
export const bannerSlides: IBannerSlide[] = [
  {
    id: "abertura-copa",
    imageUrl: "/banners/abertura-copa.svg",
    alt: "Inscrições abertas para a Copa sobrevivência",
    href: "/desafios/copa-sobrevivencia",
    order: 1,
  },
  {
    id: "mercado-brasileirao",
    imageUrl: "/banners/mercado-brasileirao.svg",
    alt: "Tickets do Brasileirão sobrevivência disponíveis no mercado",
    href: "/mercado",
    order: 2,
  },
];
