# Specification: Landing con movimiento — "Escena viva"

**Branch**: `012-landing-motion`
**Created**: 2026-07-29
**Status**: Draft
**Input**: Rediseñar la home de TijerApp para que sea más llamativa, sumando animaciones ligadas al scroll (dirección "Escena viva"), acotado a Hero, Stats y "Cómo funciona".

## Contexto

La home ya convierte razonablemente y tiene una estética premium definida (negro + gold,
tipografía black uppercase, `card-premium`). Lo que le falta es **vida**: hoy el visual del
hero es una imagen fija y las secciones aparecen con un fade genérico al entrar en pantalla.
Un barbero que entra por primera vez no percibe que del otro lado hay un producto que
"funciona solo".

**Principio:** el movimiento tiene que *contar el producto*, no decorar. Cada animación
muestra a TijerApp trabajando: turnos que entran, la agenda que se llena, los pasos que se
encadenan. Nada de movimiento porque sí.

## User Scenarios & Testing

### Primary User Story

Un dueño de barbería entra a la home desde el celular tras ver un link en Instagram.
Mientras scrollea, ve el mini-dashboard del hero cobrando vida (entra un turno nuevo, el
gráfico se dibuja, los números suben) y los tres pasos de "Cómo funciona" encendiéndose a
medida que avanza. Termina el scroll entendiendo qué hace el producto y con ganas de probarlo.

### Acceptance Scenarios

1. **Given** un visitante que entra a la home en desktop, **When** el hero aparece en
   pantalla, **Then** el gráfico de barras del panel de ingresos crece desde cero en
   cascada y los KPIs ("Turnos hoy", "Ocupación") cuentan desde 0 hasta su valor final,
   una sola vez.
2. **Given** un visitante en el hero, **When** pasan unos segundos, **Then** entra
   deslizándose una notificación de "Nuevo turno" con su horario, permanece brevemente y
   se retira, repitiéndose de forma cíclica.
3. **Given** un visitante que scrollea hacia "Cómo funciona", **When** avanza el scroll
   dentro de la sección, **Then** la línea dorada que conecta los tres pasos se traza
   progresivamente de izquierda a derecha, atada al avance del scroll, y cada paso se
   enciende cuando la línea lo alcanza.
4. **Given** un visitante que scrollea hacia Stats, **When** las tarjetas entran en
   pantalla, **Then** aparecen escalonadas con sus íconos haciendo un pop breve.
5. **Given** un visitante con "reducir movimiento" activado en su sistema operativo,
   **When** recorre toda la home, **Then** ve todos los contenidos en su estado final
   (gráfico completo, números finales, línea trazada, tarjetas visibles) sin ninguna
   animación ni movimiento.
6. **Given** un visitante en un celular de gama media, **When** scrollea la home completa,
   **Then** el scroll se mantiene fluido y ninguna animación produce saltos de layout.

### Edge Cases

- **Scroll muy rápido:** si el visitante pasa de largo una sección, las animaciones de
  entrada no quedan a medio camino — el contenido termina en su estado final.
- **Scroll hacia arriba:** al volver a subir, las animaciones de entrada no se reinician
  (no hay parpadeo); la línea de "Cómo funciona", al estar atada al scroll, sí acompaña
  el retroceso de forma natural.
- **Pantallas muy angostas:** el panel flotante de ingresos hoy está oculto en mobile; su
  animación no debe forzar su aparición ni alterar el layout existente.
- **Pestaña en segundo plano:** las animaciones cíclicas (la notificación) no se acumulan
  ni disparan una ráfaga al volver a la pestaña.
- **Dispositivos táctiles:** el efecto que sigue al puntero no aplica; su ausencia no deja
  el visual en un estado intermedio.
- **JavaScript deshabilitado o aún no cargado:** el contenido de las tres secciones es
  legible y completo (los textos y números finales están en el marcado, no se generan por
  animación).

## Functional Requirements

### Must Have (MVP)

- **FR-001**: El visual del hero debe transmitir profundidad durante el scroll: sus capas
  (panel principal, panel flotante de ingresos, halo de fondo) se desplazan a distinta
  velocidad entre sí.
- **FR-002**: El gráfico de barras del hero debe dibujarse — las barras crecen desde cero
  en cascada — la primera vez que el hero entra en pantalla.
- **FR-003**: Los dos indicadores numéricos del hero deben contar desde cero hasta su
  valor final una única vez, conservando exactamente los valores actuales (24 turnos, 82%).
