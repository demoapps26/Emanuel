import test from "node:test";
import assert from "node:assert/strict";
import { VEHICLE_KINDS, VEHICLE_SPECS, VEHICLE_NAMES, vehicleSpec, PARKED_FLEET } from "../src/fleet.js";

test("eight distinct vehicle kinds include two trucks and two tractors", () => {
  assert.equal(VEHICLE_KINDS.length,8);
  assert.equal(new Set(VEHICLE_KINDS).size,8);
  assert.ok(["truck","rigid_truck","tractor","orchard_tractor"].every(k=>VEHICLE_KINDS.includes(k)));
  assert.equal(PARKED_FLEET.length,7);
  assert.equal(new Set(PARKED_FLEET.map(v=>v.kind)).size,7);
});
test("vehicle dimensions, controls and camera settings are defined in metre-like units", () => {
  for(const kind of VEHICLE_KINDS) {
    const p=vehicleSpec(kind);
    assert.ok(VEHICLE_NAMES[kind]);
    for(const key of ["width","length","wheelbase","maxForward","maxReverse","acceleration","steering","entryDistance","cameraDistance","cameraHeight","wheelRadius","brake"])
      assert.ok(Number.isFinite(p[key])&&p[key]>0,`${kind}.${key}`);
    assert.ok(p.width<p.length);
    assert.ok(p.maxReverse<p.maxForward);
    assert.ok(Number.isFinite(p.entryOffset.x)&&Number.isFinite(p.entryOffset.z));
  }
  assert.equal(VEHICLE_SPECS.truck.length,19);
  assert.ok(VEHICLE_SPECS.tractor.maxForward<VEHICLE_SPECS.technical.maxForward);
  assert.throws(()=>vehicleSpec("not-a-vehicle"),/desconhecido/);
});
test("articulated truck geometry defines a real hitch and a bounded trailer articulation", () => {
  const p=VEHICLE_SPECS.truck;
  assert.equal(p.articulated,true);
  assert.equal(p.hitchZ,-4.5);
  assert.equal(p.trailerLength,15);
  assert.ok(p.maxArticulation>Math.PI/4&&p.maxArticulation<Math.PI/2);
  assert.ok(p.entryOffset.z<-p.length/4,"entry belongs to the cab, not the trailer's centre");
});
