import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono, Baloo_2 } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// Thick, rounded strokes — gives the glossy-3D wordmark filter enough
// surface area to render a convincing specular highlight.
const baloo = Baloo_2({
  variable: "--font-wordmark",
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NoCap — Live Truth Layer",
  description:
    "NoCap autonomously catches, quarantines, and repairs bad data in your AI knowledge base before your chatbot ever tells a lie.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Dark is the shipped default; THEME_INIT_SCRIPT swaps in the saved
      // choice before first paint, which is exactly the DOM/markup mismatch
      // suppressHydrationWarning exists for.
      data-theme="dark"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        inter.variable,
        playfair.variable,
        jetbrainsMono.variable,
        baloo.variable,
        "font-sans",
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <ScrollProgressBar />
        {children}
      </body>
    </html>
  );
}
