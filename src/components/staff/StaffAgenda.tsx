"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarX2,
  Check,
  Clock,
  Loader2,
  MessageCircle,
  Scissors,
  Wallet,
  X,
} from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { agruparPorFranja } from "@/lib/staff-agenda-grouping";
import { createWhatsAppClientContactLink } from "@/lib/whatsapp";
import { AgendaCalendar } from "@/components/calendar/AgendaCalendar";
import { addDays } from "@/components/calendar/date-utils";
import { MetricCard } from "@/components/admin/MetricCard";
import { Badge, Button, Card } from "@/components/ui";
import {
  PERMISOS_POR_DEFECTO,
  type StaffPermissions,
} from "@/lib/staff-permissions";

/**
 * La agenda del empleado: SUS turnos del día.
 *
 * Los datos no se piden a Supabase desde acá — el empleado no puede leer
 * `appointments` por RLS, a propósito. Todo pasa por `/api/staff/*`, que
 * resuelve en el servidor de qué barbero es la agenda a partir del token. Acá
 * no se manda ningún `barberId`: si se mandara, sería un dato del cliente
 * decidiendo qué agenda se ve.
 *
 * ── Qué mira un barbero mientras labura ─────────────────────────────────────
 * Primero: qué viene ahora. Después: cuántos le quedan y cuánto lleva ganado.
 * Por eso el próximo turno va destacado arriba de todo y el resumen del día
 * está a la vista, no escondido en otra pestaña.
 *
 * ── El calendario es el mismo que el del dueño ──────────────────────────────
 * Antes eran siete días fijos, que en una pantalla de escritorio se veían como
 * una tira de celular estirada. Ahora usa `AgendaCalendar` (feature 018): la
 * semana, el mes completo y el swipe salen gratis, y son exactamente los del
 * turnero.
 */

type Turno = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  service_price: number | null;
  service_duration_minutes: number | null;
  appointment_time: string;
  comment: string | null;
  status: "pending" | "confirmed" | "cancelled";
};

type Respuesta = {
  turnos?: Turno[];
  produccionDelDia?: number;
  comisionDelDia?: number | null;
  permisos?: StaffPermissions;
  error?: string;
};

const TZ = "America/Argentina/Buenos_Aires";

function hoyEnArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Minutos transcurridos del día, en hora argentina. */
function minutosDeAhora(): number {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [h, m] = partes.split(":").map(Number);
  return h * 60 + m;
}

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

/**
 * El rango que se le pide al servidor para los puntitos: el mes visible más
 * una semana de cada lado, así el strip semanal de los bordes también tiene
 * puntos. Queda muy por debajo del tope de 70 días del endpoint.
 */
function rangoDelMes(anio: number, mes: number): { from: string; to: string } {
  const primero = new Date(Date.UTC(anio, mes - 1, 1))
    .toISOString()
    .slice(0, 10);
  const ultimo = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
  return { from: addDays(primero, -7), to: addDays(ultimo, 7) };
}

