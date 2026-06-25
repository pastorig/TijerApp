"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Link2,
  Loader2,
  Unlink,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { useToast } from "@/components/ui";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";

type Props = { barbershop: DemoBarbershop };

type SettingsResponse = {
  settings: {
    mp_enabled: boolean;
    mp_public_key: string | null;
    mp_user_id: string | null;
    deposit_percent: number;
    deposit_min_amount: number | null;
    deposit_auto_cancel_hours: number;
    mp_access_token_masked: string | null;
    has_access_token: boolean;
  };
};

type TestResult =
  | { ok: true; user: { nickname: string; email: string; site_id: string } }
  | { ok: false; error: string };

/**
 * AdminMercadoPagoSettings — Configuración de cobro de seña por barbería.
 *
 * Flow:
 *  1. Admin pega su access_token de MP
 *  2. Click "Probar conexión" → llama MP /users/me con ese token
 *  3. Si OK, muestra "conectado como X"
 *  4. Configura % de seña + monto mínimo + horas para auto-cancelar
 *  5. Toggle ON/OFF para activar el cobro
 *
 * Si está OFF, el flow de reserva de la barbería es idéntico al actual
 * (solo WhatsApp). Si está ON, después de reservar el cliente DEBE pagar
 * la seña en X horas o el turno se cancela auto.
 */
