import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { SITE_IDS } from '../src/sites.js';
import { initialData } from '../src/data.js';
const base = process.env.TEST_EXPLORE_URL || 'http://127.0.0.1:8090/MAPA.html';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const errors = [], shaders = [], results = [], visited = [], data = initialData();
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && /Shader Error|WebGLProgram|VALIDATE_STATUS/.test(message.text())) shaders.push(message.text()); });
const root = page.locator('#explore-root');
const state = () => root.evaluate(element => ({ ...element.dataset }));
const distance = (a, b) => Math.hypot(Number(a.x) - Number(b.x), Number(a.z) - Number(b.z));
const poll = fn => expect.poll(fn, { timeout: 90000, intervals: [200, 500, 1000] });
async function report(status, extra = {}) { await writeFile('test-results/explore-browser-report.json', JSON.stringify({ status, base, results, visited, errors, shaders, ...extra }, null, 2)); }
async function check(name, fn) { await fn(); results.push({ name, passed: true }); console.log('PASS', name); await report('running'); }
async function visit(id) {
  if (await page.locator('#details').isVisible()) await page.locator('#close-details').click();
  await page.locator('#explore-catalog').click();
  await page.locator(`#site-list [data-site="${id}"]`).click();
  await poll(async () => (await state()).site).toBe(id);
  await poll(async () => (await state()).renderedSite).toBe(id);
  await expect(page.locator('body')).not.toHaveClass(/list-open/);
}
await mkdir('test-results', { recursive: true });
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await check('the main entry renders a real WebGL scene with the single Emanuel identity', async () => {
    await poll(async () => (await state()).renderedSite).toBe('tomates_oeste');
    await expect(page.locator('script[src]')).toHaveCount(0);
    await expect(page.locator('#view-explore')).toHaveAttribute('aria-pressed', 'true');
    assert.equal((await state()).player, 'emanuel_franco');
    assert.ok(await page.locator('#explore-canvas').evaluate(canvas => Boolean(canvas.getContext('webgl2'))));
    const rect = await page.locator('#explore-canvas').boundingBox();
    assert.ok(Math.abs(rect.y - 72) < 2 && Math.abs(rect.y + rect.height - 900) < 2, '3D canvas fills the viewport below the header');
    await page.screenshot({ path: 'test-results/explore-final-desktop.png' });
  });
  // Rendering on this machine is by software; retain a full-quality screenshot,
  // then use the lightweight setting for behavioral checks across all sites.
  await page.locator('#explore-quality').selectOption('low');
  await check('WASD moves the actual avatar and dragging rotates its third-person camera', async () => {
    const before = await state(); await page.keyboard.down('w');
    try { await poll(async () => distance(await state(), before)).toBeGreaterThan(.3); } finally { await page.keyboard.up('w'); }
    const yaw = Number((await state()).yaw);
    await page.mouse.move(700, 420); await page.mouse.down(); await page.mouse.move(840, 450, { steps: 5 }); await page.mouse.up();
    await poll(async () => Math.abs(Number((await state()).yaw) - yaw)).toBeGreaterThan(.25);
  });
  await check('the information panel pauses walking and excludes Rafael from the general description', async () => {
    await page.locator('#explore-info').click();
    await expect(page.locator('#details h2')).toHaveText('Tomates do Oeste');
    await expect(page.locator('.detail-general')).not.toContainText('Rafael');
    await expect(page.locator('#details .detail-team')).not.toContainText('Rafael');
    const before = await state(); await page.keyboard.down('w'); await page.waitForTimeout(700); await page.keyboard.up('w');
    assert.ok(distance(await state(), before) < .01);
    await page.locator('#close-details').click();
  });
  await check('the original aerial photo and the live local plan are both available from the minimap', async () => {
    await page.locator('#explore-minimap-mode').click(); await expect(page.locator('#explore-plan')).toBeVisible();
    await page.locator('#explore-minimap-mode').click(); await expect(page.locator('#explore-reference-image')).toBeVisible();
    await page.locator('#explore-reference').click(); await expect(page.locator('#photo-dialog')).toBeVisible();
    await expect(page.locator('#photo-title')).toHaveText('Tomates do Oeste'); await page.locator('#photo-close').click();
  });
  await check('aerial overview and Escape pause stop the avatar without changing its identity', async () => {
    await page.locator('#explore-aerial').click(); await poll(async () => (await state()).aerial).toBe('true');
    const before = await state(); await page.keyboard.down('w'); await page.waitForTimeout(500); await page.keyboard.up('w'); assert.ok(distance(await state(), before) < .01);
    await page.locator('#explore-aerial').click(); await page.keyboard.press('Escape'); await expect(page.locator('#explore-pause')).toBeVisible();
    await page.locator('#explore-pause').click(); await poll(async () => (await state()).paused).toBe('false');
  });
  for (const id of SITE_IDS) {
    await check(`3D visit loads ${id} with the appropriate people and corresponding information`, async () => {
      await visit(id); visited.push(id); assert.equal((await state()).player, 'emanuel_franco');
      const people = (await state()).people.split(','); assert.equal(new Set(people).size, people.length);
      assert.equal(people.includes('rafael'), id === 'deusas');
      await page.locator('#explore-info').click(); await expect(page.locator('.detail-general')).not.toContainText('Rafael');
      const name = id === 'sede' ? data.sede.nome : data.exploracoes.find(site => site.id === id).nome;
      await expect(page.locator('#details h2')).toHaveText(name);
      if(id === 'deusas') { await expect(page.locator('#details [data-person-id="rafael"]')).toHaveCount(1); await expect(page.locator('#details')).toContainText('Equipamentos e apoio à construção'); }
      await page.locator('#close-details').click();
      if(['deusas','nutriveg_2'].includes(id)) await page.screenshot({ path: `test-results/explore-final-${id}.png` });
    });
  }
  await check('a vehicle can be approached, entered, moved and safely exited in the integrated view', async () => {
    await page.locator('#explore-fleet-toggle').click(); await page.locator('[data-explore-vehicle="tractor"]').click(); await page.keyboard.press('e');
    await poll(async () => (await state()).driving).toBe('true'); const before = await state();
    await page.keyboard.down('w'); try { await poll(async () => distance(await state(), before)).toBeGreaterThan(.3); } finally { await page.keyboard.up('w'); }
    await page.keyboard.down('Space'); await page.waitForTimeout(1800); await page.keyboard.up('Space'); await page.keyboard.press('e');
    await poll(async () => (await state()).driving).toBe('false');
  });
  await check('the geographic map and 3D visits remain connected in both directions', async () => {
    await page.keyboard.press('m'); await expect(page.locator('#view-map')).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('.farm-pin')).toHaveCount(14);
    await page.locator('#site-list [data-site="greenaura"]').click(); await page.locator('[data-visit-3d="greenaura"]').click();
    await poll(async () => (await state()).renderedSite).toBe('greenaura'); assert.ok((await state()).people.includes('hernani'));
  });
  await check('mobile controls, farm selection and the Deusas-specific Rafael remain usable', async () => {
    await page.setViewportSize({width:390,height:844}); await visit('deusas');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1));
    await expect(page.locator('.explore-touch')).toBeVisible();
    const before = await state(), box = await page.locator('[data-move="forward"]').boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
    try {await poll(async () => distance(await state(),before)).toBeGreaterThan(.15);} finally{await page.mouse.up();}
    assert.ok((await state()).people.includes('rafael'));
    await page.screenshot({path:'test-results/explore-final-mobile.png'});
  });
  assert.equal(errors.length,0,errors.join('\n')); assert.equal(shaders.length,0,shaders.join('\n'));
  await report('passed',{checks:results.length,performance:await page.locator('#explore-performance').textContent()});
  console.log(`${results.length} 3D browser checks passed; 14 rendered scenes; zero JavaScript/shader errors.`);
} catch(error) { await report('failed',{failure:error.stack}); await page.screenshot({path:'test-results/explore-failure.png'}).catch(()=>{}); throw error; }
finally { await browser.close(); }
