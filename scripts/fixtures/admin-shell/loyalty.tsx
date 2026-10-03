"use client";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { AdminChrome } from "@/components/admin/AdminChrome";
import { AdminLoyaltyManager } from "@/components/admin/AdminLoyaltyManager";
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
  return <AdminChrome barbershopSlug={shop.slug} barbershopName={shop.name}>
    {ready ? <AdminLoyaltyManager barbershop={shop} /> : null}
  </AdminChrome>;
}
