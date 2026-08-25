"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { updateCurrentUserPassword } from "@/lib/auth";
import { Button, Card, Eyebrow, Field, Input, useToast } from "@/components/ui";

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
    <section className="flex flex-col gap-4">
      <header>
        <Eyebrow>Mi contraseña</Eyebrow>
        <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
          Cambiar mi contraseña
        </h2>
        <p className="mt-2 max-w-prose text-xs leading-5 text-[color:var(--text-muted)]">
          La primera contraseña te la puso el dueño de la barbería, así que él la
          sabe. Si querés que solo la sepas vos, cambiala acá.
        </p>
      </header>

      {listo ? (
        <Card
          variant="flat"
          padding="sm"
          className="flex items-center gap-2 text-sm text-[color:var(--success)]"
        >
          <ShieldCheck className="size-4 shrink-0" />
          Listo: ahora la contraseña la sabés solo vos.
        </Card>
      ) : null}

      <Card padding="sm" className="max-w-md">
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Field label="Contraseña nueva" htmlFor="staff-password-nueva">
            <div className="relative">
              <Input
                id="staff-password-nueva"
                type={verla ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setVerla((v) => !v)}
                aria-label={verla ? "Ocultar" : "Mostrar"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[color:var(--text-muted)] transition-colors duration-[var(--duration-fast)] hover:text-[color:var(--brand-gold)]"
              >
                {verla ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </Field>

          <Field label="Repetila" htmlFor="staff-password-repetida">
            <Input
              id="staff-password-repetida"
              type={verla ? "text" : "password"}
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              autoComplete="new-password"
            />
          </Field>

          <Button type="submit" loading={guardando} fullWidth>
            {guardando ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </form>
      </Card>
    </section>
  );
}
