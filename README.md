# TijerApp

SaaS multi-tenant de turnos para barberías. Cada barbería tiene su slug
público, sus barberos, sus servicios y su panel admin propio.

- **Home comercial** `/` — landing de TijerApp.
- **Página pública de barbería** `/[slug]` — landing del cliente final.
- **Reserva pública** `/[slug]/reservar` — formulario de turno.
- **Panel admin** `/[slug]/admin` — turnero, clientes, configuración.
- **Panel owner** `/owner` — métricas y gestión cross-barbería.

## Stack

- Next.js 16 (App Router + Turbopack)
- React 19, TypeScript, Tailwind CSS v4
- Supabase (RLS estricto + RPCs security definer)
- Resend para emails
- Sentry para error tracking
- Vercel (deploy + cron)

## Desarrollo

```bash
npm install
npm run dev     # localhost:3000
npm run lint
npm run build
```

## Supabase

```bash
npm run supabase:link            # link al proyecto remoto
npm run supabase:migration:list  # ver estado de migrations
npm run supabase:db:push         # aplicar migrations pendientes
```

## Estructura

```
src/
├── app/                  # rutas (App Router)
├── components/           # UI compartida
│   ├── admin/            # panel admin por barbería
│   ├── owner/            # panel owner global
│   ├── home/             # landing comercial
│   └── ui/               # primitivas reusables
├── lib/                  # lógica de negocio + clientes externos
├── data/                 # configuración demo
supabase/migrations/      # migrations SQL idempotentes
```

## Convenciones

- **Slugs en kebab-case** (`sv-barber`, `ag-barber`).
- **Componentes en PascalCase**, archivos `.tsx` mirror del nombre.
- **Mobile-first** obligatorio, admin compacto para uso durante el trabajo.
- **No hardcodear** lógica específica de un cliente (SV Barber es solo demo).
- **Cero secretos en el repo** — todo via env vars en Vercel.

Ver `AGENTS.md` para reglas detalladas del proyecto.