export function AdminMercadoPagoSettings({ barbershop }: Props) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Form state
  const [mpEnabled, setMpEnabled] = useState(false);
  const [accessTokenInput, setAccessTokenInput] = useState(""); // se manda solo si el user lo edita
  const [publicKey, setPublicKey] = useState("");
  const [userId, setUserId] = useState("");
  const [depositPercent, setDepositPercent] = useState(30);
  const [depositMinAmount, setDepositMinAmount] = useState<string>("");
  const [depositAutoCancelHours, setDepositAutoCancelHours] = useState(24);

  // Server state
  const [hasAccessToken, setHasAccessToken] = useState(false);
  const [accessTokenMasked, setAccessTokenMasked] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // OAuth ("Conectar con MercadoPago")
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showManual, setShowManual] = useState(false);

  // Resultado del callback OAuth (?mp=connected|error)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const mp = params.get("mp");
    if (mp === "connected") {
      toast.success("¡MercadoPago conectado!", {
        description: "Ya podés activar el cobro de seña.",
      });
    } else if (mp === "error") {
      toast.error("No se pudo conectar MercadoPago", {
        description: "Probá de nuevo. Si sigue, avisanos.",
      });
    }
    if (mp) {
      // Limpiamos el query param para no repetir el toast al refrescar.
      params.delete("mp");
      params.delete("reason");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sesión expirada");
        return;
      }
      const res = await fetch("/api/mp/oauth/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ barbershopSlug: barbershop.slug }),
      });
      const data = (await res.json()) as { authUrl?: string; error?: string };
      if (!res.ok || !data.authUrl) {
        toast.error("No se pudo iniciar la conexión", {
          description: data.error,
        });
        return;
      }
      // Redirige a MercadoPago para autorizar.
      window.location.href = data.authUrl;
    } catch {
      toast.error("No se pudo iniciar la conexión");
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      const res = await fetch("/api/mp/oauth/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ barbershopSlug: barbershop.slug }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No se pudo desconectar", { description: err.error });
        return;
      }
      toast.success("MercadoPago desconectado");
      setMpEnabled(false);
      await load();
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function load() {
    setIsLoading(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Sesión expirada");
        return;
      }
      const res = await fetch(
        `/api/admin/mp?barbershopSlug=${encodeURIComponent(barbershop.slug)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Error cargando config", { description: err.error });
        return;
      }
      const data = (await res.json()) as SettingsResponse;
      setMpEnabled(data.settings.mp_enabled);
      setPublicKey(data.settings.mp_public_key ?? "");
      setUserId(data.settings.mp_user_id ?? "");
      setDepositPercent(data.settings.deposit_percent);
      setDepositMinAmount(
        data.settings.deposit_min_amount?.toString() ?? "",
      );
      setDepositAutoCancelHours(data.settings.deposit_auto_cancel_hours);
      setHasAccessToken(data.settings.has_access_token);
      setAccessTokenMasked(data.settings.mp_access_token_masked);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershop.slug]);

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      // Si hay token nuevo en el input, lo probamos. Si no, probamos el guardado.
      const tokenToTest = accessTokenInput.trim();

      if (tokenToTest) {
        const res = await fetch("/api/admin/mp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            barbershopSlug: barbershop.slug,
            accessToken: tokenToTest,
          }),
        });
        const result = (await res.json()) as TestResult;
        setTestResult(result);
        if (result.ok) {
          toast.success("Conexión OK", {
            description: `Cuenta: ${result.user.nickname}`,
          });
        } else {
          toast.error("Falla", { description: result.error });
        }
      } else {
        // Test del guardado
        const res = await fetch(
          `/api/admin/mp?barbershopSlug=${encodeURIComponent(barbershop.slug)}&action=test-connection`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const result = (await res.json()) as TestResult | { error: string };
        if ("ok" in result) {
          setTestResult(result);
          if (result.ok) {
            toast.success("Conexión OK", {
              description: `Cuenta: ${result.user.nickname}`,
            });
          } else {
            toast.error("Falla", { description: result.error });
          }
        } else {
          toast.error("Error", { description: result.error });
        }
      }
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    try {
      const { data: sessionData } = await getCurrentSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;

      const payload: Record<string, unknown> = {
        barbershopSlug: barbershop.slug,
        mp_enabled: mpEnabled,
        mp_public_key: publicKey.trim() || null,
        mp_user_id: userId.trim() || null,
        deposit_percent: depositPercent,
        deposit_min_amount: depositMinAmount
          ? Number(depositMinAmount)
          : null,
        deposit_auto_cancel_hours: depositAutoCancelHours,
      };
      // Solo enviamos el access_token si el user lo cambió
      if (accessTokenInput.trim()) {
        payload.mp_access_token = accessTokenInput.trim();
      }

      const res = await fetch("/api/admin/mp", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("No se pudo guardar", { description: err.error });
        return;
      }
      toast.success("Configuración guardada");
      setAccessTokenInput(""); // limpia el input por seguridad
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
          Feature Pro
        </p>
        <h1 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight sm:text-3xl lg:text-4xl">
          Cobros online
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)]">
          Si lo activás, cobrás una seña por cada reserva vía Mercado Pago.
          El dinero va directo a tu cuenta. Si no lo activás, las reservas
          siguen funcionando como hasta ahora (solo WhatsApp, sin pago).
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-5 animate-spin text-[color:var(--brand-gold)]" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Conexión con MercadoPago (OAuth) */}
          <section
            className={cn(
              "rounded-[var(--radius-md)] border p-5 sm:p-6",
              hasAccessToken
                ? "border-[color:var(--success)]/40 bg-[color:var(--success-soft)]"
                : "border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] ring-1 ring-[color:var(--brand-gold)]/20",
            )}
          >
            {hasAccessToken ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Check
                    aria-hidden="true"
                    className="size-5 shrink-0 text-[color:var(--success)]"
                  />
                  <div>
                    <p className="text-sm font-bold text-[color:var(--success)]">
                      MercadoPago conectado
                    </p>
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      El dinero de las señas va directo a tu cuenta.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDisconnect()}
                  disabled={isDisconnecting}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-secondary)] transition-colors hover:border-[color:var(--danger)] hover:text-[color:var(--danger)] disabled:opacity-50"
                >
                  <Unlink className="size-3.5" aria-hidden="true" />
                  {isDisconnecting ? "Desconectando…" : "Desconectar"}
                </button>
              </div>
            ) : (
              <div>
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  <Link2
                    aria-hidden="true"
                    className="size-4 text-[color:var(--brand-gold)]"
                  />
                  Conectá tu cuenta de MercadoPago
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                  Un solo clic: iniciás sesión en MercadoPago, autorizás, y listo.
                  No tenés que copiar ningún código ni token.
                </p>
                <button
                  type="button"
                  onClick={() => void handleConnect()}
                  disabled={isConnecting}
                  className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[#009ee3] px-5 text-[12px] font-bold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Link2 className="size-4" aria-hidden="true" />
                  )}
                  {isConnecting ? "Abriendo MercadoPago…" : "Conectar con MercadoPago"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManual((v) => !v)}
                  className="mt-3 block text-[11px] font-semibold text-[color:var(--text-muted)] underline transition-colors hover:text-[color:var(--brand-gold)]"
                >
                  {showManual
                    ? "Ocultar carga manual"
                    : "¿Preferís cargar tus credenciales a mano?"}
                </button>
              </div>
            )}
          </section>

          {/* Toggle principal */}
          <section
            className={cn(
              "rounded-[var(--radius-md)] border bg-[color:var(--surface-1)] p-5 sm:p-6",
              mpEnabled
                ? "border-[color:var(--brand-gold)]/40 ring-1 ring-[color:var(--brand-gold)]/20"
                : "border-[color:var(--border-subtle)]",
            )}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={mpEnabled}
                onChange={(e) => setMpEnabled(e.target.checked)}
                className="mt-1 size-5 accent-[color:var(--brand-gold)]"
              />
              <div className="flex-1">
                <p className="flex items-center gap-2 text-sm font-bold text-white">
                  <CreditCard
                    aria-hidden="true"
                    className="size-4 text-[color:var(--brand-gold)]"
                  />
                  Cobrar seña al reservar
                </p>
                <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">
                  {mpEnabled
                    ? "ACTIVO — los clientes deben pagar una seña al reservar. Sin pago, el turno se cancela automáticamente."
                    : "INACTIVO — los clientes reservan sin pagar (solo WhatsApp), igual que hasta ahora."}
                </p>
              </div>
            </label>
          </section>

          {/* Credenciales MP — fallback manual (colapsado por defecto) */}
          {showManual ? (
          <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 sm:p-6">
            <h2 className="text-lg font-black uppercase tracking-tight">
              Credenciales de Mercado Pago
            </h2>
            <p className="mt-1 text-xs text-[color:var(--text-muted)]">
              Necesarias para que el dinero vaya a tu cuenta. Obtenelas en{" "}
              <a
                href="https://www.mercadopago.com.ar/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[color:var(--brand-gold)] underline"
              >
                panel de developers MP
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
              .
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="mp-access-token"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                >
                  Access Token{" "}
                  <span className="text-[color:var(--danger)]">*</span>
                  {hasAccessToken && !accessTokenInput && accessTokenMasked ? (
                    <span className="ml-2 normal-case text-[color:var(--text-muted)]">
                      Guardado: <code>{accessTokenMasked}</code>
                    </span>
                  ) : null}
                </label>
                <input
                  id="mp-access-token"
                  type="password"
                  value={accessTokenInput}
                  onChange={(e) => setAccessTokenInput(e.target.value)}
                  placeholder={
                    hasAccessToken
                      ? "Dejar vacío para conservar el guardado"
                      : "APP_USR-1234567890... o TEST-1234567890..."
                  }
                  autoComplete="off"
                  className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                />
                <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                  Empieza con APP_USR- (producción) o TEST- (sandbox).
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="mp-public-key"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                  >
                    Public Key
                  </label>
                  <input
                    id="mp-public-key"
                    type="text"
                    value={publicKey}
                    onChange={(e) => setPublicKey(e.target.value)}
                    placeholder="APP_USR-... o TEST-..."
                    className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="mp-user-id"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                  >
                    User ID <span className="text-[color:var(--text-muted)]">— opcional</span>
                  </label>
                  <input
                    id="mp-user-id"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Tu ID numérico de MP"
                    className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleTestConnection()}
                disabled={
                  isTesting || (!accessTokenInput && !hasAccessToken)
                }
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)] bg-[color:var(--brand-gold-soft)] px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--brand-gold)] transition-colors hover:bg-[color:var(--brand-gold)] hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isTesting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
                {isTesting ? "Probando…" : "Probar conexión"}
              </button>

              {testResult ? (
                testResult.ok ? (
                  <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] p-3 text-sm">
                    <Check
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-[color:var(--success)]"
                    />
                    <div>
                      <p className="font-bold text-[color:var(--success)]">
                        Conectado como {testResult.user.nickname}
                      </p>
                      <p className="text-[11px] text-[color:var(--text-secondary)]">
                        {testResult.user.email} · {testResult.user.site_id}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] p-3 text-sm">
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-[color:var(--danger)]"
                    />
                    <div>
                      <p className="font-bold text-[color:var(--danger)]">
                        Falló la conexión
                      </p>
                      <p className="text-[11px] text-[color:var(--text-secondary)]">
                        {testResult.error}
                      </p>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          </section>
          ) : null}

          {/* Config de seña */}
          <section className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 sm:p-6">
            <h2 className="text-lg font-black uppercase tracking-tight">
              Configuración de la seña
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <label
                  htmlFor="deposit-percent"
                  className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                >
                  % del servicio que cobrás de seña: {depositPercent}%
                </label>
                <input
                  id="deposit-percent"
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value))}
                  className="mt-2 w-full accent-[color:var(--brand-gold)]"
                />
                <div className="flex justify-between text-[10px] text-[color:var(--text-muted)]">
                  <span>1%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="deposit-min"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                  >
                    Monto mínimo de seña{" "}
                    <span className="text-[color:var(--text-muted)]">— opcional</span>
                  </label>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-[color:var(--text-muted)]">$</span>
                    <input
                      id="deposit-min"
                      type="number"
                      min={0}
                      value={depositMinAmount}
                      onChange={(e) => setDepositMinAmount(e.target.value)}
                      placeholder="Ej. 1000"
                      className="flex-1 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                    Si el % queda menor a este monto, se cobra este monto.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="deposit-cancel-hours"
                    className="text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]"
                  >
                    Plazo para pagar (horas)
                  </label>
                  <input
                    id="deposit-cancel-hours"
                    type="number"
                    min={1}
                    max={168}
                    value={depositAutoCancelHours}
                    onChange={(e) =>
                      setDepositAutoCancelHours(Number(e.target.value))
                    }
                    className="mt-2 w-full rounded-[var(--radius-sm)] border border-[color:var(--border-default)] bg-[color:var(--surface-0)] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[color:var(--brand-gold)]"
                  />
                  <p className="mt-1 text-[10px] text-[color:var(--text-muted)]">
                    Si no paga en este plazo, se cancela auto.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[color:var(--brand-gold)] px-6 text-sm font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
