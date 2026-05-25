import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui";

type BookingCTAProps = {
  barbershopSlug?: string;
  href?: string;
  label?: string;
  className?: string;
};

export function BookingCTA({
  barbershopSlug,
  href,
  label = "Reservar turno",
  className,
}: BookingCTAProps) {
  const bookingHref =
    href ?? (barbershopSlug ? `/${barbershopSlug}/reservar` : "#");

  return (
    <Button
      as="link"
      href={bookingHref}
      size="lg"
      iconRight={<ArrowUpRight className="size-4" />}
      className={`w-full sm:w-auto ${className ?? ""}`}
    >
      {label}
    </Button>
  );
}
