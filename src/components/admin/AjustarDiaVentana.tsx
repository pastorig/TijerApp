"use client";

/**
 * "Horario y bloqueos" de un día (feature 042): en una sola ventana, el
 * horario de ese día para un barbero (normal, distinto o no trabaja) y sus
 * bloqueos, que se pueden editar, quitar o sumar.
 *
 * Antes el horario distinto vivía en Barberos → Horarios y el Turnero solo
 * dejaba crear bloqueos, sin editarlos. Escribe en las mismas tablas que esas
 * pantallas: lo que se cambia acá se ve allá y viceversa.
 */

import { useCallback, useEffect, useState } from "react";
import { Ban, CalendarClock, Pencil, Plus, Trash2, X } from "lucide-react";
import { Ventana, useCerrarVentana } from "@/components/ui/Ventana";
import { Interruptor } from "@/components/ui/Interruptor";
import { useToast } from "@/components/ui";
import {
  createTimeBlock,
  deleteDayOverride,
  deleteTimeBlock,
  listDayOverridesByBarber,
  listTimeBlocksByBarber,
  updateTimeBlock,
  upsertDayOverrideForBarber,
} from "@/lib/barber-availability";
import { getDayOfWeekFromDate } from "@/lib/availability";
import {
  cambioDeHorario,
  errorDeTramo,
  hhmm,
  modoActual,
  textoDelHorario,
  type ModoDelDia,
} from "@/lib/ajustar-dia";
import type { BarberDayOverrideRow, BarberTimeBlockRow, BarberWeeklyScheduleRow } from "@/lib/supabase";

type Barbero = { id: string; name: string };

const campo =
  "min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-base text-white outline-none focus:border-[color:var(--brand-gold)] sm:text-sm";
const etiqueta = "text-xs font-semibold text-[color:var(--text-secondary)]";
const botonSecundario =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-xs font-bold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:opacity-50";
const botonDorado =
  "bg-gold-grad inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-4 text-xs font-bold text-black transition hover:brightness-110 disabled:opacity-50";

