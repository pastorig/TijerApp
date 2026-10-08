import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  assertPlanActive,
  assertPlanFeature,
  assertTierIncludesFeature,
} from "@/lib/api-plan-guard";
import { resolveBarbershopAdminAccess } from "@/lib/server/barbershop-admin-access";
import { MAX_PRODUCTOS_POR_BARBERIA, validarProducto } from "@/lib/productos";

export const runtime = "nodejs";

/**
 * /api/admin/products — el catálogo de productos de una barbería (feature 035).
 *
 *   GET    ?bs=<slug>                 → { productos }
 *   POST   FormData (bs, name, price, category, description?, file?)
 *   PATCH  FormData (bs, productId, y lo que cambie: name, price, category,
 *                    description, isAvailable, sortOrder, file, removePhoto)
 *   DELETE ?bs=<slug>&id=<productId>  → borrado lógico
 *
 * Lo puede usar cualquier administrador de la barbería (decidido con Bautista
 * el 08/10/2026): cargar productos no crea cuentas ni toca plata.
 *
 * Tres cosas que este archivo hace a propósito, porque ya fallaron en otros
 * lados del proyecto:
 * - **Cada update y delete filtra por `barbershop_slug`.** Con service_role no
 *   hay RLS que frene: sin ese filtro, un admin editaba cupones de otra
 *   barbería con solo conocer el id.
 * - **El path de la foto se lee de la base**, nunca del navegador. En la
 *   galería se borraba el archivo que mandara el cliente.
 * - **Si la tabla no existe** (migración sin correr) se contesta 503 con un
 *   mensaje que lo dice. Una feature muerta sin síntomas ya pasó dos veces.
 */

const BUCKET = "barbershop-products";
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const COLUMNAS =
  "id, barbershop_slug, name, price, category, description, public_url, is_available, sort_order, created_at";

type FilaDeProducto = {
  id: string;
  barbershop_slug: string;
  name: string;
  price: number;
  category: string;
  description: string | null;
  public_url: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
};

// La tabla es nueva y todavía no está en los tipos generados de Supabase.
const TABLA = "barbershop_products" as never;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

/** ¿El error es "esa tabla no existe"? (Postgres 42P01, PostgREST PGRST205). */
function faltaLaTabla(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

const SIN_MIGRACION = {
  error:
    "El catálogo de productos todavía no está activado en esta instalación. Falta correr la migración.",
  sinMigracion: true,
};

function texto(valor: FormDataEntryValue | null): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}

/** Valida y sube la foto. Devuelve dónde quedó, o el motivo del rechazo. */
async function subirFoto(
  slug: string,
  file: File,
): Promise<
  | { ok: true; storagePath: string; publicUrl: string }
  | { ok: false; status: number; error: string }
> {
  if (!ALLOWED_MIME.includes(file.type)) {
    return { ok: false, status: 400, error: "Formato no permitido. Usá PNG, JPG o WebP." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, status: 400, error: "La foto pesa más de 5 MB." };
  }
  const supabase = getSupabaseAdminClient();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${slug}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    Sentry.captureException(error, { tags: { route: "admin/products", step: "upload" } });
    return { ok: false, status: 500, error: "No pudimos subir la foto. Probá de nuevo." };
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return { ok: true, storagePath, publicUrl: data.publicUrl };
}

