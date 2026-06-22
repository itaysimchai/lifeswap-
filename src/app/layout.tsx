import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
