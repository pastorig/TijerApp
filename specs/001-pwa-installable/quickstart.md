# Quickstart: PWA Instalable

**Feature**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

Para devs (vos o futuro contributor) que quieran verificar la implementación localmente.

## Pre-requisitos

- Node ya instalado (Next.js 16 corriendo).
- `npm install` actualizado tras agregar `@serwist/next` y `serwist`.

## 1. Verificar el manifest

```bash
npm run dev
# Abrir http://localhost:3000
```

En DevTools:
- **Application** → **Manifest**: debería listar TijerApp con icons 192 y 512, theme color gold, start_url `/`.
- Si dice "no manifest detected" → revisar que `app/manifest.ts` exporta default un objeto válido.

## 2. Verificar service worker (solo en build prod)

```bash
npm run build
npm start
# Abrir http://localhost:3000
```

En DevTools:
- **Application** → **Service Workers**: debería listar `sw.js` con estado `activated and is running`.
- **Cache Storage**: debería ver `serwist-precache-...` con assets cacheados.
- Si dice "no service worker" → revisar consola por errores. Posibles: HTTPS-only (use `localhost` que sí lo permite).

## 3. Verificar install desktop

En Chrome desktop con `npm start`:
- Mirar la URL bar — debería aparecer un icon ⊕ a la derecha que dice "Instalar TijerApp".
- Click → confirmar. La app se abre en su ventana standalone (sin tabs ni URL bar).

Si NO aparece el ⊕:
- Verificar Lighthouse PWA score: DevTools → Lighthouse → PWA category.
- Comunes: manifest sin `start_url` válido, icons faltantes, no HTTPS (usar localhost).

## 4. Verificar install Android

- Build a Vercel preview, abrir en Chrome Android.
- Menú 3-puntos → "Instalar app" o "Agregar a inicio".
- Debería aparecer el icon TijerApp en el home screen.

## 5. Verificar install iOS

- Build a Vercel preview, abrir en Safari iOS (≥ 16.4).
- Botón Compartir ↑ → "Agregar a inicio".
- Confirmar nombre "TijerApp" + icon correcto.

## 6. Verificar fallback offline

En Chrome con build prod corriendo:
- DevTools → **Network** → check **Offline**.
- Recargar `/sv-barber`.
- Debería redirigir a `/offline` con isotipo + botón Reintentar.
- Volver a poner **Online**, click Reintentar → debería cargar normalmente.

## 7. Verificar last-context routing

1. Navegar `/sv-barber/admin/login`, loguearse, llegar al dashboard.
2. Verificar localStorage en DevTools → **Application** → **Local Storage** → `localhost:3000`:
   - `tijerapp:last_slug` = `"sv-barber"`
   - `tijerapp:last_role` = `"admin"`
3. Cerrar la tab.
4. Abrir la PWA instalada desde el home screen.
5. Debería abrir directo en `/sv-barber/admin` (no en `/`).

## 8. Lighthouse PWA score

```bash
npm run build
npm start
# Lighthouse en DevTools → PWA → Analyze
```

Target: ≥ 90, idealmente ≥ 95.

Si baja:
- Verificar `apple-touch-icon` presente y válido (180×180).
- Verificar `theme_color` consistente entre manifest y `<meta>`.
- Verificar SW cubre `start_url`.

## Troubleshooting común

| Síntoma | Causa probable | Fix |
|---|---|---|
| "No matching service worker found" | SW no se registra en dev | OK — disable en dev por config, solo testear en prod build |
| Install button no aparece en Chrome desktop | beforeinstallprompt event no se disparó | Verificar criterios PWA: HTTPS, valid manifest, SW activo, user engagement |
| Icon se ve pixelado en home screen | PNGs no generados o tamaño insuficiente | Re-correr `pwa-asset-generator` con `--padding 10%` |
| `/offline` muestra HTML viejo | SW cache HTML stale del primer build | Reset SW: DevTools → Application → "Unregister", luego refresh |
| iOS Safari muestra preview ugly | Falta `apple-touch-icon` o `apple-mobile-web-app-capable` meta | Revisar `app/layout.tsx` metadata |
