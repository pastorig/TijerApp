import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { BarbershopRow, PaymentRow, SubscriptionRow } from "@/lib/crm-export";

/**
 * Única lectura de base de la exportación al CRM.
 *
 * Vive separada de `crm-export.ts` para que el mapeo se pueda testear sin base
 * y sin Next, y para que se vea de un vistazo **qué tablas toca la
 * exportación**: `barbershops`, `barbershop_subscriptions` y
 * `barbershop_payments`. Ninguna de turnos, clientes, reseñas ni notas.
 *
 * Paginación por keyset sobre el id: el `range` por offset se saltea o repite
 * filas cuando alguien da de alta una barbería en el medio de la sincronización.
 */

const COLUMNAS_BARBERIA =
  "id, slug, name, whatsapp, instagram, is_active, created_at, " +
  "barbershop_subscriptions(plan_tier, status, trial_started_at, trial_expires_at, " +
  "grace_expires_at, current_period_started_at, current_period_ends_at, updated_at)";

type FilaCruda = Omit<BarbershopRow, "subscription"> & {
  barbershop_subscriptions: SubscriptionRow[] | SubscriptionRow | null;
};

/** La suscripción es una por barbería (unique), pero PostgREST la trae en lista. */
function primeraSuscripcion(valor: FilaCruda["barbershop_subscriptions"]): SubscriptionRow | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export async function fetchBarbershopPage(
  cursor: string | null,
  limit: number,
): Promise<BarbershopRow[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("barbershops")
    .select(COLUMNAS_BARBERIA)
    .order("id", { ascending: true })
    .limit(limit);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as FilaCruda[]).map((fila) => ({
    id: fila.id,
    slug: fila.slug,
    name: fila.name,
    whatsapp: fila.whatsapp,
    instagram: fila.instagram,
    is_active: fila.is_active,
    created_at: fila.created_at,
    subscription: primeraSuscripcion(fila.barbershop_subscriptions),
  }));
}

export async function fetchPaymentPage(
  cursor: string | null,
  limit: number,
): Promise<PaymentRow[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("barbershop_payments")
    .select("id, barbershop_slug, amount, method, period_start, period_end, paid_at, created_at")
    .order("id", { ascending: true })
    .limit(limit);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PaymentRow[];
}

/**
 * Traduce los slugs de una página de cobros a los id de barbería.
 *
 * `barbershop_payments` referencia la barbería por slug y no tiene clave
 * foránea, así que no se puede embeber: hay que resolverlo. Un cobro cuyo slug
 * ya no existe no se exporta —`toPaymentRecord` devuelve null— en vez de
 * colgarse de una cuenta equivocada.
 */
export async function fetchIdsPorSlug(slugs: string[]): Promise<Map<string, string>> {
  const unicos = [...new Set(slugs.filter(Boolean))];
  if (unicos.length === 0) return new Map();

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("barbershops").select("id, slug").in("slug", unicos);
  if (error) throw new Error(error.message);

  return new Map(((data ?? []) as { id: string; slug: string }[]).map((f) => [f.slug, f.id]));
}

/** Uso agregado de una barbería. Conteos y fechas: ni un cliente. */
export type BarbershopUsageRow = {
  slug: string;
  turnos: number;
  turnos7d: number;
  clientes: number;
  equipo: number;
  barberosActivos: number;
  servicios: number;
  ultimaActividad: string | null;
};

/** Cuántas barberías se consultan a la vez. Cada una son unas ocho lecturas. */
const BARBERIAS_EN_PARALELO = 8;

type Supabase = ReturnType<typeof getSupabaseAdminClient>;

/** Cuenta filas sin traerlas. Con error no devuelve cero: tira. */
async function contar(
  consulta: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await consulta;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** El último ingreso con contraseña de quienes administran la barbería. */
async function ultimoIngreso(supabase: Supabase, userIds: string[]): Promise<string | null> {
  const ingresos = await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      return data?.user?.last_sign_in_at ?? null;
    }),
  );
  return ingresos.reduce<string | null>(
    (ultimo, actual) => (actual && (!ultimo || actual > ultimo) ? actual : ultimo),
    null,
  );
}

