import test from "node:test";
import assert from "node:assert/strict";
import { mapReadiness } from "../src/maps.js";
test("local map needs no key and does not claim Google integration", () => {
  assert.equal(mapReadiness().mode, "local");
  assert.match(mapReadiness().reason, /Nenhum serviço Google/);
});
test("requesting real maps falls back explicitly even if a key is available", () => {
  const status = mapReadiness({ mode: "google", keyPresent: true });
  assert.equal(status.mode, "local");
  assert.match(status.reason, /coordenadas/);
  assert.match(status.reason, /ativação explícita/);
});
