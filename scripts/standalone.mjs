import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
const destination =
  process.argv[2] || path.resolve("release", "Patricia_Pilar_Mundo_3D.html");
const assets = await readdir("dist/assets");
const js = assets.filter((n) => n.endsWith(".js")),
  css = assets.filter((n) => n.endsWith(".css"));
if (js.length !== 1 || css.length !== 1)
  throw Error(
    "A compilação tem mais do que um bundle; rever o empacotamento para ficheiro único.",
  );
const script = (await readFile("dist/assets/" + js[0], "utf8")).replace(
  /<\/script/gi,
  "<\\/script",
);
const style = await readFile("dist/assets/" + css[0], "utf8");
const html = `<!doctype html>\n<html lang="pt-PT"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#174c3c"><title>Patrícia Pilar · Mundo 3D · Experimentar</title><style>${style}</style></head><body><div id="app"></div><script type="module">${script}</script></body></html>`;
// JOGAR.html is itself the complete app: Windows can open the extracted file
// without following a redirect into a sibling folder that ZIP preview omitted.
const destinations = new Set([destination]);
if (!process.argv[2]) {
  destinations.add(path.resolve("JOGAR.html"));
  destinations.add(path.resolve("docs", "index.html"));
}
for (const output of destinations) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
}
console.log(
  "Versão HTML autónoma:",
  destination,
  Buffer.byteLength(html),
  "bytes",
);
