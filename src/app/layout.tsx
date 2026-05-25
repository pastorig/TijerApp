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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BarberSync — Turnos online para barberías modernas",
    template: "%s · BarberSync",
  },
  description:
    "Sistema SaaS de turnos online: reservas, barberos, servicios y agenda para barberías modernas. Pensado para trabajar rápido desde el celular.",
  applicationName: "BarberSync",
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/brand/icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "BarberSync — Turnos online para barberías modernas",
    description:
      "Reservas, barberos, servicios y agenda en una plataforma operativa. Pensado para usar mientras se trabaja.",
    type: "website",
    siteName: "BarberSync",
    images: [{ url: "/brand/og-image.svg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BarberSync",
    description: "Sistema de turnos para barberías modernas.",
    images: ["/brand/og-image.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a09",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-app min-h-full flex flex-col">{children}</body>
    </html>
  );
}
