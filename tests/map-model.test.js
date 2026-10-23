import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { initialData } from "../src/data.js";
import { normalizeSearch, createMapSites, filterMapSites, mapSummary } from "../src/map-model.js";
import locations from "../dados/localizacoes_maps.json" with { type: "json" };

test("all 13 farms and HQ retain their identities and original aerial references", () => {
  const data = initialData();
  const sites = createMapSites(data);
  assert.deepEqual(sites.map((site) => site.id), [...data.exploracoes.map((site) => site.id), "sede"]);
  assert.equal(new Set(sites.map((site) => site.id)).size, 14);
  assert.deepEqual(sites.map((site) => site.number), Array.from({ length: 14 }, (_, index) => index + 1));
  for (const site of sites) {
    const original = site.id === "sede" ? data.sede : data.exploracoes.find((value) => value.id === site.id);
    assert.equal(site.nome, original.nome);
    assert.equal(site.name, original.nome);
    assert.equal(site.referencia_imagem, original.referencia_imagem);
    assert.ok(existsSync(new URL(`../materiais/Patricia_Pilar_Mundo_3D_Codex/${site.referencia_imagem}`, import.meta.url)));
    assert.equal(site.region, site.id === "lagoa" ? "Alcochete" : "Oeste");
  }
  assert.equal(sites.find((site) => site.id === "deusas").category, "construction");
  assert.equal(sites.find((site) => site.id === "sede").category, "headquarters");
  assert.equal(sites.filter((site) => site.category === "farm").length, 12);
});

test("map points use original supplied links while descriptive edits remain intact", () => {
  const data = initialData();
  const farm = data.exploracoes.find((site) => site.id === "framboesa_2");
  farm.coordenadas = { lat: 0, lng: 0, confirmed: true, source: "local_edit" };
  farm.area_ha = 10.25;
  farm.culturas_atuais = ["Pepino"];
  farm.maps_url = null;
  data.sede.coordenadas = { lat: 1, lng: 1, confirmed: true };
  const before = structuredClone(data);
  const sites = createMapSites(data);
  for (const site of sites) {
    const source = locations.find((point) => point.id === site.id);
    assert.equal(site.coordenadas.lat, source.lat);
    assert.equal(site.coordenadas.lng, source.lng);
    assert.equal(site.coordenadas.source_url, source.source_url);
    assert.equal(site.coordenadas.source, "user_shared_maps_link");
    assert.equal(site.coordenadas.confirmed, true);
    assert.deepEqual(site.coordinates, { lat: source.lat, lng: source.lng });
  }
  const mapped = sites.find((site) => site.id === farm.id);
  assert.equal(mapped.area_ha, 10.25);
  assert.deepEqual(mapped.culturas_atuais, ["Pepino"]);
  assert.equal(mapped.maps_url, locations.find((point) => point.id === farm.id).source_url);
  assert.deepEqual(data, before);
  mapped.culturas_atuais.push("Tomate");
  assert.deepEqual(farm.culturas_atuais, ["Pepino"]);
});

test("person filters reflect César's four farms, Hernani's confirmed farm and global leadership", () => {
  const data = initialData(), sites = createMapSites(data);
  const ids = (person) => filterMapSites(sites, data, { person }).map((site) => site.id).sort();
  assert.deepEqual(ids("cesar"), ["fenomeno", "framboesa_2", "lagoa", "varzea"]);
  assert.deepEqual(ids("hernani"), ["greenaura"]);
  assert.equal(ids("nuno").length, 14);
  assert.deepEqual(ids("miguel"), []);
  assert.deepEqual(ids("rafael"), []);
  assert.deepEqual(ids("unknown"), []);
});

test("Portuguese search ignores accents and combines all words with crop and actual team filters", () => {
  const data = initialData(), sites = createMapSites(data);
  assert.equal(normalizeSearch("  CÉSAR   Várzea "), "cesar varzea");
  assert.deepEqual(filterMapSites(sites, data, { query: "varzea cesar" }).map((site) => site.id), ["varzea"]);
  assert.deepEqual(filterMapSites(sites, data, { query: "herNANI" }).map((site) => site.id), ["greenaura"]);
  assert.deepEqual(filterMapSites(sites, data, { query: "CESAR", crop: "Pepino" }).map((site) => site.id), ["lagoa"]);
  assert.deepEqual(filterMapSites(sites, data, { query: "framboesa", crop: "Framboesa" }), []);
  assert.deepEqual(filterMapSites(sites, data, { query: "Miguel" }), []);
  assert.deepEqual(filterMapSites(sites, data, { query: "Rafael" }), []);
  assert.deepEqual(filterMapSites(sites, data, { query: "cesar", person: "hernani" }), []);
  assert.equal(filterMapSites(sites, data, { query: " ", crop: "", person: "" }).length, 14);
});

test("construction and headquarters are separate filters and projected area is never counted as declared", () => {
  const data = initialData(), sites = createMapSites(data);
  assert.deepEqual(filterMapSites(sites, data, { crop: "__construction" }).map((site) => site.id), ["deusas"]);
  assert.deepEqual(filterMapSites(sites, data, { crop: "__headquarters" }).map((site) => site.id), ["sede"]);
  assert.deepEqual(filterMapSites(sites, data, { crop: "__construction", query: "tomate" }), []);
  assert.equal(mapSummary(data).farms, 13);
  assert.equal(mapSummary(data).locations, 14);
  assert.equal(mapSummary(data).declaredArea, 129.23);
  assert.equal(mapSummary(data).projectedArea, 18);
  assert.equal(mapSummary(data).construction, 1);
  assert.equal(mapSummary(data).headquarters, 1);
});
