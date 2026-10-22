import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  step,
  blocked,
  move,
  toggleVehicle,
  activeSite,
  BLOCKS,
  BOUNDS,
} from "../src/simulation.js";
const run = (state, input, seconds, yaw = 0) => {
  for (let t = 0; t < seconds; t += 1 / 60) step(state, input, 1 / 60, yaw);
};
test("spawn and all entry/exit positions are outside buildings", () => {
  const s = createState();
  assert.equal(blocked(s.player.x, s.player.z), false);
  assert.equal(blocked(s.car.x, s.car.z, 3.6), false);
  toggleVehicle(s);
  assert.equal(s.driving, true);
  toggleVehicle(s);
  assert.equal(s.driving, false);
  assert.equal(blocked(s.player.x, s.player.z), false);
});
test("walking, camera-relative directions and running", () => {
  const a = createState(),
    b = createState(),
    c = createState();
  a.player.x = b.player.x = c.player.x = 40;
  run(a, { forward: true }, 1);
  run(b, { forward: true, run: true }, 1);
  run(c, { forward: true }, 1, Math.PI / 2);
  assert.ok(a.player.z < 76);
  assert.ok(b.player.z < a.player.z - 4);
  assert.ok(c.player.x > 46);
  assert.ok(Math.abs(c.player.z - 82) < 0.01);
});
test("diagonal movement is normalized", () => {
  const a = createState(),
    b = createState();
  a.player.x = b.player.x = 40;
  run(a, { forward: true }, 1);
  run(b, { forward: true, right: true }, 1);
  assert.ok(Math.abs(a.distance - b.distance) < 1e-8);
});
test("high displacement cannot tunnel through a greenhouse", () => {
  const p = { x: 126, z: 35 };
  move(p, 0, -200, 1.2);
  assert.ok(p.z >= 13);
  assert.equal(blocked(p.x, p.z), false);
});
test("walls permit tangential sliding and world bounds hold", () => {
  const b = BLOCKS[1],
    p = { x: b.x - b.w / 2 - 1.3, z: b.z };
  move(p, 5, 8, 1.2);
  assert.ok(p.x < b.x - b.w / 2);
  assert.ok(p.z > b.z + 7);
  move(p, -2000, 2000, 1.2);
  assert.ok(p.x >= BOUNDS.minX + 1.2);
  assert.ok(p.z <= BOUNDS.maxZ - 1.2);
});
test("vehicle requires proximity and cannot exit while moving", () => {
  const s = createState();
  s.player.x = 240;
  toggleVehicle(s);
  assert.equal(s.driving, false);
  s.player.x = 7;
  toggleVehicle(s);
  run(s, { forward: true }, 1);
  assert.ok(s.car.speed > 5);
  const z = s.car.z;
  toggleVehicle(s);
  assert.equal(s.driving, true);
  run(s, { brake: true }, 2);
  assert.ok(Math.abs(s.car.speed) < 0.7);
  toggleVehicle(s);
  assert.equal(s.driving, false);
  assert.ok(s.car.z < z);
});
test("driving steers, reverses and stops at an obstacle", () => {
  const s = createState();
  toggleVehicle(s);
  run(s, { forward: true, left: true }, 1);
  assert.ok(s.car.yaw > 0.1);
  s.car.x = 126;
  s.car.z = 22;
  s.car.yaw = 0;
  s.car.speed = 25;
  run(s, { forward: true }, 1);
  assert.ok(s.car.z >= 15.6);
  assert.equal(blocked(s.car.x, s.car.z, 3.6), false);
  const q = createState();
  toggleVehicle(q);
  run(q, { backward: true }, 1);
  assert.ok(q.car.z > 80);
  assert.ok(q.car.speed < 0);
});
test("exit selects an unobstructed alternative and refuses a completely blocked exit", () => {
  const s = createState();
  toggleVehicle(s);
  const c = s.car;
  const obstacle = { x: c.x + 6, z: c.z, w: 4, d: 4 };
  toggleVehicle(s, [obstacle]);
  assert.equal(s.driving, false);
  assert.ok(s.player.x < c.x);
  toggleVehicle(s);
  toggleVehicle(s, [{ x: c.x, z: c.z, w: 30, d: 30 }]);
  assert.equal(s.driving, true);
});
test("site detection distinguishes both modelled farms and common paths", () => {
  const s = createState();
  assert.equal(activeSite(s), null);
  s.player = { x: 40, z: 30 };
  assert.equal(activeSite(s), "tomates_oeste");
  s.player = { x: -110, z: 160 };
  assert.equal(activeSite(s), "framboesa_2");
});
test("nearest vehicle is selected, both vehicles keep their parked positions", () => {
  const s = createState();
  const technical = { ...s.car };
  s.player.x = 63;
  s.player.z = 94;
  toggleVehicle(s);
  assert.equal(s.driving, true);
  assert.equal(s.car.kind, "agropilar");
  assert.deepEqual(s.parkedCars[0], technical);
  run(s, { forward: true }, 1);
  assert.ok(s.car.x > 63);
  assert.deepEqual(s.parkedCars[0], technical);
});
test("parked vehicles and the stationary truck are solid obstacles", () => {
  const s = createState();
  s.player.x = 63;
  s.player.z = 100;
  run(s, { forward: true }, 3);
  assert.ok(s.player.z >= 90);
  assert.equal(blocked(135, 82), true);
});

test("both connecting roads have clearance for a driven vehicle", () => {
  for (let x = -235; x <= 235; x += 2)
    assert.equal(blocked(x, 47, 5), false, `horizontal road x=${x}`);
  for (let z = -220; z <= 40; z += 2)
    assert.equal(blocked(13, z, 5), false, `TO access z=${z}`);
});

test("all four vehicles can be selected and driven independently without moving the others", () => {
  for (const kind of ["technical", "agropilar", "biological", "agricultural"]) {
    const s = createState(),
      vehicle = [s.car, ...s.parkedCars].find((v) => v.kind === kind);
    s.player.x = vehicle.x;
    s.player.z = vehicle.z + 12;
    toggleVehicle(s);
    assert.equal(s.driving, true);
    assert.equal(s.car.kind, kind);
    const parked = structuredClone(s.parkedCars),
      before = { ...s.car };
    run(s, { forward: true }, 0.8);
    assert.ok(Math.hypot(s.car.x - before.x, s.car.z - before.z) > 1);
    assert.deepEqual(s.parkedCars, parked);
    run(s, { brake: true }, 2);
    toggleVehicle(s);
    assert.equal(s.driving, false);
    assert.equal(blocked(s.player.x, s.player.z), false);
  }
});
test("simulation movement stops at the truck, including its enlarged trailer", () => {
  const s = createState();
  s.player.x = 135;
  s.player.z = 113;
  run(s, { forward: true }, 3);
  assert.ok(s.player.z >= 103);
  s.car.x = 135;
  s.car.z = 115;
  s.car.yaw = 0;
  s.driving = true;
  run(s, { forward: true }, 3);
  assert.ok(s.car.z >= 107);
  assert.equal(s.car.speed, 0);
});
