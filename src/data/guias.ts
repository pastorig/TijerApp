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
    cardTitle: "TijerApp vs Turnix, Gendu, turnoapp y los internacionales",
    description:
      "Los 7 sistemas de turnos que puede usar una barbería argentina, con los precios que cada uno publica: Turnix, Gendu, turnoapp, AgendaPro, Fresha, Booksy y TijerApp. Cuál cobra seña con MercadoPago, cuál se queda con parte de tus clientes y cuál conviene según tu caso.",
    publishedAt: "2026-08-06",
    readingMinutes: 6,
    category: "Comparativas",
    blocks: [
      {
        type: "p",
        text: "Si tenés una barbería en Argentina y buscás con qué manejar los turnos, hay más opciones de las que aparecen en la primera búsqueda. Están las internacionales que todos conocen —Booksy, AgendaPro, Fresha— y están las argentinas, que casi nadie lista junta: Turnix, Gendu, turnoapp y nosotros. Lo difícil no es encontrarlas, es entender cuál te sirve, porque el precio del titular casi nunca es lo que terminás pagando.",
      },
      {
        type: "p",
        text: "Esta comparativa la escribimos nosotros, que hacemos TijerApp. No vamos a fingir neutralidad. Pero tampoco vamos a esconder a los que son más baratos: abajo están los tres argentinos que cobran menos que nosotros, con el precio que publican. Si buscás lo más barato, ya te adelantamos que no somos nosotros y te decimos cuál es. Los datos son los que cada uno publica en su propia página; si algo está mal, escribinos y lo corregimos.",
      },
      { type: "h2", text: "Las cuatro preguntas que definen la decisión" },
      {
        type: "p",
        text: "Antes de mirar features, hay cuatro cosas que en Argentina pesan más que cualquier funcionalidad:",
      },
      {
        type: "ol",
        items: [
          "¿En qué moneda te cobran? Un software en dólares te cambia el costo todos los meses sin que nadie toque nada. Hoy la mayoría ya publica precios en pesos, pero no todas.",
          "¿El precio es por local o por persona? Varias cobran por cada integrante del equipo, así que el número de la publicidad es el de una sola silla.",
          "¿Podés cobrar la seña con MercadoPago? No es lo mismo «integra MercadoPago» que «le pide una seña al cliente cuando reserva». Lo segundo es lo que hace que deje de faltar gente.",
          "¿Se queda con una parte de tus clientes? Las que tienen marketplace te muestran al lado de la barbería de la otra cuadra, y algunas cobran por cada cliente nuevo que te llega de ahí.",
        ],
      },
      { type: "h2", text: "Comparativa" },
      {
        type: "p",
        text: "Un renglón por producto, ordenados del más barato al más caro. El precio es el del plan de entrada, para un solo barbero.",
      },
      {
        type: "table",
        headers: [
          "",
          "Desde",
          "Seña con MercadoPago",
          "Hecho solo para barberías",
          "Marketplace",
        ],
        rows: [
          ["Fresha", "$8.000 (1 persona)", "No", "No", "Sí"],
          ["Gendu", "$8.300 · gratis limitado", "No lo publica", "No", "No"],
          ["Turnix", "$9.900", "No lo ofrece", "Sí", "No"],
          ["AgendaPro", "$13.900 (1 profesional)", "No lo publica", "No", "Sí"],
          ["turnoapp", "$14.999", "Sí", "No", "No"],
          ["TijerApp", `${monthlyPriceLabel("solo")}`, "Sí", "Sí", "No"],
          ["Booksy", "USD 29,99 + USD 20 por empleado", "No", "No", "Sí"],
        ],
      },
      {
        type: "p",
        text: "Lo primero que salta: de los sistemas argentinos, somos el más caro. Turnix sale menos de la mitad y Gendu tiene hasta un plan gratis. Si lo único que necesitás es una agenda online que funcione, hay tres opciones más baratas que nosotros y están todas en esa tabla.",
      },
      {
        type: "p",
        text: "Lo segundo, que es la razón por la que existimos: en las dos últimas columnas juntas no hay nadie más. Turnix está hecho para barberías pero no cobra seña. turnoapp cobra seña con MercadoPago pero es multi-rubro, igual que Gendu: sirven para una barbería, una lashista o un consultorio, así que ninguno habla de sillones, ni de barberos, ni de comisiones por corte. Somos el único que hace las dos cosas.",
      },
      {
        type: "p",
        text: "Los precios son los que cada uno publicaba en su propia página el 12 de agosto de 2026 y pueden haber cambiado — sobre todo los de Booksy, que al estar en dólares se mueven solos con el tipo de cambio. Cuando una columna dice «no lo publica» es literal: esa función no aparece en su página y preferimos decir que no sabemos antes que afirmar que no la tiene. Fresha tampoco publica cuánto cobra por cliente nuevo del marketplace, así que no ponemos el porcentaje.",
      },
      { type: "h2", text: "Cuándo conviene cada uno" },
      { type: "h3", text: "Turnix" },
      {
        type: "p",
        text: "Es el que más se nos parece: argentino, en pesos, y hecho solo para barberías. Un plan único de $9.900 con agenda, servicios ilimitados, bloqueos, portal de reservas con tu marca, manejo de equipo y estadísticas. Si lo que necesitás es dejar de coordinar por WhatsApp y nada más, cuesta menos de la mitad que nosotros y hace ese trabajo. Es la opción que le recomendaríamos a un barbero que recién arranca y no quiere gastar.",
      },
      {
        type: "p",
        text: "Dónde se corta: en su plan no aparecen ni pagos, ni MercadoPago, ni cobro de seña. Si tu problema son los que faltan sin avisar, ahí no vas a encontrar la herramienta para frenarlo.",
      },
      { type: "h3", text: "Gendu" },
      {
        type: "p",
        text: "El más barato de todos y el único con un plan gratis de verdad: turnos sin límite, link propio e historial, sin pagar nada. El plan Comercial ($8.300) suma panel de WhatsApp, integración con MercadoPago, reprogramación, descuentos por código y Google Calendar. Con tres profesionales son $13.100, más barato que casi cualquier otro.",
      },
      {
        type: "p",
        text: "El punto es que Gendu es para cualquier rubro: la misma herramienta le sirve a una barbería, a una manicura o a un consultorio. Eso está bien si querés algo genérico y barato, pero significa que nadie pensó tu caso en particular: no vas a encontrar comisiones por barbero, ni aprovechamiento de la jornada, ni cierre de caja pensado para un sillón.",
      },
      { type: "h3", text: "turnoapp" },
      {
        type: "p",
        text: "Es el competidor argentino más parecido a nosotros en funciones: su plan Pro ($14.999) conecta tu cuenta de MercadoPago y te deja definir cuándo pedir una seña, con recordatorios por WhatsApp, confirmaciones automáticas y bonos de sesiones. También tiene plan gratis con página de reservas. Si buscás cobrar seña gastando lo menos posible, es la alternativa real a TijerApp y sale $7.000 menos.",
      },
      {
        type: "p",
        text: "La diferencia es la misma que con Gendu: también es multi-rubro —lo publicitan para peluquerías, lashistas, cosmetólogas y consultorios— así que el producto está pensado para el común denominador de todos esos negocios, no para el tuyo.",
      },
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
        text: "Somos el más caro de los argentinos y no vamos a hacer de cuenta que no. Lo que pagás de más es que el producto está hecho para una barbería y para nada más: comisión por barbero para liquidarle a cada uno, aprovechamiento de la jornada (cuántos cortes te entran y a qué hora te conviene cerrar), cierre de caja diario, turnos manuales para el que se te sienta sin reservar, y la seña por MercadoPago para el que falta sin avisar. Nada de eso existe en una herramienta multi-rubro, porque no tendría sentido que existiera.",
      },
      {
        type: "p",
        text: "El resto es lo mismo que promete cualquiera, pero conviene decirlo igual: cuota fija en pesos, sin comisión por reserva ni por cliente nuevo, y WhatsApp como canal principal, que es como realmente se coordina un turno acá. No tenemos marketplace y es a propósito: tus clientes son tuyos y no los mostramos al lado de los de la barbería de enfrente.",
      },
      {
        type: "p",
        text: "Dónde NO somos la mejor opción, para que no lo descubras después de pagar: si buscás lo más barato, es Turnix o Gendu. Si querés cobrar seña gastando lo mínimo y no te importa que la herramienta sea genérica, es turnoapp. Y si manejás una cadena con varias sucursales y vendés productos con control de stock, es AgendaPro. Somos la mejor opción para una barbería argentina que quiere cobrar seña y llevar la cuenta de lo que produce cada barbero — no para todos.",
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
