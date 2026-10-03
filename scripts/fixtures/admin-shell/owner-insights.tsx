"use client";
import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { OwnerInsights } from "@/components/owner/OwnerInsights";
import { OwnerDashboard } from "@/components/OwnerDashboard";
import { OwnerPlansManager } from "@/components/owner/OwnerPlansManager";
import { OwnerCreateBarbershopForm } from "@/components/OwnerCreateBarbershopForm";
import { OwnerMessagesList } from "@/components/owner/OwnerMessagesList";
import { getSupabaseClient } from "@/lib/supabase";

export default function Preview() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const token = [encode({ alg: "HS256", typ: "JWT" }), encode({ sub: "00000000-0000-4000-8000-000000000001", exp: 4000000000, role: "authenticated" }), "fixture-only"].join(".");
    void getSupabaseClient().auth.setSession({ access_token: token, refresh_token: "fixture-only" }).then(() => setReady(true));
  }, []);
  if (process.env.NODE_ENV !== "development") notFound();
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  return <OwnerShell>{ready ? (params?.has("messages") ? <OwnerMessagesList /> : params?.has("create") ? <OwnerCreateBarbershopForm /> : params?.has("plans") ? <OwnerPlansManager /> : params?.has("dashboard") ? <OwnerDashboard /> : <OwnerInsights />) : null}</OwnerShell>;
}
