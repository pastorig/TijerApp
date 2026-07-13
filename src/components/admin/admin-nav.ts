import {
  Bell,
  CalendarDays,
  Clock,
  Contact,
  CreditCard,
  Gift,
  Image as ImageIcon,
  LayoutDashboard,
  LineChart,
  Settings,
  Star,
  Store,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@/lib/plans";

/**
 * Fuente única de la navegación del admin del barbero.
 *
 * Modelo "pestañas + subpestañas" (como en EstetiApp / Dentidad):
 *  - El SIDEBAR muestra los GRUPOS (pestañas) — un ítem por grupo.
 *  - Dentro de la página, AdminSubtabs muestra los ITEMS del grupo activo
 *    (subpestañas), que son links a las rutas que ya existen (no se fusionan
 *    rutas — cada subpestaña es su propia URL).
 *
 * Las acciones de sesión / cuenta NO viven acá: van al menú de usuario de la
 * barra superior (AdminUserMenu).
 */

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match exacto (para el Dashboard); sino, prefix. */
  exact?: boolean;
  /** Si está, el item solo se muestra si el plan incluye la feature. */
  requiresFeature?: Feature;
};

export type AdminNavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
};

export function getAdminNavGroups(barbershopSlug: string): AdminNavGroup[] {
  const base = `/${barbershopSlug}/admin`;
  return [
    {
      key: "inicio",
      label: "Inicio",
      icon: LayoutDashboard,
      items: [
        { label: "Dashboard", href: base, icon: LayoutDashboard, exact: true },
      ],
    },
    {
      key: "agenda",
      label: "Agenda",
      icon: CalendarDays,
      items: [
        { label: "Turnero", href: `${base}/turnero`, icon: CalendarDays },
        { label: "Recordatorios", href: `${base}/recordatorios`, icon: Bell },
        { label: "Lista de espera", href: `${base}/lista-espera`, icon: Clock },
      ],
    },
    {
      key: "clientes",
      label: "Clientes",
      icon: Contact,
      items: [
        { label: "Clientes", href: `${base}/clientes`, icon: Contact },
        { label: "Reseñas", href: `${base}/resenas`, icon: Star },
        {
          label: "Fidelización",
          href: `${base}/fidelizacion`,
          icon: Gift,
          requiresFeature: "fidelizacion",
        },
        {
          label: "Cupones",
          href: `${base}/cupones`,
          icon: Tag,
          requiresFeature: "cupones",
        },
      ],
    },
    {
      key: "equipo",
      label: "Equipo",
      icon: Users,
      items: [
        { label: "Barberos", href: `${base}/barbers`, icon: Users },
        {
          label: "Equipo",
          href: `${base}/equipo`,
          icon: Users,
          requiresFeature: "multi_admin",
        },
      ],
    },
    {
      key: "caja",
      label: "Caja",
      icon: Wallet,
      items: [
        { label: "Reportes", href: `${base}/reportes`, icon: LineChart },
        { label: "Cierre de caja", href: `${base}/cierre`, icon: Wallet },
        {
          label: "Cobros online",
          href: `${base}/cobros`,
          icon: CreditCard,
          requiresFeature: "cobros_online",
        },
      ],
    },
    {
      key: "barberia",
      label: "Mi barbería",
      icon: Store,
      items: [
        { label: "Galería", href: `${base}/galeria`, icon: ImageIcon },
        { label: "Configuración", href: `${base}/settings`, icon: Settings },
      ],
    },
  ];
}

/** Predicado de acceso por feature (típicamente `(f) => hasFeature(tier, f)`). */
export type CanUseFeature = (feature: Feature) => boolean;

export function itemIsVisible(item: AdminNavItem, canUse: CanUseFeature): boolean {
  return !item.requiresFeature || canUse(item.requiresFeature);
}

export function visibleItems(
  group: AdminNavGroup,
  canUse: CanUseFeature,
): AdminNavItem[] {
  return group.items.filter((item) => itemIsVisible(item, canUse));
}

export function itemIsActive(item: AdminNavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function groupIsActive(
  group: AdminNavGroup,
  pathname: string,
  canUse: CanUseFeature,
): boolean {
  return visibleItems(group, canUse).some((item) => itemIsActive(item, pathname));
}

/** Href por defecto de un grupo = su primer item visible. */
export function groupDefaultHref(
  group: AdminNavGroup,
  canUse: CanUseFeature,
): string {
  const items = visibleItems(group, canUse);
  return (items[0] ?? group.items[0]).href;
}
