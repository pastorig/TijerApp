import Link from "next/link";

const platformHighlights = [
  "Reservas online por barberia",
  "Agenda compacta para el dia a dia",
  "Servicios y barberos por cliente",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12 sm:px-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase text-amber-300">
              BarberSync
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black text-balance text-stone-50 sm:text-6xl">
              Sistema de turnos para barberias modernas.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-300 sm:text-lg sm:leading-8">
              BarberSync centraliza reservas, barberos, servicios y agenda en
              una plataforma SaaS pensada para trabajar rapido desde celular.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-amber-300 px-6 py-3 text-sm font-bold uppercase text-stone-950 transition hover:bg-amber-200"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/sv-barber"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-stone-700 px-6 py-3 text-sm font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200"
              >
                Ver demo SV Barber
              </Link>
            </div>
          </div>

          <aside className="border border-stone-800 bg-stone-900/70 p-5 shadow-2xl shadow-black/30 sm:p-6">
            <p className="text-xs font-bold uppercase text-amber-300">
              Plataforma SaaS
            </p>
            <h2 className="mt-2 text-2xl font-black text-stone-100">
              Una cuenta admin por barberia
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              SV Barber queda como primer cliente demo. La arquitectura ya
              soporta paginas publicas por slug, panel admin por barberia y
              multiples barberos con horarios independientes.
            </p>

            <div className="mt-6 grid gap-3">
              {platformHighlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-md border border-stone-800 bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-200"
                >
                  {highlight}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
