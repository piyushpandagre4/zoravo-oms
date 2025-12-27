import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

// Get base URL from environment variable or use default domain
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zoravo.in';

export const metadata: Metadata = {
  title: {
    default: "Zoravo OMS - Car Accessories Management System",
    template: "%s | Zoravo OMS"
  },
  description: "Comprehensive Order Management System for Car Accessories Business. Streamline vehicle inward, installation tracking, invoicing, and customer management.",
  keywords: ["car accessories", "order management system", "vehicle management", "automotive business", "inventory management", "OMS", "car accessories OMS"],
  authors: [{ name: "Zoravo" }],
  creator: "Zoravo",
  publisher: "Zoravo",
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Zoravo OMS",
    title: "Zoravo OMS - Car Accessories Management System",
    description: "Comprehensive Order Management System for Car Accessories Business. Streamline vehicle inward, installation tracking, invoicing, and customer management.",
    images: [
      {
        url: `${baseUrl}/og-image.png`, // User should add this image
        width: 1200,
        height: 630,
        alt: "Zoravo OMS - Car Accessories Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Zoravo OMS - Car Accessories Management System",
    description: "Comprehensive Order Management System for Car Accessories Business",
    images: [`${baseUrl}/og-image.png`], // User should add this image
    creator: "@zoravo", // Update with actual Twitter handle if available
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  category: 'business',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured Data - JSON-LD
  const softwareApplicationSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Zoravo OMS",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Comprehensive Order Management System for Car Accessories Business",
    "url": baseUrl,
    "author": {
      "@type": "Organization",
      "name": "Zoravo"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "100"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Zoravo",
    "url": baseUrl,
    "logo": `${baseUrl}/logo.png`, // User should add this
    "description": "Provider of Order Management System for Car Accessories Business",
    "sameAs": [
      // Add social media links if available
      // "https://www.facebook.com/zoravo",
      // "https://www.twitter.com/zoravo",
      // "https://www.linkedin.com/company/zoravo"
    ]
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Zoravo OMS",
    "url": baseUrl,
    "description": "Comprehensive Order Management System for Car Accessories Business",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Structured Data - JSON-LD */}
        <Script
          id="software-application-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareApplicationSchema)
          }}
        />
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema)
          }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema)
          }}
        />
        <ErrorBoundary>
          {children}
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  );
}
