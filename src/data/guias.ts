/**
 * Guías de TijerApp — la sección de contenido del sitio.
 *
 * **Por qué existe:** el sitemap y el `llms.txt` hacen que TijerApp sea
 * indexable y entendible, pero eso alcanza para *aparecer*, no para *salir
 * primero*. Para rankear por "sistema de turnos para barbería" hace falta
 * contenido que responda las preguntas que el barbero realmente escribe antes
 * de comprar. Estas guías son eso.
 *
 * **Por qué son datos y no MDX:** el proyecto no suma dependencias sin
 * justificarlo (AGENTS.md). Un artículo acá es una estructura tipada que un
 * layout compartido renderiza: cero librerías, estilos consistentes con el
 * resto del sitio y el compilador avisando si falta un campo.
 *
 * **Regla de contenido:** cada guía tiene que servirle a alguien que NO compre.
 * Un texto que solo existe para meter palabras clave se nota, no convierte, y
 * Google lo trata como contenido pobre.
 *
 * **Datos de la competencia:** los precios ajenos que aparecen en la
 * comparativa se relevaron el 12/08/2026 sobre la página de precios oficial de
 * cada producto, no sobre blogs (los "mejores apps de turnos 2026" que salen
 * primero en Google son de los propios competidores y se contradicen entre sí).
 * Si un dato no está publicado por la fuente, no se pone: ver la regla de no
 * inventar cifras en la guía de SEO/GEO.
 */

import { monthlyPriceLabel } from "@/lib/plans";

export type GuiaBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string }
  /** Tabla comparativa. `headers` y cada fila tienen que tener el mismo largo. */
  | { type: "table"; headers: string[]; rows: string[][] };

export type Guia = {
  slug: string;
  title: string;
  /** Título corto para las tarjetas del índice. */
  cardTitle: string;
  description: string;
  /** ISO date. Se muestra y va al JSON-LD. */
  publishedAt: string;
  updatedAt?: string;
  /** Minutos de lectura, calculado a ojo sobre el largo real. */
  readingMinutes: number;
  /** Categoría para agrupar en el índice. */
  category: "Comparativas" | "Cómo hacerlo" | "Gestión";
  blocks: GuiaBlock[];
};

