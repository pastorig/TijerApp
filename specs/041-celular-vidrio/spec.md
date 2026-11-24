# Specification: TijerApp en el celular con vidrio ("Noche dorada")

**Branch**: `041-celular-vidrio` (una rama/PR por tanda)
**Created**: 2026-11-24
**Status**: Draft — dirección elegida, falta aprobar la spec
**Input**: Bautista (24/11/2026): "me gustaría hacer un rebranding en mobile… liquid glass, ventanas
flotantes, transparencias, fumados… recluta todos los últimos cambios que metimos en estas SaaS y
traigámoslos a TijerApp".

## Decisiones ya tomadas (24/11)

| Tema | Decisión |
|---|---|
| Dirección | **B · Noche dorada** (`maquetas/celular-b.png`): luces doradas difuminadas detrás del vidrio, encabezados y ventanas con tono dorado |
| Alcance | Panel del dueño, agenda del empleado, reserva del cliente, landing y login. **Solo celular**: la compu no cambia |
| Navegación del panel | **Barra flotante abajo**: Inicio · Turnero · ＋ (turno nuevo) · Clientes · Más. Reemplaza la hamburguesa en el celular |
| Paleta | Negro + dorado de siempre, botones dorados con degradé. Sin colores nuevos de marca |
| Modo claro | No: TijerApp es oscura |
| Panel owner (`/owner`) | Fuera de alcance |

## De dónde sale cada cosa

