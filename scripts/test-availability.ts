/**
 * Tests unitarios de la generación de slots disponibles (lógica pura, sin DB).
 * Es el corazón anti-turnos-pisados: si esto regresiona, se cobran turnos
 * imposibles o se pierden slots. Cubre grid sin huecos, filtrado de ocupados,
 * slot de cierre, pausa/bloqueos, y las razones past/too-soon.
 *
 * Correr: node --experimental-strip-types scripts/test-availability.ts
 */
import { buildAvailabilitySlots } from "../src/lib/availability.ts";
import type {
  BarberDayOverrideRow,
  BarberTimeBlockRow,
} from "../src/lib/supabase.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

const FAR = new Date(2030, 0, 1); // lejos → ningún slot cuenta como "hoy"
const WH = { start: "09:00", end: "12:00" };
const times = (slots: { time: string }[]) => slots.map((s) => s.time).join(",");

// 1) Grid básico: 09:00–12:00, 30min, sin turnos → 6 slots parejos.
{
  const slots = buildAvailabilitySlots({
    appointmentDate: "2026-06-15",
    appointmentDurationMinutes: 30,
    barbershopIntervalMinutes: 30,
    workingHours: WH,
    weeklySchedules: [],
    timeBlocks: [],
    appointments: [],
    now: FAR,
  });
  check("Grid básico → 6 slots", slots.length, 6);
  check("Grid básico → horarios correctos", times(slots), "09:00,09:30,10:00,10:30,11:00,11:30");
  check("Grid básico → todos disponibles", slots.every((s) => s.isAvailable), true);
}

// 2) Día no laboral (override is_working=false) → sin slots.
{
  const override = {
    override_date: "2026-06-15",
    start_time: "09:00",
    end_time: "12:00",
    is_working: false,
  } as unknown as BarberDayOverrideRow;
  const slots = buildAvailabilitySlots({
    appointmentDate: "2026-06-15",
    appointmentDurationMinutes: 30,
    barbershopIntervalMinutes: 30,
    workingHours: WH,
    weeklySchedules: [],
    dayOverride: override,
    timeBlocks: [],
    appointments: [],
    now: FAR,
  });
  check("Día no laboral → 0 slots", slots.length, 0);
}

// 3) Un turno ocupa las 10:00 → ese slot NO aparece (anti doble-booking).
{
  const slots = buildAvailabilitySlots({
    appointmentDate: "2026-06-15",
    appointmentDurationMinutes: 30,
    barbershopIntervalMinutes: 30,
    workingHours: WH,
    weeklySchedules: [],
    timeBlocks: [],
    appointments: [{ startTime: "10:00", durationMinutes: 30 }],
    now: FAR,
  });
  check("Turno 10:00 → slot 10:00 filtrado", slots.some((s) => s.time === "10:00"), false);
  check("Turno 10:00 → quedan 5 slots", slots.length, 5);
}

// 4) Slot de cierre exacto: 09:00–11:00, 45min → incluye el que cierra justo.
{
  const slots = buildAvailabilitySlots({
    appointmentDate: "2026-06-15",
    appointmentDurationMinutes: 45,
    barbershopIntervalMinutes: 30,
    workingHours: { start: "09:00", end: "11:00" },
    weeklySchedules: [],
    timeBlocks: [],
    appointments: [],
    now: FAR,
  });
  check("Cierre exacto → incluye 10:15", slots.some((s) => s.time === "10:15" && s.isAvailable), true);
  check("Cierre exacto → 09:00, 09:45, 10:15", times(slots), "09:00,09:45,10:15");
}

// 5) Pausa/bloqueo al medio → bloquea el slot solapado.
{
  const block = { start_time: "10:00", end_time: "10:30" } as unknown as BarberTimeBlockRow;
  const slots = buildAvailabilitySlots({
    appointmentDate: "2026-06-15",
    appointmentDurationMinutes: 30,
    barbershopIntervalMinutes: 30,
    workingHours: WH,
    weeklySchedules: [],
    timeBlocks: [block],
    appointments: [],
    now: FAR,
  });
  check("Bloqueo 10:00 → slot 10:00 no aparece", slots.some((s) => s.time === "10:00"), false);
}

// 6) Duración inválida (<=0) → sin slots.
{
  const slots = buildAvailabilitySlots({
    appointmentDate: "2026-06-15",
    appointmentDurationMinutes: 0,
    barbershopIntervalMinutes: 30,
    workingHours: WH,
    weeklySchedules: [],
    timeBlocks: [],
    appointments: [],
    now: FAR,
  });
  check("Duración 0 → 0 slots", slots.length, 0);
}

// 7) HOY con anticipación mínima: past + too-soon + available.
{
  // now = 15-jun-2026 15:20; jornada 15:00–18:00; turnos de 60min; aviso 60min.
  const now = new Date(2026, 5, 15, 15, 20);
  const slots = buildAvailabilitySlots({
    appointmentDate: "2026-06-15",
    appointmentDurationMinutes: 60,
    barbershopIntervalMinutes: 60,
    workingHours: { start: "15:00", end: "18:00" },
    weeklySchedules: [],
    timeBlocks: [],
    appointments: [],
    now,
    minBookingNoticeMinutes: 60,
  });
  const byTime = Object.fromEntries(slots.map((s) => [s.time, s]));
  check("Hoy → 15:00 es 'past'", byTime["15:00"]?.reason, "past");
  check("Hoy → 16:00 es 'too-soon' (faltan 40 < 60)", byTime["16:00"]?.reason, "too-soon");
  check("Hoy → 16:00 no disponible", byTime["16:00"]?.isAvailable, false);
  check("Hoy → 17:00 disponible", byTime["17:00"]?.isAvailable, true);
}

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
