"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { X } from "lucide-react";
import { Escalera, Peldano } from "@/components/public/LandingMotion";
import {
  listGalleryPhotosByBarbershop,
  type GalleryPhoto,
} from "@/lib/barbershop-gallery";

type BarbershopGallerySectionProps = {
  barbershopSlug: string;
};

export function BarbershopGallerySection({
  barbershopSlug,
}: BarbershopGallerySectionProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const { data } = await listGalleryPhotosByBarbershop(barbershopSlug);
        if (!isMounted) return;
        const sorted = (data ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        setPhotos(sorted);
      } catch {
        // Sin galería, simplemente no renderizamos la sección.
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [barbershopSlug]);

  if (photos.length === 0) return null;

  const lightboxPhoto =
    lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <section
      id="galeria"
      className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <Escalera as="header" paso={0.09} className="text-center sm:text-left">
          <Peldano as="p" className="text-xs font-semibold uppercase tracking-normal text-[color:var(--brand-gold)]">
            Galería
          </Peldano>
          <Peldano as="h2" className="mt-3 text-2xl font-black uppercase tracking-normal text-white sm:mt-4 sm:text-3xl lg:text-4xl">
            Mirá nuestro local
          </Peldano>
        </Escalera>

        <Escalera paso={0.05} className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
          {photos.map((photo, index) => (
            <Peldano key={photo.id}>
              <button
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={
                  photo.caption ?? `Abrir foto ${index + 1} en grande`
                }
                className="group relative block aspect-square w-full overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-black transition-colors duration-[var(--duration-base)] hover:border-[color:var(--brand-gold)]/50"
              >
                <Image
                  src={photo.public_url}
                  alt={photo.caption ?? `Foto ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  unoptimized
                />
                {photo.caption ? (
                  <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-left text-xs font-semibold uppercase tracking-normal text-white">
                    {photo.caption}
                  </span>
                ) : null}
              </button>
            </Peldano>
          ))}
        </Escalera>
      </div>

      {/* Lightbox: el fondo funde y la foto se acerca; al cerrar, lo mismo
          al revés (por eso `AnimatePresence`). */}
      <MotionConfig reducedMotion="user">
      <AnimatePresence>
      {lightboxPhoto ? (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={lightboxPhoto.caption ?? "Foto ampliada"}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-full border border-[color:var(--border-default)] bg-black/60 text-white transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
          >
            <X className="size-4" />
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative h-full max-h-[85vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={lightboxPhoto.public_url}
              alt={lightboxPhoto.caption ?? "Foto"}
              fill
              sizes="90vw"
              className="object-contain"
              unoptimized
            />
            {lightboxPhoto.caption ? (
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-4 text-center text-sm font-semibold text-white">
                {lightboxPhoto.caption}
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
      </AnimatePresence>
      </MotionConfig>
    </section>
  );
}
