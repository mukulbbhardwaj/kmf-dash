import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Milk Farm Tracker",
    short_name: "Milk Farm",
    description: "Track cow health, medicines and feed by tag number.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f6f2",
    theme_color: "#f5f6f2",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}
