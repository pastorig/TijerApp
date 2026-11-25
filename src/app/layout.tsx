import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ConfirmProvider, ToastProvider } from "@/components/ui";
import { PWAInstallProvider } from "@/components/pwa/PWAInstallProvider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { RecoveryLinkRedirect } from "@/components/auth/RecoveryLinkRedirect";
import { StructuredData } from "@/components/seo/StructuredData";
import { CelularBase } from "@/components/pwa/CelularBase";
import { IOS_GAP_TEMPRANO } from "@/lib/ios-standalone-gap";
import { NIVEL_TEMPRANO } from "@/lib/rendimiento";
import "./globals.css";
// El vidrio del celular (feature 041). Aparte de globals.css a propósito: ver
// el encabezado de vidrio.css.
import "@/styles/vidrio.css";

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
  // Título y descripción medidos contra lo que Google muestra: el título entre
  // 50-60 caracteres y la descripción entre 150-160. La anterior tenía 202 y se
  // cortaba justo donde estaba el precio.
  title: {
    default: "TijerApp — Turnos online para barberías en Argentina", // 52
    template: "%s · TijerApp",
  },
  description:
    // 157 caracteres.
    "Turnos online para barberías argentinas. El cliente reserva solo desde el celular, sin apps. Agenda, comisiones y caja en un panel. 14 días gratis, en pesos.",
  applicationName: "TijerApp",
  // Términos por los que buscaría un barbero argentino. No pesan para el
  // ranking de Google desde hace años, pero los buscadores con IA sí los leen
  // como señal de qué ofrece la página.
  keywords: [
    "software para barberías",
    "sistema de turnos para barbería",
    "app de turnos para barberos",
    "turnos online barbería Argentina",
    "agenda para barbería",
    "reservas online barbería",
    "software barbería en pesos",
    "alternativa a Booksy Argentina",
    "cobrar seña MercadoPago turnos",
    "gestión de barbería multi barbero",
  ],
  alternates: {
    canonical: "/",
  },
  // Verificación de propiedad en Google Search Console. Es un token público
  // (va en el HTML de todas las páginas), no un secreto: sirve para probarle a
  // Google que el dominio es nuestro. No se borra aunque ya esté verificado —
  // Google revalida cada tanto y si desaparece pierde la propiedad.
  verification: {
    google: "1re-lRg0LFjJpqloGTrWLn2xD9buDXeFuiodxl4eoC4",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      // PNG raster para iOS Safari (no soporta SVG en apple-touch-icon)
      { url: "/brand/icons/apple-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "TijerApp",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "TijerApp — Turnos online para barberías en Argentina",
    description:
      "Reservas, barberos, servicios y agenda en una plataforma operativa. Pensado para usar mientras se trabaja.",
    type: "website",
    siteName: "TijerApp",
    // Faltaba: sin `og:url` el que comparte el link no tiene una URL canónica
    // declarada para la tarjeta, y las redes pueden atribuirla a la URL con la
    // que llegaron (con parámetros de campaña, por ejemplo).
    url: siteUrl,
    locale: "es_AR",
    // La imagen se genera automáticamente desde src/app/opengraph-image.tsx
    // (Next auto-detecta el archivo y lo expone como /opengraph-image en PNG).
  },
  twitter: {
    card: "summary_large_image",
    title: "TijerApp",
    description: "Sistema de turnos para barberías modernas.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  // La app instalada se dibuja hasta los bordes (detrás de la hora y de la
  // rayita de inicio): sin esto `env(safe-area-inset-*)` da 0 y la barra de
  // abajo queda pegada a la rayita. Lo de arriba lo cubre `.tj-franja-estado`.
  viewportFit: "cover",
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
      // El script de abajo le pone `data-ios-gap` a <html> antes de hidratar.
      suppressHydrationWarning
    >
      <head>
        {/* 🔴 La app instalada en el iPhone: el modo de la franja se prende
            ANTES de dibujar, sin esperar a medir (feature 041, ver
            ios-standalone-gap.ts). */}
        <script dangerouslySetInnerHTML={{ __html: IOS_GAP_TEMPRANO }} />
        {/* Modo liviano (045): si este equipo ya se midió flojo, arranca
            liviano antes de dibujar (sin salto). */}
        <script dangerouslySetInnerHTML={{ __html: NIVEL_TEMPRANO }} />
        {/* NOTA: el preload del isotipo lo maneja next/image automáticamente
            via priority={true} en Logo.tsx. Agregar <link rel="preload"> manual
            duplicaba el preload con URL distinta a la que next/image usa
            (transforma a /_next/image?url=...), generando warning del browser
            "preloaded but not used within a few seconds". */}

        {/* DNS prefetch + preconnect a Supabase para acelerar la primera
            request de auth/data en navegaciones que requieren API calls. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link
              rel="dns-prefetch"
              href={process.env.NEXT_PUBLIC_SUPABASE_URL}
            />
            <link
              rel="preconnect"
              href={process.env.NEXT_PUBLIC_SUPABASE_URL}
              crossOrigin="anonymous"
            />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col">
        {/* Fondo negro liso detrás de la hora del iPhone. Fuera del iPhone mide 0. */}
        <div aria-hidden="true" className="tj-franja-estado" />
        <CelularBase />
        <PWAInstallProvider>
          <ToastProvider>
            <ConfirmProvider>{children}</ConfirmProvider>
          </ToastProvider>
        </PWAInstallProvider>
        {/* Un link de recuperar contraseña que cayó en otra página va a /nueva-password. */}
        <RecoveryLinkRedirect />
        <ServiceWorkerRegister />
        {/* JSON-LD: va en el HTML servido para que lo lean los crawlers. */}
        <StructuredData />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
