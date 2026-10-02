import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

const fontDisplay = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const fontCode = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

import { FAVICON_DATA_URI } from "@/lib/logoData";
import { GlobalClickSpark } from "@/components/reactbits/GlobalClickSpark";
import { ScrollToTop } from "@/components/shared/scroll-to-top";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "WebHarvest V3 — Intelligent Website Reconstruction Engine",
  description: "Discover, download, render, and reconstruct complete websites with depth control, authentication, browser rendering, and full asset mirroring.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/fav.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${geistSans.variable} ${fontCode.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" type="image/png" href={FAVICON_DATA_URI} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-primary transition-colors duration-200" suppressHydrationWarning>
        <GlobalClickSpark />
        {children}
        <ScrollToTop />
      </body>
    </html>
  );
}
