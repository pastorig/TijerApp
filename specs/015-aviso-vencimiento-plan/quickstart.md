# Quickstart: probar el aviso sin esperar tres días

## La lógica sola (sin base, sin red)

```bash
npm run test:unit
```

Cubre los bordes: 4 días (nada), 3 días (primer aviso), 1 día (primer aviso si
todavía no se mandó), 0 días (aviso del día), vencido (nada), sin vencimiento
cargado (nada).

## El cartel del panel

El panel no se puede abrir con un navegador headless (no loguea). Para mirar el
cartel se monta el componente fuera del login con una página de andamio
temporal, como se hizo con la guía de primeros pasos:

```
src/app/dev-banner/page.tsx   ← temporal, borrar al terminar
```

Envuelve `PlanStatusBanner` en un `PlanProvider` con `daysToPaidExpire` puesto
a mano (3, 1 y 0) y `paidUntilIso` no nulo, y se le saca una captura con Chrome
headless. **La carpeta no puede empezar con `_`**: el App Router trata esas
carpetas como privadas y la ruta da 404.

## El push, de punta a punta

1. Levantar el dev: `npm run dev -- -p 3010`.
2. Disparar el cron ignorando la ventana horaria:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3010/api/cron/reminders?force=true"
```

3. La respuesta trae `planNotices`, con una entrada por barbería avisada.
4. Correrlo **una segunda vez**: `planNotices` tiene que venir vacío. Eso es
   SC-002 — el índice único hizo su trabajo.

Para forzar el caso sin tocar datos reales, correr el cron con
`?planNoticesDryRun=true`: calcula y reporta a quién le avisaría, sin escribir
en el log ni encolar nada.

## Ojo al probar contra la base de producción

`.env.local` apunta a la base real. Un `force=true` sin `dryRun` le manda el
push de verdad a los barberos que estén en ventana. Al momento de escribir
esto, `leocuts` vence el 21/08: está en ventana.
