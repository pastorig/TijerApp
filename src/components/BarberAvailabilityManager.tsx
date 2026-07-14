"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { cn } from "@/lib/cn";
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
import { useConfirm } from "@/components/ui";
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
  // Pausa al medio opcional. Si breakStart y breakEnd están ambos
  // seteados, el barbero hace una pausa entre esos horarios y los
  // slots dentro no aparecen como disponibles. Null = sin pausa.
  breakStart: string | null;
  breakEnd: string | null;
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
  const confirm = useConfirm();
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
  const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Análisis "horario vs duración del servicio".
  // Agrupado por servicio: una entrada por servicio activo, con filas
  // por cada combinación única de días con el mismo horario.
  const horarioAnalysis = useMemo(() => {
    if (services.length === 0) return [];

    type ScheduleRow = {
      days: number[];
      daysLabel: string;
      startTime: string;
      endTime: string;
      windowMinutes: number;
      cutsFitting: number;
      leftoverMinutes: number;
      suggestedEndTime: string | null;
    };

    type ServiceAnalysis = {
      service: BarberServiceRow;
      rows: ScheduleRow[];
    };

    function formatMinutes(total: number): string {
      const safe = ((total % 1440) + 1440) % 1440;
      const h = Math.floor(safe / 60)
        .toString()
        .padStart(2, "0");
      const m = (safe % 60).toString().padStart(2, "0");
      return `${h}:${m}`;
    }

    function daysLabel(days: number[]): string {
      const sorted = [...days].sort((a, b) => a - b);
      const short = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      // Si son 5+ días consecutivos, mostrar como rango (ej "Lun-Vie").
      const isContiguous =
        sorted.length >= 3 &&
        sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
      if (isContiguous) {
        return `${short[sorted[0]]}-${short[sorted[sorted.length - 1]]}`;
      }
      return sorted.map((d) => short[d]).join("·");
    }

    // Agrupamos días activos por (start, end) para un solo análisis por horario.
    const groups = new Map<
      string,
      { startTime: string; endTime: string; days: number[] }
    >();
    for (const schedule of weeklySchedules) {
      if (!schedule.isWorking) continue;
      const key = `${schedule.startTime}-${schedule.endTime}`;
      const existing = groups.get(key);
      if (existing) {
        existing.days.push(schedule.dayOfWeek);
      } else {
        groups.set(key, {
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          days: [schedule.dayOfWeek],
        });
      }
    }

    const analyses: ServiceAnalysis[] = [];
    for (const service of services) {
      const duration = service.duration_minutes ?? 0;
      if (duration <= 0) continue;

      const rows: ScheduleRow[] = [];
      for (const group of groups.values()) {
        const startMinutes = timeValueToMinutes(group.startTime);
        const endMinutes = timeValueToMinutes(group.endTime);
        const windowMinutes = endMinutes - startMinutes;
        if (windowMinutes <= 0) continue;

        const cutsFitting = Math.floor(windowMinutes / duration);
        const leftoverMinutes = windowMinutes - cutsFitting * duration;
        let suggestedEndTime: string | null = null;
        if (leftoverMinutes > 0) {
          const missingMinutes = duration - leftoverMinutes;
          suggestedEndTime = formatMinutes(endMinutes + missingMinutes);
        }

        rows.push({
          days: group.days,
          daysLabel: daysLabel(group.days),
          startTime: group.startTime,
          endTime: group.endTime,
          windowMinutes,
          cutsFitting,
          leftoverMinutes,
          suggestedEndTime,
        });
      }

      if (rows.length > 0) analyses.push({ service, rows });
    }
    return analyses;
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
    value: boolean | string | null,
  ) {
    setWeeklySchedules((currentSchedules) =>
      currentSchedules.map((schedule) => {
        if (schedule.dayOfWeek !== dayOfWeek) return schedule;
        // breakStart/breakEnd: si value es "" o null, lo guardamos como null.
        // Eso mantiene la invariante "ambos null o ambos seteados" del DB
        // constraint (la UI controla el toggle como pareja, pero nunca está
        // de más este safety).
        if (
          (field === "breakStart" || field === "breakEnd") &&
          (value === "" || value === null)
        ) {
          return { ...schedule, [field]: null };
        }
        return { ...schedule, [field]: value };
      }),
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

    // Validación de la pausa al medio (si hay).
    const invalidBreak = weeklySchedules.find((schedule) => {
      if (!schedule.isWorking) return false;
      const hasStart = Boolean(schedule.breakStart);
      const hasEnd = Boolean(schedule.breakEnd);
      // Ambos o ninguno
      if (hasStart !== hasEnd) return true;
      if (!hasStart) return false;
      // breakStart < breakEnd
      if (schedule.breakStart! >= schedule.breakEnd!) return true;
      // Dentro del rango startTime..endTime
      if (schedule.breakStart! < schedule.startTime) return true;
      if (schedule.breakEnd! > schedule.endTime) return true;
      return false;
    });

    if (invalidBreak) {
      setErrorMessage(
        `Revisa la pausa del ${WEEKDAY_LABELS[invalidBreak.dayOfWeek]}: tiene que estar dentro del horario de trabajo y el fin debe ser posterior al inicio.`,
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
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
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

  async function handleApplySuggestion(
    daysList: number[],
    newEndTime: string,
  ) {
    const daysNames = daysList
      .map((d) => WEEKDAY_LABELS[d])
      .join(", ");
    const ok = await confirm({
      title: "Aplicar nuevo cierre",
      message: `Vas a actualizar el horario de cierre a las ${newEndTime} para ${daysNames}.`,
      confirmLabel: "Aplicar",
      cancelLabel: "Volver",
    });
    if (!ok) return;

    setErrorMessage("");
    setSuccessMessage("");
    setIsApplyingSuggestion(true);

    const targetDays = new Set(daysList);
    const updated = weeklySchedules.map((schedule) =>
      targetDays.has(schedule.dayOfWeek)
        ? { ...schedule, endTime: newEndTime }
        : schedule,
    );

    try {
      const { data, error } = await upsertWeeklySchedulesForBarber({
        barbershopSlug: barbershop.slug,
        barberId: barber.id,
        schedules: updated.map((schedule) => ({
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isWorking: schedule.isWorking,
          breakStart: schedule.breakStart,
          breakEnd: schedule.breakEnd,
        })),
      });

      if (error) {
        setErrorMessage("No pudimos aplicar la sugerencia.");
        return;
      }

      setWeeklySchedules(
        mergeWeeklySchedulesWithDefaults(data ?? [], barbershop.workingHours),
      );
      setSuccessMessage(
        `Horario actualizado: ${daysNames} cierran a las ${newEndTime}.`,
      );
    } catch {
      setErrorMessage("No pudimos aplicar la sugerencia.");
    } finally {
      setIsApplyingSuggestion(false);
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
    const shouldDelete = await confirm({
      title: "Eliminar bloqueo",
      message: "El horario vuelve a estar disponible para reservas.",
      confirmLabel: "Eliminar",
      cancelLabel: "Volver",
      danger: true,
    });

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
            <div className="space-y-2">
              {weeklySchedules.map((schedule) => {
                const hasBreak =
                  schedule.breakStart !== null && schedule.breakEnd !== null;
                return (
                  <div
                    key={schedule.dayOfWeek}
                    className={cn(
                      "rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-3 sm:flex sm:items-center sm:gap-4 sm:py-2.5",
                      !schedule.isWorking && "opacity-70",
                    )}
                  >
                    {/* Día + toggle */}
                    <div className="flex items-center justify-between gap-3 sm:w-[140px] sm:shrink-0 sm:justify-start">
                      <span className="text-sm font-bold text-white">
                        {schedule.label}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={schedule.isWorking}
                        aria-label={`${schedule.label} activo`}
                        disabled={isSavingSchedules}
                        onClick={() =>
                          updateScheduleRow(
                            schedule.dayOfWeek,
                            "isWorking",
                            !schedule.isWorking,
                          )
                        }
                        className={cn(
                          "relative h-5 w-9 shrink-0 rounded-full transition disabled:opacity-60",
                          schedule.isWorking
                            ? "bg-[color:var(--brand-gold)]"
                            : "bg-white/15",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                            schedule.isWorking ? "left-[18px]" : "left-0.5",
                          )}
                        />
                      </button>
                    </div>

                    {/* Campos del día */}
                    {schedule.isWorking ? (
                      <div className="mt-3 flex flex-col gap-2.5 sm:mt-0 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
                        {/* Horario */}
                        <div className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)] sm:w-auto">
                            Horario
                          </span>
                          <input
                            type="time"
                            value={schedule.startTime}
                            disabled={isSavingSchedules}
                            onChange={(event) =>
                              updateScheduleRow(
                                schedule.dayOfWeek,
                                "startTime",
                                event.target.value,
                              )
                            }
                            className="min-h-9 w-[104px] rounded-md border border-[color:var(--border-default)] bg-black px-2 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                          />
                          <span className="text-[color:var(--text-subtle)]">
                            →
                          </span>
                          <input
                            type="time"
                            value={schedule.endTime}
                            disabled={isSavingSchedules}
                            onChange={(event) =>
                              updateScheduleRow(
                                schedule.dayOfWeek,
                                "endTime",
                                event.target.value,
                              )
                            }
                            className="min-h-9 w-[104px] rounded-md border border-[color:var(--border-default)] bg-black px-2 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                          />
                        </div>

                        {/* Pausa */}
                        <div className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)] sm:w-auto">
                            Pausa
                          </span>
                          {hasBreak ? (
                            <>
                              <input
                                type="time"
                                value={schedule.breakStart ?? ""}
                                disabled={isSavingSchedules}
                                onChange={(event) =>
                                  updateScheduleRow(
                                    schedule.dayOfWeek,
                                    "breakStart",
                                    event.target.value,
                                  )
                                }
                                className="min-h-9 w-[92px] rounded-md border border-[color:var(--border-default)] bg-black px-2 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                              />
                              <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                                a
                              </span>
                              <input
                                type="time"
                                value={schedule.breakEnd ?? ""}
                                disabled={isSavingSchedules}
                                onChange={(event) =>
                                  updateScheduleRow(
                                    schedule.dayOfWeek,
                                    "breakEnd",
                                    event.target.value,
                                  )
                                }
                                className="min-h-9 w-[92px] rounded-md border border-[color:var(--border-default)] bg-black px-2 text-sm text-white outline-none transition focus:border-[color:var(--brand-gold)]"
                              />
                              <button
                                type="button"
                                aria-label="Quitar pausa"
                                disabled={isSavingSchedules}
                                onClick={() => {
                                  updateScheduleRow(
                                    schedule.dayOfWeek,
                                    "breakStart",
                                    "",
                                  );
                                  updateScheduleRow(
                                    schedule.dayOfWeek,
                                    "breakEnd",
                                    "",
                                  );
                                }}
                                className="inline-flex size-7 items-center justify-center rounded-md text-[color:var(--text-muted)] transition hover:text-[color:var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <X className="size-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={isSavingSchedules}
                              onClick={() => {
                                // Default: pausa de 1 hora al medio del rango
                                const startMin = timeValueToMinutes(
                                  schedule.startTime,
                                );
                                const endMin = timeValueToMinutes(
                                  schedule.endTime,
                                );
                                const middle = Math.floor(
                                  (startMin + endMin) / 2,
                                );
                                const breakStart = middle - 30;
                                const breakEnd = middle + 30;
                                const toTime = (mins: number) => {
                                  const h = Math.floor(mins / 60);
                                  const m = mins % 60;
                                  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                                };
                                updateScheduleRow(
                                  schedule.dayOfWeek,
                                  "breakStart",
                                  toTime(Math.max(startMin, breakStart)),
                                );
                                updateScheduleRow(
                                  schedule.dayOfWeek,
                                  "breakEnd",
                                  toTime(Math.min(endMin, breakEnd)),
                                );
                              }}
                              className="inline-flex min-h-8 items-center gap-1 rounded-md border border-dashed border-[color:var(--border-default)] px-2.5 text-[10px] font-bold uppercase text-[color:var(--text-muted)] transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Plus className="size-3" /> Pausa
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="mt-2 block text-sm text-[color:var(--text-subtle)] sm:mt-0">
                        Cerrado
                      </span>
                    )}
                  </div>
                );
              })}
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
            <div className="mt-5">
              <p className="text-[11px] font-bold uppercase text-[color:var(--brand-gold)]">
                Aprovechamiento del horario
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Cuántos cortes entran en tu jornada por servicio. Si sobran
                minutos, te sugerimos cerrar más tarde para meter uno más.
              </p>
              <div className="mt-3 grid gap-3">
                {horarioAnalysis.map(({ service, rows }) => (
                  <div
                    key={service.id}
                    className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3"
                  >
                    <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--border-subtle)] pb-2">
                      <p className="text-sm font-bold text-white">
                        {service.name}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                        {service.duration_minutes} min
                      </p>
                    </div>

                    <ul className="mt-3 grid gap-2.5">
                      {rows.map((row) => {
                        const cutWidth =
                          (service.duration_minutes / row.windowMinutes) * 100;
                        const leftoverWidth =
                          (row.leftoverMinutes / row.windowMinutes) * 100;
                        const isExact = row.leftoverMinutes === 0;
                        return (
                          <li
                            key={`${service.id}-${row.daysLabel}-${row.startTime}`}
                            className="grid gap-1.5"
                          >
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)]">
                                {row.daysLabel}
                              </span>
                              <span className="font-mono text-[10px] text-[color:var(--text-muted)]">
                                {row.startTime}–{row.endTime}
                              </span>
                              <span className="ml-auto font-mono text-xs tabular-nums text-white">
                                <span className="font-bold">
                                  {row.cutsFitting}
                                </span>{" "}
                                <span className="text-[color:var(--text-muted)]">
                                  {row.cutsFitting === 1 ? "corte" : "cortes"}
                                </span>
                                {isExact ? null : (
                                  <span className="ml-2 text-[10px] text-[color:var(--text-muted)]">
                                    · sobran{" "}
                                    <span className="font-bold text-[color:var(--brand-gold)]">
                                      {row.leftoverMinutes}min
                                    </span>
                                  </span>
                                )}
                              </span>
                            </div>

                            {/* Barra de aprovechamiento */}
                            <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full bg-black/40">
                              {Array.from({ length: row.cutsFitting }).map(
                                (_, idx) => (
                                  <span
                                    key={idx}
                                    style={{ width: `${cutWidth}%` }}
                                    className="h-full bg-[color:var(--brand-gold)]"
                                  />
                                ),
                              )}
                              {row.leftoverMinutes > 0 ? (
                                <span
                                  style={{ width: `${leftoverWidth}%` }}
                                  className="h-full bg-[color:var(--border-strong)]"
                                  title={`${row.leftoverMinutes} min sin usar`}
                                />
                              ) : null}
                            </div>

                            {row.suggestedEndTime ? (
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] text-[color:var(--text-secondary)]">
                                  Cerrá a las{" "}
                                  <span className="font-mono font-bold text-[color:var(--brand-gold)]">
                                    {row.suggestedEndTime}
                                  </span>{" "}
                                  y entran{" "}
                                  <span className="font-bold text-white">
                                    {row.cutsFitting + 1}
                                  </span>{" "}
                                  cortes.
                                </p>
                                <button
                                  type="button"
                                  disabled={
                                    isApplyingSuggestion || isSavingSchedules
                                  }
                                  onClick={() =>
                                    row.suggestedEndTime &&
                                    handleApplySuggestion(
                                      row.days,
                                      row.suggestedEndTime,
                                    )
                                  }
                                  className="inline-flex min-h-7 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {isApplyingSuggestion
                                    ? "Aplicando…"
                                    : `Aplicar ${row.suggestedEndTime}`}
                                </button>
                              </div>
                            ) : (
                              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--success)]">
                                Aprovechás el 100%
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
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
