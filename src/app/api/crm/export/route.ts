/**
 * Exportación de datos comerciales hacia crmsaas (contrato v1).
 *
 *   GET /api/crm/export?resource=accounts&limit=100&cursor=<ultimo-id>
 *   Authorization: Bearer ${CRM_EXPORT_TOKEN}
 *
 * Es de **sólo lectura**: no hay POST, y nada de lo que haga el CRM puede
 * modificar una barbería.
 *
 * **Sin token configurado se rechaza** (503). Un endpoint que se abre solo
 * cuando alguien olvida una variable es un agujero esperando el despiste, y lo
 * que hay del otro lado es la cartera de clientes de la plataforma.
 *
 * Qué sale: barberías, planes, pruebas y los cobros que TijerApp les hizo.
 * Qué NO sale: turnos, clientes de la barbería, reseñas, notas internas, ni las
 * señas que cobran por Mercado Pago (esa plata es de ellas). Ver
 * `src/lib/crm-export.ts`.
 */
import { NextResponse } from "next/server";
import {
  CRM_CAPABILITIES,
  MAX_PAGE_SIZE,
  esCursorValido,
  isCrmResource,
  resolveEnvironment,
  toAccountRecord,
  toPaymentRecord,
  toSubscriptionRecord,
  toTrialRecord,
  tokenMatches,
} from "@/lib/crm-export";
import {
  fetchBarbershopPage,
  fetchIdsPorSlug,
  fetchPaymentPage,
} from "@/lib/crm-export-datos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bearerDe(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function GET(request: Request) {
  const esperado = process.env.CRM_EXPORT_TOKEN?.trim();
  if (!esperado) {
    return NextResponse.json(
      { error: "La exportación al CRM no está habilitada en este entorno." },
      { status: 503 },
    );
  }
  if (!tokenMatches(esperado, bearerDe(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");
  if (!isCrmResource(resource)) {
    return NextResponse.json({ error: "Parámetro 'resource' inválido." }, { status: 400 });
  }

  const cursor = url.searchParams.get("cursor");
  if (cursor !== null && !esCursorValido(cursor)) {
    return NextResponse.json({ error: "Parámetro 'cursor' inválido." }, { status: 400 });
  }

  const limitCrudo = Number(url.searchParams.get("limit") ?? MAX_PAGE_SIZE);
  const limit = Number.isFinite(limitCrudo)
    ? Math.min(Math.max(Math.trunc(limitCrudo), 1), MAX_PAGE_SIZE)
    : MAX_PAGE_SIZE;

  const sobre = {
    schemaVersion: 1 as const,
    product: "tijerapp" as const,
    environment: resolveEnvironment({
      explicit: process.env.CRM_EXPORT_ENVIRONMENT,
      vercelEnv: process.env.VERCEL_ENV,
      nodeEnv: process.env.NODE_ENV,
    }),
    resource,
    snapshotAt: new Date().toISOString(),
    capabilities: CRM_CAPABILITIES,
  };

  // Lo que TijerApp no puede dar se contesta vacío **y con su capacidad
  // declarada**, sin ir a la base.
  if (CRM_CAPABILITIES[resource].status === "unavailable") {
    return NextResponse.json({ ...sobre, nextCursor: null, records: [] });
  }

  try {
    if (resource === "payments") {
      const cobros = await fetchPaymentPage(cursor, limit);
      const idsPorSlug = await fetchIdsPorSlug(cobros.map((c) => c.barbershop_slug));
      const records = cobros
        .map((c) => toPaymentRecord(c, idsPorSlug.get(c.barbershop_slug) ?? null))
        .filter((r) => r !== null);

      // El cursor sale de las **filas leídas**, no de los registros devueltos:
      // una página entera de cobros huérfanos no produce registros y aun así
      // hay que seguir avanzando.
      const nextCursor =
        cobros.length === limit ? (cobros[cobros.length - 1]?.id ?? null) : null;
      return NextResponse.json({ ...sobre, nextCursor, records });
    }

    const barberias = await fetchBarbershopPage(cursor, limit);
    const records =
      resource === "accounts"
        ? barberias.map(toAccountRecord)
        : resource === "trials"
          ? barberias.map(toTrialRecord).filter((r) => r !== null)
          : barberias.map(toSubscriptionRecord).filter((r) => r !== null);

    const nextCursor =
      barberias.length === limit ? (barberias[barberias.length - 1]?.id ?? null) : null;

    return NextResponse.json({ ...sobre, nextCursor, records });
  } catch (error: unknown) {
    // Sin detalle hacia afuera: un error de base puede traer fragmentos de
    // consulta o de conexión.
    console.error("[crm-export] fallo al exportar", error);
    return NextResponse.json({ error: "No se pudo exportar." }, { status: 500 });
  }
}