function etiquetaDeFecha(fecha: string) {
  const d = new Date(`${fecha}T12:00:00`);
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

export function AjustarDiaVentana({
  fecha,
  barbershopSlug,
  barbers,
  preselectedBarberId,
  weeklySchedulesByBarber,
  soloLectura,
  onClose,
  onCambio,
}: {
  /** El día a ajustar (YYYY-MM-DD). */
  fecha: string;
  barbershopSlug: string;
  barbers: Barbero[];
  preselectedBarberId?: string;
  weeklySchedulesByBarber: Record<string, BarberWeeklyScheduleRow[]>;
  soloLectura: boolean;
  onClose: () => void;
  /** Se cambió algo: el Turnero vuelve a cargar el día. */
  onCambio: () => void;
}) {
  return (
    <Ventana
      label="Horario y bloqueos del día"
      onClose={onClose}
      capa="z-50"
      panelClassName="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl sm:rounded-[var(--radius-lg)]"
    >
      <Contenido
        fecha={fecha}
        barbershopSlug={barbershopSlug}
        barbers={barbers}
        preselectedBarberId={preselectedBarberId}
        weeklySchedulesByBarber={weeklySchedulesByBarber}
        soloLectura={soloLectura}
        onCambio={onCambio}
      />
    </Ventana>
  );
}

function Contenido({
  fecha,
  barbershopSlug,
  barbers,
  preselectedBarberId,
  weeklySchedulesByBarber,
  soloLectura,
  onCambio,
}: Omit<Parameters<typeof AjustarDiaVentana>[0], "onClose">) {
  const toast = useToast();
  const cerrar = useCerrarVentana();
  const [barberId, setBarberId] = useState(
    preselectedBarberId && barbers.some((b) => b.id === preselectedBarberId) ? preselectedBarberId : (barbers[0]?.id ?? ""),
  );
  const [cargando, setCargando] = useState(true);
  const [excepcion, setExcepcion] = useState<BarberDayOverrideRow | null>(null);
  const [bloqueos, setBloqueos] = useState<BarberTimeBlockRow[]>([]);
  const [modo, setModo] = useState<ModoDelDia>("normal");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const semanal =
    (weeklySchedulesByBarber[barberId] ?? []).find((s) => s.day_of_week === getDayOfWeekFromDate(fecha)) ?? null;

  const cargar = useCallback(async () => {
    if (!barberId) return;
    setCargando(true);
    const [exc, blo] = await Promise.all([
      listDayOverridesByBarber({ barbershopSlug, barberId, overrideDate: fecha }),
      listTimeBlocksByBarber({ barbershopSlug, barberId, blockDate: fecha }),
    ]);
    const e = exc.data?.[0] ?? null;
    setExcepcion(e);
    setBloqueos(blo.data ?? []);
    setModo(modoActual(e));
    const base = e?.is_working ? e : semanal?.is_working ? semanal : null;
    setDesde(hhmm(base?.start_time) || "09:00");
    setHasta(hhmm(base?.end_time) || "18:00");
    setError("");
    setCargando(false);
    // `semanal` se recalcula con barberId; no hace falta como dependencia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId, barbershopSlug, fecha]);

  useEffect(() => {
    // La carga es asíncrona: los setState pasan después del await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void cargar();
  }, [cargar]);

  async function guardarHorario() {
    const cambio = cambioDeHorario(modo, desde, hasta, semanal);
    if ("error" in cambio) {
      setError(cambio.error);
      return;
    }
    setError("");
    setGuardando(true);
    try {
      if (cambio.accion === "borrar") {
        if (excepcion) {
          const { error: e } = await deleteDayOverride(excepcion.id);
          if (e) throw e;
        }
      } else {
        const { error: e } = await upsertDayOverrideForBarber({
          barbershopSlug,
          barberId,
          overrideDate: fecha,
          startTime: cambio.start,
          endTime: cambio.end,
          isWorking: cambio.isWorking,
          heredaPausa: true,
        });
        if (e) throw e;
      }
      toast.success("Horario del día guardado");
      onCambio();
      await cargar();
    } catch {
      setError("No pudimos guardar el horario. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const nombre = barbers.find((b) => b.id === barberId)?.name ?? "";
  const cambioPendiente =
    modo !== modoActual(excepcion) ||
    (modo === "distinto" && (desde !== hhmm(excepcion?.start_time) || hasta !== hhmm(excepcion?.end_time)));

  return (
    <div>
      <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border-subtle)] px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[color:var(--brand-gold)]">Horario y bloqueos</p>
          <p className="mt-0.5 text-xs capitalize text-[color:var(--text-muted)]">{etiquetaDeFecha(fecha)}</p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        {barbers.length > 1 ? (
          barbers.length <= 4 ? (
            <Interruptor
              ariaLabel="Barbero"
              opciones={barbers.map((b) => ({ valor: b.id, label: b.name.split(" ")[0] }))}
              valor={barberId}
              onChange={setBarberId}
            />
          ) : (
            <label className="block">
              <span className={etiqueta}>Barbero</span>
              <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className={`mt-1.5 ${campo}`}>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )
        ) : null}

        {/* ── Horario de este día ── */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-[color:var(--brand-gold)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white">Horario de este día</h3>
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">
            Normalmente {nombre ? `${nombre.split(" ")[0]}: ` : ""}
            <span className="font-semibold text-[color:var(--text-secondary)]">{textoDelHorario(semanal)}</span>
          </p>
          <Interruptor
            ariaLabel="Horario de este día"
            opciones={[
              { valor: "normal", label: "Normal" },
              { valor: "distinto", label: "Distinto" },
              { valor: "franco", label: "No trabaja" },
            ]}
            valor={modo}
            onChange={(m) => {
              setModo(m);
              setError("");
            }}
          />
          {modo === "distinto" ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={etiqueta}>Desde</span>
                <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} className={`mt-1.5 ${campo}`} />
              </label>
              <label className="block">
                <span className={etiqueta}>Hasta</span>
                <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`mt-1.5 ${campo}`} />
              </label>
            </div>
          ) : null}
          {modo === "franco" ? (
            <p className="text-xs text-[color:var(--text-muted)]">Ese día no se va a poder reservar con este barbero.</p>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs font-semibold text-[color:var(--danger)]">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void guardarHorario()}
            disabled={soloLectura || guardando || cargando || !cambioPendiente}
            className={`${botonDorado} w-full`}
          >
            {guardando ? "Guardando…" : "Guardar horario del día"}
          </button>
        </section>

        {/* ── Horarios bloqueados ── */}
        <section className="space-y-3 border-t border-[color:var(--border-subtle)] pt-5">
          <div className="flex items-center gap-2">
            <Ban className="size-4 text-[color:var(--brand-gold)]" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white">Horarios bloqueados</h3>
          </div>
          {cargando ? (
            <p className="text-xs text-[color:var(--text-muted)]">Cargando…</p>
          ) : bloqueos.length === 0 ? (
            <p className="text-xs text-[color:var(--text-muted)]">No hay horarios bloqueados este día.</p>
          ) : (
            <ul className="space-y-2">
              {bloqueos.map((b) => (
                <FilaDeBloqueo
                  key={b.id}
                  bloqueo={b}
                  soloLectura={soloLectura}
                  onCambio={async () => {
                    onCambio();
                    await cargar();
                  }}
                />
              ))}
            </ul>
          )}
          <NuevoBloqueo
            disabled={soloLectura || cargando}
            onCrear={async (inicio, fin, motivo) => {
              const { error: e } = await createTimeBlock({
                barbershop_slug: barbershopSlug,
                barber_id: barberId,
                block_date: fecha,
                start_time: inicio,
                end_time: fin,
                reason: motivo || null,
                is_active: true,
                deleted_at: null,
              });
              if (e) return "No pudimos bloquear ese horario.";
              toast.success("Horario bloqueado");
              onCambio();
              await cargar();
              return null;
            }}
          />
        </section>
      </div>
    </div>
  );
}

function FilaDeBloqueo({
  bloqueo,
  soloLectura,
  onCambio,
}: {
  bloqueo: BarberTimeBlockRow;
  soloLectura: boolean;
  onCambio: () => Promise<void>;
}) {
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [desde, setDesde] = useState(hhmm(bloqueo.start_time));
  const [hasta, setHasta] = useState(hhmm(bloqueo.end_time));
  const [motivo, setMotivo] = useState(bloqueo.reason ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  async function guardar() {
    const e = errorDeTramo(desde, hasta);
    if (e) {
      setError(e);
      return;
    }
    setOcupado(true);
    const { error: err } = await updateTimeBlock({
      blockId: bloqueo.id,
      values: { start_time: desde, end_time: hasta, reason: motivo.trim() || null },
    });
    setOcupado(false);
    if (err) {
      setError("No pudimos guardar el cambio.");
      return;
    }
    toast.success("Bloqueo actualizado");
    setEditando(false);
    await onCambio();
  }

  async function quitar() {
    setOcupado(true);
    const { error: err } = await deleteTimeBlock(bloqueo.id);
    setOcupado(false);
    if (err) {
      toast.error("No pudimos quitar el bloqueo.");
      return;
    }
    toast.success("Bloqueo quitado");
    await onCambio();
  }

  if (editando) {
    return (
      <li className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-1)] p-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={etiqueta}>Desde</span>
            <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} className={`mt-1.5 ${campo}`} />
          </label>
          <label className="block">
            <span className={etiqueta}>Hasta</span>
            <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`mt-1.5 ${campo}`} />
          </label>
        </div>
        <label className="block">
          <span className={etiqueta}>Motivo (opcional)</span>
          <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: almuerzo, trámite" className={`mt-1.5 ${campo}`} />
        </label>
        {error ? <p role="alert" className="text-xs font-semibold text-[color:var(--danger)]">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setEditando(false)} disabled={ocupado} className={botonSecundario}>
            Cancelar
          </button>
          <button type="button" onClick={() => void guardar()} disabled={ocupado} className={botonDorado}>
            {ocupado ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-bold text-white">
          {hhmm(bloqueo.start_time)} – {hhmm(bloqueo.end_time)}
        </p>
        {bloqueo.reason ? <p className="truncate text-xs text-[color:var(--text-muted)]">{bloqueo.reason}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => setEditando(true)}
        disabled={soloLectura || ocupado}
        aria-label={`Editar bloqueo de ${hhmm(bloqueo.start_time)}`}
        className={`${botonSecundario} size-11 px-0`}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => void quitar()}
        disabled={soloLectura || ocupado}
        aria-label={`Quitar bloqueo de ${hhmm(bloqueo.start_time)}`}
        className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-soft)] disabled:opacity-50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

function NuevoBloqueo({
  disabled,
  onCrear,
}: {
  disabled: boolean;
  /** Devuelve el error para mostrar, o null si salió bien. */
  onCrear: (desde: string, hasta: string, motivo: string) => Promise<string | null>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} disabled={disabled} className={`${botonSecundario} w-full`}>
        <Plus className="size-4" aria-hidden="true" />
        Bloquear un horario
      </button>
    );
  }

  async function crear() {
    const e = errorDeTramo(desde, hasta);
    if (e) {
      setError(e);
      return;
    }
    setOcupado(true);
    const err = await onCrear(desde, hasta, motivo.trim());
    setOcupado(false);
    if (err) {
      setError(err);
      return;
    }
    setAbierto(false);
    setDesde("");
    setHasta("");
    setMotivo("");
    setError("");
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--brand-gold)]/30 bg-[color:var(--surface-1)] p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={etiqueta}>Desde</span>
          <input type="time" value={desde} onChange={(e) => setDesde(e.target.value)} className={`mt-1.5 ${campo}`} />
        </label>
        <label className="block">
          <span className={etiqueta}>Hasta</span>
          <input type="time" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`mt-1.5 ${campo}`} />
        </label>
      </div>
      <label className="block">
        <span className={etiqueta}>Motivo (opcional)</span>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: almuerzo, trámite" className={`mt-1.5 ${campo}`} />
      </label>
      {error ? <p role="alert" className="text-xs font-semibold text-[color:var(--danger)]">{error}</p> : null}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setAbierto(false)} disabled={ocupado} className={botonSecundario}>
          Cancelar
        </button>
        <button type="button" onClick={() => void crear()} disabled={ocupado} className={botonDorado}>
          {ocupado ? "Bloqueando…" : "Bloquear"}
        </button>
      </div>
    </div>
  );
}