- **FR-004**: El hero debe mostrar de forma cíclica una notificación de turno nuevo que
  entra, permanece y se retira, sin desplazar ni alterar el resto del contenido.
- **FR-005**: En "Cómo funciona", la línea que conecta los tres pasos debe trazarse en
  función del progreso de scroll de la sección (avanza y retrocede con el scroll), no como
  una animación de duración fija.
- **FR-006**: En "Cómo funciona", cada uno de los tres pasos debe pasar a un estado
  "encendido" cuando el trazado de la línea lo alcanza, en secuencia.
- **FR-007**: En Stats, las cuatro tarjetas deben entrar de forma escalonada al aparecer en
  pantalla, con un realce breve de su ícono.
- **FR-008**: Con la preferencia de movimiento reducido activada, toda la home debe
  presentarse en su estado final sin animación ni desplazamiento.
- **FR-009**: Ninguna animación debe provocar desplazamientos de contenido (layout shift)
  ni alterar el diseño, el copy o la jerarquía visual actuales de las tres secciones.
- **FR-010**: El efecto que responde al puntero debe aplicar solo donde hay puntero fino
  (desktop) y estar ausente en dispositivos táctiles, sin dejar estados intermedios.

### Should Have

- **FR-101**: Las animaciones de entrada de cada sección se disparan una sola vez y no se
  reinician al volver a scrollear sobre ellas.
- **FR-102**: Las animaciones cíclicas se pausan cuando la sección no está visible o la
  pestaña está en segundo plano, y se reanudan sin ráfagas acumuladas.
- **FR-103**: El horario que muestra la notificación de turno varía entre repeticiones, para
  no leerse como una imagen congelada.

### Won't Have (out of scope)

- Cambios de copy, precios, orden de secciones o estructura de la home.
- Animaciones en las otras ocho secciones de la home (ROI, Qué es, Testimonios, Personas,
  Comparación, Product Gate, FAQ, Contacto).
- Cualquier cambio en las landings públicas de barbería (`/[slug]`), el flujo de reserva o
  el panel admin.
- Efectos de "sección fija" (pinning/scrub de pantalla completa) — se evaluaron y se
  descartaron por costo en mobile.
- Nuevas dependencias, tokens de diseño nuevos o rediseño del sistema visual.
- Sonido, video o modelos 3D.

## Success Criteria

- **SC-001**: Un visitante que llega al hero identifica que el producto muestra turnos
  reales en movimiento sin necesidad de interactuar — la escena se activa sola dentro de
  los primeros segundos.
- **SC-002**: El recorrido completo de la home en un celular de gama media se percibe
  fluido, sin tirones perceptibles ni saltos de contenido.
- **SC-003**: Con movimiento reducido activado, el 100% de la información visible sin
  animaciones es idéntica a la que ve un visitante con animaciones completas.
- **SC-004**: Las tres secciones conservan intactos su copy, su estructura y su jerarquía
  visual: la única diferencia observable respecto de hoy es el movimiento.
- **SC-005**: El proyecto compila y pasa sus verificaciones de calidad sin errores nuevos.

## Assumptions

- **Se mantiene el contenido actual de Stats** (cuatro beneficios en palabras, no métricas):
  ya fue una decisión de producto anterior, vende mejor que números sin contexto y no se
  revisa en esta feature.
- **Los valores del hero siguen siendo ilustrativos** (24 turnos, 82%, $284.500): son una
  demo del producto, no datos reales; la feature anima esos mismos valores.
- **La frecuencia de la notificación ronda los 6 segundos**: suficiente para que se note sin
  volverse molesta ni distraer del CTA.
- **El movimiento es sutil por defecto**: desplazamientos de pocos píxeles y duraciones
  cortas, coherentes con la estética premium/sobria de la marca. Ante la duda, menos.
- **La verificación final es manual en dispositivo real** además de las verificaciones
  automáticas: el movimiento se juzga mirándolo.

## Dependencies

- Sistema de diseño existente de TijerApp (tokens de color gold/negro, `card-premium`,
  utilidades de animación ya definidas).
- Componente de revelado por viewport ya existente en la home.
- Biblioteca de animación ya presente en el proyecto — no se incorporan dependencias nuevas.
- Las tres secciones objetivo ya existen y se mantienen: Hero (con su showcase), Stats y
  "Cómo funciona".

## Next Steps

- Run **speckit-plan** to design the implementation
