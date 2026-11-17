/** Slide do banner. Não há modelo na lib nem endpoint. API-09. */
export interface IBannerSlide {
  id: string;
  imageUrl: string;
  alt: string;
  href?: string;
  order: number;
}
