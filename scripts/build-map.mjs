import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';

const assets = await readdir('dist-mapa/assets');
const scripts = assets.filter(name => name.endsWith('.js'));
const styles = assets.filter(name => name.endsWith('.css'));
if (scripts.length !== 1 || styles.length !== 1) throw Error('Rever o empacotamento do mapa: é necessário um bundle JS e CSS.');
const js = (await readFile(path.join('dist-mapa/assets', scripts[0]), 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = await readFile(path.join('dist-mapa/assets', styles[0]), 'utf8');
const html = `<!doctype html>\n<html lang="pt-PT"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#174c3c"><title>Patrícia Pilar · Mapa das explorações</title><style>${css}</style></head><body><div id="app"></div><script type="module">${js}</script></body></html>`;
for (const output of ['MAPA.html', 'docs/mapa.html', 'release/Mapa_Exploracoes_Patricia_Pilar.html']) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
}
console.log(`Mapa autónomo: MAPA.html (${Buffer.byteLength(html)} bytes). Código, fichas e 14 imagens incorporados; fundos online requerem Internet.`);
