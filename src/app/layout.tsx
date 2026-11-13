import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site-url";

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const body = Inter_Tight({
  variable: "--font-body",
  subsets: ["latin"],
});

const hud = JetBrains_Mono({
  variable: "--font-hud",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const OG = { url: "/img/og.jpg", width: 1200, height: 630, alt: "Ajmal Yaseen — Videographer & Photographer, Dubai" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // makes preview / canonical URLs absolute (not localhost)
  title: "Ajmal Yaseen — Videographer & Photographer, Dubai",
  description:
    "Cinematic visual creator in Dubai. Brand films, wedding highlights, documentaries and social reels — directed, shot and graded by Ajmal Yaseen.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Ajmal Yaseen",
    locale: "en_AE",
    title: "Ajmal Yaseen — Videographer & Photographer",
    description: "Brand films, weddings, documentaries and social reels from Dubai.",
    images: [OG],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ajmal Yaseen — Videographer & Photographer",
    description: "Brand films, real estate, food and events — shot in Dubai.",
    images: [OG.url],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a09",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${hud.variable}`} suppressHydrationWarning>
      <head>
        {/* apply the visitor's saved theme before first paint (no flash). Default: noir */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("theme")==="paper"){document.documentElement.dataset.theme="paper";document.querySelector('meta[name="theme-color"]')?.setAttribute("content","#f1ede6")}}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
