import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // public/ assets default to max-age=0 (revalidated on every visit). Media rarely changes, but the
  // file names are reused when work is re-processed, so cache for a week rather than "immutable".
  async headers() {
    return [
      {
        source: "/:dir(work|img)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
