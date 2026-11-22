import type { MetadataRoute } from "next"

/** Makes the site installable: Android and desktop Chrome offer "Install", iOS "Add to Home Screen". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Brazen Borrower",
    short_name: "Borrower",
    description: "Who has whose Riftbound cards.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
