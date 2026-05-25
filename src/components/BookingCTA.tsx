import Link from "next/link";

type BookingCTAProps = {
  barbershopSlug?: string;
  href?: string;
  label?: string;
};

export function BookingCTA({
  barbershopSlug,
  href,
  label = "Reservar turno",
}: BookingCTAProps) {
  const bookingHref =
    href ?? (barbershopSlug ? `/${barbershopSlug}/reservar` : "#");

  return (
    <Link
      href={bookingHref}
      className="inline-flex min-h-12 items-center justify-center rounded-md bg-amber-300 px-6 py-3 text-sm font-bold uppercase text-stone-950 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-stone-950"
    >
      {label}
    </Link>
  );
}
