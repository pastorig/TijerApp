"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarClock,
  Crown,
  Pencil,
  Plus,
  Power,
  Scissors,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
import { BarberAvailabilityManager } from "@/components/BarberAvailabilityManager";
import { cn } from "@/lib/cn";
import {
  createBarberService,
  deleteBarberServiceLogically,
  listServicesByBarber,
  toggleBarberServiceActive,
  updateBarberService,
} from "@/lib/barber-services";
import {
  createBarber,
  deleteBarber,
  listBarbersByBarbershop,
  setBarberAsOwner,
  toggleBarberActive,
  updateBarber,
} from "@/lib/barbers";
import { useConfirm } from "@/components/ui";
import { formatPrice } from "@/lib/format";
import type { BarberRow, BarberServiceRow } from "@/lib/supabase";

type AdminBarbersManagerProps = {
  barbershop: DemoBarbershop;
};

type BarberFormValues = {
  name: string;
  displayName: string;
  role: string;
  whatsapp: string;
};

type ServiceFormValues = {
  name: string;
  price: string;
  durationMinutes: string;
};

function getDisplayName(barber: BarberRow) {
  return barber.display_name?.trim() || barber.name;
}

function getInitialEditValues(barber: BarberRow): BarberFormValues {
  return {
    name: barber.name,
    displayName: barber.display_name ?? "",
    role: barber.role ?? "",
    whatsapp: barber.whatsapp ?? "",
  };
}

function getInitialServiceValues(service?: BarberServiceRow): ServiceFormValues {
  return {
    name: service?.name ?? "",
    price: service ? String(service.price) : "",
    durationMinutes: service ? String(service.duration_minutes) : "30",
  };
}

/** Iniciales para el avatar del barbero (1-2 letras). */
function getInitials(barber: BarberRow): string {
  const parts = getDisplayName(barber).trim().split(/\s+/).filter(Boolean);
  const initials = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return initials.toUpperCase() || "?";
}

type BarberTab = "perfil" | "servicios" | "horarios";