async function borrarFoto(storagePath: string | null) {
  if (!storagePath) return;
  const { error } = await getSupabaseAdminClient().storage.from(BUCKET).remove([storagePath]);
  // Una foto huérfana no le rompe nada a nadie: se registra y se sigue.
  if (error) Sentry.captureException(error, { tags: { route: "admin/products", step: "remove" } });
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("bs") ?? "";
  const access = await resolveBarbershopAdminAccess(request.headers.get("authorization"), slug);
  if (!access.ok) return json({ error: access.error }, access.status);

  // Leer mira el tier y no el vencimiento: en modo lectura el dueño sigue
  // viendo su catálogo, igual que ve todo lo demás.
  const tier = await assertTierIncludesFeature(slug, "catalogo_productos");
  if (!tier.ok) return json({ error: tier.error }, tier.status);

  const { data, error } = await getSupabaseAdminClient()
    .from(TABLA)
    .select(COLUMNAS)
    .eq("barbershop_slug", slug)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (faltaLaTabla(error)) return json(SIN_MIGRACION, 503);
    Sentry.captureException(error, { tags: { route: "admin/products", step: "list" } });
    return json({ error: "No pudimos leer los productos." }, 500);
  }
  return json({
    ok: true,
    productos: (data ?? []) as unknown as FilaDeProducto[],
    max: MAX_PRODUCTOS_POR_BARBERIA,
  });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Body inválido." }, 400);
  }
  const slug = texto(form.get("bs")) ?? "";

  const access = await resolveBarbershopAdminAccess(request.headers.get("authorization"), slug);
  if (!access.ok) return json({ error: access.error }, access.status);
  const feature = await assertPlanFeature(slug, "catalogo_productos");
  if (!feature.ok) return json({ error: feature.error }, feature.status);

  const validado = validarProducto({
    name: texto(form.get("name")),
    price: texto(form.get("price")),
    category: texto(form.get("category")),
    description: texto(form.get("description")),
  });
  if (!validado.ok) return json({ error: validado.error }, 400);

  const supabase = getSupabaseAdminClient();

  // Cuántos hay y cuál es el último del orden, en una sola consulta.
  const { data: existentes, error: listError } = await supabase
    .from(TABLA)
    .select("sort_order")
    .eq("barbershop_slug", slug)
    .is("deleted_at", null);
  if (listError) {
    if (faltaLaTabla(listError)) return json(SIN_MIGRACION, 503);
    Sentry.captureException(listError, { tags: { route: "admin/products", step: "count" } });
    return json({ error: "No pudimos guardar el producto." }, 500);
  }
  const filas = (existentes ?? []) as unknown as Array<{ sort_order: number }>;
  if (filas.length >= MAX_PRODUCTOS_POR_BARBERIA) {
    return json(
      { error: `Llegaste al tope de ${MAX_PRODUCTOS_POR_BARBERIA} productos. Borrá alguno para cargar otro.` },
      400,
    );
  }
  const siguienteOrden = filas.reduce((max, f) => Math.max(max, f.sort_order), -1) + 1;

  const file = form.get("file");
  let foto: { storagePath: string; publicUrl: string } | null = null;
  if (file instanceof File && file.size > 0) {
    const subida = await subirFoto(slug, file);
    if (!subida.ok) return json({ error: subida.error }, subida.status);
    foto = subida;
  }

  const { data, error } = await supabase
    .from(TABLA)
    .insert({
      barbershop_slug: slug,
      ...validado.valor,
      storage_path: foto?.storagePath ?? null,
      public_url: foto?.publicUrl ?? null,
      sort_order: siguienteOrden,
    } as never)
    .select(COLUMNAS)
    .single();

  if (error || !data) {
    // La foto ya se subió: si el producto no se guardó, no se deja suelta.
    await borrarFoto(foto?.storagePath ?? null);
    Sentry.captureException(error, { tags: { route: "admin/products", step: "insert" } });
    return json({ error: "No pudimos guardar el producto." }, 500);
  }
  return json({ ok: true, producto: data as unknown as FilaDeProducto });
}

