# Tasks: 033 cierre automático del día y pedido de reseña

- [x] T1 `src/lib/cierre-del-dia.ts` + `scripts/test-cierre-del-dia.ts` (y sumarlo a `test:unit`)
- [x] T2 `src/lib/server/review-request-email.ts`
- [x] T3 `GET /api/cron/cierre` (cerrar + reseñas, `dryRun`, `force`)
- [x] T4 Migración `reminder_log.kind` + `'review_request'`
- [x] T5 `.github/workflows/cierre-cron.yml`
- [x] T6 tsc + lint + test:unit + build
- [x] T7 `dryRun` contra prod y comparar con lo medido (233 / 216 / 0 con seña)
- [x] T8 Deploy, corrida real del cierre, verificar pendientes pasados = 0
- [x] T9 PENDIENTES.md: migración para correr y qué mirar

## Verificación hecha (04/10/2026)

- **Prueba en seco contra prod** (workflow con `dryRun=true&force=true`): 233
  encontrados, 0 con seña impaga, 233 a cerrar (`barber` 216, `primebarber` 10,
  `leocuts` 5, `kekasbarber` 1, `gino-barber` 1). Idéntico a lo medido antes
  con una consulta aparte. Reseñas: 3 candidatos de ayer, los 3 de `barber`.
- **Corrida real**: `cerrados: 233`. Consulta posterior a la base: 0 pendientes
  con fecha pasada, 233 con autor "Cierre automático", 47 pendientes de hoy en
  adelante sin tocar. `barber`, últimos 30 días: 195 confirmados de 198.
- **Sin verificar**: el mail de reseña no se mandó todavía (corrió a las 16 h,
  fuera de la ventana, y falta la migración). El texto y el envío están
  cubiertos por tipos y por el mismo patrón que el mail de recuperar contraseña,
  pero nadie lo vio llegar.
