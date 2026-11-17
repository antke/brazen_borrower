import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Every host RiftHunt's catalogue points card art at (checked against all 1,725 printings).
    remotePatterns: [
      { protocol: "https", hostname: "cmsassets.rgpub.io", pathname: "/sanity/images/**" },
      { protocol: "https", hostname: "tcgplayer-cdn.tcgplayer.com", pathname: "/product/**" },
      { protocol: "https", hostname: "rifthunt.com", pathname: "/img/**" },
    ],
  },
}

export default nextConfig