export async function PATCH(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Body inválido." }, 400);
  }
  const slug = texto(form.get("bs")) ?? "";
  const productId = texto(form.get("productId")) ?? "";
  if (!productId) return json({ error: "Falta el producto." }, 400);

  const access = await resolveBarbershopAdminAccess(request.headers.get("authorization"), slug);
  if (!access.ok) return json({ error: access.error }, access.status);
  const feature = await assertPlanFeature(slug, "catalogo_productos");
  if (!feature.ok) return json({ error: feature.error }, feature.status);

  const supabase = getSupabaseAdminClient();
  const { data: actualRaw, error: readError } = await supabase
    .from(TABLA)
    .select("id, name, price, category, description, storage_path")
    .eq("id", productId)
    .eq("barbershop_slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (readError) {
    if (faltaLaTabla(readError)) return json(SIN_MIGRACION, 503);
    Sentry.captureException(readError, { tags: { route: "admin/products", step: "read" } });
    return json({ error: "No pudimos actualizar el producto." }, 500);
  }
  const actual = actualRaw as unknown as {
    id: string;
    name: string;
    price: number;
    category: string;
    description: string | null;
    storage_path: string | null;
  } | null;
  if (!actual) return json({ error: "Ese producto no existe." }, 404);

  const cambios: Record<string, unknown> = {};

  // Los datos del producto se validan juntos, completando lo que no vino con
  // lo que ya está guardado: así "cambiar solo el precio" pasa por las mismas
  // reglas que crear uno entero.
  const tocaDatos = ["name", "price", "category", "description"].some((k) => form.has(k));
  if (tocaDatos) {
    const validado = validarProducto({
      name: texto(form.get("name")) ?? actual.name,
      price: form.has("price") ? texto(form.get("price")) : actual.price,
      category: texto(form.get("category")) ?? actual.category,
      description: form.has("description")
        ? texto(form.get("description"))
        : (actual.description ?? ""),
    });
    if (!validado.ok) return json({ error: validado.error }, 400);
    Object.assign(cambios, validado.valor);
  }

  if (form.has("isAvailable")) {
    cambios.is_available = texto(form.get("isAvailable")) === "true";
  }
  if (form.has("sortOrder")) {
    const orden = Number(texto(form.get("sortOrder")));
    if (!Number.isInteger(orden) || orden < 0 || orden > 10_000) {
      return json({ error: "El orden no es válido." }, 400);
    }
    cambios.sort_order = orden;
  }

  // Foto: una nueva reemplaza a la anterior; `removePhoto` la saca.
  const file = form.get("file");
  let fotoNueva: { storagePath: string; publicUrl: string } | null = null;
  let borrarAnterior = false;
  if (file instanceof File && file.size > 0) {
    const subida = await subirFoto(slug, file);
    if (!subida.ok) return json({ error: subida.error }, subida.status);
    fotoNueva = subida;
    cambios.storage_path = subida.storagePath;
    cambios.public_url = subida.publicUrl;
    borrarAnterior = true;
  } else if (texto(form.get("removePhoto")) === "true") {
    cambios.storage_path = null;
    cambios.public_url = null;
    borrarAnterior = true;
  }

  if (Object.keys(cambios).length === 0) {
    return json({ error: "Nada para actualizar." }, 400);
  }

  const { data, error } = await supabase
    .from(TABLA)
    .update(cambios as never)
    .eq("id", productId)
    .eq("barbershop_slug", slug)
    .select(COLUMNAS)
    .single();

  if (error || !data) {
    await borrarFoto(fotoNueva?.storagePath ?? null);
    Sentry.captureException(error, { tags: { route: "admin/products", step: "update" } });
    return json({ error: "No pudimos actualizar el producto." }, 500);
  }
  // Recién con el producto guardado se borra la foto vieja.
  if (borrarAnterior) await borrarFoto(actual.storage_path);
  return json({ ok: true, producto: data as unknown as FilaDeProducto });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("bs") ?? "";
  const productId = url.searchParams.get("id") ?? "";
  if (!productId) return json({ error: "Falta el producto." }, 400);

  const access = await resolveBarbershopAdminAccess(request.headers.get("authorization"), slug);
  if (!access.ok) return json({ error: access.error }, access.status);

  // Borrar NO exige que el plan traiga el catálogo: una barbería que bajó de
  // plan tiene que poder limpiar lo que dejó cargado. Sí exige plan vigente
  // (en modo lectura no se escribe nada).
  const plan = await assertPlanActive(slug);
  if (!plan.ok) return json({ error: plan.error }, plan.status);

  const supabase = getSupabaseAdminClient();
  // Borrado lógico: cuando los turnos guarden productos (etapa C), el renglón
  // del turno tiene que poder seguir apuntando a este.
  const { data, error } = await supabase
    .from(TABLA)
    .update({ deleted_at: new Date().toISOString(), is_available: false } as never)
    .eq("id", productId)
    .eq("barbershop_slug", slug)
    .is("deleted_at", null)
    .select("id, storage_path")
    .maybeSingle();

  if (error) {
    if (faltaLaTabla(error)) return json(SIN_MIGRACION, 503);
    Sentry.captureException(error, { tags: { route: "admin/products", step: "delete" } });
    return json({ error: "No pudimos borrar el producto." }, 500);
  }
  if (!data) return json({ error: "Ese producto no existe." }, 404);

  // La foto sí se borra de verdad: no la va a mostrar nadie más.
  await borrarFoto((data as unknown as { storage_path: string | null }).storage_path);
  return json({ ok: true });
}
