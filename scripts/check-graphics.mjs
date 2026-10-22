// Optional real-browser screenshots. High quality can be slow on SwiftShader.
import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
const output=process.env.CAPTURE_DIR || 'test-results/graphics';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.setDefaultTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.TEST_BASE_URL || 'http://127.0.0.1:4173',{waitUntil:'networkidle'});
  await page.locator('#start').click();
  await page.locator('#help').click();
  await page.locator('#quality').selectOption(process.env.CAPTURE_QUALITY || 'high');
  await page.locator('#resume').click();
  await page.waitForTimeout(2000);
  await page.screenshot({path:path.join(output,'jogo.png')});
  await page.locator('#help').click();
  await page.locator('#quality').selectOption('low');
  await page.locator('#resume').click();
  await page.locator('#open-map').click();
  await expect(page.locator('[data-location]')).toHaveCount(13);
  await page.locator('[data-fit="all"]').click();
  await expect(page.locator('[data-location]')).toHaveCount(14);
  await page.screenshot({path:path.join(output,'mapa-geografico.png')});
  await page.locator('[data-geo-site="tomates_oeste"]').click();
  await expect(page.locator('.aerial-reference img')).toBeVisible();
  await expect.poll(()=>page.locator('.aerial-reference img').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Capturas reais guardadas; 14 pontos e referência aérea verificados.');
} finally {await browser.close();}
