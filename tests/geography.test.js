import test from "node:test";
import assert from "node:assert/strict";
import { initialData, validateData } from "../src/data.js";
import {
  validCoordinate,
  confirmedLocations,
  distanceMetres,
  projectMetres,
} from "../src/geography.js";
import { googleRequirements } from "../src/google-map.js";
test("all 14 locations come from supplied links, not the demonstration layout", () => {
  const locations = confirmedLocations(initialData());
  assert.equal(locations.length, 14);
  assert.deepEqual(locations.find(p => p.id === "framboesa_2"), { id: "framboesa_2", name: "Framboesa Encantada 2", lat: 39.1308297, lng: -9.3539127 });
  assert.ok(initialData().exploracoes.every(s => s.coordenadas.source === "user_shared_maps_link"));
  assert.equal(validCoordinate(null), false);
  assert.equal(validCoordinate({ lat: 91, lng: 0, confirmed: true }), false);
});
test("only explicitly confirmed locations are supplied to a geographic viewer", () => {
  const d = initialData();
  d.exploracoes[0].coordenadas = { lat: 0, lng: 0, confirmed: false };
  assert.equal(confirmedLocations(d).length, 13);
  d.exploracoes[0].coordenadas.confirmed = true;
  assert.equal(confirmedLocations(d).length, 14);
  assert.equal(confirmedLocations(d)[0].id, "tomates_oeste");
});
test("great-circle distances have a real metre scale, including the date line", () => {
  assert.equal(distanceMetres({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
  assert.ok(
    Math.abs(distanceMetres({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111195) <
      1,
  );
  assert.ok(
    Math.abs(
      distanceMetres({ lat: 0, lng: 179.5 }, { lat: 0, lng: -179.5 }) - 111195,
    ) < 1,
  );
});
test("invalid geographic imports are rejected", () => {
  const d = initialData();
  d.exploracoes[0].coordenadas = { lat: 100, lng: 0, confirmed: true };
  assert.throws(() => validateData(d), /Coordenadas/);
});
test("Google is guarded by authorization, a key and confirmed locations independently", () => {
  assert.equal(googleRequirements().ready, false);
  assert.equal(
    googleRequirements({
      enabled: false,
      apiKey: "test-only",
      locations: [{ lat: 0, lng: 0 }],
    }).ready,
    false,
  );
  assert.equal(
    googleRequirements({
      enabled: true,
      apiKey: "",
      locations: [{ lat: 0, lng: 0 }],
    }).ready,
    false,
  );
  assert.equal(
    googleRequirements({ enabled: true, apiKey: "test-only", locations: [] })
      .ready,
    false,
  );
  assert.equal(
    googleRequirements({
      enabled: true,
      apiKey: "test-only",
      locations: [{ lat: 0, lng: 0 }],
    }).ready,
    true,
  );
});

test("regional projection preserves north and has a consistent metre scale", () => {
 const origin={lat:39.15,lng:-9.3}, north=projectMetres({lat:39.16,lng:-9.3},origin),east=projectMetres({lat:39.15,lng:-9.29},origin);
 assert.equal(north.x,0);assert.ok(north.y < -1111 && north.y > -1113);
 assert.equal(east.y,0);assert.ok(east.x > 861 && east.x < 864);
});
