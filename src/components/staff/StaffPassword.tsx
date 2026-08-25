"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { updateCurrentUserPassword } from "@/lib/auth";
import { useToast } from "@/components/ui";

const MINIMO = 8;

/**
 * El empleado cambia su propia contraseña.
 *
 * Existe por una razón concreta: el dueño le pone la contraseña inicial y se la
 * dice en persona, así que el dueño la sabe y podría entrar como él. Esta
 * pantalla es la salida para el que prefiera que no. Sin esto, la decisión de
 * "la pone el dueño" no tendría vuelta atrás.
 */
export function StaffPassword() {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [verla, setVerla] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < MINIMO) {
      toast.error(`La contraseña tiene que tener al menos ${MINIMO} caracteres`);
      return;
    }
    if (password !== repetida) {
      toast.error("Las dos contraseñas no coinciden");
      return;
    }
    setGuardando(true);
    try {
      const { error } = await updateCurrentUserPassword(password);
      if (error) {
        toast.error("No pudimos cambiarla", { description: error.message });
        return;
      }
      setPassword("");
      setRepetida("");
      setListo(true);
      toast.success("Contraseña cambiada");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-5">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--brand-gold)]">
          <KeyRound className="size-3.5" />
          Mi contraseña
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
          Cambiar mi contraseña
        </h1>
        <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
          La primera contraseña te la puso el dueño de la barbería, así que él la
          sabe. Si querés que solo la sepas vos, cambiala acá.
        </p>
      </header>

      {listo ? (
        <p className="card-premium flex items-center gap-2 p-4 text-sm text-[color:var(--success)]">
          <ShieldCheck className="size-4 shrink-0" />
          Listo: ahora la contraseña la sabés solo vos.
        </p>
      ) : null}

      <form onSubmit={guardar} className="card-premium mt-3 flex flex-col gap-3 p-4">
        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Contraseña nueva
          <div className="relative mt-2">
            <input
              type={verla ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 pr-11 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
            />
            <button
              type="button"
              onClick={() => setVerla((v) => !v)}
              aria-label={verla ? "Ocultar" : "Mostrar"}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[color:var(--text-muted)]"
            >
              {verla ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
          Repetila
          <input
            type={verla ? "text" : "password"}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            autoComplete="new-password"
            className="mt-2 min-h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
          />
        </label>

        <button
          type="submit"
          disabled={guardando}
          className="bg-gold-grad min-h-11 rounded-[var(--radius-sm)] text-xs font-bold uppercase tracking-[0.14em] text-black disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </form>
    </div>
  );
}
