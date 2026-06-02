import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { demoBarbershops } from "@/data/demo-barbershops";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type DeleteBarbershopPayload = {
  slug: string;
};

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

    const payload = (await request.json()) as DeleteBarbershopPayload;
    const slug = payload.slug?.trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { error: "El slug es obligatorio." },
        { status: 400 },
      );
    }

    if (demoBarbershops.some((barbershop) => barbershop.slug === slug)) {
      return NextResponse.json(
        { error: "Las barberias demo no se pueden eliminar desde owner." },
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
        { error: "Solo un owner de TijerApp puede eliminar barberias." },
        { status: 403 },
      );
    }

    const { data: existingBarbershop } = await supabaseAdmin
      .from("barbershops")
      .select("slug, is_active")
      .eq("slug", slug)
      .maybeSingle();

    if (!existingBarbershop) {
      return NextResponse.json(
        { error: "No encontramos la barberia." },
        { status: 404 },
      );
    }

    const { error } = await supabaseAdmin
      .from("barbershops")
      .update({ is_active: false })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json(
        { error: "No pudimos eliminar la barberia." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Barberia eliminada correctamente.",
      slug,
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos eliminar la barberia." },
      { status: 500 },
    );
  }
}
