import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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

    const supabaseAdmin = getSupabaseAdminClient();
    const { count, error: countError } = await supabaseAdmin
      .from("platform_owners")
      .select("user_id", { count: "exact", head: true });

    if (countError) {
      return NextResponse.json(
        { error: "No pudimos verificar los owners actuales." },
        { status: 500 },
      );
    }

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "El owner inicial ya fue configurado." },
        { status: 409 },
      );
    }

    const { error: insertError } = await supabaseAdmin
      .from("platform_owners")
      .insert({
        user_id: user.id,
        role: "owner",
      });

    if (insertError) {
      return NextResponse.json(
        { error: "No pudimos asignar el owner inicial." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: "Owner inicial configurado correctamente.",
      email: user.email ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos configurar el owner inicial." },
      { status: 500 },
    );
  }
}
