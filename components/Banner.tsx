// Branded LeadersBrands banner. The image is served from /public.
// Uses a background-image so a missing file degrades to a dark bar
// (no broken-image icon) rather than looking broken.
export function Banner({ variant = 'app' }: { variant?: 'app' | 'login' }) {
  return (
    <div
      className={`brand-banner brand-banner--${variant}`}
      role="img"
      aria-label="Leaders Brands — Your Premiere Leadership and Branding Group"
    />
  );
}
