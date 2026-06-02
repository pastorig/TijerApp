import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { demoBarbershops } from "@/data/demo-barbershops";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type HardDeleteBarbershopPayload = {
  slug: string;
  /** Si true, también elimina el usuario admin de Supabase Auth (libera el email). */
  removeAdminUser?: boolean;
};

/**
 * Borrado DEFINITIVO de una barbería y todas sus dependencias.
 *
 * Orden: appointments → time_blocks → weekly_schedules → services → barbers
 *      → barbershop_admins → barbershops [→ auth user si removeAdminUser=true]
 *
 * Esta acción es irreversible. El UI requiere doble confirmación.
 * Las barberías demo NO se pueden eliminar desde acá.
 */
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
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
      data: { user },
      error: sessionError,
    } = await sessionClient.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Sesion invalida." }, { status: 401 });
    }

    const payload = (await request.json()) as HardDeleteBarbershopPayload;
    const slug = payload.slug?.trim().toLowerCase();

    if (!slug) {
      return NextResponse.json(
        { error: "El slug es obligatorio." },
        { status: 400 },
      );
    }

    if (demoBarbershops.some((barbershop) => barbershop.slug === slug)) {
      return NextResponse.json(
        { error: "Las barberias demo no se pueden eliminar." },
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
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (!existingBarbershop) {
      return NextResponse.json(
        { error: "No encontramos la barberia." },
        { status: 404 },
      );
    }

    // Capturar el admin user ID ANTES de borrar barbershop_admins (lo usamos
    // después si removeAdminUser=true).
    let adminUserIdToRemove: string | null = null;
    if (payload.removeAdminUser) {
      const { data: adminLinks } = await supabaseAdmin
        .from("barbershop_admins")
        .select("user_id")
        .eq("barbershop_slug", slug);
      if (adminLinks && adminLinks.length > 0) {
        // Solo borramos el user si NO administra otras barberías.
        const userId = adminLinks[0].user_id as string;
        const { data: otherLinks } = await supabaseAdmin
          .from("barbershop_admins")
          .select("barbershop_slug")
          .eq("user_id", userId)
          .neq("barbershop_slug", slug);
        if (!otherLinks || otherLinks.length === 0) {
          adminUserIdToRemove = userId;
        }
      }
    }

    // Borrado en cascada manual (en orden seguro para no violar FKs).
    const deleteOps = [
      supabaseAdmin
        .from("appointments")
        .delete()
        .eq("barbershop_slug", slug),
      supabaseAdmin
        .from("barber_time_blocks")
        .delete()
        .eq("barbershop_slug", slug),
      supabaseAdmin
        .from("barber_weekly_schedules")
        .delete()
        .eq("barbershop_slug", slug),
      supabaseAdmin
        .from("barber_services")
        .delete()
        .eq("barbershop_slug", slug),
      supabaseAdmin.from("barbers").delete().eq("barbershop_slug", slug),
      supabaseAdmin
        .from("barbershop_admins")
        .delete()
        .eq("barbershop_slug", slug),
    ];

    for (const op of deleteOps) {
      const { error } = await op;
      if (error) {
        return NextResponse.json(
          { error: `Fallo al limpiar dependencias: ${error.message}` },
          { status: 500 },
        );
      }
    }

    const { error: barbershopDeleteError } = await supabaseAdmin
      .from("barbershops")
      .delete()
      .eq("slug", slug);

    if (barbershopDeleteError) {
      return NextResponse.json(
        { error: `No pudimos borrar la barberia: ${barbershopDeleteError.message}` },
        { status: 500 },
      );
    }

    // Opcional: borrar el user admin de Auth (libera el email para reuso).
    if (adminUserIdToRemove) {
      const { error: deleteUserError } =
        await supabaseAdmin.auth.admin.deleteUser(adminUserIdToRemove);
      if (deleteUserError) {
        // No bloqueante — la barbería ya se borró.
        console.warn(
          `[hard-delete-barbershop] No se pudo borrar user admin ${adminUserIdToRemove}:`,
          deleteUserError,
        );
      }
    }

    return NextResponse.json({
      message: "Barberia eliminada definitivamente.",
      slug,
      removedAdminUser: Boolean(adminUserIdToRemove),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido." },
      { status: 500 },
    );
  }
}
