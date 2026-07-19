/**
 * Tests de la frecuencia con la que se ofrece instalar la PWA (lógica pura).
 * Regla: se muestra en las primeras visitas y después solo cada N días si el
 * usuario lo sigue cerrando sin instalar.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-install-prompt.ts
 */
import {
  FIRST_VISITS,
  REPEAT_DAYS,
  shouldOfferInstall,
} from "../src/lib/pwa/installPromptFrequency.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = got === expected;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${expected}, obtenido ${got}`}`);
  if (ok) passed++;
  else failed++;
}

const NOW = new Date(2026, 6, 20).getTime();
const DAY = 24 * 60 * 60 * 1000;
const base = { lastDismissedAt: 0, dismissedThisSession: false, now: NOW };

// Primeras visitas: siempre se ofrece.
check("visita 1 → se ofrece", shouldOfferInstall({ ...base, visits: 1 }), true);
check(
  `visita ${FIRST_VISITS} (última de las iniciales) → se ofrece`,
  shouldOfferInstall({ ...base, visits: FIRST_VISITS }),
  true,
);
check(
  "en las primeras visitas se ofrece aunque lo haya cerrado antes",
  shouldOfferInstall({ ...base, visits: 2, lastDismissedAt: NOW - DAY }),
  true,
);

// Si lo cerró en esta sesión, no insiste (ni en las primeras visitas).
check(
  "cerrado en esta sesión → no insiste",
  shouldOfferInstall({ ...base, visits: 1, dismissedThisSession: true }),
  false,
);

// Pasadas las visitas iniciales: solo cada REPEAT_DAYS.
const after = FIRST_VISITS + 1;
check(
  "pasadas las iniciales y nunca lo cerró → se ofrece",
  shouldOfferInstall({ ...base, visits: after }),
  true,
);
check(
  `cerrado hace 1 día (< ${REPEAT_DAYS}) → NO se ofrece`,
  shouldOfferInstall({ ...base, visits: after, lastDismissedAt: NOW - DAY }),
  false,
);
check(
  `cerrado hace ${REPEAT_DAYS - 1} días → NO se ofrece`,
  shouldOfferInstall({
    ...base,
    visits: after,
    lastDismissedAt: NOW - (REPEAT_DAYS - 1) * DAY,
  }),
  false,
);
check(
  `cerrado hace exactamente ${REPEAT_DAYS} días → se ofrece de nuevo`,
  shouldOfferInstall({
    ...base,
    visits: after,
    lastDismissedAt: NOW - REPEAT_DAYS * DAY,
  }),
  true,
);
check(
  `cerrado hace ${REPEAT_DAYS + 10} días → se ofrece`,
  shouldOfferInstall({
    ...base,
    visits: after,
    lastDismissedAt: NOW - (REPEAT_DAYS + 10) * DAY,
  }),
  true,
);
check(
  "pasadas las iniciales pero cerrado en esta sesión → no insiste",
  shouldOfferInstall({
    ...base,
    visits: after,
    lastDismissedAt: NOW - 30 * DAY,
    dismissedThisSession: true,
  }),
  false,
);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
