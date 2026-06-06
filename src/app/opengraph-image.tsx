import fs from "node:fs";
import path from "node:path";
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

// Inline el isotipo master como base64 — garantiza 100% fidelidad con
// la identidad visual de marca (mismo PNG que se usa en navbar/favicon/PWA).
function loadIsotipoBase64(): string {
  const filepath = path.join(
    process.cwd(),
    "public",
    "brand",
    "isotipo-mark.png",
  );
  const buffer = fs.readFileSync(filepath);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export default async function OpenGraphImage() {
  const isotipoSrc = loadIsotipoBase64();
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
          {/* Isotipo TijerApp — PNG master inline (base64 dataURL) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isotipoSrc}
            alt=""
            width={200}
            height={200}
            style={{ width: 200, height: 200, objectFit: "contain" }}
          />

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
