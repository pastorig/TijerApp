import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui";
import { resolveBarbershopBySlug } from "@/lib/barbershops";
import { getReviewContextByToken } from "@/lib/appointment-reviews";
import { ReviewFormClient } from "./ReviewFormClient";

type PublicReviewPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicReviewPage({
  params,
}: PublicReviewPageProps) {
  const { token } = await params;

  if (!/^[0-9a-f-]{30,40}$/i.test(token)) {
    notFound();
  }

  const { data: context } = await getReviewContextByToken(token);

  if (!context) {
    notFound();
  }

  const { data: resolvedBarbershop } = await resolveBarbershopBySlug(
    context.barbershop_slug,
  );
  const barbershopName =
    resolvedBarbershop?.name ?? context.barbershop_name ?? "la barbería";

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-5 sm:px-8 sm:py-6 lg:px-12">
        <Link
          href={`/${context.barbershop_slug}`}
          className="inline-flex min-w-0 items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)] sm:tracking-[0.2em]"
        >
          ← {barbershopName}
        </Link>
        <Logo variant="mark" size="sm" className="shrink-0" />
      </nav>

      <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        <ReviewFormClient
          token={token}
          barbershopName={barbershopName}
          barbershopSlug={context.barbershop_slug}
          googleReviewsUrl={context.google_reviews_url}
          customerName={context.customer_name}
          serviceName={context.service_name}
          appointmentDate={context.appointment_date}
          alreadySubmitted={context.already_submitted}
          isInFuture={context.is_in_future}
          status={context.status}
        />
      </div>
    </main>
  );
}
