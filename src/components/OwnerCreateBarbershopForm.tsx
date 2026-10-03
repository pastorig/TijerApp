"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/cn";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

type ServiceInput = {
  id: string;
  name: string;
  price: string;
  durationMinutes: string;
};

function createEmptyService(id: string): ServiceInput {
  return {
    id,
    name: "",
    price: "",
    durationMinutes: "30",
  };
}

function buildSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60];
const PASSWORD_MIN_LENGTH = 8;

export function OwnerCreateBarbershopForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");

  // Horarios de la barbería (defaults sensatos para una barbería real).
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("20:00");
  const [slotIntervalMinutes, setSlotIntervalMinutes] = useState("30");

  // Acceso admin.
  const [adminEmail, setAdminEmail] = useState("");
  const [generateAutoPassword, setGenerateAutoPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [firstBarberName, setFirstBarberName] = useState("");
  const [services, setServices] = useState<ServiceInput[]>([
    createEmptyService("service-1"),
  ]);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [createdSlug, setCreatedSlug] = useState("");
  const [createdAdminEmail, setCreatedAdminEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [chosenPasswordReminder, setChosenPasswordReminder] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleAddService() {
    setServices((currentServices) => [
      ...currentServices,
      createEmptyService(`service-${currentServices.length + 1}`),
    ]);
  }

  function handleRemoveService(serviceId: string) {
    setServices((currentServices) =>
      currentServices.length === 1
        ? currentServices
        : currentServices.filter((service) => service.id !== serviceId),
    );
  }

  function handleServiceChange(
    serviceId: string,
    field: keyof Omit<ServiceInput, "id">,
    value: string,
  ) {
    setServices((currentServices) =>
      currentServices.map((service) =>
        service.id === serviceId ? { ...service, [field]: value } : service,
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !name.trim() ||
      !slug.trim() ||
      !adminEmail.trim() ||
      !firstBarberName.trim()
    ) {
      setErrorMessage("Completá nombre, slug, email admin y primer barbero.");
      return;
    }

    if (workingHoursStart >= workingHoursEnd) {
      setErrorMessage("El horario de cierre debe ser mayor al de apertura.");
      return;
    }

    // Validación de password si NO se generó automática.
    if (!generateAutoPassword) {
      if (!adminPassword) {
        setErrorMessage(
          "Definí una contraseña para el admin (o marcá «Generar automática»).",
        );
        return;
      }
      if (adminPassword.length < PASSWORD_MIN_LENGTH) {
        setErrorMessage(
          `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
        );
        return;
      }
      if (adminPassword !== adminPasswordConfirm) {
        setErrorMessage("Las contraseñas no coinciden.");
        return;
      }
    }

    const invalidService = services.find(
      (service) =>
        !service.name.trim() ||
        !service.price.trim() ||
        !service.durationMinutes.trim(),
    );

    if (invalidService) {
      setErrorMessage("Completá todos los servicios iniciales.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setCreatedSlug("");
    setCreatedAdminEmail("");
    setTemporaryPassword("");
    setChosenPasswordReminder(false);
    setIsSubmitting(true);

    try {
      const { data } = await getCurrentSession();
      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setErrorMessage("La sesión no es válida. Ingresá nuevamente.");
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/owner/create-barbershop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: buildSlug(slug),
          description: description.trim(),
          whatsapp: whatsapp.trim(),
          instagram: instagram.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword: generateAutoPassword ? undefined : adminPassword,
          firstBarberName: firstBarberName.trim(),
          workingHoursStart,
          workingHoursEnd,
          slotIntervalMinutes: Number(slotIntervalMinutes),
          initialServices: services.map((service) => ({
            name: service.name.trim(),
            price: Number(service.price),
            durationMinutes: Number(service.durationMinutes),
          })),
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
        slug?: string;
        adminEmail?: string;
        temporaryPassword?: string | null;
      };

      if (!response.ok) {
        setErrorMessage(result.error ?? "No pudimos crear la barbería.");
        return;
      }

      setSuccessMessage(result.message ?? "Barbería creada correctamente.");
      setCreatedSlug(result.slug ?? "");
      setCreatedAdminEmail(result.adminEmail ?? "");
      setTemporaryPassword(result.temporaryPassword ?? "");
      setChosenPasswordReminder(!generateAutoPassword);

      // Reset
      setName("");
      setSlug("");
      setDescription("");
      setWhatsapp("");
      setInstagram("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminPasswordConfirm("");
      setFirstBarberName("");
      setServices([createEmptyService("service-1")]);
    } catch {
      setErrorMessage("No pudimos crear la barbería.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <header className="animate-fade-up">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)] sm:tracking-[0.32em]">
            Owner TijerApp
          </p>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
            Nueva barbería
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
            Alta privada con su admin, primer barbero y servicios iniciales.
            Después podés ajustar horarios y servicios desde el panel.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid gap-10">
          {/* Datos de la barbería */}
          <FormSection
            eyebrow="Datos de la barbería"
            description="Identidad pública en TijerApp."
          >
            <Field label="Nombre" htmlFor="barbershop-name" required>
              <Input
                id="barbershop-name"
                value={name}
                disabled={isSubmitting}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!slug.trim()) {
                    setSlug(buildSlug(nextName));
                  }
                  setErrorMessage("");
                }}
                placeholder="Gino Barber"
                required
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Slug"
                htmlFor="barbershop-slug"
                hint="Aparece en la URL: https://tijerapp.com/[slug]"
                required
              >
                <Input
                  id="barbershop-slug"
                  value={slug}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setSlug(buildSlug(event.target.value));
                    setErrorMessage("");
                  }}
                  placeholder="gino-barber"
                  required
                />
              </Field>
              <Field label="WhatsApp" htmlFor="barbershop-whatsapp" optional>
                <Input
                  id="barbershop-whatsapp"
                  value={whatsapp}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setWhatsapp(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="+54 9 11 5555-5555"
                />
              </Field>
            </div>

            <Field label="Descripción" htmlFor="barbershop-description" optional>
              <Textarea
                id="barbershop-description"
                value={description}
                disabled={isSubmitting}
                onChange={(event) => {
                  setDescription(event.target.value);
                  setErrorMessage("");
                }}
                rows={3}
                placeholder="Descripción breve de la barbería"
              />
            </Field>

            <Field label="Instagram" htmlFor="barbershop-instagram" optional>
              <Input
                id="barbershop-instagram"
                value={instagram}
                disabled={isSubmitting}
                onChange={(event) => {
                  setInstagram(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="https://instagram.com/..."
              />
            </Field>
          </FormSection>

          {/* Horarios */}
          <FormSection
            eyebrow="Horarios de atención"
            description="Rango horario en el que la barbería recibe turnos y duración base de cada slot. Esto inicializa el horario semanal del primer barbero (Lun-Sáb). Ajustable después por día desde el admin."
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Apertura" htmlFor="working-hours-start" required>
                <Input
                  id="working-hours-start"
                  type="time"
                  value={workingHoursStart}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setWorkingHoursStart(event.target.value);
                    setErrorMessage("");
                  }}
                  required
                />
              </Field>
              <Field label="Cierre" htmlFor="working-hours-end" required>
                <Input
                  id="working-hours-end"
                  type="time"
                  value={workingHoursEnd}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setWorkingHoursEnd(event.target.value);
                    setErrorMessage("");
                  }}
                  required
                />
              </Field>
              <Field
                label="Intervalo de slot"
                htmlFor="slot-interval"
                hint="Cada cuánto se ofrece un horario"
                required
              >
                <Select
                  id="slot-interval"
                  value={slotIntervalMinutes}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setSlotIntervalMinutes(event.target.value);
                    setErrorMessage("");
                  }}
                  required
                >
                  {INTERVAL_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} min
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </FormSection>

          {/* Acceso admin */}
          <FormSection
            eyebrow="Acceso admin"
            description="Credenciales con las que ingresará el dueño/recepcionista al panel admin."
          >
            <Field label="Email admin" htmlFor="admin-email" required>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                disabled={isSubmitting}
                onChange={(event) => {
                  setAdminEmail(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="admin@barberia.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </Field>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={generateAutoPassword}
                disabled={isSubmitting}
                onChange={(event) => {
                  setGenerateAutoPassword(event.target.checked);
                  if (event.target.checked) {
                    setAdminPassword("");
                    setAdminPasswordConfirm("");
                  }
                  setErrorMessage("");
                }}
                className="size-4 accent-[color:var(--brand-gold)]"
              />
              <span className="text-sm text-[color:var(--text-secondary)]">
                Generar contraseña automática (se mostrará una vez al crear)
              </span>
            </label>

            {!generateAutoPassword ? (
              <div className="grid gap-5">
                <div className="grid items-start gap-5 sm:grid-cols-2">
                  <Field
                    label="Contraseña"
                    htmlFor="admin-password"
                    required
                  >
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        value={adminPassword}
                        disabled={isSubmitting}
                        onChange={(event) => {
                          setAdminPassword(event.target.value);
                          setErrorMessage("");
                        }}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--brand-gold)]"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </Field>
                  <Field
                    label="Confirmar contraseña"
                    htmlFor="admin-password-confirm"
                    required
                    error={
                      adminPasswordConfirm &&
                      adminPassword !== adminPasswordConfirm
                        ? "No coincide con la contraseña"
                        : undefined
                    }
                  >
                    <Input
                      id="admin-password-confirm"
                      type={showPassword ? "text" : "password"}
                      value={adminPasswordConfirm}
                      disabled={isSubmitting}
                      onChange={(event) => {
                        setAdminPasswordConfirm(event.target.value);
                        setErrorMessage("");
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      minLength={PASSWORD_MIN_LENGTH}
                      required
                    />
                  </Field>
                </div>
                <p className="text-xs text-[color:var(--text-subtle)]">
                  Mínimo {PASSWORD_MIN_LENGTH} caracteres.
                </p>
              </div>
            ) : null}
          </FormSection>

          {/* Primer barbero */}
          <FormSection
            eyebrow="Primer barbero"
            description="Se crea automáticamente con los horarios definidos arriba (Lun-Sáb working, Dom no). El admin puede editarlo después."
          >
            <Field label="Nombre" htmlFor="first-barber-name" required>
              <Input
                id="first-barber-name"
                value={firstBarberName}
                disabled={isSubmitting}
                onChange={(event) => {
                  setFirstBarberName(event.target.value);
                  setErrorMessage("");
                }}
                placeholder="Gino"
                required
              />
            </Field>
          </FormSection>

          {/* Servicios iniciales */}
          <FormSection
            eyebrow="Servicios iniciales"
            description="Primer set de servicios del barbero. Se pueden editar y sumar más después."
            action={
              <button
                type="button"
                onClick={handleAddService}
                disabled={isSubmitting}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[color:var(--border-default)] px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--text-secondary)] transition-colors duration-[var(--duration-fast)] hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:opacity-40"
              >
                <Plus className="size-3.5" />
                Agregar
              </button>
            }
          >
            <div className="grid gap-3">
              {services.map((service, index) => (
                <div
                  key={service.id}
                  className="grid gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border-subtle)] p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
                      Servicio {index + 1}
                    </p>
                    {services.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveService(service.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)] transition-colors hover:text-[color:var(--danger)]"
                      >
                        <Trash2 className="size-3" />
                        Quitar
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_120px_120px]">
                    <Input
                      value={service.name}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        handleServiceChange(
                          service.id,
                          "name",
                          event.target.value,
                        )
                      }
                      placeholder="Corte"
                      aria-label="Nombre del servicio"
                      required
                    />
                    <Input
                      type="number"
                      min="1"
                      value={service.price}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        handleServiceChange(
                          service.id,
                          "price",
                          event.target.value,
                        )
                      }
                      placeholder="Precio"
                      aria-label="Precio del servicio"
                      required
                    />
                    <Input
                      type="number"
                      min="1"
                      value={service.durationMinutes}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        handleServiceChange(
                          service.id,
                          "durationMinutes",
                          event.target.value,
                        )
                      }
                      placeholder="Min"
                      aria-label="Duración del servicio en minutos"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          {/* Mensajes y submit */}
          {errorMessage ? (
            <div
              role="alert"
              className="border-l-2 border-[color:var(--danger)] pl-4 text-sm font-semibold text-[color:var(--danger)]"
            >
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-[var(--radius-sm)] border border-[color:var(--success)]/40 bg-[color:var(--success-soft)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--success)]">
                Listo
              </p>
              <p className="mt-2 text-base font-bold text-white">
                {successMessage}
              </p>
              {createdAdminEmail ? (
                <p className="mt-3 text-sm text-[color:var(--text-secondary)]">
                  Admin asignado:{" "}
                  <span className="font-mono font-semibold text-white">
                    {createdAdminEmail}
                  </span>
                </p>
              ) : null}

              {temporaryPassword ? (
                <div className="mt-4 rounded-[var(--radius-sm)] border border-[color:var(--brand-gold)]/40 bg-black/50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--brand-gold)]">
                    Contraseña generada automáticamente
                  </p>
                  <p className="mt-2 font-mono text-lg font-black tabular-nums text-[color:var(--brand-gold)]">
                    {temporaryPassword}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                    Compartila con la barbería. Solo se muestra esta vez —
                    si la perdés, podés resetearla desde el panel owner.
                  </p>
                </div>
              ) : chosenPasswordReminder ? (
                <p className="mt-4 text-xs text-[color:var(--text-muted)]">
                  Compartí la contraseña que elegiste con la barbería.
                </p>
              ) : null}

              {createdSlug ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    as="link"
                    href={`/${createdSlug}`}
                    variant="secondary"
                    size="sm"
                  >
                    Página pública
                  </Button>
                  <Button
                    as="link"
                    href={`/${createdSlug}/admin`}
                    variant="secondary"
                    size="sm"
                  >
                    Admin como owner
                  </Button>
                  <Button
                    as="link"
                    href={`/login?next=/${createdSlug}/admin`}
                    variant="ghost"
                    size="sm"
                  >
                    Login admin
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="w-full sm:w-auto sm:self-end"
          >
            {isSubmitting ? "Creando…" : "Crear barbería"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function FormSection({
  eyebrow,
  description,
  action,
  children,
  className,
}: {
  eyebrow: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-t border-[color:var(--border-subtle)] pt-8",
        className,
      )}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
            {eyebrow}
          </p>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}
