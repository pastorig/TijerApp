import type { DemoBarbershop } from "@/data/demo-barbershops";
import { getActiveBarbers } from "@/data/demo-barbershops";
import {
  isDefaultService,
  isDefaultWorkingHours,
} from "@/lib/onboarding-defaults";

/**
 * Guía de primeros pasos: qué le falta a una barbería para estar presentable.
 *
 * Todo se **deriva del estado real** de la barbería, nada se persiste. Eso trae
 * tres cosas de arriba: no hay migración, las barberías que ya existían dan
 * completas solas (sin backfill), y es imposible que la guía muestre un avance
 * que no coincida con la configuración.
 *
 * Regla clave: un paso está cumplido cuando el barbero **cambió el valor que
 * dejó el registro**, no porque el dato exista. El registro deja un servicio
 * "Corte" a $10.000 y un horario 09:00–20:00; si siguen así, el barbero todavía
 * no los revisó y compartir su link ahora mostraría precios que no son los
 * suyos.
 *
 * Función pura, sin React y sin I/O: la lógica se prueba en
 * `scripts/test-onboarding.ts`.
 */

export type OnboardingStepId =
  | "servicios"
  | "horarios"
  | "contacto"
  | "logo"
  | "prueba"
  | "compartir";

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  hint: string;
  /**
   * Ruta relativa a la que lleva el paso. `null` en el paso de compartir, que
   * se resuelve dentro de la propia guía.
   */
  href: string | null;
  done: boolean;
  /** Los opcionales cuentan para el avance visible pero no bloquean el "listo". */
  optional: boolean;
};

export type OnboardingProgress = {
  steps: OnboardingStep[];
  /** Cantidad de pasos obligatorios (los que definen el "listo"). */
  requiredTotal: number;
  requiredDone: number;
  /** True si los obligatorios están cumplidos: la barbería es presentable. */
  isComplete: boolean;
  /** Ruta pública de la barbería, para armar el link a compartir. */
  publicPath: string;
};

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Todos los servicios de la barbería, de todos sus barberos activos. */
function collectServices(barbershop: DemoBarbershop) {
  return getActiveBarbers(barbershop).flatMap((barber) => barber.services ?? []);
}

/**
 * Los servicios están revisados si hay más de uno, o si el único que hay dejó
 * de coincidir con el que dejó el registro. Sin servicios, pendiente.
 */
function areServicesReviewed(barbershop: DemoBarbershop): boolean {
  const services = collectServices(barbershop);
  if (services.length === 0) return false;
  if (services.length > 1) return true;
  return !isDefaultService(services[0]);
}

export function getOnboardingSteps(
  barbershop: DemoBarbershop,
  appointmentCount: number,
): OnboardingProgress {
  const base = `/${barbershop.slug}/admin`;

  const servicesDone = areServicesReviewed(barbershop);
  const hoursDone = !isDefaultWorkingHours(barbershop.workingHours);
  const contactDone =
    hasText(barbershop.address) && hasText(barbershop.instagram);

  const requiredDone = [servicesDone, hoursDone, contactDone].filter(Boolean)
    .length;
  const isComplete = servicesDone && hoursDone && contactDone;

  const steps: OnboardingStep[] = [
    {
      id: "servicios",
      title: "Poné tus servicios y precios",
      hint: "Arrancás con un corte de ejemplo. Ponele tu precio y sumá los que hagas.",
      href: `${base}/barbers`,
      done: servicesDone,
      optional: false,
    },
    {
      id: "horarios",
      title: "Revisá tus días y horarios",
      hint: "Quedaste abierto de 09:00 a 20:00 todos los días, domingo incluido.",
      href: `${base}/barbers`,
      done: hoursDone,
      optional: false,
    },
    {
      id: "contacto",
      title: "Completá los datos de tu barbería",
      hint: "Tu dirección y tu Instagram se muestran en tu página. Hoy están vacíos.",
      href: `${base}/settings`,
      done: contactDone,
      optional: false,
    },
    {
      id: "logo",
      title: "Subí tu logo",
      hint: "Aparece arriba de tu página y en los mails a tus clientes.",
      href: `${base}/settings`,
      done: hasText(barbershop.logoUrl),
      optional: true,
    },
    {
      id: "prueba",
      title: "Probá una reserva",
      hint: "Sacá un turno en tu propia página para verlo como lo ve un cliente.",
      href: `/${barbershop.slug}`,
      done: appointmentCount > 0,
      optional: true,
    },
    {
      id: "compartir",
      title: "Compartí tu link",
      hint: "Mandalo por WhatsApp y ponelo en tu Instagram. Ahí empieza a laburar.",
      href: null,
      done: isComplete,
      optional: true,
    },
  ];

  return {
    steps,
    requiredTotal: 3,
    requiredDone,
    isComplete,
    publicPath: `/${barbershop.slug}`,
  };
}
