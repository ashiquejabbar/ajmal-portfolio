// Public address of the site — used for link previews, canonical URL, robots and sitemap.
// Order: an explicit NEXT_PUBLIC_SITE_URL (set this once you have a custom domain), then the
// host's own production URL — Netlify provides URL at build time, Vercel provides
// VERCEL_PROJECT_PRODUCTION_URL — then local dev.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");
