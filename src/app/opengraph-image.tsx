import { ImageResponse } from "next/og";

// Next App Router OG image convention.
// Renderiza un PNG 1200x630 en runtime usando satori (next/og).
// Esto es lo que WhatsApp / Twitter / Facebook leen al compartir links.

export const alt = "TijerApp — Sistema de turnos para barberías modernas";
export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png";

const GOLD = "#c9a23e";
const SILVER = "#d8d8d8";
const BG = "#000000";
const TEXT_MUTED = "#8a8a8a";
const TEXT_SUBTLE = "#5a5a5a";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 96,
        }}
      >
        {/* Bloque principal: isotipo + wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 64,
          }}
        >
          {/* Isotipo TijerApp — T con alas, render como inline SVG */}
          <svg
            width="200"
            height="200"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M 11 21 L 27 21 L 27 26 L 9 28 Z" fill={GOLD} />
            <path d="M 37 21 L 53 21 L 55 28 L 37 26 Z" fill={GOLD} />
            <path d="M 28.5 21 L 35.5 21 L 34 49 L 30 49 Z" fill={GOLD} />
          </svg>

          {/* Wordmark + tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 900,
                letterSpacing: 6,
                lineHeight: 1,
              }}
            >
              <span style={{ color: GOLD }}>TIJER</span>
              <span style={{ color: SILVER }}>APP</span>
            </div>
            <div
              style={{
                fontSize: 24,
                color: TEXT_MUTED,
                letterSpacing: 2,
              }}
            >
              SISTEMA DE TURNOS PARA BARBERÍAS MODERNAS
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 1,
              background:
                "linear-gradient(to right, rgba(0,0,0,0), rgba(201,162,62,0.4), rgba(0,0,0,0))",
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: TEXT_SUBTLE,
              letterSpacing: 3,
            }}
          >
            TIJERAPP.COM
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
