"use client";
import { notFound } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { PublicBarbershopLanding } from "@/components/PublicBarbershopLanding";
import { BookingForm } from "@/components/BookingForm";
import { demoBarbershops } from "@/data/demo-barbershops";
import { ReviewFormClient } from "@/app/rev/[token]/ReviewFormClient";
import { WaitlistConfirmClient } from "@/app/w/[token]/WaitlistConfirmClient";
import { AppointmentActionPanel } from "@/app/r/[token]/AppointmentActionPanel";

export default function Preview() {
  const zone = useSearchParams().get("zone");
  if (process.env.NODE_ENV !== "development") notFound();
  const shop = { ...demoBarbershops[0], name: "Studio Demo", slug: "design-preview", barbers: [{ ...demoBarbershops[0].barbers[0], id: "demo-barber", name: "Alex Demo" }] };
  if (zone === "publica") return <PublicBarbershopLanding barbershop={shop} />;
  if (zone === "reserva") return <main className="mx-auto max-w-5xl px-4 py-5"><BookingForm barbershop={shop} /></main>;
  if (zone === "espera") return <WaitlistConfirmClient token="fixture-only" />;
  if (zone === "resena") return <ReviewFormClient token="fixture-only" barbershopName={shop.name} barbershopSlug={shop.slug} googleReviewsUrl={null} customerName="Cliente Demo" serviceName="Corte" appointmentDate="2026-01-01" alreadySubmitted={false} isInFuture={false} status="confirmed" />;
  return <main className="mx-auto max-w-xl px-4 py-5"><AppointmentActionPanel token="fixture-only" initialAppointment={{ id: "demo", barbershop_slug: shop.slug, barbershop_name: shop.name, barber_name: "Alex Demo", customer_name: "Cliente Demo", service_name: "Corte", service_price: 8500, service_duration_minutes: 30, appointment_date: "2099-01-01", appointment_time: "18:00", comment: null, status: "pending", coupon_code: null, discount_amount: null, final_price: 8500 }} /></main>;
}
