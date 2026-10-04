# Tasks: 034 activación de barberías recién registradas

- [x] T1 `src/lib/activacion.ts` + `scripts/test-activacion.ts` (sumarlo a `test:unit`)
- [x] T2 Migración `barbershop_activation_log`
- [x] T3 `src/lib/server/activation-emails.ts` (bienvenida, día 1/3/7, aviso al fundador)
- [x] T4 Bienvenida en `/api/registro`
- [x] T5 `GET /api/cron/activacion` + workflow
- [x] T6 Pantalla "Compartir" (link, QR, textos, cartel imprimible) + subpestaña + link desde Primeros pasos
- [x] T7 tsc + lint + test:unit + build
- [x] T8 QA visual de "Compartir" en local (QR, copiar, impresión)
- [ ] T9 Deploy + `dryRun` en prod
- [x] T10 PENDIENTES.md

## Verificación hecha (04/10/2026)

- Tests: 30 de `activacion` (qué paso toca, qué corta la serie, textos).
- Pantalla "Compartir" en local con datos fijos: escritorio y 375 px, sin
  desborde horizontal y sin controles de menos de 44 px.
- Cartel: activando las reglas de impresión en el navegador se ve solo el
  cartel (nombre, título, QR, link) y nada del panel. Edge headless generó el
  PDF de una página.
- **Sin verificar**: nadie escaneó el QR con un celular (sale de una librería
  estándar, pero no lo probé); ningún mail de la serie salió todavía (falta la
  migración y que alguien se registre).
