/**
 * Prueba de INTEGRACIÓN del flujo de seña contra las rutas reales + DB.
 * NO usa MercadoPago (usa el modo simulación). Crea datos de test con un slug
 * único y los borra al final.
 *
 * Requisitos: dev server corriendo en BASE con
 *   NEXT_PUBLIC_ALLOW_DEPOSIT_SIMULATION=true y CRON_SECRET=itest-secret
 *
 * Correr: node --env-file=.env.local --experimental-strip-types scripts/itest-deposit.ts
 */
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.ITEST_BASE || "http://localhost:3210";
const CRON_SECRET = "itest-secret";
const SLUG = "zz-itest-deposit";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, key, { auth: { persistSession: false } });

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    pass++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    console.log(`✗ ${name}`, extra ?? "");
  }
}

async function cleanup() {
  // Borramos appointments del slug (y sus payment_events por cascade), luego
  // services, barbers y la barbería.
  const { data: appts } = await db
    .from("appointments")
    .select("id")
    .eq("barbershop_slug", SLUG);
  for (const a of (appts ?? []) as { id: string }[]) {
    await db.from("payment_events").delete().eq("appointment_id", a.id);
  }
  await db.from("appointments").delete().eq("barbershop_slug", SLUG);
  await db.from("barber_services").delete().eq("barbershop_slug", SLUG);
  await db.from("barbers").delete().eq("barbershop_slug", SLUG);
  await db.from("barbershops").delete().eq("slug", SLUG);
}

