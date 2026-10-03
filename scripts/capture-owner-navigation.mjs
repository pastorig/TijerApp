import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve('src/app/design-preview/owner');
assert.ok(!existsSync(root), 'Preview already exists');
const output = resolve(process.env.CAPTURE_DIR || 'artifacts/owner');
mkdirSync(output, { recursive: true });
mkdirSync(root, { recursive: true });
writeFileSync(resolve(root, 'page.tsx'), `import { notFound } from 'next/navigation';
import { OwnerShell } from '@/components/owner/OwnerShell';
export default function Preview() {
if (process.env.NODE_ENV !== 'development') notFound();
return <OwnerShell><h1 className="text-2xl font-bold">Panel owner</h1><p className="mt-2 text-sm text-neutral-400">Vista de prueba de la navegacion.</p></OwnerShell>;
}`);
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.route('**/*', route => new URL(route.request().url()).hostname === 'localhost' ? route.continue() : route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto((process.env.PREVIEW_URL || 'http://localhost:3001') + '/design-preview/owner');
  const open = page.getByRole('button', { name: 'Abrir menú owner' });
  await open.waitFor();
  await page.screenshot({ path: resolve(output, '20-owner-mobile.png') });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Navegación owner' });
  await dialog.waitFor();
  assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)));
  }
  await page.screenshot({ path: resolve(output, '20-owner-menu.png') });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.ok(await open.evaluate(el => document.activeElement === el));
  for (const width of [360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  await page.screenshot({ path: resolve(output, '20-owner-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await open.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await dialog.waitFor({ state: 'hidden' });
  console.log('Owner navigation: mobile, keyboard, Escape, focus, responsive and resize passed.');
} finally {
  await browser?.close();
  unlinkSync(resolve(root, 'page.tsx'));
  rmdirSync(root);
  rmdirSync(resolve(root, '..'));
}
