/**
 * Tests del exportador hacia crmsaas (lógica pura, sin DB ni red).
 *
 * Lo que se cuida acá no es la forma del JSON, sino que **no afirme cosas que
 * TijerApp no sabe**: cuánto paga una barbería, si una prueba existió, o que un
 * cobro huérfano pertenece a alguien.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-crm-export.ts
 */
import {
  CRM_CAPABILITIES,
  centavosDe,
  contactosDe,
  embeddedKey,
  esCursorValido,
  isCrmResource,
  resolveEnvironment,
  toAccountRecord,
  toPaymentRecord,
  toSubscriptionRecord,
  toTrialRecord,
  tokenMatches,
  versionHashOf,
  type BarbershopRow,
  type PaymentRow,
  type SubscriptionRow,
} from "../src/lib/crm-export.ts";

let passed = 0;
let failed = 0;

function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

const ID = "11111111-1111-4111-8111-111111111111";

function suscripcion(extra: Partial<SubscriptionRow> = {}): SubscriptionRow {
  return {
    plan_tier: "pro",
    status: "active",
    trial_started_at: "2026-07-01T00:00:00.000Z",
    trial_expires_at: "2026-07-15T00:00:00.000Z",
    grace_expires_at: null,
    current_period_started_at: "2026-08-01T00:00:00.000Z",
    current_period_ends_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-08-01T12:00:00.000Z",
    ...extra,
  };
}

function barberia(extra: Partial<BarbershopRow> = {}): BarbershopRow {
  return {
    id: ID,
    slug: "barberia-lopez",
    name: "Barbería López",
    whatsapp: "+5493571566221",
    instagram: "@barberialopez",
    is_active: true,
    created_at: "2026-07-01T00:00:00.000Z",
    subscription: suscripcion(),
    ...extra,
  };
}

function cobro(extra: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    barbershop_slug: "barberia-lopez",
    amount: "33000.00",
    method: "transferencia",
    period_start: "2026-08-01T00:00:00.000Z",
    period_end: "2026-09-01T00:00:00.000Z",
    created_at: "2026-08-01T14:00:00.000Z",
    ...extra,
  };
}

console.log("\n— Importes en centavos —");
check("un numeric con dos decimales", centavosDe("33000.00"), "3300000");
check("un entero sin decimales", centavosDe("33000"), "3300000");
check("un decimal de un dígito se completa", centavosDe("100.5"), "10050");
check("un número de JS también", centavosDe(1500), "150000");
// La plata no pasa por punto flotante: se opera con texto.
check("no se pierde precisión en importes grandes", centavosDe("99999999.99"), "9999999999");
check("un importe que no se entiende no se inventa", centavosDe("mil pesos"), null);
check("negativo no es un cobro", centavosDe("-100.00"), null);
check("sin importe no hay cobro", centavosDe(null), null);

console.log("\n— Cobros de la plataforma —");
const pago = toPaymentRecord(cobro(), ID);
check("el importe sale en centavos", pago?.amountMinor, "3300000");
check("la moneda es ARS porque TijerApp sólo cobra en pesos", pago?.currency, "ARS");
// Una fila existe recién cuando la transferencia se acreditó: no hay pendientes.
check("un cobro registrado está confirmado", pago?.status, "confirmed");
check("el período cubierto viaja entero", pago?.coverageEnd, "2026-09-01T00:00:00.000Z");
check("el medio de pago viaja como proveedor", pago?.provider, "transferencia");
check("se cuelga de la suscripción de esa barbería", pago?.subscriptionExternalId, embeddedKey("subscription", ID));
// Un cobro cuyo slug ya no existe no se cuelga de una cuenta equivocada.
check("un cobro huérfano no se exporta", toPaymentRecord(cobro(), null), null);
check("un cobro con importe ilegible no se exporta", toPaymentRecord(cobro({ amount: "?" }), ID), null);

console.log("\n— Suscripción —");
const sub = toSubscriptionRecord(barberia());
check("el plan viaja crudo", sub?.planCode, "pro");
// El precio de lista sería falso justo para el cliente más antiguo, que tiene
// precio congelado de fundador.
check("no se exporta importe: TijerApp no guarda lo pactado", sub?.amountMinor, null);
check("y la base del importe es 'unknown', no una estimación", sub?.amountBasis, "unknown");
check("sin importe tampoco hay moneda", sub?.currency, null);
check("no se afirma si pidió la baja", sub?.cancelAtPeriodEnd, null);
// El trial de 14 días que la app arma en memoria no está persistido.
check(
  "una barbería sin fila de suscripción no tiene contrato",
  toSubscriptionRecord(barberia({ subscription: null })),
  null,
);