export function AdminBarbersManager({ barbershop }: AdminBarbersManagerProps) {
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [servicesByBarber, setServicesByBarber] = useState<
    Record<string, BarberServiceRow[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const confirm = useConfirm();
  const [updatingBarberId, setUpdatingBarberId] = useState<string | null>(null);
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(
    null,
  );
  const [editingBarberId, setEditingBarberId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [addingServiceBarberId, setAddingServiceBarberId] = useState<
    string | null
  >(null);
  const [editValues, setEditValues] = useState<BarberFormValues>({
    name: "",
    displayName: "",
    role: "",
    whatsapp: "",
  });
  const [serviceValues, setServiceValues] = useState<ServiceFormValues>(
    getInitialServiceValues(),
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  // Redesign master-detail: barbero seleccionado + pestaña + modal de alta.
  const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BarberTab>("servicios");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialBarbers() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const { data, error } = await listBarbersByBarbershop(barbershop.slug);

        if (!isMounted) {
          return;
        }

        if (error) {
          setErrorMessage("No pudimos cargar los barberos.");
          setBarbers([]);
          return;
        }

        const nextBarbers = data ?? [];
        const servicesResults = await Promise.all(
          nextBarbers.map((barber) =>
            listServicesByBarber({
              barbershopSlug: barbershop.slug,
              barberId: barber.id,
            }),
          ),
        );
        const nextServicesByBarber = nextBarbers.reduce<
          Record<string, BarberServiceRow[]>
        >((currentServices, barber, index) => {
          currentServices[barber.id] = servicesResults[index]?.data ?? [];
          return currentServices;
        }, {});

        setBarbers(nextBarbers);
        setServicesByBarber(nextServicesByBarber);
      } catch {
        if (isMounted) {
          setErrorMessage("No pudimos cargar los barberos.");
          setBarbers([]);
          setServicesByBarber({});
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialBarbers();

    return () => {
      isMounted = false;
    };
  }, [barbershop.slug]);

  async function handleCreateBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setErrorMessage("El nombre del barbero es obligatorio.");
      return;
    }

    setErrorMessage("");
    setIsCreating(true);

    try {
      // Si todavía no hay ningún barbero cargado, el primero queda como
      // "cabeza" por defecto. Después el admin puede cambiarla.
      const shouldMarkAsOwner = barbers.length === 0;
      const { data, error } = await createBarber({
        barbershop_slug: barbershop.slug,
        name: name.trim(),
        display_name: displayName.trim() || null,
        role: role.trim() || null,
        whatsapp: whatsapp.trim() || null,
        is_active: true,
        is_owner: shouldMarkAsOwner,
      });

      if (error || !data) {
        setErrorMessage("No pudimos crear el barbero.");
        return;
      }

      setBarbers((currentBarbers) => [...currentBarbers, data]);
      setName("");
      setDisplayName("");
      setRole("");
      setWhatsapp("");
      // Redesign: seleccionar el barbero recién creado y cerrar el modal.
      setSelectedBarberId(data.id);
      setActiveTab("servicios");
      setShowAddModal(false);
    } catch {
      setErrorMessage("No pudimos crear el barbero.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleBarber(barber: BarberRow) {
    setErrorMessage("");
    setUpdatingBarberId(barber.id);

    try {
      const { data, error } = await toggleBarberActive({
        barberId: barber.id,
        isActive: !barber.is_active,
      });

      if (error || !data) {
        setErrorMessage("No pudimos actualizar el estado del barbero.");
        return;
      }

      setBarbers((currentBarbers) =>
        currentBarbers.map((currentBarber) =>
          currentBarber.id === barber.id ? data : currentBarber,
        ),
      );
    } catch {
      setErrorMessage("No pudimos actualizar el estado del barbero.");
    } finally {
      setUpdatingBarberId(null);
    }
  }

  async function handleSetAsOwner(barber: BarberRow) {
    if (barber.is_owner) return;
    const displayName = getDisplayName(barber);
    const ok = await confirm({
      title: "Cabeza de la barbería",
      message: `${displayName} va a aparecer primero en la landing pública con borde dorado. Solo puede haber un cabeza.`,
      confirmLabel: "Marcar como cabeza",
      cancelLabel: "Volver",
    });
    if (!ok) return;

    setErrorMessage("");
    setUpdatingBarberId(barber.id);

    try {
      const { data, error } = await setBarberAsOwner({
        barberId: barber.id,
        barbershopSlug: barbershop.slug,
      });

      if (error || !data) {
        setErrorMessage("No pudimos marcar al barbero como cabeza.");
        return;
      }

      // Sortear con owner primero, después por created_at ascendente.
      setBarbers((currentBarbers) => {
        const updated = currentBarbers.map((currentBarber) => {
          if (currentBarber.id === barber.id) return data;
          if (currentBarber.is_owner) {
            return { ...currentBarber, is_owner: false };
          }
          return currentBarber;
        });
        return [...updated].sort((a, b) => {
          if (a.is_owner !== b.is_owner) return a.is_owner ? -1 : 1;
          return a.created_at.localeCompare(b.created_at);
        });
      });
    } catch {
      setErrorMessage("No pudimos marcar al barbero como cabeza.");
    } finally {
      setUpdatingBarberId(null);
    }
  }

  function handleStartEdit(barber: BarberRow) {
    setErrorMessage("");
    setEditingBarberId(barber.id);
    setEditValues(getInitialEditValues(barber));
  }

  function handleCancelEdit() {
    setEditingBarberId(null);
    setEditValues({
      name: "",
      displayName: "",
      role: "",
      whatsapp: "",
    });
  }

  async function handleUpdateBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingBarberId) {
      return;
    }

    if (!editValues.name.trim()) {
      setErrorMessage("El nombre del barbero es obligatorio.");
      return;
    }

    setErrorMessage("");
    setUpdatingBarberId(editingBarberId);

    try {
      const { data, error } = await updateBarber({
        barberId: editingBarberId,
        values: {
          name: editValues.name.trim(),
          display_name: editValues.displayName.trim() || null,
          role: editValues.role.trim() || null,
          whatsapp: editValues.whatsapp.trim() || null,
        },
      });

      if (error || !data) {
        setErrorMessage("No pudimos editar el barbero.");
        return;
      }

      setBarbers((currentBarbers) =>
        currentBarbers.map((currentBarber) =>
          currentBarber.id === editingBarberId ? data : currentBarber,
        ),
      );
      handleCancelEdit();
    } catch {
      setErrorMessage("No pudimos editar el barbero.");
    } finally {
      setUpdatingBarberId(null);
    }
  }

  async function handleDeleteBarber(barber: BarberRow) {
    const shouldDelete = await confirm({
      title: "Eliminar barbero",
      message: `${getDisplayName(barber)} deja de aparecer en reservas y en la landing. Los turnos pasados quedan en la historia.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Volver",
      danger: true,
    });

    if (!shouldDelete) {
      return;
    }

    setErrorMessage("");
    setUpdatingBarberId(barber.id);

    try {
      const { error } = await deleteBarber(barber.id);

      if (error) {
        setErrorMessage("No pudimos eliminar el barbero.");
        return;
      }

      setBarbers((currentBarbers) =>
        currentBarbers.filter((currentBarber) => currentBarber.id !== barber.id),
      );

      if (editingBarberId === barber.id) {
        handleCancelEdit();
      }
    } catch {
      setErrorMessage("No pudimos eliminar el barbero.");
    } finally {
      setUpdatingBarberId(null);
    }
  }

  function handleStartAddService(barberId: string) {
    setErrorMessage("");
    setEditingServiceId(null);
    setAddingServiceBarberId(barberId);
    setServiceValues(getInitialServiceValues());
  }

  function handleStartEditService(service: BarberServiceRow) {
    setErrorMessage("");
    setAddingServiceBarberId(null);
    setEditingServiceId(service.id);
    setServiceValues(getInitialServiceValues(service));
  }

  function handleCancelServiceForm() {
    setAddingServiceBarberId(null);
    setEditingServiceId(null);
    setServiceValues(getInitialServiceValues());
  }

  function validateServiceValues() {
    const price = Number(serviceValues.price);
    const durationMinutes = Number(serviceValues.durationMinutes);

    if (!serviceValues.name.trim()) {
      return { error: "El nombre del servicio es obligatorio." };
    }

    if (!Number.isFinite(price) || price <= 0) {
      return { error: "El precio del servicio debe ser mayor a cero." };
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return { error: "La duracion debe ser mayor a cero." };
    }

    return {
      error: "",
      values: {
        name: serviceValues.name.trim(),
        price,
        duration_minutes: durationMinutes,
      },
    };
  }

  async function handleCreateService(
    event: FormEvent<HTMLFormElement>,
    barber: BarberRow,
  ) {
    event.preventDefault();

    const validation = validateServiceValues();

    if (validation.error || !validation.values) {
      setErrorMessage(validation.error);
      return;
    }

    setErrorMessage("");
    setUpdatingServiceId(`new-${barber.id}`);

    try {
      const { data, error } = await createBarberService({
        barbershop_slug: barbershop.slug,
        barber_id: barber.id,
        name: validation.values.name,
        price: validation.values.price,
        duration_minutes: validation.values.duration_minutes,
        is_active: true,
        deleted_at: null,
      });

      if (error || !data) {
        setErrorMessage("No pudimos crear el servicio.");
        return;
      }

      setServicesByBarber((currentServices) => ({
        ...currentServices,
        [barber.id]: [...(currentServices[barber.id] ?? []), data],
      }));
      handleCancelServiceForm();
    } catch {
      setErrorMessage("No pudimos crear el servicio.");
    } finally {
      setUpdatingServiceId(null);
    }
  }

  async function handleUpdateService(
    event: FormEvent<HTMLFormElement>,
    service: BarberServiceRow,
  ) {
    event.preventDefault();

    const validation = validateServiceValues();

    if (validation.error || !validation.values) {
      setErrorMessage(validation.error);
      return;
    }

    setErrorMessage("");
    setUpdatingServiceId(service.id);

    try {
      const { data, error } = await updateBarberService({
        serviceId: service.id,
        values: validation.values,
      });

      if (error || !data) {
        setErrorMessage("No pudimos editar el servicio.");
        return;
      }

      setServicesByBarber((currentServices) => ({
        ...currentServices,
        [service.barber_id]: (currentServices[service.barber_id] ?? []).map(
          (currentService) =>
            currentService.id === service.id ? data : currentService,
        ),
      }));
      handleCancelServiceForm();
    } catch {
      setErrorMessage("No pudimos editar el servicio.");
    } finally {
      setUpdatingServiceId(null);
    }
  }

  async function handleToggleService(service: BarberServiceRow) {
    setErrorMessage("");
    setUpdatingServiceId(service.id);

    try {
      const { data, error } = await toggleBarberServiceActive({
        serviceId: service.id,
        isActive: !service.is_active,
      });

      if (error || !data) {
        setErrorMessage("No pudimos actualizar el servicio.");
        return;
      }

      setServicesByBarber((currentServices) => ({
        ...currentServices,
        [service.barber_id]: (currentServices[service.barber_id] ?? []).map(
          (currentService) =>
            currentService.id === service.id ? data : currentService,
        ),
      }));
    } catch {
      setErrorMessage("No pudimos actualizar el servicio.");
    } finally {
      setUpdatingServiceId(null);
    }
  }

  async function handleDeleteService(service: BarberServiceRow) {
    const shouldDelete = await confirm({
      title: "Eliminar servicio",
      message: `${service.name} deja de aparecer cuando los clientes reservan.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Volver",
      danger: true,
    });

    if (!shouldDelete) {
      return;
    }

    setErrorMessage("");
    setUpdatingServiceId(service.id);

    try {
      const { error } = await deleteBarberServiceLogically(service.id);

      if (error) {
        setErrorMessage("No pudimos eliminar el servicio.");
        return;
      }

      setServicesByBarber((currentServices) => ({
        ...currentServices,
        [service.barber_id]: (currentServices[service.barber_id] ?? []).filter(
          (currentService) => currentService.id !== service.id,
        ),
      }));

      if (editingServiceId === service.id) {
        handleCancelServiceForm();
      }
    } catch {
      setErrorMessage("No pudimos eliminar el servicio.");
    } finally {
      setUpdatingServiceId(null);
    }
  }

  // Redesign master-detail: barbero activo derivado + sus servicios.
  const selectedBarber =
    barbers.find((b) => b.id === selectedBarberId) ?? barbers[0] ?? null;
  const selectedServices = selectedBarber
    ? servicesByBarber[selectedBarber.id] ?? []
    : [];

  return (
    <div>
      <header className="mb-8 animate-fade-up">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--brand-gold)]">
          Admin · Equipo
        </p>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-balance text-white sm:text-4xl lg:text-5xl">
          Equipo de {barbershop.name}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--text-secondary)] sm:text-base">
          Gestioná barberos, sus servicios y horarios — cada uno en su ficha.
        </p>
      </header>

      {errorMessage ? (
        <p
          role="alert"
          className="mb-4 rounded-md border-l-2 border-[color:var(--danger)] px-3 py-2 text-sm font-semibold text-[color:var(--danger)]"
        >
          {errorMessage}
        </p>
      ) : null}

      {isLoading ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-5 text-[color:var(--text-secondary)]">
          Cargando barberos...
        </div>
      ) : barbers.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-8 text-center">
          <p className="text-sm text-[color:var(--text-secondary)]">
            Todavia no hay barberos cargados en Supabase.
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[color:var(--brand-gold)] px-4 py-2 text-xs font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)]"
          >
            <Plus className="size-4" /> Agregar barbero
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-start">
          {/* LEFT: lista de barberos */}
          <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border-subtle)] p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--text-muted)]">
                Barberos · {barbers.length}
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md bg-[color:var(--brand-gold)] px-2.5 py-1.5 text-[10px] font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)]"
              >
                <Plus className="size-3.5" /> Agregar
              </button>
            </div>
            <ul className="flex gap-2 overflow-x-auto p-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0">
              {barbers.map((barber) => {
                const isSelected = barber.id === selectedBarber?.id;
                return (
                  <li key={barber.id} className="shrink-0 lg:w-full lg:shrink">
                    <button
                      type="button"
                      onClick={() => setSelectedBarberId(barber.id)}
                      className={cn(
                        "flex w-[200px] shrink-0 items-center gap-3 rounded-lg border border-[color:var(--border-subtle)] p-3 text-left transition lg:w-full lg:shrink lg:rounded-none lg:border-0 lg:border-b lg:border-[color:var(--border-subtle)]",
                        isSelected
                          ? "bg-[color:var(--brand-gold-soft)] lg:shadow-[inset_3px_0_0_var(--brand-gold)]"
                          : "hover:bg-[color:var(--surface-2)]/40",
                      )}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[color:var(--brand-gold)]/35 bg-[#241d0c] text-xs font-bold text-[color:var(--brand-gold)]">
                        {getInitials(barber)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1">
                          <span className="truncate font-bold text-white">
                            {barber.name}
                          </span>
                          {barber.is_owner ? (
                            <Crown className="size-3 shrink-0 text-[color:var(--brand-gold)]" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[color:var(--text-muted)]">
                          {getDisplayName(barber)}
                          {barber.role ? ` · ${barber.role}` : ""}
                        </span>
                      </span>
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: barber.is_active
                            ? "var(--success)"
                            : "var(--text-subtle)",
                        }}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* RIGHT: ficha del barbero seleccionado */}
          {selectedBarber ? (
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]">
              {/* Cabecera de detalle */}
              <div className="flex items-center gap-4 p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-[color:var(--brand-gold)]/35 bg-[#241d0c] text-sm font-bold text-[color:var(--brand-gold)]">
                  {getInitials(selectedBarber)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-black text-white">
                    {selectedBarber.name}
                  </h2>
                  <p className="mt-0.5 truncate text-sm text-[color:var(--text-secondary)]">
                    {[
                      getDisplayName(selectedBarber),
                      selectedBarber.role,
                      selectedBarber.whatsapp,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {selectedBarber.is_owner ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-[color:var(--brand-gold)]/40 bg-[color:var(--brand-gold-soft)] px-2 py-1 text-[10px] font-bold uppercase text-[color:var(--brand-gold)]">
                      <Crown className="size-3" /> Cabeza
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "rounded-md border px-2 py-1 text-[10px] font-bold uppercase",
                      selectedBarber.is_active
                        ? "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]"
                        : "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]",
                    )}
                  >
                    {selectedBarber.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              {/* Barra de pestañas */}
              <div className="flex gap-4 border-b border-[color:var(--border-subtle)] px-5">
                {(
                  [
                    { key: "perfil", label: "Perfil", Icon: User },
                    { key: "servicios", label: "Servicios", Icon: Scissors },
                    { key: "horarios", label: "Horarios", Icon: CalendarClock },
                  ] as const
                ).map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      "inline-flex items-center gap-2 border-b-2 py-3 text-xs font-bold uppercase tracking-[0.08em] transition",
                      activeTab === key
                        ? "border-[color:var(--brand-gold)] text-[color:var(--brand-gold)]"
                        : "border-transparent text-[color:var(--text-muted)] hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                    {key === "servicios" ? (
                      <span className="rounded-full bg-[color:var(--surface-2)] px-1.5 py-0.5 text-[10px] font-bold text-[color:var(--text-secondary)]">
                        {selectedServices.length}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Contenido de la pestaña activa */}
              <div className="p-5">
                {activeTab === "perfil" ? (
                  editingBarberId === selectedBarber.id ? (
                    <form
                      onSubmit={handleUpdateBarber}
                      className="rounded-md border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-3"
                    >
                      <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                        Editar barbero
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          aria-label="Nombre del barbero"
                          value={editValues.name}
                          disabled={updatingBarberId === selectedBarber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              name: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                          placeholder="Nombre"
                          required
                        />
                        <input
                          aria-label="Display del barbero"
                          value={editValues.displayName}
                          disabled={updatingBarberId === selectedBarber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              displayName: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                          placeholder="Display"
                        />
                        <input
                          aria-label="Rol del barbero"
                          value={editValues.role}
                          disabled={updatingBarberId === selectedBarber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              role: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                          placeholder="Rol"
                        />
                        <input
                          aria-label="WhatsApp del barbero"
                          value={editValues.whatsapp}
                          disabled={updatingBarberId === selectedBarber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              whatsapp: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                          placeholder="WhatsApp"
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="submit"
                          disabled={updatingBarberId === selectedBarber.id}
                          className="inline-flex min-h-10 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-3 py-2 text-xs font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingBarberId === selectedBarber.id
                            ? "Guardando..."
                            : "Guardar"}
                        </button>
                        <button
                          type="button"
                          disabled={updatingBarberId === selectedBarber.id}
                          onClick={handleCancelEdit}
                          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[color:var(--border-default)] px-3 py-2 text-xs font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={updatingBarberId === selectedBarber.id}
                        onClick={() => handleStartEdit(selectedBarber)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[color:var(--border-default)] px-3 py-2 text-xs font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Pencil className="size-4" /> Editar
                      </button>
                      <button
                        type="button"
                        disabled={updatingBarberId === selectedBarber.id}
                        onClick={() => handleToggleBarber(selectedBarber)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[color:var(--border-default)] px-3 py-2 text-xs font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Power className="size-4" />
                        {updatingBarberId === selectedBarber.id
                          ? "Actualizando..."
                          : selectedBarber.is_active
                            ? "Desactivar"
                            : "Activar"}
                      </button>
                      <button
                        type="button"
                        disabled={updatingBarberId === selectedBarber.id}
                        onClick={() => handleDeleteBarber(selectedBarber)}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[color:var(--danger)]/40 px-3 py-2 text-xs font-bold uppercase text-[color:var(--danger)] transition hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="size-4" /> Eliminar
                      </button>
                      {!selectedBarber.is_owner ? (
                        <button
                          type="button"
                          disabled={updatingBarberId === selectedBarber.id}
                          onClick={() => handleSetAsOwner(selectedBarber)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-[color:var(--border-default)] px-3 py-2 text-xs font-bold uppercase text-[color:var(--text-muted)] transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Crown className="size-4" /> Marcar como cabeza
                        </button>
                      ) : null}
                    </div>
                  )
                ) : null}

                {activeTab === "servicios" ? (
                  <div className="rounded-md border border-[color:var(--border-default)] bg-black px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase text-[color:var(--brand-gold)]">
                        Servicios
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartAddService(selectedBarber.id)}
                        className="inline-flex min-h-8 items-center justify-center rounded-md border border-[color:var(--border-default)] px-2.5 py-1.5 text-[10px] font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
                      >
                        Agregar
                      </button>
                    </div>

                    {(servicesByBarber[selectedBarber.id] ?? []).length === 0 ? (
                      <p className="mt-3 text-sm text-[color:var(--text-muted)]">
                        Este barbero todavia no tiene servicios configurados.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        {(servicesByBarber[selectedBarber.id] ?? []).map(
                          (service) => (
                            <div
                              key={service.id}
                              className="rounded-md border border-[color:var(--border-default)] bg-[color:var(--surface-1)] p-3"
                            >
                              {editingServiceId === service.id ? (
                                <form
                                  onSubmit={(event) =>
                                    handleUpdateService(event, service)
                                  }
                                  className="grid gap-2"
                                >
                                  <div className="grid gap-2 sm:grid-cols-[1fr_0.7fr_0.7fr]">
                                    <input
                                      aria-label="Nombre del servicio"
                                      value={serviceValues.name}
                                      disabled={updatingServiceId === service.id}
                                      onChange={(event) =>
                                        setServiceValues((currentValues) => ({
                                          ...currentValues,
                                          name: event.target.value,
                                        }))
                                      }
                                      className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                                      placeholder="Servicio"
                                      required
                                    />
                                    <input
                                      aria-label="Precio del servicio"
                                      type="number"
                                      min="1"
                                      value={serviceValues.price}
                                      disabled={updatingServiceId === service.id}
                                      onChange={(event) =>
                                        setServiceValues((currentValues) => ({
                                          ...currentValues,
                                          price: event.target.value,
                                        }))
                                      }
                                      className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                                      placeholder="Precio"
                                      required
                                    />
                                    <input
                                      aria-label="Duracion del servicio"
                                      type="number"
                                      min="1"
                                      value={serviceValues.durationMinutes}
                                      disabled={updatingServiceId === service.id}
                                      onChange={(event) =>
                                        setServiceValues((currentValues) => ({
                                          ...currentValues,
                                          durationMinutes: event.target.value,
                                        }))
                                      }
                                      className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                                      placeholder="Min"
                                      required
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="submit"
                                      disabled={updatingServiceId === service.id}
                                      className="inline-flex min-h-9 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-3 py-2 text-[11px] font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {updatingServiceId === service.id
                                        ? "Guardando..."
                                        : "Guardar"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingServiceId === service.id}
                                      onClick={handleCancelServiceForm}
                                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--border-default)] px-3 py-2 text-[11px] font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-white">
                                        {service.name}
                                      </p>
                                      <p className="mt-0.5 text-xs text-[color:var(--text-muted)]">
                                        {formatPrice(service.price)} -{" "}
                                        {service.duration_minutes} min
                                      </p>
                                    </div>
                                    <span
                                      className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${
                                        service.is_active
                                          ? "border-[color:var(--success)]/40 bg-[color:var(--success-soft)] text-[color:var(--success)]"
                                          : "border-[color:var(--danger)]/40 bg-[color:var(--danger-soft)] text-[color:var(--danger)]"
                                      }`}
                                    >
                                      {service.is_active ? "Activo" : "Inactivo"}
                                    </span>
                                  </div>
                                  <div className="mt-3 grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      disabled={updatingServiceId === service.id}
                                      onClick={() =>
                                        handleStartEditService(service)
                                      }
                                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-[color:var(--border-default)] px-2 py-1.5 text-[10px] font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingServiceId === service.id}
                                      onClick={() => handleToggleService(service)}
                                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-[color:var(--border-default)] px-2 py-1.5 text-[10px] font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {service.is_active ? "Pausar" : "Activar"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={updatingServiceId === service.id}
                                      onClick={() => handleDeleteService(service)}
                                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-[color:var(--danger)]/40 px-2 py-1.5 text-[10px] font-bold uppercase text-[color:var(--danger)] transition hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {addingServiceBarberId === selectedBarber.id ? (
                      <form
                        onSubmit={(event) =>
                          handleCreateService(event, selectedBarber)
                        }
                        className="mt-3 rounded-md border border-[color:var(--brand-gold)]/30 bg-[color:var(--brand-gold-soft)] p-3"
                      >
                        <p className="text-[11px] font-bold uppercase text-[color:var(--brand-gold)]">
                          Nuevo servicio
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_0.7fr_0.7fr]">
                          <input
                            aria-label="Nombre del nuevo servicio"
                            value={serviceValues.name}
                            disabled={
                              updatingServiceId === `new-${selectedBarber.id}`
                            }
                            onChange={(event) =>
                              setServiceValues((currentValues) => ({
                                ...currentValues,
                                name: event.target.value,
                              }))
                            }
                            className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                            placeholder="Servicio"
                            required
                          />
                          <input
                            aria-label="Precio del nuevo servicio"
                            type="number"
                            min="1"
                            value={serviceValues.price}
                            disabled={
                              updatingServiceId === `new-${selectedBarber.id}`
                            }
                            onChange={(event) =>
                              setServiceValues((currentValues) => ({
                                ...currentValues,
                                price: event.target.value,
                              }))
                            }
                            className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                            placeholder="Precio"
                            required
                          />
                          <input
                            aria-label="Duracion del nuevo servicio"
                            type="number"
                            min="1"
                            value={serviceValues.durationMinutes}
                            disabled={
                              updatingServiceId === `new-${selectedBarber.id}`
                            }
                            onChange={(event) =>
                              setServiceValues((currentValues) => ({
                                ...currentValues,
                                durationMinutes: event.target.value,
                              }))
                            }
                            className="min-h-9 rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                            placeholder="Min"
                            required
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="submit"
                            disabled={
                              updatingServiceId === `new-${selectedBarber.id}`
                            }
                            className="inline-flex min-h-9 items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-3 py-2 text-[11px] font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingServiceId === `new-${selectedBarber.id}`
                              ? "Creando..."
                              : "Crear servicio"}
                          </button>
                          <button
                            type="button"
                            disabled={
                              updatingServiceId === `new-${selectedBarber.id}`
                            }
                            onClick={handleCancelServiceForm}
                            className="inline-flex min-h-9 items-center justify-center rounded-md border border-[color:var(--border-default)] px-3 py-2 text-[11px] font-bold uppercase text-white transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {activeTab === "horarios" ? (
                  <BarberAvailabilityManager
                    barber={selectedBarber}
                    barbershop={barbershop}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Modal de alta de barbero */}
      {showAddModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-6 shadow-2xl shadow-black/40"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase text-[color:var(--brand-gold)]">
                Agregar barbero
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Cerrar"
                className="inline-flex size-8 items-center justify-center rounded-md border border-[color:var(--border-default)] text-[color:var(--text-muted)] transition hover:border-[color:var(--brand-gold)] hover:text-[color:var(--brand-gold)]"
              >
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleCreateBarber} className="mt-4">
              <div className="grid gap-3">
                <div>
                  <label
                    htmlFor="barber-name"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    Nombre
                  </label>
                  <input
                    id="barber-name"
                    value={name}
                    disabled={isCreating}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                    placeholder="Nombre del barbero"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="barber-display-name"
                      className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                    >
                      Display
                    </label>
                    <input
                      id="barber-display-name"
                      value={displayName}
                      disabled={isCreating}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="mt-1 min-h-10 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                      placeholder="Alias"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="barber-role"
                      className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                    >
                      Rol
                    </label>
                    <input
                      id="barber-role"
                      value={role}
                      disabled={isCreating}
                      onChange={(event) => setRole(event.target.value)}
                      className="mt-1 min-h-10 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                      placeholder="Barbero"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="barber-whatsapp"
                    className="text-[11px] font-bold uppercase text-[color:var(--text-muted)]"
                  >
                    WhatsApp
                  </label>
                  <input
                    id="barber-whatsapp"
                    value={whatsapp}
                    disabled={isCreating}
                    onChange={(event) => setWhatsapp(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-md border border-[color:var(--border-default)] bg-black px-3 text-sm text-white outline-none transition placeholder:text-[color:var(--text-subtle)] focus:border-[color:var(--brand-gold)]"
                    placeholder="+54..."
                  />
                </div>
              </div>

              {errorMessage ? (
                <p
                  role="alert"
                  className="mt-4 rounded-md border-l-2 border-[color:var(--danger)] px-3 py-2 text-sm font-semibold text-[color:var(--danger)]"
                >
                  {errorMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isCreating}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[color:var(--brand-gold)] px-4 py-2 text-xs font-bold uppercase text-black transition hover:bg-[color:var(--brand-gold-hi)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creando..." : "Agregar barbero"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
