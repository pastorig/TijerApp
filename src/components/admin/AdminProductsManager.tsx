"use client";

import Image from "next/image";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  useConfirm,
  useToast,
} from "@/components/ui";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import {
  CATEGORIAS_DE_PRODUCTO,
  LARGO_MAX_DESCRIPCION,
  LARGO_MAX_NOMBRE,
  etiquetaDeCategoria,
  validarProducto,
} from "@/lib/productos";
import { useIsReadOnly } from "./PlanContext";

/**
 * "Productos" (feature 035, etapa A): el catálogo que la barbería carga para
 * ofrecerlo después al reservar — ceras, pomadas, polvos texturizadores.
 *
 * En esta etapa solo se cargan. Todavía no aparecen en la página pública ni
 * en la reserva; la pantalla lo dice para que nadie cargue cinco productos y
 * salga a buscarlos sin encontrarlos.
 */

type Producto = {
  id: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  public_url: string | null;
  is_available: boolean;
  sort_order: number;
};

type Carga =
  | { estado: "cargando" }
  | { estado: "error"; mensaje: string; sinMigracion: boolean }
  | { estado: "listo" };

async function tokenDeSesion(): Promise<string | null> {
  const { data } = await getCurrentSession();
  return data.session?.access_token ?? null;
}

export function AdminProductsManager({
  barbershop,
}: {
  barbershop: { slug: string; name: string };
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const soloLectura = useIsReadOnly();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [max, setMax] = useState(40);
  const [carga, setCarga] = useState<Carga>({ estado: "cargando" });
  const [recarga, setRecarga] = useState(0);
  const [ocupado, setOcupado] = useState<string | null>(null);
  // null = cerrado · "nuevo" = alta · un producto = edición
  const [editando, setEditando] = useState<Producto | "nuevo" | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCarga({ estado: "cargando" });
      try {
        const token = await tokenDeSesion();
        if (!vivo) return;
        if (!token) {
          setCarga({ estado: "error", mensaje: "Se venció la sesión. Volvé a entrar.", sinMigracion: false });
          return;
        }
        const res = await fetch(
          `/api/admin/products?bs=${encodeURIComponent(barbershop.slug)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await res.json().catch(() => ({}))) as {
          productos?: Producto[];
          max?: number;
          error?: string;
          sinMigracion?: boolean;
        };
        if (!vivo) return;
        // Un fallo no puede verse igual que "todavía no cargaste nada".
        if (!res.ok || !Array.isArray(payload.productos)) {
          setCarga({
            estado: "error",
            mensaje: payload.error ?? "No pudimos traer tus productos.",
            sinMigracion: payload.sinMigracion === true,
          });
          return;
        }
        setProductos(payload.productos);
        if (typeof payload.max === "number") setMax(payload.max);
        setCarga({ estado: "listo" });
      } catch {
        if (vivo) {
          setCarga({ estado: "error", mensaje: "No pudimos traer tus productos.", sinMigracion: false });
        }
      }
    }
    void cargar();
    return () => {
      vivo = false;
    };
  }, [barbershop.slug, recarga]);

  /** PATCH de uno o más campos. Devuelve el producto como quedó guardado. */
  const actualizar = useCallback(
    async (productId: string, campos: Record<string, string | File>): Promise<Producto> => {
      const token = await tokenDeSesion();
      if (!token) throw new Error("Se venció la sesión. Volvé a entrar.");
      const form = new FormData();
      form.set("bs", barbershop.slug);
      form.set("productId", productId);
      for (const [k, v] of Object.entries(campos)) form.set(k, v);
      const res = await fetch("/api/admin/products", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = (await res.json().catch(() => ({}))) as {
        producto?: Producto;
        error?: string;
      };
      if (!res.ok || !payload.producto) {
        throw new Error(payload.error ?? "No pudimos guardar el cambio.");
      }
      return payload.producto;
    },
    [barbershop.slug],
  );

  async function cambiarDisponible(producto: Producto) {
    setOcupado(producto.id);
    try {
      const guardado = await actualizar(producto.id, {
        isAvailable: String(!producto.is_available),
      });
      setProductos((actual) => actual.map((p) => (p.id === guardado.id ? guardado : p)));
    } catch (err) {
      toast.error("No se pudo cambiar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setOcupado(null);
    }
  }

  async function mover(producto: Producto, direccion: -1 | 1) {
    const ordenados = [...productos].sort((a, b) => a.sort_order - b.sort_order);
    const i = ordenados.findIndex((p) => p.id === producto.id);
    const otro = ordenados[i + direccion];
    if (!otro) return;
    setOcupado(producto.id);
    try {
      // Si dos productos comparten número de orden, intercambiarlos no mueve
      // nada: se les da el lugar que ocupan en la lista.
      const [a, b] = await Promise.all([
        actualizar(producto.id, { sortOrder: String(i + direccion) }),
        actualizar(otro.id, { sortOrder: String(i) }),
      ]);
      setProductos((actual) =>
        actual.map((p) => (p.id === a.id ? a : p.id === b.id ? b : p)),
      );
    } catch (err) {
      toast.error("No se pudo reordenar", {
        description: err instanceof Error ? err.message : undefined,
      });
      setRecarga((v) => v + 1);
    } finally {
      setOcupado(null);
    }
  }

  async function borrar(producto: Producto) {
    const ok = await confirm({
      title: "Borrar producto",
      message: `Vas a borrar "${producto.name}" de tu catálogo. Si solo se te terminó, conviene marcarlo como agotado.`,
      confirmLabel: "Borrar",
      cancelLabel: "Volver",
      danger: true,
    });
    if (!ok) return;
    setOcupado(producto.id);
    try {
      const token = await tokenDeSesion();
      if (!token) throw new Error("Se venció la sesión. Volvé a entrar.");
      const res = await fetch(
        `/api/admin/products?bs=${encodeURIComponent(barbershop.slug)}&id=${encodeURIComponent(producto.id)}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
      );
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "No pudimos borrar el producto.");
      setProductos((actual) => actual.filter((p) => p.id !== producto.id));
      toast.success("Producto borrado");
    } catch (err) {
      toast.error("No se pudo borrar", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setOcupado(null);
    }
  }

  const ordenados = [...productos].sort((a, b) => a.sort_order - b.sort_order);
  const disponibles = productos.filter((p) => p.is_available).length;
  const puedeCargar = !soloLectura && productos.length < max;

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-fade-up">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
          Productos
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Tu catálogo
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Cargá lo que vendés en el mostrador: ceras, pomadas, polvos
          texturizadores. Tus clientes van a poder sumarlos a su turno cuando
          reserven y te los pagan en el local.
        </p>
        <p className="mt-3 max-w-2xl rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/25 bg-[color:var(--brand-gold-soft)] px-3 py-2.5 text-xs leading-5 text-[color:var(--text-secondary)]">
          <strong className="text-[color:var(--brand-gold)]">Todavía no se muestran.</strong>{" "}
          Por ahora podés ir dejando tu catálogo listo; en los próximos días
          van a aparecer en tu página y en la reserva.
        </p>
      </header>

      {carga.estado === "cargando" ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-5 animate-spin text-[color:var(--text-muted)]" />
        </div>
      ) : carga.estado === "error" ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[color:var(--danger)]/40 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]"
        >
          <p>{carga.mensaje}</p>
          {carga.sinMigracion ? null : (
            <Button type="button" variant="secondary" size="sm" onClick={() => setRecarga((v) => v + 1)}>
              Reintentar
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[color:var(--text-muted)]">
              {productos.length === 0
                ? "Todavía no cargaste ningún producto."
                : `${productos.length} de ${max} · ${disponibles} ${disponibles === 1 ? "disponible" : "disponibles"}`}
            </p>
            <Button
              type="button"
              onClick={() => setEditando("nuevo")}
              disabled={!puedeCargar}
              iconLeft={<Plus className="size-4" />}
            >
              Nuevo producto
            </Button>
          </div>

          {productos.length === 0 ? (
            <div className="card-premium flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] text-[color:var(--brand-gold)]">
                <Package className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm font-bold text-white">Empezá por el que más vendés</p>
              <p className="max-w-sm text-xs leading-5 text-[color:var(--text-muted)]">
                Con el nombre y el precio alcanza. La foto ayuda mucho: se
                puede sacar con el celular ahí mismo.
              </p>
            </div>
          ) : (
            <ul className="grid gap-2.5">
              {ordenados.map((producto, i) => {
                const enCurso = ocupado === producto.id;
                return (
                  <li
                    key={producto.id}
                    className={cn(
                      "card-premium flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:p-4",
                      !producto.is_available && "opacity-70",
                    )}
                  >
                    <Foto url={producto.public_url} nombre={producto.name} />
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="break-words text-sm font-bold text-white">{producto.name}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                        {etiquetaDeCategoria(producto.category)} ·{" "}
                        <span className="font-mono font-bold tabular-nums text-[color:var(--brand-gold)]">
                          {formatPrice(producto.price)}
                        </span>
                      </p>
                      {producto.description ? (
                        <p className="mt-1 break-words text-xs leading-5 text-[color:var(--text-secondary)]">
                          {producto.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={producto.is_available}
                        aria-label={`${producto.name}: ${producto.is_available ? "disponible" : "agotado"}`}
                        disabled={soloLectura || enCurso}
                        onClick={() => void cambiarDisponible(producto)}
                        className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-2 text-xs font-semibold text-[color:var(--text-secondary)] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-[var(--duration-base)]",
                            producto.is_available
                              ? "border-[color:var(--brand-gold)] bg-gold-grad"
                              : "border-[color:var(--border-default)] bg-[color:var(--surface-2)]",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0 top-1/2 size-[18px] -translate-y-1/2 rounded-full transition-transform duration-[var(--duration-base)]",
                              producto.is_available
                                ? "translate-x-[18px] bg-black"
                                : "translate-x-0.5 bg-[color:var(--text-muted)]",
                            )}
                          />
                        </span>
                        {producto.is_available ? "Disponible" : "Agotado"}
                      </button>

                      <div className="flex items-center">
                        <BotonIcono
                          etiqueta={`Subir ${producto.name}`}
                          disabled={soloLectura || enCurso || i === 0}
                          onClick={() => void mover(producto, -1)}
                        >
                          <ArrowUp className="size-4" />
                        </BotonIcono>
                        <BotonIcono
                          etiqueta={`Bajar ${producto.name}`}
                          disabled={soloLectura || enCurso || i === ordenados.length - 1}
                          onClick={() => void mover(producto, 1)}
                        >
                          <ArrowDown className="size-4" />
                        </BotonIcono>
                        <BotonIcono
                          etiqueta={`Editar ${producto.name}`}
                          disabled={soloLectura || enCurso}
                          onClick={() => setEditando(producto)}
                        >
                          <Pencil className="size-4" />
                        </BotonIcono>
                        <BotonIcono
                          etiqueta={`Borrar ${producto.name}`}
                          peligro
                          disabled={soloLectura || enCurso}
                          onClick={() => void borrar(producto)}
                        >
                          <Trash2 className="size-4" />
                        </BotonIcono>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <FormularioDeProducto
        key={editando === null ? "cerrado" : editando === "nuevo" ? "nuevo" : editando.id}
        modo={editando}
        barbershopSlug={barbershop.slug}
        onClose={() => setEditando(null)}
        onGuardado={(guardado, esNuevo) => {
          setProductos((actual) =>
            esNuevo ? [...actual, guardado] : actual.map((p) => (p.id === guardado.id ? guardado : p)),
          );
          setEditando(null);
          toast.success(esNuevo ? "Producto cargado" : "Producto actualizado");
        }}
      />
    </div>
  );
}

function Foto({ url, nombre }: { url: string | null; nombre: string }) {
  return (
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-2)] text-[color:var(--text-subtle)]">
      {url ? (
        <Image src={url} alt={`Foto de ${nombre}`} fill sizes="56px" className="object-cover" unoptimized />
      ) : (
        <Package className="size-5" aria-hidden="true" />
      )}
    </span>
  );
}

function BotonIcono({
  etiqueta,
  peligro,
  disabled,
  onClick,
  children,
}: {
  etiqueta: string;
  peligro?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition duration-[var(--duration-fast)] enabled:active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-30",
        peligro
          ? "hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)]"
          : "hover:bg-[color:var(--surface-2)] hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function FormularioDeProducto({
  modo,
  barbershopSlug,
  onClose,
  onGuardado,
}: {
  modo: Producto | "nuevo" | null;
  barbershopSlug: string;
  onClose: () => void;
  onGuardado: (producto: Producto, esNuevo: boolean) => void;
}) {
  const existente = modo !== null && modo !== "nuevo" ? modo : null;
  const [name, setName] = useState(existente?.name ?? "");
  const [price, setPrice] = useState(existente ? String(existente.price) : "");
  const [category, setCategory] = useState(existente?.category ?? "cera");
  const [description, setDescription] = useState(existente?.description ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(existente?.public_url ?? null);
  const [quitarFoto, setQuitarFoto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const abierto = modo !== null;
  const dialogRef = useDialogFocus<HTMLFormElement>(abierto, {
    onEscape: guardando ? undefined : onClose,
  });

  // La vista previa de un archivo recién elegido ocupa memoria hasta soltarla.
  useEffect(() => {
    return () => {
      if (vistaPrevia?.startsWith("blob:")) URL.revokeObjectURL(vistaPrevia);
    };
  }, [vistaPrevia]);

  if (!abierto || typeof document === "undefined") return null;

  function elegirFoto(elegido: File | null) {
    if (!elegido) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(elegido.type)) {
      setError("Esa foto no sirve. Usá PNG, JPG o WebP.");
      return;
    }
    if (elegido.size > 5 * 1024 * 1024) {
      setError("La foto pesa más de 5 MB. Probá con una más liviana.");
      return;
    }
    setError("");
    setFile(elegido);
    setQuitarFoto(false);
    setVistaPrevia(URL.createObjectURL(elegido));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (guardando) return;
    const validado = validarProducto({ name, price, category, description });
    if (!validado.ok) {
      setError(validado.error);
      return;
    }
    setError("");
    setGuardando(true);
    try {
      const token = await tokenDeSesion();
      if (!token) throw new Error("Se venció la sesión. Volvé a entrar.");
      const form = new FormData();
      form.set("bs", barbershopSlug);
      form.set("name", validado.valor.name);
      form.set("price", String(validado.valor.price));
      form.set("category", validado.valor.category);
      form.set("description", validado.valor.description ?? "");
      if (file) form.set("file", file);
      if (existente) {
        form.set("productId", existente.id);
        if (quitarFoto && !file) form.set("removePhoto", "true");
      }
      const res = await fetch("/api/admin/products", {
        method: existente ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = (await res.json().catch(() => ({}))) as {
        producto?: Producto;
        error?: string;
      };
      if (!res.ok || !payload.producto) {
        throw new Error(payload.error ?? "No pudimos guardar el producto.");
      }
      onGuardado(payload.producto, !existente);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No pudimos guardar el producto.");
    } finally {
      setGuardando(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !guardando) onClose();
      }}
    >
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="producto-titulo"
        onSubmit={handleSubmit}
        noValidate
        className="relative w-full max-w-lg overflow-hidden rounded-t-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] shadow-2xl animate-sheet-up sm:rounded-[var(--radius-lg)]"
      >
        <div className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] px-5 py-4">
          <h2 id="producto-titulo" className="min-w-0 flex-1 text-base font-bold text-white sm:text-lg">
            {existente ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-2)] hover:text-white disabled:opacity-40"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid max-h-[62dvh] gap-4 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-4">
            <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[color:var(--border-default)] bg-[color:var(--surface-2)] text-[color:var(--text-subtle)]">
              {vistaPrevia ? (
                // Vista previa local (blob:) o la foto ya subida.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vistaPrevia} alt="" className="size-full object-cover" />
              ) : (
                <Package className="size-6" aria-hidden="true" />
              )}
            </span>
            <div className="flex min-w-0 flex-col items-start gap-1.5">
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-xs font-semibold text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--brand-gold-ring)] hover:text-white">
                <ImagePlus className="size-4" aria-hidden="true" />
                {vistaPrevia ? "Cambiar foto" : "Agregar foto"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={guardando}
                  onChange={(e) => {
                    elegirFoto(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              {vistaPrevia ? (
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => {
                    setFile(null);
                    setVistaPrevia(null);
                    setQuitarFoto(true);
                  }}
                  className="min-h-9 text-xs font-semibold text-[color:var(--text-muted)] underline-offset-2 hover:text-[color:var(--danger)] hover:underline"
                >
                  Quitar foto
                </button>
              ) : (
                <p className="text-xs text-[color:var(--text-muted)]">Opcional. PNG, JPG o WebP.</p>
              )}
            </div>
          </div>

          <Field label="Nombre" htmlFor="producto-nombre" required>
            <Input
              id="producto-nombre"
              type="text"
              value={name}
              disabled={guardando}
              maxLength={LARGO_MAX_NOMBRE}
              placeholder="Cera mate"
              autoComplete="off"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Precio" htmlFor="producto-precio" required hint="En pesos, sin centavos.">
              <Input
                id="producto-precio"
                type="text"
                inputMode="numeric"
                value={price}
                disabled={guardando}
                maxLength={12}
                placeholder="8.000"
                autoComplete="off"
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
            <Field label="Categoría" htmlFor="producto-categoria" required>
              <Select
                id="producto-categoria"
                value={category}
                disabled={guardando}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIAS_DE_PRODUCTO.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Descripción"
            htmlFor="producto-descripcion"
            optional
            hint="Una línea: para qué sirve o qué lo distingue."
          >
            <Textarea
              id="producto-descripcion"
              value={description}
              disabled={guardando}
              rows={2}
              maxLength={LARGO_MAX_DESCRIPCION}
              placeholder="Fijación fuerte, acabado sin brillo."
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="border-l-2 border-[color:var(--danger)] pl-3 text-xs font-semibold text-[color:var(--danger)]"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-[color:var(--border-subtle)] px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Volver
          </Button>
          <Button type="submit" loading={guardando} disabled={guardando}>
            {guardando ? "Guardando…" : existente ? "Guardar cambios" : "Cargar producto"}
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
