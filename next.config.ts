import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Next.js dev indicators overlay badge (e.g. "N 1 Insight" button)
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Profile pictures and galleries are served from Cloudinary.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