export const guias: Guia[] = [
  {
    // Única guía con `updatedAt`: es la que tiene precios de la competencia,
    // así que la fecha de revisión es parte del contenido. Cuando se vuelvan a
    // relevar los precios, mover esta fecha Y la del párrafo del relevamiento.
    updatedAt: "2026-08-12",
    slug: "software-turnos-barberia-argentina-comparativa",
    title:
      "Software de turnos para barberías en Argentina: comparativa honesta (2026)",
    cardTitle: "TijerApp vs Booksy, AgendaPro y Fresha",
    description:
      "Qué conviene para una barbería argentina entre Booksy, AgendaPro, Fresha y TijerApp: precios reales, si cobran en dólares, si integran MercadoPago y si se quedan con parte de tus clientes.",
    publishedAt: "2026-08-06",
    readingMinutes: 6,
    category: "Comparativas",
    blocks: [
      {
        type: "p",
        text: "Si tenés una barbería en Argentina y estás buscando con qué manejar los turnos, la lista de opciones se arma rápido: Booksy, AgendaPro, Fresha y TijerApp. Lo que no se arma tan rápido es entender cuál te conviene, porque el precio de la lista no siempre es lo que terminás pagando: hay cargos por empleado, cargos por cliente nuevo y al menos una que todavía cobra en dólares.",
      },
      {
        type: "p",
        text: "Esta comparativa la escribimos nosotros, que hacemos TijerApp. No vamos a fingir neutralidad: creemos que para una barbería argentina somos la mejor opción y abajo explicamos por qué. Pero los datos de los demás son los que están publicados, y si en algo estamos equivocados escribinos y lo corregimos.",
      },
      { type: "h2", text: "Las tres preguntas que definen la decisión" },
      {
        type: "p",
        text: "Antes de mirar features, hay tres cosas que en Argentina pesan más que cualquier funcionalidad:",
      },
      {
        type: "ol",
        items: [
          "¿En qué moneda te cobran? Un software en dólares te cambia el costo todos los meses sin que nadie toque nada. Hoy la mayoría ya publica precios en pesos, pero no todas.",
          "¿El precio es por local o por persona? Varias cobran por cada integrante del equipo, así que el número de la publicidad es el de una sola silla.",
          "¿Se queda con una parte de tus clientes? Algunas cobran un cargo por cada cliente nuevo que llega por su plataforma.",
          "¿Podés cobrar con MercadoPago? Es la forma en que efectivamente cobra una barbería acá.",
        ],
      },
      { type: "h2", text: "Comparativa" },
      {
        type: "table",
        headers: ["", "TijerApp", "Booksy", "AgendaPro", "Fresha"],
        rows: [
          [
            "Moneda",
            "Pesos argentinos",
            "Dólares",
            "Pesos argentinos",
            "Pesos argentinos",
          ],
          [
            "Desde",
            `${monthlyPriceLabel("solo")} ARS/mes`,
            "USD 29,99/mes + USD 20 por empleado",
            "$13.900 ARS/mes (1 profesional)",
            "$8.000 ARS/mes (1 persona)",
          ],
          [
            "Comisión por cliente nuevo",
            "No",
            "Solo si activás Boost: 30% de la primera visita",
            "No",
            "Sí, un cargo único por cliente nuevo que llega por su marketplace",
          ],
          ["Integra MercadoPago", "Sí", "No", "Parcial según país", "No"],
          ["Idioma y soporte", "Argentino", "Global", "Latam", "Global"],
          [
            "Marketplace propio",
            "No (tus clientes son tuyos)",
            "Sí",
            "No",
            "Sí",
          ],
        ],
      },
      {
        type: "p",
        text: "Los precios de la competencia son los que cada una publicaba en su propia página el 12 de agosto de 2026 y pueden haber cambiado — sobre todo los de Booksy, que al estar en dólares se mueven solos con el tipo de cambio. Conviene verificarlos antes de decidir. Fresha no publica en su página cuánto cobra por cliente nuevo del marketplace, así que no lo ponemos: preferimos dejar el dato incompleto antes que inventar un número.",
      },
      { type: "h2", text: "Cuándo conviene cada uno" },
      { type: "h3", text: "Fresha" },
      {
        type: "p",
        text: "Es la más barata de la lista y cobra en pesos: $8.000 por mes para una persona, $5.300 por cada integrante si son varios. Ojo con una cosa: durante años fue gratis y mucha gente todavía la recomienda así, pero el plan gratuito lo discontinuaron en 2025. El otro costo aparece después: cobran un cargo por cada cliente nuevo que te llega por su marketplace (los que ya son tuyos no pagan nada). Si tu barbería crece gracias a esa vitrina, ese cargo se suma a la cuota. Si tus clientes llegan por recomendación o por Instagram, la vitrina no te sirve y estás igual en un marketplace donde también aparece la barbería de la otra cuadra.",
      },
      { type: "h3", text: "Booksy" },
      {
        type: "p",
        text: "Es la más conocida a nivel mundial y el producto está muy pulido. Es también la única de esta lista que sigue cobrando en dólares: USD 29,99 por mes más USD 20 por cada empleado extra, así que una barbería de dos personas arranca en USD 50 y el costo en pesos te cambia solo cada vez que se mueve el tipo de cambio. Sumale que no integra MercadoPago: si querés cobrar una seña, lo tenés que resolver por afuera.",
      },
      { type: "h3", text: "AgendaPro" },
      {
        type: "p",
        text: "Es la más completa de la lista: maneja stock de productos, comisiones y marketing. Cobra en pesos y su plan de entrada ($13.900 para un profesional) es más barato que el nuestro, así que si el precio es lo único que mirás, es una opción honesta. Donde se nota que no está pensada para una barbería es en el salto: el plan que habilita trabajar con equipo cuesta $33.900 y viene con inventario, encuestas y campañas de mail. Si tenés una cadena con varias sucursales y vendés productos, eso vale la pena. Si sos tres personas cortando el pelo, estás pagando por un módulo de stock que no vas a abrir nunca.",
      },
      { type: "h3", text: "TijerApp" },
      {
        type: "p",
        text: "Lo hicimos para el caso concreto de la barbería argentina: cuota fija en pesos, sin comisión por reserva ni por cliente nuevo, con MercadoPago integrado para cobrar señas y con WhatsApp como canal principal, que es como realmente se coordina un turno acá. No tenemos marketplace, y eso es a propósito: tus clientes son tuyos y no los mostramos al lado de los de otra barbería.",
      },
      {
        type: "p",
        text: "Dónde no somos la mejor opción: si necesitás control de stock de productos o manejás una cadena grande con varias sucursales, hoy AgendaPro te va a cubrir mejor. Preferimos decirlo a que lo descubras después de pagar.",
      },
      { type: "h2", text: "Lo que ninguno te va a resolver" },
      {
        type: "p",
        text: "Ningún software te trae clientes nuevos por arte de magia. Lo que sí hace uno bueno es que dejes de perder los que ya tenías: el que te escribió a las once de la noche y no le contestaste, el que se olvidó del turno porque nadie le recordó, y el horario que quedó vacío porque el que faltó no avisó. Ahí es donde se recupera la plata.",
      },
    ],
  },

  {
    slug: "dejar-de-manejar-turnos-por-whatsapp",
    title: "Cómo dejar de manejar los turnos por WhatsApp sin perder clientes",
    cardTitle: "Salir del WhatsApp sin perder clientes",
    description:
      "El paso de coordinar turnos por chat a que el cliente reserve solo, hecho de a poco y sin que nadie se quede afuera. Qué decirle a los clientes y qué errores evitar.",
    publishedAt: "2026-08-06",
    readingMinutes: 5,
    category: "Cómo hacerlo",
    blocks: [
      {
        type: "p",
        text: "Casi todas las barberías arrancan coordinando por WhatsApp, y tiene sentido: es gratis, todos lo tienen y es lo que el cliente ya sabe usar. El problema no es el WhatsApp: es que a partir de cierta cantidad de turnos, coordinar deja de ser un mensaje y pasa a ser un trabajo.",
      },
      { type: "h2", text: "Las tres señales de que ya te quedó chico" },
      {
        type: "ul",
        items: [
          "Contestás mensajes fuera del horario de trabajo, o los dejás para después y se te acumulan.",
          "Alguna vez anotaste dos personas a la misma hora, o te olvidaste de anotar a alguien.",
          "Tenés que abrir la conversación para saber a qué hora venía alguien.",
        ],
      },
      {
        type: "p",
        text: "Si te pasan las tres, no es un problema de organización personal. Es que estás usando una herramienta de conversación como si fuera una agenda.",
      },
      { type: "h2", text: "El error más común al cambiar" },
      {
        type: "p",
        text: "El error es anunciar que “a partir del lunes no atiendo más por WhatsApp”. Suena ordenado, pero en la práctica te hace perder al cliente de siempre que no entiende el cambio, no lo prueba y simplemente deja de venir.",
      },
      {
        type: "quote",
        text: "El WhatsApp no se apaga. Se deja de usar como agenda y se sigue usando para hablar.",
      },
      { type: "h2", text: "Cómo hacerlo sin perder a nadie" },
      {
        type: "ol",
        items: [
          "Armá tu página con tus servicios, tus precios y tus horarios reales. Que el cliente vea exactamente lo que vos cobrás y cuándo atendés.",
          "Ponés el link en la bio de Instagram y en el estado de WhatsApp. Todavía no le decís nada a nadie.",
          "Cuando alguien te escriba para pedir turno, respondele como siempre y mandale el link: “te dejo acá para que elijas el horario que te quede mejor”. Que lo pruebe con vos del otro lado.",
          "Después de dos o tres semanas, la mayoría ya reserva sola. Ahí sí podés poner el link como primera respuesta.",
          "Al que no se adapta, seguile tomando el turno a mano. Siempre hay dos o tres, y no vale la pena perderlos por una regla.",
        ],
      },
      { type: "h2", text: "Qué ganás además de tiempo" },
      {
        type: "p",
        text: "Lo obvio es dejar de contestar mensajes. Lo que casi nadie anticipa es lo otro: los turnos que entran cuando no estás. Un porcentaje grande de las reservas online se hacen de noche o un domingo, momentos en que antes el mensaje quedaba sin responder hasta el otro día — y a veces para entonces el cliente ya se había ido a otro lado.",
      },
      {
        type: "p",
        text: "El segundo cambio es que dejás de tener la agenda en la cabeza. Saber cuánto vas a facturar mañana, o quién viene a las cuatro, deja de depender de que te acuerdes.",
      },
    ],
  },

  {
    slug: "comision-barberos-cuanto-y-como-calcularla",
    title: "Cuánto cobrarle de comisión a un barbero y cómo calcularla bien",
    cardTitle: "Comisiones: cuánto y cómo calcularlas",
    description:
      "Los porcentajes que se usan en Argentina según el arreglo, la diferencia entre comisión y alquiler de sillón, y cómo liquidar sin que las cuentas te queden mal.",
    publishedAt: "2026-08-06",
    readingMinutes: 5,
    category: "Gestión",
    blocks: [
      {
        type: "p",
        text: "Cuando sumás el primer empleado aparece una pregunta incómoda: cuánto le toca. No hay un número único, porque depende de quién pone qué. Lo que sí hay son tres arreglos que se repiten y conviene conocer antes de improvisar.",
      },
      { type: "h2", text: "Los tres arreglos más comunes" },
      { type: "h3", text: "Comisión sobre lo que produce" },
      {
        type: "p",
        text: "El barbero cobra un porcentaje de lo que factura. Es el más usado en barberías chicas. El rango habitual va del 40% al 60%, y dónde caigas dentro de ese rango depende sobre todo de quién trae al cliente y quién pone los insumos.",
      },
      {
        type: "ul",
        items: [
          "Más cerca del 40-45%: el local trae los clientes, pone todos los insumos y el barbero recién arranca.",
          "Alrededor del 50%: el reparto más común, con clientes mixtos y insumos del local.",
          "Más cerca del 55-60%: el barbero trae su propia clientela o pone parte de sus herramientas.",
        ],
      },
      { type: "h3", text: "Alquiler de sillón" },
      {
        type: "p",
        text: "El barbero paga un monto fijo por semana o por mes y se queda con todo lo que factura. Le conviene al que ya tiene clientela armada, y al dueño le da un ingreso previsible. La contra es que si el barbero tiene una mala semana, igual paga — y esa tensión a veces termina con el barbero yéndose.",
      },
      { type: "h3", text: "Sueldo fijo más porcentaje" },
      {
        type: "p",
        text: "Un básico asegurado más una comisión menor, en general entre 20% y 30%. Es el que más estabilidad le da al barbero, y el que más riesgo le deja al dueño en los meses flojos.",
      },
      { type: "h2", text: "El detalle que hace que las cuentas cierren mal" },
      {
        type: "p",
        text: "Este es el error más frecuente y el más molesto de encontrar: calcular por separado lo que le toca al barbero y lo que queda para la barbería.",
      },
      {
        type: "p",
        text: "Supongamos que produjo $1.404.500 y cobra 47,5%. Si calculás su parte ($667.138) y por otro lado la tuya (52,5% = $737.362), las dos cuentas por separado pueden no dar exactamente el total por el redondeo. Aparece una diferencia de pesos que no sabés explicar, y que al empleado le genera desconfianza aunque sean centavos.",
      },
      {
        type: "quote",
        text: "Calculá la comisión y obtené tu parte restando. Nunca las dos por separado.",
      },
      {
        type: "p",
        text: "Con la resta, la cuenta cierra siempre: lo del barbero más lo de la barbería es exactamente lo producido, sin excepciones y sin importar el porcentaje.",
      },
      { type: "h2", text: "Cerrá el período en el mismo lugar donde están los turnos" },
      {
        type: "p",
        text: "La otra fuente de discusiones es liquidar sobre una planilla aparte. Si los turnos están en un lado y la liquidación en otro, cualquier turno cancelado o cargado tarde desacomoda el número, y no hay forma de reconstruir de dónde salió.",
      },
      {
        type: "p",
        text: "Lo sano es que la liquidación salga de los mismos turnos que ya cargaste: elegís el período y el sistema te dice qué produjo cada uno, qué porcentaje cobra, cuánto le corresponde y cuánto te queda. En TijerApp eso está en Reportes, y podés mandarle el detalle al barbero por WhatsApp para que vea de dónde sale el número.",
      },
    ],
  },

  {
    slug: "cobrar-sena-turnos-que-se-caen",
    title: "Cómo cobrar seña para que dejen de caerse los turnos",
    cardTitle: "Cobrar seña para que no falten",
    description:
      "Cuánto conviene pedir de seña, en qué casos aplicarla y cómo plantearlo sin que el cliente se ofenda. Con lo que hay que tener listo para cobrarla por MercadoPago.",
    publishedAt: "2026-08-06",
    readingMinutes: 4,
    category: "Cómo hacerlo",
    blocks: [
      {
        type: "p",
        text: "El turno que se cae no cuesta solo el corte que no hiciste: cuesta el horario que bloqueaste y que otro cliente podría haber usado. En una agenda llena, dos ausencias por semana son varios cortes por mes que no facturaste.",
      },
      { type: "h2", text: "Antes de cobrar seña, probá esto" },
      {
        type: "p",
        text: "La seña es una fricción, y agregar fricción siempre cuesta algunas reservas. Antes de ponerla vale la pena descartar lo barato: si no mandás recordatorio automático el día antes, empezá por ahí. Buena parte de las ausencias no son gente que te falta a propósito, es gente que se olvidó.",
      },
      { type: "h2", text: "Cuánto pedir" },
      {
        type: "p",
        text: "La seña no está para cubrir el corte, está para que el cliente tenga algo en juego. Entre el 20% y el 30% del valor del servicio suele alcanzar: es suficiente para que se acuerde y lo bastante bajo para que no se vaya a otro lado.",
      },
      {
        type: "ul",
        items: [
          "Menos del 15%: casi no cambia el comportamiento.",
          "Entre 20% y 30%: el rango que funciona en la mayoría de los casos.",
          "Más del 50%: reduce las ausencias, sí, pero también te reduce las reservas.",
        ],
      },
      { type: "h2", text: "No hace falta cobrársela a todos" },
      {
        type: "p",
        text: "Al cliente de años que nunca faltó, pedirle seña es tratarlo peor de lo que se merece. Los casos donde más rinde son otros:",
      },
      {
        type: "ul",
        items: [
          "Clientes nuevos, que son los que más faltan.",
          "Servicios largos y caros, donde el horario perdido duele más.",
          "Sábados y horarios pico, que son los que podrías haberle dado a otro.",
          "Alguien que ya te faltó sin avisar.",
        ],
      },
      { type: "h2", text: "Cómo decirlo sin que suene a desconfianza" },
      {
        type: "p",
        text: "La diferencia está en cómo se explica. “Pedimos seña porque la gente falta” suena a reproche. “La seña se descuenta del total y nos ayuda a guardarte el horario” dice lo mismo sin acusar a nadie, y además es cierto: el cliente no está pagando de más, está adelantando parte.",
      },
      { type: "h2", text: "Qué necesitás para cobrarla" },
      {
        type: "p",
        text: "En la práctica hace falta que el cobro esté dentro del flujo de reserva: si el cliente tiene que reservar por un lado y transferirte por otro, la mitad no lo hace y terminás persiguiendo el pago por chat.",
      },
      {
        type: "ol",
        items: [
          "Conectá tu cuenta de MercadoPago al sistema de turnos. En TijerApp es un botón, sin cargar tokens a mano.",
          "Definí el porcentaje de seña y en cuánto tiempo hay que pagarla.",
          "Dejá que el sistema libere solo el horario si no se pagó en ese plazo, así no tenés que estar mirando.",
          "Avisale al cliente que la seña se descuenta del total cuando venga.",
        ],
      },
      {
        type: "p",
        text: "El punto que más cambia el resultado es el tercero: si el horario no se libera solo, la seña no te resuelve el problema — te lo cambia por la tarea de estar revisando quién pagó.",
      },
    ],
  },
];

export function getGuiaBySlug(slug: string): Guia | undefined {
  return guias.find((guia) => guia.slug === slug);
}

/** Guías ordenadas de más nueva a más vieja. */
export function getGuiasOrdenadas(): Guia[] {
  return [...guias].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}
