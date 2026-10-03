"use client";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { StaffShell } from "@/components/staff/StaffShell";
import { StaffPassword } from "@/components/staff/StaffPassword";
import { StaffNotifications } from "@/components/staff/StaffNotifications";
import { demoBarbershops } from "@/data/demo-barbershops";
import { getSupabaseClient } from "@/lib/supabase";

export default function DesignPreview() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const token = [encode({ alg: "HS256", typ: "JWT" }), encode({ sub: "00000000-0000-4000-8000-000000000001", exp: 4000000000, role: "authenticated" }), "fixture-only"].join(".");
    void getSupabaseClient().auth.setSession({ access_token: token, refresh_token: "fixture-only" }).then(() => setReady(true));
  }, []);
  if (process.env.NODE_ENV !== "development") notFound();
  const shop = { ...demoBarbershops[0], slug: "design-preview", name: "Barberia demo" };
  return ready ? <StaffShell barbershopSlug={shop.slug} barbershopName={shop.name}>
    <header><h1 className="text-2xl font-semibold text-white sm:text-3xl">Mi cuenta</h1></header>
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start"><StaffPassword /><StaffNotifications barbershopSlug={shop.slug} /></div>
  </StaffShell> : null;
}
