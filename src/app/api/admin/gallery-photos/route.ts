import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

const GALLERY_BUCKET = "barbershop-gallery";
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

async function assertAdminOfBarbershop(
  authHeader: string | null,
  barbershopSlug: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  const accessToken = authHeader.slice("Bearer ".length);
  const supabaseAdmin = getSupabaseAdminClient();

  const { data: userResult, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !userResult.user) {
    return { ok: false, status: 401, error: "Sesión inválida." };
  }

  const { data: adminRow, error: adminError } = await supabaseAdmin
    .from("barbershop_admins")
    .select("user_id")
    .eq("user_id", userResult.user.id)
    .eq("barbershop_slug", barbershopSlug)
    .maybeSingle();

  if (adminError) {
    return { ok: false, status: 500, error: "Error validando permisos." };
  }
  if (!adminRow) {
    return { ok: false, status: 403, error: "No sos admin de esta barbería." };
  }
  return { ok: true };
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Body inválido." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  const barbershopSlug = formData.get("barbershopSlug");
  const caption = formData.get("caption");
  const sortOrderRaw = formData.get("sortOrder");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Falta el archivo." },
      { status: 400 },
    );
  }
  if (typeof barbershopSlug !== "string" || !barbershopSlug.trim()) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usá PNG, JPG o WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo excede 5MB." },
      { status: 400 },
    );
  }

  const auth = await assertAdminOfBarbershop(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Plan vencido => modo lectura: la barbería se puede leer, no escribir.
  const planGate = await assertPlanActive(barbershopSlug);
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error },
      { status: planGate.status },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const extension = (file.name.split(".").pop() ?? "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(extension)
    ? extension
    : "jpg";
  const storagePath = `${barbershopSlug}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${safeExt}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from(GALLERY_BUCKET)
    .upload(storagePath, arrayBuffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    Sentry.captureException(uploadError);
    return NextResponse.json(
      { error: "No pudimos subir la foto." },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(GALLERY_BUCKET)
    .getPublicUrl(storagePath);

  const sortOrder =
    typeof sortOrderRaw === "string" ? Number(sortOrderRaw) || 0 : 0;
  const captionValue =
    typeof caption === "string" && caption.trim() ? caption.trim() : null;

  const { data: photo, error: insertError } = await supabaseAdmin
    .from("barbershop_gallery_photos")
    .insert({
      barbershop_slug: barbershopSlug,
      storage_path: storagePath,
      public_url: publicUrlData.publicUrl,
      caption: captionValue,
      sort_order: sortOrder,
    })
    .select(
      "id, created_at, barbershop_slug, storage_path, public_url, caption, sort_order, deleted_at",
    )
    .single();

  if (insertError || !photo) {
    // Cleanup del archivo subido para no dejar basura.
    await supabaseAdmin.storage.from(GALLERY_BUCKET).remove([storagePath]);
    Sentry.captureException(insertError);
    return NextResponse.json(
      { error: "No pudimos guardar la foto en la base." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, photo }, { status: 201 });
}

export async function PATCH(request: Request) {
  let payload: {
    photoId?: unknown;
    barbershopSlug?: unknown;
    caption?: unknown;
    sortOrder?: unknown;
  };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json(
      { error: "Body inválido." },
      { status: 400 },
    );
  }

  const photoId = typeof payload.photoId === "string" ? payload.photoId : "";
  const barbershopSlug =
    typeof payload.barbershopSlug === "string" ? payload.barbershopSlug : "";
  if (!photoId || !barbershopSlug) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }

  const auth = await assertAdminOfBarbershop(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Plan vencido => modo lectura: la barbería se puede leer, no escribir.
  const planGate = await assertPlanActive(barbershopSlug);
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error },
      { status: planGate.status },
    );
  }

  const updateValues: { caption?: string | null; sort_order?: number } = {};
  if ("caption" in payload) {
    const captionValue =
      typeof payload.caption === "string" && payload.caption.trim()
        ? payload.caption.trim()
        : null;
    updateValues.caption = captionValue;
  }
  if (typeof payload.sortOrder === "number") {
    updateValues.sort_order = payload.sortOrder;
  }
  if (Object.keys(updateValues).length === 0) {
    return NextResponse.json(
      { error: "Nada para actualizar." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data: photo, error: updateError } = await supabaseAdmin
    .from("barbershop_gallery_photos")
    .update(updateValues)
    .eq("id", photoId)
    .eq("barbershop_slug", barbershopSlug)
    .select(
      "id, created_at, barbershop_slug, storage_path, public_url, caption, sort_order, deleted_at",
    )
    .single();

  if (updateError || !photo) {
    Sentry.captureException(updateError);
    return NextResponse.json(
      { error: "No pudimos actualizar la foto." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, photo });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const photoId = url.searchParams.get("photoId");
  const barbershopSlug = url.searchParams.get("barbershopSlug");
  const storagePath = url.searchParams.get("storagePath");

  if (!photoId || !barbershopSlug || !storagePath) {
    return NextResponse.json(
      { error: "Faltan parámetros." },
      { status: 400 },
    );
  }

  const auth = await assertAdminOfBarbershop(
    request.headers.get("authorization"),
    barbershopSlug,
  );
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Plan vencido => modo lectura: la barbería se puede leer, no escribir.
  const planGate = await assertPlanActive(barbershopSlug);
  if (!planGate.ok) {
    return NextResponse.json(
      { error: planGate.error },
      { status: planGate.status },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  await supabaseAdmin.storage.from(GALLERY_BUCKET).remove([storagePath]);
  const { error: deleteError } = await supabaseAdmin
    .from("barbershop_gallery_photos")
    .delete()
    .eq("id", photoId)
    .eq("barbershop_slug", barbershopSlug);

  if (deleteError) {
    Sentry.captureException(deleteError);
    return NextResponse.json(
      { error: "No pudimos eliminar la foto." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
