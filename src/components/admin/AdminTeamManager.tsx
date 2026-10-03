"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Crown, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useConfirm, useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { OnboardingTip } from "./OnboardingTip";

type Props = { barbershop: DemoBarbershop };

type TeamMember = {
  user_id: string;
  email: string;
  is_owner: boolean;
  created_at: string;
};

export function AdminTeamManager({ barbershop }: Props) {
  const toast = useToast();
  const confirm = useConfirm();
  const [admins, setAdmins] = useState<TeamMember[]>([]);
  const [iAmOwner, setIAmOwner] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [maxAdmins, setMaxAdmins] = useState(5);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [loadError, setLoadError] = useState("");

  async function load() {
    setIsLoading(true);
    setLoadError("");
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setLoadError("Tu sesion expiro. Volve a iniciar sesion.");
        toast.error("Sesión expirada");
        return;
      }
      const res = await fetch(
        `/api/admin/team?barbershopSlug=${encodeURIComponent(barbershop.slug)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        setLoadError("No pudimos cargar los administradores.");
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Error cargando equipo", { description: err.error });
        return;
      }
      const data = (await res.json()) as {
        admins: TeamMember[];
        canInvite: boolean;
        max: number;
        iAmOwner: boolean;
      };
      setAdmins(data.admins);
      setCanInvite(data.canInvite);
      setMaxAdmins(data.max);
      setIAmOwner(data.iAmOwner);
    } catch {
      setLoadError("No pudimos cargar los administradores.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershop.slug]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsInviting(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopSlug: barbershop.slug,
          email: email.trim(),
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No se pudo invitar", { description: err.error });
        return;
      }
      const data = (await res.json()) as {
        createdNewAccount?: boolean;
        emailSent?: boolean;
      };
      if (data.emailSent === false) {
        // El acceso quedó dado, pero el mail no salió: que el dueño no se
        // quede esperando que el otro "reciba algo".
        toast.success("Admin agregado, pero el mail no salió", {
          description: data.createdNewAccount
            ? `Avisale a ${email} que entre por "Olvidé mi contraseña" para elegir la suya.`
            : `Avisale a ${email} que ya puede entrar con su contraseña de siempre.`,
        });
      } else {
        toast.success(
          data.createdNewAccount
            ? "Cuenta creada e invitación enviada"
            : "Admin agregado",
          {
            description: data.createdNewAccount
              ? `Le mandamos el password temporal a ${email}`
              : `${email} ya tenía cuenta: entra con su contraseña de siempre.`,
          },
        );
      }
      setEmail("");
      await load();
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemove(member: TeamMember) {
    const ok = await confirm({
      title: `Remover a ${member.email}?`,
      message:
        "Va a perder acceso al panel admin de inmediato. Puede volver a ser invitado en el futuro.",
      confirmLabel: "Remover",
      danger: true,
    });
    if (!ok) return;

    const { data: sessionData } = await getCurrentSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    const res = await fetch("/api/admin/team", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        barbershopSlug: barbershop.slug,
        userId: member.user_id,
      }),
    });
    if (!res.ok) {
      toast.error("No se pudo remover");
      return;
    }
    toast.success("Admin removido");
    await load();
  }

  return (
    <section aria-label="Administradores" className="min-w-0 space-y-5">
      <header className="relative">
        <p className="text-xs font-semibold normal-case tracking-normal text-[color:var(--brand-gold)]">
          {barbershop.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold normal-case leading-tight tracking-normal sm:text-3xl lg:text-3xl">
          Equipo y accesos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Administradores · {admins.length}/{maxAdmins} cuentas
        </p>
        <OnboardingTip
          id="team-first-visit-v2"
          title="Le creamos la cuenta automáticamente"
          description="Ingresá el email del nuevo admin. Si no tiene cuenta, se la creamos con password temporal y le mandamos un email con instrucciones para entrar."
          placement="bottom"
          className="left-0 mt-3"
        />
      </header>

      {/* Invitar nuevo admin */}
      {iAmOwner && !loadError ? (
        <section className="border-t border-[color:var(--border-subtle)] py-5">
          <h2 className="text-lg font-semibold normal-case tracking-normal">
            Invitar admin
          </h2>
          <form onSubmit={handleInvite} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              aria-label="Email del administrador"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@email.com"
              disabled={!canInvite || isInviting}
              className="min-h-11 min-w-0 flex-1 rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 text-base text-white outline-none focus:border-[color:var(--brand-gold)] disabled:opacity-50 sm:text-sm"
            />
            <button
              type="submit"
              disabled={!canInvite || isInviting}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold normal-case tracking-normal text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <UserPlus className="size-4" />
              Invitar
            </button>
          </form>
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">Acceso completo a esta barberia.</p>
          {!canInvite && admins.length >= maxAdmins ? (
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              Llegaste al límite de {maxAdmins} admins. Remové uno para
              invitar otro.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* Lista actual */}
      <section className="border-t border-[color:var(--border-subtle)] py-5">
        <h2 className="text-lg font-semibold normal-case tracking-normal">
          Administradores ({admins.length}/{maxAdmins})
        </h2>
        {isLoading ? (
          <div role="status" aria-label="Cargando administradores" className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
          </div>
        ) : loadError ? (
          <div className="mt-4">
            <p role="alert" className="text-sm text-[color:var(--danger)]">{loadError}</p>
            <button type="button" onClick={() => void load()} className="mt-2 min-h-11 rounded-md border border-[color:var(--border-default)] px-3 text-sm">Reintentar</button>
          </div>
        ) : admins.length === 0 ? (
          <p className="mt-6 rounded-[var(--radius-sm)] border border-dashed border-[color:var(--border-subtle)] py-8 text-center text-sm text-[color:var(--text-muted)]">
            <Users className="mx-auto mb-2 size-6 text-[color:var(--text-muted)]" />
            Sin administradores
          </p>
        ) : (
          <ul className="mt-5 space-y-2">
            {admins.map((a) => (
              <li
                key={a.user_id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border bg-[color:var(--surface-0)] p-3 sm:p-4",
                  a.is_owner
                    ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/20"
                    : "border-[color:var(--border-subtle)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.is_owner ? (
                      <Crown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[color:var(--brand-gold)]"
                      />
                    ) : (
                      <Users
                        aria-hidden="true"
                        className="size-4 shrink-0 text-[color:var(--text-muted)]"
                      />
                    )}
                    <p className="break-all text-sm font-bold text-white">
                      {a.email}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                    {a.is_owner ? "Dueño de la barbería" : "Administrador"} · Desde {new Date(a.created_at).toLocaleDateString("es-AR")}
                  </p>
                </div>
                {iAmOwner && !a.is_owner ? (
                  <button
                    type="button"
                    onClick={() => void handleRemove(a)}
                    aria-label={`Quitar acceso a ${a.email}`}
                    title="Quitar acceso"
                    className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 px-3 text-[color:var(--danger)] transition-colors hover:bg-[color:var(--danger-soft)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
