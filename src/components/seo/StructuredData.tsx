import { PLAN_META, type PlanTier } from "@/lib/plans";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tijerapp.com";

/**
 * Datos estructurados (JSON-LD) de TijerApp.
 *
 * Sirven para dos cosas distintas:
 *  - **Google**: entiende que esto es un software con precios y preguntas
 *    frecuentes, y puede mostrar resultados enriquecidos (precio, valoración,
 *    FAQ desplegable) en vez de un link pelado.
 *  - **Buscadores con IA**: leen el JSON-LD como fuente de datos confiable.
 *    Junto con `/llms.txt` es la forma de que una respuesta generada diga el
 *    precio y las features correctas en vez de inventarlas.
 *
 * Los precios salen de `PLAN_META`, la misma fuente que la página de precios:
 * si mañana cambian, no queda un dato viejo acá contradiciendo al sitio.
 *
 * Server component: el `<script>` va en el HTML servido, que es lo que leen los
 * crawlers (muchos no ejecutan JavaScript).
 */

const TIERS: PlanTier[] = ["solo", "esencial", "pro"];

const FAQ: Array<{ question: string; answer: string }> = [
  {
    question: "¿Mis clientes tienen que descargar una app para reservar?",
    answer:
      "No. El cliente entra al link de la barbería desde el navegador, elige barbero, servicio y horario, y reserva con nombre y teléfono. Sin crear cuenta y sin descargar nada.",
  },
  {
    question: "¿Cuánto cuesta TijerApp?",
    answer:
      "Hay tres planes por mes en pesos argentinos: Solo $22.000, Esencial $41.000 y Pro $61.000, con 15% de descuento pagando anual. Incluye 14 días de prueba sin tarjeta.",
  },
  {
    question: "¿Cobra comisión por cada turno reservado?",
    answer:
      "No. TijerApp cobra una cuota fija mensual, sin comisión por reserva ni por cliente nuevo. Los clientes son de la barbería.",
  },
  {
    question: "¿Puedo cobrar una seña al reservar?",
    answer:
      "Sí. La barbería conecta su cuenta de MercadoPago con un clic y define qué porcentaje cobrar como seña y en cuánto tiempo hay que pagarla. Si no se paga, el turno se libera solo.",
  },
  {
    question: "¿Puedo tener varios barberos con horarios distintos?",
    answer:
      "Sí. Cada barbero define sus propios servicios, duraciones, horarios semanales y pausas, y los turnos disponibles se calculan sobre su disponibilidad real.",
  },
  {
    question: "¿Pueden reservar dos clientes el mismo turno?",
    answer:
      "No. Hay un bloqueo a nivel de base de datos por barbero, fecha y hora, así que un turno activo no se puede duplicar aunque dos personas toquen reservar al mismo tiempo.",
  },
  {
    question: "¿Manda recordatorios automáticos a los clientes?",
    answer:
      "Sí. El día antes del turno le llega al cliente un recordatorio por email con el logo de la barbería y un link para confirmar o cancelar, y una notificación al celular si las tiene activadas.",
  },
  {
    question: "¿Hay contrato o permanencia?",
    answer:
      "No. Se paga mes a mes y se puede cancelar cuando se quiera.",
  },
];

/**
 * Serializa a JSON escapando `<`.
 *
 * El contenido de acá es estático y propio (no entra nada del usuario), así que
 * no hay riesgo de XSS. Aun así se escapa: si algún día un texto llegara a
 * contener `</script>`, cerraría la etiqueta antes de tiempo y rompería la
 * página. Escapar `<` a `<` es válido en JSON y lo evita para siempre.
 */
function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Identificadores estables de las entidades.
 *
 * Esto es lo que convierte tres bloques sueltos de JSON-LD en **un grafo**: en
 * vez de repetir "TijerApp" en cada uno —que para un buscador podrían ser tres
 * cosas distintas—, se declara la organización una sola vez con un `@id` y los
 * demás la referencian. Así Google y los buscadores con IA entienden que hay
 * UNA entidad "TijerApp" con un sitio, un producto y un fundador.
 *
 * Los `@id` no cambian nunca: son la identidad de la entidad, no una URL.
 */
