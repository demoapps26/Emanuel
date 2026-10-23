import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { initialData } from '../src/data.js';
import { createMapSites } from '../src/map-model.js';
import locations from '../dados/localizacoes_maps.json' with { type: 'json' };

const base = process.env.TEST_MAP_BASE_URL || 'http://127.0.0.1:8090/MAPA.html';
const data = initialData(), sites = createMapSites(data);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [], googleRequests = [], results = [], visited = [], imageHashes = {};
const tileObservations = { requested: 0, failed: 0, loaded: 0, initialState: null, forcedFailure: false };
const tileHost = hostname => ['server.arcgisonline.com', 'tile.openstreetmap.org'].includes(hostname);
page.on('pageerror', error => errors.push(error.message));
page.on('request', request => {
  const host = new URL(request.url()).hostname;
  if (/googleapis\.com|gstatic\.com/.test(host)) googleRequests.push(request.url());
  if (tileHost(host)) tileObservations.requested++;
});
page.on('requestfailed', request => { if (tileHost(new URL(request.url()).hostname)) tileObservations.failed++; });
page.on('response', response => { if (tileHost(new URL(response.url()).hostname) && response.ok()) tileObservations.loaded++; });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const poll = fn => expect.poll(fn, { timeout: 20000, intervals: [100, 250, 500] });
const state = () => page.locator('#map').evaluate(node => ({ ...node.dataset }));
const ids = () => page.locator('#site-list [data-site]').evaluateAll(nodes => nodes.map(node => node.dataset.site));
async function report(status, extra = {}) {
  await writeFile('test-results/map-browser-report.json', JSON.stringify({ status, base, results, visited, imageHashes, errors, googleRequests, tileObservations, imagery: 'Only the original supplied PNG images are tested as imagery; no tile imagery is mocked.', ...extra }, null, 2));
}
async function check(name, fn) {
  await fn(); results.push({ name, passed: true }); console.log('PASS', name); await report('running');
}
async function select(id) {
  await page.locator(`#site-list [data-site="${id}"]`).click();
  await expect(page.locator('#details')).toBeVisible();
  await poll(async () => (await state()).selected).toBe(id);
}
async function clear() {
  if (await page.locator('#clear-filters').isVisible()) await page.locator('#clear-filters').click();
}
async function imageBytes(selector) {
  const src = await page.locator(selector).getAttribute('src');
  assert.ok(src.startsWith('data:image/png;base64,'), 'Reference is embedded in the standalone HTML');
  return Buffer.from(src.split(',', 2)[1], 'base64');
}
async function noHorizontalOverflow() {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Layout fits viewport width');
}

