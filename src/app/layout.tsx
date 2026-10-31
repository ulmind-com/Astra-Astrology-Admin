import type { Metadata } from "next";
import { Cormorant_Garamond, Geist_Mono, Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";

import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { RealtimeProvider } from "@/providers/realtime-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// One family across the whole product. The weights are the ones the type
// scale actually uses — 400 body, 500 headings and sub-heads, 600 labels and
// display — so nothing is downloaded that never appears.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// An elegant high-contrast serif, used only for premium display moments
// (the wordmark and the big "Login" heading on the auth screen).
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "DivinLink — Admin", template: "%s · DivinLink Admin" },
  description: "Admin and astrologer panel for DivinLink.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${poppins.variable} ${cormorant.variable} ${geistMono.variable} h-full`}
    >
      <head>
        {/* Apply the saved theme before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("astra_theme");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <QueryProvider>
            <RealtimeProvider>
            <AuthProvider signInPath="/login">
              {children}
              <Toaster theme="light" position="top-right" richColors closeButton />
              <Analytics />
              <SpeedInsights />
            </AuthProvider>
            </RealtimeProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