async function main() {
  await cleanup(); // por si quedó algo de una corrida previa

  // ── Seed ────────────────────────────────────────────────────────────────
  await db.from("barbershops").insert({
    slug: SLUG,
    name: "ITEST Deposit",
    is_active: true,
    working_hours_start: "09:00",
    working_hours_end: "21:00",
    slot_interval_minutes: 30,
    mp_enabled: true,
    deposit_percent: 30,
    deposit_min_amount: null,
    deposit_auto_cancel_hours: 1,
  });
  const { data: barber } = await db
    .from("barbers")
    .insert({
      barbershop_slug: SLUG,
      name: "ITEST Barbero",
      display_name: "ITEST Barbero",
      role: "Barbero",
      whatsapp: null,
      is_active: true,
    })
    .select("id")
    .single();
  const barberId = (barber as { id: string }).id;
  const { data: service } = await db
    .from("barber_services")
    .insert({
      barbershop_slug: SLUG,
      barber_id: barberId,
      name: "Corte ITEST",
      price: 8500,
      duration_minutes: 30,
      is_active: true,
    })
    .select("id")
    .single();
  const serviceId = (service as { id: string }).id;
  console.log("Seed OK:", { SLUG, barberId, serviceId });

  // ── 1. Reservar con seña (modo sim, sin token MP) ────────────────────────
  const bookRes = await fetch(`${BASE}/api/appointments/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barbershopSlug: SLUG,
      barberId,
      barberName: "ITEST Barbero",
      serviceId,
      customerName: "Cliente Test",
      customerPhone: "1122334455",
      appointmentDate: "2027-01-15",
      appointmentTime: "10:00",
      comment: "",
    }),
  });
  const book = (await bookRes.json()) as {
    ok?: boolean;
    token?: string;
    depositAmount?: number;
    simulate?: boolean;
    error?: string;
  };
  check("book responde 200", bookRes.status === 200, book);
  check("book calcula seña 30% de 8500 = 2550", book.depositAmount === 2550, book.depositAmount);
  check("book devuelve token", typeof book.token === "string" && book.token.length > 0);
  check("book marca simulate:true (sin token MP)", book.simulate === true);

  const token = book.token!;

  // DB: turno pending con seña pendiente
  const { data: a1 } = await db
    .from("appointments")
    .select("status, deposit_status, deposit_amount, deposit_required")
    .eq("confirmation_token", token)
    .single();
  const ap1 = a1 as { status: string; deposit_status: string; deposit_amount: number; deposit_required: boolean };
  check("DB: turno quedó status=pending", ap1?.status === "pending", ap1);
  check("DB: deposit_status=pending", ap1?.deposit_status === "pending");
  check("DB: deposit_amount=2550 + deposit_required", ap1?.deposit_amount === 2550 && ap1?.deposit_required === true);

  // payment_events: preference_created
  const { data: ev1 } = await db
    .from("payment_events")
    .select("event_type")
    .eq("appointment_id", (await apptId(token)));
  check(
    "payment_events tiene 'preference_created'",
    ((ev1 ?? []) as { event_type: string }[]).some((e) => e.event_type === "preference_created"),
  );

  // ── 2. Simular pago aprobado ─────────────────────────────────────────────
  const simRes = await fetch(`${BASE}/api/mp/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const sim = (await simRes.json()) as { ok?: boolean; confirmed?: boolean };
  check("simulate responde 200 + confirmed", simRes.status === 200 && sim.confirmed === true, sim);

  const { data: a2 } = await db
    .from("appointments")
    .select("status, deposit_status, mp_payment_id, deposit_paid_at")
    .eq("confirmation_token", token)
    .single();
  const ap2 = a2 as { status: string; deposit_status: string; mp_payment_id: string | null; deposit_paid_at: string | null };
  check("DB: turno confirmado tras pago", ap2?.status === "confirmed", ap2);
  check("DB: deposit_status=paid + mp_payment_id + paid_at", ap2?.deposit_status === "paid" && !!ap2?.mp_payment_id && !!ap2?.deposit_paid_at);

  // ── 3. Idempotencia: simular de nuevo no duplica ─────────────────────────
  const simRes2 = await fetch(`${BASE}/api/mp/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const sim2 = (await simRes2.json()) as { ok?: boolean; alreadyPaid?: boolean };
  check("simulate idempotente (alreadyPaid)", simRes2.status === 200 && sim2.alreadyPaid === true, sim2);
  const { data: evApproved } = await db
    .from("payment_events")
    .select("id")
    .eq("appointment_id", await apptId(token))
    .eq("event_type", "payment_approved");
  check("payment_events: solo 1 'payment_approved' (sin duplicar)", ((evApproved ?? []) as unknown[]).length === 1, (evApproved ?? []).length);

  // ── 4. Auto-cancelación de seña vencida ──────────────────────────────────
  const { data: expiredAppt } = await db
    .from("appointments")
    .insert({
      barbershop_slug: SLUG,
      barber_id: barberId,
      barber_name: "ITEST Barbero",
      customer_name: "Cliente Vencido",
      customer_phone: "1199887766",
      service_name: "Corte ITEST",
      service_price: 8500,
      service_duration_minutes: 30,
      appointment_date: "2027-01-15",
      appointment_time: "11:00",
      comment: "",
      status: "pending",
      deposit_required: true,
      deposit_amount: 2550,
      deposit_status: "pending",
      deposit_expires_at: new Date(Date.now() - 60_000).toISOString(), // vencido
    })
    .select("id")
    .single();
  const expiredId = (expiredAppt as { id: string }).id;

  const cronRes = await fetch(`${BASE}/api/cron/deposits`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const cron = (await cronRes.json()) as { ok?: boolean; expired?: number };
  check("cron responde 200", cronRes.status === 200, cron);
  check("cron expiró >=1 turno", (cron.expired ?? 0) >= 1, cron);

  const { data: a3 } = await db
    .from("appointments")
    .select("status, deposit_status")
    .eq("id", expiredId)
    .single();
  const ap3 = a3 as { status: string; deposit_status: string };
  check("DB: turno vencido quedó cancelled", ap3?.status === "cancelled", ap3);
  check("DB: deposit_status=expired (slot liberado)", ap3?.deposit_status === "expired");

  // ── 5. Cron auth: sin secret → 401 ───────────────────────────────────────
  const cronNoAuth = await fetch(`${BASE}/api/cron/deposits`);
  check("cron sin Bearer → 401", cronNoAuth.status === 401);

  // ── 6. Barbería sin seña → book 400 (no aplica a esta ruta) ──────────────
  await db.from("barbershops").update({ mp_enabled: false }).eq("slug", SLUG);
  const bookOff = await fetch(`${BASE}/api/appointments/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      barbershopSlug: SLUG,
      barberId,
      serviceId,
      customerName: "X",
      customerPhone: "1122334455",
      appointmentDate: "2027-01-16",
      appointmentTime: "10:00",
    }),
  });
  check("book en barbería sin seña → 400", bookOff.status === 400);
}

async function apptId(token: string): Promise<string> {
  const { data } = await db
    .from("appointments")
    .select("id")
    .eq("confirmation_token", token)
    .single();
  return (data as { id: string }).id;
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    fail++;
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${pass} OK · ${fail} FALLARON`);
    process.exit(fail ? 1 : 0);
  });
