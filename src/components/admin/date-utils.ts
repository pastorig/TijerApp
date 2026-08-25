/**
 * Los helpers de fecha viven ahora en `@/components/calendar/date-utils`,
 * junto al calendario que los usa: los comparten el panel del dueño y la
 * agenda del empleado (feature 018).
 *
 * Este archivo queda re-exportando para no tocar los imports del panel.
 */
export * from "@/components/calendar/date-utils";
