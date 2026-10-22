import { CHARACTERS, PLAYER_PERSON_ID } from "./characters.js";
import { PARKED_FLEET, VEHICLE_NAMES } from "./fleet.js";
export const BOUNDS = { minX: -250, maxX: 250, minZ: -235, maxZ: 225 };
export const BLOCKS = [
  { x: 95, z: -128, w: 140, d: 100, site: "tomates_oeste" },
  { x: 126, z: -27, w: 92, d: 78, site: "tomates_oeste" },
  { x: -36, z: -110, w: 68, d: 135, site: "tomates_oeste" },
  { x: -127, z: 111, w: 140, d: 100, site: "framboesa_2" },
  { x: -133, z: 8, w: 128, d: 48, site: "framboesa_2" },
  { x: 181, z: 73, w: 30, d: 24, site: "armazem" },
];
export const OBSTACLES = [
  ...BLOCKS,
  ...CHARACTERS.map((c) => ({ x: c.x, z: c.z, w: 2, d: 2, site: c.id })),
  { x: 135, z: 82, w: 9, d: 40, site: "camiao" },
];
export function createState() {
  return {
    player: { x: 7, z: 82, yaw: 0, personId: PLAYER_PERSON_ID },
    car: { x: -5, z: 80, yaw: 0, speed: 0, kind: "technical" },
    parkedCars: PARKED_FLEET.map((v) => ({ ...v })),
    driving: false,
    distance: 0,
  };
}
export function blocked(x, z, radius = 1.2, obstacles = OBSTACLES) {
  if (
    x - radius < BOUNDS.minX ||
    x + radius > BOUNDS.maxX ||
    z - radius < BOUNDS.minZ ||
    z + radius > BOUNDS.maxZ
  )
    return true;
  return obstacles.some((b) => {
    const dx = x - Math.max(b.x - b.w / 2, Math.min(x, b.x + b.w / 2));
    const dz = z - Math.max(b.z - b.d / 2, Math.min(z, b.z + b.d / 2));
    return dx * dx + dz * dz < radius * radius;
  });
}
export function move(body, dx, dz, radius, obstacles = OBSTACLES) {
  // Substeps prevent tunnelling even when the tab resumes after a slow frame.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.6));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    if (!blocked(body.x + dx / steps, body.z, radius, obstacles))
      body.x += dx / steps;
    else hit = true;
    if (!blocked(body.x, body.z + dz / steps, radius, obstacles))
      body.z += dz / steps;
    else hit = true;
  }
  return hit;
}
export function toggleVehicle(state, obstacles = OBSTACLES) {
  const { player: p, car: c } = state;
  if (!state.driving) {
    let nearest = -1,
      distance = Math.hypot(p.x - c.x, p.z - c.z);
    state.parkedCars.forEach((v, i) => {
      const d = Math.hypot(p.x - v.x, p.z - v.z);
      if (d < distance) {
        nearest = i;
        distance = d;
      }
    });
    if (nearest >= 0 && distance <= 15) {
      const parked = state.parkedCars[nearest];
      state.parkedCars[nearest] = state.car;
      state.car = parked;
      return toggleVehicle(state, obstacles);
    }
    if (Math.hypot(p.x - c.x, p.z - c.z) > 15)
      return "Aproxima-te do carro para entrar.";
    state.driving = true;
    c.speed = 0;
    return `Veículo: ${VEHICLE_NAMES[c.kind]}. W/S acelera e recua; A/D vira.`;
  }
  if (Math.abs(c.speed) > 0.7) return "Pára o veículo antes de sair.";
  for (const [side, back] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const x = c.x + Math.cos(c.yaw) * side * 6 + Math.sin(c.yaw) * back * 7;
    const z = c.z + Math.sin(c.yaw) * side * 6 - Math.cos(c.yaw) * back * 7;
    if (
      !blocked(x, z, 1.2, [
        ...obstacles,
        ...state.parkedCars.map((v) => ({ x: v.x, z: v.z, w: 8, d: 10 })),
      ])
    ) {
      Object.assign(p, { x, z, yaw: c.yaw });
      state.driving = false;
      c.speed = 0;
      return "Saíste do veículo.";
    }
  }
  return "Não há espaço para sair. Afasta o carro dos obstáculos.";
}
export function step(state, input, dt, cameraYaw = 0, obstacles = OBSTACLES) {
  dt = Math.max(0, Math.min(dt, 0.05));
  obstacles = [
    ...obstacles,
    ...state.parkedCars.map((v) => ({ x: v.x, z: v.z, w: 8, d: 10 })),
  ];
  const target = state.driving ? state.car : state.player;
  const before = { x: target.x, z: target.z };
  if (state.driving) {
    const c = state.car,
      throttle = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
    c.speed += throttle * 13 * dt;
    c.speed *= Math.exp(-(input.brake ? 9 : throttle ? 0.35 : 2) * dt);
    c.speed = Math.max(-10, Math.min(27, c.speed));
    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    c.yaw +=
      steer *
      1.1 *
      dt *
      Math.min(1, Math.abs(c.speed) / 5) *
      Math.sign(c.speed);
    if (
      move(
        c,
        Math.sin(c.yaw) * c.speed * dt,
        -Math.cos(c.yaw) * c.speed * dt,
        5,
        obstacles,
      )
    )
      c.speed = 0;
    Object.assign(state.player, { x: c.x, z: c.z, yaw: c.yaw });
  } else {
    let x = (input.right ? 1 : 0) - (input.left ? 1 : 0),
      z = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
    const len = Math.hypot(x, z);
    if (len) {
      x /= len;
      z /= len;
      const dx = x * Math.cos(cameraYaw) - z * Math.sin(cameraYaw),
        dz = x * Math.sin(cameraYaw) + z * Math.cos(cameraYaw);
      const speed = input.run ? 13 : 7;
      const carObstacle = { x: state.car.x, z: state.car.z, w: 5.5, d: 9 };
      move(target, dx * speed * dt, dz * speed * dt, 1.2, [
        ...obstacles,
        carObstacle,
      ]);
      target.yaw = Math.atan2(dx, -dz);
    }
  }
  const delta = Math.hypot(target.x - before.x, target.z - before.z);
  state.distance += delta;
  return delta;
}
export function activeSite(state) {
  const p = state.driving ? state.car : state.player;
  if (p.x < -65 && p.z > -10) return "framboesa_2";
  if (p.z < 48 && p.x > -75) return "tomates_oeste";
  return null;
}