async function usoDe(
  supabase: Supabase,
  slug: string,
  adminIds: string[],
  desde7d: string,
): Promise<BarbershopUsageRow> {
  const turnosVivos = () =>
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("barbershop_slug", slug)
      .neq("status", "deleted");

  const [turnos, turnos7d, clientes, barberosActivos, servicios, empleados, ultimoTurno, ingreso] =
    await Promise.all([
      contar(turnosVivos()),
      contar(turnosVivos().gte("created_at", desde7d)),
      contar(
        supabase
          .from("barbershop_clients")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_slug", slug),
      ),
      contar(
        supabase
          .from("barbers")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_slug", slug)
          .eq("is_active", true),
      ),
      contar(
        supabase
          .from("barber_services")
          .select("id", { count: "exact", head: true })
          .eq("barbershop_slug", slug),
      ),
      contar(
        supabase
          .from("barber_staff_access")
          .select("barber_id", { count: "exact", head: true })
          .eq("barbershop_slug", slug)
          .is("revoked_at", null),
      ),
      supabase
        .from("appointments")
        .select("created_at")
        .eq("barbershop_slug", slug)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          return ((data?.[0] as { created_at?: string } | undefined)?.created_at ?? null) as
            | string
            | null;
        }),
      ultimoIngreso(supabase, adminIds),
    ]);

  // Las dos fechas vienen en ISO pero con formatos distintos: se comparan como
  // instantes, no como texto.
  const instantes = [ultimoTurno, ingreso]
    .filter((valor): valor is string => Boolean(valor))
    .map((valor) => new Date(valor).getTime())
    .filter((ms) => Number.isFinite(ms));

  return {
    slug,
    turnos,
    turnos7d,
    clientes,
    equipo: adminIds.length + empleados,
    barberosActivos,
    servicios,
    ultimaActividad: instantes.length ? new Date(Math.max(...instantes)).toISOString() : null,
  };
}

/**
 * Señales de uso por barbería: cuánto la usan, si terminaron de configurarla y
 * **cuándo fue la última señal de vida**.
 *
 * Contesta si la están usando o se dieron de alta y nunca entraron.
 *
 * Son conteos y una fecha. No sale el nombre de un cliente, ni un teléfono, ni
 * un servicio, ni un precio.
 *
 * **Qué cuenta como actividad**: que entre un turno, o que un administrador
 * inicie sesión. En una barbería los turnos los toman los clientes desde el
 * link, y eso *es* la barbería usando TijerApp — el dueño puede pasar semanas
 * sin loguearse con la agenda llena. Por eso el ingreso solo no alcanza, y por
 * eso acá un turno que entra sí mueve la fecha.
 *
 * La fecha es la del **último hecho real**, nunca la de esta consulta: si fuera
 * "ahora", cada sincronización parecería actividad y una barbería abandonada no
 * se detectaría jamás.
 *
 * Son varias lecturas por barbería, en tandas. Evita agregar una función en la
 * base sólo para esto, y N está acotado por el tamaño de página.
 */
export async function fetchBarbershopUsage(
  slugs: string[],
  ahora: Date = new Date(),
): Promise<BarbershopUsageRow[]> {
  const unicos = [...new Set(slugs.filter(Boolean))];
  if (unicos.length === 0) return [];

  const supabase = getSupabaseAdminClient();
  const desde7d = new Date(ahora.getTime() - 7 * 86_400_000).toISOString();

  const { data: admins, error } = await supabase
    .from("barbershop_admins")
    .select("barbershop_slug, user_id")
    .in("barbershop_slug", unicos);
  if (error) throw new Error(error.message);

  const adminsPorSlug = new Map<string, string[]>();
  for (const fila of (admins ?? []) as { barbershop_slug: string; user_id: string }[]) {
    adminsPorSlug.set(fila.barbershop_slug, [
      ...(adminsPorSlug.get(fila.barbershop_slug) ?? []),
      fila.user_id,
    ]);
  }

  const salida: BarbershopUsageRow[] = [];
  for (let i = 0; i < unicos.length; i += BARBERIAS_EN_PARALELO) {
    const tanda = unicos.slice(i, i + BARBERIAS_EN_PARALELO);
    salida.push(
      ...(await Promise.all(
        tanda.map((slug) => usoDe(supabase, slug, adminsPorSlug.get(slug) ?? [], desde7d)),
      )),
    );
  }
  return salida;
}
