import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `cacheComponents` (on by default in the scaffold) refuses to prerender any
  // route that reads request-time state. This app is signed-in and
  // client-rendered — `useSearchParams`, `useParams` and the auth context are
  // on nearly every page — so it only produced build failures. Off, those
  // routes simply render on demand, which is what they need anyway.
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
};

export default nextConfig;
