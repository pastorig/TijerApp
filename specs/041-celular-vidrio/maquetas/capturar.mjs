// Saca las capturas de las dos maquetas: node specs/041-celular-vidrio/maquetas/capturar.mjs
import { chromium } from "file:///C:/Users/Pastori/OneDrive/Desktop/Bautista/OdontoApp/odonto-next/node_modules/playwright/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const aqui = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1340, height: 980 }, deviceScaleFactor: 2 });
for (const v of ["a", "b"]) {
  await page.goto("file:///" + path.join(aqui, "celular.html").replace(/\\/g, "/") + "?v=" + v);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(aqui, `celular-${v}.png`), fullPage: true });
}
await browser.close();
console.log("listo");
