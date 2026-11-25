/**
 * Tests del arreglo de la app instalada en el iPhone (feature 041, portado de
 * Dentidad) y del nivel de desenfoque por equipo.
 *
 * Correr: node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/test-ios-standalone-gap.ts
 */
import fs from "node:fs";
import { computeIosStandaloneGap } from "../src/lib/ios-standalone-gap.ts";

let passed = 0;
let failed = 0;
function check(name: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` → esperado ${JSON.stringify(expected)}, obtenido ${JSON.stringify(got)}`}`);
  if (ok) passed++;
  else failed++;
}

check("en una pestaña de Safari no hace nada", computeIosStandaloneGap({ standalone: false, ios: true, fullHeight: 874, innerHeight: 812 }), { panelCorto: false, bajarFijos: 0 });
check("iPhone instalado: modo de la franja aunque todavía no se achicó", computeIosStandaloneGap({ standalone: true, ios: true, fullHeight: 874, innerHeight: 874 }), { panelCorto: true, bajarFijos: 0 });
check("iPhone instalado con la ventana corta (producción, 23/11)", computeIosStandaloneGap({ standalone: true, ios: true, fullHeight: 874, innerHeight: 812 }), { panelCorto: true, bajarFijos: 62 });
check("Android instalado sin diferencia: nada", computeIosStandaloneGap({ standalone: true, ios: false, fullHeight: 800, dynamicHeight: 800, innerHeight: 800 }), { panelCorto: false, bajarFijos: 0 });
check("dos píxeles son redondeo", computeIosStandaloneGap({ standalone: true, fullHeight: 800, innerHeight: 798 }), { panelCorto: false, bajarFijos: 0 });
check("más de 80 px no es la franja", computeIosStandaloneGap({ standalone: true, fullHeight: 900, innerHeight: 700 }), { panelCorto: false, bajarFijos: 0 });

// El nivel del equipo se prueba en test-rendimiento.ts (feature 045).

// Las formas conocidas de volver a traer la franja vacía (Dentidad #319):
// nada con fondo fijo en la app.
const fondosFijos: string[] = [];
function revisar(dir: string) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const ruta = `${dir}/${entrada.name}`;
    if (entrada.isDirectory()) revisar(ruta);
    else if (/\.(tsx?|css)$/.test(entrada.name)) {
      const texto = fs.readFileSync(ruta, "utf8");
      if (/background-attachment:\s*fixed|\bbg-fixed\b/.test(texto)) fondosFijos.push(ruta);
    }
  }
}
revisar("src");
check("ningún fondo fijo (background-attachment: fixed) en src", fondosFijos, []);

const css = fs.readFileSync("src/styles/vidrio.css", "utf8");
check("el panel pasa a 100vh con data-ios-gap", /html\[data-ios-gap\] \.tj-panel\s*\{\s*height:\s*100vh/.test(css), true);

console.log(`\n${passed}/${passed + failed} OK${failed ? ` · ${failed} FALLARON` : ""}`);
if (failed) process.exit(1);
