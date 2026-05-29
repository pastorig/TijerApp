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
  {
    id: "barbershop_gino_barber",
    slug: "gino-barber",
    name: "Gino Barber",
    description: "Turnos online para barberia moderna",
    instagram: "https://instagram.com/ginobarber",
    whatsapp: "+54 9 11 1111-1111",
    barbers: [
      {
        id: "gino",
        name: "Gino",
        role: "Barbero",
        displayName: "Gino",
        isActive: true,
        services: [
          {
            id: "gino_service_haircut",
            name: "Corte",
            price: 8000,
            durationMinutes: 30,
          },
          {
            id: "gino_service_beard",
            name: "Barba",
            price: 5000,
            durationMinutes: 30,
          },
          {
            id: "gino_service_haircut_beard",
            name: "Corte + barba",
            price: 11000,
            durationMinutes: 45,
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
