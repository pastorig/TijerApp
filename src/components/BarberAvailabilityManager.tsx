"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import {
  buildDefaultWeeklySchedules,
  mergeWeeklySchedulesWithDefaults,
  WEEKDAY_LABELS,
} from "@/lib/availability";
import {
  createTimeBlock,
  deleteTimeBlock,
  listTimeBlocksByBarber,
  listWeeklySchedulesByBarber,
  upsertWeeklySchedulesForBarber,
} from "@/lib/barber-availability";
import { listActiveServicesByBarber } from "@/lib/barber-services";
import { formatDateForDisplay, timeValueToMinutes } from "@/lib/format";
import type { BarberRow, BarberServiceRow } from "@/lib/supabase";

type BarberAvailabilityManagerProps = {
  barbershop: DemoBarbershop;
  barber: BarberRow;
};

type WeeklyScheduleFormRow = {
  dayOfWeek: number;
  label: string;
  startTime: string;
  endTime: string;
  isWorking: boolean;
};

function createInitialBlockForm() {
  return {
    blockDate: "",
    startTime: "13:00",
    endTime: "13:30",
    reason: "",
  };
}

export function BarberAvailabilityManager({
  barbershop,
  barber,
}: BarberAvailabilityManagerProps) {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklyScheduleFormRow[]>(
    buildDefaultWeeklySchedules(barbershop.workingHours),
  );
  const [timeBlocks, setTimeBlocks] = useState<
    Array<{
      id: string;
      block_date: string;
      start_time: string;
      end_time: string;
      reason: string | null;
    }>
  >([]);
  const [services, setServices] = useState<BarberServiceRow[]>([]);
  const [blockForm, setBlockForm] = useState(createInitialBlockForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSchedules, setIsSavingSchedules] = useState(false);
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Análisis "horario vs duración del servicio".
  // Por cada combinación única de (horario, servicio) calcula cuántos
  // cortes entran, cuántos minutos sobran y sugiere extender el cierre
  // si vale la pena meter uno más.
  const horarioAnalysis = useMemo(() => {
    if (services.length === 0) return [];

    type Combo = {
      label: string;
      startTime: string;
      endTime: string;
      service: BarberServiceRow;
      windowMinutes: number;
      cutsFitting: number;
      leftoverMinutes: number;
      suggestedEndTime: string | null;
    };

    function formatMinutes(total: number): string {
      const safe = ((total % 1440) + 1440) % 1440;
      const h = Math.floor(safe / 60)
        .toString()
        .padStart(2, "0");
      const m = (safe % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    }

    // Agrupamos días activos por (start, end) para un solo análisis por horario.
    const groups = new Map<
      string,
      { label: string; startTime: string; endTime: string; days: number[] }
    >();
    for (const schedule of weeklySchedules) {
      if (!schedule.isWorking) continue;
      const key = `${schedule.startTime}-${schedule.endTime}`;
      const existing = groups.get(key);
      if (existing) {
        existing.days.push(schedule.dayOfWeek);
      } else {
        groups.set(key, {
          label: "",
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          days: [schedule.dayOfWeek],
        });
      }
    }

    function daysLabel(days: number[]): string {
      const sorted = [...days].sort((a, b) => a - b);
      const short = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      return sorted.map((d) => short[d]).join("·");
    }

    const combos: Combo[] = [];
    for (const group of groups.values()) {
      const startMinutes = timeValueToMinutes(group.startTime);
      const endMinutes = timeValueToMinutes(group.endTime);
      const windowMinutes = endMinutes - startMinutes;
      if (windowMinutes <= 0) continue;

      for (const service of services) {
        const duration = service.duration_minutes ?? 0;
        if (duration <= 0) continue;

        const cutsFitting = Math.floor(windowMinutes / duration);
        const leftoverMinutes = windowMinutes - cutsFitting * duration;
        // Sugerimos extender solo si sobra ≥ 1 min y el corte extra entraría
        // con menos de la duración extra (ej: sobran 30 min, faltarían 15
        // para meter el corte de 45 → sugerimos +15).
        let suggestedEndTime: string | null = null;
        if (leftoverMinutes > 0) {
          const missingMinutes = duration - leftoverMinutes;
          suggestedEndTime = formatMinutes(endMinutes + missingMinutes);
        }

        combos.push({
          label: daysLabel(group.days),
          startTime: group.startTime,
          endTime: group.endTime,
          service,
          windowMinutes,
          cutsFitting,
          leftoverMinutes,
          suggestedEndTime,
        });
      }
    }
    return combos;
  }, [weeklySchedules, services]);

  const sortedBlocks = useMemo(
    () =>
      [...timeBlocks].sort((firstBlock, secondBlock) => {
        if (firstBlock.block_date === secondBlock.block_date) {
          return firstBlock.start_time.localeCompare(secondBlock.start_time);
        }

        return firstBlock.block_date.localeCompare(secondBlock.block_date);
      }),
    [timeBlocks],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAvailabilityData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [schedulesResult, blocksResult, servicesResult] =
          await Promise.all([
            listWeeklySchedulesByBarber({
              barbershopSlug: barbershop.slug,
              barberId: barber.id,
            }),
            listTimeBlocksByBarber({
              barbershopSlug: barbershop.slug,
              barberId: barber.id,
            }),
            listActiveServicesByBarber({
              barbershopSlug: barbershop.slug,
              barberId: barber.id,
            }),
          ]);

        if (!isMounted) {
          return;
        }

        if (schedulesResult.error || blocksResult.error) {
          setErrorMessage("No pudimos cargar horarios y bloqueos.");
          return;
        }

        setWeeklySchedules(
          mergeWeeklySchedulesWithDefaults(
            schedulesResult.data ?? [],
            barbershop.workingHours,
          ),
        );
        setTimeBlocks(blocksResult.data ?? []);
        setServices(servicesResult.data ?? []);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar horarios y bloqueos.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAvailabilityData();

    return () => {
      isMounted = false;
    };
  }, [barber.id, barbershop.slug, barbershop.workingHours]);

  function updateScheduleRow(
    dayOfWeek: number,
    field: keyof Omit<WeeklyScheduleFormRow, "dayOfWeek" | "label">,
    value: boolean | string,
  ) {
    setWeeklySchedules((currentSchedules) =>
      currentSchedules.map((schedule) =>
        schedule.dayOfWeek === dayOfWeek
          ? { ...schedule, [field]: value }
          : schedule,
      ),
    );
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSaveSchedules(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const invalidSchedule = weeklySchedules.find(
      (schedule) =>
        schedule.isWorking && schedule.startTime >= schedule.endTime,
    );

    if (invalidSchedule) {
      setErrorMessage(
        `Revisa ${WEEKDAY_LABELS[invalidSchedule.dayOfWeek]}. El cierre debe ser posterior a la apertura.`,
      );
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSavingSchedules(true);

    try {
      const { data, error } = await upsertWeeklySchedulesForBarber({
        barbershopSlug: barbershop.slug,
        barberId: barber.id,
        schedules: weeklySchedules.map((schedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isWorking: schedule.isWorking,
        })),
      });

      if (error) {
        setErrorMessage("No pudimos guardar los horarios semanales.");
        return;
      }

      setWeeklySchedules(
        mergeWeeklySchedulesWithDefaults(data ?? [], barbershop.workingHours),
      );
      setSuccessMessage("Horarios semanales guardados.");
    } catch {
      setErrorMessage("No pudimos guardar los horarios semanales.");
    } finally {
      setIsSavingSchedules(false);
    }
  }

  async function handleCreateBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!blockForm.blockDate || blockForm.startTime >= blockForm.endTime) {
      setErrorMessage("Revisa fecha, inicio y fin del bloqueo.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsCreatingBlock(true);

    try {
      const { data, error } = await createTimeBlock({
        barbershop_slug: barbershop.slug,
        barber_id: barber.id,
        block_date: blockForm.blockDate,
        start_time: blockForm.startTime,
        end_time: blockForm.endTime,
        reason: blockForm.reason.trim() || null,
        is_active: true,
        deleted_at: null,
      });

      if (error || !data) {
        setErrorMessage("No pudimos crear el bloqueo.");
        return;
      }

      setTimeBlocks((currentBlocks) => [...currentBlocks, data]);
      setBlockForm(createInitialBlockForm());
      setSuccessMessage("Bloqueo creado correctamente.");
    } catch {
      setErrorMessage("No pudimos crear el bloqueo.");
    } finally {
      setIsCreatingBlock(false);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    const shouldDelete = window.confirm(
      "Eliminar este bloqueo manual?",
    );

    if (!shouldDelete) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setDeletingBlockId(blockId);

    try {
      const { error } = await deleteTimeBlock(blockId);

      if (error) {
        setErrorMessage("No pudimos eliminar el bloqueo.");
        return;
      }

      setTimeBlocks((currentBlocks) =>
        currentBlocks.filter((block) => block.id !== blockId),
      );
      setSuccessMessage("Bloqueo eliminado.");
    } catch {
      setErrorMessage("No pudimos eliminar el bloqueo.");
    } finally {
      setDeletingBlockId(null);
    }
  }

  return (
    <section className="mt-4 rounded-md border border-[color:var(--border-default)] bg-black/60 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-[color:var(--brand-gold)]">
            Disponibilidad
          </p>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Horarios semanales y bloqueos manuales por barbero.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-md border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--danger)]">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-3 rounded-md border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--success)]">
          {successMessage}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Cargando disponibilidad...
        </p>
      ) : (
        <>
          <form onSubmit={handleSaveSchedules} className="mt-4">
            <div className="grid gap-2">
              {weeklySchedules.map((schedule) => (
                <div
                  key={schedule.dayOfWeek}
                  className="grid grid-cols-[minmax(92px,1fr)_auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {schedule.label}
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                    <input
                      type="checkbox"
                      checked={schedule.isWorking}
                      onChange={(event) =>
                        updateScheduleRow(
                          schedule.dayOfWeek,
                          "isWorking",
                          event.target.checked,
                        )
                      }
                      className="size-4 accent-[color:var(--brand-gold)]"
                    />
                    Activo
                  </label>
                  <input
                    type="time"
                    value={schedule.startTime}
                    disabled={!schedule.isWorking || isSavingSchedules}
                    onChange={(event) =>
                      updateScheduleRow(
                        schedule.dayOfWeek,
                        "startTime",
                        event.target.value,
                      )
                    }
                    className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)] disabled:opacity-60"
                  />
                  <input
                    type="time"
                    value={schedule.endTime}
                    disabled={!schedule.isWorking || isSavingSchedules}
                    onChange={(event) =>
                      updateScheduleRow(
                        schedule.dayOfWeek,
                        "endTime",
                        event.target.value,
                      )
                    }
                    className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)] disabled:opacity-60"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSavingSchedules}
              className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-3 py-2 text-[11px] font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingSchedules ? "Guardando..." : "Guardar horarios"}
            </button>
          </form>

          {horarioAnalysis.length > 0 ? (
            <div className="mt-5 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3">
              <p className="text-[11px] font-bold uppercase text-[color:var(--brand-gold)]">
                Aprovechamiento del horario
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Cuántos cortes entran en tu jornada con cada duración de
                servicio. Si sobran minutos, te sugerimos cómo cerrar más
                tarde para meter uno más.
              </p>
              <ul className="mt-3 grid gap-2">
                {horarioAnalysis.map((combo) => {
                  const totalIfExtended = combo.cutsFitting + 1;
                  return (
                    <li
                      key={`${combo.label}-${combo.service.id}`}
                      className="rounded-md border border-[color:var(--border-default)] bg-black/30 px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-white">
                        <span className="text-[color:var(--brand-gold)]">
                          {combo.label}
                        </span>{" "}
                        {combo.startTime}–{combo.endTime}
                        <span className="mx-1 text-[color:var(--text-subtle)]">
                          ·
                        </span>
                        {combo.service.name}{" "}
                        <span className="font-mono text-[10px] text-[color:var(--text-muted)]">
                          ({combo.service.duration_minutes} min)
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                        Entran{" "}
                        <span className="font-mono font-bold text-white">
                          {combo.cutsFitting}
                        </span>{" "}
                        {combo.cutsFitting === 1 ? "corte" : "cortes"}
                        {combo.leftoverMinutes > 0 ? (
                          <>
                            {" · sobran "}
                            <span className="font-mono font-bold text-[color:var(--brand-gold)]">
                              {combo.leftoverMinutes} min
                            </span>
                          </>
                        ) : (
                          <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--success)]">
                            · aprovechás el 100%
                          </span>
                        )}
                      </p>
                      {combo.suggestedEndTime ? (
                        <p className="mt-1 text-[11px] text-[color:var(--text-secondary)]">
                          Cerrá a las{" "}
                          <span className="font-mono font-bold text-[color:var(--brand-gold)]">
                            {combo.suggestedEndTime}
                          </span>{" "}
                          y metés{" "}
                          <span className="font-bold text-white">
                            {totalIfExtended}
                          </span>{" "}
                          {totalIfExtended === 1 ? "corte" : "cortes"}.
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase text-[color:var(--brand-gold)]">
              Bloqueos manuales
            </p>

            <form
              onSubmit={handleCreateBlock}
              className="mt-3 grid gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_0.9fr_0.9fr]">
                <input
                  type="date"
                  value={blockForm.blockDate}
                  disabled={isCreatingBlock}
                  onChange={(event) =>
                    setBlockForm((currentValue) => ({
                      ...currentValue,
                      blockDate: event.target.value,
                    }))
                  }
                  className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  required
                />
                <input
                  type="time"
                  value={blockForm.startTime}
                  disabled={isCreatingBlock}
                  onChange={(event) =>
                    setBlockForm((currentValue) => ({
                      ...currentValue,
                      startTime: event.target.value,
                    }))
                  }
                  className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  required
                />
                <input
                  type="time"
                  value={blockForm.endTime}
                  disabled={isCreatingBlock}
                  onChange={(event) =>
                    setBlockForm((currentValue) => ({
                      ...currentValue,
                      endTime: event.target.value,
                    }))
                  }
                  className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                  required
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={blockForm.reason}
                  disabled={isCreatingBlock}
                  onChange={(event) =>
                    setBlockForm((currentValue) => ({
                      ...currentValue,
                      reason: event.target.value,
                    }))
                  }
                  className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                  placeholder="Motivo opcional"
                />
                <button
                  type="submit"
                  disabled={isCreatingBlock}
                  className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--border-default)] px-3 py-2 text-[11px] font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCreatingBlock ? "Agregando..." : "Agregar bloqueo"}
                </button>
              </div>
            </form>

            <div className="mt-3 grid gap-2">
              {sortedBlocks.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">
                  Sin bloqueos manuales cargados.
                </p>
              ) : (
                sortedBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex flex-col gap-2 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {formatDateForDisplay(block.block_date)} · {block.start_time} a{" "}
                        {block.end_time}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                        {block.reason || "Bloqueo manual"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deletingBlockId === block.id}
                      onClick={() => handleDeleteBlock(block.id)}
                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-[color:var(--danger)]/40 px-3 py-2 text-[11px] font-bold uppercase text-[color:var(--danger)] transition hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingBlockId === block.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
