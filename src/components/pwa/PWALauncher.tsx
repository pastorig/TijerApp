"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLastContext } from "@/lib/pwa/last-context";

/**
 * PWALauncher — la pantalla de arranque de la PWA (`/abrir`, el `start_url` del
 * manifest). Lee el último contexto y manda ahí; si no hay ninguno, a la home.
 *
 * Existe por un problema concreto: antes el `start_url` era `/`, o sea que al
 * abrir la app desde el ícono se cargaba **toda la landing comercial** y recién
 * después de hidratar un efecto redirigía al panel. El barbero veía
 * tijerapp.com unos segundos —o se quedaba ahí si la red venía lenta— cuando lo
 * que quería era su agenda.
 *
 * Esta ruta no renderiza nada pesado: solo el aviso de que está abriendo.
 */
export function PWALauncher() {
  const router = useRouter();

  useEffect(() => {
    const { slug, role } = getLastContext();
    if (!slug) {
      router.replace("/");
      return;
    }
    router.replace(role === "admin" ? `/${slug}/admin` : `/${slug}`);
  }, [router]);

  return null;
}
