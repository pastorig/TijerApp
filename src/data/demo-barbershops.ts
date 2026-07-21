export type BarberService = {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
};

export type BarbershopService = BarberService;

export type Barber = {
  id: string;
  name: string;
  role?: string;
  displayName?: string;
  whatsapp?: string;
  isActive: boolean;
  isOwner?: boolean;
  services: BarberService[];
};

export type WorkingHours = {
  start: string;
  end: string;
  intervalMinutes: number;
};

export type DemoBarbershop = {
  id: string;
  slug: string;
  name: string;
  description: string;
  instagram: string;
  whatsapp: string;
  address?: string;
  logoUrl?: string;
  googleReviewsUrl?: string;
  barbers: Barber[];
  workingHours: WorkingHours;
  isActive?: boolean;
  /** Cuando true, las reservas entran como confirmed en vez de pending. */
  autoConfirmAppointments?: boolean;
  /** Cuando true, se ofrece "anotarse en lista de espera" en el booking. Default true. */
  waitlistEnabled?: boolean;
  /** Cuando true, el email del cliente es obligatorio al reservar. Default false. */
  requireClientEmail?: boolean;
  /**
   * Anticipación mínima (en minutos) para que un cliente pueda reservar un
   * turno. 0 = sin restricción. Ej: 60 → a las 15:20 no se puede tomar el de
   * las 16:00. Solo aplica a los turnos de hoy.
   */
  minBookingNoticeMinutes?: number;
  /** Cuando true, la barbería cobra seña por MercadoPago al reservar. Default false. */
  mpEnabled?: boolean;
  /** Porcentaje del precio que se cobra como seña (1-100). */
  depositPercent?: number;
  /** Monto mínimo de seña en ARS, o null si no hay piso. */
  depositMinAmount?: number | null;
  /** Horas tras reservar para pagar la seña antes de auto-cancelar. */
  depositAutoCancelHours?: number;
  /**
   * Texto personalizado del mensaje de WhatsApp del barbero al cliente.
   * null/undefined = mensaje por defecto. Placeholders: {nombre} {barberia}
   * {fecha} {hora}. El link de confirmar/cancelar se agrega siempre al final.
   */
  whatsappMessageTemplate?: string | null;
};

export const demoBarbershops: DemoBarbershop[] = [
  {
    id: "barbershop_sv_barber",
    slug: "sv-barber",
    name: "SV Barber",
    description: "Reserva tu turno online",
    instagram: "https://instagram.com/svbarber",
    whatsapp: "+54 9 11 0000-0000",
    barbers: [
      {
        id: "santi-vargas",
        name: "Santi Vargas",
        role: "Barbero",
        displayName: "Santi Vargas",
        isActive: true,
        services: [
          {
            id: "service_haircut",
            name: "Corte",
            price: 8500,
            durationMinutes: 30,
          },
          {
            id: "service_haircut_beard",
            name: "Corte + barba",
            price: 10000,
            durationMinutes: 30,
          },
        ],
      },
    ],
    workingHours: {
      start: "16:00",
      end: "21:00",
      intervalMinutes: 30,
    },
    isActive: true,
  },
];

export function getDemoBarbershopBySlug(slug: string) {
  return demoBarbershops.find((barbershop) => barbershop.slug === slug);
}

export function getFeaturedDemoBarbershop() {
  return demoBarbershops[0];
}

export function getActiveBarbers(barbershop: DemoBarbershop) {
  return barbershop.barbers.filter((barber) => barber.isActive);
}

export function getBarberDisplayName(barber: Barber) {
  return barber.displayName ?? barber.name;
}

export function getPrimaryActiveBarber(barbershop: DemoBarbershop) {
  return getActiveBarbers(barbershop)[0];
}

export function getPublicServices(barbershop: DemoBarbershop) {
  return getPrimaryActiveBarber(barbershop)?.services ?? [];
}