| Pieza | Origen | Se trae |
|---|---|---|
| Receta de vidrio oscuro (reflejo + borde de luz + base negra semitransparente) | Web de Solvian | Tal cual, con negro y dorado en vez de verde |
| Desenfoque más liviano en celulares y equipos flojos | Web de Solvian | Tal cual |
| Barra de abajo con pastilla que se desliza, "Más" que crece desde la barra | Dentidad (#327/#328) | La mecánica, con estilo B |
| `Ventana` (se baja con el dedo, salida animada, pila de Escape) | Dentidad (#328) | La mecánica |
| `Interruptor` (selector de 2–4 opciones que se desliza) | Dentidad (#328) | La mecánica |
| Arreglo del iPhone instalado (franja de abajo, scroll dentro del panel) | Dentidad (6 PRs) | Tal cual |
| Curvas, achique al apretar, aviso con barra de progreso | EstetiApp | Tal cual |

## User Scenarios & Testing

### Primary User Story

Leo abre TijerApp desde el ícono del iPhone entre corte y corte: ve sus turnos sobre un fondo negro
con luces doradas, cambia de sección con el pulgar desde la barra de abajo, toca un turno y se abre
una ventana que cierra bajándola con el dedo.

### Acceptance Scenarios

1. **Given** el dueño en el celular, **When** abre el panel, **Then** ve la barra flotante abajo
   (Inicio, Turnero, ＋, Clientes, Más) y no ve la hamburguesa ni el menú lateral.
2. **Given** la barra de abajo, **When** toca "Más", **Then** la misma barra crece hacia arriba con el
   resto de las secciones (las que su plan permite), y se cierra bajándola con el dedo, con Escape o
   eligiendo una sección.
3. **Given** cualquier ventana del celular (turno, turno nuevo, bloquear horario, confirmar, etc.),
   **When** la arrastra hacia abajo más de un tramo o con un gesto rápido, **Then** se cierra; si el
   arrastre es corto, vuelve a su lugar.
4. **Given** un selector de pocas opciones (barbero, vista, filtros), **When** elige otra, **Then** la
   pastilla dorada se desliza a esa opción.
5. **Given** TijerApp instalada en un iPhone, **When** se abre desde el ícono, **Then** no queda
   ninguna franja vacía abajo, la barra queda pegada al borde y nada la tapa.
6. **Given** el empleado en `/mi-agenda`, **When** abre su agenda, **Then** ve el mismo lenguaje (vidrio,
   ventanas que se bajan) con solo lo que sus permisos habilitan.
7. **Given** un cliente en la reserva desde el celular, **When** saca un turno, **Then** el recorrido es
   el mismo de hoy, con el estilo nuevo, y ningún paso queda tapado por elementos flotantes.
8. **Given** cualquier pantalla en la compu (≥ 768 px), **When** se compara con hoy, **Then** no cambió.

### Edge Cases

- Celular con "Reducir transparencia" o navegador sin desenfoque: el vidrio pasa a negro sólido
  legible.
- "Reducir movimiento": sin rebotes ni estirones; las ventanas solo aparecen y desaparecen.
- Celular flojo: el desenfoque baja solo para que el scroll no se trabe.
- Celular acostado: la barra no tapa el contenido.
- Teclado abierto en una ventana: el campo activo queda visible y la ventana no se cierra al
  arrastrar desde un campo.
- Modo lectura (plan vencido): la barra y las ventanas respetan lo que hoy se bloquea.
- Una sección del panel que no está en la barra (ej. Cupones) queda marcada en "Más".
- Navegador de Instagram/Facebook en la reserva: todo funciona igual (lo usan los clientes).

## Functional Requirements

### Must Have (MVP)

- **FR-001**: Material de vidrio único (variables + clases) con la receta "Noche dorada"; ningún
  color fijo nuevo fuera de esas variables.
- **FR-002**: Fondo con luces doradas difuminadas en las pantallas del celular; nunca como fondo fijo
  (`background-attachment: fixed`), por el iPhone.
- **FR-003**: Barra flotante abajo en el panel del dueño (celular): 4 accesos + ＋, pastilla que se
  desliza, "Más" que crece con las secciones que su plan habilita.
- **FR-004**: `Ventana` como única forma de abrir ventanas en el celular; las 20+ ventanas actuales del
  panel, la agenda del empleado y la reserva pasan a usarla.
- **FR-005**: `Interruptor` para selectores de 2 a 4 opciones.
- **FR-006**: Arreglo del iPhone instalado (scroll dentro del panel, nada fijo pegado abajo sin
  compensar, franja de estado).
- **FR-007**: Respaldos: sin desenfoque → sólido; reducir transparencia → sólido; reducir
  movimiento → sin animaciones.
- **FR-008**: Desenfoque más liviano en celulares y automático en equipos flojos.
- **FR-009**: Agenda del empleado, reserva del cliente, landing y login con el mismo lenguaje en el
  celular.
- **FR-010**: Nada cambia por encima de 767 px.
- **FR-011**: Toques de 44 px como mínimo; textos legibles (contraste AA) sobre el vidrio.

### Should Have

- **FR-101**: Deslizar el dedo por la barra elige la sección (como iOS 26).
- **FR-102**: Avisos (toasts) de vidrio con barra de progreso.

### Won't Have (out of scope)

- Panel owner (`/owner`).
- Modo claro.
- Cambios en la compu.
- Cambios de funcionalidad: solo cambia cómo se ve y se maneja en el celular.

## Entrega por tandas (una PR por tanda, con preview que Bautista mira logueado ANTES de mergear)

1. **Base + Inicio del dueño**: material, fondo, iPhone, barra de abajo con Más y ＋, Inicio.
2. **Turnero + `Ventana` + `Interruptor`**: lista y calendario del celular + ventanas de turno
   (editar, nuevo, mover, cancelar, duplicar, bloquear). Los dos componentes entran con la primera
   pantalla que los usa.
3. **Clientes y fidelización**: Clientes, Reseñas, Fidelización, Cupones, Recordatorios, Lista de
   espera.
4. **Caja, equipo y mi barbería**: Reportes, Cierre, Cobros, Barberos, Equipo, Galería, Productos,
   Configuración, Compartir.
5. **Agenda del empleado** (`/mi-agenda`).
6. **Reserva del cliente** (`/[barbería]`, `/reservar`, link del turno).
7. **Landing y login**.

## Success Criteria

- **SC-001**: Bautista aprueba cada tanda mirando la preview en su iPhone antes del merge.
- **SC-002**: En el iPhone instalado no aparece ninguna franja vacía y nada queda tapado (prueba
  automática + iPhone real).
- **SC-003**: El scroll del Turnero en un celular de gama media no se traba (menos del 5 % de cuadros
  lentos medidos).
- **SC-004**: Ninguna reserva menos por el cambio: la conversión de la reserva en el celular se
  mantiene o mejora las 2 semanas siguientes a la tanda 6.
- **SC-005**: Ninguna pantalla de la compu cambia (comparación de capturas a 1280 px).

## Assumptions

- Excepción a la constitución §3 ("sin glows ni gradientes"): las luces doradas difuminadas y el
  reflejo del vidrio son el pedido explícito de Bautista; se documenta en el plan como excepción.
- El ＋ de la barra abre "Turno nuevo" (el mismo modal de hoy, como `Ventana`).
- Las secciones de la barra (Inicio, Turnero, Clientes) son las que más se usan; si los datos de uso
  dicen otra cosa, se ajusta en el plan.

## Dependencies

- Inventarios de Dentidad (worktree `C:\Users\Pastori\dentidad-wt\base`, `specs/rediseno-celular-vidrio`,
  `docs/vidrio.md`) y de la web de Solvian (`muestra/liquid/pagina.html`).
- Maquetas: `maquetas/celular.html` (`?v=b`), `maquetas/celular-b.png`.

## Next Steps

- Bautista aprueba esta spec → **speckit-plan** con la guía `docs/design-system-vidrio.md`.
