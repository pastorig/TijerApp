"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2, Mail, ShieldOff } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm, useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";

/**
 * Accesos de empleados, dentro de Equipo.
 *
 * Es distinto de la sección de administradores de arriba: un administrador ve
 * y toca TODA la barbería, un empleado solo su agenda y su comisión. Por eso
 * son dos listas separadas y no una con un selector de rol — mezclarlas
 * invitaría a darle "admin" a un empleado sin pensarlo.
 */
export function StaffAccessSection({
  barbershop,
}: {
  barbershop: DemoBarbershop;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [conAcceso, setConAcceso] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [invitando, setInvitando] = useState<string | null>(null);
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
          accesos?: Array<{ barber_id: string }>;
        };
        if (!vivo || !res.ok) return;
        setConAcceso((payload.accesos ?? []).map((a) => a.barber_id));
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
          Ve <strong>solo sus turnos</strong> y su comisión. No accede a tus
          clientes, tu facturación ni la configuración de la barbería.
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
            return (
              <li
                key={barbero.id}
                className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-white">{barbero.name}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      tiene
                        ? "bg-[color:var(--success-soft)] text-[color:var(--success)]"
                        : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]",
                    )}
                  >
                    {tiene ? "Con acceso" : "Sin acceso"}
                  </span>
                </div>

                {tiene ? (
                  <button
                    type="button"
                    onClick={() => void revocar(barbero.id, barbero.name)}
                    className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--danger)]"
                  >
                    <ShieldOff className="size-3.5" />
                    Quitar acceso
                  </button>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
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
                      className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                    />
                    <input
                      type="text"
                      value={claves[barbero.id] ?? ""}
                      onChange={(e) =>
                        setClaves((prev) => ({
                          ...prev,
                          [barbero.id]: e.target.value,
                        }))
                      }
                      placeholder="contraseña (mín. 8)"
                      className="min-h-10 flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                    />
                    <button
                      type="button"
                      disabled={invitando === barbero.id}
                      onClick={() => void invitar(barbero.id)}
                      className="bg-gold-grad inline-flex min-h-10 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-4 text-[11px] font-bold uppercase tracking-[0.12em] text-black disabled:opacity-50"
                    >
                      {invitando === barbero.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Mail className="size-3.5" />
                      )}
                      Darle acceso
                    </button>
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
