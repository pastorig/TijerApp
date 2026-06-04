/**
 * Last-context helpers para multi-tenant PWA routing.
 *
 * Guardamos el último slug y rol que el usuario navegó. Al abrir la PWA
 * desde el icon del home screen (que apunta a `/`), una página redirector
 * lee este state y manda al usuario al último contexto.
 *
 * Storage: localStorage con prefix `tijerapp:`. SSR-safe — funciona en
 * server components sin crashear (devuelve null).
 */

export type LastContextRole = "admin" | "public";

export type LastContext = {
  slug: string | null;
  role: LastContextRole | null;
};

const KEY_SLUG = "tijerapp:last_slug";
const KEY_ROLE = "tijerapp:last_role";

/**
 * Lee el último contexto del localStorage.
 * Devuelve `{ slug: null, role: null }` si no hay nada guardado o si
 * estamos en server (window undefined).
 */
export function getLastContext(): LastContext {
  if (typeof window === "undefined") {
    return { slug: null, role: null };
  }
  try {
    const slug = window.localStorage.getItem(KEY_SLUG);
    const role = window.localStorage.getItem(KEY_ROLE);
    return {
      slug: slug || null,
      role: role === "admin" || role === "public" ? role : null,
    };
  } catch {
    // localStorage puede fallar en incógnito de algunos browsers
    return { slug: null, role: null };
  }
}

/**
 * Guarda el último contexto navegado. No hace nada en server.
 */
export function setLastContext(slug: string, role: LastContextRole): void {
  if (typeof window === "undefined") return;
  if (!slug) return;
  try {
    window.localStorage.setItem(KEY_SLUG, slug);
    window.localStorage.setItem(KEY_ROLE, role);
  } catch {
    // Si falla (incógnito, quota), ignoramos silenciosamente — la PWA
    // sigue funcionando sin last-context routing.
  }
}

/**
 * Limpia el last context. Útil en logout o reset manual.
 */
export function clearLastContext(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY_SLUG);
    window.localStorage.removeItem(KEY_ROLE);
  } catch {
    // ignored
  }
}
