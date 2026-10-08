import Image from "next/image";
import { Package } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { etiquetaDeCategoria } from "@/lib/productos";
import type { ProductoPublico } from "@/lib/server/productos";
import { BookingCTA } from "./BookingCTA";
import { Brillo, Escalera, Peldano } from "@/components/public/LandingMotion";

type BarbershopProductsSectionProps = {
  productos: ProductoPublico[];
  barbershopSlug: string;
  /** False en modo lectura (plan vencido): se muestran, sin el botón de reservar. */
  bookingEnabled?: boolean;
};

/**
 * "Productos" en la página pública de la barbería (feature 035, etapa B).
 *
 * Llega ya resuelta del servidor, como las reseñas: sale en el HTML (se
 * indexa) y no hay salto de contenido al cargar. Si no hay productos
 * disponibles, la sección no existe.
 *
 * Las fotos van recortadas a un cuadrado: un catálogo cargado con fotos de
 * celular —verticales, apaisadas, de lejos— se ve parejo igual.
 */
export function BarbershopProductsSection({
  productos,
  barbershopSlug,
  bookingEnabled = true,
}: BarbershopProductsSectionProps) {
  if (productos.length === 0) return null;

  return (
    <section
      id="productos"
      className="border-t border-[color:var(--border-subtle)]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <Escalera as="header" paso={0.09} className="text-center sm:text-left">
          <Peldano as="p" className="text-xs font-semibold uppercase tracking-normal text-[color:var(--brand-gold)]">
            Productos
          </Peldano>
          <Peldano as="h2" className="mt-3 text-2xl font-black uppercase tracking-normal text-white sm:mt-4 sm:text-3xl lg:text-4xl">
            Llevate el look a casa
          </Peldano>
          <Peldano as="p" className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[color:var(--text-secondary)] sm:mx-0">
            Lo que usamos en el sillón. Sumalo a tu turno al reservar y lo
            pagás en el local.
          </Peldano>
        </Escalera>

        <Escalera paso={0.05} className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {productos.map((producto) => (
            <Peldano
              key={producto.id}
              levanta
              className="group relative flex flex-col overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)]/40"
            >
              <Brillo reflejo={false} />
              <div className="relative aspect-square w-full overflow-hidden bg-[color:var(--surface-2)]">
                {producto.public_url ? (
                  <Image
                    src={producto.public_url}
                    alt={producto.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized
                  />
                ) : (
                  // Sin foto: un ícono, no un hueco gris.
                  <span
                    aria-hidden="true"
                    className="flex size-full items-center justify-center text-[color:var(--brand-gold)]/40"
                    style={{
                      background:
                        "radial-gradient(80% 80% at 50% 40%, color-mix(in oklab, var(--brand-gold) 10%, transparent), transparent 70%)",
                    }}
                  >
                    <Package className="size-9" />
                  </span>
                )}
              </div>
              <div className="relative flex flex-1 flex-col gap-1 p-3 sm:p-4">
                <p className="text-[11px] font-semibold uppercase tracking-normal text-[color:var(--text-muted)]">
                  {etiquetaDeCategoria(producto.category)}
                </p>
                <h3 className="break-words text-sm font-bold leading-snug text-white sm:text-base">
                  {producto.name}
                </h3>
                {producto.description ? (
                  <p className="line-clamp-2 text-xs leading-5 text-[color:var(--text-secondary)]">
                    {producto.description}
                  </p>
                ) : null}
                <p className="mt-auto pt-2 font-mono text-base font-bold tabular-nums text-[color:var(--brand-gold)] sm:text-lg">
                  {formatPrice(producto.price)}
                </p>
              </div>
            </Peldano>
          ))}
        </Escalera>

        {bookingEnabled ? (
          <div className="mt-8 flex justify-center sm:justify-start">
            <BookingCTA barbershopSlug={barbershopSlug} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