export function StaffAgenda({
  barbershopSlug,
  barbershopName,
}: {
  barbershopSlug: string;
  barbershopName: string;
}) {
  const [fecha, setFecha] = useState(hoyEnArgentina);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [comision, setComision] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [tocando, setTocando] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  /**
   * Qué le habilitó el dueño (feature 019). Arranca en "todo", que es lo que
   * era la app antes de que existieran los permisos, y lo corrige la primera
   * respuesta. Así no parpadea una pantalla recortada para quien puede todo.
   *
   * Esto decide qué se DIBUJA. Lo que de verdad frena una acción es el
   * servidor: el precio y el teléfono ni siquiera llegan cuando no
   * corresponde, y confirmar o cancelar se rechaza con 403.
   */
  const [permisos, setPermisos] =
    useState<StaffPermissions>(PERMISOS_POR_DEFECTO);
  const hoy = useMemo(() => hoyEnArgentina(), []);
  const [rango, setRango] = useState(() => {
    const [a, m] = hoy.split("-").map(Number);
    return rangoDelMes(a, m);
  });

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCargando(true);
      setError("");
      try {
        const { data: sessionData } = await getCurrentSession();
        const token = sessionData.session?.access_token;
        if (!vivo) return;
        if (!token) {
          setError("Se cerró tu sesión. Volvé a entrar.");
          return;
        }
        const res = await fetch(
          `/api/staff/agenda?bs=${encodeURIComponent(barbershopSlug)}&date=${fecha}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await res.json().catch(() => ({}))) as Respuesta;
        if (!vivo) return;
        if (!res.ok) {
          setError(payload.error ?? "No pudimos traer tus turnos.");
          return;
        }
        setTurnos(payload.turnos ?? []);
        setComision(payload.comisionDelDia ?? null);
        if (payload.permisos) setPermisos(payload.permisos);
      } catch {
        if (vivo) setError("No pudimos traer tus turnos.");
      } finally {
        if (vivo) setCargando(false);
      }
    }
    cargar();
    return () => {
      vivo = false;
    };
  }, [barbershopSlug, fecha, recarga]);

  /**
   * Los puntitos del calendario. Van en su propio efecto y NO cortan la
   * pantalla si fallan: son una ayuda visual. Si esto reventara la agenda, un
   * adorno estaría rompiendo lo único que el barbero necesita.
   */
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const { data: sessionData } = await getCurrentSession();
        const token = sessionData.session?.access_token;
        if (!vivo || !token) return;
        const res = await fetch(
          `/api/staff/agenda-counts?bs=${encodeURIComponent(barbershopSlug)}&from=${rango.from}&to=${rango.to}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as {
          conteos?: Record<string, number>;
        };
        if (vivo && payload.conteos) setConteos(payload.conteos);
      } catch {
        // Silencio a propósito: sin puntitos se sigue trabajando igual.
      }
    })();
    return () => {
      vivo = false;
    };
  }, [barbershopSlug, rango, recarga]);

  const alCambiarMes = useCallback((anio: number, mes: number) => {
    const nuevo = rangoDelMes(anio, mes);
    // Comparación por valor: el calendario avisa en cada cambio de su estado y
    // un objeto nuevo cada vez dispararía un pedido infinito.
    setRango((actual) =>
      actual.from === nuevo.from && actual.to === nuevo.to ? actual : nuevo,
    );
  }, []);

  async function cambiarEstado(id: string, status: "confirmed" | "cancelled") {
    setTocando(id);
    try {
      const { data: sessionData } = await getCurrentSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/staff/appointment-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ barbershopSlug, appointmentId: id, status }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(payload.error ?? "No pudimos actualizar el turno.");
        return;
      }
      // Se recarga en vez de tocar el estado a mano: así lo que se ve es lo que
      // quedó guardado, y no una versión optimista que puede diferir.
      setRecarga((v) => v + 1);
    } finally {
      setTocando(null);
    }
  }

  const esHoy = fecha === hoy;

  const activos = useMemo(
    () => turnos.filter((t) => t.status !== "cancelled"),
    [turnos],
  );

  /** El que está pasando ahora, o el que sigue. Solo tiene sentido hoy. */
  const destacado = useMemo(() => {
    if (!esHoy) return null;
    const ahora = minutosDeAhora();
    const enCurso = activos.find((t) => {
      const inicio = aMinutos(t.appointment_time);
      return (
        ahora >= inicio && ahora < inicio + (t.service_duration_minutes ?? 30)
      );
    });
    if (enCurso) return { turno: enCurso, enCurso: true };
    const proximo = activos.find((t) => aMinutos(t.appointment_time) > ahora);
    return proximo ? { turno: proximo, enCurso: false } : null;
  }, [activos, esHoy]);

  // Mañana y tarde. Si todos los turnos caen del mismo lado no se agrupa:
  // un solo encabezado arriba de la lista entera es ruido, no orden.
  const franjas = useMemo(() => agruparPorFranja(turnos), [turnos]);

  /**
   * El turno, tal cual se ve. Vive fuera del JSX porque se dibuja desde tres
   * lugares (mañana, tarde y la lista sin agrupar): duplicarlo era garantizar
   * que en tres meses uno de los tres quede distinto.
   */
  function renderTurno(turno: Turno) {
    const cancelado = turno.status === "cancelled";
    const esDestacado = destacado?.turno.id === turno.id;
    const waLink = turno.customer_phone
      ? createWhatsAppClientContactLink({
          barbershopName,
          clientName: turno.customer_name,
          clientPhone: turno.customer_phone,
          date: fecha,
          time: turno.appointment_time.slice(0, 5),
        })
      : null;

    return (
      <li key={turno.id}>
        <Card
          variant="flat"
          padding="none"
          className={cn(
            "p-3 transition-colors",
            cancelado && "opacity-45",
            esDestacado &&
              !cancelado &&
              "border-[color:var(--brand-gold-ring)]",
          )}
        >
          <div className="flex items-start gap-3">
            {/* La hora manda: es por lo que un barbero recorre la lista.
                Antes competía con el nombre del cliente. */}
            <span
              className={cn(
                "shrink-0 text-lg font-black tabular-nums leading-tight",
                cancelado
                  ? "text-[color:var(--text-subtle)] line-through"
                  : "text-[color:var(--brand-gold)]",
              )}
            >
              {turno.appointment_time.slice(0, 5)}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-sm font-bold",
                  cancelado
                    ? "text-[color:var(--text-muted)] line-through"
                    : "text-white",
                )}
              >
                {turno.customer_name}
              </p>
              <p className="truncate text-xs text-[color:var(--text-muted)]">
                {turno.service_name}
                {turno.service_duration_minutes
                  ? ` · ${turno.service_duration_minutes} min`
                  : ""}
                {turno.service_price
                  ? ` · ${formatPrice(turno.service_price)}`
                  : ""}
              </p>
              {turno.comment ? (
                <p className="mt-1 text-xs italic text-[color:var(--text-subtle)]">
                  “{turno.comment}”
                </p>
              ) : null}
            </div>
            <Badge
              variant={
                turno.status === "confirmed"
                  ? "success"
                  : turno.status === "pending"
                    ? "accent"
                    : "danger"
              }
              className="shrink-0"
            >
              {turno.status === "confirmed"
                ? "Confirmado"
                : turno.status === "pending"
                  ? "Pendiente"
                  : "Cancelado"}
            </Badge>
          </div>

          {!cancelado && (permisos.confirmar || permisos.cancelar || waLink) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {turno.status !== "confirmed" && permisos.confirmar ? (
                <Button
                  variant="success"
                  size="sm"
                  className="flex-1 sm:flex-initial"
                  disabled={tocando === turno.id}
                  onClick={() => void cambiarEstado(turno.id, "confirmed")}
                  iconLeft={<Check className="size-3.5" />}
                >
                  Confirmar
                </Button>
              ) : null}
              {waLink ? (
                /* Escribirle al cliente es lo que más hace un barbero con un
                   turno, y era lo único que el panel del dueño tenía y esta
                   pantalla no. */
                <Button
                  as="link"
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  size="sm"
                  className="flex-1 sm:flex-initial"
                  iconLeft={<MessageCircle className="size-3.5" />}
                >
                  WhatsApp
                </Button>
              ) : null}
              {permisos.cancelar ? (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={tocando === turno.id}
                  onClick={() => void cambiarEstado(turno.id, "cancelled")}
                  aria-label="Cancelar turno"
                  className="shrink-0"
                >
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
      </li>
    );
  }

  return (
    /* Dos columnas en escritorio: el calendario y los números quedan fijos a
       la izquierda y la lista scrollea sola. En celular es una sola columna,
       en el mismo orden de siempre. */
    <div className="grid gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-4 lg:sticky lg:top-32">
        <Card padding="sm">
          <AgendaCalendar
            focusDate={fecha}
            onFocusDateChange={setFecha}
            compact
            countsByDay={conteos}
            todayYmd={hoy}
            onVisibleMonthChange={alCambiarMes}
          />
        </Card>

        {/* El resumen del día: cuántos turnos y cuánto se lleva. Es lo que un
            barbero quiere saber sin entrar a otra pantalla.

            Sin el permiso de ver la plata queda solo el contador, a lo ancho.
            No se deja la tarjeta vacía ni con un guioncito: un hueco donde
            antes había un número se lee como que la app se rompió. */}
        <div
          className={cn(
            "grid gap-3",
            permisos.verGanancias ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          <MetricCard label="Turnos" icon={Scissors}>
            <p className="stat-number text-2xl font-black tabular-nums leading-none text-white">
              {activos.length}
            </p>
          </MetricCard>
          {permisos.verGanancias ? (
            <MetricCard label="Te llevás" icon={Wallet}>
              <p
                className={cn(
                  "stat-number text-2xl font-black tabular-nums leading-none",
                  comision === null
                    ? "text-[color:var(--text-subtle)]"
                    : "w-fit bg-gradient-to-br from-[color:var(--brand-gold-hi)] via-[color:var(--brand-gold)] to-[color:var(--brand-gold-lo)] bg-clip-text text-transparent",
                )}
              >
                {comision === null ? "—" : formatPrice(comision)}
              </p>
            </MetricCard>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        {error ? (
          <p
            role="alert"
            className="mb-4 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-3 py-2 text-xs text-[color:var(--danger)]"
          >
            {error}
          </p>
        ) : null}

        {cargando ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
          </div>
        ) : turnos.length === 0 ? (
          <div className="flex flex-col items-center rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-subtle)] px-6 py-12 text-center">
            <CalendarX2 className="size-7 text-[color:var(--text-subtle)]" />
            <p className="mt-3 text-sm font-bold text-white">
              {esHoy ? "Hoy no tenés turnos" : "Sin turnos este día"}
            </p>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Cuando alguien reserve con vos, te aparece acá.
            </p>
          </div>
        ) : (
          <>
            {destacado ? (
              <section
                className={cn(
                  "card-premium card-premium-glow p-4",
                  destacado.enCurso && "border-[color:var(--brand-gold)]",
                )}
              >
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
                  <Clock className="size-3" />
                  {destacado.enCurso ? "Atendiendo ahora" : "Tu próximo turno"}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="stat-number text-3xl font-black tabular-nums leading-none text-white">
                    {destacado.turno.appointment_time.slice(0, 5)}
                  </span>
                  <span className="truncate text-base font-bold text-white">
                    {destacado.turno.customer_name}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {destacado.turno.service_name}
                  {destacado.turno.service_duration_minutes
                    ? ` · ${destacado.turno.service_duration_minutes} min`
                    : ""}
                </p>
              </section>
            ) : null}

            {franjas.agrupar ? (
              <>
                <ListaDeTurnos
                  titulo="Mañana"
                  turnos={franjas.manana}
                  render={renderTurno}
                />
                <ListaDeTurnos
                  titulo="Tarde"
                  turnos={franjas.tarde}
                  render={renderTurno}
                />
              </>
            ) : (
              <ol className="mt-4 flex flex-col gap-2">
                {franjas.turnos.map(renderTurno)}
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Una franja del día, con su encabezado y cuántos turnos tiene. */
function ListaDeTurnos({
  titulo,
  turnos,
  render,
}: {
  titulo: string;
  turnos: Turno[];
  render: (turno: Turno) => React.ReactNode;
}) {
  // Los cancelados NO se cuentan, igual que en el resumen de arriba. Si acá
  // contaran, la misma pantalla mostraría dos números distintos para lo mismo.
  const enPie = turnos.filter((t) => t.status !== "cancelled").length;

  return (
    <section className="mt-5">
      <p className="mb-2 flex items-baseline gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
          {titulo}
        </span>
        <span className="text-[10px] font-semibold text-[color:var(--text-subtle)]">
          {enPie} turno{enPie === 1 ? "" : "s"}
        </span>
      </p>
      <ol className="flex flex-col gap-2">{turnos.map(render)}</ol>
    </section>
  );
}
