import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "@/theme/fonts";
import { ThemeStyle } from "@/theme/ThemeStyle";
import { theme } from "@/theme";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { ChatWidget } from "@/components/support/ChatWidget";
import { Toaster } from "@/components/ui/Toast";
import { SiteIntro } from "@/components/intro/SiteIntro";
import { BackToTop } from "@/components/layout/BackToTop";
import { INTRO_BOOT_SCRIPT } from "@/lib/intro";
import { features } from "@/config/features";
import { JsonLd, SITE_NAME, SITE_URL, organizationLd, websiteLd } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Read freely. Publish proudly.`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "StoryShelf is a home for readers and writers: read timeless classics free and discover new books from independent authors, then publish your own with editing, design, ISBN, distribution and marketing under one roof.",
  openGraph: {
    title: `${SITE_NAME} — Read freely. Publish proudly.`,
    description: "Free classics, new voices worth every page, and a place on the shelf for your own book.",
    type: "website",
    siteName: SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: theme.colors.bg,
  colorScheme: theme.mode,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <ThemeStyle />
        {/* decides before first paint whether the opening intro plays */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_BOOT_SCRIPT }} />
        <JsonLd data={[organizationLd(), websiteLd()]} />
      </head>
      <body className="grain">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-pill focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
          Skip to content
        </a>
        <SmoothScroll />
        <SiteIntro />
        <Header />
        <div id="main" tabIndex={-1} className="outline-none">
          {children}
        </div>
        <Footer />
        <BackToTop />
        {features.support && <ChatWidget />}
        <Toaster />
      </body>
    </html>
  );
}
