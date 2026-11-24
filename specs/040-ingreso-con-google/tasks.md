# Tasks: 040 Ingresar con Google

Orden por dependencias. [P] = se puede hacer en paralelo con la anterior.

## Fase 1 — Base

- [x] T003 `src/lib/navegador-embebido.ts` + `scripts/test-navegador-embebido.ts` (UAs reales).
- [x] T004 [P] `src/lib/google-signin.ts`: script de GIS, nonce (crudo + SHA-256), `entrarConTokenDeGoogle`.
- [x] T005 [P] `src/lib/destino-post-login.ts`: decisión pura (`decidirDestino`) + wrapper que consulta accesos; test en `scripts/test-destino-post-login.ts`.

## Fase 2 — Pantallas

- [x] T006 `src/components/auth/GoogleSignInButton.tsx` (botón oficial oscuro, estados, aviso de navegador embebido con "Copiar link", sin botón si falta `NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
- [x] T007 `GlobalLoginForm`: botón + separador; mail y Google usan `destino-post-login` (sin cambiar el comportamiento actual).
- [x] T008 `AdminLoginForm`: botón; misma regla de la barbería de la URL; alta pendiente → `/registro/completar`.
- [x] T009 `RegisterForm`: "Registrarme con Google" arriba.

## Fase 3 — Alta con Google

- [x] T010 `src/lib/server/alta-self-serve.ts`: lo compartido entre `/api/registro` y el alta con Google (slugs reservados, provisión, avisos). `/api/registro` pasa a usarlo sin cambiar su respuesta.
- [x] T011 `POST /api/registro/google` (contrato en contracts/).
- [x] T012 `/registro/completar` + `CompletarRegistroForm`.

## Fase 4 — Páginas legales

- [x] T013 `/privacidad` y `/terminos` estáticas, texto real y corto; sumarlas al sitemap y al pie.

## Fase 5 — Verificación

- [x] T014 `npx eslint src scripts`, `npm run test:unit`, `npm run build`.
- [ ] T015 Local (`localhost:3000`, origen autorizado): cuenta de prueba creada con mail+clave → Google con el mismo mail → mismo `user.id` (T002 de la spec).
- [x] T016 Local: Gmail nuevo → completar → barbería creada → borrarla.
- [x] T017 390 px: botón y aviso sin tapar nada.
- [ ] T018 Merge a `main` (un solo push) y en prod: iPhone con la app instalada (T001), Android instalada, link desde Instagram.
- [ ] T019 Si T001 falla: plan B por redirección solo en iOS instalado.
- [ ] T020 Bautista: cargar `/privacidad` y `/terminos` en Google y publicar la app.