const ORG_ID = `${siteUrl}/#organization`;
const WEBSITE_ID = `${siteUrl}/#website`;
const FOUNDER_ID = `${siteUrl}/#founder`;

export function StructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "TijerApp",
    url: siteUrl,
    description:
      "Empresa argentina de software: desarrolla TijerApp, un sistema de turnos y gestión para barberías.",
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/brand/icons/manifest-icon-512.png`,
      width: 512,
      height: 512,
    },
    // Vincular la marca a una persona real es señal de entidad: le da a la
    // organización algo verificable detrás del nombre.
    founder: {
      "@type": "Person",
      "@id": FOUNDER_ID,
      name: "Bautista Pastori",
    },
    foundingLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "AR",
      },
    },
    areaServed: { "@type": "Country", name: "Argentina" },
    knowsLanguage: "es-AR",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      telephone: "+54 9 3571 566221",
      availableLanguage: ["Spanish"],
      areaServed: "AR",
    },
    // `sameAs` se completa cuando existan los perfiles oficiales (Instagram,
    // LinkedIn). Son la confirmación cruzada más fuerte de que la entidad
    // existe fuera del propio sitio: sin perfiles reales, poner cualquier cosa
    // acá sería peor que dejarlo vacío.
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: siteUrl,
    name: "TijerApp",
    inLanguage: "es-AR",
    publisher: { "@id": ORG_ID },
  };

  const softwareApplication = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TijerApp",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Software de turnos y gestión para barberías",
    operatingSystem: "Web, iOS, Android",
    url: siteUrl,
    inLanguage: "es-AR",
    description:
      "Software de turnos online para barberías en Argentina. El cliente reserva desde el celular sin crear cuenta y el barbero maneja agenda, barberos, servicios, clientes y caja desde un solo panel.",
    featureList: [
      "Reserva online sin que el cliente cree cuenta",
      "Agenda y horarios propios por barbero",
      "Bloqueo de turnos duplicados a nivel base de datos",
      "Recordatorios automáticos por email y notificaciones push",
      "Mensajes por WhatsApp al cliente con link de confirmación",
      "Cobro de seña con MercadoPago",
      "Comisiones y liquidación por barbero",
      "Reportes de turnos, ingresos y producción por barbero",
      "Cierre de caja diario",
      "Programa de fidelización y cupones",
      "Página pública de la barbería con equipo, servicios y galería",
      "App instalable (PWA) con notificaciones",
    ],
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "ARS",
      lowPrice: PLAN_META.solo.priceArs,
      highPrice: PLAN_META.pro.priceArs,
      offerCount: TIERS.length,
      offers: TIERS.map((tier) => ({
        "@type": "Offer",
        name: `Plan ${PLAN_META[tier].name}`,
        price: PLAN_META[tier].priceArs,
        priceCurrency: "ARS",
        url: `${siteUrl}/precios`,
        availability: "https://schema.org/InStock",
        description: PLAN_META[tier].tagline,
      })),
    },
    // Referencia por `@id` en vez de repetir los datos: es la misma entidad
    // declarada arriba, no una organización nueva.
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
  };

  /**
   * OJO con la expectativa: Google **dejó de mostrar resultados enriquecidos de
   * FAQ** en 2023 salvo para sitios de gobierno y salud. Esto NO va a poner un
   * desplegable en el buscador.
   *
   * Se mantiene igual porque sirve para lo otro: los buscadores con IA leen el
   * JSON-LD como fuente confiable, y tener las respuestas en formato pregunta →
   * respuesta es lo que hace que una IA pueda citarnos textualmente en vez de
   * parafrasear lo que adivina del HTML.
   */
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl}/#faq`,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(softwareApplication) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqPage) }}
      />
    </>
  );
}
