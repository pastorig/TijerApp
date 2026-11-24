/**
 * Tests de la detección de navegadores dentro de apps (feature 040): ahí Google
 * no deja iniciar sesión y hay que pedir que abran Chrome o Safari.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-navegador-embebido.ts
 */
import { esNavegadorEmbebido } from "../src/lib/navegador-embebido.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

const UA = {
  instagramIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 356.0.0.30.82 (iPhone14,5; iOS 18_1; es_AR; es; scale=3.00; 1170x2532; 650443451)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.102 Mobile Safari/537.36 Instagram 356.0.0.37.92 Android (34/14; 450dpi; 1080x2209; samsung; SM-A546E; a54x; s5e8835; es_US; 662947412)",
  facebookIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/470.0.0.40.98;FBBV/123;FBDV/iPhone13,2;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBLC/es_LA;FBOP/5]",
  facebookAndroid:
    "Mozilla/5.0 (Linux; Android 13; moto g32 Build/T1SRS33.72-22-4; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/485.0.0.70.77;]",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  safariIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  chromeIphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1",
  chromeWindows:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

check("Instagram en iPhone", esNavegadorEmbebido(UA.instagramIos), true);
check("Instagram en Android", esNavegadorEmbebido(UA.instagramAndroid), true);
check("Facebook en iPhone", esNavegadorEmbebido(UA.facebookIos), true);
check("Facebook en Android", esNavegadorEmbebido(UA.facebookAndroid), true);
check("Chrome en Android: no", esNavegadorEmbebido(UA.chromeAndroid), false);
check("Safari en iPhone: no", esNavegadorEmbebido(UA.safariIphone), false);
check("Chrome en iPhone: no", esNavegadorEmbebido(UA.chromeIphone), false);
check("Chrome en la compu: no", esNavegadorEmbebido(UA.chromeWindows), false);
check("sin user agent: no", esNavegadorEmbebido(""), false);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