console.log("\n— Prueba —");
const trial = toTrialRecord(barberia());
check("empieza cuando arrancó el trial", trial?.startsAt, "2026-07-01T00:00:00.000Z");
check("termina en trial_expires_at", trial?.endsAt, "2026-07-15T00:00:00.000Z");
check(
  "sin fila de suscripción no hay prueba que contar",
  toTrialRecord(barberia({ subscription: null })),
  null,
);
// La RPC de cobro limpia las fechas de trial: una barbería que pagó de entrada
// no tuvo prueba.
check(
  "sin fecha de vencimiento tampoco",
  toTrialRecord(barberia({ subscription: suscripcion({ trial_expires_at: null }) })),
  null,
);
check(
  "si no se guardó el inicio, vale el alta de la barbería",
  toTrialRecord(barberia({ subscription: suscripcion({ trial_started_at: null }) }))?.startsAt,
  "2026-07-01T00:00:00.000Z",
);

console.log("\n— Cuenta —");
const cuenta = toAccountRecord(barberia());
check("el estado de acceso viaja crudo", cuenta.accessStatus, "active");
check("clasificar la cuenta es decisión del CRM", cuenta.kind, "unclassified");
// `is_active` apaga la reserva online; convertirlo en baja borraría la cuenta.
check("apagar la barbería no es darla de baja", toAccountRecord(barberia({ is_active: false })).deletedAt, null);
check("sin suscripción el estado es desconocido, no vencido", toAccountRecord(barberia({ subscription: null })).accessStatus, null);

console.log("\n— Contactos publicados —");
check("se exporta el WhatsApp de turnos", contactosDe(barberia())[0]?.channel, "whatsapp");
check("y el Instagram del local", contactosDe(barberia())[1]?.value, "@barberialopez");
check("una barbería sin contactos publicados exporta ninguno", contactosDe(barberia({ whatsapp: null, instagram: null })).length, 0);
check("un contacto en blanco no cuenta", contactosDe(barberia({ whatsapp: "   ", instagram: null })).length, 0);

console.log("\n— Hash de versión —");
check("dos exportaciones sin cambios dan el mismo hash", toAccountRecord(barberia()).versionHash, toAccountRecord(barberia()).versionHash);
check("el orden de las claves no cambia el hash", versionHashOf({ a: 1, b: 2 }), versionHashOf({ b: 2, a: 1 }));
check(
  "un cambio real cambia el hash",
  toAccountRecord(barberia()).versionHash === toAccountRecord(barberia({ name: "Otra" })).versionHash,
  false,
);

console.log("\n— Capacidades —");
// Las señas de los clientes son plata de la barbería, no de TijerApp.
check("los cobros se declaran parciales, no completos", CRM_CAPABILITIES.payments.status, "partial");
check("y se explica que la moneda no está en la tabla", CRM_CAPABILITIES.payments.reason?.includes("moneda"), true);
check("la suscripción declara que va sin importe", CRM_CAPABILITIES.subscriptions.reason?.includes("sin importe"), true);
check("el uso se declara no disponible", CRM_CAPABILITIES.usage.status, "unavailable");

console.log("\n— Nada de la operación de la barbería —");
{
  const prohibidas = ["turno", "cliente", "reseña", "review", "cupon", "nota"];
  const todo = JSON.stringify([
    toAccountRecord(barberia()),
    toTrialRecord(barberia()),
    toSubscriptionRecord(barberia()),
    toPaymentRecord(cobro(), ID),
  ]).toLowerCase();
  for (const palabra of prohibidas) {
    check(`no se filtró "${palabra}"`, todo.includes(palabra), false);
  }
}

console.log("\n— Entorno, token y cursor —");
// Un next dev local contra la base de producción exporta producción.
check("lo explícito manda", resolveEnvironment({ explicit: "production", nodeEnv: "development" }), "production");
check("si no, se deduce del despliegue", resolveEnvironment({ vercelEnv: "preview", nodeEnv: "production" }), "preview");
check("un valor inventado cae al valor seguro", resolveEnvironment({ explicit: "produccion" }), "test");
check("sin nada, test", resolveEnvironment({}), "test");
check("el token correcto entra", tokenMatches("secreto-largo", "secreto-largo"), true);
check("uno parecido no", tokenMatches("secreto-largo", "secreto-larga"), false);
check("uno más corto tampoco", tokenMatches("secreto-largo", "secreto"), false);
check("sin token, no", tokenMatches("secreto-largo", null), false);
check("un cursor válido pasa", esCursorValido(ID), true);
check("uno con forma rara se frena antes de Postgres", esCursorValido("1; drop table barbershops"), false);
check("sólo los cinco recursos del contrato", isCrmResource("accounts") && !isCrmResource("appointments"), true);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
