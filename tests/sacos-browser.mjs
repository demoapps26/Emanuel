import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { STORAGE_KEY } from '../src/sacos/model.js';
const base = process.env.TEST_SACOS_URL || 'http://127.0.0.1:8091/SACOS.html';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const context = await browser.newContext({locale:'pt-PT',viewport:{width:1512,height:982},acceptDownloads:true});
const page = await context.newPage();page.setDefaultTimeout(12000);
const errors=[], requests=[], results=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
const modal = page.locator('#editor');
const field = key => modal.locator(`[name="${key}"]`);
const submit = () => modal.locator('button[type="submit"]').click();
const action = key => page.locator(`[data-action="${key}"]`).first().click();
const stored = () => page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);
async function check(name,fn){await fn();results.push(name);console.log('PASS',name);}
async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');}
await mkdir('test-results',{recursive:true});
try {
 await page.goto(base);await check('standalone starts empty with no external script, style, image or font dependency',async()=>{
  await expect(page.locator('.welcome')).toBeVisible();await expect(page.locator('.house-card')).toHaveCount(0);await expect(page.locator('script[src],link[rel=stylesheet]')).toHaveCount(0);await noOverflow();
  await page.screenshot({path:'test-results/sacos-empty-desktop.png',fullPage:true});
 });
 await check('first greenhouse opens counting directly without requiring pre-configuration',async()=>{
  await action('new-house');await field('name').fill('Estufa 1');await field('farm').fill('Tomates do Oeste');await submit();
  await expect(modal.locator('h2')).toHaveText('Contar nova linha');await expect(field('sectorId')).toHaveValue('__new');await expect(field('lineName')).toHaveValue('Linha 1');
 });
 await check('first count creates sector and line while immediately suggesting next line',async()=>{
  await field('sectorName').fill('Setor A');await field('quantity').fill('60');await modal.locator('.count-optional summary').click();await field('kind').fill('Fibra de coco');await field('supplier').fill('Fornecedor A');await submit();
  await expect(modal.locator('h2')).toHaveText('Contar nova linha');await expect(field('lineName')).toHaveValue('Linha 2');await expect(field('kind')).toHaveValue('Fibra de coco');
  const d=await stored();assert.equal(d.houses[0].sectors[0].lines[0].records[0].quantity,60);assert.equal(d.houses[0].sectors.length,1);assert.equal(d.houses[0].sectors[0].lines.length,1);
 });
 await check('zone-by-zone counting creates zones, accepts an empty zone, and preserves totals',async()=>{
  await modal.getByLabel('Zona a zona',{exact:true}).check();await field('zoneName').first().fill('Entrada');await field('zoneQuantity').first().fill('20');
  await modal.locator('[data-count-add-zone]').click();await field('zoneName').nth(1).fill('Meio');await field('zoneQuantity').nth(1).fill('0');
  await modal.locator('[data-count-add-zone]').click();await field('zoneName').nth(2).fill('Fundo');await field('zoneQuantity').nth(2).fill('30');
  await field('continue').uncheck();await submit();await expect(modal).not.toBeVisible();
  const l=(await stored()).houses[0].sectors[0].lines[1];assert.equal(l.zones.length,3);assert.equal(l.records.length,2);await expect(page.locator('.stat.accent>strong')).toHaveText('110');await expect(page.locator('.line-total>strong')).toHaveText('50');
 });
 await check('duplicate line is refused without changing existing data',async()=>{
  await action('count-line');assert.deepEqual(await field('zoneName').evaluateAll(nodes=>nodes.map(n=>n.value)),['Entrada','Meio','Fundo']);await field('lineName').fill('Linha 1');await field('mode').nth(0).check();await field('quantity').fill('99');await submit();await expect(modal.locator('.form-error')).toContainText('Já existe');assert.equal((await stored()).houses[0].sectors[0].lines.length,2);await modal.locator('[data-dismiss]').first().click();
 });
 await check('second sector can be created as part of a count',async()=>{
  await action('count-line');await field('sectorId').selectOption('__new');await field('sectorName').fill('Setor B');await expect(field('lineName')).toHaveValue('Linha 1');await field('mode').nth(0).check();await field('quantity').fill('40');await field('continue').uncheck();await submit();assert.equal((await stored()).houses[0].sectors.length,2);await expect(page.locator('.stat.accent>strong')).toHaveText('150');
 });
 await check('counts can be corrected rather than duplicated',async()=>{
  await page.locator('[data-sector]').first().click();await page.locator('[data-line]').nth(1).click();await page.locator('[data-record]').first().click();await expect(modal.locator('h2')).toHaveText('Editar introdução');await field('quantity').fill('35');await submit();await expect(page.locator('.stat.accent>strong')).toHaveText('155');await expect(page.locator('.line-total>strong')).toHaveText('55');
 });
 await check('record deletion requires a separate confirmation and updates all totals',async()=>{
  await page.locator('[data-record]').first().click();await modal.locator('[data-delete]').click();await expect(modal.locator('h2')).toHaveText('Eliminar introdução?');await submit();await expect(page.locator('.stat.accent>strong')).toHaveText('120');
 });
 await check('zone deletion preserves its bag records as unzoned',async()=>{
  await page.locator('[data-edit-zone]').first().click();await modal.locator('[data-delete]').click();await submit();
  const l=(await stored()).houses[0].sectors[0].lines[1];assert.equal(l.zones.length,2);assert.equal(l.records[0].zoneId,null);await expect(page.locator('.line-total>strong')).toHaveText('20');await expect(page.locator('.zone-item.unzoned strong')).toHaveText('20');
 });
 await check('additional introduction on existing line changes totals without creating a new line',async()=>{
  await action('new-record');await field('quantity').fill('5');await field('kind').fill('Coco novo');await submit();await expect(page.locator('.line-total>strong')).toHaveText('25');assert.equal((await stored()).houses[0].sectors[0].lines.length,2);
 });
 await check('bulk configuration remains available for empty lines and is separate from counts',async()=>{
  await action('new-lines');await field('count').fill('6');await field('first').fill('3');await field('zoneCount').fill('3');await submit();await expect(page.locator('[data-line]')).toHaveCount(8);await expect(page.locator('.stat.accent>strong')).toHaveText('125');
 });
 let backup;
 await check('JSON backup downloads the entire hierarchy and CSV carries traceable registrations',async()=>{
  const wait=page.waitForEvent('download');await action('export');const dl=await wait;backup=JSON.parse(await readFile(await dl.path(),'utf8'));assert.equal(backup.houses[0].sectors.length,2);assert.equal(backup.houses[0].sectors[0].lines.length,8);
  const waitCsv=page.waitForEvent('download');await action('csv');const out=await waitCsv;const text=await readFile(await out.path(),'utf8');assert.ok(text.includes('Tomates do Oeste'));assert.ok(text.includes('Fibra de coco'));assert.ok(text.includes('"Fornecedor A"'));
 });
 await check('data remains after reload; names are rendered safely as text',async()=>{
  await action('edit-house');await field('name').fill('<img src=x onerror=alert(1)>');await submit();await expect(page.locator('.page-heading h2')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('.page-heading img')).toHaveCount(0);
  await page.reload();await expect(page.locator('.page-heading h2')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('.stat.accent>strong')).toHaveText('125');
 });
 await check('invalid backup is refused and preserves saved data',async()=>{
  const before=JSON.stringify(await stored());await page.locator('input[type=file]').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,"houses":[{}]}')});await expect(modal.locator('h2')).toHaveText('Não foi possível restaurar');await submit();assert.equal(JSON.stringify(await stored()),before);
 });
 await check('valid restore requires confirmation and can be cancelled without changes',async()=>{
  const before=JSON.stringify(await stored());await page.locator('input[type=file]').setInputFiles({name:'copia.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await expect(modal.locator('h2')).toHaveText('Restaurar cópia de segurança');await modal.locator('[data-dismiss]').first().click();assert.equal(JSON.stringify(await stored()),before);
 });
 await check('restore replaces data only after confirmation',async()=>{
  await page.locator('input[type=file]').setInputFiles({name:'copia.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await submit();await expect(page.locator('.page-heading h2')).toHaveText('Estufa 1');assert.deepEqual(await stored(),backup);
 });
 await check('second greenhouse isolates counts and returns to the original data',async()=>{
  await action('new-house');await field('name').fill('Estufa 2');await submit();await field('quantity').fill('12');await field('continue').uncheck();await submit();await expect(page.locator('.stat.accent>strong')).toHaveText('12');await page.locator('[data-house]').first().click();await expect(page.locator('.stat.accent>strong')).toHaveText('125');
 });
 await check('desktop plan and detail are usable with no overflow',async()=>{
  await page.locator('[data-line]').first().click();await noOverflow();await page.screenshot({path:'test-results/sacos-desktop.png',fullPage:true});
 });
 await check('mobile can count a new line and shows a usable zone-by-zone form',async()=>{
  await page.setViewportSize({width:390,height:844});await expect(page.locator('.line-detail')).toBeVisible();await noOverflow();await page.screenshot({path:'test-results/sacos-mobile-detail.png',fullPage:true});await action('close-line');await action('count-line');await field('mode').nth(1).check();await field('zoneQuantity').fill('9');await modal.locator('[data-count-add-zone]').click();await field('zoneQuantity').nth(1).fill('11');await noOverflow();await page.screenshot({path:'test-results/sacos-mobile-count.png',fullPage:true});await field('continue').uncheck();await submit();await expect(page.locator('.line-total>strong')).toHaveText('20');await action('close-line');await noOverflow();await page.screenshot({path:'test-results/sacos-mobile.png',fullPage:true});
 });
 await check('concurrent tab changes suspend writes instead of overwriting data',async()=>{
  const other=await context.newPage();await other.goto(base);await other.evaluate(key=>{const d=JSON.parse(localStorage.getItem(key));d.houses[0].notes='Outra janela';localStorage.setItem(key,JSON.stringify(d));},STORAGE_KEY);await expect(page.locator('.notice')).toContainText('noutra janela');await action('edit-house');await field('name').fill('Não sobrescrever');await submit();await expect(modal.locator('.form-error')).toContainText('noutra janela');assert.equal((await stored()).houses[0].name,'Estufa 1');await other.close();await modal.locator('[data-dismiss]').first().click();await action('reload');await expect(page.locator('.page-heading p')).toContainText('Outra janela');
 });
 await check('blocked storage writes preserve existing data and the form draft',async()=>{
  await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException('QuotaExceededError');};});await action('edit-house');await field('name').fill('Tentativa sem espaço');await submit();await expect(modal.locator('.form-error')).toContainText('Não foi possível guardar');await expect(field('name')).toHaveValue('Tentativa sem espaço');assert.equal((await stored()).houses[0].name,'Estufa 1');await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem;});await modal.locator('[data-dismiss]').first().click();
 });
 await check('corrupt saved data is preserved and overwrite is blocked',async()=>{
  const fresh=await browser.newContext();const corrupt=await fresh.newPage();await corrupt.addInitScript(key=>localStorage.setItem(key,'{bad-json'),STORAGE_KEY);await corrupt.goto(base);await expect(corrupt.locator('.notice')).toContainText('preservados');assert.equal(await corrupt.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),'{bad-json');await corrupt.locator('[data-action=new-house]').first().click();await corrupt.locator('[name=name]').fill('Novo');await corrupt.locator('#editor button[type=submit]').click();await expect(corrupt.locator('.form-error')).toContainText('não puderam ser lidos');assert.equal(await corrupt.evaluate(key=>localStorage.getItem(key),STORAGE_KEY),'{bad-json');await fresh.close();
 });
 await check('no JavaScript errors or external service requests',async()=>{assert.deepEqual(errors,[]);assert.ok(requests.every(url=>new URL(url).origin===new URL(base).origin));});
 await writeFile('test-results/sacos-browser-report.json',JSON.stringify({status:'passed',base,checks:results,errors,requests},null,2));
} catch(error){await page.screenshot({path:'test-results/sacos-failure.png',fullPage:true});await writeFile('test-results/sacos-browser-report.json',JSON.stringify({status:'failed',checks:results,errors,error:error.stack},null,2));throw error;} finally{await browser.close();}
