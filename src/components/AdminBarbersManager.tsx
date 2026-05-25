"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { DemoBarbershop } from "@/data/demo-barbershops";
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
  toggleBarberActive,
  updateBarber,
} from "@/lib/barbers";
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

export function AdminBarbersManager({ barbershop }: AdminBarbersManagerProps) {
  const [barbers, setBarbers] = useState<BarberRow[]>([]);
  const [servicesByBarber, setServicesByBarber] = useState<
    Record<string, BarberServiceRow[]>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
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
      const { data, error } = await createBarber({
        barbershop_slug: barbershop.slug,
        name: name.trim(),
        display_name: displayName.trim() || null,
        role: role.trim() || null,
        whatsapp: whatsapp.trim() || null,
        is_active: true,
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
    const shouldDelete = window.confirm(
      `Eliminar visualmente a ${getDisplayName(barber)}? No aparecera en reservas.`,
    );

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
    const shouldDelete = window.confirm(
      `Eliminar visualmente el servicio ${service.name}?`,
    );

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

  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <section className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8 lg:px-12 lg:py-12">
        <div className="flex flex-col gap-4 border-b border-stone-800 pb-5 sm:pb-8">
          <p className="text-sm font-semibold uppercase text-amber-300">
            BarberSync admin
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <h1 className="text-3xl font-black text-balance sm:text-5xl">
                Barberos de {barbershop.name}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300 sm:text-base sm:leading-7">
                Gestion real de barberos desde Supabase. Los servicios se
                configuraran en una fase posterior.
              </p>
            </div>
            <Link
              href={`/${barbershop.slug}/admin`}
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-700 px-4 py-2 text-sm font-bold text-stone-100 transition hover:border-amber-300 hover:text-amber-200 sm:min-h-11"
            >
              Volver al panel
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <form
            onSubmit={handleCreateBarber}
            className="rounded-lg border border-stone-800 bg-stone-900/70 p-4 shadow-2xl shadow-black/20 sm:p-5"
          >
            <p className="text-xs font-bold uppercase text-amber-300">
              Agregar barbero
            </p>
            <div className="mt-4 grid gap-3">
              <div>
                <label
                  htmlFor="barber-name"
                  className="text-[11px] font-bold uppercase text-stone-400"
                >
                  Nombre
                </label>
                <input
                  id="barber-name"
                  value={name}
                  disabled={isCreating}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                  placeholder="Nombre del barbero"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="barber-display-name"
                    className="text-[11px] font-bold uppercase text-stone-400"
                  >
                    Display
                  </label>
                  <input
                    id="barber-display-name"
                    value={displayName}
                    disabled={isCreating}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Alias"
                  />
                </div>
                <div>
                  <label
                    htmlFor="barber-role"
                    className="text-[11px] font-bold uppercase text-stone-400"
                  >
                    Rol
                  </label>
                  <input
                    id="barber-role"
                    value={role}
                    disabled={isCreating}
                    onChange={(event) => setRole(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                    placeholder="Barbero"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="barber-whatsapp"
                  className="text-[11px] font-bold uppercase text-stone-400"
                >
                  WhatsApp
                </label>
                <input
                  id="barber-whatsapp"
                  value={whatsapp}
                  disabled={isCreating}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                  placeholder="+54..."
                />
              </div>
            </div>

            {errorMessage ? (
              <p
                role="alert"
                className="mt-4 rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isCreating}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-xs font-bold uppercase text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? "Creando..." : "Agregar barbero"}
            </button>
          </form>

          <section className="grid gap-3">
            {isLoading ? (
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-5 text-stone-300">
                Cargando barberos...
              </div>
            ) : null}

            {!isLoading && !errorMessage && barbers.length === 0 ? (
              <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-5 text-stone-300">
                Todavia no hay barberos cargados en Supabase.
              </div>
            ) : null}

            {!isLoading &&
              barbers.map((barber) => (
                <article
                  key={barber.id}
                  className="rounded-lg border border-stone-800 bg-stone-900/70 p-4 shadow-lg shadow-black/20 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-stone-500">
                        Barbero
                      </p>
                      <h2 className="mt-1 truncate text-xl font-black text-stone-100 sm:text-2xl">
                        {barber.name}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-stone-300">
                        {getDisplayName(barber)}
                        {barber.role ? ` - ${barber.role}` : ""}
                      </p>
                      {barber.whatsapp ? (
                        <p className="mt-1 text-xs text-stone-400">
                          {barber.whatsapp}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${
                        barber.is_active
                          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                          : "border-red-300/30 bg-red-400/10 text-red-200"
                      }`}
                    >
                      {barber.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="mt-4 rounded-md border border-stone-800 bg-stone-950 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold uppercase text-amber-300">
                        Servicios
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartAddService(barber.id)}
                        className="inline-flex min-h-8 items-center justify-center rounded-md border border-stone-700 px-2.5 py-1.5 text-[10px] font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200"
                      >
                        Agregar
                      </button>
                    </div>

                    {(servicesByBarber[barber.id] ?? []).length === 0 ? (
                      <p className="mt-3 text-sm text-stone-400">
                        Este barbero todavia no tiene servicios configurados.
                      </p>
                    ) : (
                      <div className="mt-3 grid gap-2">
                        {(servicesByBarber[barber.id] ?? []).map((service) => (
                          <div
                            key={service.id}
                            className="rounded-md border border-stone-800 bg-stone-900/70 p-3"
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
                                    className="min-h-9 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
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
                                    className="min-h-9 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
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
                                    className="min-h-9 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                                    placeholder="Min"
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="submit"
                                    disabled={updatingServiceId === service.id}
                                    className="inline-flex min-h-9 items-center justify-center rounded-md bg-amber-300 px-3 py-2 text-[11px] font-bold uppercase text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {updatingServiceId === service.id
                                      ? "Guardando..."
                                      : "Guardar"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingServiceId === service.id}
                                    onClick={handleCancelServiceForm}
                                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-stone-700 px-3 py-2 text-[11px] font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-stone-100">
                                      {service.name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-stone-400">
                                      {formatPrice(service.price)} -{" "}
                                      {service.duration_minutes} min
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${
                                      service.is_active
                                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                                        : "border-red-300/30 bg-red-400/10 text-red-200"
                                    }`}
                                  >
                                    {service.is_active ? "Activo" : "Inactivo"}
                                  </span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <button
                                    type="button"
                                    disabled={updatingServiceId === service.id}
                                    onClick={() => handleStartEditService(service)}
                                    className="inline-flex min-h-8 items-center justify-center rounded-md border border-stone-700 px-2 py-1.5 text-[10px] font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingServiceId === service.id}
                                    onClick={() => handleToggleService(service)}
                                    className="inline-flex min-h-8 items-center justify-center rounded-md border border-stone-700 px-2 py-1.5 text-[10px] font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {service.is_active ? "Pausar" : "Activar"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingServiceId === service.id}
                                    onClick={() => handleDeleteService(service)}
                                    className="inline-flex min-h-8 items-center justify-center rounded-md border border-red-300/40 px-2 py-1.5 text-[10px] font-bold uppercase text-red-100 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {addingServiceBarberId === barber.id ? (
                      <form
                        onSubmit={(event) => handleCreateService(event, barber)}
                        className="mt-3 rounded-md border border-amber-300/30 bg-amber-300/10 p-3"
                      >
                        <p className="text-[11px] font-bold uppercase text-amber-200">
                          Nuevo servicio
                        </p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_0.7fr_0.7fr]">
                          <input
                            aria-label="Nombre del nuevo servicio"
                            value={serviceValues.name}
                            disabled={updatingServiceId === `new-${barber.id}`}
                            onChange={(event) =>
                              setServiceValues((currentValues) => ({
                                ...currentValues,
                                name: event.target.value,
                              }))
                            }
                            className="min-h-9 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                            placeholder="Servicio"
                            required
                          />
                          <input
                            aria-label="Precio del nuevo servicio"
                            type="number"
                            min="1"
                            value={serviceValues.price}
                            disabled={updatingServiceId === `new-${barber.id}`}
                            onChange={(event) =>
                              setServiceValues((currentValues) => ({
                                ...currentValues,
                                price: event.target.value,
                              }))
                            }
                            className="min-h-9 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                            placeholder="Precio"
                            required
                          />
                          <input
                            aria-label="Duracion del nuevo servicio"
                            type="number"
                            min="1"
                            value={serviceValues.durationMinutes}
                            disabled={updatingServiceId === `new-${barber.id}`}
                            onChange={(event) =>
                              setServiceValues((currentValues) => ({
                                ...currentValues,
                                durationMinutes: event.target.value,
                              }))
                            }
                            className="min-h-9 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                            placeholder="Min"
                            required
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="submit"
                            disabled={updatingServiceId === `new-${barber.id}`}
                            className="inline-flex min-h-9 items-center justify-center rounded-md bg-amber-300 px-3 py-2 text-[11px] font-bold uppercase text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingServiceId === `new-${barber.id}`
                              ? "Creando..."
                              : "Crear servicio"}
                          </button>
                          <button
                            type="button"
                            disabled={updatingServiceId === `new-${barber.id}`}
                            onClick={handleCancelServiceForm}
                            className="inline-flex min-h-9 items-center justify-center rounded-md border border-stone-700 px-3 py-2 text-[11px] font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>

                  {editingBarberId === barber.id ? (
                    <form
                      onSubmit={handleUpdateBarber}
                      className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 p-3"
                    >
                      <p className="text-xs font-bold uppercase text-amber-200">
                        Editar barbero
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <input
                          aria-label="Nombre del barbero"
                          value={editValues.name}
                          disabled={updatingBarberId === barber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              name: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                          placeholder="Nombre"
                          required
                        />
                        <input
                          aria-label="Display del barbero"
                          value={editValues.displayName}
                          disabled={updatingBarberId === barber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              displayName: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                          placeholder="Display"
                        />
                        <input
                          aria-label="Rol del barbero"
                          value={editValues.role}
                          disabled={updatingBarberId === barber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              role: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                          placeholder="Rol"
                        />
                        <input
                          aria-label="WhatsApp del barbero"
                          value={editValues.whatsapp}
                          disabled={updatingBarberId === barber.id}
                          onChange={(event) =>
                            setEditValues((currentValues) => ({
                              ...currentValues,
                              whatsapp: event.target.value,
                            }))
                          }
                          className="min-h-10 rounded-md border border-stone-700 bg-stone-950 px-3 text-sm text-stone-50 outline-none transition placeholder:text-stone-500 focus:border-amber-300 focus:ring-2 focus:ring-amber-300/20"
                          placeholder="WhatsApp"
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="submit"
                          disabled={updatingBarberId === barber.id}
                          className="inline-flex min-h-10 items-center justify-center rounded-md bg-amber-300 px-3 py-2 text-xs font-bold uppercase text-stone-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {updatingBarberId === barber.id
                            ? "Guardando..."
                            : "Guardar"}
                        </button>
                        <button
                          type="button"
                          disabled={updatingBarberId === barber.id}
                          onClick={handleCancelEdit}
                          className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-700 px-3 py-2 text-xs font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <button
                        type="button"
                        disabled={updatingBarberId === barber.id}
                        onClick={() => handleStartEdit(barber)}
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-700 px-3 py-2 text-xs font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={updatingBarberId === barber.id}
                        onClick={() => handleToggleBarber(barber)}
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-700 px-3 py-2 text-xs font-bold uppercase text-stone-100 transition hover:border-amber-300 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {updatingBarberId === barber.id
                          ? "Actualizando..."
                          : barber.is_active
                            ? "Desactivar"
                            : "Activar"}
                      </button>
                      <button
                        type="button"
                        disabled={updatingBarberId === barber.id}
                        onClick={() => handleDeleteBarber(barber)}
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-red-300/40 px-3 py-2 text-xs font-bold uppercase text-red-100 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        disabled
                        className="inline-flex min-h-10 items-center justify-center rounded-md border border-stone-800 px-3 py-2 text-xs font-bold uppercase text-stone-500 disabled:cursor-not-allowed"
                      >
                        Servicios luego
                      </button>
                    </div>
                  )}
                </article>
              ))}
          </section>
        </div>
      </section>
    </main>
  );
}
