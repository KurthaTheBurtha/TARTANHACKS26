/**
 * Image loading utilities for performance.
 * When adding <img> elements, use loading="lazy" for below-the-fold images:
 *
 * <img src="..." alt="..." loading="lazy" />
 *
 * For Next.js Image component, lazy loading is default for below-fold images.
 */

export const IMAGE_LOADING = {
  /** Use for images below the fold */
  lazy: "lazy" as const,
  /** Use for LCP/hero images */
  eager: "eager" as const,
};
