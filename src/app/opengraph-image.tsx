import { ImageResponse } from "next/og";

// Next App Router OG image convention.
// Renderiza un PNG 1200x630 en runtime usando satori (next/og).
// Esto es lo que WhatsApp / Twitter / Facebook leen al compartir links.

export const alt = "TijerApp — Sistema de turnos para barberías modernas";
export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png";

const GOLD = "#c9a23e";
const GOLD_FAINT = "rgba(201,162,62,0.35)";
const SILVER = "#d8d8d8";
const BG = "#000000";
const TEXT_MUTED = "#8a8a8a";
const TEXT_SUBTLE = "#5a5a5a";

const CELL = 44;
const GAP = 8;

// Combo-b: anti-diagonal de 4 celdas alternando silver / gold / silver / gold
// desde top-right hacia bottom-left.
type CellState = "gold" | "silver" | "empty";
const ISOTYPE: CellState[][] = [
  ["empty", "empty", "empty", "silver"],
  ["empty", "empty", "gold", "empty"],
  ["empty", "silver", "empty", "empty"],
  ["gold", "empty", "empty", "empty"],
];

function cellStyle(state: CellState) {
  const base = {
    width: CELL,
    height: CELL,
    display: "flex",
  } as const;
  if (state === "gold") return { ...base, background: GOLD };
  if (state === "silver") return { ...base, background: SILVER };
  return { ...base, border: `2px solid ${GOLD_FAINT}` };
}

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
          {/* Isotipo */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: GAP,
            }}
          >
            {ISOTYPE.map((row, ri) => (
              <div key={ri} style={{ display: "flex", gap: GAP }}>
                {row.map((state, ci) => (
                  <div key={ci} style={cellStyle(state)} />
                ))}
              </div>
            ))}
          </div>

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
              <span style={{ color: GOLD }}>BARBER</span>
              <span style={{ color: SILVER }}>SYNC</span>
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
