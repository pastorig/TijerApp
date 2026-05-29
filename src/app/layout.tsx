import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// `||` y no `??` para que también caiga al fallback cuando la env var
// está seteada pero vacía (caso típico al pulleala de Vercel).
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

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
    // La imagen se genera automáticamente desde src/app/opengraph-image.tsx
    // (Next auto-detecta el archivo y lo expone como /opengraph-image en PNG).
  },
  twitter: {
    card: "summary_large_image",
    title: "BarberSync",
    description: "Sistema de turnos para barberías modernas.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
