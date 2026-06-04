# Quickstart: Push Notifications

**Feature**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

Pasos para correr la feature localmente y verificar end-to-end.

## Pre-requisitos

- Node 18+ instalado
- Supabase CLI loggeado y linkeado al proyecto (`npm run supabase:link`)
- Vercel CLI o acceso al dashboard para agregar env vars
- Browser Chrome/Brave/Edge (Firefox también sirve)

## 1. Generar VAPID keys (one-time)

```bash
node scripts/generate-vapid-keys.mjs
```

Output esperado:
```
✓ VAPID keys generated. Add to your .env.local and Vercel:

NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHzg... (base64-url, public)
VAPID_PRIVATE_KEY=Tx9k... (base64-url, KEEP SECRET)
VAPID_SUBJECT=mailto:bau.pastori@gmail.com
```

Copialas a:
- `.env.local` (todas las 3)
- Vercel dashboard → Settings → Environment Variables (todas las 3, scope Production+Preview)

> ⚠️ NUNCA commitees el private key al repo. Está en `.env.local` que está gitignored.

## 2. Generar un secret para el webhook

```bash
openssl rand -base64 32
# Output ejemplo: aB3kJ7nP2qR9xY4mL6wQ8eS5tF1zG0vH...
```

Agregar a:
- `.env.local` como `SUPABASE_WEBHOOK_SECRET=...`
- Vercel env vars como `SUPABASE_WEBHOOK_SECRET=...`

## 3. Aplicar la migration

```bash
npm run supabase:db:push
```

Verifica que la migration `20260604100000_push_notifications.sql` se aplicó:
- `push_subscriptions` table existe
- `push_notification_queue` table existe
- Trigger `trg_enqueue_push_for_appointment` activo en `appointments`

## 4. Configurar Supabase Database Webhook (manual, una vez)

Esto NO se puede automatizar en migration. Pasos:

1. Andá a Supabase Dashboard → tu proyecto → **Database** → **Webhooks**
2. Click **Create a new hook**
3. Llenar:
   - **Name**: `push-queue-processor`
   - **Table**: `push_notification_queue`
   - **Events**: ☑ Insert (solo)
   - **HTTP method**: POST
   - **URL**: `https://tijerapp.vercel.app/api/push/send-from-queue` (o tu URL de preview)
   - **HTTP Headers**:
     - `Authorization`: `Bearer <SUPABASE_WEBHOOK_SECRET>` (el que generaste en paso 2)
     - `Content-Type`: `application/json`
4. Click **Create webhook**

> Para desarrollo local: podés usar ngrok o un tunnel para exponer localhost:3000 y apuntar el webhook ahí temporalmente. O probar solo via prod deploy.

## 5. Configurar GitHub Actions cleanup

El workflow `.github/workflows/push-cleanup.yml` ya está en el repo. Verificá que:
- El secret `CRON_SECRET` está en GitHub Settings → Secrets and variables → Actions
- (Si no está) generar uno con `openssl rand -base64 32` y agregarlo

## 6. Build y deploy

```bash
npm run build
```

Si pasa, push a main → Vercel deploya automático.

## 7. Smoke tests (en producción / preview)

### A. Subscribe flow

1. Logueate como admin de SV Barber en tu mobile (Brave Android o Chrome iOS con la PWA instalada)
2. Andá a `/sv-barber/admin/settings`
3. Buscá el card **"Notificaciones push"**
4. Estado inicial debería ser uno de:
   - **"Activar notificaciones"** (botón gold) — caso normal
   - **"Tu browser no soporta..."** — si estás en un browser viejo
   - **"Instalá la PWA primero"** — si estás en iOS sin PWA agregada
5. Click "Activar" → browser pide permiso → aceptá
6. Estado cambia a **"Notificaciones activas en este dispositivo"**

Verificación DB:
```sql
select id, barbershop_slug, user_id, created_at
from push_subscriptions
where user_id = auth.uid();
```
Debería ver 1 row.

### B. Test notification (FR-104)

1. En el mismo card, click **"Mandar notif de prueba"**
2. Dentro de 5 segundos deberías recibir una notif en tu device:
   - Título: "Prueba TijerApp"
   - Body: "Las notificaciones están funcionando ✓"
3. Tap → debería abrir la PWA en `/[slug]/admin`

### C. End-to-end real

1. Mantené la admin tab abierta o el panel cerrado, no importa
2. Desde otra ventana incógnita, andá a `/sv-barber/reservar`
3. Completá una reserva real (cliente test, teléfono `1100000000`)
4. Dentro de **5-10 segundos**, tu mobile debería vibrar con:
   - Título: "Nueva reserva"
   - Body: "Cliente Test · 18:30 con Carlos"
5. Tap → abre `/sv-barber/admin/turnero`

Verificación DB:
```sql
select status, payload, sent_at, retry_count
from push_notification_queue
order by created_at desc limit 5;
```
Debería ver el item con `status='sent'`.

### D. Multi-device

1. Activá notifs también desde tu desktop Chrome con misma cuenta admin
2. Hacé otra reserva
3. Ambos devices reciben

### E. Cross-tenant aislamiento

1. Logueate como admin de AG Barber en otro browser
2. Activá notifs ahí
3. Crear reserva en SV Barber
4. Verificar que AG Barber admin **NO** recibe la notif

### F. Unsubscribe

1. En settings, click **"Desactivar"**
2. Verificar que la row de `push_subscriptions` se borró
3. Hacer otra reserva → no recibís nada en ese device

## 8. Verificar GitHub Actions cleanup

Después de la primera hora, andá a GitHub → Actions → workflow `push-cleanup` y verificá que corrió exitoso. El log debería decir algo como:
```
✓ Processed 0 stuck items
✓ Expired 0 items
✓ Deleted 0 old items
```

## Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| "Tu browser no soporta..." en Chrome moderno | `PushManager` no detectado | Verificar que estás en HTTPS (no http://). Localhost también funciona |
| Activé permisos pero subscription falla | VAPID_PUBLIC_KEY mal copiada | Re-verificar env var en Vercel. Re-deploy |
| Test funciona pero reserva real no | Webhook mal configurado en Supabase | Re-verificar URL y Authorization header |
| Recibo notifs duplicadas | Trigger se ejecutó 2 veces (re-insert?) | Verificar que el `tag` del payload es único — Chrome debería deduplificar por tag |
| 410 Gone errors en logs | Subscriptions viejas inválidas | Normal — el cleanup las marca como invalid automáticamente |
| iOS no recibe ninguna notif | PWA no instalada o no es Safari ≥16.4 | Verificar: agregaste a inicio? iOS version? |
| Vercel function timeout en webhook | Procesando muchos items | Verificar que solo procesamos 1 item por webhook call (no batches) |
