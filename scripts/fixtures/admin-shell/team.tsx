"use client";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminTeamManager } from "@/components/admin/AdminTeamManager";
import { StaffAccessSection } from "@/components/admin/StaffAccessSection";
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
  const base = demoBarbershops[0];
  const shop = { ...base, slug: "design-preview", name: "Barberia demo", barbers: [
    { ...base.barbers[0], id: "demo-owner", name: "Alex Demo", isOwner: true },
    { ...base.barbers[0], id: "demo-staff", name: "Sam Demo", isOwner: false },
    { ...base.barbers[0], id: "demo-new", name: "Profesional sin acceso", isOwner: false },
  ] };
  return <AdminChrome barbershopSlug={shop.slug} barbershopName={shop.name}>
    {ready ? <div className="space-y-6"><AdminTeamManager barbershop={shop} /><StaffAccessSection barbershop={shop} /></div> : null}
  </AdminChrome>;
}
