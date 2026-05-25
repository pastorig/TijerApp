import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type ResetBarbershopAdminPayload = {
  slug: string;
};

function createTemporaryPassword() {
  return `BarberSync${Math.random().toString(36).slice(-8)}!9`;
}

export async function POST(request: Request) {
  try {
    const authorizationHeader = request.headers.get("authorization");
    const accessToken = authorizationHeader?.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publishableKey) {
      return NextResponse.json(
        { error: "Falta configuracion de Supabase." },
        { status: 500 },
      );
    }

    const sessionClient = createClient(supabaseUrl, publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: sessionError,
    } = await sessionClient.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Sesion invalida." }, { status: 401 });
    }

    const payload = (await request.json()) as ResetBarbershopAdminPayload;
    const slug = payload.slug?.trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { error: "El slug es obligatorio." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const { data: ownerAccess } = await supabaseAdmin
      .from("platform_owners")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!ownerAccess) {
      return NextResponse.json(
        { error: "Solo un owner de BarberSync puede resetear accesos admin." },
        { status: 403 },
      );
    }

    const { data: adminAccess, error: adminAccessError } = await supabaseAdmin
      .from("barbershop_admins")
      .select("user_id, barbershop_slug, role")
      .eq("barbershop_slug", slug)
      .order("role", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (adminAccessError || !adminAccess) {
      return NextResponse.json(
        { error: "No encontramos un admin asignado a esa barberia." },
        { status: 404 },
      );
    }

    const temporaryPassword = createTemporaryPassword();
    const { data: updatedUser, error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(adminAccess.user_id, {
        password: temporaryPassword,
      });

    if (updateError || !updatedUser.user) {
      return NextResponse.json(
        { error: "No pudimos resetear el acceso admin." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Acceso admin regenerado correctamente.",
      email: updatedUser.user.email ?? "",
      temporaryPassword,
      slug,
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos resetear el acceso admin." },
      { status: 500 },
    );
  }
}
