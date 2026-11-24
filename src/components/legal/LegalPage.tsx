import { CommercialFooter } from "@/components/home/CommercialFooter";
import { CommercialNav } from "@/components/home/CommercialNav";

export type SeccionLegal = { titulo: string; parrafos: React.ReactNode[] };

/** Marco de /privacidad y /terminos: texto corto, legible en el celular. */
export function LegalPage({
  titulo,
  actualizado,
  intro,
  secciones,
}: {
  titulo: string;
  actualizado: string;
  intro: React.ReactNode;
  secciones: SeccionLegal[];
}) {
  return (
    <>
      <CommercialNav />
      <main className="bg-black text-white">
        <article className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-8 sm:py-16">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
            TijerApp
          </p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-[1.05] tracking-tight sm:text-4xl">
            {titulo}
          </h1>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">Actualizado: {actualizado}</p>
          <div className="mt-6 text-sm leading-7 text-[color:var(--text-secondary)]">{intro}</div>

          {secciones.map((seccion) => (
            <section key={seccion.titulo} className="mt-8">
              <h2 className="text-base font-bold text-white">{seccion.titulo}</h2>
              {seccion.parrafos.map((parrafo, i) => (
                <p key={i} className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">
                  {parrafo}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <CommercialFooter />
    </>
  );
}
