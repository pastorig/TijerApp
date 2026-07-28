import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { assertPlanActive } from "@/lib/api-plan-guard";

export const runtime = "nodejs";

const LOGO_BUCKET = "barbershop-logos";
const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function getExtensionFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    default:
      return "png";
  }
}

function getStoragePathFromPublicUrl(
  publicUrl: string | null | undefined,
): string | null {
  if (!publicUrl) return null;
  const match = publicUrl.match(
    /\/storage\/v1\/object\/public\/[^/]+\/(.+?)(\?|$)/,
  );
  return match?.[1] ?? null;
}

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
  const previousLogoUrl = formData.get("previousLogoUrl");

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
      { error: "Formato no permitido. Usá PNG, JPG, WebP o SVG." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "El archivo excede 2MB." },
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
  const extension = getExtensionFromMime(file.type);
  const newPath = `${barbershopSlug}/logo.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabaseAdmin.storage
    .from(LOGO_BUCKET)
    .upload(newPath, arrayBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    Sentry.captureException(uploadError);
    return NextResponse.json(
      { error: "No pudimos subir el logo." },
      { status: 500 },
    );
  }

  // Si el path anterior es distinto, borramos el archivo viejo.
  const previousPath =
    typeof previousLogoUrl === "string"
      ? getStoragePathFromPublicUrl(previousLogoUrl)
      : null;
  if (previousPath && previousPath !== newPath) {
    await supabaseAdmin.storage.from(LOGO_BUCKET).remove([previousPath]);
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(newPath);
  const versionedUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  // Persistir la URL en barbershops.
  const { error: updateError } = await supabaseAdmin
    .from("barbershops")
    .update({ logo_url: versionedUrl })
    .eq("slug", barbershopSlug);

  if (updateError) {
    Sentry.captureException(updateError);
    return NextResponse.json(
      { error: "Subimos el logo pero falló guardar la URL." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, logoUrl: versionedUrl, storagePath: newPath },
    { status: 200 },
  );
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const barbershopSlug = url.searchParams.get("barbershopSlug");
  const currentLogoUrl = url.searchParams.get("currentLogoUrl");

  if (!barbershopSlug) {
    return NextResponse.json(
      { error: "Falta barbershopSlug." },
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
  const storagePath = currentLogoUrl
    ? getStoragePathFromPublicUrl(currentLogoUrl)
    : null;
  if (storagePath) {
    await supabaseAdmin.storage.from(LOGO_BUCKET).remove([storagePath]);
  }

  const { error: updateError } = await supabaseAdmin
    .from("barbershops")
    .update({ logo_url: null })
    .eq("slug", barbershopSlug);

  if (updateError) {
    Sentry.captureException(updateError);
    return NextResponse.json(
      { error: "No pudimos quitar el logo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
