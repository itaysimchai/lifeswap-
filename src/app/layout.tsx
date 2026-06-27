import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

// Display face: an optical old-style serif with character. Variable wght +
// optical sizing so large headings get the true display cut; loaded once and
// applied to h1/h2 only (see globals.css).
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LifeSwap — Find and offer services",
    template: "%s | LifeSwap",
  },
  description:
    "LifeSwap is a simple marketplace for services. Browse what people offer, request what you need, and chat directly once a provider accepts.",
  keywords: ["services", "marketplace", "providers", "freelance", "skills"],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "LifeSwap — Find and offer services",
    description: "A simple marketplace for services.",
    siteName: "LifeSwap",
  },
  twitter: {
    card: "summary_large_image",
    title: "LifeSwap — Find and offer services",
    description: "A simple marketplace for services.",
  },
};

// Ensures the page fits the device width on phones (no zoomed-out "tiny" layout)
// while still allowing users to pinch-zoom for accessibility.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
