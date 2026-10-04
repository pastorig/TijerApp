# Tasks: 033 cierre automático del día y pedido de reseña

- [x] T1 `src/lib/cierre-del-dia.ts` + `scripts/test-cierre-del-dia.ts` (y sumarlo a `test:unit`)
- [x] T2 `src/lib/server/review-request-email.ts`
- [x] T3 `GET /api/cron/cierre` (cerrar + reseñas, `dryRun`, `force`)
- [x] T4 Migración `reminder_log.kind` + `'review_request'`
- [x] T5 `.github/workflows/cierre-cron.yml`
- [x] T6 tsc + lint + test:unit + build
- [ ] T7 `dryRun` contra prod y comparar con lo medido (233 / 216 / 0 con seña)
- [ ] T8 Deploy, corrida real del cierre, verificar pendientes pasados = 0
- [ ] T9 PENDIENTES.md: migración para correr y qué mirar
