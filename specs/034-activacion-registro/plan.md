# Plan: Activación de barberías recién registradas

**Spec**: [spec.md](./spec.md) · **Fecha**: 2026-10-04 · **Migración**: una tabla nueva (la corre Bautista).

## Piezas

1. **`src/lib/activacion.ts`** (puro, con tests): cuántos días lleva una barbería, qué paso
   le toca (`dia_1` / `dia_3` / `dia_7` / nada) y los textos para compartir (bio de
   Instagram, mensaje de WhatsApp), que usan tanto la pantalla como los mails.
2. **`src/lib/server/activation-emails.ts`**: bienvenida, los tres pasos y el aviso al
   fundador. Resend con `X-Entity-Ref-ID` único.
3. **Registro** (`/api/registro`): suma la bienvenida al `after()` que ya manda el aviso
   interno. No demora la respuesta.
4. **`GET /api/cron/activacion`** + `activacion-cron.yml` (cada hora, minuto 25; manda solo
   entre las 10 y las 13). `?dryRun=true` informa sin mandar.
5. **Pantalla "Compartir"** (`/[slug]/admin/compartir`, subpestaña de "Mi barbería"): link,
   QR, textos con botón de copiar e "Imprimir cartel". QR con `qrcode-generator`
   (sin dependencias propias), dibujado como SVG para que imprima nítido.
6. **Migración** `barbershop_activation_log`.

## Decisiones

- **La serie solo corre para barberías que recibieron la bienvenida.** El renglón
  `bienvenida` lo escribe únicamente el registro. Con eso, sin agregar ninguna columna:
  las barberías creadas a mano desde `/owner` quedan afuera, y **las que ya existen hoy
  también** — nadie recibe "compartí tu link" tres meses tarde el día del deploy.
- **Reclamar antes de mandar**, igual que en la 033: el renglón se inserta primero y el
  índice único `(barbería, paso)` impide el doble envío. Sin la tabla (migración sin
  correr) el insert falla y no sale nada.
- **Se manda el paso más avanzado que corresponda**, no una cola: si el cron no corrió,
  al día 4 sale el del día 3 y el del día 1 se pierde, a propósito.
- **El aviso al fundador es un paso más del registro** (`aviso_fundador`), con su propio
  renglón: si el mail al barbero falla, el aviso igual sale, y al revés.

## Riesgos

- **Mandarle mails a barberías viejas**: cubierto por la regla de la bienvenida.
- **Cron local contra prod**: `dryRun` por defecto al dispararlo a mano.
- **La pantalla nueva es UI del panel**: sigue el look vigente (tarjetas, degradé dorado,
  negro). Bautista la mira en prod; es una pantalla suelta, no cambia ninguna existente.

## Verificación

- Tests de las funciones puras.
- `dryRun` contra prod: tiene que devolver 0 barberías (ninguna tiene bienvenida todavía).
- La pantalla, en local con datos fijos: QR escaneable, copiar, vista de impresión.
