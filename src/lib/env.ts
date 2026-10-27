/**
 * Public runtime config. Everything here ships to the browser, so nothing
 * secret belongs in this file.
 */

function read(name: string, value: string | undefined, fallback: string): string {
  if (!value) {
    // The fallback is the deployed API, so this is normal in production and
    // only worth mentioning while developing.
    if (process.env.NODE_ENV === "development") {
      console.info(`[env] ${name} is not set — using ${fallback}`);
    }
    return fallback;
  }
  return value;
}

/**
 * The deployed API. This is the fallback on purpose: `.gitignore` covers every
 * `.env*` file, so a fresh deploy ships without one. Without a default pointing
 * here, the browser would call the visitor's own localhost and every request
 * would fail. Set NEXT_PUBLIC_API_URL to override it (local backend, staging).
 */
const DEPLOYED_API_URL = "https://astra-astrology-backend.onrender.com";

export const env = {
  apiUrl: read(
    "NEXT_PUBLIC_API_URL",
    process.env.NEXT_PUBLIC_API_URL,
    DEPLOYED_API_URL,
  ).replace(/\/+$/, ""),
  apiPrefix: process.env.NEXT_PUBLIC_API_PREFIX ?? "/api/v1",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "DivinLink",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export const apiBase = `${env.apiUrl}${env.apiPrefix}`;