await mkdir('test-results', { recursive: true });
await report('running');
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#site-list [data-site]').first().waitFor();
  await check('standalone map starts directly with 14 source locations and no game scene', async () => {
    assert.equal(new URL(page.url()).pathname, new URL(base).pathname);
    await expect(page.locator('script[src]')).toHaveCount(0);
    await expect(page.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
    await expect(page.locator('#scene, #hud, #welcome')).toHaveCount(0);
    await expect(page.locator('#site-list [data-site]')).toHaveCount(14);
    await expect(page.locator('.farm-pin')).toHaveCount(14);
    await expect(page.locator('#result-count')).toHaveText('14 locais');
    const pins = await page.locator('[data-pin]').evaluateAll(nodes => nodes.map(node => ({ id: node.dataset.pin, lat: Number(node.dataset.lat), lng: Number(node.dataset.lng) })));
    for (const source of locations) assert.deepEqual(pins.find(pin => pin.id === source.id), { id: source.id, lat: source.lat, lng: source.lng });
    assert.equal(new Set(pins.map(pin => pin.id)).size, 14);
    await noHorizontalOverflow();
  });
  await check('initial background reports its real availability without blocking map information', async () => {
    await poll(async () => (await state()).baseState).not.toBe('loading');
    tileObservations.initialState = (await state()).baseState;
    assert.ok(['available', 'offline'].includes(tileObservations.initialState));
    if (tileObservations.initialState === 'offline') {
      await expect(page.locator('#map-status')).toContainText('Localizações e fotos enviadas continuam acessíveis');
      await expect(page.locator('#retry-tiles')).toBeVisible();
    }
    await page.screenshot({ path: 'test-results/map-overview.png' });
  });
  await check('blocked tile requests show an honest offline fallback and can be retried', async () => {
    await page.route('https://server.arcgisonline.com/**', route => route.abort('internetdisconnected'));
    await page.route('https://tile.openstreetmap.org/**', route => route.abort('internetdisconnected'));
    tileObservations.forcedFailure = true;
    await page.locator('.map-layer-button[data-layer="streets"]').click();
    await poll(async () => (await state()).baseState).toBe('offline');
    await expect(page.locator('#retry-tiles')).toBeVisible();
    await page.locator('#retry-tiles').click();
    await poll(async () => (await state()).baseState).toBe('offline');
    await expect(page.locator('.farm-pin')).toHaveCount(14);
    await page.locator('.map-layer-button[data-layer="reference"]').click();
    await poll(async () => (await state()).baseState).toBe('reference');
    await expect(page.locator('#map-status')).toContainText('Base vetorial de referência');
    await expect(page.locator('.map-layer-button[data-layer="reference"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#retry-tiles')).toBeHidden();
    await context.setOffline(true);
  });
  for (const site of sites) {
    await check(`offline map opens ${site.nome} with the exact supplied image and source coordinates`, async () => {
      await select(site.id);
      await expect(page.locator('#details h2')).toHaveText(site.nome);
      const source = locations.find(point => point.id === site.id);
      await expect(page.locator('#details .coordinate-box code')).toHaveText(`${source.lat.toFixed(7)}, ${source.lng.toFixed(7)}`);
      await expect(page.locator('#details .external-link')).toHaveAttribute('href', source.source_url);
      await expect(page.locator('#details .external-link')).toHaveAttribute('rel', 'noopener noreferrer');
      await poll(() => page.locator('#details .detail-photo img').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
      const expected = await readFile(new URL(`../materiais/Patricia_Pilar_Mundo_3D_Codex/${site.referencia_imagem}`, import.meta.url));
      const actual = await imageBytes('#details .detail-photo img');
      assert.equal(sha(actual), sha(expected), 'Photo is the supplied original PNG, including attribution');
      imageHashes[site.id] = sha(actual); visited.push(site.id);
    });
  }
  await check('construction, greenhouse counts and headquarters functions preserve supplied meanings', async () => {
    await select('deusas');
    await expect(page.locator('#details')).toContainText('Área projetada');
    await expect(page.locator('#details')).toContainText('18');
    await expect(page.locator('#details')).toContainText('Quase concluída');
    await expect(page.locator('#details')).toContainText('≈ 4');
    await expect(page.locator('#details')).toContainText('não representam área em produção');
    await expect(page.locator('#details .crop-pill')).toHaveCount(0);
    await expect(page.locator('#details')).toContainText('Responsáveis por confirmar');
    await select('nutriveg_2');
    await expect(page.locator('#details')).toContainText('11 estufas');
    await expect(page.locator('#details')).toContainText('madeira');
    await select('sede');
    await expect(page.locator('#details')).toContainText('Receção das colheitas');
    await expect(page.locator('#details')).toContainText('Expedição');
    await expect(page.locator('#details .detail-stat')).toHaveCount(0);
    await select('ritual');
    await expect(page.locator('#details .detail-provenance')).toContainText('correspondência dos nomes continua por confirmar');
  });
  await check('search and filters use real crop and person associations without requiring accents', async () => {
    await page.locator('#search').fill('cesar');
    assert.deepEqual((await ids()).sort(), ['framboesa_2', 'lagoa', 'varzea', 'fenomeno'].sort());
    await expect(page.locator('.farm-pin')).toHaveCount(4);
    await clear();
    await page.locator('#person-filter').selectOption('cesar');
    assert.deepEqual((await ids()).sort(), ['framboesa_2', 'lagoa', 'varzea', 'fenomeno'].sort());
    await clear();
    await page.locator('#person-filter').selectOption('hernani');
    assert.deepEqual(await ids(), ['greenaura']);
    await clear();
    await page.locator('#person-filter').selectOption('nuno');
    await expect(page.locator('#site-list [data-site]')).toHaveCount(14);
    await clear();
    await page.locator('#search').fill('VARZEA');
    assert.deepEqual(await ids(), ['varzea']);
    await clear();
    await page.locator('#crop-filter').selectOption('Pepino');
    assert.deepEqual((await ids()).sort(), ['tomates_oeste', 'nutriveg_2', 'lagoa'].sort());
    await clear();
    await page.locator('#crop-filter').selectOption('__construction');
    assert.deepEqual(await ids(), ['deusas']);
    await clear();
    await page.locator('#crop-filter').selectOption('__headquarters');
    assert.deepEqual(await ids(), ['sede']);
    await clear();
    await page.locator('#search').fill('local inexistente xyz');
    await expect(page.locator('.empty-state')).toContainText('Nenhum local encontrado');
    await expect(page.locator('.farm-pin')).toHaveCount(0);
    await page.locator('[data-clear-filters]').click();
    await expect(page.locator('#site-list [data-site]')).toHaveCount(14);
    await expect(page.locator('.farm-pin')).toHaveCount(14);
  });
  await check('source marker can be clicked and another can be activated by keyboard', async () => {
    await page.locator('#fit-west').click();
    const deusas = page.locator('.farm-pin:has([data-pin="deusas"])');
    await deusas.click({ position: { x: 18, y: 15 } });
    await poll(async () => (await state()).selected).toBe('deusas');
    await page.locator('#close-details').click();
    await page.locator('#fit-west').click();
    const greenaura = page.locator('.farm-pin:has([data-pin="greenaura"])');
    await greenaura.focus(); await page.keyboard.press('Enter');
    await poll(async () => (await state()).selected).toBe('greenaura');
    await expect(page.locator('#details h2')).toHaveText('Greenaura');
    await page.locator('#close-details').click();
    await page.locator('#fit-west').click();
    const nutriveg = page.locator('.farm-pin:has([data-pin="nutriveg_2"])');
    await nutriveg.focus(); await page.keyboard.press('Space');
    await poll(async () => (await state()).selected).toBe('nutriveg_2');
    await expect(page.locator('#details h2')).toHaveText('Nutriveg 2');
  });
  await check('aerial image viewer supports zoom, drag, reset and Escape without losing the site', async () => {
    await select('tomates_oeste');
    await page.screenshot({ path: 'test-results/map-details.png' });
    await page.locator('[data-enlarge-photo]').click();
    await expect(page.locator('#photo-dialog')).toBeVisible();
    await expect(page.locator('#photo-title')).toHaveText('Tomates do Oeste');
    await poll(() => page.locator('#full-photo').evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await page.locator('#photo-zoom-in').click();
    await expect(page.locator('#photo-stage')).toHaveAttribute('data-scale', '1.3');
    const before = await page.locator('#full-photo').evaluate(image => image.style.transform);
    const stage = await page.locator('#photo-stage').boundingBox();
    await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width / 2 + 70, stage.y + stage.height / 2 + 35, { steps: 5 });
    await page.mouse.up();
    const after = await page.locator('#full-photo').evaluate(image => image.style.transform);
    assert.notEqual(after, before, 'Dragging changes the image translation');
    await page.mouse.wheel(0, -200);
    await poll(() => page.locator('#photo-stage').evaluate(node => Number(node.dataset.scale))).toBeGreaterThan(1.3);
    await page.locator('#photo-reset').click();
    await expect(page.locator('#photo-stage')).toHaveAttribute('data-scale', '1');
    await page.screenshot({ path: 'test-results/map-photo.png' });
    await page.keyboard.press('Escape');
    await expect(page.locator('#photo-dialog')).toBeHidden();
    await expect(page.locator('#details')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#details')).toBeHidden();
  });
  await check('help downloads a valid 14-point KML and map actions do not write local data', async () => {
    await page.locator('#help').click();
    await expect(page.locator('#help-dialog')).toBeVisible();
    await expect(page.locator('#help-dialog')).toContainText('não delimitam os terrenos');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#download-kml').click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'Exploracoes_Patricia_Pilar.kml');
    await download.saveAs('test-results/map-locations.kml');
    const xml = await readFile('test-results/map-locations.kml', 'utf8');
    const parsed = await page.evaluate(source => {
      const doc = new DOMParser().parseFromString(source, 'application/xml');
      return { error: doc.querySelector('parsererror')?.textContent || null, points: doc.getElementsByTagName('Placemark').length };
    }, xml);
    assert.deepEqual(parsed, { error: null, points: 14 });
    await page.locator('#close-help').click();
    assert.equal(await page.evaluate(() => localStorage.length), 0);
  });
  await check('site selection can be restored from a direct URL hash', async () => {
    await context.setOffline(false);
    await page.goto(`${base}#framboesa_2`, { waitUntil: 'domcontentloaded' });
    // A hash-only navigation keeps the current document alive; this check is
    // specifically for restoring a supplied direct link on a fresh page load.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#details h2')).toHaveText('Framboesa Encantada 2');
    await poll(async () => (await state()).selected).toBe('framboesa_2');
    await expect(page.locator('#details')).toContainText('César');
    await expect(page.locator('#details')).toContainText('Técnico responsável');
    await page.locator('.map-layer-button[data-layer="reference"]').click();
  });
  await check('390px mobile layout keeps list, details, map and image controls accessible', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toHaveClass(/list-open/);
    await expect(page.locator('#show-list')).toBeVisible();
    await noHorizontalOverflow();
    await select('lagoa');
    await expect(page.locator('body')).not.toHaveClass(/list-open/);
    await expect(page.locator('#details h2')).toHaveText('Lagoa Bondosa');
    const bounds = await page.locator('#details').boundingBox();
    assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= 391 && bounds.y >= 64);
    await page.screenshot({ path: 'test-results/map-mobile-details.png' });
    await page.locator('[data-enlarge-photo]').click();
    await expect(page.locator('#photo-dialog')).toBeVisible();
    for (const selector of ['#photo-zoom-in', '#photo-zoom-out', '#photo-reset', '#photo-close']) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= 391 && box.y >= 0 && box.y + box.height <= 845, `${selector} fits the mobile screen`);
    }
    await page.locator('#photo-zoom-in').click();
    await expect(page.locator('#photo-stage')).toHaveAttribute('data-scale', '1.3');
    await page.screenshot({ path: 'test-results/map-mobile-photo.png' });
    await page.locator('#photo-close').click();
    await page.locator('#show-list').click();
    await expect(page.locator('body')).toHaveClass(/list-open/);
    await expect(page.locator('#details')).toBeHidden();
    await poll(() => page.locator('#sidebar').evaluate(node => new DOMMatrix(getComputedStyle(node).transform).m42)).toBe(0);
    await page.locator('#site-list [data-site="tomates_oeste"]').scrollIntoViewIfNeeded();
    await expect(page.locator('#site-list [data-site="tomates_oeste"]')).toBeInViewport();
    await noHorizontalOverflow();
    await page.screenshot({ path: 'test-results/map-mobile-list.png' });
  });
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(googleRequests.length, 0, 'No Google API or Google static service is loaded');
  assert.equal(new Set(visited).size, 14);
  await report('passed', { checks: results.length });
  console.log(`${results.length} map browser checks passed; 14 original aerial PNGs verified; no JavaScript errors.`);
} catch (error) {
  await report('failed', { failure: error.stack || String(error) });
  await page.screenshot({ path: 'test-results/map-failure.png' }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
