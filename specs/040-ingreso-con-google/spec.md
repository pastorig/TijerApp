# Specification: Ingresar con Google al panel

**Branch**: `040-ingreso-con-google`
**Created**: 2026-11-23
**Status**: En producción (23/11/2026), probado con Bautista el 24/11
**Input**: Bautista (23/11/2026): "me gustaría agregar que puedan ingresar con google o facebook".
Decisión: solo Google. Facebook queda afuera (revisión de Meta, cuentas sin mail, casi nadie que
tenga Facebook y no Google).

## Contexto

Hoy al panel se entra solo con mail y clave, desde tres lugares:

| Pantalla | Quién la usa |
|---|---|
| `/login` | dueños y empleados (después elige a dónde va) |
| `/[barbería]/admin/login` | dueños y empleados de esa barbería |
| `/registro` | barbero nuevo: nombre de la barbería, su nombre, WhatsApp, mail y clave → prueba de 14 días |

Los empleados tienen cuenta propia creada desde el panel del dueño (Equipo), identificada por su mail.
Los clientes reservan sin cuenta y eso no cambia.

## User Scenarios & Testing

### Primary User Story

Un barbero que usa Gmail en el celular toca "Continuar con Google" y entra a su panel sin escribir
ni recordar ninguna clave. Si todavía no tiene barbería, la crea en un paso corto y arranca la prueba.

### Acceptance Scenarios

1. **Given** un dueño que se registró con mail y clave usando `leo@gmail.com`, **When** toca
   "Continuar con Google" y elige esa misma cuenta de Google, **Then** entra a su barbería de
   siempre, con todos sus datos; no se crea una cuenta nueva.
2. **Given** alguien sin cuenta en TijerApp, **When** toca "Continuar con Google" en `/registro`
   (o en `/login`), **Then** ve un paso para completar nombre de la barbería, su nombre y WhatsApp
   (el mail ya viene de Google), y al confirmar entra al panel con la prueba de 14 días, igual que el
   registro de hoy.
3. **Given** un empleado al que el dueño dio de alta con `santi.barbero@gmail.com`, **When** entra
   con Google con ese mail, **Then** llega a su agenda (`/[barbería]/mi-agenda`) con los mismos
   permisos que tenía.
4. **Given** alguien que abrió el login desde el navegador de Instagram, WhatsApp o Facebook,
   **When** ve la pantalla de ingreso, **Then** el botón de Google le explica que tiene que abrir la
   página en Chrome o Safari y le ofrece copiar el link; nunca lo deja llegar a la pantalla de error
   de Google.
5. **Given** un dueño con TijerApp instalada en la pantalla de inicio del iPhone, **When** entra con
   Google, **Then** termina dentro de la app instalada con la sesión iniciada (o, si iOS lo abre en
   Safari, con un aviso claro de cómo volver), sin quedar en un loop de login.
6. **Given** un dueño que entró con Google y nunca tuvo clave, **When** quiere entrar desde otra
   computadora sin Google, **Then** puede crear una clave con "Olvidé mi contraseña" con su mail.

### Edge Cases

- Cuenta de Google con un mail que **no** coincide con ninguna cuenta y el usuario estaba en
  `/login` (no en registro): se le ofrece crear su barbería, con la opción "Ya tengo cuenta con otro
  mail" que lo vuelve al login.
- Mail de Google sin verificar (raro, cuentas de Google Workspace mal configuradas): no se une a
  una cuenta existente; se rechaza con un mensaje claro.
- El usuario cancela en la pantalla de Google: vuelve al login sin error rojo.
- El usuario cierra el paso de "crear barbería" a la mitad: la próxima vez que entra con Google,
  vuelve a ese paso; no queda una cuenta colgada que lo deje en un panel vacío.
- Alguien que es dueño de una barbería y empleado de otra: el mismo comportamiento que hoy después
  del login (elige a dónde ir).
- Barbería en modo lectura (vencida): entrar con Google lleva al mismo estado que con mail y clave.
- El panel owner de la plataforma (`/owner`) **no** ofrece Google: sigue solo con mail y clave.

## Functional Requirements

### Must Have (MVP)

- **FR-001**: `/login`, `/[barbería]/admin/login` y `/registro` muestran "Continuar con Google"
  arriba del formulario de mail y clave, que sigue funcionando igual.
