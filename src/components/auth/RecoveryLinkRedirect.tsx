"use client";

import { useEffect } from "react";

const DESTINO = "/nueva-password";

/**
 * Un link de "olvidé mi contraseña" que cae en la página equivocada se manda a
 * donde tiene que ir.
 *
 * ── Por qué puede caer en otra página ───────────────────────────────────────
 * El mail vuelve a la dirección desde donde se pidió (`/nueva-password` de ese
 * dominio). Si ese dominio no está en la lista de permitidos de Supabase —una
 * preview de Vercel, un dominio viejo, la app abierta desde otra URL—,
 * Supabase descarta el destino y manda a la home del sitio, con el permiso de
 * recuperación en el `#` de la URL. La home no sabía qué hacer con eso: el
 * usuario quedaba mirando la landing, o entraba al panel sin haber cambiado
 * nada, y parecía que el link "no llevaba a reiniciar la contraseña".
 *
 * Lo mismo con un link vencido: Supabase vuelve con `error_code=otp_expired`,
 * y sin esto se veía la landing sin ninguna explicación.
 *
 * Va en el layout raíz y no hace nada salvo que la URL traiga una de esas dos
 * marcas. Navega con el `#` intacto para que la pantalla de nueva contraseña
 * lo procese igual que si el link hubiera llegado bien.
 */
export function RecoveryLinkRedirect() {
  useEffect(() => {
    const { hash, pathname } = window.location;
    if (!hash || pathname === DESTINO) return;

    const params = new URLSearchParams(hash.slice(1));
    const esRecuperacion = params.get("type") === "recovery";
    const linkVencido = params.get("error_code") === "otp_expired";
    if (!esRecuperacion && !linkVencido) return;

    window.location.replace(`${DESTINO}${hash}`);
  }, []);

  return null;
}
