# PENDIENTES — TijerApp

Tareas manuales (dashboards) que quedan por hacer. El código ya está listo y en producción.

---

## ✅ Hecho (2026-06-25)

- Dominio **tijerapp.com** comprado (DonWeb) + conectado a Vercel (DNS A `@` → 216.198.79.1, CNAME `www` → vercel-dns; `tijerapp.com` principal, `www` redirige). **Valid** ✅.
- Vercel env var **`NEXT_PUBLIC_SITE_URL` = `https://tijerapp.com`** + redeploy.
- Supabase Auth: **Site URL** = `https://tijerapp.com` + Redirect URL `https://tijerapp.com/**`.
- Las 3 features en producción (gateadas): cobro de seña, conectar MercadoPago (OAuth), mensaje de WhatsApp personalizable.

---

## ⏳ TAREA PENDIENTE 1 — Resend (emails reales a clientes)

**Por qué:** hoy los emails están en modo sandbox (solo llegan al mail del founder). Con el dominio propio verificado, los clientes empiezan a recibir recordatorios/confirmaciones de verdad.

**Pasos:**
1. Resend → **Domains → Add Domain** → `tijerapp.com`.
2. Resend te da unos registros DNS (**TXT** para SPF/DKIM, a veces un **MX** o **CNAME** para `send.tijerapp.com`).
3. Cargá esos registros en la **Zona DNS de DonWeb** (mismo lugar donde cargaste el A y el CNAME; tipo TXT/MX/CNAME según diga Resend). TTL 900.
4. En Resend, esperá a que el dominio quede **Verified** ✅.
5. En **Vercel → Environment Variables**, cambiá:
   - `OWNER_NOTIFICATION_FROM` = `TijerApp <hola@tijerapp.com>`
6. **Redeploy** en Vercel.
7. Verificá: reservá un turno con un email distinto al del founder → debería llegar el mail.

> Ojo: NO toques los registros MX existentes si tenés casilla de correo en DonWeb. Los de Resend son aditivos.

---

## ⏳ TAREA PENDIENTE 2 — Activar MercadoPago (botón "Conectar con MP")

**Por qué:** para que los barberos conecten su MP con un clic y cobren señas.

**Pasos:**
1. Crear UNA app de plataforma en MercadoPago (developers panel), producto **Checkout Pro**, URL de tienda vacía.
2. Registrar el redirect URI en esa app: `https://tijerapp.com/api/mp/oauth/callback`.
3. En **Vercel → Environment Variables**, agregar:
   - `MP_CLIENT_ID` = (Client ID de la app)
   - `MP_CLIENT_SECRET` = (Client Secret de la app)
4. Redeploy.
5. Probar: en `/<barberia>/admin/cobros` → botón "Conectar con MercadoPago".

---

## ✅ TAREA 3 — Cron de auto-cancelación de señas (HECHO por Claude)

`/.github/workflows/deposits-cron.yml` creado: dispara `GET /api/cron/deposits` cada hora a los :10 (Bearer `CRON_SECRET`, usa los mismos secrets `CRON_SECRET` + `CRON_BASE_URL` que el cron de reminders). Las señas impagas vencidas se auto-cancelan solas y liberan el horario. **No requiere nada de Bautista** (los secrets ya existen en GitHub).

---

## ✅ TAREA 4 — Recordatorio de pago al cliente (US3, HECHO por Claude)

**Qué hace:** el cron `/api/cron/deposits` ahora, además de expirar, manda un recordatorio de pago (push + email) cuando la seña pasó la mitad de su plazo y sigue impaga. Una sola vez por turno (`reminder_log` kind `deposit_reminder`), con link para pagar. Reusa `sendClientPushForAppointment` + Resend.

**Falta (Bautista):** correr esta migración en Supabase **antes** de activar señas reales (mientras no haya señas activas, el cron no inserta nada, así que es inofensivo si tarda):
```sql
alter table public.reminder_log drop constraint if exists reminder_log_kind_check;
alter table public.reminder_log add constraint reminder_log_kind_check
  check (kind in ('reminder_24h', 'confirmation', 'deposit_reminder'));
```
Después: **una prueba humana con pago real** (activar toggle seña + reservar + pagar) es lo único que queda para dar el cobro de seña por 100% cerrado.

---

## ✅ US4 — Badge de estado de seña en el turnero (HECHO por Claude)

Cada turno en el turnero muestra un chip "Seña pendiente / pagada / vencida / rechazada" según el estado. Solo aparece si la barbería cobra seña.

---

## Diferido (mejoras, no bloquean)

- US3 (recordatorio de pago — ver Tarea Pendiente 4).
- Verificación final del dominio: entrar a `https://tijerapp.com`, reservar un turno y confirmar que el link `/r/...` arranca con `tijerapp.com`; probar "olvidé mi contraseña".
