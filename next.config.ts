import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Lets a phone on the same Wi-Fi use the dev server (http://<this Mac's LAN IP or name>.local:3333) with hot reload.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  partialPrefetching: true,
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
