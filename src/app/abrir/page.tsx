import type { Metadata } from "next";
import { Logo } from "@/components/ui";
import { PWALauncher } from "@/components/pwa/PWALauncher";

/**
 * `/abrir` — pantalla de arranque de la PWA instalada (el `start_url` del
 * manifest). Manda al último contexto usado: `/<slug>/admin` si el barbero
 * estaba en su panel, `/<slug>` si era la landing de una barbería, o `/` si
 * todavía no hay contexto guardado.
 *
 * Deliberadamente mínima: es lo primero que se ve al tocar el ícono, así que no
 * carga nada de la landing comercial.
 */
export const metadata: Metadata = {
  title: "Abriendo TijerApp",
  // No tiene nada que indexar y no debería aparecer en buscadores.
  robots: { index: false, follow: false },
};

export default function AbrirPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-10">
        <Logo variant="mark" size="lg" className="mb-6 opacity-40" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
          Abriendo…
        </p>
        <PWALauncher />
      </div>
    </main>
  );
}
