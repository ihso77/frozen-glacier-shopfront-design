import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nova Store - متجر نوفا",
  description: "متجر نوفا لخدمات الاستضافة والبوتات والأدوات الذكية. حلول متكاملة لاحتياجاتك التقنية.",
  keywords: ["Nova Store", "متجر نوفا", "استضافة", "بوتات", "حلول تقنية", "hosting", "bots"],
  authors: [{ name: "Nova Store Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Nova Store - متجر نوفا",
    description: "متجر نوفا لخدمات الاستضافة والبوتات والأدوات الذكية",
    url: "https://nova-store.dev",
    siteName: "Nova Store",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nova Store - متجر نوفا",
    description: "متجر نوفا لخدمات الاستضافة والبوتات والأدوات الذكية",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2074491089342872"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
