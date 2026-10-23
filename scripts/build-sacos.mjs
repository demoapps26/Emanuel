import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
const assets = await readdir('dist-sacos/assets');
const scripts = assets.filter(name => name.endsWith('.js'));
const styles = assets.filter(name => name.endsWith('.css'));
if (scripts.length !== 1 || styles.length !== 1) throw Error('É necessário um bundle JS e CSS.');
const js = (await readFile(path.join('dist-sacos/assets', scripts[0]), 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = (await readFile(path.join('dist-sacos/assets', styles[0]), 'utf8')).replace(/<\/style/gi, '<\\/style');
const html = `<!doctype html>\n<html lang="pt-PT"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#174d3b"><title>Patrícia Pilar · Gestão de sacos</title><style>${css}</style></head><body><div id="app"></div><script type="module">${js}</script></body></html>`;
for (const output of ['SACOS.html', 'docs/sacos.html', 'release/Sacos_Patricia_Pilar.html']) {
  await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, html);
}
console.log(`Programa autónomo SACOS.html: ${Buffer.byteLength(html)} bytes; funciona sem Internet.`);
