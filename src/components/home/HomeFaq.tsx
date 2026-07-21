import { FaqAccordion, type FaqItem } from "./FaqAccordion";

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "¿Cuánto cuesta usar TijerApp?",
    answer:
      "Por ahora estamos en una etapa cerrada con barberías partner. Si querés sumarte, dejanos tu mensaje en el formulario de abajo y armamos un plan según el tamaño de tu local.",
  },
  {
    question: "¿Necesito instalar algo?",
    answer:
      "No. TijerApp vive en la web, tanto para vos como para tus clientes. Lo único que necesitás es un navegador en el celular o la computadora.",
  },
  {
    question: "¿Mis clientes tienen que crear cuenta para reservar?",
    answer:
      "No, no hace falta. El cliente entra a la página de tu barbería, elige barbero, servicio y horario, y completa solamente nombre y teléfono. Sin registro.",
  },
  {
    question: "¿Puedo tener varios barberos en el mismo local?",
    answer:
      "Sí. Cada barbero define sus propios servicios, duraciones y horarios semanales. Los turnos se calculan respetando la disponibilidad real de cada uno.",
  },
  {
    question: "¿Cómo confirmo o cancelo un turno?",
    answer:
      "Desde el panel admin tenés un turnero con todos los turnos del día. Confirmás con un toque y, si querés, mandás un WhatsApp con el detalle en otro toque, manteniendo el envío separado de la confirmación.",
  },
  {
    question: "¿Pueden reservar el mismo turno dos clientes al mismo tiempo?",
    answer:
      "No. A nivel base de datos tenemos un bloqueo único por barbero, fecha y hora, así que un turno activo no se puede duplicar aunque dos personas toquen reservar al mismo tiempo.",
  },
  {
    question: "¿Tienen recordatorios automáticos?",
    answer:
      "Los recordatorios automáticos por mail están en plan próximo. Hoy podés mandar el detalle del turno por WhatsApp desde el panel con un click, con un link de confirmación que el cliente puede tocar.",
  },
  {
    question: "¿Puedo ver reportes de mis ingresos y turnos?",
    answer:
      "Sí. El panel admin incluye reportes con KPIs (turnos del período, confirmados, cancelados, ingresos), producción por barbero, top servicios, horarios pico, día más activo y clientes recurrentes vs nuevos.",
  },
  {
    question: "¿El cliente puede cancelar o confirmar su turno desde el celular?",
    answer:
      "Sí. Cuando le mandás el WhatsApp con el detalle del turno, va con un link único de confirmación. El cliente entra, ve la información del turno y puede confirmar o cancelar desde ahí sin loguearse.",
  },
  {
    question: "¿Mis datos y los de mis clientes están protegidos?",
    answer:
      "Sí. Usamos Supabase con políticas de seguridad por barbería (RLS) — cada admin solo accede a los datos de su local. La sesión está protegida por contraseña personal y los datos viajan cifrados (HTTPS). Nunca compartimos información con terceros.",
  },
];

export function HomeFaq() {
  return (
    <section
      id="faq"
      className="border-t border-[color:var(--border-subtle)] bg-[color:var(--surface-0)]"
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <header className="text-center sm:text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[color:var(--brand-gold)]">
            Preguntas frecuentes
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-balance text-white sm:mt-4 sm:text-4xl lg:text-5xl">
            Lo que más nos preguntan
          </h2>
        </header>

        <div className="mt-10">
          <FaqAccordion items={FAQ_ITEMS} idPrefix="home-faq" />
        </div>
      </div>
    </section>
  );
}
