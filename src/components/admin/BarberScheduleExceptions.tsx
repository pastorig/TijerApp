"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarClock, Trash2 } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import {
  deleteDayOverride,
  listDayOverridesDesde,
  upsertDayOverridesEnLote,
} from "@/lib/barber-availability";
import { listAppointmentsByBarbershop } from "@/lib/appointments";
import { fechasDelRango } from "@/lib/excepcion-rango";
import { ahoraEnArgentina } from "@/lib/hora-argentina";
import {
  resolverJornadaDelDia,
  turnosFueraDeJornada,
  type ReglaSemanalDelDia,
} from "@/lib/jornada-del-dia";
import { formatDateForDisplay } from "@/lib/format";
import { useConfirm, useToast } from "@/components/ui";
import type { BarberDayOverrideRow, BarberRow } from "@/lib/supabase";

/**
 * Cambiar el horario de un barbero por unos días, sin tocar su regla semanal.
 *
 * ── Por qué existe ──────────────────────────────────────────────────────────
 * El horario se configura por día de la semana: cambiar el lunes cambia TODOS
 * los lunes. Cuando un barbero quería laburar distinto una semana puntual no
 * tenía dónde decirlo, así que o cambiaba la regla general y se tenía que
 * acordar de volver a cambiarla, o perdía los turnos.
 *
 * Vive en su propio archivo y no adentro de `BarberAvailabilityManager` porque
 * ese ya pasa las mil líneas.
 */

type Props = {
  barbershop: DemoBarbershop;
  barber: BarberRow;
  /** La regla semanal ya mergeada con los defaults de la barbería. */
  reglaSemanal: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isWorking: boolean;
    breakStart: string | null;
    breakEnd: string | null;
  }>;
};

type ModoPausa = "heredar" | "propia" | "ninguna";

const inputClass =
  "min-h-11 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]";

const botonModo =
  "min-h-11 flex-1 rounded-md border px-3 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors";

