import Link from "next/link";

type PublicBarbershopFooterProps = {
  barbershopName: string;
};

export function PublicBarbershopFooter({
  barbershopName,
}: PublicBarbershopFooterProps) {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[color:var(--border-subtle)] bg-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-center sm:flex-row sm:px-8 sm:text-left lg:px-12">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)]">
          © {year} {barbershopName}
        </p>
        <Link
          href="/"
          className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
        >
          Powered by BarberSync
        </Link>
      </div>
    </footer>
  );
}
