"use client";

import { useEffect, useState } from "react";
import { Check, Crown, KeyRound, Loader2, Mail, ShieldOff } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { Badge, Button, Input, useConfirm, useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import {
  PERMISOS_POR_DEFECTO,
  PERMISOS_UI,
  type StaffPermission,
  type StaffPermissions,
} from "@/lib/staff-permissions";

/**
 * Accesos de empleados, dentro de Equipo.
 *
 * Es distinto de la sección de administradores de arriba: un administrador ve
 * y toca TODA la barbería, un empleado solo lo que el dueño le habilite. Por
 * eso son dos listas separadas y no una con un selector de rol — mezclarlas
 * invitaría a darle "admin" a un empleado sin pensarlo.
 *
 * ── El barbero marcado como dueño no aparece para invitar ───────────────────
 * Ese barbero ES la barbería y entra por el panel, donde ve y toca todo. Una
 * cuenta de empleado sobre su ficha le daría estrictamente menos, y abriría la
 * puerta a que la agenda del dueño la maneje otra cuenta. El servidor lo
 * rechaza igual; acá directamente no se ofrece, que es mejor que ofrecerlo y
 * después explicar por qué no se puede.
 */
export function StaffAccessSection({
  barbershop,
}: {
  barbershop: DemoBarbershop;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [conAcceso, setConAcceso] = useState<string[]>([]);
  const [permisos, setPermisos] = useState<Record<string, StaffPermissions>>({});
  const [cargando, setCargando] = useState(true);
  const [invitando, setInvitando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [claves, setClaves] = useState<Record<string, string>>({});
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCargando(true);
      try {
        const { data: sessionData } = await getCurrentSession();
        const token = sessionData.session?.access_token;
        if (!vivo || !token) return;
        const res = await fetch(
          `/api/admin/staff-access?bs=${encodeURIComponent(barbershop.slug)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const payload = (await res.json().catch(() => ({}))) as {
          accesos?: Array<{ barber_id: string; permisos?: StaffPermissions }>;
        };
        if (!vivo || !res.ok) return;
        const accesos = payload.accesos ?? [];
        setConAcceso(accesos.map((a) => a.barber_id));
        setPermisos(
          Object.fromEntries(
            accesos.map((a) => [
              a.barber_id,
              a.permisos ?? PERMISOS_POR_DEFECTO,
            ]),
          ),
        );
      } finally {
        if (vivo) setCargando(false);
      }
    }
    cargar();
    return () => {
      vivo = false;
    };
  }, [barbershop.slug, recarga]);

  async function invitar(barberId: string) {
    const email = (emails[barberId] ?? "").trim();
    const password = claves[barberId] ?? "";
    if (!email.includes("@")) {
      toast.error("Escribí un email válido");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña tiene que tener al menos 8 caracteres");
      return;
    }
    setInvitando(barberId);
    try {
      const { data: sessionData } = await getCurrentSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/staff-access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bs: barbershop.slug, barberId, email, password }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        usaContrasenaNueva?: boolean;
      };
      if (!res.ok) {
        toast.error("No se pudo dar el acceso", {
          description: payload.error,
        });
        return;
      }
      toast.success("Listo, ya puede entrar", {
        description: payload.usaContrasenaNueva
          ? `Pasále el mail y la contraseña que pusiste.`
          : `Esa persona ya tenía cuenta: entra con SU contraseña, no con la que escribiste.`,
      });
      setEmails((prev) => ({ ...prev, [barberId]: "" }));
      setClaves((prev) => ({ ...prev, [barberId]: "" }));
      setRecarga((v) => v + 1);
    } finally {
      setInvitando(null);
    }
  }

  /**
   * Guarda un solo permiso, no el set entero.
   *
   * La pantalla se actualiza al toque y se corrige con lo que responde el
   * servidor. Si fallara y no se revirtiera, el dueño se quedaría mirando una
   * casilla destildada creyendo que le sacó algo que el empleado sigue
   * teniendo — que es justo el error que no se puede permitir acá.
   */
  async function cambiarPermiso(
    barberId: string,
    key: StaffPermission,
    valor: boolean,
  ) {
    const previo = permisos[barberId] ?? PERMISOS_POR_DEFECTO;
    setPermisos((prev) => ({
      ...prev,
      [barberId]: { ...previo, [key]: valor },
    }));
    setGuardando(`${barberId}:${key}`);
    try {
      const { data: sessionData } = await getCurrentSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/admin/staff-access", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bs: barbershop.slug, barberId, [key]: valor }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        permisos?: StaffPermissions;
      };
      if (!res.ok || !payload.permisos) {
        setPermisos((prev) => ({ ...prev, [barberId]: previo }));
        toast.error("No se pudo guardar", { description: payload.error });
        return;
      }
      setPermisos((prev) => ({ ...prev, [barberId]: payload.permisos! }));
    } catch {
      setPermisos((prev) => ({ ...prev, [barberId]: previo }));
      toast.error("No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  }

  async function revocar(barberId: string, nombre: string) {
    const ok = await confirm({
      title: `¿Quitarle el acceso a ${nombre}?`,
      message:
        "Deja de poder entrar de inmediato. Sus turnos y sus comisiones no se tocan.",
      confirmLabel: "Quitar acceso",
      danger: true,
    });
    if (!ok) return;

    const { data: sessionData } = await getCurrentSession();
    const token = sessionData.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/admin/staff-access", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bs: barbershop.slug, barberId }),
    });
    if (!res.ok) {
      toast.error("No se pudo quitar el acceso");
      return;
    }
    toast.success("Acceso quitado");
    setRecarga((v) => v + 1);
  }

  const barberos = barbershop.barbers ?? [];

  return (
    <section className="card-premium p-4 sm:p-5">
      <header>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
          <KeyRound className="size-3.5" />
          Acceso de tus barberos
        </p>
        <h2 className="mt-1 text-lg font-black tracking-tight text-white">
          Que cada uno maneje su agenda
        </h2>
        <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
          Ve <strong>solo sus turnos</strong>, y de ahí para abajo elegís vos. No
          accede a tus clientes, tu facturación ni la configuración de la
          barbería.
        </p>
      </header>

      {cargando ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-4 animate-spin text-[color:var(--text-muted)]" />
        </div>
      ) : barberos.length === 0 ? (
        <p className="mt-4 text-xs text-[color:var(--text-muted)]">
          Cargá primero a tus barberos y después les das acceso.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {barberos.map((barbero) => {
            const tiene = conAcceso.includes(barbero.id);
            const sus = permisos[barbero.id] ?? PERMISOS_POR_DEFECTO;

            return (
              <li
                key={barbero.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
                    <span className="truncate">{barbero.name}</span>
                    {barbero.isOwner ? (
                      <Crown
                        aria-label="Dueño"
                        className="size-3.5 shrink-0 text-[color:var(--brand-gold)]"
                      />
                    ) : null}
                  </p>
                  <Badge
                    variant={
                      barbero.isOwner ? "accent" : tiene ? "success" : "muted"
                    }
                    className="shrink-0"
                  >
                    {barbero.isOwner
                      ? "Dueño"
                      : tiene
                        ? "Con acceso"
                        : "Sin acceso"}
                  </Badge>
                </div>

                {barbero.isOwner ? (
                  <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                    Entra con tu cuenta al panel, donde ve y toca todo. No
                    necesita una cuenta de empleado, que le daría menos.
                  </p>
                ) : tiene ? (
                  <>
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
                      Qué puede hacer
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {PERMISOS_UI.map((permiso) => (
                        <li key={permiso.key}>
                          <TildePermiso
                            marcado={sus[permiso.key]}
                            guardando={
                              guardando === `${barbero.id}:${permiso.key}`
                            }
                            label={permiso.label}
                            detalle={permiso.detalle}
                            onChange={(valor) =>
                              void cambiarPermiso(
                                barbero.id,
                                permiso.key,
                                valor,
                              )
                            }
                          />
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant="danger"
                      size="sm"
                      className="mt-3"
                      onClick={() => void revocar(barbero.id, barbero.name)}
                      iconLeft={<ShieldOff className="size-3.5" />}
                    >
                      Quitar acceso
                    </Button>
                  </>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="email"
                      inputMode="email"
                      value={emails[barbero.id] ?? ""}
                      onChange={(e) =>
                        setEmails((prev) => ({
                          ...prev,
                          [barbero.id]: e.target.value,
                        }))
                      }
                      placeholder="email del barbero"
                      className="flex-1 text-sm"
                    />
                    <Input
                      type="text"
                      value={claves[barbero.id] ?? ""}
                      onChange={(e) =>
                        setClaves((prev) => ({
                          ...prev,
                          [barbero.id]: e.target.value,
                        }))
                      }
                      placeholder="contraseña (mín. 8)"
                      className="flex-1 text-sm"
                    />
                    <Button
                      size="sm"
                      loading={invitando === barbero.id}
                      onClick={() => void invitar(barbero.id)}
                      iconLeft={<Mail className="size-3.5" />}
                    >
                      Darle acceso
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-[11px] leading-4 text-[color:var(--text-subtle)]">
        Le ponés vos la contraseña y se la pasás en persona: entra en el
        momento, sin mails. Tené en cuenta que <strong>vos la vas a saber</strong>;
        si el barbero prefiere que no, puede cambiarla desde su propia pantalla.
      </p>
    </section>
  );
}

/**
 * Un permiso, con su explicación.
 *
 * Es un `<label>` con un checkbox de verdad adentro, no un div con onClick:
 * así funciona con el teclado y lo lee un lector de pantalla sin que haya que
 * reimplementar nada. El cuadradito visible es el que se pinta; el input real
 * está tapado pero presente.
 */
function TildePermiso({
  marcado,
  guardando,
  label,
  detalle,
  onChange,
}: {
  marcado: boolean;
  guardando: boolean;
  label: string;
  detalle: string;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={marcado}
        disabled={guardando}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border transition-colors duration-[var(--duration-fast)]",
          "peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[color:var(--brand-gold)]",
          marcado
            ? "border-[color:var(--brand-gold)] bg-gold-grad text-black"
            : "border-[color:var(--border-default)] text-transparent",
        )}
      >
        {guardando ? (
          <Loader2 className="size-3 animate-spin text-[color:var(--text-muted)]" />
        ) : (
          <Check className="size-3" />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-xs font-bold",
            marcado ? "text-white" : "text-[color:var(--text-muted)]",
          )}
        >
          {label}
        </span>
        <span className="block text-[11px] leading-4 text-[color:var(--text-subtle)]">
          {detalle}
        </span>
      </span>
    </label>
  );
}
