import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";

// Písma z návrhu. Přes next/font se hostují lokálně, takže odpadá
// blokující požadavek na Google — na školní wi-fi to je znát.
const body = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  variable: "--font-body-loaded",
});

const heading = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  variable: "--font-heading-loaded",
});

export const metadata: Metadata = {
  title: "Rozdělovník prezentací",
  description: "Výběr témat prezentací v reálném čase.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f3" },
    { media: "(prefers-color-scheme: dark)", color: "#15181a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="cs"
      className={`${body.variable} ${heading.variable}`}
      style={
        {
          "--font-body": "var(--font-body-loaded), system-ui, sans-serif",
          "--font-heading":
            "var(--font-heading-loaded), system-ui, sans-serif",
        } as React.CSSProperties
      }
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