/** Hoy según el reloj de la barbería, no el del aparato que abre el panel. */
function hoyEnLaBarberia(): string {
  const d = ahoraEnArgentina();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function BarberScheduleExceptions({ barbershop, barber, reglaSemanal }: Props) {
  const [excepciones, setExcepciones] = useState<BarberDayOverrideRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [trabaja, setTrabaja] = useState(true);
  const [inicio, setInicio] = useState("09:00");
  const [fin, setFin] = useState("21:00");
  const [modoPausa, setModoPausa] = useState<ModoPausa>("heredar");
  const [pausaInicio, setPausaInicio] = useState("13:00");
  const [pausaFin, setPausaFin] = useState("16:00");
  const [nota, setNota] = useState("");
  const [incluirDiasLibres, setIncluirDiasLibres] = useState(false);

  const reglaDe = useCallback(
    (dia: number): ReglaSemanalDelDia | null => {
      const r = reglaSemanal.find((x) => x.dayOfWeek === dia);
      return r
        ? {
            startTime: r.startTime,
            endTime: r.endTime,
            isWorking: r.isWorking,
            breakStart: r.breakStart,
            breakEnd: r.breakEnd,
          }
        : null;
    },
    [reglaSemanal],
  );

  // Un contador para pedir recarga desde afuera del efecto: llamar setState
  // directo adentro del efecto lo rechaza el lint, y con razón.
  const [recarga, setRecarga] = useState(0);
  const recargar = useCallback(() => setRecarga((n) => n + 1), []);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      const { data, error: e } = await listDayOverridesDesde({
        barbershopSlug: barbershop.slug,
        barberId: barber.id,
        desde: hoyEnLaBarberia(),
      });
      if (!vivo) return;
      if (e) setError("No pudimos cargar los horarios especiales.");
      else setExcepciones((data ?? []) as BarberDayOverrideRow[]);
      setCargando(false);
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, [barbershop.slug, barber.id, recarga]);

  // Qué días va a tocar, calculado mientras escribe: sin esto se guarda a
  // ciegas y después aparecen turnos un domingo sin que nadie sepa por qué.
  const previa =
    desde && hasta
      ? fechasDelRango({
          desde,
          hasta,
          trabajaEseDia: (dia) => reglaDe(dia)?.isWorking ?? false,
          incluirDiasLibres,
        })
      : null;

  function excepcionDelFormulario() {
    return {
      startTime: inicio,
      endTime: fin,
      isWorking: trabaja,
      heredaPausa: modoPausa === "heredar",
      breakStart: modoPausa === "propia" ? pausaInicio : null,
      breakEnd: modoPausa === "propia" ? pausaFin : null,
    };
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!previa) {
      setError("Elegí desde y hasta cuándo.");
      return;
    }
    if (!previa.ok) {
      setError(previa.error);
      return;
    }
    if (trabaja && inicio >= fin) {
      setError("La hora de cierre tiene que ser posterior a la de apertura.");
      return;
    }
    if (trabaja && modoPausa === "propia" && pausaInicio >= pausaFin) {
      setError("Revisá la pausa: el fin tiene que ser posterior al inicio.");
      return;
    }

    // Los turnos que quedarían afuera se AVISAN, no se tocan. Cancelarle el
    // turno a alguien por un cambio de horario no lo decide una pantalla.
    const { data: turnos } = await listAppointmentsByBarbershop(barbershop.slug);
    const enElRango = (turnos ?? []).filter(
      (t) =>
        t.barber_id === barber.id &&
        previa.fechas.includes(t.appointment_date) &&
        (t.status === "pending" || t.status === "confirmed"),
    );

    const afuera = enElRango.filter((t) => {
      const jornada = resolverJornadaDelDia({
        reglaSemanal: reglaDe(new Date(`${t.appointment_date}T12:00:00`).getDay()),
        excepcion: excepcionDelFormulario(),
        horarioBarberia: {
          start: barbershop.workingHours.start,
          end: barbershop.workingHours.end,
        },
      });
      return (
        turnosFueraDeJornada(
          [
            {
              hora: t.appointment_time,
              duracionMinutos: t.service_duration_minutes ?? 30,
              cliente: t.customer_name,
            },
          ],
          jornada,
        ).length > 0
      );
    });

    if (afuera.length > 0) {
      const lista = afuera
        .slice(0, 6)
        .map(
          (t) =>
            `· ${formatDateForDisplay(t.appointment_date)} ${t.appointment_time.slice(0, 5)} — ${t.customer_name}`,
        )
        .join("\n");
      const seguir = await confirm({
        title: `Quedan ${afuera.length} turno${afuera.length === 1 ? "" : "s"} fuera del horario nuevo`,
        message: `${lista}${afuera.length > 6 ? `\n· y ${afuera.length - 6} más` : ""}\n\nNo se cancela ninguno: siguen en pie y los vas a ver en la agenda. Avisales vos.`,
        confirmLabel: "Guardar igual",
        cancelLabel: "Mejor no",
      });
      if (!seguir) return;
    }

    setGuardando(true);
    const { error: e } = await upsertDayOverridesEnLote(
      previa.fechas.map((fecha) => ({
        barbershopSlug: barbershop.slug,
        barberId: barber.id,
        overrideDate: fecha,
        // Con "no trabaja" el horario no significa nada, pero las columnas son
        // NOT NULL y el check pide inicio < fin.
        startTime: trabaja ? inicio : "00:00",
        endTime: trabaja ? fin : "23:59",
        isWorking: trabaja,
        heredaPausa: modoPausa === "heredar",
        breakStart: modoPausa === "propia" ? pausaInicio : null,
        breakEnd: modoPausa === "propia" ? pausaFin : null,
        nota: nota.trim() || null,
      })),
    );
    setGuardando(false);

    if (e) {
      setError("No pudimos guardar el horario especial. Probá de nuevo.");
      return;
    }
    toast.success(
      previa.fechas.length === 1
        ? "Horario cambiado para ese día"
        : `Horario cambiado para ${previa.fechas.length} días`,
    );
    setDesde("");
    setHasta("");
    setNota("");
    recargar();
  }

  async function handleBorrar(fila: BarberDayOverrideRow) {
    const seguir = await confirm({
      title: `Volver al horario de siempre el ${formatDateForDisplay(fila.override_date)}`,
      message: "Ese día vuelve a regirse por el horario semanal del barbero.",
      confirmLabel: "Volver al horario normal",
    });
    if (!seguir) return;
    const { error: e } = await deleteDayOverride(fila.id);
    if (e) {
      toast.error("No pudimos quitar el horario especial.");
      return;
    }
    recargar();
  }

  function descripcion(fila: BarberDayOverrideRow): string {
    if (!fila.is_working) return "No trabaja";
    const horario = `${fila.start_time.slice(0, 5)} a ${fila.end_time.slice(0, 5)}`;
    if (fila.hereda_pausa === false) {
      return fila.break_start
        ? `${horario} · pausa ${fila.break_start.slice(0, 5)} a ${(fila.break_end ?? "").slice(0, 5)}`
        : `${horario} · sin pausa`;
    }
    return horario;
  }

  return (
    <div className="mt-5">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase text-[color:var(--brand-gold)]">
        <CalendarClock className="size-3.5" />
        Horario distinto por unos días
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[color:var(--text-muted)]">
        Para una semana puntual: horas extra, vacaciones, un feriado. El horario
        semanal de {barber.display_name || barber.name} no se toca.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-3 grid gap-3 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">
            Desde
            <input
              type="date"
              value={desde}
              min={hoyEnLaBarberia()}
              onChange={(e) => setDesde(e.target.value)}
              className={inputClass}
              required
            />
          </label>
          <label className="grid gap-1 text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">
            Hasta
            <input
              type="date"
              value={hasta}
              min={desde || hoyEnLaBarberia()}
              onChange={(e) => setHasta(e.target.value)}
              className={inputClass}
              required
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTrabaja(true)}
            className={`${botonModo} ${
              trabaja
                ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                : "border-[color:var(--border-default)] text-[color:var(--text-secondary)]"
            }`}
          >
            Otro horario
          </button>
          <button
            type="button"
            onClick={() => setTrabaja(false)}
            className={`${botonModo} ${
              !trabaja
                ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
                : "border-[color:var(--border-default)] text-[color:var(--text-secondary)]"
            }`}
          >
            No trabaja
          </button>
        </div>

        {trabaja ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">
                Abre
                <input
                  type="time"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
              <label className="grid gap-1 text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">
                Cierra
                <input
                  type="time"
                  value={fin}
                  onChange={(e) => setFin(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
            </div>

            <div className="grid gap-2">
              <span className="text-[11px] uppercase tracking-wide text-[color:var(--text-muted)]">
                La pausa del mediodía
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["heredar", "La de siempre"],
                    ["propia", "Otra"],
                    ["ninguna", "No para"],
                  ] as Array<[ModoPausa, string]>
                ).map(([valor, texto]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setModoPausa(valor)}
                    className={`${botonModo} ${
                      modoPausa === valor
                        ? "border-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                        : "border-[color:var(--border-default)] text-[color:var(--text-secondary)]"
                    }`}
                  >
                    {texto}
                  </button>
                ))}
              </div>
              {modoPausa === "propia" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="time"
                    value={pausaInicio}
                    onChange={(e) => setPausaInicio(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="time"
                    value={pausaFin}
                    onChange={(e) => setPausaFin(e.target.value)}
                    className={inputClass}
                  />
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Motivo (opcional): horas extra, vacaciones…"
          className={inputClass}
          maxLength={60}
        />

        <label className="flex items-center gap-2 text-xs text-[color:var(--text-secondary)]">
          <input
            type="checkbox"
            checked={incluirDiasLibres}
            onChange={(e) => setIncluirDiasLibres(e.target.checked)}
            className="size-4 accent-[color:var(--brand-gold)]"
          />
          Incluir también sus días libres
        </label>

        {previa ? (
          previa.ok ? (
            <p className="text-[11px] leading-4 text-[color:var(--text-muted)]">
              Toca{" "}
              <strong className="text-white">
                {previa.fechas.length} día{previa.fechas.length === 1 ? "" : "s"}
              </strong>
              {previa.salteadas.length > 0
                ? ` · saltea ${previa.salteadas.length} que no trabaja`
                : ""}
              .
            </p>
          ) : (
            <p className="text-[11px] leading-4 text-[color:var(--danger)]">{previa.error}</p>
          )
        ) : null}

        {error ? <p className="text-xs font-semibold text-[color:var(--danger)]">{error}</p> : null}

        <button
          type="submit"
          disabled={guardando || !previa?.ok}
          className="min-h-11 rounded-md bg-gold-grad px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar horario especial"}
        </button>
      </form>

      <div className="mt-3 grid gap-2">
        {cargando ? (
          <p className="text-xs text-[color:var(--text-muted)]">Cargando…</p>
        ) : excepciones.length === 0 ? (
          <p className="text-xs text-[color:var(--text-muted)]">
            Sin horarios especiales cargados.
          </p>
        ) : (
          excepciones.map((fila) => (
            <div
              key={fila.id}
              className="flex items-center justify-between gap-3 rounded-md border border-[color:var(--border-default)] bg-black/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">
                  {formatDateForDisplay(fila.override_date)}
                </p>
                <p className="text-[11px] text-[color:var(--text-muted)]">
                  {descripcion(fila)}
                  {fila.nota ? ` · ${fila.nota}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleBorrar(fila)}
                aria-label={`Quitar el horario especial del ${fila.override_date}`}
                className="flex size-11 shrink-0 items-center justify-center rounded-md border border-[color:var(--border-default)] text-[color:var(--text-muted)] transition hover:border-[color:var(--danger)] hover:text-[color:var(--danger)]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
