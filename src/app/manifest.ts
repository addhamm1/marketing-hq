import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marketing HQ · Espaces",
    short_name: "Marketing HQ",
    description: "The Espaces marketing department portal",
    start_url: "/",
    display: "standalone",
    background_color: "#040707",
    theme_color: "#040707",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
