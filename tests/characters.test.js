import test from "node:test";
import assert from "node:assert/strict";
import {
  CHARACTERS,
  PLAYER_PERSON_ID,
  registerPersonEntity,
  nearbyCharacter,
} from "../src/characters.js";
import { createState, step, toggleVehicle } from "../src/simulation.js";
test("one rendered entity per person is enforced, independent of farm memberships", () => {
  const registry = new Map();
  const entity = { userData: {} };
  registerPersonEntity(registry, PLAYER_PERSON_ID, entity);
  for (const c of CHARACTERS)
    registerPersonEntity(registry, c.id, { userData: {} });
  assert.equal(registry.size, 5);
  assert.throws(
    () => registerPersonEntity(registry, "nuno", { userData: {} }),
    /Já existe/,
  );
  assert.equal(registry.size, 5);
  assert.equal(entity.userData.personId, "emanuel_franco");
});
test("consultation selects a nearby named character and is disabled while driving", () => {
  const s = createState();
  assert.equal(nearbyCharacter(s), null);
  s.player.x = s.characters[0].x-2;
  s.player.z = s.characters[0].z;
  assert.equal(nearbyCharacter(s).id, "nuno");
  s.driving = true;
  assert.equal(nearbyCharacter(s), null);
});
test("Emanuel keeps one identity through movement, vehicle entry/exit and reset", () => {
  const s = createState();
  step(s, { forward: true }, 0.05);
  toggleVehicle(s);
  assert.equal(s.player.personId, "emanuel_franco");
  toggleVehicle(s);
  assert.equal(s.player.personId, "emanuel_franco");
  assert.equal(createState().player.personId, "emanuel_franco");
});
