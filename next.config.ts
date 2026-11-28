import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Next.js dev indicators overlay badge (e.g. "N 1 Insight" button)
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    unoptimized: true,
    // Profile pictures, course thumbnails, and galleries served from Cloudinary.
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
    ],
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