- **FR-002**: Si el mail de Google coincide con una cuenta existente, se entra a esa cuenta. Nunca se
  crea una segunda cuenta para el mismo mail.
- **FR-003**: Después de entrar con Google se aplica exactamente la misma regla de destino que hoy:
  dueño → su panel (o elegir si tiene varias), empleado → su agenda, URL de admin pedida → esa URL
  si tiene acceso.
- **FR-004**: Una persona nueva que entra con Google completa nombre de la barbería, su nombre y
  WhatsApp antes de ver el panel. Se crea la barbería con las mismas reglas del registro actual
  (link derivado del nombre, prueba de 14 días, mail obligatorio para reservar prendido).
- **FR-005**: Hasta que complete ese paso, la cuenta no accede a ningún panel y cada ingreso la
  devuelve a ese paso.
- **FR-006**: En los navegadores dentro de Instagram, WhatsApp y Facebook, el botón no inicia el
  ingreso con Google: muestra "Para entrar con Google abrí esta página en Chrome o Safari" con un
  botón para copiar el link. Mail y clave siguen disponibles ahí.
- **FR-007**: El ingreso con Google funciona desde la app instalada (PWA) en iPhone y Android y
  termina con la sesión iniciada.
- **FR-008**: Si Google devuelve un error o el usuario cancela, vuelve a la pantalla de ingreso con
  un mensaje corto y sin perder lo que había elegido.
- **FR-009**: El panel owner de la plataforma no ofrece ingreso con Google.

### Should Have

- **FR-101**: En el panel, la sección de la cuenta muestra que está vinculada a Google.
- **FR-102**: El registro de alta en el panel owner (`/owner`) marca si la barbería se creó con
  Google, para medir si se usa.

### Won't Have (out of scope)

- Ingreso con Facebook, Apple u otros proveedores.
- Cuentas para clientes de las barberías.
- Desvincular Google o cambiar el mail de la cuenta desde el panel.
- Que el dueño invite empleados "por Google": el alta del empleado sigue siendo por mail.

## Key Entities

- **Cuenta de usuario**: la misma de hoy, identificada por el mail. Puede tener clave, Google o las
  dos formas de entrar.
- **Alta pendiente**: cuenta que entró con Google y todavía no creó su barbería ni es empleado de
  ninguna. Solo puede ver el paso de completar datos.

## Success Criteria

- **SC-001**: Un barbero nuevo con Gmail pasa de tocar "Continuar con Google" a ver su panel en menos
  de 1 minuto.
- **SC-002**: Cero cuentas duplicadas: ningún mail queda con dos cuentas después del lanzamiento.
- **SC-003**: Leo Cuts, SV Barber y Olgiati pueden entrar con Google con su mail actual y ven sus
  datos de siempre.
- **SC-004**: Ningún usuario llega a la pantalla de error de Google por estar en el navegador de
  Instagram/WhatsApp/Facebook.
- **SC-005**: A los 30 días, al menos la mitad de las barberías nuevas se registran con Google.

## Assumptions

- El proveedor de autenticación actual ya soporta Google y une cuentas por mail verificado; si el
  plan técnico muestra que no las une solo, la unión se resuelve del lado de TijerApp (FR-002 no se
  negocia).
- La pantalla de consentimiento de Google muestra "TijerApp" y el logo; la verificación de la
  pantalla por parte de Google no es necesaria porque solo se piden nombre, mail y foto.
- El paso de alta con Google pide los mismos datos que el registro actual menos mail y clave.
- No hace falta migrar a los usuarios actuales: los que quieran usan Google desde el próximo ingreso.

## Dependencies

- **Bautista**: crear el cliente OAuth en Google Cloud (pantalla de consentimiento + credenciales) y
  cargarlo en la configuración de autenticación de Supabase, con las direcciones de vuelta de
  `tijerapp.com`, `www.tijerapp.com` y las de preview. El plan le deja los pasos exactos.
- Las mismas reglas de destino post-login que hoy usan `/login` y `/[barbería]/admin/login`.
- La creación de barbería del registro self-serve (`/api/registro` y provisión).

## Next Steps

- **speckit-plan** para diseñar la implementación (incluye la verificación en iPhone instalado y en
  el navegador de Instagram antes de mergear).
