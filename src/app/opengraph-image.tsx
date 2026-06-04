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
          {/* Isotipo TijerApp — geometría exacta + esquinas redondeadas via stroke */}
          <svg
            width="200"
            height="200"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 18 L26 18 L27.5 18.2 L28.8 18.8 L29.9 20 L31.2 23.5 L19 23.5 L17.2 23.3 L15.8 22.6 L14.7 21.4 L10 18 Z"
              fill={GOLD}
              stroke={GOLD}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M38 18 L54 18 L49.3 21.4 L48.2 22.6 L46.8 23.3 L45 23.5 L32.8 23.5 L34.1 20 L35.2 18.8 L36.5 18.2 L38 18 Z"
              fill={GOLD}
              stroke={GOLD}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d="M28.7 27.4 L35.3 27.4 L34.1 47 L29.9 47 L28.7 27.4 Z"
              fill={GOLD}
              stroke={GOLD}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
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
