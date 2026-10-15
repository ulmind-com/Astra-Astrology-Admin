/**
 * Public runtime config. Everything here ships to the browser, so nothing
 * secret belongs in this file.
 */

function read(name: string, value: string | undefined, fallback: string): string {
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[env] ${name} is not set — falling back to ${fallback}`);
    }
    return fallback;
  }
  return value;
}

export const env = {
  apiUrl: read(
    "NEXT_PUBLIC_API_URL",
    process.env.NEXT_PUBLIC_API_URL,
    "http://localhost:8000",
  ).replace(/\/+$/, ""),
  apiPrefix: process.env.NEXT_PUBLIC_API_PREFIX ?? "/api/v1",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Astra Astrology",
  isProduction: process.env.NODE_ENV === "production",
} as const;

export const apiBase = `${env.apiUrl}${env.apiPrefix}`;
