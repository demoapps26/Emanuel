// Approximate game dimensions in metres, not a register of the company's real fleet.
export const VEHICLE_NAMES = Object.freeze({
  technical: "Carro técnico",
  agropilar: "Carrinha Agropilar",
  biological: "Carrinha de controlo biológico",
  agricultural: "Carrinha de técnico agrícola",
  truck: "Camião articulado Patrícia Pilar",
  rigid_truck: "Camião de distribuição",
  tractor: "Trator agrícola",
  orchard_tractor: "Trator compacto",
});
const van = {
  width: 2.2, length: 4.8, wheelbase: 2.8, rearAxleOffset: 1.4,
  maxForward: 11, maxReverse: 3.4, acceleration: 3.4, steering: .57,
  entryDistance: 4, entryOffset: { x: 0, z: -.65 },
  cameraDistance: 9, cameraHeight: 2.3, wheelRadius: .50, brake: 8,
};
export const VEHICLE_SPECS = Object.freeze({
  technical: Object.freeze({
    width: 2.2, length: 4.6, wheelbase: 2.75, rearAxleOffset: 1.35,
    maxForward: 13, maxReverse: 3.8, acceleration: 4.3, steering: .60,
    entryDistance: 4, entryOffset: { x: 0, z: -.35 },
    cameraDistance: 8, cameraHeight: 2.0, wheelRadius: .46, brake: 9,
  }),
  agropilar: Object.freeze({ ...van }),
  biological: Object.freeze({ ...van }),
  agricultural: Object.freeze({ ...van }),
  truck: Object.freeze({
    width: 3.9, length: 19, wheelbase: 4.5, rearAxleOffset: -4,
    maxForward: 8, maxReverse: 2.5, acceleration: 1.65, steering: .47,
    entryDistance: 5, entryOffset: { x: 0, z: -7.25 },
    cameraDistance: 22, cameraHeight: 4.8, wheelRadius: .75, brake: 5.8,
    articulated: true, hitchZ: -4.5, cabCenterZ: -6.5, cabLength: 6,
    cabWidth: 3.65, trailerLength: 15, trailerWidth: 3.9,
    trailerCenterOffset: 6.5, trailerAxleOffset: 11,
    maxArticulation: Math.PI * 65 / 180,
  }),
  rigid_truck: Object.freeze({
    width: 3.25, length: 10, wheelbase: 5.2, rearAxleOffset: 2.4,
    maxForward: 8, maxReverse: 2.8, acceleration: 2.1, steering: .50,
    entryDistance: 4.5, entryOffset: { x: 0, z: -3.2 },
    cameraDistance: 14, cameraHeight: 3.6, wheelRadius: .63, brake: 6.5,
  }),
  tractor: Object.freeze({
    width: 2.4, length: 4, wheelbase: 2.6, rearAxleOffset: 1.15,
    maxForward: 5, maxReverse: 2, acceleration: 2.0, steering: .68,
    entryDistance: 3.5, entryOffset: { x: 0, z: .3 },
    cameraDistance: 9, cameraHeight: 2.8, wheelRadius: .78, brake: 7,
  }),
  orchard_tractor: Object.freeze({
    width: 1.9, length: 3, wheelbase: 1.9, rearAxleOffset: .85,
    maxForward: 4, maxReverse: 1.8, acceleration: 1.8, steering: .72,
    entryDistance: 3.2, entryOffset: { x: 0, z: .2 },
    cameraDistance: 7, cameraHeight: 2.2, wheelRadius: .58, brake: 7.5,
  }),
});
export const VEHICLE_KINDS = Object.freeze(Object.keys(VEHICLE_NAMES));
export function vehicleSpec(kind) {
  const spec = VEHICLE_SPECS[kind];
  if (!spec) throw Error(`Tipo de veículo desconhecido: ${kind}`);
  return spec;
}
// Fallback staging retained for callers which only need a generic parking grid.
// createState uses the selected site's explicit vehicleSpawns instead.
export const PARKED_FLEET = Object.freeze([
  { x: -25, z: 0, yaw: 0, speed: 0, kind: "agropilar" },
  { x: -14, z: 0, yaw: 0, speed: 0, kind: "biological" },
  { x: -3, z: 0, yaw: 0, speed: 0, kind: "agricultural" },
  { x: 24, z: 10, yaw: 0, speed: 0, kind: "truck" },
  { x: 46, z: 10, yaw: 0, speed: 0, kind: "rigid_truck" },
  { x: -26, z: 38, yaw: 0, speed: 0, kind: "tractor" },
  { x: -13, z: 38, yaw: 0, speed: 0, kind: "orchard_tractor" },
].map(Object.freeze));
