"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import {
  listGalleryPhotosByBarbershop,
  type GalleryPhoto,
} from "@/lib/barbershop-gallery";

type AdminGalleryManagerProps = {
  barbershop: DemoBarbershop;
};

export function AdminGalleryManager({ barbershop }: AdminGalleryManagerProps) {
  const confirm = useConfirm();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const { data, error } = await listGalleryPhotosByBarbershop(
          barbershop.slug,
        );
        if (!isMounted) return;
        if (error) {
          setErrorMessage("No pudimos cargar las fotos.");
          setPhotos([]);
          return;
        }
        setPhotos(data ?? []);
      } catch {
        if (isMounted) setErrorMessage("No pudimos cargar las fotos.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [barbershop.slug]);

  async function getAccessToken(): Promise<string | null> {
    const { data } = await getCurrentSession();
    return data.session?.access_token ?? null;
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setErrorMessage("");
    setSuccessMessage("");
    setIsUploading(true);

    const accessToken = await getAccessToken();
    if (!accessToken) {
      setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
      setIsUploading(false);
      return;
    }

    const maxOrder = photos.reduce((acc, p) => Math.max(acc, p.sort_order), 0);
    const newPhotos: GalleryPhoto[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("barbershopSlug", barbershop.slug);
        formData.append("sortOrder", String(maxOrder + i + 1));

        const response = await fetch("/api/admin/gallery-photos", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setErrorMessage(
            payload.error ?? `No pudimos subir "${file.name}".`,
          );
          continue;
        }
        const payload = (await response.json()) as { photo: GalleryPhoto };
        newPhotos.push(payload.photo);
      }
      if (newPhotos.length > 0) {
        setPhotos((current) => [...current, ...newPhotos]);
        setSuccessMessage(
          `${newPhotos.length} ${newPhotos.length === 1 ? "foto subida" : "fotos subidas"}.`,
        );
      }
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(photo: GalleryPhoto) {
    const ok = await confirm({
      title: "Eliminar foto",
      message: "La foto se elimina de la galería pública. No se puede deshacer.",
      confirmLabel: "Eliminar",
      cancelLabel: "Volver",
      danger: true,
    });
    if (!ok) return;
    setBusyPhotoId(photo.id);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setErrorMessage("Tu sesión expiró, volvé a iniciar sesión.");
        return;
      }
      const params = new URLSearchParams({
        photoId: photo.id,
        barbershopSlug: photo.barbershop_slug,
        storagePath: photo.storage_path,
      });
      const response = await fetch(
        `/api/admin/gallery-photos?${params.toString()}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setErrorMessage(payload.error ?? "No pudimos eliminar la foto.");
        return;
      }
      setPhotos((current) => current.filter((p) => p.id !== photo.id));
      setSuccessMessage("Foto eliminada.");
    } catch {
      setErrorMessage("No pudimos eliminar la foto.");
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function patchPhoto(
    photoId: string,
    body: { caption?: string | null; sortOrder?: number },
  ) {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new Error("session-expired");
    }
    const response = await fetch("/api/admin/gallery-photos", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        photoId,
        barbershopSlug: barbershop.slug,
        ...body,
      }),
    });
    if (!response.ok) {
      throw new Error("patch-failed");
    }
    return (await response.json()) as { photo: GalleryPhoto };
  }

  async function handleMove(photo: GalleryPhoto, direction: -1 | 1) {
    const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((p) => p.id === photo.id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const swapTarget = sorted[targetIndex];
    setBusyPhotoId(photo.id);
    setErrorMessage("");

    try {
      await Promise.all([
        patchPhoto(photo.id, { sortOrder: swapTarget.sort_order }),
        patchPhoto(swapTarget.id, { sortOrder: photo.sort_order }),
      ]);
      setPhotos((current) =>
        current.map((p) => {
          if (p.id === photo.id) return { ...p, sort_order: swapTarget.sort_order };
          if (p.id === swapTarget.id) return { ...p, sort_order: photo.sort_order };
          return p;
        }),
      );
    } catch {
      setErrorMessage("No pudimos reordenar las fotos.");
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function handleCaptionChange(
    photo: GalleryPhoto,
    nextCaption: string,
  ) {
    // Optimistic update: actualizamos el state primero y persistimos.
    const trimmed = nextCaption.trim();
    setPhotos((current) =>
      current.map((p) =>
        p.id === photo.id ? { ...p, caption: trimmed || null } : p,
      ),
    );
    try {
      await patchPhoto(photo.id, { caption: trimmed || null });
    } catch {
      // Si falla, no rollbackeamos por simplicidad; el next reload lo arregla.
    }
  }

  const sortedPhotos = [...photos].sort(
    (a, b) => a.sort_order - b.sort_order,
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Galería
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Fotos del local
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Subí fotos de tu barbería, trabajos o equipo. Aparecen en la landing
          pública de {barbershop.name}, en el orden que las dejes acá.
        </p>
      </header>

      {/* Upload */}
      <section className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-5">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
              <ImagePlus className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Subir fotos</p>
              <p className="text-xs text-[color:var(--text-muted)]">
                PNG, JPG o WebP. Máx 5MB por imagen. Podés subir varias a la vez.
              </p>
            </div>
          </div>
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)] bg-gold-grad px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-black transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--brand-gold-hi)]">
            {isUploading ? "Subiendo…" : "Elegir archivos"}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onChange={handleUpload}
              disabled={isUploading}
              className="sr-only"
            />
          </label>
        </div>
      </section>

      {errorMessage ? (
        <p
          role="alert"
          className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="border-l-2 border-[color:var(--success)] pl-4 text-sm font-semibold text-[color:var(--success)]">
          {successMessage}
        </p>
      ) : null}

      {/* Grid */}
      {isLoading ? (
        <p className="text-sm text-[color:var(--text-muted)]">Cargando fotos…</p>
      ) : sortedPhotos.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--border-subtle)] p-10 text-center">
          <p className="text-sm font-bold text-white">Sin fotos todavía</p>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Subí tu primera foto desde el botón de arriba.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedPhotos.map((photo, index) => {
            const isBusy = busyPhotoId === photo.id;
            const isFirst = index === 0;
            const isLast = index === sortedPhotos.length - 1;
            return (
              <li
                key={photo.id}
                className="overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]"
              >
                <div className="relative aspect-[4/3] w-full bg-black">
                  <Image
                    src={photo.public_url}
                    alt={photo.caption ?? `Foto ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                  <span className="absolute top-2 left-2 rounded-[var(--radius-xs)] bg-black/70 px-2 py-1 font-mono text-[10px] font-bold text-[color:var(--brand-gold)]">
                    #{index + 1}
                  </span>
                </div>
                <div className="grid gap-2 p-3">
                  <input
                    type="text"
                    value={photo.caption ?? ""}
                    onChange={(event) =>
                      handleCaptionChange(photo, event.target.value)
                    }
                    placeholder="Descripción (opcional)"
                    className="min-h-9 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-black px-3 text-xs text-white outline-none placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(photo, -1)}
                        disabled={isBusy || isFirst}
                        aria-label="Mover arriba"
                        className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(photo, 1)}
                        disabled={isBusy || isLast}
                        aria-label="Mover abajo"
                        className="inline-flex size-8 items-center justify-center rounded-[var(--radius-xs)] border border-[color:var(--border-default)] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(photo)}
                      disabled={isBusy}
                      className="inline-flex min-h-8 items-center gap-1 rounded-[var(--radius-xs)] border border-[color:var(--danger)]/40 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--danger)] transition-colors duration-[var(--duration-fast)] hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="size-3" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
